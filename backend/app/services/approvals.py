from datetime import datetime, timezone
from uuid import uuid4

from app.models.control_plane import ApprovalRecord, ApprovalStatus
from app.repositories.control_plane import control_plane_repository


class ApprovalsService:
    def create_approval(
        self,
        *,
        run_id: str,
        request_id: str,
        agent: str,
        tool: str,
        approval_class: str,
        reason: str | None = None,
    ) -> ApprovalRecord:
        approval = ApprovalRecord(
            id=f"apr-{uuid4().hex[:12]}",
            run_id=run_id,
            request_id=request_id,
            agent=agent,
            tool=tool,
            approval_class=approval_class,
            reason=reason,
            token=f"approval-{uuid4().hex}",
        )
        return control_plane_repository.create_approval(approval)

    def list_approvals(self) -> list[ApprovalRecord]:
        return control_plane_repository.list_approvals()

    def get_approval(self, approval_id: str) -> ApprovalRecord | None:
        return control_plane_repository.get_approval(approval_id)

    def get_approval_by_token(self, token: str) -> ApprovalRecord | None:
        return control_plane_repository.get_approval_by_token(token)

    def approve(
        self,
        approval_id: str,
        reason: str | None = None,
    ) -> ApprovalRecord | None:
        approval = self.get_approval(approval_id)
        if approval is None:
            return None
        approval.status = ApprovalStatus.APPROVED
        approval.reason = reason or approval.reason
        approval.decided_at = datetime.now(timezone.utc)
        return control_plane_repository.update_approval(approval)

    def reject(
        self,
        approval_id: str,
        reason: str | None = None,
    ) -> ApprovalRecord | None:
        approval = self.get_approval(approval_id)
        if approval is None:
            return None
        approval.status = ApprovalStatus.REJECTED
        approval.reason = reason or approval.reason
        approval.decided_at = datetime.now(timezone.utc)
        return control_plane_repository.update_approval(approval)


approvals_service = ApprovalsService()
