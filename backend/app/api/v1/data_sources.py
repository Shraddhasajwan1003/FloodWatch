"""
FloodWatch India — /data-sources API Endpoint
Transparent registry of all external data sources, coverage, licensing, and live health status.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.models import DataSource

router = APIRouter()

@router.get("", summary="Get data source registry and integrity status")
async def get_data_sources(db: AsyncSession = Depends(get_db)):
    """
    Returns registered data providers with attribution, licensing, and availability status.
    """
    stmt = select(DataSource).order_by(DataSource.name)
    res = await db.execute(stmt)
    sources = res.scalars().all()

    output = []
    for s in sources:
        health_status = "healthy"
        if not s.is_active:
            health_status = "disabled"
        elif s.last_failure_at and (not s.last_success_at or s.last_failure_at > s.last_success_at):
            health_status = "failing"

        output.append({
            "source_key": s.source_key,
            "name": s.name,
            "provider": s.provider,
            "endpoint_url": s.endpoint_url,
            "data_type": s.data_type,
            "geographic_coverage": s.geographic_coverage,
            "requires_auth": s.requires_auth,
            "licence": s.licence,
            "attribution": s.attribution,
            "is_active": s.is_active,
            "health_status": health_status,
            "last_success_at": s.last_success_at.isoformat() if s.last_success_at else None,
            "last_failure_at": s.last_failure_at.isoformat() if s.last_failure_at else None,
            "last_failure_message": s.last_failure_message,
        })

    return output
