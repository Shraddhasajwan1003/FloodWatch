"""
FloodWatch India — Database Seed Service
Populates reference administrative data (States, Districts, River Stations, Data Sources, Facilities)
"""
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    State,
    District,
    RiverStation,
    DataSource,
    Facility,
    FacilityType,
)
from app.core.india_reference_data import (
    INDIAN_STATES,
    MONITORED_DISTRICTS,
    RIVER_STATIONS,
)

logger = logging.getLogger(__name__)

INITIAL_DATA_SOURCES = [
    {
        "source_key": "open-meteo-forecast",
        "name": "Open-Meteo Weather Forecast API",
        "provider": "Open-Meteo GmbH",
        "endpoint_url": "https://api.open-meteo.com/v1/forecast",
        "data_type": "weather_forecast",
        "geographic_coverage": "Global / India-wide",
        "update_frequency_minutes": 60,
        "requires_auth": False,
        "licence": "CC BY 4.0",
        "attribution": "Weather data by Open-Meteo.com under CC BY 4.0",
        "is_active": True,
    },
    {
        "source_key": "open-meteo-flood-glofas",
        "name": "Open-Meteo River Discharge API (GloFAS)",
        "provider": "Copernicus Emergency Management Service / Open-Meteo",
        "endpoint_url": "https://flood-api.open-meteo.com/v1/flood",
        "data_type": "river_discharge_forecast",
        "geographic_coverage": "Major Global River Basins (India)",
        "update_frequency_minutes": 1440,
        "requires_auth": False,
        "licence": "Copernicus CEMS / Open-Meteo CC BY 4.0",
        "attribution": "River discharge model output from GloFAS / Open-Meteo under CC BY 4.0",
        "is_active": True,
    },
    {
        "source_key": "ndma-sachet",
        "name": "NDMA SACHET Early Warning Portal",
        "provider": "National Disaster Management Authority (India)",
        "endpoint_url": "https://sachet.ndma.gov.in/",
        "data_type": "official_alerts",
        "geographic_coverage": "India National",
        "update_frequency_minutes": 15,
        "requires_auth": False,
        "licence": "Government of India Open Data",
        "attribution": "Official Alerts courtesy National Disaster Management Authority (NDMA) SACHET",
        "is_active": True,
    },
    {
        "source_key": "osm-nominatim",
        "name": "OpenStreetMap Nominatim Geocoding",
        "provider": "OpenStreetMap Foundation",
        "endpoint_url": "https://nominatim.openstreetmap.org",
        "data_type": "geocoding",
        "geographic_coverage": "India",
        "update_frequency_minutes": 0,
        "requires_auth": False,
        "licence": "ODbL",
        "attribution": "Geodata © OpenStreetMap contributors under ODbL",
        "is_active": True,
    },
    {
        "source_key": "osrm-routing",
        "name": "Open Source Routing Machine (OSRM)",
        "provider": "Project OSRM Demo",
        "endpoint_url": "https://router.project-osrm.org",
        "data_type": "routing",
        "geographic_coverage": "India",
        "update_frequency_minutes": 0,
        "requires_auth": False,
        "licence": "BSD 2-Clause / OSM Data ODbL",
        "attribution": "Routing via Project OSRM and OpenStreetMap contributors",
        "is_active": True,
    },
]

INITIAL_FACILITIES = [
    {
        "name": "Gauhati Medical College & Hospital (GMCH)",
        "facility_type": FacilityType.HOSPITAL,
        "lat": 26.1554,
        "lon": 91.7749,
        "address": "Bhangagarh, Guwahati, Assam 781032",
        "phone": "+91-361-2529457",
        "is_verified": True,
        "is_operational": True,
        "source": "Assam State Health Directorate Directory",
    },
    {
        "name": "Guwahati District Disaster Evacuation Shelter",
        "facility_type": FacilityType.SHELTER,
        "lat": 26.1722,
        "lon": 91.7588,
        "address": "Paltan Bazaar Community Hall, Guwahati, Assam",
        "phone": "1077",
        "is_verified": True,
        "is_operational": True,
        "source": "ASDMA Designated Shelter Registry",
    },
    {
        "name": "All India Institute of Medical Sciences (AIIMS) New Delhi",
        "facility_type": FacilityType.HOSPITAL,
        "lat": 28.5672,
        "lon": 77.2100,
        "address": "Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029",
        "phone": "+91-11-26588500",
        "is_verified": True,
        "is_operational": True,
        "source": "Ministry of Health & Family Welfare",
    },
    {
        "name": "Safdarjung Hospital Emergency Care",
        "facility_type": FacilityType.HOSPITAL,
        "lat": 28.5701,
        "lon": 77.2078,
        "address": "Ring Road, Opposite AIIMS, New Delhi 110029",
        "phone": "+91-11-26165060",
        "is_verified": True,
        "is_operational": True,
        "source": "Ministry of Health & Family Welfare",
    },
    {
        "name": "Yamuna Flood Relief Center Community Complex",
        "facility_type": FacilityType.RELIEF_CAMP,
        "lat": 28.6750,
        "lon": 77.2340,
        "address": "Near Old Yamuna Bridge, Civil Lines, Delhi",
        "phone": "1077",
        "is_verified": True,
        "is_operational": True,
        "source": "DDMA Relief Center Roster",
    },
    {
        "name": "King Edward Memorial (KEM) Hospital Mumbai",
        "facility_type": FacilityType.HOSPITAL,
        "lat": 19.0028,
        "lon": 72.8428,
        "address": "Acharya Donde Marg, Parel, Mumbai 400012",
        "phone": "+91-22-24107000",
        "is_verified": True,
        "is_operational": True,
        "source": "MCGM Disaster Management Dept",
    },
    {
        "name": "Rajiv Gandhi Government General Hospital Chennai",
        "facility_type": FacilityType.HOSPITAL,
        "lat": 13.0805,
        "lon": 80.2798,
        "address": "EVR Periyar Salai, Park Town, Chennai 600003",
        "phone": "+91-44-25305000",
        "is_verified": True,
        "is_operational": True,
        "source": "Tamil Nadu Health System Project",
    },
    {
        "name": "Patna Medical College and Hospital (PMCH)",
        "facility_type": FacilityType.HOSPITAL,
        "lat": 25.6206,
        "lon": 85.1585,
        "address": "Ashok Rajpath, Patna, Bihar 800004",
        "phone": "+91-612-2300080",
        "is_verified": True,
        "is_operational": True,
        "source": "Bihar State Disaster Management Authority",
    },
    {
        "name": "Government Medical College Ernakulam",
        "facility_type": FacilityType.HOSPITAL,
        "lat": 10.0553,
        "lon": 76.3533,
        "address": "HMT Colony, Kalamassery, Kochi, Kerala 683503",
        "phone": "+91-484-2754400",
        "is_verified": True,
        "is_operational": True,
        "source": "Kerala State Disaster Management Authority",
    },
]

async def seed_reference_data(session: AsyncSession) -> None:
    """Populates reference states, districts, river stations, data sources, and sample facilities."""
    try:
        # 1. Seed States
        state_code_to_id = {}
        for st in INDIAN_STATES:
            stmt = select(State).where(State.code == st["code"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                state_obj = State(
                    code=st["code"],
                    name=st["name"],
                    name_hi=st.get("name_hi"),
                    centroid_lat=st.get("lat"),
                    centroid_lon=st.get("lon"),
                )
                session.add(state_obj)
                await session.flush()
                state_code_to_id[st["code"]] = state_obj.id
            else:
                state_code_to_id[st["code"]] = existing.id

        # 2. Seed Districts
        for dst in MONITORED_DISTRICTS:
            st_id = state_code_to_id.get(dst["state_code"])
            if not st_id:
                continue
            stmt = select(District).where(District.code == dst["code"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                dist_obj = District(
                    code=dst["code"],
                    state_id=st_id,
                    name=dst["name"],
                    centroid_lat=dst["lat"],
                    centroid_lon=dst["lon"],
                )
                session.add(dist_obj)

        # 3. Seed River Stations
        for rst in RIVER_STATIONS:
            st_id = state_code_to_id.get(rst.get("state_code"))
            stmt = select(RiverStation).where(RiverStation.station_code == rst["station_code"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                r_obj = RiverStation(
                    station_code=rst["station_code"],
                    name=rst["name"],
                    river_name=rst["river_name"],
                    lat=rst["lat"],
                    lon=rst["lon"],
                    source_id=rst["source_id"],
                    measurement_type=rst.get("measurement_type", "discharge_m3s"),
                    warning_level_m=rst.get("warning_level_m"),
                    danger_level_m=rst.get("danger_level_m"),
                    state_id=st_id,
                    is_active=True,
                )
                session.add(r_obj)

        # 4. Seed Data Sources
        for ds in INITIAL_DATA_SOURCES:
            stmt = select(DataSource).where(DataSource.source_key == ds["source_key"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                ds_obj = DataSource(
                    source_key=ds["source_key"],
                    name=ds["name"],
                    provider=ds["provider"],
                    endpoint_url=ds.get("endpoint_url"),
                    data_type=ds.get("data_type"),
                    geographic_coverage=ds.get("geographic_coverage", "India"),
                    update_frequency_minutes=ds.get("update_frequency_minutes"),
                    requires_auth=ds.get("requires_auth", False),
                    licence=ds.get("licence"),
                    attribution=ds["attribution"],
                    is_active=ds.get("is_active", True),
                    last_success_at=datetime.now(timezone.utc),
                )
                session.add(ds_obj)

        # 5. Seed Facilities
        for fac in INITIAL_FACILITIES:
            stmt = select(Facility).where(Facility.name == fac["name"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                fac_obj = Facility(
                    name=fac["name"],
                    facility_type=fac["facility_type"],
                    lat=fac["lat"],
                    lon=fac["lon"],
                    address=fac.get("address"),
                    phone=fac.get("phone"),
                    is_verified=fac.get("is_verified", True),
                    is_operational=fac.get("is_operational", True),
                    source=fac["source"],
                    last_verified_at=datetime.now(timezone.utc),
                )
                session.add(fac_obj)

        await session.commit()
        logger.info("Database seeding completed successfully.")
    except Exception as e:
        await session.rollback()
        logger.error(f"Error seeding database: {e}")
