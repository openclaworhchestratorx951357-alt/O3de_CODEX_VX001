from app.models.control_plane import (
    ApprovalRecord,
    ArtifactRecord,
    ExecutorRecord,
    EventRecord,
    ExecutionRecord,
    LockRecord,
    RunRecord,
    WorkspaceRecord,
)
from app.models.prompt_control import PromptSessionRecord
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
                    id, run_id, execution_id, executor_id, workspace_id, category,
                    event_type, severity, message, created_at, previous_state,
                    current_state, failure_category, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.id,
                    event.run_id,
                    event.execution_id,
                    event.executor_id,
                    event.workspace_id,
                    event.category,
                    event.event_type,
                    event.severity.value,
                    event.message,
                    event.created_at.isoformat(),
                    event.previous_state,
                    event.current_state,
                    event.failure_category,
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
                    started_at, finished_at, warnings, logs, artifact_ids,
                    executor_id, workspace_id, runner_family,
                    execution_attempt_state, failure_category, failure_stage,
                    approval_class, lock_scope, backup_class, rollback_class,
                    retention_class, details, result_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    execution.executor_id,
                    execution.workspace_id,
                    execution.runner_family,
                    execution.execution_attempt_state,
                    execution.failure_category,
                    execution.failure_stage,
                    execution.approval_class,
                    execution.lock_scope,
                    execution.backup_class,
                    execution.rollback_class,
                    execution.retention_class,
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
                    executor_id = ?, workspace_id = ?, runner_family = ?,
                    execution_attempt_state = ?, failure_category = ?, failure_stage = ?,
                    approval_class = ?, lock_scope = ?, backup_class = ?, rollback_class = ?,
                    retention_class = ?, details = ?, result_summary = ?
                WHERE id = ?
                """,
                (
                    execution.status.value,
                    execution.finished_at.isoformat() if execution.finished_at else None,
                    encode_json(execution.warnings),
                    encode_json(execution.logs),
                    encode_json(execution.artifact_ids),
                    execution.executor_id,
                    execution.workspace_id,
                    execution.runner_family,
                    execution.execution_attempt_state,
                    execution.failure_category,
                    execution.failure_stage,
                    execution.approval_class,
                    execution.lock_scope,
                    execution.backup_class,
                    execution.rollback_class,
                    execution.retention_class,
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
                    simulated, created_at, artifact_role, executor_id, workspace_id,
                    retention_class, evidence_completeness, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    artifact.artifact_role,
                    artifact.executor_id,
                    artifact.workspace_id,
                    artifact.retention_class,
                    artifact.evidence_completeness,
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

    def create_executor(self, executor: ExecutorRecord) -> ExecutorRecord:
        with connection() as conn:
            conn.execute(
                """
                INSERT INTO executors (
                    id, executor_kind, executor_label, executor_host_label,
                    execution_mode_class, availability_state,
                    supported_runner_families, capability_snapshot,
                    last_heartbeat_at, last_failure_summary, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    executor.id,
                    executor.executor_kind,
                    executor.executor_label,
                    executor.executor_host_label,
                    executor.execution_mode_class,
                    executor.availability_state,
                    encode_json(executor.supported_runner_families),
                    encode_json(executor.capability_snapshot),
                    executor.last_heartbeat_at.isoformat()
                    if executor.last_heartbeat_at
                    else None,
                    executor.last_failure_summary,
                    executor.created_at.isoformat(),
                    executor.updated_at.isoformat(),
                ),
            )
        return executor

    def list_executors(self) -> list[ExecutorRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM executors ORDER BY updated_at DESC, id DESC"
            ).fetchall()
        return [self._row_to_executor(row) for row in rows]

    def get_executor(self, executor_id: str) -> ExecutorRecord | None:
        with connection() as conn:
            row = conn.execute(
                "SELECT * FROM executors WHERE id = ?",
                (executor_id,),
            ).fetchone()
        return self._row_to_executor(row) if row else None

    def update_executor(self, executor: ExecutorRecord) -> ExecutorRecord:
        with connection() as conn:
            conn.execute(
                """
                UPDATE executors
                SET executor_kind = ?, executor_label = ?, executor_host_label = ?,
                    execution_mode_class = ?, availability_state = ?,
                    supported_runner_families = ?, capability_snapshot = ?,
                    last_heartbeat_at = ?, last_failure_summary = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    executor.executor_kind,
                    executor.executor_label,
                    executor.executor_host_label,
                    executor.execution_mode_class,
                    executor.availability_state,
                    encode_json(executor.supported_runner_families),
                    encode_json(executor.capability_snapshot),
                    executor.last_heartbeat_at.isoformat()
                    if executor.last_heartbeat_at
                    else None,
                    executor.last_failure_summary,
                    executor.updated_at.isoformat(),
                    executor.id,
                ),
            )
        return executor

    def create_workspace(self, workspace: WorkspaceRecord) -> WorkspaceRecord:
        with connection() as conn:
            conn.execute(
                """
                INSERT INTO workspaces (
                    id, workspace_kind, workspace_root, workspace_state,
                    cleanup_policy, retention_class, engine_binding, project_binding,
                    runner_family, owner_run_id, owner_execution_id, owner_executor_id,
                    created_at, activated_at, completed_at, cleaned_at,
                    last_failure_summary
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    workspace.id,
                    workspace.workspace_kind,
                    workspace.workspace_root,
                    workspace.workspace_state,
                    workspace.cleanup_policy,
                    workspace.retention_class,
                    encode_json(workspace.engine_binding),
                    encode_json(workspace.project_binding),
                    workspace.runner_family,
                    workspace.owner_run_id,
                    workspace.owner_execution_id,
                    workspace.owner_executor_id,
                    workspace.created_at.isoformat(),
                    workspace.activated_at.isoformat() if workspace.activated_at else None,
                    workspace.completed_at.isoformat() if workspace.completed_at else None,
                    workspace.cleaned_at.isoformat() if workspace.cleaned_at else None,
                    workspace.last_failure_summary,
                ),
            )
        return workspace

    def create_prompt_session(self, session: PromptSessionRecord) -> PromptSessionRecord:
        with connection() as conn:
            conn.execute(
                """
                INSERT INTO prompt_sessions (
                    prompt_id, plan_id, status, prompt_text, project_root, engine_root,
                    dry_run, preferred_domains, operator_note, child_run_ids,
                    child_execution_ids, child_artifact_ids, child_event_ids,
                    workspace_id, executor_id, plan_summary, evidence_summary,
                    admitted_capabilities, refused_capabilities, final_result_summary,
                    next_step_index, current_step_id, pending_approval_id,
                    pending_approval_token, last_error_code, last_error_retryable,
                    step_attempts,
                    plan_json, latest_child_responses, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session.prompt_id,
                    session.plan_id,
                    session.status.value,
                    session.prompt_text,
                    session.project_root,
                    session.engine_root,
                    int(session.dry_run),
                    encode_json(session.preferred_domains),
                    session.operator_note,
                    encode_json(session.child_run_ids),
                    encode_json(session.child_execution_ids),
                    encode_json(session.child_artifact_ids),
                    encode_json(session.child_event_ids),
                    session.workspace_id,
                    session.executor_id,
                    session.plan_summary,
                    session.evidence_summary,
                    encode_json(session.admitted_capabilities),
                    encode_json(session.refused_capabilities),
                    session.final_result_summary,
                    session.next_step_index,
                    session.current_step_id,
                    session.pending_approval_id,
                    session.pending_approval_token,
                    session.last_error_code,
                    int(session.last_error_retryable),
                    encode_json(session.step_attempts),
                    encode_json(session.plan.model_dump(mode="json")) if session.plan else None,
                    encode_json(session.latest_child_responses),
                    session.created_at.isoformat(),
                    session.updated_at.isoformat(),
                ),
            )
        return session

    def list_prompt_sessions(self) -> list[PromptSessionRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM prompt_sessions ORDER BY updated_at DESC, prompt_id DESC"
            ).fetchall()
        return [self._row_to_prompt_session(row) for row in rows]

    def get_prompt_session(self, prompt_id: str) -> PromptSessionRecord | None:
        with connection() as conn:
            row = conn.execute(
                "SELECT * FROM prompt_sessions WHERE prompt_id = ?",
                (prompt_id,),
            ).fetchone()
        return self._row_to_prompt_session(row) if row else None

    def update_prompt_session(self, session: PromptSessionRecord) -> PromptSessionRecord:
        with connection() as conn:
            conn.execute(
                """
                UPDATE prompt_sessions
                SET plan_id = ?, status = ?, prompt_text = ?, project_root = ?, engine_root = ?,
                    dry_run = ?, preferred_domains = ?, operator_note = ?, child_run_ids = ?,
                    child_execution_ids = ?, child_artifact_ids = ?, child_event_ids = ?,
                    workspace_id = ?, executor_id = ?, plan_summary = ?, evidence_summary = ?,
                    admitted_capabilities = ?, refused_capabilities = ?, final_result_summary = ?,
                    next_step_index = ?, current_step_id = ?, pending_approval_id = ?,
                    pending_approval_token = ?, last_error_code = ?, last_error_retryable = ?,
                    step_attempts = ?, plan_json = ?, latest_child_responses = ?, updated_at = ?
                WHERE prompt_id = ?
                """,
                (
                    session.plan_id,
                    session.status.value,
                    session.prompt_text,
                    session.project_root,
                    session.engine_root,
                    int(session.dry_run),
                    encode_json(session.preferred_domains),
                    session.operator_note,
                    encode_json(session.child_run_ids),
                    encode_json(session.child_execution_ids),
                    encode_json(session.child_artifact_ids),
                    encode_json(session.child_event_ids),
                    session.workspace_id,
                    session.executor_id,
                    session.plan_summary,
                    session.evidence_summary,
                    encode_json(session.admitted_capabilities),
                    encode_json(session.refused_capabilities),
                    session.final_result_summary,
                    session.next_step_index,
                    session.current_step_id,
                    session.pending_approval_id,
                    session.pending_approval_token,
                    session.last_error_code,
                    int(session.last_error_retryable),
                    encode_json(session.step_attempts),
                    encode_json(session.plan.model_dump(mode="json")) if session.plan else None,
                    encode_json(session.latest_child_responses),
                    session.updated_at.isoformat(),
                    session.prompt_id,
                ),
            )
        return session

    def list_workspaces(self) -> list[WorkspaceRecord]:
        with connection() as conn:
            rows = conn.execute(
                "SELECT * FROM workspaces ORDER BY created_at DESC, id DESC"
            ).fetchall()
        return [self._row_to_workspace(row) for row in rows]

    def get_workspace(self, workspace_id: str) -> WorkspaceRecord | None:
        with connection() as conn:
            row = conn.execute(
                "SELECT * FROM workspaces WHERE id = ?",
                (workspace_id,),
            ).fetchone()
        return self._row_to_workspace(row) if row else None

    def update_workspace(self, workspace: WorkspaceRecord) -> WorkspaceRecord:
        with connection() as conn:
            conn.execute(
                """
                UPDATE workspaces
                SET workspace_kind = ?, workspace_root = ?, workspace_state = ?,
                    cleanup_policy = ?, retention_class = ?, engine_binding = ?,
                    project_binding = ?, runner_family = ?, owner_run_id = ?,
                    owner_execution_id = ?, owner_executor_id = ?, activated_at = ?,
                    completed_at = ?, cleaned_at = ?, last_failure_summary = ?
                WHERE id = ?
                """,
                (
                    workspace.workspace_kind,
                    workspace.workspace_root,
                    workspace.workspace_state,
                    workspace.cleanup_policy,
                    workspace.retention_class,
                    encode_json(workspace.engine_binding),
                    encode_json(workspace.project_binding),
                    workspace.runner_family,
                    workspace.owner_run_id,
                    workspace.owner_execution_id,
                    workspace.owner_executor_id,
                    workspace.activated_at.isoformat() if workspace.activated_at else None,
                    workspace.completed_at.isoformat() if workspace.completed_at else None,
                    workspace.cleaned_at.isoformat() if workspace.cleaned_at else None,
                    workspace.last_failure_summary,
                    workspace.id,
                ),
            )
        return workspace

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
                "executor_id": mapping.get("executor_id"),
                "workspace_id": mapping.get("workspace_id"),
                "runner_family": mapping.get("runner_family"),
                "execution_attempt_state": mapping.get("execution_attempt_state"),
                "failure_category": mapping.get("failure_category"),
                "failure_stage": mapping.get("failure_stage"),
                "approval_class": mapping.get("approval_class"),
                "lock_scope": mapping.get("lock_scope"),
                "backup_class": mapping.get("backup_class"),
                "rollback_class": mapping.get("rollback_class"),
                "retention_class": mapping.get("retention_class"),
            }
        )

    def _row_to_artifact(self, row: object) -> ArtifactRecord:
        mapping = dict(row)
        return ArtifactRecord.model_validate(
            {
                **mapping,
                "simulated": bool(mapping["simulated"]),
                "artifact_role": mapping.get("artifact_role"),
                "executor_id": mapping.get("executor_id"),
                "workspace_id": mapping.get("workspace_id"),
                "retention_class": mapping.get("retention_class"),
                "evidence_completeness": mapping.get("evidence_completeness"),
                "metadata": decode_json(mapping["metadata"], {}),
            }
        )

    def _row_to_executor(self, row: object) -> ExecutorRecord:
        mapping = dict(row)
        return ExecutorRecord.model_validate(
            {
                **mapping,
                "supported_runner_families": decode_json(
                    mapping["supported_runner_families"], []
                ),
                "capability_snapshot": decode_json(mapping["capability_snapshot"], {}),
            }
        )

    def _row_to_workspace(self, row: object) -> WorkspaceRecord:
        mapping = dict(row)
        return WorkspaceRecord.model_validate(
            {
                **mapping,
                "engine_binding": decode_json(mapping["engine_binding"], {}),
                "project_binding": decode_json(mapping["project_binding"], {}),
            }
        )

    def _row_to_prompt_session(self, row: object) -> PromptSessionRecord:
        mapping = dict(row)
        plan_payload = decode_json(mapping.get("plan_json"), None)
        return PromptSessionRecord.model_validate(
            {
                **mapping,
                "dry_run": bool(mapping["dry_run"]),
                "preferred_domains": decode_json(mapping["preferred_domains"], []),
                "child_run_ids": decode_json(mapping["child_run_ids"], []),
                "child_execution_ids": decode_json(mapping["child_execution_ids"], []),
                "child_artifact_ids": decode_json(mapping["child_artifact_ids"], []),
                "child_event_ids": decode_json(mapping["child_event_ids"], []),
                "admitted_capabilities": decode_json(mapping["admitted_capabilities"], []),
                "refused_capabilities": decode_json(mapping["refused_capabilities"], []),
                "next_step_index": mapping.get("next_step_index", 0),
                "current_step_id": mapping.get("current_step_id"),
                "pending_approval_id": mapping.get("pending_approval_id"),
                "pending_approval_token": mapping.get("pending_approval_token"),
                "last_error_code": mapping.get("last_error_code"),
                "last_error_retryable": bool(mapping.get("last_error_retryable", 0)),
                "step_attempts": decode_json(mapping.get("step_attempts"), {}),
                "latest_child_responses": decode_json(
                    mapping["latest_child_responses"],
                    [],
                ),
                "plan": plan_payload,
            }
        )


control_plane_repository = ControlPlaneRepository()
