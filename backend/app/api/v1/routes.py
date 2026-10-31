"""
FloodWatch India — /routes API Endpoint
Calculates route alternatives between coordinates and evaluates flood risk exposure.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import CommunityReport, ReportStatus
from app.services.routing_service import calculate_safe_routes

router = APIRouter()

class RouteRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lon: float = Field(..., ge=-180, le=180)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lon: float = Field(..., ge=-180, le=180)

@router.post("/calculate", summary="Calculate safe route options")
async def calculate_route_endpoint(
    req: RouteRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns candidate routes comparing travel time and estimated flood exposure.
    Considers road closures and verified community waterlogging incidents.
    """
    # Fetch active road closures from community reports
    stmt = select(CommunityReport).where(
        CommunityReport.road_blocked == True,
        CommunityReport.status.in_([ReportStatus.VERIFIED, ReportStatus.CORROBORATED, ReportStatus.UNVERIFIED]),
    )
    res = await db.execute(stmt)
    reports = res.scalars().all()
    active_blocks = [
        {
            "lat": r.lat,
            "lon": r.lon,
            "description": r.description,
            "water_depth_cm": r.water_depth_cm,
        }
        for r in reports
    ]

    result = await calculate_safe_routes(
        origin_lat=req.origin_lat,
        origin_lon=req.origin_lon,
        dest_lat=req.dest_lat,
        dest_lon=req.dest_lon,
        active_road_blocks=active_blocks,
    )
    return result
