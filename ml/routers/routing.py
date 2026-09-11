"""
routers/routing.py
──────────────────
POST /route/matrix — Distance + travel time matrix from origin to multiple stations.

M3-C1 stub: returns the /contracts/examples/route_matrix.json sample payload.
Real Google Routes/Matrix client + haversine fallback is implemented in M3-C7.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

from app.models import RouteMatrixRequest, RouteMatrixResponse

router = APIRouter(prefix="/route", tags=["routing"])

_EXAMPLES = Path(__file__).parent.parent.parent / "contracts" / "examples"
_ROUTE_MATRIX_EXAMPLE = RouteMatrixResponse.model_validate(
    json.loads((_EXAMPLES / "route_matrix.json").read_text(encoding="utf-8"))
)


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

    **M3-C1 stub**: returns the sample from /contracts/examples/route_matrix.json.
    Real routing client is implemented in M3-C7.
    """
    return _ROUTE_MATRIX_EXAMPLE
