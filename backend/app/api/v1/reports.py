"""
FloodWatch India — /reports API Endpoint
Community waterlogging and hazard reporting with moderation lifecycle.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import math
import os
import uuid
import aiofiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_db
from app.core.config import get_settings
from app.models.models import CommunityReport, ReportStatus
from app.services.routing_service import haversine_km

settings = get_settings()
router = APIRouter()

@router.get("", summary="Get nearby community reports")
async def get_reports(
    lat: Optional[float] = Query(None, ge=-90, le=90),
    lon: Optional[float] = Query(None, ge=-180, le=180),
    radius_km: float = Query(25.0, ge=0.5, le=500),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Lists community reports, optionally filtered by distance radius and status."""
    stmt = select(CommunityReport).order_by(CommunityReport.submitted_at.desc()).limit(100)
    if status:
        try:
            st_enum = ReportStatus(status.lower())
            stmt = stmt.where(CommunityReport.status == st_enum)
        except ValueError:
            pass
    res = await db.execute(stmt)
    all_reports = res.scalars().all()

    if lat is not None and lon is not None:
        filtered = []
        for r in all_reports:
            dist = haversine_km(lat, lon, r.lat, r.lon)
            if dist <= radius_km:
                filtered.append(r)
        return filtered

    return all_reports

@router.post("", summary="Submit a community flood or waterlogging report")
async def create_report(
    category: str = Form(...),
    description: str = Form(...),
    lat: float = Form(...),
    lon: float = Form(...),
    water_depth_cm: Optional[float] = Form(None),
    road_blocked: bool = Form(False),
    photo: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits a new citizen flood report.
    Reports enter as UNVERIFIED until reviewed or corroborated by multiple reports.
    """
    image_path = None
    if photo:
        ext = os.path.splitext(photo.filename)[1].lower() if photo.filename else ".jpg"
        if ext in [".jpg", ".jpeg", ".png", ".webp"]:
            fname = f"{uuid.uuid4().hex}{ext}"
            fpath = os.path.join(settings.UPLOAD_DIR, fname)
            async with aiofiles.open(fpath, "wb") as out_file:
                content = await photo.read()
                await out_file.write(content)
            image_path = f"/uploads/{fname}"

    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=settings.REPORT_EXPIRE_HOURS)

    report = CommunityReport(
        category=category,
        description=description,
        lat=lat,
        lon=lon,
        water_depth_cm=water_depth_cm,
        road_blocked=road_blocked,
        image_path=image_path,
        status=ReportStatus.UNVERIFIED,
        submitted_at=now,
        expires_at=expires,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return report

@router.put("/{report_id}/status", summary="Admin moderate report verification status")
async def update_report_status(
    report_id: int,
    status: str = Query(..., pattern="^(unverified|under_review|corroborated|verified|rejected|expired)$"),
    reviewer_note: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Updates verification status of a community report."""
    stmt = select(CommunityReport).where(CommunityReport.id == report_id)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = ReportStatus(status)
    if reviewer_note:
        report.reviewer_note = reviewer_note
    report.reviewed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(report)
    return report
