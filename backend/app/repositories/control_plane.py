from app.models.control_plane import (
    ApprovalRecord,
    ArtifactRecord,
    EventRecord,
    ExecutionRecord,
    LockRecord,
    RunRecord,
)
from app.services.db import connection, decode_json, encode_json


class ControlPlaneRepository:
    def create_run(self, run: RunRecord) -> RunRecord:
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
            row = conn.execute("SELECT * FROM runs WHERE id = ?", (run_id,)).fetchone()
        return self._row_to_run(row) if row else None

    def update_run(self, run: RunRecord) -> RunRecord:
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

    def create_approval(self, approval: ApprovalRecord) -> ApprovalRecord:
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

    def update_approval(self, approval: ApprovalRecord) -> ApprovalRecord:
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
                    approval.decided_at.isoformat() if approval.decided_at else None,
                    approval.id,
                ),
            )
        return approval

    def list_locks(self) -> list[LockRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM locks ORDER BY created_at ASC, name ASC"
            ).fetchall()
        return [LockRecord.model_validate(dict(row)) for row in rows]

    def get_lock_conflicts(
        self,
        requested_locks: list[str],
        *,
        owner_run_id: str,
    ) -> list[LockRecord]:
        if not requested_locks:
            return []
        placeholders = ", ".join("?" for _ in requested_locks)
        with connection() as conn:
            rows = conn.execute(
                f"""
                SELECT * FROM locks
                WHERE name IN ({placeholders}) AND owner_run_id != ?
                ORDER BY created_at ASC, name ASC
                """,
                (*requested_locks, owner_run_id),
            ).fetchall()
        return [LockRecord.model_validate(dict(row)) for row in rows]

    def acquire_locks(
        self,
        requested_locks: list[str],
        *,
        owner_run_id: str,
    ) -> list[LockRecord]:
        acquired: list[LockRecord] = []
        with connection() as conn:
            for lock_name in requested_locks:
                existing = conn.execute(
                    "SELECT * FROM locks WHERE name = ?",
                    (lock_name,),
                ).fetchone()
                if existing is None:
                    lock = LockRecord(name=lock_name, owner_run_id=owner_run_id)
                    conn.execute(
                        "INSERT INTO locks (name, owner_run_id, created_at) VALUES (?, ?, ?)",
                        (lock.name, lock.owner_run_id, lock.created_at.isoformat()),
                    )
                    acquired.append(lock)
                else:
                    acquired.append(LockRecord.model_validate(dict(existing)))
        return acquired

    def release_locks(self, owner_run_id: str) -> None:
        with connection() as conn:
            conn.execute("DELETE FROM locks WHERE owner_run_id = ?", (owner_run_id,))

    def create_event(self, event: EventRecord) -> EventRecord:
        with connection() as conn:
            conn.execute(
                """
                INSERT INTO events (
                    id, run_id, category, severity, message, created_at, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.id,
                    event.run_id,
                    event.category,
                    event.severity.value,
                    event.message,
                    event.created_at.isoformat(),
                    encode_json(event.details),
                ),
            )
        return event

    def list_events(self) -> list[EventRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM events ORDER BY created_at DESC, id DESC"
            ).fetchall()
        return [
            EventRecord.model_validate(
                {
                    **dict(row),
                    "details": decode_json(row["details"], {}),
                }
            )
            for row in rows
        ]

    def create_execution(self, execution: ExecutionRecord) -> ExecutionRecord:
        with connection() as conn:
            conn.execute(
                """
                INSERT INTO executions (
                    id, run_id, request_id, agent, tool, execution_mode, status,
                    started_at, finished_at, warnings, logs, artifact_ids, details, result_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    execution.id,
                    execution.run_id,
                    execution.request_id,
                    execution.agent,
                    execution.tool,
                    execution.execution_mode,
                    execution.status.value,
                    execution.started_at.isoformat(),
                    execution.finished_at.isoformat() if execution.finished_at else None,
                    encode_json(execution.warnings),
                    encode_json(execution.logs),
                    encode_json(execution.artifact_ids),
                    encode_json(execution.details),
                    execution.result_summary,
                ),
            )
        return execution

    def list_executions(self) -> list[ExecutionRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM executions ORDER BY started_at DESC, id DESC"
            ).fetchall()
        return [self._row_to_execution(row) for row in rows]

    def get_execution(self, execution_id: str) -> ExecutionRecord | None:
        with connection() as conn:
            row = conn.execute(
                "SELECT * FROM executions WHERE id = ?",
                (execution_id,),
            ).fetchone()
        return self._row_to_execution(row) if row else None

    def update_execution(self, execution: ExecutionRecord) -> ExecutionRecord:
        with connection() as conn:
            conn.execute(
                """
                UPDATE executions
                SET status = ?, finished_at = ?, warnings = ?, logs = ?, artifact_ids = ?,
                    details = ?, result_summary = ?
                WHERE id = ?
                """,
                (
                    execution.status.value,
                    execution.finished_at.isoformat() if execution.finished_at else None,
                    encode_json(execution.warnings),
                    encode_json(execution.logs),
                    encode_json(execution.artifact_ids),
                    encode_json(execution.details),
                    execution.result_summary,
                    execution.id,
                ),
            )
        return execution

    def create_artifact(self, artifact: ArtifactRecord) -> ArtifactRecord:
        with connection() as conn:
            conn.execute(
                """
                INSERT INTO artifacts (
                    id, run_id, execution_id, label, kind, uri, path, content_type,
                    simulated, created_at, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    artifact.id,
                    artifact.run_id,
                    artifact.execution_id,
                    artifact.label,
                    artifact.kind,
                    artifact.uri,
                    artifact.path,
                    artifact.content_type,
                    int(artifact.simulated),
                    artifact.created_at.isoformat(),
                    encode_json(artifact.metadata),
                ),
            )
        return artifact

    def list_artifacts(self) -> list[ArtifactRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM artifacts ORDER BY created_at DESC, id DESC"
            ).fetchall()
        return [self._row_to_artifact(row) for row in rows]

    def get_artifact(self, artifact_id: str) -> ArtifactRecord | None:
        with connection() as conn:
            row = conn.execute(
                "SELECT * FROM artifacts WHERE id = ?",
                (artifact_id,),
            ).fetchone()
        return self._row_to_artifact(row) if row else None

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

    def _row_to_approval(self, row: object) -> ApprovalRecord:
        return ApprovalRecord.model_validate(dict(row))

    def _row_to_execution(self, row: object) -> ExecutionRecord:
        mapping = dict(row)
        return ExecutionRecord.model_validate(
            {
                **mapping,
                "warnings": decode_json(mapping["warnings"], []),
                "logs": decode_json(mapping["logs"], []),
                "artifact_ids": decode_json(mapping["artifact_ids"], []),
                "details": decode_json(mapping["details"], {}),
            }
        )

    def _row_to_artifact(self, row: object) -> ArtifactRecord:
        mapping = dict(row)
        return ArtifactRecord.model_validate(
            {
                **mapping,
                "simulated": bool(mapping["simulated"]),
                "metadata": decode_json(mapping["metadata"], {}),
            }
        )


control_plane_repository = ControlPlaneRepository()
