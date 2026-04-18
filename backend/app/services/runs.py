from datetime import datetime, timezone
from uuid import uuid4

from app.models.control_plane import RunRecord, RunStatus
from app.models.request_envelope import RequestEnvelope
from app.services.db import connection, decode_json, encode_json


class RunsService:
    def create_run(
        self,
        request: RequestEnvelope,
        *,
        requested_locks: list[str],
        execution_mode: str,
    ) -> RunRecord:
        run = RunRecord(
            id=f"run-{uuid4().hex[:12]}",
            request_id=request.request_id,
            agent=request.agent,
            tool=request.tool,
            status=RunStatus.PENDING,
            dry_run=request.dry_run,
            requested_locks=requested_locks,
            execution_mode=execution_mode,
        )
        with connection() as conn:
            conn.execute(
                """
                INSERT INTO runs (
                    id, request_id, agent, tool, status, created_at, updated_at,
                    dry_run, approval_id, approval_token, requested_locks,
                    granted_locks, warnings, execution_mode, result_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run.id,
                    run.request_id,
                    run.agent,
                    run.tool,
                    run.status.value,
                    run.created_at.isoformat(),
                    run.updated_at.isoformat(),
                    int(run.dry_run),
                    run.approval_id,
                    run.approval_token,
                    encode_json(run.requested_locks),
                    encode_json(run.granted_locks),
                    encode_json(run.warnings),
                    run.execution_mode,
                    run.result_summary,
                ),
            )
        return run

    def list_runs(self) -> list[RunRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM runs ORDER BY created_at DESC, id DESC"
            ).fetchall()
        return [self._row_to_run(row) for row in rows]

    def get_run(self, run_id: str) -> RunRecord | None:
        with connection() as conn:
            row = conn.execute(
                "SELECT * FROM runs WHERE id = ?",
                (run_id,),
            ).fetchone()
        return self._row_to_run(row) if row else None

    def update_run(
        self,
        run_id: str,
        *,
        status: RunStatus | None = None,
        approval_id: str | None = None,
        approval_token: str | None = None,
        granted_locks: list[str] | None = None,
        warnings: list[str] | None = None,
        result_summary: str | None = None,
    ) -> RunRecord:
        run = self.get_run(run_id)
        if run is None:
            raise KeyError(run_id)
        if status is not None:
            run.status = status
        if approval_id is not None:
            run.approval_id = approval_id
        if approval_token is not None:
            run.approval_token = approval_token
        if granted_locks is not None:
            run.granted_locks = granted_locks
        if warnings is not None:
            run.warnings = warnings
        if result_summary is not None:
            run.result_summary = result_summary
        run.updated_at = datetime.now(timezone.utc)
        with connection() as conn:
            conn.execute(
                """
                UPDATE runs
                SET status = ?, updated_at = ?, approval_id = ?, approval_token = ?,
                    granted_locks = ?, warnings = ?, result_summary = ?
                WHERE id = ?
                """,
                (
                    run.status.value,
                    run.updated_at.isoformat(),
                    run.approval_id,
                    run.approval_token,
                    encode_json(run.granted_locks),
                    encode_json(run.warnings),
                    run.result_summary,
                    run.id,
                ),
            )
        return run

    def _row_to_run(self, row: object) -> RunRecord:
        mapping = dict(row)
        return RunRecord.model_validate(
            {
                **mapping,
                "status": mapping["status"],
                "dry_run": bool(mapping["dry_run"]),
                "requested_locks": decode_json(mapping["requested_locks"], []),
                "granted_locks": decode_json(mapping["granted_locks"], []),
                "warnings": decode_json(mapping["warnings"], []),
            }
        )


runs_service = RunsService()
