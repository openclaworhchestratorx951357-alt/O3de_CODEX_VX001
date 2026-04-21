from typing import Any

from pydantic import BaseModel, Field

from app.models.control_plane import (
    ApprovalRecord,
    ArtifactRecord,
    ExecutorRecord,
    EventRecord,
    ExecutionRecord,
    LockRecord,
    RunRecord,
    ToolPolicy,
    WorkspaceRecord,
)


class PersistedSchemaFamilyCoverage(BaseModel):
    family: str = Field(..., min_length=1)
    total_tools: int
    execution_details_tools: int
    artifact_metadata_tools: int
    covered_tools: list[str] = Field(default_factory=list)
    uncovered_tools: list[str] = Field(default_factory=list)


class RootStatus(BaseModel):
    name: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    execution_mode: str = Field(..., min_length=1)
    routes: list[str] = Field(default_factory=list)
    phase: str = Field(..., min_length=1)


class O3DETargetConfig(BaseModel):
    project_root: str | None = None
    engine_root: str | None = None
    editor_runner: str | None = None
    runtime_runner: str | None = None
    source_label: str = Field(..., min_length=1)
    project_root_exists: bool = False
    engine_root_exists: bool = False
    editor_runner_exists: bool = False
    runtime_runner_exists: bool = False


class O3DEBridgeQueueCounts(BaseModel):
    inbox: int = 0
    processing: int = 0
    results: int = 0
    deadletter: int = 0


class O3DEBridgeDeadletterSummary(BaseModel):
    bridge_command_id: str = Field(..., min_length=1)
    operation: str | None = None
    error_code: str | None = None
    result_summary: str | None = None
    finished_at: str | None = None
    result_path: str | None = None


class O3DEBridgeCleanupStatus(BaseModel):
    attempted_at: str | None = None
    outcome: str = Field(..., min_length=1)
    min_age_s: int = 0
    deleted_response_count: int = 0
    retained_response_count: int = 0
    deadletter_preserved_count: int = 0


class O3DEBridgeStatus(BaseModel):
    project_root: str | None = None
    project_root_exists: bool = False
    bridge_root: str | None = None
    inbox_path: str | None = None
    processing_path: str | None = None
    results_path: str | None = None
    deadletter_path: str | None = None
    heartbeat_path: str | None = None
    log_path: str | None = None
    source_label: str = Field(..., min_length=1)
    configured: bool = False
    heartbeat_fresh: bool = False
    queue_counts: O3DEBridgeQueueCounts = Field(default_factory=O3DEBridgeQueueCounts)
    heartbeat: dict[str, Any] | None = None
    last_results_cleanup: O3DEBridgeCleanupStatus | None = None
    recent_deadletters: list[O3DEBridgeDeadletterSummary] = Field(default_factory=list)


class O3DEBridgeResultsCleanupResult(BaseModel):
    project_root: str | None = None
    results_path: str | None = None
    deadletter_path: str | None = None
    source_label: str = Field(..., min_length=1)
    configured: bool = False
    min_age_s: int = 0
    queue_counts_before: O3DEBridgeQueueCounts = Field(default_factory=O3DEBridgeQueueCounts)
    queue_counts_after: O3DEBridgeQueueCounts = Field(default_factory=O3DEBridgeQueueCounts)
    deleted_response_count: int = 0
    deleted_response_paths: list[str] = Field(default_factory=list)
    retained_response_count: int = 0
    deadletter_preserved_count: int = 0


class HealthStatus(BaseModel):
    ok: bool
    service: str = Field(..., min_length=1)
    version: str = Field(..., min_length=1)


class SchemaValidationStatus(BaseModel):
    mode: str = Field(..., min_length=1)
    schema_scope: str = Field(..., min_length=1)
    supports_request_args: bool
    supports_result_conformance: bool
    supports_persisted_execution_details: bool
    supports_persisted_artifact_metadata: bool
    active_keywords: list[str] = Field(default_factory=list)
    active_unsupported_keywords: list[str] = Field(default_factory=list)
    active_metadata_keywords: list[str] = Field(default_factory=list)
    supported_keywords: list[str] = Field(default_factory=list)
    supported_refs: list[str] = Field(default_factory=list)
    unsupported_keywords: list[str] = Field(default_factory=list)
    persisted_execution_details_tool_count: int = 0
    persisted_artifact_metadata_tool_count: int = 0
    persisted_execution_details_tools: list[str] = Field(default_factory=list)
    persisted_artifact_metadata_tools: list[str] = Field(default_factory=list)
    persisted_family_coverage: list[PersistedSchemaFamilyCoverage] = Field(
        default_factory=list
    )
    notes: list[str] = Field(default_factory=list)


class AdapterModeStatus(BaseModel):
    ready: bool
    configured_mode: str = Field(..., min_length=1)
    active_mode: str = Field(..., min_length=1)
    supports_real_execution: bool
    contract_version: str = Field(..., min_length=1)
    execution_boundary: str = Field(..., min_length=1)
    supported_modes: list[str] = Field(default_factory=list)
    available_families: list[str] = Field(default_factory=list)
    real_tool_paths: list[str] = Field(default_factory=list)
    plan_only_tool_paths: list[str] = Field(default_factory=list)
    simulated_tool_paths: list[str] = Field(default_factory=list)
    warning: str | None = None
    notes: list[str] = Field(default_factory=list)


class AdapterFamilyStatus(BaseModel):
    family: str = Field(..., min_length=1)
    mode: str = Field(..., min_length=1)
    supports_real_execution: bool
    contract_version: str = Field(..., min_length=1)
    execution_boundary: str = Field(..., min_length=1)
    ready: bool
    real_tool_paths: list[str] = Field(default_factory=list)
    plan_only_tool_paths: list[str] = Field(default_factory=list)
    simulated_tool_paths: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class AdaptersResponse(BaseModel):
    configured_mode: str = Field(..., min_length=1)
    active_mode: str = Field(..., min_length=1)
    supported_modes: list[str] = Field(default_factory=list)
    contract_version: str = Field(..., min_length=1)
    supports_real_execution: bool
    real_tool_paths: list[str] = Field(default_factory=list)
    plan_only_tool_paths: list[str] = Field(default_factory=list)
    simulated_tool_paths: list[str] = Field(default_factory=list)
    families: list[AdapterFamilyStatus] = Field(default_factory=list)
    warning: str | None = None
    notes: list[str] = Field(default_factory=list)


class ReadinessStatus(BaseModel):
    ok: bool
    service: str = Field(..., min_length=1)
    execution_mode: str = Field(..., min_length=1)
    persistence_ready: bool
    requested_database_strategy: str = Field(..., min_length=1)
    database_strategy: str = Field(..., min_length=1)
    database_path: str = Field(..., min_length=1)
    persistence_warning: str | None = None
    attempted_database_paths: list[str] = Field(default_factory=list)
    adapter_mode: AdapterModeStatus
    schema_validation: SchemaValidationStatus
    dependencies: list[str] = Field(default_factory=list)


class VersionStatus(BaseModel):
    service: str = Field(..., min_length=1)
    version: str = Field(..., min_length=1)
    api_version: str = Field(..., min_length=1)
    adapter_contract_version: str = Field(..., min_length=1)


class ControlPlaneSummaryResponse(BaseModel):
    prompt_sessions_total: int = 0
    prompt_sessions_by_status: dict[str, int] = Field(default_factory=dict)
    prompt_sessions_waiting_approval: int = 0
    prompt_sessions_with_real_editor_children: int = 0
    runs_total: int = 0
    runs_by_status: dict[str, int] = Field(default_factory=dict)
    runs_by_related_execution_mode: dict[str, int] = Field(default_factory=dict)
    runs_by_inspection_surface: dict[str, int] = Field(default_factory=dict)
    runs_by_fallback_category: dict[str, int] = Field(default_factory=dict)
    runs_by_manifest_source_of_truth: dict[str, int] = Field(default_factory=dict)
    approvals_total: int = 0
    approvals_pending: int = 0
    approvals_decided: int = 0
    executions_total: int = 0
    executions_by_status: dict[str, int] = Field(default_factory=dict)
    executions_by_mode: dict[str, int] = Field(default_factory=dict)
    executions_by_attempt_state: dict[str, int] = Field(default_factory=dict)
    executions_by_failure_category: dict[str, int] = Field(default_factory=dict)
    executions_by_backup_class: dict[str, int] = Field(default_factory=dict)
    executions_by_rollback_class: dict[str, int] = Field(default_factory=dict)
    executions_by_retention_class: dict[str, int] = Field(default_factory=dict)
    executions_by_inspection_surface: dict[str, int] = Field(default_factory=dict)
    executions_by_fallback_category: dict[str, int] = Field(default_factory=dict)
    executions_by_manifest_source_of_truth: dict[str, int] = Field(default_factory=dict)
    executors_total: int = 0
    executors_by_availability_state: dict[str, int] = Field(default_factory=dict)
    workspaces_total: int = 0
    workspaces_by_state: dict[str, int] = Field(default_factory=dict)
    artifacts_total: int = 0
    artifacts_by_mode: dict[str, int] = Field(default_factory=dict)
    artifacts_by_inspection_surface: dict[str, int] = Field(default_factory=dict)
    artifacts_by_fallback_category: dict[str, int] = Field(default_factory=dict)
    artifacts_by_manifest_source_of_truth: dict[str, int] = Field(default_factory=dict)
    events_total: int = 0
    active_events: int = 0
    events_by_severity: dict[str, int] = Field(default_factory=dict)
    locks_total: int = 0


class RunsResponse(BaseModel):
    runs: list[RunRecord] = Field(default_factory=list)


class RunListItem(BaseModel):
    id: str = Field(..., min_length=1)
    request_id: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    dry_run: bool
    execution_mode: str = Field(..., min_length=1)
    result_summary: str | None = None
    audit_status: str | None = None
    audit_summary: str | None = None
    inspection_surface: str | None = None
    fallback_category: str | None = None
    project_manifest_source_of_truth: str | None = None
    executor_id: str | None = None
    workspace_id: str | None = None
    workspace_state: str | None = None
    runner_family: str | None = None
    execution_attempt_state: str | None = None
    backup_class: str | None = None
    rollback_class: str | None = None
    retention_class: str | None = None


class RunListResponse(BaseModel):
    runs: list[RunListItem] = Field(default_factory=list)


class SettingsPatchAuditSummary(BaseModel):
    total_runs: int = 0
    preflight: int = 0
    blocked: int = 0
    succeeded: int = 0
    rolled_back: int = 0
    other: int = 0
    available_filters: list[str] = Field(default_factory=list)


class RunAuditRecord(BaseModel):
    run_id: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    audit_status: str = Field(..., min_length=1)
    audit_phase: str | None = None
    audit_summary: str | None = None
    execution_mode: str = Field(..., min_length=1)


class RunsSummaryResponse(BaseModel):
    settings_patch_audit_summary: SettingsPatchAuditSummary
    run_audits: list[RunAuditRecord] = Field(default_factory=list)


class ApprovalsResponse(BaseModel):
    approvals: list[ApprovalRecord] = Field(default_factory=list)


class ApprovalListItem(BaseModel):
    id: str = Field(..., min_length=1)
    run_id: str = Field(..., min_length=1)
    request_id: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    approval_class: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    reason: str | None = None
    created_at: str = Field(..., min_length=1)
    decided_at: str | None = None
    can_decide: bool


class ApprovalsListResponse(BaseModel):
    approvals: list[ApprovalListItem] = Field(default_factory=list)


class LocksResponse(BaseModel):
    locks: list[LockRecord] = Field(default_factory=list)


class LockListItem(BaseModel):
    name: str = Field(..., min_length=1)
    owner_run_id: str = Field(..., min_length=1)
    created_at: str = Field(..., min_length=1)


class LocksListResponse(BaseModel):
    locks: list[LockListItem] = Field(default_factory=list)


class EventsResponse(BaseModel):
    events: list[EventRecord] = Field(default_factory=list)


class EventListItem(BaseModel):
    id: str = Field(..., min_length=1)
    run_id: str | None = None
    execution_id: str | None = None
    executor_id: str | None = None
    workspace_id: str | None = None
    category: str = Field(..., min_length=1)
    event_type: str | None = None
    severity: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    created_at: str = Field(..., min_length=1)
    previous_state: str | None = None
    current_state: str | None = None
    failure_category: str | None = None
    capability_status: str | None = None
    adapter_mode: str | None = None
    event_state: str = Field(..., min_length=1)


class EventListResponse(BaseModel):
    events: list[EventListItem] = Field(default_factory=list)


class PoliciesResponse(BaseModel):
    policies: list[ToolPolicy] = Field(default_factory=list)


class AdaptersEnvelope(BaseModel):
    adapters: AdaptersResponse


class ExecutionsResponse(BaseModel):
    executions: list[ExecutionRecord] = Field(default_factory=list)


class ExecutionListItem(BaseModel):
    id: str = Field(..., min_length=1)
    run_id: str = Field(..., min_length=1)
    request_id: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    execution_mode: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    started_at: str = Field(..., min_length=1)
    finished_at: str | None = None
    result_summary: str | None = None
    warning_count: int = 0
    artifact_count: int = 0
    inspection_surface: str | None = None
    fallback_category: str | None = None
    project_manifest_source_of_truth: str | None = None
    executor_id: str | None = None
    workspace_id: str | None = None
    runner_family: str | None = None
    execution_attempt_state: str | None = None
    failure_category: str | None = None
    backup_class: str | None = None
    rollback_class: str | None = None
    retention_class: str | None = None
    mutation_audit_status: str | None = None
    mutation_audit_summary: str | None = None


class ExecutionListResponse(BaseModel):
    executions: list[ExecutionListItem] = Field(default_factory=list)


class ArtifactsResponse(BaseModel):
    artifacts: list[ArtifactRecord] = Field(default_factory=list)


class ArtifactListItem(BaseModel):
    id: str = Field(..., min_length=1)
    run_id: str = Field(..., min_length=1)
    execution_id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    kind: str = Field(..., min_length=1)
    uri: str = Field(..., min_length=1)
    path: str | None = None
    content_type: str | None = None
    simulated: bool
    created_at: str = Field(..., min_length=1)
    inspection_surface: str | None = None
    fallback_category: str | None = None
    project_manifest_source_of_truth: str | None = None
    artifact_role: str | None = None
    executor_id: str | None = None
    workspace_id: str | None = None
    retention_class: str | None = None
    evidence_completeness: str | None = None
    execution_mode: str | None = None
    project_name: str | None = None
    mutation_audit_status: str | None = None
    mutation_audit_summary: str | None = None


class ArtifactListResponse(BaseModel):
    artifacts: list[ArtifactListItem] = Field(default_factory=list)


class ExecutorsResponse(BaseModel):
    executors: list[ExecutorRecord] = Field(default_factory=list)


class WorkspacesResponse(BaseModel):
    workspaces: list[WorkspaceRecord] = Field(default_factory=list)


class ApprovalDecisionRequest(BaseModel):
    reason: str | None = None
