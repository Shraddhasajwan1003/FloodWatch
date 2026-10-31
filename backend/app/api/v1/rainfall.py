"""
FloodWatch India – /rainfall endpoint
=======================================
GET /rainfall?lat=&lon=&hours=24

Delegates to WeatherService (which wraps the Open-Meteo adapter with caching).

Policy:
  • data_type is ALWAYS 'weather_model_analysis' – never present as flood forecast.
  • data_quality is set by WeatherService based on data age.
  • Open-Meteo failure → 503 with upstream error; never fabricated rainfall.
  • STALE data is returned with data_quality=STALE so callers can warn users.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.services.weather_service import WeatherService, WeatherServiceError
from app.schemas.schemas import DataQuality, HourlyRainfallPoint, RainfallResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rainfall", tags=["Rainfall"])

_weather_service = WeatherService()


@router.get(
    "",
    response_model=RainfallResponse,
    summary="Historical/recent precipitation at a coordinate",
    description=(
        "Returns hourly precipitation from Open-Meteo ERA5/analysis model. "
        "data_type='weather_model_analysis' — this is NOT a flood forecast. "
        "data_quality='STALE' if cached data exceeds freshness threshold. "
        "Unavailable upstream → 503, never fabricated values."
    ),
)
async def get_rainfall(
    lat: float = Query(..., ge=6.0, le=37.0, description="Latitude (India bounds)"),
    lon: float = Query(..., ge=68.0, le=97.5, description="Longitude (India bounds)"),
    hours: int = Query(24, ge=1, le=168, description="Look-back window in hours (max 7 days)"),
) -> RainfallResponse:
    try:
        data = await _weather_service.get_rainfall(lat=lat, lon=lon, hours=hours)
    except WeatherServiceError as exc:
        logger.error("WeatherService rainfall error for (%.4f, %.4f): %s", lat, lon, exc)
        raise HTTPException(
            status_code=503,
            detail=f"Rainfall data unavailable: {exc}. Source: Open-Meteo.",
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error fetching rainfall for (%.4f, %.4f)", lat, lon)
        raise HTTPException(status_code=500, detail="Internal error fetching rainfall data.")

    return data


@router.get(
    "/summary",
    response_model=dict,
    summary="Quick 24-hour rainfall total at a coordinate",
    description="Convenience endpoint returning just the 24-hour total (mm) and data_quality.",
)
async def get_rainfall_summary(
    lat: float = Query(..., ge=6.0, le=37.0),
    lon: float = Query(..., ge=68.0, le=97.5),
) -> dict:
    """
    Lightweight endpoint for dashboard cards: returns total_mm + quality in one call.
    If data is unavailable, returns total_mm=null with data_quality=UNAVAILABLE.
    """
    try:
        data = await _weather_service.get_rainfall(lat=lat, lon=lon, hours=24)
        return {
            "lat": lat,
            "lon": lon,
            "total_mm_24h": data.total_mm,
            "data_quality": data.data_quality,
            "observed_at": data.observed_at,
            "retrieved_at": data.retrieved_at,
            "source_id": data.source_id,
            "note": "weather_model_analysis – NOT a flood forecast",
        }
    except WeatherServiceError as exc:
        logger.error("Rainfall summary unavailable for (%.4f, %.4f): %s", lat, lon, exc)
        return {
            "lat": lat,
            "lon": lon,
            "total_mm_24h": None,
            "data_quality": DataQuality.UNAVAILABLE,
            "observed_at": None,
            "retrieved_at": datetime.now(timezone.utc),
            "source_id": "open_meteo",
            "note": f"Data unavailable: {exc}",
        }
