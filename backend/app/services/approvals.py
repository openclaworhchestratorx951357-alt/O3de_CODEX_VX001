from datetime import datetime, timezone
from uuid import uuid4

from app.models.control_plane import ApprovalRecord, ApprovalStatus
from app.services.db import connection


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
        with connection() as conn:
            conn.execute(
                """
                INSERT INTO approvals (
                    id, run_id, request_id, agent, tool, approval_class,
                    status, reason, token, created_at, decided_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    approval.id,
                    approval.run_id,
                    approval.request_id,
                    approval.agent,
                    approval.tool,
                    approval.approval_class,
                    approval.status.value,
                    approval.reason,
                    approval.token,
                    approval.created_at.isoformat(),
                    approval.decided_at.isoformat() if approval.decided_at else None,
                ),
            )
        return approval

    def list_approvals(self) -> list[ApprovalRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM approvals ORDER BY created_at DESC, id DESC"
            ).fetchall()
        return [self._row_to_approval(row) for row in rows]

    def get_approval(self, approval_id: str) -> ApprovalRecord | None:
        with connection() as conn:
            row = conn.execute(
                "SELECT * FROM approvals WHERE id = ?",
                (approval_id,),
            ).fetchone()
        return self._row_to_approval(row) if row else None

    def get_approval_by_token(self, token: str) -> ApprovalRecord | None:
        with connection() as conn:
            row = conn.execute(
                "SELECT * FROM approvals WHERE token = ?",
                (token,),
            ).fetchone()
        return self._row_to_approval(row) if row else None

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
        with connection() as conn:
            conn.execute(
                """
                UPDATE approvals
                SET status = ?, reason = ?, decided_at = ?
                WHERE id = ?
                """,
                (
                    approval.status.value,
                    approval.reason,
                    approval.decided_at.isoformat(),
                    approval.id,
                ),
            )
        return approval

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
        with connection() as conn:
            conn.execute(
                """
                UPDATE approvals
                SET status = ?, reason = ?, decided_at = ?
                WHERE id = ?
                """,
                (
                    approval.status.value,
                    approval.reason,
                    approval.decided_at.isoformat(),
                    approval.id,
                ),
            )
        return approval

    def _row_to_approval(self, row: object) -> ApprovalRecord:
        return ApprovalRecord.model_validate(dict(row))


approvals_service = ApprovalsService()
