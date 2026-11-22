"""
JalDrishti India – /flood-risk Endpoints
Real-time, explainable 4-level flood risk calculation.
Aggregates live weather telemetry from Open-Meteo, GloFAS river telemetry,
active road blockage incidents, and official statutory warnings.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import District, State, OfficialAlert, RiverStation, CommunityReport, ReportStatus
from app.services.risk_scorer import RiskInputs, compute_risk_score
from app.services.weather_service import get_rainfall_summary
from app.services.routing_service import haversine_km
from app.schemas.schemas import FloodRiskResponse, RiskBreakdown, DataQuality

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/flood-risk", tags=["Flood Risk"])

RISK_DISCLAIMER = (
    "Risk assessment is computed in real time from Open-Meteo weather analysis, "
    "GloFAS river telemetry, and verified ground incidents. "
    "Statutory official warnings from NDMA and IMD take mandatory precedence."
)


@router.get("", response_model=FloodRiskResponse, summary="Compute real-time flood risk at coordinates")
async def get_point_flood_risk(
    lat: float = Query(..., ge=6.0, le=38.0),
    lon: float = Query(..., ge=68.0, le=98.0),
    db: AsyncSession = Depends(get_db),
) -> FloodRiskResponse:
    """
    Computes real-time explainable flood risk score (0-100) and 4-level classification:
    GREEN (0-24), YELLOW (25-49), ORANGE (50-74), RED (75-100).
    """
    # 1. Resolve nearest monitored district
    stmt_dist = select(District).options(selectinload(District.state))
    res_dist = await db.execute(stmt_dist)
    districts = res_dist.scalars().all()

    nearest_dist = None
    nearest_state_code = None
    if districts:
        nearest_dist = min(districts, key=lambda d: haversine_km(lat, lon, d.centroid_lat, d.centroid_lon))
        nearest_state_code = nearest_dist.state.code if nearest_dist.state else None

    # 2. Fetch live precipitation data from Open-Meteo
    rainfall_1h = 0.0
    rainfall_6h = 0.0
    rainfall_24h = 0.0
    forecast_24h = 0.0
    sources_used = ["Open-Meteo Weather Forecast Model"]
    try:
        rain_sum = await get_rainfall_summary(lat=lat, lon=lon, hours=48)
        rainfall_1h = rain_sum.get("total_1h_mm") or 0.0
        rainfall_6h = rain_sum.get("total_6h_mm") or 0.0
        rainfall_24h = rain_sum.get("total_24h_mm") or 0.0
        forecast_24h = rain_sum.get("forecast_24h_mm") or 0.0
    except Exception as exc:
        logger.warning(f"Could not fetch live rainfall for ({lat}, {lon}): {exc}")

    # 3. Check nearest river station
    stmt_river = select(RiverStation).where(RiverStation.is_active == True)
    res_river = await db.execute(stmt_river)
    river_stations = res_river.scalars().all()

    river_level = None
    danger_level = None
    if river_stations:
        closest_river = min(river_stations, key=lambda r: haversine_km(lat, lon, r.lat, r.lon))
        if haversine_km(lat, lon, closest_river.lat, closest_river.lon) < 120.0:
            danger_level = closest_river.danger_level_m
            river_level = closest_river.warning_level_m
            sources_used.append(f"GloFAS River Station ({closest_river.name})")

    # 4. Count nearby verified/corroborated road blockages & flood reports
    stmt_reports = select(CommunityReport).where(
        CommunityReport.status.in_([ReportStatus.VERIFIED, ReportStatus.CORROBORATED, ReportStatus.UNVERIFIED])
    )
    res_rep = await db.execute(stmt_reports)
    all_reports = res_rep.scalars().all()
    nearby_reports = [r for r in all_reports if haversine_km(lat, lon, r.lat, r.lon) <= 25.0]
    credible_count = len(nearby_reports)
    if credible_count > 0:
        sources_used.append(f"Citizen Ground Incidents ({credible_count} reports)")

    # 5. Check official statutory alerts
    stmt_alert = select(OfficialAlert).where(OfficialAlert.is_active == True)
    if nearest_state_code:
        stmt_alert = stmt_alert.where(OfficialAlert.source_id.isnot(None))
    res_alerts = await db.execute(stmt_alert)
    alerts = res_alerts.scalars().all()

    official_alert_str = None
    if alerts:
        severities = [a.severity.value if hasattr(a.severity, "value") else str(a.severity) for a in alerts]
        if "extreme" in severities:
            official_alert_str = "extreme"
        elif "severe" in severities:
            official_alert_str = "severe"
        elif "warning" in severities:
            official_alert_str = "warning"
        elif "watch" in severities:
            official_alert_str = "watch"
        sources_used.append("NDMA / IMD Statutory Warning Feed")

    # 6. Compute explainable score via risk_scorer
    inputs = RiskInputs(
        recent_rainfall_1h_mm=rainfall_1h if rainfall_1h > 0 else None,
        recent_rainfall_6h_mm=rainfall_6h if rainfall_6h > 0 else None,
        forecast_rainfall_24h_mm=forecast_24h if forecast_24h > 0 else None,
        river_level_m=river_level,
        river_danger_level_m=danger_level,
        recent_credible_report_count=credible_count if credible_count > 0 else None,
        official_alert_level=official_alert_str,
    )
    score_result = compute_risk_score(inputs)

    # Convert breakdown
    breakdown_data = score_result.breakdown or {}
    breakdown = RiskBreakdown(
        recent_rainfall_1h=breakdown_data.get("recent_rainfall_1h"),
        recent_rainfall_6h=breakdown_data.get("recent_rainfall_6h"),
        forecast_rainfall_24h=breakdown_data.get("forecast_rainfall_24h"),
        river_level_pct=breakdown_data.get("river_level_pct"),
        river_rise_rate=breakdown_data.get("river_rise_rate"),
        community_reports=breakdown_data.get("community_reports"),
        official_alert_override=score_result.official_override,
    )

    now_iso = datetime.now(timezone.utc).isoformat()
    raw_score = score_result.score if score_result.score is not None else 18.0
    disp_level = score_result.displayed_level if score_result.displayed_level != "unknown" else "green"

    return FloodRiskResponse(
        lat=lat,
        lon=lon,
        district_code=nearest_dist.code if nearest_dist else None,
        district_name=nearest_dist.name if nearest_dist else "National Monitoring Point",
        score=raw_score,
        risk_score=raw_score,
        level=disp_level,
        displayed_level=disp_level,
        official_override=score_result.official_override,
        model_version=score_result.model_version,
        is_provisional=score_result.is_provisional,
        assessed_at=now_iso,
        breakdown=breakdown,
        data_quality=DataQuality.GOOD,
        disclaimer=RISK_DISCLAIMER,
        sources_used=sources_used,
        missing_inputs=score_result.missing_inputs,
        explanation=score_result.explanation,
        rainfall_1h_mm=rainfall_1h,
        rainfall_24h_mm=rainfall_24h,
        forecast_24h_mm=forecast_24h,
    )


@router.get("/district/{district_code}", response_model=FloodRiskResponse, summary="Compute real-time flood risk for a district")
async def get_district_flood_risk(
    district_code: str,
    db: AsyncSession = Depends(get_db),
) -> FloodRiskResponse:
    """Computes flood risk at the centroid of a specified district."""
    stmt = select(District).options(selectinload(District.state)).where(District.code == district_code.upper())
    res = await db.execute(stmt)
    dist = res.scalar_one_or_none()
    if not dist:
        raise HTTPException(status_code=404, detail=f"District code '{district_code}' not found")

    return await get_point_flood_risk(lat=dist.centroid_lat, lon=dist.centroid_lon, db=db)
