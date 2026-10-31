"""
FloodWatch India – /health endpoint
=====================================
Returns:
  • App version (from settings)
  • Database reachability (live SELECT 1)
  • Per-data-source health status fetched from DataSource table

Policy:
  • Database error is surfaced as 'error', never silently suppressed.
  • Source health is as-of last background probe (stored in DataSource row).
  • Overall status = 'degraded' if any mandatory source is unhealthy.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import DataSource
from app.schemas.schemas import DataSourceHealth, HealthResponse
from sqlalchemy import select

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["Health"])


async def _check_database(db: AsyncSession) -> str:
    """Attempt a lightweight query; return 'connected' or 'error: <msg>'."""
    try:
        await db.execute(text("SELECT 1"))
        return "connected"
    except Exception as exc:  # noqa: BLE001
        logger.error("Database health check failed: %s", exc)
        return f"error: {exc}"


async def _get_source_health(db: AsyncSession) -> list[DataSourceHealth]:
    """
    Read DataSource rows written by background health-probe tasks.
    Returns an empty list (not a fabricated 'healthy') if the table is empty.
    """
    try:
        result = await db.execute(select(DataSource))
        rows = result.scalars().all()
        health_items: list[DataSourceHealth] = []
        for row in rows:
            is_healthy = row.health_status == "healthy" if hasattr(row, "health_status") else (
                row.last_error is None
            )
            health_items.append(
                DataSourceHealth(
                    source_id=row.source_id,
                    name=row.name,
                    healthy=is_healthy,
                    last_checked=row.last_success,  # most recent successful probe
                    error=row.last_error if not is_healthy else None,
                )
            )
        return health_items
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to load DataSource health from DB: %s", exc)
        return []


@router.get(
    "",
    response_model=HealthResponse,
    summary="Application health and data-source status",
    description=(
        "Returns app version, live database reachability, and the most recent "
        "health status for every registered data source. "
        "overall status = 'degraded' when any source is unhealthy or DB is unreachable."
    ),
)
async def get_health(db: AsyncSession = Depends(get_db)) -> HealthResponse:
    settings = get_settings()

    db_status = await _check_database(db)
    source_health = await _get_source_health(db)

    # Determine overall status
    db_ok = db_status == "connected"
    sources_ok = all(s.healthy for s in source_health) if source_health else True
    overall = "ok" if (db_ok and sources_ok) else "degraded"

    return HealthResponse(
        status=overall,
        version=settings.APP_VERSION,
        timestamp=datetime.now(timezone.utc),
        database=db_status,
        data_sources=source_health,
    )
