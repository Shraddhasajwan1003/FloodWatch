"""
JalDrishti India – /rivers Endpoints
Monitors river gauging stations and GloFAS hydrodynamic discharge forecasts.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import RiverStation, State
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

GLOFAS_LABEL = (
    "GloFAS v4 reanalysis / forecast – model output only. "
    "This is NOT an official CWC (Central Water Commission) staff gauge observation."
)


@router.get(
    "/stations",
    summary="List all monitored river gauge stations",
    description="Returns stations seeded across major Indian river basins (Brahmaputra, Yamuna, Ganga, Godavari, Krishna, Narmada, Mahanadi, Periyar, Cauvery, Jhelum).",
)
async def list_stations(
    state_code: Optional[str] = Query(None, description="Filter by state ISO code"),
    active_only: bool = Query(True, description="Return only active stations"),
    db: AsyncSession = Depends(get_db),
):
    query = select(RiverStation).options(selectinload(RiverStation.state)).order_by(RiverStation.name)
    if state_code:
        query = query.join(State).where(State.code == state_code.upper())
    if active_only:
        query = query.where(RiverStation.is_active == True)  # noqa: E712

    result = await db.execute(query)
    stations = result.scalars().all()
    station_outs = [RiverStationOut.model_validate(s) for s in stations]

    # Return both list structure for direct array consumers, and total wrapper
    return station_outs


@router.get(
    "/stations/{station_code}/discharge",
    response_model=DischargeResponse,
    summary="River discharge forecast (GloFAS model output) for a station",
)
async def get_station_discharge(
    station_code: str,
    db: AsyncSession = Depends(get_db),
) -> DischargeResponse:
    result = await db.execute(
        select(RiverStation)
        .options(selectinload(RiverStation.state))
        .where(RiverStation.station_code == station_code.upper())
    )
    station = result.scalar_one_or_none()

    if station is None:
        raise HTTPException(status_code=404, detail=f"Station '{station_code}' not found.")
    if not station.is_active:
        raise HTTPException(
            status_code=404,
            detail=f"Station '{station_code}' exists but is marked inactive.",
        )

    # Fetch GloFAS hydrodynamic discharge from Open-Meteo
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
                f"River discharge telemetry unavailable for station '{station_code}'. "
                f"Upstream error: {exc}"
            ),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error fetching discharge for station %s", station_code)
        raise HTTPException(status_code=500, detail="Internal error fetching discharge data.")

    # In open_meteo.py, raw returns "daily": [{"valid_date": "...", "river_discharge_m3s": ...}]
    daily_list = raw.get("daily", [])
    forecast_points: List[DischargeForecastPoint] = []
    latest_val = None
    latest_date = None

    for item in daily_list:
        v_date = item.get("valid_date")
        q_val = item.get("river_discharge_m3s")
        if q_val is not None:
            latest_val = q_val
            latest_date = v_date

        try:
            dt = datetime.fromisoformat(v_date) if v_date else None
        except Exception:
            dt = None

        forecast_points.append(
            DischargeForecastPoint(
                valid_date=v_date,
                time=dt,
                river_discharge_m3s=q_val,
                discharge_m3s=q_val,
                data_type=item.get("data_type", "glofas_forecast"),
            )
        )

    now_utc = datetime.now(timezone.utc)
    station_out = RiverStationOut.model_validate(station)

    return DischargeResponse(
        station_code=station.station_code,
        station_name=station.name,
        river_name=station.river_name,
        model_label=GLOFAS_LABEL,
        unit="m³/s",
        attribution=raw.get("attribution", "Open-Meteo Flood API / GloFAS"),
        quality=DataQuality.GOOD if forecast_points else DataQuality.UNAVAILABLE,
        source_id="open-meteo-flood-glofas",
        retrieved_at=now_utc,
        observed_at=now_utc,
        station=station_out,
        daily=forecast_points,
        forecast=forecast_points,
        latest_discharge_m3s=latest_val,
        latest_date=latest_date,
        disclaimer=(
            "Hydrological Caveat: Model discharge from GloFAS via Open-Meteo Flood API — "
            "NOT an official Indian government (CWC) staff gauge observation."
        ),
    )
