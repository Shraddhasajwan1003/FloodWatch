"""
FloodWatch India – /alerts endpoints
=======================================
Routes:
  GET /alerts?state=&district=&active_only= – list official alerts
  GET /alerts/{alert_id}                    – single alert detail

Policy:
  • Only official government-issued alerts are surfaced here.
  • Alerts are read-only from the consumer API perspective (ingested by pipeline).
  • is_active is derived from valid_until vs UTC now; DB value is authoritative.
  • Empty list returned when no alerts match – never 404 for empty result sets.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import OfficialAlert
from app.schemas.schemas import AlertListResponse, AlertOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get(
    "",
    response_model=AlertListResponse,
    summary="List official flood/weather alerts",
    description=(
        "Returns alerts issued by government bodies (IMD, NDMA, SDMA). "
        "Filter by state_code, district_code, or active_only. "
        "An empty list means no alerts match – it does NOT mean the area is safe."
    ),
)
async def list_alerts(
    state: Optional[str] = Query(None, description="State ISO code, e.g. 'MH'"),
    district: Optional[str] = Query(None, description="District code, e.g. 'MH_PUNE'"),
    active_only: bool = Query(True, description="If true, only return currently active alerts"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AlertListResponse:
    query = select(OfficialAlert).order_by(OfficialAlert.issued_at.desc())

    if state:
        query = query.where(OfficialAlert.state_code == state.upper())
    if district:
        query = query.where(OfficialAlert.district_code == district.upper())
    if active_only:
        query = query.where(OfficialAlert.is_active == True)  # noqa: E712

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    alerts = result.scalars().all()

    return AlertListResponse(
        state_code=state,
        total=len(alerts),
        alerts=[AlertOut.model_validate(a) for a in alerts],
    )


@router.get(
    "/{alert_id}",
    response_model=AlertOut,
    summary="Get a single official alert by ID",
)
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
) -> AlertOut:
    result = await db.execute(
        select(OfficialAlert).where(OfficialAlert.alert_id == alert_id)
    )
    alert = result.scalar_one_or_none()

    if alert is None:
        raise HTTPException(
            status_code=404,
            detail=f"Alert '{alert_id}' not found. It may have expired and been archived.",
        )

    return AlertOut.model_validate(alert)
