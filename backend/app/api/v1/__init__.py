"""
FloodWatch India — API v1 Router Aggregator
"""
from fastapi import APIRouter

from app.api.v1 import (
    health,
    locations,
    rainfall,
    rivers,
    risk,
    alerts,
    routes,
    reports,
    facilities,
    forecasts,
    data_sources,
    notifications,
)

router = APIRouter()

# Routers that already declared their prefix:
router.include_router(health.router)
router.include_router(locations.router)
router.include_router(rainfall.router)
router.include_router(rivers.router)
router.include_router(risk.router)
router.include_router(alerts.router)

# Routers without embedded prefix:
router.include_router(routes.router, prefix="/routes", tags=["Safe Routes"])
router.include_router(reports.router, prefix="/reports", tags=["Community Reports"])
router.include_router(facilities.router, prefix="/facilities", tags=["Facilities"])
router.include_router(forecasts.router, prefix="/forecasts", tags=["Forecasts"])
router.include_router(data_sources.router, prefix="/data-sources", tags=["Data Sources"])
router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
