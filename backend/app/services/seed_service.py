"""
FloodWatch India — Database Seed Service
Populates reference administrative data (States, Districts, River Stations, Data Sources, Facilities)
"""
import json
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
    RescueRequest,
    RescueStatus,
    OfficialAlert,
    AlertSeverity,
    User,
    UserRole,
)
from app.services.auth_service import hash_password
from app.api.v1.alerts import OFFICIAL_DOS_AND_DONTS
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
    # Coastal Odisha Shelters
    {
        "name": "Paradip Port Disaster Evacuation Shelter & Cyclone Center",
        "facility_type": FacilityType.SHELTER,
        "lat": 20.2644,
        "lon": 86.6710,
        "address": "Port Township Sector 21, Paradip, Jagatsinghpur, Odisha",
        "phone": "+91-6722-222034",
        "is_verified": True,
        "is_operational": True,
        "source": "OSDMA Multipurpose Cyclone Shelter Network",
    },
    {
        "name": "Puri Coastal Multi-Hazard Cyclone Shelter",
        "facility_type": FacilityType.SHELTER,
        "lat": 19.8135,
        "lon": 85.8312,
        "address": "Chakratirtha Road, Puri Beach Coast, Odisha",
        "phone": "+91-6752-222034",
        "is_verified": True,
        "is_operational": True,
        "source": "OSDMA Coastal Shelter Registry",
    },
    # West Bengal Coastal Shelters
    {
        "name": "Digha Coastal Multipurpose Evacuation Shelter",
        "facility_type": FacilityType.SHELTER,
        "lat": 21.6266,
        "lon": 87.5074,
        "address": "Near Old Digha Sea Beach, Purba Medinipur, West Bengal",
        "phone": "1077",
        "is_verified": True,
        "is_operational": True,
        "source": "West Bengal Disaster Management Department",
    },
    {
        "name": "Sundarbans Delta Flood Relief Camp (Gosaba)",
        "facility_type": FacilityType.RELIEF_CAMP,
        "lat": 22.1352,
        "lon": 88.5432,
        "address": "Gosaba Block Headquarters, South 24 Parganas, West Bengal",
        "phone": "+91-3218-236224",
        "is_verified": True,
        "is_operational": True,
        "source": "Sundarbans Affairs Department",
    },
    # Andhra Pradesh Shelters
    {
        "name": "Visakhapatnam Harbor Coastal Evacuation Shelter",
        "facility_type": FacilityType.SHELTER,
        "lat": 17.6868,
        "lon": 83.2185,
        "address": "Fishing Harbor Road, Port Area, Visakhapatnam, AP",
        "phone": "+91-891-2564891",
        "is_verified": True,
        "is_operational": True,
        "source": "APSDMA Coastal Hazard Cell",
    },
    {
        "name": "Kakinada Hope Island Fishermen Relief Shelter",
        "facility_type": FacilityType.SHELTER,
        "lat": 16.9891,
        "lon": 82.2475,
        "address": "Port Road, Kakinada, Andhra Pradesh",
        "phone": "+91-884-2361077",
        "is_verified": True,
        "is_operational": True,
        "source": "APSDMA Cyclone Relief Unit",
    },
    # Tamil Nadu Coastal Shelters
    {
        "name": "Kasimedu Fishermen Evacuation & Relief Center Chennai",
        "facility_type": FacilityType.RELIEF_CAMP,
        "lat": 13.1250,
        "lon": 80.2980,
        "address": "Fishing Harbor Complex, Kasimedu, Royapuram, Chennai",
        "phone": "+91-44-25983411",
        "is_verified": True,
        "is_operational": True,
        "source": "Greater Chennai Corporation Disaster Cell",
    },
    {
        "name": "Nagapattinam Tsunami & Cyclone Multi-Hazard Shelter",
        "facility_type": FacilityType.SHELTER,
        "lat": 10.7656,
        "lon": 79.8424,
        "address": "Keechankuppam Coastal Hamlet, Nagapattinam, Tamil Nadu",
        "phone": "1077",
        "is_verified": True,
        "is_operational": True,
        "source": "TNDRRA Coastal Disaster Registry",
    },
    {
        "name": "Kanyakumari Cape Coastal Relief & Rescue Center",
        "facility_type": FacilityType.SHELTER,
        "lat": 8.0883,
        "lon": 77.5385,
        "address": "Near Government High School, Beach Road, Kanyakumari",
        "phone": "+91-4652-246222",
        "is_verified": True,
        "is_operational": True,
        "source": "District Disaster Management Authority Kanyakumari",
    },
    # Karnataka & Goa Coastal Shelters
    {
        "name": "Malpe Port Coastal Disaster Shelter (Udupi)",
        "facility_type": FacilityType.SHELTER,
        "lat": 13.3512,
        "lon": 74.7015,
        "address": "Fisheries Harbor Complex, Malpe, Udupi, Karnataka",
        "phone": "+91-820-2520333",
        "is_verified": True,
        "is_operational": True,
        "source": "Karnataka State Natural Disaster Monitoring Centre",
    },
    {
        "name": "Mangaluru Coastal Marine Police & Rescue Station",
        "facility_type": FacilityType.RELIEF_CAMP,
        "lat": 12.8580,
        "lon": 74.8360,
        "address": "Old Bunder, Port Area, Mangaluru, Karnataka",
        "phone": "+91-824-2420100",
        "is_verified": True,
        "is_operational": True,
        "source": "Dakshina Kannada District Administration",
    },
    {
        "name": "Mormugao Port Disaster Evacuation Hall (Goa)",
        "facility_type": FacilityType.SHELTER,
        "lat": 15.4167,
        "lon": 73.8000,
        "address": "Headland Sada, Mormugao, South Goa 403804",
        "phone": "+91-832-2521100",
        "is_verified": True,
        "is_operational": True,
        "source": "Goa State Disaster Management Authority",
    },
    # Maharashtra Coastal Shelters
    {
        "name": "Ratnagiri Mirkarwada Coastal Shelter",
        "facility_type": FacilityType.SHELTER,
        "lat": 16.9902,
        "lon": 73.2800,
        "address": "Near Mirkarwada Jetty, Ratnagiri, Maharashtra",
        "phone": "+91-2352-222340",
        "is_verified": True,
        "is_operational": True,
        "source": "Maharashtra State Disaster Management Unit",
    },
    # Gujarat Coastal Shelters
    {
        "name": "Porbandar Marine Evacuation & Cyclone Relief Center",
        "facility_type": FacilityType.SHELTER,
        "lat": 21.6417,
        "lon": 69.6000,
        "address": "Subhash Nagar Coastal Colony, Porbandar, Gujarat",
        "phone": "+91-286-2244100",
        "is_verified": True,
        "is_operational": True,
        "source": "GSDMA Coastal Disaster Registry",
    },
    # Gangetic Riverine Shelters
    {
        "name": "Varanasi Assi Ghat Flood Evacuation Shelter",
        "facility_type": FacilityType.RELIEF_CAMP,
        "lat": 25.3000,
        "lon": 83.0000,
        "address": "Assi Ghat Community Center, Varanasi, UP",
        "phone": "+91-542-2221234",
        "is_verified": True,
        "is_operational": True,
        "source": "Varanasi District Disaster Authority",
    },
    # Himalayan Basin Shelters
    {
        "name": "Haridwar Ganga Basin Disaster Evacuation Shelter",
        "facility_type": FacilityType.SHELTER,
        "lat": 29.9457,
        "lon": 78.1642,
        "address": "Bairagi Camp, Near Ganga Canal, Haridwar, Uttarakhand",
        "phone": "+91-1334-226500",
        "is_verified": True,
        "is_operational": True,
        "source": "Uttarakhand State Disaster Management Authority",
    },
    {
        "name": "Srinagar Jhelum Flood Spillway Evacuation Center",
        "facility_type": FacilityType.SHELTER,
        "lat": 34.0837,
        "lon": 74.7973,
        "address": "Ram Munshi Bagh, Sonwar, Srinagar, J&K",
        "phone": "+91-194-2452100",
        "is_verified": True,
        "is_operational": True,
        "source": "J&K Disaster Management Authority",
    },
]

INITIAL_RESCUE_REQUESTS = [
    {
        "contact_name": "Ramesh Chandra Das",
        "phone": "+91-98640-12345",
        "lat": 26.1820,
        "lon": 91.7450,
        "address_landmark": "Near Bharalu river sluice gate, Kumarpara, Guwahati",
        "people_count": 4,
        "has_infants_or_elderly": True,
        "medical_emergency_notes": "Diabetic elderly grandmother requires insulin refrigeration; water waist-deep on ground floor",
        "water_level_stage": "waist",
        "status": RescueStatus.NEEDS_RESCUE,
        "ai_trust_score": 96.0,
        "ai_flags_json": json.dumps(["Critical vulnerability: Elderly/Infant present", "Consistent with Bharalu sluice overflow"]),
    },
    {
        "contact_name": "Ananya Sharma",
        "phone": "+91-98101-56789",
        "lat": 28.6690,
        "lon": 77.2380,
        "address_landmark": "Monastery Market, Ring Road, Yamuna Bazar, Civil Lines, Delhi",
        "people_count": 6,
        "has_infants_or_elderly": False,
        "medical_emergency_notes": "Stranded on temple rooftop; safe from current but low on drinking water",
        "water_level_stage": "chest",
        "status": RescueStatus.IN_PROGRESS,
        "rescued_by": "NDRF 8th Battalion Boat Unit 2",
        "rescue_notes": "Motorboat en route from Kashmere Gate ISBT point",
        "ai_trust_score": 94.0,
        "ai_flags_json": json.dumps(["High priority dispatch", "Yamuna high flood level corridor"]),
    },
    {
        "contact_name": "Sunil Varghese",
        "phone": "+91-94470-34567",
        "lat": 10.1150,
        "lon": 76.3580,
        "address_landmark": "Opposite Aluva Mahadeva Temple Bank, Aluva, Ernakulam",
        "people_count": 3,
        "has_infants_or_elderly": True,
        "medical_emergency_notes": None,
        "water_level_stage": "knee",
        "status": RescueStatus.RESCUED,
        "rescued_by": "Kerala Fire & Rescue Volunteers",
        "rescue_notes": "Evacuated safely to Aluva Municipal Town Hall Shelter",
        "ai_trust_score": 98.0,
        "ai_flags_json": json.dumps(["Evacuation completed successfully"]),
    },
    {
        "contact_name": "Pooja Kumari",
        "phone": "+91-93340-98765",
        "lat": 25.6180,
        "lon": 85.1620,
        "address_landmark": "Near Patna College Ghat, Ashok Rajpath, Patna",
        "people_count": 2,
        "has_infants_or_elderly": False,
        "medical_emergency_notes": None,
        "water_level_stage": "ankle",
        "status": RescueStatus.SAFE,
        "rescue_notes": "Water receded from lane; family secured on 2nd floor with rations",
        "ai_trust_score": 91.0,
        "ai_flags_json": json.dumps(["Marked safe by resident"]),
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

        # 6. Seed Community Rescue Status Requests
        for req in INITIAL_RESCUE_REQUESTS:
            stmt = select(RescueRequest).where(RescueRequest.contact_name == req["contact_name"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                rescue_obj = RescueRequest(
                    contact_name=req["contact_name"],
                    phone=req["phone"],
                    lat=req["lat"],
                    lon=req["lon"],
                    address_landmark=req["address_landmark"],
                    people_count=req["people_count"],
                    has_infants_or_elderly=req["has_infants_or_elderly"],
                    medical_emergency_notes=req.get("medical_emergency_notes"),
                    water_level_stage=req["water_level_stage"],
                    status=req["status"],
                    rescued_by=req.get("rescued_by"),
                    rescue_notes=req.get("rescue_notes"),
                    ai_trust_score=req.get("ai_trust_score", 95.0),
                    ai_flags_json=req.get("ai_flags_json"),
                )
                session.add(rescue_obj)

        # 7. Seed Multi-Hazard Alerts
        INITIAL_ALERTS = [
            {
                "alert_id": "IMD-SACHET-2026-CY-01",
                "source_id": "ndma-sachet",
                "issuer": "IMD Cyclone Warning Centre",
                "severity": AlertSeverity.SEVERE,
                "hazard_type": "cyclone",
                "headline": "Cyclone Warning: Deep Depression Approaching Odisha & North Andhra Coast",
                "description": "Squally winds 65-75 km/h gusting to 85 km/h likely along and off Odisha and North Andhra Pradesh coasts. Sea condition rough to very rough.",
                "area_description": "Puri, Jagatsinghpur (Paradip), Ganjam, Srikakulam and Visakhapatnam coastal districts.",
                "dos_and_donts_json": json.dumps(OFFICIAL_DOS_AND_DONTS["cyclone"]),
            },
            {
                "alert_id": "IMD-SACHET-2026-TS-02",
                "source_id": "ndma-sachet",
                "issuer": "IMD Regional Meteorological Centre Guwahati",
                "severity": AlertSeverity.WARNING,
                "hazard_type": "thunderstorm",
                "headline": "Severe Thunderstorm, Cloud-to-Ground Lightning & Squall Warning",
                "description": "Thunderstorms accompanied by lightning, hail, and gusty winds (40-50 km/h) very likely over Kamrup, Jorhat, Dibrugarh, and neighboring districts.",
                "area_description": "Brahmaputra Valley districts and lower Assam.",
                "dos_and_donts_json": json.dumps(OFFICIAL_DOS_AND_DONTS["thunderstorm"]),
            },
            {
                "alert_id": "DDMA-SACHET-2026-FL-03",
                "source_id": "ndma-sachet",
                "issuer": "Delhi Disaster Management Authority (DDMA)",
                "severity": AlertSeverity.WARNING,
                "hazard_type": "flood",
                "headline": "Yamuna River Water Level Escalation Alert (Near Warning Level 204.5m)",
                "description": "Hathnikund barrage release of 1.65 lakh cusecs expected to reach Delhi in 48 hours. Floodplain residents instructed to evacuate to relief camps.",
                "area_description": "Yamuna Bazar, Monastery Market, Geeta Colony and Ring Road low-lying segments.",
                "dos_and_donts_json": json.dumps(OFFICIAL_DOS_AND_DONTS["flood"]),
            },
            {
                "alert_id": "SDMA-SACHET-2026-FL-04",
                "source_id": "ndma-sachet",
                "issuer": "Uttarakhand State Emergency Operation Centre",
                "severity": AlertSeverity.EXTREME,
                "hazard_type": "flood",
                "headline": "Cloudburst & Flash Flood Red Alert for Alaknanda Basin",
                "description": "Intense torrential cloudburst triggering flash floods and landslides along Chamoli and Haridwar upstream river corridors.",
                "area_description": "Chamoli, Rudraprayag, and downstream Haridwar Ganga ghats.",
                "dos_and_donts_json": json.dumps(OFFICIAL_DOS_AND_DONTS["flood"]),
            },
            {
                "alert_id": "NDMA-SACHET-2026-EQ-05",
                "source_id": "ndma-sachet",
                "issuer": "National Centre for Seismology (NCS)",
                "severity": AlertSeverity.WATCH,
                "hazard_type": "earthquake",
                "headline": "Seismic Tremor Watch (M 4.2) for Kashmir Valley Corridor",
                "description": "Shallow seismic activity detected. Citizens advised to follow Drop, Cover & Hold protocol in case of aftershocks.",
                "area_description": "Srinagar, Baramulla, and Budgam districts.",
                "dos_and_donts_json": json.dumps(OFFICIAL_DOS_AND_DONTS["earthquake"]),
            },
            {
                "alert_id": "NDMA-SACHET-2026-FR-06",
                "source_id": "ndma-sachet",
                "issuer": "State Disaster Management Authority Maharashtra",
                "severity": AlertSeverity.WARNING,
                "hazard_type": "fire",
                "headline": "Industrial Electrical Fire & Urban Heat Surge Precautionary Advisory",
                "description": "High ambient temperature with transformer overload risk in dense commercial clusters.",
                "area_description": "Mumbai Suburban and Thane commercial industrial sectors.",
                "dos_and_donts_json": json.dumps(OFFICIAL_DOS_AND_DONTS["fire"]),
            },
        ]
        for alt in INITIAL_ALERTS:
            stmt = select(OfficialAlert).where(OfficialAlert.alert_id == alt["alert_id"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                a_obj = OfficialAlert(
                    alert_id=alt["alert_id"],
                    source_id=alt["source_id"],
                    issuer=alt["issuer"],
                    severity=alt["severity"],
                    hazard_type=alt.get("hazard_type", "flood"),
                    headline=alt["headline"],
                    description=alt["description"],
                    area_description=alt["area_description"],
                    dos_and_donts_json=alt.get("dos_and_donts_json"),
                    effective_at=datetime.now(timezone.utc),
                    retrieved_at=datetime.now(timezone.utc),
                    is_active=True,
                )
                session.add(a_obj)

        # 8. Seed Default User & Admin Accounts
        INITIAL_USERS = [
            {
                "email": "admin@jaldrishti.gov.in",
                "password": "Admin@123",
                "full_name": "NDRF Disaster Control Commander",
                "phone": "+91-11-24363260",
                "role": UserRole.ADMIN,
                "district_code": "DL-NDL",
            },
            {
                "email": "citizen@jaldrishti.gov.in",
                "password": "Citizen@123",
                "full_name": "Rohan Mehra",
                "phone": "+91-98765-43210",
                "role": UserRole.CITIZEN,
                "district_code": "OD-PAR",
            },
        ]
        for u in INITIAL_USERS:
            stmt = select(User).where(User.email == u["email"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()
            if not existing:
                user_obj = User(
                    email=u["email"],
                    hashed_password=hash_password(u["password"]),
                    full_name=u["full_name"],
                    phone=u.get("phone"),
                    role=u["role"],
                    district_code=u.get("district_code"),
                )
                session.add(user_obj)

        await session.commit()
        logger.info("Database seeding completed successfully.")
    except Exception as e:
        await session.rollback()
        logger.error(f"Error seeding database: {e}")
