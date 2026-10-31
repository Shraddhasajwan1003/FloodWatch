"""
FloodWatch India – /flood-risk endpoints
==========================================
Routes:
  GET /flood-risk?lat=&lon=              – point-level risk
  GET /flood-risk/district/{district_code} – district-level risk

Policy:
  • Official government alerts ALWAYS set the floor of the returned risk_level.
    The internal score cannot downgrade an official HIGH/SEVERE warning.
  • Missing data → data_quality=UNAVAILABLE, risk_level=UNKNOWN.
    Never silently default to LOW risk.
  • All sources used + all missing sources are listed in the response.
  • disclaimer is always present and cannot be stripped.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import District, OfficialAlert, RiskLevel as DbRiskLevel, State
from app.services.risk_scorer import RiskInputs, compute_risk_score
from app.schemas.schemas import (
    DataQuality,
    DistrictRiskResponse,
    FloodRiskResponse,
    RiskBreakdown,
    RiskLevel,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/flood-risk", tags=["Flood Risk"])

RISK_DISCLAIMER = (
    "Risk score is model-derived from weather analysis and GloFAS river model data. "
    "Always follow official government warnings (IMD, NDMA, SDMA) which take "
    "precedence over any score shown here. Missing data sources are listed explicitly."
)


# ---------------------------------------------------------------------------
# Internal helper: fetch active official alerts for a location
# ---------------------------------------------------------------------------

async def _get_active_alerts(
    db: AsyncSession,
    state_code: Optional[str] = None,
    district_code: Optional[str] = None,
) -> list:
    """Return active OfficialAlert rows for state/district (broadest first)."""
    query = select(OfficialAlert).where(OfficialAlert.is_active == True)  # noqa: E712
    if state_code:
        query = query.where(OfficialAlert.state_code == state_code)
    result = await db.execute(query)
    alerts = result.scalars().all()
    if district_code:
        alerts = [
            a for a in alerts
            if a.district_code is None or a.district_code == district_code
        ]
    return alerts


def _max_alert_level(alerts: list) -> Optional[RiskLevel]:
    """Return the most severe alert RiskLevel, or None if no active alerts."""
    if not alerts:
        return None
    order = [RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.SEVERE]
    best = None
    for alert in alerts:
        try:
            level = RiskLevel(alert.severity)
        except ValueError:
            continue
        if best is None or order.index(level) > order.index(best):
            best = level
    return best


# ---------------------------------------------------------------------------
# Point-level risk
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=FloodRiskResponse,
    summary="Compute flood risk at a coordinate",
    description=(
        "Aggregates rainfall + GloFAS discharge + active official alerts to produce "
        "a risk score. Official alerts cannot be downgraded by the internal score. "
        "data_quality=UNAVAILABLE when critical inputs are missing."
    ),
)
async def get_flood_risk(
    lat: float = Query(..., ge=6.0, le=37.0),
    lon: float = Query(..., ge=68.0, le=97.5),
    db: AsyncSession = Depends(get_db),
) -> FloodRiskResponse:
    # --- resolve nearest district from DB for alert lookup ---
    state_code: Optional[str] = None
    district_code: Optional[str] = None
    try:
        from app.api.v1.locations import _haversine_km
        result = await db.execute(
            select(District).where(District.centroid_lat.isnot(None))
        )
        districts = result.scalars().all()
        if districts:
            nearest = min(
                districts,
                key=lambda d: _haversine_km(lat, lon, d.centroid_lat, d.centroid_lon),
            )
            district_code = nearest.district_code
            state_code = nearest.state_code
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not resolve district for risk at (%.4f, %.4f): %s", lat, lon, exc)

    # --- fetch official alerts (never downgraded) ---
    active_alerts = await _get_active_alerts(db, state_code, district_code)
    official_max = _max_alert_level(active_alerts)

    # --- compute internal risk score ---
    inputs = RiskInputs(lat=lat, lon=lon, district_code=district_code)
    score_result = await compute_risk_score(inputs)

    # --- enforce official alert floor ---
    final_level = score_result.risk_level
    alert_override = False
    _order = [RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.SEVERE, RiskLevel.UNKNOWN]

    if official_max and official_max != RiskLevel.UNKNOWN:
        internal_idx = _order.index(final_level) if final_level in _order else -1
        official_idx = _order.index(official_max)
        if official_idx > internal_idx:
            final_level = official_max
            alert_override = True
            logger.info(
                "Official alert raised risk for (%.4f, %.4f) from %s to %s",
                lat, lon, score_result.risk_level, final_level,
            )

    breakdown = RiskBreakdown(
        rainfall_contribution=score_result.rainfall_contribution,
        river_level_contribution=score_result.river_contribution,
        official_alert_override=alert_override,
        official_alert_level=official_max,
        community_report_count=score_result.community_report_count,
        composite_score=score_result.composite_score,
    )

    return FloodRiskResponse(
        lat=lat,
        lon=lon,
        risk_level=final_level,
        risk_score=score_result.composite_score,
        breakdown=breakdown,
        data_quality=score_result.data_quality,
        computed_at=datetime.now(timezone.utc),
        disclaimer=RISK_DISCLAIMER,
        sources_used=score_result.sources_used,
        missing_sources=score_result.missing_sources,
    )


# ---------------------------------------------------------------------------
# District-level risk
# ---------------------------------------------------------------------------

@router.get(
    "/district/{district_code}",
    response_model=DistrictRiskResponse,
    summary="Compute flood risk for a district (uses district centroid)",
)
async def get_district_risk(
    district_code: str,
    db: AsyncSession = Depends(get_db),
) -> DistrictRiskResponse:
    # --- load district ---
    result = await db.execute(
        select(District, State)
        .join(State, District.state_code == State.state_code)
        .where(District.district_code == district_code.upper())
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail=f"District '{district_code}' not found.")

    district, state = row

    if district.centroid_lat is None or district.centroid_lon is None:
        raise HTTPException(
            status_code=422,
            detail=f"District '{district_code}' has no centroid coordinates – cannot compute risk.",
        )

    lat, lon = district.centroid_lat, district.centroid_lon

    # --- official alerts ---
    active_alerts = await _get_active_alerts(db, state.state_code, district.district_code)
    official_max = _max_alert_level(active_alerts)

    # --- score ---
    inputs = RiskInputs(lat=lat, lon=lon, district_code=district.district_code)
    score_result = await compute_risk_score(inputs)

    final_level = score_result.risk_level
    alert_override = False
    _order = [RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.SEVERE, RiskLevel.UNKNOWN]

    if official_max and official_max != RiskLevel.UNKNOWN:
        internal_idx = _order.index(final_level) if final_level in _order else -1
        official_idx = _order.index(official_max)
        if official_idx > internal_idx:
            final_level = official_max
            alert_override = True

    breakdown = RiskBreakdown(
        rainfall_contribution=score_result.rainfall_contribution,
        river_level_contribution=score_result.river_contribution,
        official_alert_override=alert_override,
        official_alert_level=official_max,
        community_report_count=score_result.community_report_count,
        composite_score=score_result.composite_score,
    )

    return DistrictRiskResponse(
        lat=lat,
        lon=lon,
        district_code=district.district_code,
        district_name=district.name,
        state_code=state.state_code,
        risk_level=final_level,
        risk_score=score_result.composite_score,
        breakdown=breakdown,
        data_quality=score_result.data_quality,
        computed_at=datetime.now(timezone.utc),
        disclaimer=RISK_DISCLAIMER,
        sources_used=score_result.sources_used,
        missing_sources=score_result.missing_sources,
    )
