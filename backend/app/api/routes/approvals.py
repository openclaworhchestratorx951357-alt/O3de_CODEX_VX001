from fastapi import APIRouter, HTTPException

from app.models.api import ApprovalDecisionRequest, ApprovalsResponse
from app.models.control_plane import ApprovalRecord, EventSeverity, RunStatus
from app.services.approvals import approvals_service
from app.services.events import events_service
from app.services.runs import runs_service

router = APIRouter(tags=["approvals"])


@router.get("/approvals", response_model=ApprovalsResponse)
def list_approvals() -> ApprovalsResponse:
    return ApprovalsResponse(approvals=approvals_service.list_approvals())


@router.post("/approvals/{approval_id}/approve", response_model=ApprovalRecord)
def approve(
    approval_id: str,
    payload: ApprovalDecisionRequest | None = None,
) -> ApprovalRecord:
    approval = approvals_service.approve(
        approval_id,
        reason=payload.reason if payload else None,
    )
    if approval is None:
        raise HTTPException(
            status_code=404,
            detail=f"Approval '{approval_id}' was not found.",
        )
    runs_service.update_run(
        approval.run_id,
        approval_id=approval.id,
        approval_token=approval.token,
    )
    events_service.record(
        category="approvals",
        severity=EventSeverity.INFO,
        message="Approval granted.",
        run_id=approval.run_id,
        details={"approval_id": approval.id},
    )
    return approval


@router.post("/approvals/{approval_id}/reject", response_model=ApprovalRecord)
def reject(
    approval_id: str,
    payload: ApprovalDecisionRequest | None = None,
) -> ApprovalRecord:
    approval = approvals_service.reject(
        approval_id,
        reason=payload.reason if payload else None,
    )
    if approval is None:
        raise HTTPException(
            status_code=404,
            detail=f"Approval '{approval_id}' was not found.",
        )
    events_service.record(
        category="approvals",
        severity=EventSeverity.WARNING,
        message="Approval rejected.",
        run_id=approval.run_id,
        details={"approval_id": approval.id},
    )
    runs_service.update_run(
        approval.run_id,
        status=RunStatus.REJECTED,
        approval_id=approval.id,
        approval_token=approval.token,
        result_summary="Approval rejected before simulated execution.",
    )
    return approval
