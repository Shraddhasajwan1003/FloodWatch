"""
FloodWatch India — Weather & Rainfall Service
Wraps Open-Meteo adapter with data normalization and statistical summaries (1h, 6h, 24h totals).
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from app.adapters.open_meteo import fetch_hourly_weather, fetch_historical_weather, OpenMeteoError
from app.schemas.schemas import DataQuality, HourlyRainfallPoint, RainfallResponse

logger = logging.getLogger(__name__)

class WeatherServiceError(Exception):
    """Raised when weather service fails to retrieve or process weather data."""
    pass

class WeatherService:
    async def get_rainfall(self, lat: float, lon: float, hours: int = 24) -> RainfallResponse:
        """
        Retrieves hourly rainfall points from Open-Meteo.
        Returns validated RainfallResponse Pydantic schema.
        """
        days = max(1, min(7, (hours // 24) + 1))
        try:
            raw = await fetch_hourly_weather(lat=lat, lon=lon, forecast_days=days)
        except OpenMeteoError as exc:
            raise WeatherServiceError(str(exc)) from exc
        except Exception as exc:
            raise WeatherServiceError(f"Unexpected error fetching weather: {exc}") from exc

        retrieved_at = datetime.fromisoformat(raw["retrieved_at"]) if isinstance(raw["retrieved_at"], str) else raw["retrieved_at"]
        hourly_records = raw.get("hourly", [])[:hours]

        points: List[HourlyRainfallPoint] = []
        total = 0.0
        has_any_val = False

        for h in hourly_records:
            t_str = h["valid_at"]
            dt = datetime.fromisoformat(t_str)
            p = h.get("precipitation_mm")
            points.append(HourlyRainfallPoint(time=dt, precipitation_mm=p))
            if p is not None:
                total += p
                has_any_val = True

        total_mm = round(total, 2) if has_any_val else None
        quality = DataQuality.GOOD if points else DataQuality.UNAVAILABLE

        return RainfallResponse(
            source_id="open-meteo-forecast",
            retrieved_at=retrieved_at,
            observed_at=retrieved_at,
            data_quality=quality,
            lat=lat,
            lon=lon,
            hours_requested=hours,
            data_type="weather_model_analysis",
            unit="mm",
            total_mm=total_mm,
            hourly=points,
        )

# Module-level convenience functions
_default_service = WeatherService()

async def get_rainfall_summary(lat: float, lon: float, hours: int = 48) -> Dict[str, Any]:
    resp = await _default_service.get_rainfall(lat, lon, hours)
    return {
        "source_id": resp.source_id,
        "attribution": "Weather data by Open-Meteo.com under CC BY 4.0",
        "retrieved_at": resp.retrieved_at.isoformat(),
        "data_type": resp.data_type,
        "quality": resp.data_quality.value.lower(),
        "lat": resp.lat,
        "lon": resp.lon,
        "total_24h_mm": resp.total_mm,
        "hourly": [{"valid_at": p.time.isoformat(), "precipitation_mm": p.precipitation_mm} for p in resp.hourly],
    }
