"""
JalDrishti India — Coastal Marine & Fisherman Safety API
Provides live sea swell height, wave periods, fisherman advisories,
port warning signals, and riverbank settlement vulnerability watches.
"""
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException

from app.services.marine_service import (
    fetch_live_marine_conditions,
    get_coastal_fishing_zones,
    get_riverbank_vulnerability_zones,
)

router = APIRouter(prefix="/marine", tags=["Coastal Marine & Fishermen Safety"])

@router.get(
    "/conditions",
    summary="Get real-time marine wave and swell telemetry",
    description="Returns sea wave heights, swell period, fisherman advisory status (Do Not Venture Into Sea) via Open-Meteo Marine API.",
)
async def get_marine_conditions(
    lat: float = Query(20.2644, description="Latitude of coastal location (default: Paradip Port)"),
    lon: float = Query(86.6710, description="Longitude of coastal location (default: Paradip Port)"),
):
    data = await fetch_live_marine_conditions(lat, lon)
    return data

@router.get(
    "/zones",
    summary="List major Indian coastal fishing harbors and ports",
    description="Returns key fishing harbors across the Bay of Bengal, Arabian Sea, and Indian Ocean with port warning signals.",
)
async def list_coastal_zones():
    return get_coastal_fishing_zones()

@router.get(
    "/riverbanks",
    summary="List heavy flow riverbank vulnerable settlement zones",
    description="Monitors riverbank settlements vulnerable to rapid dam discharges and riverbank erosion along Brahmaputra, Ganga, Yamuna, Periyar, Kosi, and Narmada.",
)
async def list_riverbank_zones():
    return get_riverbank_vulnerability_zones()
