from fastapi import APIRouter

from app.models.api import ControlPlaneSummaryResponse
from app.services.summary import control_plane_summary_service

router = APIRouter(tags=["summary"])


@router.get("/summary", response_model=ControlPlaneSummaryResponse)
def get_summary() -> ControlPlaneSummaryResponse:
    return control_plane_summary_service.get_summary()
