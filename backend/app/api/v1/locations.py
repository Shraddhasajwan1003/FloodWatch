"""
FloodWatch India – /locations endpoints
========================================
Routes:
  GET /locations/states              – list all Indian states
  GET /locations/districts           – list districts (filter by ?state_code=)
  GET /locations/search?q=           – geocoding via Nominatim (OSM)
  GET /locations/nearby?lat=&lon=&radius_km=  – nearest districts by Haversine

Policy:
  • Nominatim failure → 503 with upstream error detail, never fabricated.
  • Nominatim rate-limit: 1 req/s via User-Agent identifying this app.
  • Missing districts in DB → empty list, not error.
"""

import logging
import math
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import District, State
from app.schemas.schemas import (
    DistrictOut,
    GeocodingResponse,
    GeocodingResult,
    NearbyLocationResult,
    NearbyResponse,
    StateOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/locations", tags=["Locations"])

NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search"
NOMINATIM_TIMEOUT = 10.0  # seconds


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance in kilometres between two WGS-84 points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/states",
    response_model=list[StateOut],
    summary="List all Indian states/UTs in the system",
)
async def list_states(db: AsyncSession = Depends(get_db)) -> list[StateOut]:
    result = await db.execute(select(State).order_by(State.name))
    states = result.scalars().all()
    return [StateOut.model_validate(s) for s in states]


@router.get(
    "/districts",
    response_model=list[DistrictOut],
    summary="List districts, optionally filtered by state_code",
)
async def list_districts(
    state_code: Optional[str] = Query(None, description="Filter by state ISO code, e.g. 'MH'"),
    db: AsyncSession = Depends(get_db),
) -> list[DistrictOut]:
    from sqlalchemy.orm import selectinload
    query = select(District).options(selectinload(District.state)).order_by(District.name)
    if state_code:
        query = query.join(State).where(State.code == state_code.upper())
    result = await db.execute(query)
    districts = result.scalars().all()
    return [DistrictOut.model_validate(d) for d in districts]


@router.get(
    "/search",
    response_model=GeocodingResponse,
    summary="Geocode a place name using Nominatim (OpenStreetMap)",
    description=(
        "Calls Nominatim with countrycodes=in to restrict results to India. "
        "Upstream failure returns 503 – results are NEVER fabricated."
    ),
)
async def geocode_search(
    q: str = Query(..., min_length=2, description="Place name to search"),
    limit: int = Query(5, ge=1, le=10),
) -> GeocodingResponse:
    settings = get_settings()
    params = {
        "q": q,
        "format": "jsonv2",
        "addressdetails": 0,
        "limit": limit,
        "countrycodes": "in",  # India only
        "accept-language": "en",
    }
    headers = {
        # Nominatim usage policy requires a descriptive User-Agent
        "User-Agent": f"FloodWatchIndia/{settings.APP_VERSION} (contact: {settings.CONTACT_EMAIL})"
    }

    try:
        async with httpx.AsyncClient(timeout=NOMINATIM_TIMEOUT) as client:
            resp = await client.get(NOMINATIM_BASE, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.error("Nominatim geocoding timed out for query '%s'", q)
        raise HTTPException(
            status_code=503,
            detail="Geocoding service timed out. Please try again shortly.",
        )
    except httpx.HTTPStatusError as exc:
        logger.error("Nominatim returned HTTP %s for query '%s'", exc.response.status_code, q)
        raise HTTPException(
            status_code=503,
            detail=f"Geocoding service returned an error: HTTP {exc.response.status_code}",
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Nominatim unexpected error for query '%s': %s", q, exc)
        raise HTTPException(status_code=503, detail="Geocoding service unavailable.")

    results = [
        GeocodingResult(
            display_name=item.get("display_name", ""),
            lat=float(item["lat"]),
            lon=float(item["lon"]),
            place_type=item.get("type"),
            boundingbox=item.get("boundingbox"),
            osm_id=item.get("osm_id"),
        )
        for item in data
    ]

    return GeocodingResponse(query=q, results=results, total=len(results))


@router.get(
    "/nearby",
    response_model=NearbyResponse,
    summary="Find districts within radius_km of a coordinate",
)
async def nearby_districts(
    lat: float = Query(..., ge=6.0, le=37.0, description="Latitude (India bounds)"),
    lon: float = Query(..., ge=68.0, le=97.5, description="Longitude (India bounds)"),
    radius_km: float = Query(50.0, ge=1.0, le=500.0),
    db: AsyncSession = Depends(get_db),
) -> NearbyResponse:
    # Load all districts that have centroid data
    result = await db.execute(
        select(District, State)
        .join(State, District.state_code == State.state_code)
        .where(District.centroid_lat.isnot(None))
        .where(District.centroid_lon.isnot(None))
    )
    rows = result.all()

    nearby: list[NearbyLocationResult] = []
    for district, state in rows:
        dist = _haversine_km(lat, lon, district.centroid_lat, district.centroid_lon)
        if dist <= radius_km:
            nearby.append(
                NearbyLocationResult(
                    district_code=district.district_code,
                    district_name=district.name,
                    state_code=state.state_code,
                    state_name=state.name,
                    distance_km=round(dist, 2),
                )
            )

    nearby.sort(key=lambda x: x.distance_km)
    return NearbyResponse(lat=lat, lon=lon, radius_km=radius_km, results=nearby)
