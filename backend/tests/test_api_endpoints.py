"""
Integration tests for FastAPI endpoints:
- /api/health
- /api/v1/health
- /api/v1/locations/states
- /api/v1/locations/districts
- /api/v1/data-sources
- /api/v1/forecasts
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import create_tables, AsyncSessionLocal
from app.services.seed_service import seed_reference_data

async def ensure_db_ready():
    await create_tables()
    async with AsyncSessionLocal() as session:
        await seed_reference_data(session)

@pytest.mark.asyncio
async def test_health_endpoints():
    await ensure_db_ready()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # App-level health
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
        assert "JalDrishti India" in resp.json()["app"]

        # V1 Health
        resp_v1 = await client.get("/api/v1/health")
        assert resp_v1.status_code == 200
        data = resp_v1.json()
        assert data["database"] == "connected"

@pytest.mark.asyncio
async def test_locations_endpoints():
    await ensure_db_ready()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # List states
        resp = await client.get("/api/v1/locations/states")
        assert resp.status_code == 200
        states = resp.json()
        assert len(states) >= 28  # All Indian states present
        state_codes = [s["code"] for s in states]
        assert "AS" in state_codes  # Assam
        assert "MH" in state_codes  # Maharashtra
        assert "DL" in state_codes  # Delhi

        # List monitored districts
        resp_dist = await client.get("/api/v1/locations/districts")
        assert resp_dist.status_code == 200
        districts = resp_dist.json()
        assert len(districts) > 0

@pytest.mark.asyncio
async def test_data_sources_registry():
    await ensure_db_ready()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/data-sources")
        assert resp.status_code == 200
        sources = resp.json()
        assert len(sources) >= 4
        source_keys = [s["source_key"] for s in sources]
        assert "open-meteo-forecast" in source_keys
        assert "open-meteo-flood-glofas" in source_keys

@pytest.mark.asyncio
async def test_community_rescue_tracker():
    await ensure_db_ready()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Get rescue requests
        resp = await client.get("/api/v1/rescue")
        assert resp.status_code == 200
        data = resp.json()
        assert "statistics" in data
        assert "requests" in data
        assert data["statistics"]["total_requests"] >= 4

        # Submit new distress request with AI forgery scoring
        new_payload = {
            "contact_name": "Test Distress Citizen",
            "phone": "+91-98765-43210",
            "lat": 26.1500,
            "lon": 91.7500,
            "address_landmark": "Near Silpukhuri water tank, Guwahati",
            "people_count": 3,
            "has_infants_or_elderly": True,
            "medical_emergency_notes": "Needs emergency baby food and drinking water",
            "water_level_stage": "waist",
        }
        post_resp = await client.post("/api/v1/rescue", json=new_payload)
        assert post_resp.status_code == 200
        created = post_resp.json()
        assert created["status"] == "success"
        assert created["ai_trust_score"] > 50.0

@pytest.mark.asyncio
async def test_river_stations_and_risk():
    await ensure_db_ready()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # River stations
        resp = await client.get("/api/v1/rivers/stations")
        assert resp.status_code == 200
        stations = resp.json()
        assert len(stations) >= 5

        # Real-time flood risk calculation
        risk_resp = await client.get("/api/v1/flood-risk?lat=26.1445&lon=91.7362")
        assert risk_resp.status_code == 200
        risk_data = risk_resp.json()
        assert "displayed_level" in risk_data
        assert "score" in risk_data
        assert "breakdown" in risk_data

@pytest.mark.asyncio
async def test_coastal_marine_and_districts():
    await ensure_db_ready()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Check expanded districts (over 50)
        dist_resp = await client.get("/api/v1/locations/districts")
        assert dist_resp.status_code == 200
        districts = dist_resp.json()
        assert len(districts) >= 30

        # Coastal marine zones
        zones_resp = await client.get("/api/v1/marine/zones")
        assert zones_resp.status_code == 200
        zones = zones_resp.json()
        assert len(zones) >= 10

        # Riverbank vulnerability zones
        rb_resp = await client.get("/api/v1/marine/riverbanks")
        assert rb_resp.status_code == 200
        rbs = rb_resp.json()
        assert len(rbs) >= 5

        # Marine conditions
        cond_resp = await client.get("/api/v1/marine/conditions?lat=20.2644&lon=86.6710")
        assert cond_resp.status_code == 200
        cond = cond_resp.json()
        assert "advisory_status" in cond
        assert "current_wave_height_m" in cond

@pytest.mark.asyncio
async def test_auth_and_multi_hazard_dos_donts():
    await ensure_db_ready()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login with seeded admin account
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@jaldrishti.gov.in",
            "password": "Admin@123",
        })
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        assert "access_token" in login_data
        assert login_data["user"]["role"] == "admin"

        # 2. Check NDMA Dos and Don'ts endpoint
        dnd_resp = await client.get("/api/v1/alerts/dos-and-donts")
        assert dnd_resp.status_code == 200
        dnd_data = dnd_resp.json()
        assert "flood" in dnd_data
        assert "thunderstorm" in dnd_data
        assert "cyclone" in dnd_data
        assert "earthquake" in dnd_data
        assert "fire" in dnd_data
        assert len(dnd_data["flood"]["dos"]) >= 3

        # 3. Filter alerts by hazard_type
        cyclone_alerts = await client.get("/api/v1/alerts?hazard_type=cyclone")
        assert cyclone_alerts.status_code == 200
        cy_list = cyclone_alerts.json()["alerts"]
        assert len(cy_list) >= 1
        assert cy_list[0]["hazard_type"] == "cyclone"
