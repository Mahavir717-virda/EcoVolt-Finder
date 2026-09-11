"""
routers/routing.py
──────────────────
POST /route/matrix — Distance + travel time matrix from origin to multiple stations.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.models import RouteMatrixRequest, RouteMatrixResponse
from app.routing import route_matrix as client_route_matrix
from app.config import get_settings

router = APIRouter(prefix="/route", tags=["routing"])


@router.post(
    "/matrix",
    response_model=RouteMatrixResponse,
    summary="Distance + travel time matrix from one origin to multiple stations",
)
async def route_matrix(body: RouteMatrixRequest) -> RouteMatrixResponse:
    """
    Accepts one origin `GeoPoint` and up to 25 station coordinates.

    **Pre-filtering**: the Node service (M2) is responsible for pre-filtering to the
    nearest K stations by haversine distance before calling this endpoint. This keeps
    Google Routes API quota consumption low.

    `isEstimated = true` in the response when the haversine fallback was used
    (Google Routes quota exhausted or API error).
    """
    settings = get_settings()
    return await client_route_matrix(
        origin=body.origin,
        station_coords=body.stationCoords,
        api_key=settings.google_server_key
    )
