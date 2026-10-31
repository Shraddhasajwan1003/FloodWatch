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
        assert "FloodWatch India" in resp.json()["app"]

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
