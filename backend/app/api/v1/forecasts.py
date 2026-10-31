"""
FloodWatch India — /forecasts API Endpoint
Multi-day meteorological forecast and hydrological outlook.
"""
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from app.adapters.open_meteo import fetch_hourly_weather, OpenMeteoError

router = APIRouter()

@router.get("", summary="Get 7-day meteorological forecast and outlook")
async def get_forecast(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    days: int = Query(7, ge=1, le=14),
):
    """
    Returns weather model forecast.
    IMPORTANT: Meteorological precipitation forecasts are distinctly separated from
    hydrological street-level flood inundation forecasts.
    """
    try:
        raw_weather = await fetch_hourly_weather(lat=lat, lon=lon, forecast_days=days)
    except OpenMeteoError as e:
        raise HTTPException(status_code=502, detail=f"Weather forecast provider unavailable: {e}")

    # Aggregate into daily summaries
    hourly = raw_weather.get("hourly", [])
    daily_map = {}
    for h in hourly:
        date_str = h["valid_at"].split("T")[0]
        if date_str not in daily_map:
            daily_map[date_str] = {
                "date": date_str,
                "total_precipitation_mm": 0.0,
                "max_probability_pct": 0.0,
                "temp_max_c": -999.0,
                "temp_min_c": 999.0,
            }
        p = h.get("precipitation_mm") or 0.0
        prob = h.get("precipitation_probability_pct") or 0.0
        temp = h.get("temperature_2m_c")

        daily_map[date_str]["total_precipitation_mm"] += p
        daily_map[date_str]["max_probability_pct"] = max(daily_map[date_str]["max_probability_pct"], prob)
        if temp is not None:
            daily_map[date_str]["temp_max_c"] = max(daily_map[date_str]["temp_max_c"], temp)
            daily_map[date_str]["temp_min_c"] = min(daily_map[date_str]["temp_min_c"], temp)

    daily_list = []
    for d, val in sorted(daily_map.items()):
        val["total_precipitation_mm"] = round(val["total_precipitation_mm"], 2)
        if val["temp_max_c"] == -999.0:
            val["temp_max_c"] = None
        if val["temp_min_c"] == 999.0:
            val["temp_min_c"] = None
        
        # Hydrological flood risk commentary based on expected rainfall
        mm = val["total_precipitation_mm"]
        if mm > 65.0:
            hydro_outlook = "Elevated risk of localized waterlogging and drainage overwhelm."
            hydro_risk = "orange"
        elif mm > 35.0:
            hydro_outlook = "Moderate rain; watch low-lying streets and underpasses."
            hydro_risk = "yellow"
        else:
            hydro_outlook = "Normal conditions expected."
            hydro_risk = "green"

        val["hydrological_risk"] = hydro_risk
        val["hydrological_commentary"] = hydro_outlook
        daily_list.append(val)

    return {
        "location": {"lat": lat, "lon": lon},
        "retrieved_at": raw_weather["retrieved_at"],
        "source": "Open-Meteo Weather Forecast Model",
        "attribution": raw_weather["attribution"],
        "forecast_type": "meteorological_reanalysis_and_forecast",
        "disclaimer": (
            "NOTICE: Weather model rainfall is an atmospheric prediction, NOT a calibrated street flood model. "
            "Hydrological inundation also depends on terrain topography, soil moisture, and municipal drainage."
        ),
        "days": daily_list,
    }
