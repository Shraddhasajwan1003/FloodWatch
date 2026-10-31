"""
FloodWatch India — Application configuration.
All settings are read from environment variables (or .env file).
No sensitive value is ever hardcoded here.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Identity ────────────────────────────────────────────────────────────
    APP_NAME: str = "FloodWatch India"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = (
        "India-wide flood intelligence and emergency safe-route platform"
    )

    # ── API ─────────────────────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production"

    # ── Database ─────────────────────────────────────────────────────────────
    # Default: SQLite for local development. Change to PostgreSQL for production.
    DATABASE_URL: str = "sqlite+aiosqlite:///./floodwatch.db"

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # ── External data sources ─────────────────────────────────────────────────
    # Open-Meteo (free, no key required)
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    OPEN_METEO_FLOOD_URL: str = "https://flood-api.open-meteo.com/v1"
    OPEN_METEO_HISTORICAL_URL: str = "https://archive-api.open-meteo.com/v1"

    # Nominatim (OSM geocoding, free with attribution, rate-limited)
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"
    NOMINATIM_USER_AGENT: str = "FloodWatchIndia/0.1 (educational-project)"

    # OSRM public demo (rate-limited, not for production scale)
    OSRM_BASE_URL: str = "https://router.project-osrm.org"

    # NDMA SACHET CAP alert feed
    SACHET_CAP_FEED_URL: str = "https://sachet.ndma.gov.in/cap_public_website/FetchCapAlert"

    # Optional: paid or restricted services (disabled if not set)
    IMD_API_KEY: str = ""
    CWC_API_KEY: str = ""

    # ── Ingestion schedule ────────────────────────────────────────────────────
    WEATHER_REFRESH_MINUTES: int = 60
    ALERT_REFRESH_MINUTES: int = 15
    RIVER_REFRESH_MINUTES: int = 60

    # ── Freshness thresholds (minutes) ────────────────────────────────────────
    # Data older than this is considered STALE for display purposes.
    WEATHER_STALE_MINUTES: int = 120
    ALERT_STALE_MINUTES: int = 30
    RIVER_STALE_MINUTES: int = 120
    REPORT_EXPIRE_HOURS: int = 3

    # ── File uploads ──────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 5

    # ── Auth ─────────────────────────────────────────────────────────────────
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str = ""  # Set via env; leave blank to disable admin login

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
