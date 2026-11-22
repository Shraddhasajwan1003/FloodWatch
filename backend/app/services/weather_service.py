"""
JalDrishti India — Weather & Rainfall Service
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
    async def get_rainfall(self, lat: float, lon: float, hours: int = 48) -> RainfallResponse:
        """
        Retrieves hourly rainfall points from Open-Meteo.
        Returns validated RainfallResponse Pydantic schema with valid_at, aggregates and temperature.
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

        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00")
        current_idx = 0
        for idx, item in enumerate(hourly_records):
            if item.get("valid_at", "") >= now_iso:
                current_idx = idx
                break

        points: List[HourlyRainfallPoint] = []
        total = 0.0
        has_any_val = False

        for h in hourly_records:
            t_str = h["valid_at"]
            dt = datetime.fromisoformat(t_str)
            p = h.get("precipitation_mm")
            prob = h.get("precipitation_probability_pct")
            temp = h.get("temperature_2m_c")
            is_forecast = h.get("data_type") == "forecast"

            points.append(
                HourlyRainfallPoint(
                    time=dt,
                    valid_at=t_str,
                    precipitation_mm=p,
                    precipitation_probability_pct=prob,
                    temperature_2m_c=temp,
                    data_type="forecast" if is_forecast else "model_reanalysis",
                )
            )
            if p is not None:
                total += p
                has_any_val = True

        def sum_range(items):
            vals = [it.precipitation_mm for it in items if it.precipitation_mm is not None]
            return round(sum(vals), 2) if vals else 0.0

        past_1h = points[max(0, current_idx - 1) : current_idx]
        past_6h = points[max(0, current_idx - 6) : current_idx]
        past_24h = points[max(0, current_idx - 24) : current_idx]
        next_24h = points[current_idx : min(len(points), current_idx + 24)]

        total_1h = sum_range(past_1h) if past_1h else (points[current_idx].precipitation_mm if current_idx < len(points) else 0.0)
        total_6h = sum_range(past_6h)
        total_24h = sum_range(past_24h) if past_24h else round(total, 2)
        forecast_24h = sum_range(next_24h)

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
            total_1h_mm=total_1h,
            total_6h_mm=total_6h,
            total_24h_mm=total_24h,
            forecast_24h_mm=forecast_24h,
            elevation_m=raw.get("elevation_m"),
            attribution=raw.get("attribution", "Weather data: Open-Meteo.com under CC BY 4.0"),
            hourly=points,
        )

# Module-level convenience functions
_default_service = WeatherService()

async def get_rainfall_summary(lat: float, lon: float, hours: int = 48) -> Dict[str, Any]:
    resp = await _default_service.get_rainfall(lat, lon, hours)
    return {
        "source_id": resp.source_id,
        "attribution": resp.attribution,
        "retrieved_at": resp.retrieved_at.isoformat(),
        "data_type": resp.data_type,
        "quality": resp.data_quality.value.lower(),
        "lat": resp.lat,
        "lon": resp.lon,
        "total_1h_mm": resp.total_1h_mm,
        "total_6h_mm": resp.total_6h_mm,
        "total_24h_mm": resp.total_24h_mm,
        "forecast_24h_mm": resp.forecast_24h_mm,
        "hourly": [
            {
                "valid_at": p.valid_at or p.time.isoformat(),
                "precipitation_mm": p.precipitation_mm,
                "precipitation_probability_pct": p.precipitation_probability_pct,
                "temperature_2m_c": p.temperature_2m_c,
                "data_type": p.data_type,
            }
            for p in resp.hourly
        ],
    }
