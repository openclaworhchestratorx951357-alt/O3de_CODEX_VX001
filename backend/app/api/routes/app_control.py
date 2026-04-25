from fastapi import APIRouter

from app.models.app_control import (
    AppControlExecutionReport,
    AppControlExecutionReportRequest,
    AppControlPreviewRequest,
    AppControlScriptPreview,
)
from app.services.app_control_scripts import app_control_script_service

router = APIRouter(tags=["app-control"])


@router.post("/app/control/preview", response_model=AppControlScriptPreview)
def preview_app_control_script(request: AppControlPreviewRequest) -> AppControlScriptPreview:
    return app_control_script_service.preview_script(request)


@router.post("/app/control/report", response_model=AppControlExecutionReport)
def build_app_control_execution_report(
    request: AppControlExecutionReportRequest,
) -> AppControlExecutionReport:
    return app_control_script_service.build_execution_report(request)
