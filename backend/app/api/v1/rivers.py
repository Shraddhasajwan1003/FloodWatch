"""
FloodWatch India – /rivers endpoints
======================================
Routes:
  GET /rivers/stations                             – list monitored river stations
  GET /rivers/stations/{station_code}/discharge    – discharge forecast from GloFAS

Policy:
  • ALL discharge data is labelled as "GloFAS v4 – model output".
    It is NOT CWC gauge data and must NOT be presented as such.
  • GloFAS failure → 503; discharge data is NEVER fabricated.
  • data_quality=STALE when cached data exceeds freshness window.
  • Inactive stations return 404.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import RiverStation
from app.adapters.open_meteo import fetch_river_discharge, OpenMeteoError
from app.schemas.schemas import (
    DataQuality,
    DischargeForecastPoint,
    DischargeResponse,
    RiverStationOut,
    RiverStationsResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rivers", tags=["Rivers"])

# GloFAS model label – shown on every discharge response to prevent misreading
GLOFAS_LABEL = (
    "GloFAS v4 reanalysis / forecast – model output only. "
    "This is NOT an official CWC (Central Water Commission) gauge observation."
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/stations",
    response_model=RiverStationsResponse,
    summary="List all monitored river gauge stations",
    description="Returns stations seeded from india_reference_data. is_active=False stations are included for reference.",
)
async def list_stations(
    state_code: Optional[str] = Query(None, description="Filter by state ISO code"),
    active_only: bool = Query(True, description="Return only active stations"),
    db: AsyncSession = Depends(get_db),
) -> RiverStationsResponse:
    query = select(RiverStation).order_by(RiverStation.name)
    if state_code:
        query = query.where(RiverStation.state_code == state_code.upper())
    if active_only:
        query = query.where(RiverStation.is_active == True)  # noqa: E712

    result = await db.execute(query)
    stations = result.scalars().all()
    return RiverStationsResponse(
        total=len(stations),
        stations=[RiverStationOut.model_validate(s) for s in stations],
    )


@router.get(
    "/stations/{station_code}/discharge",
    response_model=DischargeResponse,
    summary="River discharge forecast (GloFAS model output) for a station",
    description=(
        "Fetches GloFAS v4 river discharge for the station's lat/lon from Open-Meteo Flood API. "
        "This is a MODEL FORECAST, not a live CWC gauge reading. "
        "model_label field always states this explicitly."
    ),
)
async def get_station_discharge(
    station_code: str,
    db: AsyncSession = Depends(get_db),
) -> DischargeResponse:
    # --- look up station ---
    result = await db.execute(
        select(RiverStation).where(RiverStation.station_code == station_code.upper())
    )
    station = result.scalar_one_or_none()

    if station is None:
        raise HTTPException(status_code=404, detail=f"Station '{station_code}' not found.")
    if not station.is_active:
        raise HTTPException(
            status_code=404,
            detail=f"Station '{station_code}' exists but is marked inactive.",
        )

    # --- fetch GloFAS discharge from Open-Meteo ---
    try:
        raw = await fetch_river_discharge(lat=station.lat, lon=station.lon)
    except OpenMeteoError as exc:
        logger.error(
            "GloFAS fetch failed for station %s (%.4f, %.4f): %s",
            station_code, station.lat, station.lon, exc,
        )
        raise HTTPException(
            status_code=503,
            detail=(
                f"River discharge data unavailable for station '{station_code}'. "
                f"Upstream error: {exc}"
            ),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error fetching discharge for station %s", station_code)
        raise HTTPException(status_code=500, detail="Internal error fetching discharge data.")

    # --- build response ---
    forecast_points: list[DischargeForecastPoint] = []
    times = raw.get("hourly", {}).get("time", [])
    discharges = raw.get("hourly", {}).get("river_discharge", [])

    for t_str, q_val in zip(times, discharges):
        forecast_points.append(
            DischargeForecastPoint(
                time=datetime.fromisoformat(t_str),
                discharge_m3s=q_val,  # may be None – left as null, not defaulted
                return_period_exceeded=None,  # GloFAS basic endpoint doesn't provide this
            )
        )

    # Determine data quality based on metadata freshness
    data_quality = raw.get("_data_quality", DataQuality.GOOD)
    retrieved_at = raw.get("_retrieved_at", datetime.now(timezone.utc))
    observed_at = raw.get("_observed_at")

    return DischargeResponse(
        station_code=station.station_code,
        station_name=station.name,
        river_name=station.river_name,
        model_label=GLOFAS_LABEL,
        unit="m³/s",
        forecast=forecast_points,
        source_id="open_meteo_glofas",
        retrieved_at=retrieved_at,
        observed_at=observed_at,
        data_quality=data_quality,
    )
