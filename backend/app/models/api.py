from typing import Any

from pydantic import BaseModel, Field

from app.models.control_plane import (
    ApprovalRecord,
    ArtifactRecord,
    AutonomyHealingActionRecord,
    AutonomyJobRecord,
    AutonomyMemoryRecord,
    AutonomyObjectiveRecord,
    AutonomyObservationRecord,
    EventRecord,
    ExecutionRecord,
    ExecutorRecord,
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
    heartbeat_age_s: float | None = None
    runner_process_active: bool = False
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


class CodexHarnessStatus(BaseModel):
    harness_id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    configured: bool
    status: str = Field(..., min_length=1)
    detail: str = Field(..., min_length=1)
    notes: list[str] = Field(default_factory=list)


class CodexControlWorktree(BaseModel):
    path: str = Field(..., min_length=1)
    branch_name: str | None = None
    head: str | None = None
    bare: bool = False
    detached: bool = False
    locked: bool = False
    prunable: bool = False
    is_current_repo: bool = False


class CodexControlWorker(BaseModel):
    worker_id: str = Field(..., min_length=1)
    display_name: str = Field(..., min_length=1)
    agent_profile: str | None = None
    agent_runtime: str | None = None
    agent_entrypoint: str | None = None
    agent_access_notes: str | None = None
    identity_notes: str | None = None
    personality_notes: str | None = None
    soul_directive: str | None = None
    memory_notes: str | None = None
    bootstrap_notes: str | None = None
    capability_tags: list[str] = Field(default_factory=list)
    context_sources: list[str] = Field(default_factory=list)
    avatar_label: str | None = None
    avatar_color: str | None = None
    avatar_uri: str | None = None
    branch_name: str | None = None
    worktree_path: str | None = None
    base_branch: str | None = None
    status: str = Field(..., min_length=1)
    current_task_id: str | None = None
    summary: str | None = None
    resume_notes: str | None = None
    updated_at: str | None = None
    last_seen_at: str | None = None


class CodexControlTask(BaseModel):
    task_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    priority: int
    status: str = Field(..., min_length=1)
    scope_paths: list[str] = Field(default_factory=list)
    recommended_branch_prefix: str | None = None
    claimed_by_worker_id: str | None = None
    blockers: list[str] = Field(default_factory=list)
    claimed_at: str | None = None
    updated_at: str | None = None
    completed_at: str | None = None
    superseded_by_task_id: str | None = None
    superseded_at: str | None = None
    supersede_reason: str | None = None


class CodexControlWaiter(BaseModel):
    waiter_id: int
    worker_id: str = Field(..., min_length=1)
    task_id: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    created_at: str = Field(..., min_length=1)
    updated_at: str = Field(..., min_length=1)
    notified_at: str | None = None


class CodexControlNotification(BaseModel):
    notification_id: int
    worker_id: str = Field(..., min_length=1)
    task_id: str | None = None
    kind: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    created_at: str = Field(..., min_length=1)
    read_at: str | None = None


class CodexControlTerminalSession(BaseModel):
    session_id: str = Field(..., min_length=1)
    worker_id: str = Field(..., min_length=1)
    task_id: str | None = None
    label: str = Field(..., min_length=1)
    cwd: str = Field(..., min_length=1)
    command: list[str] = Field(default_factory=list)
    status: str = Field(..., min_length=1)
    pid: int | None = None
    log_path: str = Field(..., min_length=1)
    created_at: str = Field(..., min_length=1)
    started_at: str = Field(..., min_length=1)
    updated_at: str = Field(..., min_length=1)
    exited_at: str | None = None
    stop_requested_at: str | None = None
    stop_requested_by: str | None = None
    stop_reason: str | None = None
    tail_preview: list[str] = Field(default_factory=list)


class CodexControlBoardStatus(BaseModel):
    available: bool = False
    generated_at: str | None = None
    repo_root: str | None = None
    state_dir: str | None = None
    board_json_path: str | None = None
    board_text_path: str | None = None
    workers: list[CodexControlWorker] = Field(default_factory=list)
    tasks: list[CodexControlTask] = Field(default_factory=list)
    waiters: list[CodexControlWaiter] = Field(default_factory=list)
    notifications: list[CodexControlNotification] = Field(default_factory=list)
    terminal_sessions: list[CodexControlTerminalSession] = Field(default_factory=list)


class CodexControlStatusResponse(BaseModel):
    repo_root: str = Field(..., min_length=1)
    git_common_dir: str = Field(..., min_length=1)
    current_branch: str | None = None
    mission_control_script_path: str = Field(..., min_length=1)
    mission_control_wrapper_path: str | None = None
    mission_control_available: bool = False
    recommended_base_branch: str = Field(..., min_length=1)
    board: CodexControlBoardStatus = Field(default_factory=CodexControlBoardStatus)
    worktrees: list[CodexControlWorktree] = Field(default_factory=list)
    harnesses: list[CodexHarnessStatus] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class CodexControlLaneCreateRequest(BaseModel):
    worker_id: str = Field(..., min_length=1)
    display_name: str | None = None
    agent_profile: str | None = None
    agent_runtime: str | None = None
    agent_entrypoint: str | None = None
    agent_access_notes: str | None = None
    identity_notes: str | None = None
    personality_notes: str | None = None
    soul_directive: str | None = None
    memory_notes: str | None = None
    bootstrap_notes: str | None = None
    capability_tags: list[str] | None = None
    context_sources: list[str] | None = None
    avatar_label: str | None = None
    avatar_color: str | None = None
    avatar_uri: str | None = None
    branch_name: str | None = None
    worktree_path: str | None = None
    base_branch: str | None = None
    resume_notes: str | None = None
    bootstrap: bool = True


class CodexControlLaneCreateResponse(BaseModel):
    status: str = Field(..., min_length=1)
    worker: CodexControlWorker
    worktree_path: str = Field(..., min_length=1)
    board_json_path: str | None = None
    board_text_path: str | None = None


class CodexControlWorkerSyncRequest(BaseModel):
    worker_id: str = Field(..., min_length=1)
    display_name: str | None = None
    agent_profile: str | None = None
    agent_runtime: str | None = None
    agent_entrypoint: str | None = None
    agent_access_notes: str | None = None
    identity_notes: str | None = None
    personality_notes: str | None = None
    soul_directive: str | None = None
    memory_notes: str | None = None
    bootstrap_notes: str | None = None
    capability_tags: list[str] | None = None
    context_sources: list[str] | None = None
    avatar_label: str | None = None
    avatar_color: str | None = None
    avatar_uri: str | None = None
    branch_name: str | None = None
    worktree_path: str | None = None
    base_branch: str | None = None
    status: str = Field(default="idle", min_length=1)
    summary: str | None = None
    resume_notes: str | None = None


class CodexControlWorkerHeartbeatRequest(BaseModel):
    status: str | None = None
    summary: str | None = None
    current_task_id: str | None = None
    agent_profile: str | None = None
    agent_runtime: str | None = None
    agent_entrypoint: str | None = None
    agent_access_notes: str | None = None
    identity_notes: str | None = None
    personality_notes: str | None = None
    soul_directive: str | None = None
    memory_notes: str | None = None
    bootstrap_notes: str | None = None
    capability_tags: list[str] | None = None
    context_sources: list[str] | None = None
    avatar_label: str | None = None
    avatar_color: str | None = None
    avatar_uri: str | None = None
    branch_name: str | None = None
    worktree_path: str | None = None
    base_branch: str | None = None
    resume_notes: str | None = None


class CodexControlWorkerResponse(BaseModel):
    status: str = Field(..., min_length=1)
    worker: CodexControlWorker
    board_json_path: str | None = None
    board_text_path: str | None = None


class CodexControlTaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    priority: int = 100
    branch_prefix: str | None = None
    scope_paths: list[str] = Field(default_factory=list)


class CodexControlTaskActionRequest(BaseModel):
    worker_id: str = Field(..., min_length=1)


class CodexControlTaskSupersedeRequest(BaseModel):
    worker_id: str = Field(..., min_length=1)
    replacement_title: str = Field(..., min_length=1)
    replacement_summary: str = Field(..., min_length=1)
    replacement_priority: int = 200
    replacement_scope_paths: list[str] = Field(default_factory=list)
    replacement_branch_prefix: str | None = None
    replacement_task_id: str | None = None
    supersede_reason: str = Field(..., min_length=1)
    requested_by: str | None = None
    stop_active_terminal: bool = True


class CodexControlNotificationCreateRequest(BaseModel):
    kind: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    task_id: str | None = None


class CodexControlTerminalLaunchRequest(BaseModel):
    worker_id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    command: list[str] = Field(default_factory=list)
    cwd: str | None = None
    task_id: str | None = None


class CodexControlTerminalStopRequest(BaseModel):
    requested_by: str | None = None
    reason: str | None = None
    force: bool = False


class CodexControlTaskWaitRequest(BaseModel):
    worker_id: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)


class CodexControlNextTaskRequest(BaseModel):
    worker_id: str = Field(..., min_length=1)
    claim: bool = False
    wait: bool = False
    wait_reason: str | None = None


class CodexControlTaskResponse(BaseModel):
    status: str = Field(..., min_length=1)
    task: CodexControlTask
    board_json_path: str | None = None
    board_text_path: str | None = None


class CodexControlTaskSupersedeResponse(BaseModel):
    status: str = Field(..., min_length=1)
    superseded_task: CodexControlTask
    replacement_task: CodexControlTask
    stopped_terminal_session: CodexControlTerminalSession | None = None
    notified_workers: list[str] = Field(default_factory=list)
    board_json_path: str | None = None
    board_text_path: str | None = None


class CodexControlWaiterResponse(BaseModel):
    status: str = Field(..., min_length=1)
    waiter: CodexControlWaiter
    board_json_path: str | None = None
    board_text_path: str | None = None


class CodexControlNextTaskResponse(BaseModel):
    status: str = Field(..., min_length=1)
    decision: str = Field(..., min_length=1)
    task: CodexControlTask | None = None
    blockers: list[CodexControlTask] = Field(default_factory=list)
    waiter: CodexControlWaiter | None = None
    board_json_path: str | None = None
    board_text_path: str | None = None


class CodexControlNotificationsResponse(BaseModel):
    status: str = Field(..., min_length=1)
    notifications: list[CodexControlNotification] = Field(default_factory=list)
    board_json_path: str | None = None
    board_text_path: str | None = None


class CodexControlTerminalSessionResponse(BaseModel):
    status: str = Field(..., min_length=1)
    terminal_session: CodexControlTerminalSession
    board_json_path: str | None = None
    board_text_path: str | None = None


class AutonomySummaryResponse(BaseModel):
    objectives_total: int = 0
    objectives_by_status: dict[str, int] = Field(default_factory=dict)
    jobs_total: int = 0
    jobs_by_status: dict[str, int] = Field(default_factory=dict)
    observations_total: int = 0
    observations_by_severity: dict[str, int] = Field(default_factory=dict)
    healing_actions_total: int = 0
    healing_actions_by_status: dict[str, int] = Field(default_factory=dict)
    memories_total: int = 0


class AutonomyObjectiveCreateRequest(BaseModel):
    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    status: str = Field(default="proposed", min_length=1)
    priority: int = 100
    target_scopes: list[str] = Field(default_factory=list)
    success_criteria: list[str] = Field(default_factory=list)
    owner_kind: str = Field(default="builder", min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AutonomyObjectivesResponse(BaseModel):
    objectives: list[AutonomyObjectiveRecord] = Field(default_factory=list)


class AutonomyJobCreateRequest(BaseModel):
    id: str = Field(..., min_length=1)
    objective_id: str | None = None
    job_kind: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    status: str = Field(default="queued", min_length=1)
    assigned_lane: str | None = None
    resource_keys: list[str] = Field(default_factory=list)
    depends_on: list[str] = Field(default_factory=list)
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    retry_count: int = 0
    max_retries: int = 0
    last_error: str | None = None


class AutonomyJobUpdateRequest(BaseModel):
    status: str | None = None
    assigned_lane: str | None = None
    output_payload: dict[str, Any] | None = None
    retry_count: int | None = None
    last_error: str | None = None


class AutonomyJobsResponse(BaseModel):
    jobs: list[AutonomyJobRecord] = Field(default_factory=list)


class AutonomyObservationCreateRequest(BaseModel):
    id: str = Field(..., min_length=1)
    source_kind: str = Field(..., min_length=1)
    source_ref: str | None = None
    category: str = Field(..., min_length=1)
    severity: str = Field(default="info", min_length=1)
    message: str = Field(..., min_length=1)
    details: dict[str, Any] = Field(default_factory=dict)


class AutonomyObservationUpdateRequest(BaseModel):
    message: str | None = None
    details: dict[str, Any] | None = None


class AutonomyObservationsResponse(BaseModel):
    observations: list[AutonomyObservationRecord] = Field(default_factory=list)


class AutonomyHealingActionCreateRequest(BaseModel):
    id: str = Field(..., min_length=1)
    observation_id: str | None = None
    job_id: str | None = None
    action_kind: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    status: str = Field(default="proposed", min_length=1)
    details: dict[str, Any] = Field(default_factory=dict)


class AutonomyHealingActionUpdateRequest(BaseModel):
    status: str | None = None
    details: dict[str, Any] | None = None


class AutonomyHealingActionsResponse(BaseModel):
    healing_actions: list[AutonomyHealingActionRecord] = Field(default_factory=list)


class AutonomyMemoryCreateRequest(BaseModel):
    id: str = Field(..., min_length=1)
    memory_kind: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    tags: list[str] = Field(default_factory=list)
    confidence: float | None = None
    source_refs: list[str] = Field(default_factory=list)


class AutonomyMemoriesResponse(BaseModel):
    memories: list[AutonomyMemoryRecord] = Field(default_factory=list)


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
    gated_tool_paths: list[str] = Field(default_factory=list)
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
    gated_tool_paths: list[str] = Field(default_factory=list)
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
    gated_tool_paths: list[str] = Field(default_factory=list)
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


class RunSubstrateSummaryItem(BaseModel):
    run_id: str = Field(..., min_length=1)
    tool_name: str = Field(..., min_length=1)
    execution_id: str | None = None
    run_status: str = Field(..., min_length=1)
    execution_mode_class: str = Field(..., min_length=1)
    runner_family: str | None = None
    executor_id: str | None = None
    executor_label: str | None = None
    workspace_id: str | None = None
    workspace_state: str | None = None
    execution_attempt_state: str | None = None
    approval_state_label: str = Field(..., min_length=1)
    lock_state_label: str = Field(..., min_length=1)
    backup_state_label: str = Field(..., min_length=1)
    rollback_state_label: str = Field(..., min_length=1)
    verification_state_label: str = Field(..., min_length=1)
    primary_log_artifact_id: str | None = None
    summary_artifact_id: str | None = None
    final_status_reason: str | None = None
    truth_note: str = Field(..., min_length=1)


class RunSubstrateSummaryResponse(BaseModel):
    runs: list[RunSubstrateSummaryItem] = Field(default_factory=list)


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
    verification_state: str | None = None
    verified_count: int | None = None
    assumed_count: int | None = None
    event_state: str = Field(..., min_length=1)


class EventListResponse(BaseModel):
    events: list[EventListItem] = Field(default_factory=list)


class AppControlEventSummary(BaseModel):
    total_events: int = 0
    applied_events: int = 0
    reverted_events: int = 0
    verified_only_events: int = 0
    assumed_present_events: int = 0
    verification_not_recorded_events: int = 0
    latest_event_id: str | None = None
    latest_event_type: str | None = None
    latest_created_at: str | None = None
    latest_summary: str | None = None
    latest_verified_count: int | None = None
    latest_assumed_count: int | None = None
    latest_script_id: str | None = None


class EventSummaryResponse(BaseModel):
    app_control: AppControlEventSummary = Field(default_factory=AppControlEventSummary)


class AppControlEventDetailItem(BaseModel):
    id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    detail: str = Field(..., min_length=1)
    delta: str | None = None
    verification: str | None = None


class AppControlEventDetail(BaseModel):
    script_id: str | None = None
    mode: str | None = None
    summary: str | None = None
    verified_count: int | None = None
    assumed_count: int | None = None
    items: list[AppControlEventDetailItem] = Field(default_factory=list)


class EventDetailResponse(BaseModel):
    event: EventRecord
    app_control: AppControlEventDetail | None = None


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


class ExecutorStatusProjection(BaseModel):
    executor_id: str = Field(..., min_length=1)
    executor_label: str = Field(..., min_length=1)
    executor_kind: str = Field(..., min_length=1)
    executor_host_label: str = Field(..., min_length=1)
    execution_mode_class: str = Field(..., min_length=1)
    supported_runner_families: list[str] = Field(default_factory=list)
    availability_state: str = Field(..., min_length=1)
    last_heartbeat_at: str | None = None
    active_workspace_count: int = 0
    active_run_count: int = 0
    last_failure_summary: str | None = None
    truth_note: str = Field(..., min_length=1)


class ExecutorStatusResponse(BaseModel):
    executors: list[ExecutorStatusProjection] = Field(default_factory=list)


class WorkspacesResponse(BaseModel):
    workspaces: list[WorkspaceRecord] = Field(default_factory=list)


class WorkspaceStatusProjection(BaseModel):
    workspace_id: str = Field(..., min_length=1)
    workspace_kind: str = Field(..., min_length=1)
    workspace_state: str = Field(..., min_length=1)
    engine_binding_label: str | None = None
    project_binding_label: str | None = None
    runner_family: str = Field(..., min_length=1)
    owner_run_id: str | None = None
    owner_execution_id: str | None = None
    owner_executor_id: str | None = None
    created_at: str = Field(..., min_length=1)
    updated_at: str = Field(..., min_length=1)
    cleanup_policy: str = Field(..., min_length=1)
    retention_label: str = Field(..., min_length=1)
    last_failure_summary: str | None = None
    truth_note: str = Field(..., min_length=1)


class WorkspaceStatusResponse(BaseModel):
    workspaces: list[WorkspaceStatusProjection] = Field(default_factory=list)


class ApprovalDecisionRequest(BaseModel):
    reason: str | None = None
