"""
routers/smartcharge.py
──────────────────────
POST /smartcharge/plan — Find the optimal charging start window.

M3-C1 stub: returns the /contracts/examples/smartcharge_plan.json sample payload.
Real smart-charge optimizer is implemented in M3-C10.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

from app.models import SmartChargePlan, SmartChargePlanRequest

router = APIRouter(prefix="/smartcharge", tags=["smartcharge"])

_EXAMPLES = Path(__file__).parent.parent.parent / "contracts" / "examples"
_SMARTCHARGE_EXAMPLE = SmartChargePlan.model_validate(
    json.loads((_EXAMPLES / "smartcharge_plan.json").read_text(encoding="utf-8"))
)


@router.post(
    "/plan",
    response_model=SmartChargePlan,
    summary="Find the optimal charging start window",
)
async def smartcharge_plan(body: SmartChargePlanRequest) -> SmartChargePlan:
    """
    Given a zone, station, charge rate, energy needed, and a deadline, returns the
    optimal charging start window that maximises renewable % while meeting the deadline.

    - `isImmediate = true` when `urgent=true` was set or no better window was found
      before the deadline.
    - `expectedSavings` is ₹ saved vs charging right now at current grid conditions.
    - `note` is a plain-language explanation shown to the driver in the UI.

    """
    from app.recommend import smartcharge_plan
    return smartcharge_plan(body)
