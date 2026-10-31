"""
FloodWatch India – Pydantic v2 Schemas
=======================================
Centralised request/response models for every API endpoint.

Design rules (mirroring system-wide data-integrity policy):
  • Every response that carries real-world measurements MUST expose:
      source_id, retrieved_at, observed_at, data_quality
  • Missing data → data_quality = "UNAVAILABLE"; never default to low-risk.
  • Stale data → data_quality = "STALE"  (caller must surface this to end users).
  • Risk levels from official government warnings cannot be downgraded by
    internal score computations.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Shared enumerations (mirrors app.models.models enums)
# ---------------------------------------------------------------------------

class RiskLevel(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    SEVERE = "SEVERE"
    UNKNOWN = "UNKNOWN"


class DataQuality(str, Enum):
    GOOD = "GOOD"          # Fresh, validated
    ESTIMATED = "ESTIMATED"  # Derived / model output
    STALE = "STALE"        # Beyond freshness threshold
    UNAVAILABLE = "UNAVAILABLE"  # Fetch failed or no data


class ReportStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class FacilityType(str, Enum):
    HOSPITAL = "hospital"
    SHELTER = "shelter"
    RELIEF_CAMP = "relief_camp"
    FIRE_STATION = "fire_station"


VALID_REPORT_CATEGORIES = {
    "waterlogging",
    "road_blocked",
    "bridge_damage",
    "basement_flooding",
    "drain_overflow",
    "other",
}


# ---------------------------------------------------------------------------
# Provenance base – every measurement response embeds this
# ---------------------------------------------------------------------------

class ProvenanceBase(BaseModel):
    """Embedded in every response that carries a real-world measurement."""
    source_id: str = Field(..., description="Unique identifier for the upstream data source")
    retrieved_at: datetime = Field(..., description="UTC timestamp when this data was fetched")
    observed_at: Optional[datetime] = Field(
        None, description="UTC timestamp of the actual observation / model run time"
    )
    data_quality: DataQuality = Field(..., description="Freshness/quality indicator for this reading")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class DataSourceHealth(BaseModel):
    source_id: str
    name: str
    healthy: bool
    last_checked: Optional[datetime]
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str = Field(..., description="'ok' or 'degraded'")
    version: str
    timestamp: datetime
    database: str = Field(..., description="'connected' or 'error'")
    data_sources: List[DataSourceHealth]


# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------

class StateOut(BaseModel):
    id: Optional[int] = None
    code: str
    state_code: Optional[str] = None
    name: str
    name_hi: Optional[str] = None
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def set_state_codes(cls, data: Any):
        if hasattr(data, "code"):
            c = getattr(data, "code")
            return {
                "id": getattr(data, "id", None),
                "code": c,
                "state_code": c,
                "name": getattr(data, "name", ""),
                "name_hi": getattr(data, "name_hi", None),
                "centroid_lat": getattr(data, "centroid_lat", None),
                "centroid_lon": getattr(data, "centroid_lon", None),
            }
        return data

    model_config = {"from_attributes": True}


class DistrictOut(BaseModel):
    id: Optional[int] = None
    code: str
    district_code: Optional[str] = None
    name: str
    name_hi: Optional[str] = None
    state_code: Optional[str] = None
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None

    @model_validator(mode="before")
    @classmethod
    def set_district_codes(cls, data: Any):
        if hasattr(data, "code"):
            c = getattr(data, "code")
            st = getattr(data, "state", None)
            st_code = getattr(st, "code", None) if st else None
            return {
                "id": getattr(data, "id", None),
                "code": c,
                "district_code": c,
                "name": getattr(data, "name", ""),
                "name_hi": getattr(data, "name_hi", None),
                "state_code": st_code,
                "centroid_lat": getattr(data, "centroid_lat", None),
                "centroid_lon": getattr(data, "centroid_lon", None),
            }
        return data

    model_config = {"from_attributes": True}


class GeocodingResult(BaseModel):
    display_name: str
    lat: float
    lon: float
    place_type: Optional[str] = None
    boundingbox: Optional[List[str]] = None
    osm_id: Optional[int] = None
    source: str = Field(default="Nominatim/OpenStreetMap", description="Geocoding provider")


class GeocodingResponse(BaseModel):
    query: str
    results: List[GeocodingResult]
    total: int


class NearbyLocationResult(BaseModel):
    district_code: str
    district_name: str
    state_code: str
    state_name: str
    distance_km: float


class NearbyResponse(BaseModel):
    lat: float
    lon: float
    radius_km: float
    results: List[NearbyLocationResult]


# ---------------------------------------------------------------------------
# Rainfall
# ---------------------------------------------------------------------------

class HourlyRainfallPoint(BaseModel):
    time: datetime
    precipitation_mm: Optional[float] = Field(None, description="mm of rainfall; null if sensor gap")


class RainfallResponse(ProvenanceBase):
    lat: float
    lon: float
    hours_requested: int
    data_type: str = Field(
        default="weather_model_analysis",
        description="Always 'weather_model_analysis' – NOT a flood forecast",
    )
    unit: str = Field(default="mm", description="Precipitation unit")
    total_mm: Optional[float] = Field(None, description="Sum over the period; null when data_quality!=GOOD")
    hourly: List[HourlyRainfallPoint]


# ---------------------------------------------------------------------------
# Rivers
# ---------------------------------------------------------------------------

class RiverStationOut(BaseModel):
    station_code: str
    name: str
    river_name: str
    state_code: str
    lat: float
    lon: float
    is_active: bool

    model_config = {"from_attributes": True}


class RiverStationsResponse(BaseModel):
    total: int
    stations: List[RiverStationOut]


class DischargeForecastPoint(BaseModel):
    time: datetime
    discharge_m3s: Optional[float] = Field(None, description="m³/s; null when missing in model output")
    return_period_exceeded: Optional[float] = Field(
        None, description="Return period (years) exceeded by this value; null if unknown"
    )


class DischargeResponse(ProvenanceBase):
    station_code: str
    station_name: str
    river_name: str
    model_label: str = Field(
        default="GloFAS v4 – model output, NOT an official CWC observation",
        description="Always shown to avoid mistaking model output for gauge data",
    )
    unit: str = Field(default="m³/s")
    forecast: List[DischargeForecastPoint]


# ---------------------------------------------------------------------------
# Flood Risk
# ---------------------------------------------------------------------------

class RiskBreakdown(BaseModel):
    rainfall_contribution: float = Field(..., ge=0, le=1)
    river_level_contribution: float = Field(..., ge=0, le=1)
    official_alert_override: bool = Field(
        ..., description="True when an official govt alert forces minimum risk level"
    )
    official_alert_level: Optional[RiskLevel] = None
    community_report_count: int = Field(default=0)
    composite_score: float = Field(..., ge=0, le=1)


class FloodRiskResponse(BaseModel):
    lat: float
    lon: float
    risk_level: RiskLevel
    risk_score: float = Field(..., ge=0, le=1)
    breakdown: RiskBreakdown
    data_quality: DataQuality
    computed_at: datetime
    disclaimer: str = Field(
        default=(
            "Risk score is model-derived. Always follow official government "
            "warnings which take precedence over any score shown here."
        )
    )
    sources_used: List[str]
    missing_sources: List[str] = Field(
        default_factory=list,
        description="Data sources that were unavailable during scoring",
    )


class DistrictRiskResponse(FloodRiskResponse):
    district_code: str
    district_name: str
    state_code: str


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class AlertOut(BaseModel):
    alert_id: str
    state_code: str
    district_code: Optional[str] = None
    severity: RiskLevel
    title: str
    description: str
    issued_by: str = Field(..., description="Issuing government body (e.g. IMD, NDMA, SDMA)")
    issued_at: datetime
    valid_until: Optional[datetime] = None
    is_active: bool
    source_url: Optional[str] = None

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    state_code: Optional[str]
    total: int
    alerts: List[AlertOut]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

class RouteRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lon: float = Field(..., ge=-180, le=180)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lon: float = Field(..., ge=-180, le=180)
    avoid_flood_zones: bool = Field(default=True)


class FloodExposureSegment(BaseModel):
    segment_index: int
    risk_level: RiskLevel
    length_m: float
    description: str


class RouteAlternative(BaseModel):
    route_index: int
    duration_seconds: float
    distance_meters: float
    geometry_polyline: str = Field(..., description="Encoded polyline (OSRM overview=full)")
    flood_exposure_score: float = Field(..., ge=0, le=1, description="0=safe, 1=fully flooded path")
    flood_risk_level: RiskLevel
    exposed_segments: List[FloodExposureSegment]
    recommended: bool = Field(default=False)
    warning: Optional[str] = None


class RouteResponse(BaseModel):
    origin: Tuple[float, float]
    destination: Tuple[float, float]
    routing_provider: str = Field(default="OSRM (project-osrm.org) – public demo server")
    routing_disclaimer: str = Field(
        default=(
            "Routes calculated from OSRM public demo. Flood exposure is assessed "
            "from available model data and may not reflect real-time road conditions. "
            "Always verify with local authorities before travel."
        )
    )
    computed_at: datetime
    alternatives: List[RouteAlternative]
    data_quality: DataQuality


# ---------------------------------------------------------------------------
# Community Reports
# ---------------------------------------------------------------------------

class ReportCreate(BaseModel):
    lat: float = Field(..., ge=6.0, le=37.0, description="Must be within India bounds")
    lon: float = Field(..., ge=68.0, le=97.5, description="Must be within India bounds")
    category: str
    description: str = Field(..., min_length=10, max_length=1000)
    severity_self_reported: RiskLevel = Field(default=RiskLevel.MODERATE)
    reporter_name: Optional[str] = Field(None, max_length=100)
    photo_url: Optional[str] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_REPORT_CATEGORIES:
            raise ValueError(
                f"category must be one of: {', '.join(sorted(VALID_REPORT_CATEGORIES))}"
            )
        return v


class ReportOut(BaseModel):
    report_id: str
    lat: float
    lon: float
    category: str
    description: str
    severity_self_reported: RiskLevel
    status: ReportStatus
    reporter_name: Optional[str]
    photo_url: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewer_note: Optional[str] = None

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    lat: float
    lon: float
    radius_km: float
    total: int
    reports: List[ReportOut]


class ReportStatusUpdate(BaseModel):
    status: ReportStatus
    reviewer_note: Optional[str] = Field(None, max_length=500)


# ---------------------------------------------------------------------------
# Facilities
# ---------------------------------------------------------------------------

class FacilityOut(BaseModel):
    facility_id: str
    name: str
    facility_type: FacilityType
    lat: float
    lon: float
    address: Optional[str] = None
    capacity: Optional[int] = None
    contact_phone: Optional[str] = None
    is_operational: bool
    distance_km: Optional[float] = None
    last_verified: Optional[datetime] = None

    model_config = {"from_attributes": True}


class FacilityListResponse(BaseModel):
    lat: float
    lon: float
    radius_km: float
    facility_type: Optional[str]
    total: int
    facilities: List[FacilityOut]


# ---------------------------------------------------------------------------
# Forecasts (weather only – explicitly NOT flood forecast)
# ---------------------------------------------------------------------------

class DailyForecastPoint(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD in IST")
    precipitation_sum_mm: Optional[float]
    precipitation_probability_max: Optional[float] = Field(None, ge=0, le=100)
    temperature_max_c: Optional[float]
    temperature_min_c: Optional[float]
    wind_speed_max_kmh: Optional[float]
    weather_code: Optional[int] = Field(None, description="WMO weather code")


class ForecastResponse(ProvenanceBase):
    lat: float
    lon: float
    days_requested: int
    forecast_type: str = Field(
        default="weather_model_forecast",
        description=(
            "This is a WEATHER forecast, NOT a flood forecast. "
            "Do not present as flood prediction."
        ),
    )
    model_name: str = Field(default="Open-Meteo (Best Match)")
    daily: List[DailyForecastPoint]
    disclaimer: str = Field(
        default=(
            "Weather forecasts are probabilistic model outputs. "
            "FloodWatch India does not guarantee forecast accuracy. "
            "This is NOT a flood forecast."
        )
    )


# ---------------------------------------------------------------------------
# Data Sources Registry
# ---------------------------------------------------------------------------

class DataSourceOut(BaseModel):
    source_id: str
    name: str
    description: str
    url: Optional[str] = None
    data_types: List[str]
    coverage: str = Field(..., description="e.g. 'India-wide' or 'GloFAS grid'")
    refresh_interval_seconds: Optional[int] = None
    is_official_government_source: bool
    is_active: bool
    last_success: Optional[datetime] = None
    last_error: Optional[str] = None
    health_status: str = Field(..., description="'healthy', 'degraded', 'down', 'unknown'")

    model_config = {"from_attributes": True}


class DataSourceListResponse(BaseModel):
    total: int
    sources: List[DataSourceOut]


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

class NotificationOut(BaseModel):
    notification_id: str
    title: str
    body: str
    severity: RiskLevel
    target_state: Optional[str] = None
    target_district: Optional[str] = None
    created_at: datetime
    is_read: bool = False

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    limit: int
    total: int
    notifications: List[NotificationOut]
