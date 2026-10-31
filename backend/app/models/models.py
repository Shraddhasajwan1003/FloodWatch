"""
FloodWatch India — SQLAlchemy database models.

Design principles:
- Every observation record carries: source_id, observed_at, retrieved_at, and a data_quality field.
- Geospatial coordinates stored as lat/lon floats (extensible to PostGIS geometry).
- Risk scores and computed values are stored separately from official warnings.
- No fabricated values are stored; missing inputs produce NULL, not 0.
"""
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ── Enums ──────────────────────────────────────────────────────────────────────


class RiskLevel(str, enum.Enum):
    GREEN = "green"
    YELLOW = "yellow"
    ORANGE = "orange"
    RED = "red"
    UNKNOWN = "unknown"


class DataQuality(str, enum.Enum):
    LIVE = "live"
    STALE = "stale"
    UNAVAILABLE = "unavailable"
    ESTIMATED = "estimated"
    SIMULATED = "simulated"  # Only used in tests; never shown as live


class ReportStatus(str, enum.Enum):
    UNVERIFIED = "unverified"
    UNDER_REVIEW = "under_review"
    CORROBORATED = "corroborated"
    VERIFIED = "verified"
    REJECTED = "rejected"
    EXPIRED = "expired"


class AlertSeverity(str, enum.Enum):
    WATCH = "watch"
    WARNING = "warning"
    SEVERE = "severe"
    EXTREME = "extreme"


class FacilityType(str, enum.Enum):
    HOSPITAL = "hospital"
    SHELTER = "shelter"
    RELIEF_CAMP = "relief_camp"
    FIRE_STATION = "fire_station"
    POLICE_STATION = "police_station"


# ── Geographic Hierarchy ────────────────────────────────────────────────────────


class State(Base):
    __tablename__ = "states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(8), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_hi: Mapped[Optional[str]] = mapped_column(String(100))  # Hindi
    centroid_lat: Mapped[Optional[float]] = mapped_column(Float)
    centroid_lon: Mapped[Optional[float]] = mapped_column(Float)
    bbox_min_lat: Mapped[Optional[float]] = mapped_column(Float)
    bbox_min_lon: Mapped[Optional[float]] = mapped_column(Float)
    bbox_max_lat: Mapped[Optional[float]] = mapped_column(Float)
    bbox_max_lon: Mapped[Optional[float]] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    districts = relationship("District", back_populates="state")


class District(Base):
    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    state_id: Mapped[int] = mapped_column(Integer, ForeignKey("states.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    name_hi: Mapped[Optional[str]] = mapped_column(String(150))
    centroid_lat: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lon: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    state = relationship("State", back_populates="districts")
    risk_assessments = relationship("FloodRiskAssessment", back_populates="district")


# ── Data Source Registry ────────────────────────────────────────────────────────


class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    provider: Mapped[str] = mapped_column(String(200), nullable=False)
    endpoint_url: Mapped[Optional[str]] = mapped_column(String(500))
    data_type: Mapped[str] = mapped_column(String(100))
    geographic_coverage: Mapped[str] = mapped_column(String(200))
    update_frequency_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    requires_auth: Mapped[bool] = mapped_column(Boolean, default=False)
    licence: Mapped[Optional[str]] = mapped_column(String(200))
    attribution: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_success_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_failure_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_failure_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Weather & Rainfall Observations ────────────────────────────────────────────


class RainfallObservation(Base):
    """
    Hourly precipitation values from Open-Meteo or other sources.
    'data_type' distinguishes observed from forecast.
    """
    __tablename__ = "rainfall_observations"
    __table_args__ = (
        UniqueConstraint("source_id", "lat", "lon", "observed_at", name="uq_rainfall"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_id: Mapped[str] = mapped_column(String(64), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # "observed" = model-estimated past; "forecast" = future model output
    data_type: Mapped[str] = mapped_column(String(32), nullable=False)
    precipitation_mm: Mapped[Optional[float]] = mapped_column(Float)
    precipitation_probability: Mapped[Optional[float]] = mapped_column(Float)
    quality: Mapped[DataQuality] = mapped_column(
        Enum(DataQuality), default=DataQuality.LIVE
    )
    district_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("districts.id"))


# ── River Station & Observations ───────────────────────────────────────────────


class RiverStation(Base):
    __tablename__ = "river_stations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    river_name: Mapped[str] = mapped_column(String(200), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    source_id: Mapped[str] = mapped_column(String(64), nullable=False)
    # GloFAS river basin ID for Open-Meteo Flood API
    glofas_river_id: Mapped[Optional[int]] = mapped_column(Integer)
    # Thresholds — nullable because not all stations publish them
    warning_level_m: Mapped[Optional[float]] = mapped_column(Float)
    danger_level_m: Mapped[Optional[float]] = mapped_column(Float)
    # Measurement type: "level_m", "discharge_m3s"
    measurement_type: Mapped[str] = mapped_column(String(32), default="discharge_m3s")
    state_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("states.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    observations = relationship("RiverObservation", back_populates="station")


class RiverObservation(Base):
    __tablename__ = "river_observations"
    __table_args__ = (
        UniqueConstraint("station_id", "observed_at", name="uq_river_obs"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    station_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("river_stations.id"), nullable=False
    )
    observed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    value: Mapped[Optional[float]] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(32), nullable=False)
    data_type: Mapped[str] = mapped_column(String(32), default="observed")
    quality: Mapped[DataQuality] = mapped_column(
        Enum(DataQuality), default=DataQuality.LIVE
    )

    station = relationship("RiverStation", back_populates="observations")


# ── Official Alerts ─────────────────────────────────────────────────────────────


class OfficialAlert(Base):
    __tablename__ = "official_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_id: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    source_id: Mapped[str] = mapped_column(String(64), nullable=False)
    source_url: Mapped[Optional[str]] = mapped_column(String(500))
    issuer: Mapped[str] = mapped_column(String(200), nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity), nullable=False)
    headline: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    area_description: Mapped[Optional[str]] = mapped_column(Text)
    # Bounding box for the alert area (if available)
    area_lat_min: Mapped[Optional[float]] = mapped_column(Float)
    area_lon_min: Mapped[Optional[float]] = mapped_column(Float)
    area_lat_max: Mapped[Optional[float]] = mapped_column(Float)
    area_lon_max: Mapped[Optional[float]] = mapped_column(Float)
    effective_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    state_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("states.id"))
    district_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("districts.id"))


# ── Flood Risk Assessments ──────────────────────────────────────────────────────


class FloodRiskAssessment(Base):
    """
    Computed risk assessment for a district at a specific time.
    Computed values are always clearly separated from official warnings.
    """
    __tablename__ = "flood_risk_assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    district_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("districts.id"), nullable=False
    )
    assessed_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # Official warning (if any) — takes precedence in display
    official_risk_level: Mapped[Optional[RiskLevel]] = mapped_column(Enum(RiskLevel))
    official_alert_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("official_alerts.id")
    )
    # Computed score from internal rule-based model (0–100)
    computed_score: Mapped[Optional[float]] = mapped_column(Float)
    computed_risk_level: Mapped[Optional[RiskLevel]] = mapped_column(Enum(RiskLevel))
    # The level shown to the user (max of official and computed)
    displayed_risk_level: Mapped[RiskLevel] = mapped_column(
        Enum(RiskLevel), default=RiskLevel.UNKNOWN
    )
    # Score breakdown (JSON string)
    score_breakdown_json: Mapped[Optional[str]] = mapped_column(Text)
    # Data inputs summary
    rainfall_1h_mm: Mapped[Optional[float]] = mapped_column(Float)
    rainfall_24h_mm: Mapped[Optional[float]] = mapped_column(Float)
    forecast_rainfall_24h_mm: Mapped[Optional[float]] = mapped_column(Float)
    river_level_pct: Mapped[Optional[float]] = mapped_column(Float)  # % of danger level
    data_quality: Mapped[DataQuality] = mapped_column(
        Enum(DataQuality), default=DataQuality.LIVE
    )
    model_version: Mapped[str] = mapped_column(String(32), default="rule-based-v1")

    district = relationship("District", back_populates="risk_assessments")


# ── Community Reports ──────────────────────────────────────────────────────────


class CommunityReport(Base):
    __tablename__ = "community_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    water_depth_cm: Mapped[Optional[float]] = mapped_column(Float)
    road_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    image_path: Mapped[Optional[str]] = mapped_column(String(500))
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus), default=ReportStatus.UNVERIFIED
    )
    submitted_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    reviewer_note: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    district_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("districts.id"))
    # Source IP hash (for dedup, not stored as raw IP)
    submitter_hash: Mapped[Optional[str]] = mapped_column(String(64))


# ── Facilities (Hospitals, Shelters) ──────────────────────────────────────────


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    osm_id: Mapped[Optional[str]] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    facility_type: Mapped[FacilityType] = mapped_column(Enum(FacilityType), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_operational: Mapped[Optional[bool]] = mapped_column(Boolean)  # None = unknown
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    district_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("districts.id"))
    last_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Notifications ──────────────────────────────────────────────────────────────


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    source_id: Mapped[Optional[str]] = mapped_column(String(64))
    district_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("districts.id"))
    state_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("states.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    # Dedup key to prevent repeated alerts for the same event
    dedup_key: Mapped[Optional[str]] = mapped_column(String(128), unique=True)
