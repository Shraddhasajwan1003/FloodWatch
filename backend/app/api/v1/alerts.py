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

# Official NDMA / SACHET Disaster Safety Dos and Don'ts
OFFICIAL_DOS_AND_DONTS = {
    "flood": {
        "title": "Flood & Waterlogging Safety",
        "dos": [
            "Evacuate vertically to multi-story concrete structures or higher ground immediately.",
            "Switch off electricity main MCB switch and gas cylinders before water enters.",
            "Drink only boiled water (1 min rolling boil) or use chlorine purification tablets.",
            "Keep emergency battery torches, ORS hydration sachets, and essential medication ready.",
            "Cooperate with NDRF, SDRF, and civil defense boat rescue teams.",
        ],
        "donts": [
            "DO NOT walk, swim, or drive through moving flood waters (15 cm can sweep an adult, 30 cm can float a car).",
            "DO NOT enter low-lying basements or underground structures during rapid water ingress.",
            "DO NOT touch fallen electric poles, hanging wires, or submerged metal railings.",
            "DO NOT consume flood-contaminated food, raw vegetables, or tap water.",
            "DO NOT spread unverified panic rumors on social media.",
        ],
    },
    "thunderstorm": {
        "title": "Severe Thunderstorm & Lightning Safety",
        "dos": [
            "Seek shelter immediately inside a substantial concrete building or hardtop metal vehicle.",
            "Stay away from windows, doors, and electrical conducting plumbing pipes.",
            "If caught in an open field with no shelter, crouch down low with feet together (lightning squat).",
            "Unplug sensitive electronic devices before the squall arrives.",
        ],
        "donts": [
            "DO NOT take shelter under isolated tall trees, metal sheds, or high towers.",
            "DO NOT stay in water bodies, swimming pools, or paddy fields during lightning.",
            "DO NOT hold umbrellas with metal tips or touch wire fences.",
            "DO NOT use corded telephones during active lightning strikes.",
        ],
    },
    "cyclone": {
        "title": "Cyclone & Gale Wind Safety",
        "dos": [
            "Board up or tape large glass windows; secure loose outdoor objects and tin sheets.",
            "Keep battery-operated emergency transceivers/radios tuned to IMD bulletins.",
            "Store at least 3 days of non-perishable food, bottled water, and infant formula.",
            "Move away from coastal shorelines and low-lying storm surge zones to designated shelters.",
        ],
        "donts": [
            "DO NOT venture out to the beach or harbor to watch high waves.",
            "DO NOT leave your shelter during the calm 'eye of the cyclone' as violent reverse winds follow.",
            "DO NOT ignore official evacuation orders issued by District Disaster Authorities.",
        ],
    },
    "earthquake": {
        "title": "Earthquake & Seismic Shaking Safety",
        "dos": [
            "DROP to the ground, take COVER under a sturdy desk or table, and HOLD ON until shaking stops.",
            "Protect your head and neck with your arms or a heavy pillow if no furniture is nearby.",
            "If outdoors, move to an open clear area away from buildings, power lines, and flyovers.",
        ],
        "donts": [
            "DO NOT use elevators or lifts under any circumstance; they can lose power and jam.",
            "DO NOT rush panic-stricken towards staircase exits during active tremors.",
            "DO NOT light matches, candles, or lighters due to potential gas pipeline leaks.",
        ],
    },
    "fire": {
        "title": "Urban & Electrical Inundation Fire Safety",
        "dos": [
            "Crawl low under smoke towards the nearest emergency fire exit (air is cleaner near floor).",
            "Check door handles with the back of your hand before opening; if hot, find another route.",
            "Call 101 or 112 immediately and state your exact building floor and landmark.",
        ],
        "donts": [
            "DO NOT use elevators during building fire evacuations.",
            "DO NOT re-enter a burning building to retrieve mobile phones or valuables.",
            "DO NOT pour water on electrical fires; use Class-C or dry chemical fire extinguishers.",
        ],
    },
}

@router.get(
    "/dos-and-donts",
    summary="Get official NDMA disaster safety Dos and Don'ts",
    description="Returns actionable life-safety Dos and Don'ts for floods, thunderstorms, cyclones, earthquakes, and fires.",
)
async def get_dos_and_donts(hazard_type: Optional[str] = Query(None)):
    if hazard_type and hazard_type.lower() in OFFICIAL_DOS_AND_DONTS:
        return {hazard_type.lower(): OFFICIAL_DOS_AND_DONTS[hazard_type.lower()]}
    return OFFICIAL_DOS_AND_DONTS

@router.get(
    "",
    response_model=AlertListResponse,
    summary="List official flood/weather alerts",
    description=(
        "Returns alerts issued by government bodies (IMD, NDMA, SDMA). "
        "Filter by state_code, district_code, hazard_type, or active_only."
    ),
)
async def list_alerts(
    state: Optional[str] = Query(None, description="State ISO code, e.g. 'MH'"),
    district: Optional[str] = Query(None, description="District code, e.g. 'MH_PUNE'"),
    hazard_type: Optional[str] = Query(None, description="Hazard type: flood, thunderstorm, cyclone, earthquake, fire"),
    active_only: bool = Query(True, description="If true, only return currently active alerts"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AlertListResponse:
    query = select(OfficialAlert).order_by(OfficialAlert.effective_at.desc())

    if state:
        query = query.where(OfficialAlert.state_code == state.upper())
    if district:
        query = query.where(OfficialAlert.district_code == district.upper())
    if hazard_type:
        query = query.where(OfficialAlert.hazard_type == hazard_type.lower())
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
