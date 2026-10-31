"""
FloodWatch India — /facilities API Endpoint
Hospitals, designated evacuation shelters, and relief camps.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Facility, FacilityType
from app.services.routing_service import haversine_km

router = APIRouter()

@router.get("", summary="Get hospitals and evacuation shelters")
async def get_facilities(
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lon: Optional[float] = Query(None, ge=-180, le=180),
    radius_km: float = Query(25.0, ge=1.0, le=200.0),
    type: Optional[str] = Query(None, description="hospital, shelter, relief_camp, fire_station"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns facilities with authoritative source provenance.
    If lat & lon provided, results are sorted by distance.
    """
    stmt = select(Facility)
    if type:
        try:
            f_type = FacilityType(type.lower())
            stmt = stmt.where(Facility.facility_type == f_type)
        except ValueError:
            pass

    res = await db.execute(stmt)
    facilities = res.scalars().all()

    results = []
    for f in facilities:
        dist_km = None
        if lat is not None and lon is not None:
            dist_km = round(haversine_km(lat, lon, f.lat, f.lon), 2)
            if dist_km > radius_km:
                continue

        results.append({
            "id": f.id,
            "name": f.name,
            "facility_type": f.facility_type.value,
            "lat": f.lat,
            "lon": f.lon,
            "address": f.address,
            "phone": f.phone,
            "is_verified": f.is_verified,
            "is_operational": f.is_operational,
            "source": f.source,
            "distance_km": dist_km,
        })

    if lat is not None and lon is not None:
        results.sort(key=lambda x: x["distance_km"] or 0)

    return results
