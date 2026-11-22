"""
JalDrishti India — /rescue API Endpoints
Community Rescue Status Tracking (Who is rescued vs awaiting evacuation).
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import RescueRequest, RescueStatus
from app.services.routing_service import haversine_km
from app.services.ai_forgery_detector import analyze_rescue_authenticity

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/rescue", tags=["Community Rescue Tracker"])


class RescueRequestCreate(BaseModel):
    contact_name: str = Field(..., min_length=2, max_length=150)
    phone: str = Field(..., min_length=10, max_length=32)
    lat: float = Field(..., ge=-90.0, le=90.0)
    lon: float = Field(..., ge=-180.0, le=180.0)
    address_landmark: str = Field(..., min_length=4)
    people_count: int = Field(1, ge=1, le=200)
    has_infants_or_elderly: bool = False
    medical_emergency_notes: Optional[str] = None
    water_level_stage: str = Field("ankle", description="ankle, knee, waist, chest, rooftop")


class RescueStatusUpdate(BaseModel):
    status: str = Field(..., description="needs_rescue, in_progress, rescued, safe")
    rescued_by: Optional[str] = None
    rescue_notes: Optional[str] = None


@router.get("", summary="List rescue requests and evacuation status statistics")
async def list_rescue_requests(
    status: Optional[str] = Query(None, description="needs_rescue, in_progress, rescued, safe"),
    lat: Optional[float] = Query(None, ge=-90.0, le=90.0),
    lon: Optional[float] = Query(None, ge=-180.0, le=180.0),
    radius_km: float = Query(2500.0, ge=1.0, le=5000.0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns active community rescue requests with aggregated rescue counters:
    - total_awaiting_rescue
    - total_in_progress
    - total_rescued
    - total_people_safe
    """
    query = select(RescueRequest).order_by(RescueRequest.created_at.desc())
    if status:
        try:
            st_enum = RescueStatus(status.lower())
            query = query.where(RescueRequest.status == st_enum)
        except ValueError:
            pass

    res = await db.execute(query.limit(limit))
    records = res.scalars().all()

    # Calculate global counters
    all_query = select(RescueRequest)
    all_res = await db.execute(all_query)
    all_records = all_res.scalars().all()

    count_needs = sum(r.people_count for r in all_records if r.status == RescueStatus.NEEDS_RESCUE)
    count_progress = sum(r.people_count for r in all_records if r.status == RescueStatus.IN_PROGRESS)
    count_rescued = sum(r.people_count for r in all_records if r.status in [RescueStatus.RESCUED, RescueStatus.SAFE])

    results = []
    for r in records:
        dist = None
        if lat is not None and lon is not None:
            dist = round(haversine_km(lat, lon, r.lat, r.lon), 2)
            if dist > radius_km:
                continue

        results.append({
            "id": r.id,
            "contact_name": r.contact_name,
            "phone": r.phone,
            "lat": r.lat,
            "lon": r.lon,
            "address_landmark": r.address_landmark,
            "people_count": r.people_count,
            "has_infants_or_elderly": r.has_infants_or_elderly,
            "medical_emergency_notes": r.medical_emergency_notes,
            "water_level_stage": r.water_level_stage,
            "status": r.status.value,
            "rescued_by": r.rescued_by,
            "rescue_notes": r.rescue_notes,
            "ai_trust_score": r.ai_trust_score,
            "ai_flags": json.loads(r.ai_flags_json) if r.ai_flags_json else [],
            "is_suspicious": r.is_suspicious,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            "distance_km": dist,
        })

    return {
        "statistics": {
            "awaiting_rescue_count": len([r for r in all_records if r.status == RescueStatus.NEEDS_RESCUE]),
            "people_awaiting_rescue": count_needs,
            "rescue_in_progress_count": len([r for r in all_records if r.status == RescueStatus.IN_PROGRESS]),
            "people_in_progress": count_progress,
            "rescued_count": len([r for r in all_records if r.status in [RescueStatus.RESCUED, RescueStatus.SAFE]]),
            "people_rescued": count_rescued,
            "total_requests": len(all_records),
        },
        "requests": results,
    }


@router.post("", summary="Submit urgent flood rescue distress request")
async def create_rescue_request(
    payload: RescueRequestCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Submits an emergency rescue distress request.
    Analyzed through AI forgery and credibility validation layer.
    """
    trust_score, is_suspicious, flags = analyze_rescue_authenticity(
        contact_name=payload.contact_name,
        phone=payload.phone,
        people_count=payload.people_count,
        water_level_stage=payload.water_level_stage,
        address_landmark=payload.address_landmark,
    )

    req = RescueRequest(
        contact_name=payload.contact_name,
        phone=payload.phone,
        lat=payload.lat,
        lon=payload.lon,
        address_landmark=payload.address_landmark,
        people_count=payload.people_count,
        has_infants_or_elderly=payload.has_infants_or_elderly,
        medical_emergency_notes=payload.medical_emergency_notes,
        water_level_stage=payload.water_level_stage,
        status=RescueStatus.NEEDS_RESCUE,
        ai_trust_score=trust_score,
        ai_flags_json=json.dumps(flags),
        is_suspicious=is_suspicious,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    return {
        "status": "success",
        "message": "Rescue distress request registered on community board and dispatched to response channels.",
        "request_id": req.id,
        "ai_trust_score": trust_score,
        "ai_flags": flags,
    }


@router.patch("/{request_id}/status", summary="Update rescue status (e.g. mark as Rescued or In Progress)")
async def update_rescue_status(
    request_id: int,
    payload: RescueStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Allows response personnel, NDRF, SDRF, or verified volunteers to update rescue status.
    """
    res = await db.execute(select(RescueRequest).where(RescueRequest.id == request_id))
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Rescue request not found")

    try:
        new_status = RescueStatus(payload.status.lower())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    req.status = new_status
    if payload.rescued_by:
        req.rescued_by = payload.rescued_by
    if payload.rescue_notes:
        req.rescue_notes = payload.rescue_notes
    req.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(req)

    return {
        "status": "success",
        "message": f"Rescue status updated to {new_status.value}.",
        "request_id": req.id,
        "current_status": req.status.value,
        "rescued_by": req.rescued_by,
    }
