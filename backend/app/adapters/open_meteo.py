"""
FloodWatch India — Open-Meteo data adapter.

This adapter fetches real weather and rainfall data from Open-Meteo.
Open-Meteo is a free, open-source weather API that does not require an API key.
Attribution: https://open-meteo.com/en/terms
Licence: CC BY 4.0 for non-commercial use.

IMPORTANT DISTINCTIONS:
- 'precipitation' from Open-Meteo historical/current = model-reanalysis (estimated, not directly observed)
- 'precipitation' from Open-Meteo forecast = weather model output (not a flood forecast)
- River discharge from Open-Meteo Flood API = GloFAS hydrological model output
- None of these are official Indian government measurements
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.config import get_settings

settings = get_settings()

# Attribution string to display in the UI alongside this data
OPEN_METEO_ATTRIBUTION = (
    "Weather data: Open-Meteo.com (open-source weather API). "
    "Model reanalysis data, not direct observations. "
    "Free for non-commercial use under CC BY 4.0."
)

OPEN_METEO_FLOOD_ATTRIBUTION = (
    "River discharge: Open-Meteo Flood API / GloFAS hydrological model. "
    "Model output, not an official gauge observation. "
    "Free for non-commercial use under CC BY 4.0."
)


class OpenMeteoError(Exception):
    """Raised when Open-Meteo returns an unexpected response."""
    pass


async def fetch_hourly_weather(
    lat: float,
    lon: float,
    forecast_days: int = 7,
) -> Dict[str, Any]:
    """
    Fetch hourly weather forecast from Open-Meteo.

    Returns a dict with:
    - retrieved_at: datetime
    - source_id: str
    - attribution: str
    - data_type: str ("forecast")
    - elevation_m: float
    - timezone: str
    - hourly: list of {time, precipitation_mm, precipitation_probability_pct, temperature_2m_c, ...}

    Raises OpenMeteoError if the request fails or the response is malformed.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join([
            "precipitation",
            "precipitation_probability",
            "temperature_2m",
            "windspeed_10m",
            "weathercode",
            "relativehumidity_2m",
        ]),
        "forecast_days": forecast_days,
        "timezone": "Asia/Kolkata",
        "timeformat": "iso8601",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(
                f"{settings.OPEN_METEO_BASE_URL}/forecast",
                params=params,
            )
            response.raise_for_status()
        except httpx.TimeoutException as e:
            raise OpenMeteoError(f"Open-Meteo request timed out: {e}") from e
        except httpx.HTTPStatusError as e:
            raise OpenMeteoError(
                f"Open-Meteo returned HTTP {e.response.status_code}: {e.response.text}"
            ) from e

    raw = response.json()

    # Validate expected fields
    required = {"hourly", "elevation", "timezone", "hourly_units"}
    missing = required - set(raw.keys())
    if missing:
        raise OpenMeteoError(f"Open-Meteo response missing fields: {missing}")

    hourly_data = raw["hourly"]
    times = hourly_data.get("time", [])
    precipitations = hourly_data.get("precipitation", [])
    precip_probs = hourly_data.get("precipitation_probability", [])
    temperatures = hourly_data.get("temperature_2m", [])
    windspeed = hourly_data.get("windspeed_10m", [])

    hourly_records = []
    for i, t in enumerate(times):
        hourly_records.append({
            "valid_at": t,
            "precipitation_mm": precipitations[i] if i < len(precipitations) else None,
            "precipitation_probability_pct": precip_probs[i] if i < len(precip_probs) else None,
            "temperature_2m_c": temperatures[i] if i < len(temperatures) else None,
            "windspeed_10m_ms": windspeed[i] if i < len(windspeed) else None,
            "data_type": "forecast",
        })

    return {
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "source_id": "open-meteo-forecast",
        "attribution": OPEN_METEO_ATTRIBUTION,
        "data_type": "weather_forecast",
        "elevation_m": raw.get("elevation"),
        "timezone": raw.get("timezone"),
        "lat": raw.get("latitude"),
        "lon": raw.get("longitude"),
        "hourly": hourly_records,
    }


async def fetch_historical_weather(
    lat: float,
    lon: float,
    start_date: str,  # YYYY-MM-DD
    end_date: str,    # YYYY-MM-DD
) -> Dict[str, Any]:
    """
    Fetch historical weather data (model reanalysis) from Open-Meteo Archive API.
    This is model-estimated, not directly observed station data.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "precipitation,temperature_2m,windspeed_10m",
        "timezone": "Asia/Kolkata",
        "timeformat": "iso8601",
    }

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            response = await client.get(
                f"{settings.OPEN_METEO_HISTORICAL_URL}/archive",
                params=params,
            )
            response.raise_for_status()
        except (httpx.TimeoutException, httpx.HTTPStatusError) as e:
            raise OpenMeteoError(f"Open-Meteo historical request failed: {e}") from e

    raw = response.json()
    hourly_data = raw.get("hourly", {})
    times = hourly_data.get("time", [])
    precipitations = hourly_data.get("precipitation", [])

    hourly_records = [
        {
            "valid_at": times[i],
            "precipitation_mm": precipitations[i] if i < len(precipitations) else None,
            "data_type": "model_reanalysis",
        }
        for i in range(len(times))
    ]

    return {
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "source_id": "open-meteo-historical",
        "attribution": OPEN_METEO_ATTRIBUTION,
        "data_type": "historical_reanalysis",
        "lat": raw.get("latitude"),
        "lon": raw.get("longitude"),
        "hourly": hourly_records,
    }


async def fetch_river_discharge(
    lat: float,
    lon: float,
    forecast_days: int = 7,
) -> Dict[str, Any]:
    """
    Fetch river discharge forecast from Open-Meteo Flood API (GloFAS model).

    IMPORTANT: This is GloFAS hydrological model output — NOT an official
    Indian government river gauge reading. It represents a modelled discharge
    estimate and may not match actual river conditions.

    Only available for rivers that GloFAS covers (major rivers).
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "river_discharge",
        "forecast_days": forecast_days,
        "timeformat": "iso8601",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(
                f"{settings.OPEN_METEO_FLOOD_URL}/flood",
                params=params,
            )
            response.raise_for_status()
        except httpx.TimeoutException as e:
            raise OpenMeteoError(f"Open-Meteo Flood API timed out: {e}") from e
        except httpx.HTTPStatusError as e:
            raise OpenMeteoError(
                f"Open-Meteo Flood API returned HTTP {e.response.status_code}"
            ) from e

    raw = response.json()
    daily_data = raw.get("daily", {})
    times = daily_data.get("time", [])
    discharges = daily_data.get("river_discharge", [])

    daily_records = [
        {
            "valid_date": times[i],
            "river_discharge_m3s": discharges[i] if i < len(discharges) else None,
            "data_type": "glofas_forecast",
        }
        for i in range(len(times))
    ]

    return {
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "source_id": "open-meteo-flood-glofas",
        "attribution": OPEN_METEO_FLOOD_ATTRIBUTION,
        "data_type": "river_discharge_forecast",
        "lat": raw.get("latitude"),
        "lon": raw.get("longitude"),
        "daily": daily_records,
    }
