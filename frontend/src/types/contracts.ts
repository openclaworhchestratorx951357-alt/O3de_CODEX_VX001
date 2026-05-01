export type ApprovalClass =
  | "read_only"
  | "project_write"
  | "content_write"
  | "destructive_content_write"
  | "config_write"
  | "build_execute"
  | "engine_patch"
  | "test_execute";

export type LockName =
  | "editor_session"
  | "project_config"
  | "asset_pipeline"
  | "render_pipeline"
  | "build_tree"
  | "engine_source"
  | "test_runtime";

export interface RequestEnvelope {
  request_id: string;
  tool: string;
  agent: string;
  project_root: string;
  engine_root: string;
  session_id?: string | null;
  workspace_id?: string | null;
  executor_id?: string | null;
  dry_run: boolean;
  approval_token?: string | null;
  locks: LockName[];
  timeout_s: number;
  args: Record<string, unknown>;
}

export interface ResponseState {
  dirty: boolean;
  requires_save: boolean;
  requires_reconfigure: boolean;
  requires_rebuild: boolean;
  requires_asset_reprocess: boolean;
}

export interface ResponseError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown> | null;
}

export interface ResponseEnvelope {
  request_id: string;
  ok: boolean;
  operation_id?: string | null;
  approval_id?: string | null;
  result?: Record<string, unknown> | null;
  warnings?: string[];
  artifacts?: string[];
  state?: ResponseState;
  timing_ms?: number;
  logs?: string[];
  error?: ResponseError | null;
}

export interface PromptRequest {
  prompt_id: string;
  prompt_text: string;
  project_root: string;
  engine_root: string;
  workspace_id?: string | null;
  executor_id?: string | null;
  dry_run: boolean;
  preferred_domains: string[];
  operator_note?: string | null;
}

export interface PromptSafetyEnvelope {
  state_scope: string;
  backup_class: string;
  rollback_class: string;
  verification_class: string;
  retention_class: string;
  natural_language_status: string;
  natural_language_blocker?: string | null;
  mutation_surface_class?: string | null;
  restore_boundary_class?: string | null;
  candidate_expansion_boundary?: string | null;
}

export interface PromptPlanStep {
  step_id: string;
  tool: string;
  agent: string;
  args: Record<string, unknown>;
  approval_class: string;
  required_locks: string[];
  capability_status_required: string;
  workspace_id?: string | null;
  executor_id?: string | null;
  simulated_allowed: boolean;
  depends_on: string[];
  capability_maturity: string;
  safety_envelope?: PromptSafetyEnvelope | null;
  planner_note?: string | null;
}

export interface PromptPlan {
  prompt_id: string;
  plan_id: string;
  schema_version: string;
  admitted: boolean;
  refusal_reason?: string | null;
  summary: string;
  steps: PromptPlanStep[];
  refused_capabilities: string[];
  capability_requirements: string[];
}

export interface PromptCapabilityEntry {
  tool_name: string;
  agent_family: string;
  args_schema: string;
  result_schema: string;
  persisted_execution_details_schema?: string | null;
  persisted_artifact_metadata_schema?: string | null;
  approval_class: string;
  default_locks: string[];
  capability_maturity: string;
  capability_status: string;
  real_admission_stage: string;
  planner_intent_aliases: string[];
  natural_language_affordances: string[];
  allowlisted_parameter_surfaces: string[];
  safety_envelope?: PromptSafetyEnvelope | null;
  real_adapter_availability: boolean;
  dry_run_availability: boolean;
  simulation_fallback_availability: boolean;
}

export interface PromptCapabilitiesResponse {
  capabilities: PromptCapabilityEntry[];
}

export interface PromptShortcutRequest {
  mode: string;
  scenario_id: string;
  scenario_label: string;
  stage_label: string;
  focus_id: string;
  focus_label: string;
  viewport_label: string;
  active_tool_label: string;
  project_profile_name?: string | null;
  source_context_name?: string | null;
  source_context?: string | null;
}

export interface PromptShortcutOption {
  shortcut_id: string;
  title: string;
  prompt_text: string;
  evidence_gate: string;
  source: string;
}

export interface PromptShortcutResponse {
  mode: string;
  scenario_id: string;
  stage_label: string;
  focus_id: string;
  shortcuts: PromptShortcutOption[];
  generated_by: string;
}

export type AppControlOperationKind = "settings.patch" | "navigation.open_workspace";
export type AppControlPreviewStatus = "ready" | "no_supported_action";
export type AppControlRiskLevel = "low" | "medium";
export type AppControlReportMode = "applied" | "reverted";
export type AppControlVerification = "verified" | "assumed";

export interface AppControlActor {
  worker_id?: string | null;
  display_name?: string | null;
  agent_profile?: string | null;
}

export interface AppControlPreviewRequest {
  instruction: string;
  active_workspace_id?: string | null;
  current_settings: Record<string, unknown>;
  actor?: AppControlActor | null;
}

export interface AppControlOperation {
  operation_id: string;
  kind: AppControlOperationKind;
  target: string;
  value: unknown;
  description: string;
  reversible: boolean;
}

export interface AppControlBackupPlan {
  required: boolean;
  captures: string[];
  revert_action_label: string;
}

export interface AppControlScriptPreview {
  script_id: string;
  status: AppControlPreviewStatus;
  instruction: string;
  summary: string;
  risk_level: AppControlRiskLevel;
  approval_required: boolean;
  backup: AppControlBackupPlan;
  operations: AppControlOperation[];
  warnings: string[];
  generated_by: string;
  actor?: AppControlActor | null;
}

export interface AppControlExecutionReportRequest {
  script_id: string;
  mode: AppControlReportMode;
  operations: AppControlOperation[];
  settings_before: Record<string, unknown>;
  settings_after: Record<string, unknown>;
  workspace_before?: string | null;
  workspace_after?: string | null;
  backup_settings?: Record<string, unknown> | null;
  backup_workspace_id?: string | null;
}

export interface AppControlExecutionReportItem {
  id: string;
  label: string;
  detail: string;
  delta?: string | null;
  verification: AppControlVerification;
  verification_source?: Record<string, unknown> | null;
}

export interface AppControlExecutionReport {
  script_id: string;
  mode: AppControlReportMode;
  summary: string;
  items: AppControlExecutionReportItem[];
  event_id?: string | null;
  generated_by: string;
}

export type PromptSessionStatus =
  | "planned"
  | "refused"
  | "running"
  | "waiting_approval"
  | "blocked"
  | "completed"
  | "failed";

export interface PromptSessionRecord {
  prompt_id: string;
  plan_id: string;
  status: PromptSessionStatus;
  prompt_text: string;
  project_root: string;
  engine_root: string;
  dry_run: boolean;
  preferred_domains: string[];
  operator_note?: string | null;
  child_run_ids: string[];
  child_execution_ids: string[];
  child_artifact_ids: string[];
  child_event_ids: string[];
  workspace_id?: string | null;
  executor_id?: string | null;
  plan_summary?: string | null;
  evidence_summary?: string | null;
  admitted_capabilities: string[];
  refused_capabilities: string[];
  final_result_summary?: string | null;
  next_step_index: number;
  current_step_id?: string | null;
  pending_approval_id?: string | null;
  pending_approval_token?: string | null;
  last_error_code?: string | null;
  last_error_retryable: boolean;
  step_attempts: Record<string, number>;
  plan?: PromptPlan | null;
  latest_child_responses: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export interface PromptSessionsResponse {
  sessions: PromptSessionRecord[];
}

export interface O3DETargetConfig {
  project_root?: string | null;
  engine_root?: string | null;
  editor_runner?: string | null;
  runtime_runner?: string | null;
  source_label: string;
  project_root_exists: boolean;
  engine_root_exists: boolean;
  editor_runner_exists: boolean;
  runtime_runner_exists: boolean;
}

export interface O3DEBridgeQueueCounts {
  inbox: number;
  processing: number;
  results: number;
  deadletter: number;
}

export interface O3DEBridgeDeadletterSummary {
  bridge_command_id: string;
  operation?: string | null;
  error_code?: string | null;
  result_summary?: string | null;
  finished_at?: string | null;
  result_path?: string | null;
}

export interface O3DEBridgeCleanupStatus {
  attempted_at?: string | null;
  outcome: string;
  min_age_s: number;
  deleted_response_count: number;
  retained_response_count: number;
  deadletter_preserved_count: number;
}

export interface O3DEBridgeStatus {
  project_root?: string | null;
  project_root_exists: boolean;
  bridge_root?: string | null;
  inbox_path?: string | null;
  processing_path?: string | null;
  results_path?: string | null;
  deadletter_path?: string | null;
  heartbeat_path?: string | null;
  log_path?: string | null;
  source_label: string;
  configured: boolean;
  heartbeat_fresh: boolean;
  heartbeat_age_s?: number | null;
  runner_process_active: boolean;
  queue_counts: O3DEBridgeQueueCounts;
  heartbeat?: Record<string, unknown> | null;
  last_results_cleanup?: O3DEBridgeCleanupStatus | null;
  recent_deadletters: O3DEBridgeDeadletterSummary[];
}

export interface O3DEBridgeResultsCleanupResult {
  project_root?: string | null;
  results_path?: string | null;
  deadletter_path?: string | null;
  source_label: string;
  configured: boolean;
  min_age_s: number;
  queue_counts_before: O3DEBridgeQueueCounts;
  queue_counts_after: O3DEBridgeQueueCounts;
  deleted_response_count: number;
  deleted_response_paths: string[];
  retained_response_count: number;
  deadletter_preserved_count: number;
}

export interface CodexHarnessStatus {
  harness_id: string;
  label: string;
  configured: boolean;
  status: string;
  detail: string;
  notes: string[];
}

export interface CodexControlWorktree {
  path: string;
  branch_name?: string | null;
  head?: string | null;
  bare: boolean;
  detached: boolean;
  locked: boolean;
  prunable: boolean;
  is_current_repo: boolean;
}

export interface CodexControlWorker {
  worker_id: string;
  display_name: string;
  agent_profile?: string | null;
  agent_runtime?: string | null;
  agent_entrypoint?: string | null;
  agent_access_notes?: string | null;
  identity_notes?: string | null;
  personality_notes?: string | null;
  soul_directive?: string | null;
  memory_notes?: string | null;
  bootstrap_notes?: string | null;
  capability_tags?: string[];
  context_sources?: string[];
  avatar_label?: string | null;
  avatar_color?: string | null;
  avatar_uri?: string | null;
  branch_name?: string | null;
  worktree_path?: string | null;
  base_branch?: string | null;
  status: string;
  current_task_id?: string | null;
  summary?: string | null;
  resume_notes?: string | null;
  updated_at?: string | null;
  last_seen_at?: string | null;
}

export interface CodexControlTask {
  task_id: string;
  title: string;
  summary: string;
  priority: number;
  status: string;
  scope_paths: string[];
  recommended_branch_prefix?: string | null;
  claimed_by_worker_id?: string | null;
  blockers: string[];
  claimed_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  superseded_by_task_id?: string | null;
  superseded_at?: string | null;
  supersede_reason?: string | null;
}

export interface CodexControlWaiter {
  waiter_id: number;
  worker_id: string;
  task_id: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
  notified_at?: string | null;
}

export interface CodexControlNotification {
  notification_id: number;
  worker_id: string;
  task_id?: string | null;
  kind: string;
  status: string;
  message: string;
  created_at: string;
  read_at?: string | null;
}

export interface CodexControlTerminalSession {
  session_id: string;
  worker_id: string;
  task_id?: string | null;
  label: string;
  cwd: string;
  command: string[];
  status: string;
  pid?: number | null;
  log_path: string;
  created_at: string;
  started_at: string;
  updated_at: string;
  exited_at?: string | null;
  stop_requested_at?: string | null;
  stop_requested_by?: string | null;
  stop_reason?: string | null;
  tail_preview: string[];
}

export interface CodexControlBoardStatus {
  available: boolean;
  generated_at?: string | null;
  repo_root?: string | null;
  state_dir?: string | null;
  board_json_path?: string | null;
  board_text_path?: string | null;
  workers: CodexControlWorker[];
  tasks: CodexControlTask[];
  waiters: CodexControlWaiter[];
  notifications: CodexControlNotification[];
  terminal_sessions: CodexControlTerminalSession[];
}

export interface CodexControlStatusResponse {
  repo_root: string;
  git_common_dir: string;
  current_branch?: string | null;
  mission_control_script_path: string;
  mission_control_wrapper_path?: string | null;
  mission_control_available: boolean;
  recommended_base_branch: string;
  board: CodexControlBoardStatus;
  worktrees: CodexControlWorktree[];
  harnesses: CodexHarnessStatus[];
  notes: string[];
}

export interface CodexControlLaneCreateRequest {
  worker_id: string;
  display_name?: string | null;
  agent_profile?: string | null;
  agent_runtime?: string | null;
  agent_entrypoint?: string | null;
  agent_access_notes?: string | null;
  identity_notes?: string | null;
  personality_notes?: string | null;
  soul_directive?: string | null;
  memory_notes?: string | null;
  bootstrap_notes?: string | null;
  capability_tags?: string[] | null;
  context_sources?: string[] | null;
  avatar_label?: string | null;
  avatar_color?: string | null;
  avatar_uri?: string | null;
  branch_name?: string | null;
  worktree_path?: string | null;
  base_branch?: string | null;
  resume_notes?: string | null;
  bootstrap: boolean;
}

export interface CodexControlLaneCreateResponse {
  status: string;
  worker: CodexControlWorker;
  worktree_path: string;
  board_json_path?: string | null;
  board_text_path?: string | null;
}

export interface CodexControlWorkerSyncRequest {
  worker_id: string;
  display_name?: string | null;
  agent_profile?: string | null;
  agent_runtime?: string | null;
  agent_entrypoint?: string | null;
  agent_access_notes?: string | null;
  identity_notes?: string | null;
  personality_notes?: string | null;
  soul_directive?: string | null;
  memory_notes?: string | null;
  bootstrap_notes?: string | null;
  capability_tags?: string[] | null;
  context_sources?: string[] | null;
  avatar_label?: string | null;
  avatar_color?: string | null;
  avatar_uri?: string | null;
  branch_name?: string | null;
  worktree_path?: string | null;
  base_branch?: string | null;
  status: string;
  summary?: string | null;
  resume_notes?: string | null;
}

export interface CodexControlWorkerHeartbeatRequest {
  status?: string | null;
  summary?: string | null;
  current_task_id?: string | null;
  agent_profile?: string | null;
  agent_runtime?: string | null;
  agent_entrypoint?: string | null;
  agent_access_notes?: string | null;
  identity_notes?: string | null;
  personality_notes?: string | null;
  soul_directive?: string | null;
  memory_notes?: string | null;
  bootstrap_notes?: string | null;
  capability_tags?: string[] | null;
  context_sources?: string[] | null;
  avatar_label?: string | null;
  avatar_color?: string | null;
  avatar_uri?: string | null;
  branch_name?: string | null;
  worktree_path?: string | null;
  base_branch?: string | null;
  resume_notes?: string | null;
}

export interface CodexControlWorkerResponse {
  status: string;
  worker: CodexControlWorker;
  board_json_path?: string | null;
  board_text_path?: string | null;
}

export interface CodexControlTaskCreateRequest {
  title: string;
  summary: string;
  priority: number;
  branch_prefix?: string | null;
  scope_paths: string[];
}

export interface CodexControlTaskActionRequest {
  worker_id: string;
}

export interface CodexControlTaskSupersedeRequest {
  worker_id: string;
  replacement_title: string;
  replacement_summary: string;
  replacement_priority: number;
  replacement_scope_paths: string[];
  replacement_branch_prefix?: string | null;
  replacement_task_id?: string | null;
  supersede_reason: string;
  requested_by?: string | null;
  stop_active_terminal: boolean;
}

export interface CodexControlNotificationCreateRequest {
  kind: string;
  message: string;
  task_id?: string | null;
}

export interface CodexControlTerminalLaunchRequest {
  worker_id: string;
  label: string;
  command: string[];
  cwd?: string | null;
  task_id?: string | null;
}

export interface CodexControlTerminalStopRequest {
  requested_by?: string | null;
  reason?: string | null;
  force: boolean;
}

export interface CodexControlTaskWaitRequest {
  worker_id: string;
  reason: string;
}

export interface CodexControlNextTaskRequest {
  worker_id: string;
  claim: boolean;
  wait: boolean;
  wait_reason?: string | null;
}

export interface CodexControlTaskResponse {
  status: string;
  task: CodexControlTask;
  board_json_path?: string | null;
  board_text_path?: string | null;
}

export interface CodexControlTaskSupersedeResponse {
  status: string;
  superseded_task: CodexControlTask;
  replacement_task: CodexControlTask;
  stopped_terminal_session?: CodexControlTerminalSession | null;
  notified_workers: string[];
  board_json_path?: string | null;
  board_text_path?: string | null;
}

export interface CodexControlWaiterResponse {
  status: string;
  waiter: CodexControlWaiter;
  board_json_path?: string | null;
  board_text_path?: string | null;
}

export interface CodexControlNextTaskResponse {
  status: string;
  decision: string;
  task?: CodexControlTask | null;
  blockers: CodexControlTask[];
  waiter?: CodexControlWaiter | null;
  board_json_path?: string | null;
  board_text_path?: string | null;
}

export interface CodexControlNotificationsResponse {
  status: string;
  notifications: CodexControlNotification[];
  board_json_path?: string | null;
  board_text_path?: string | null;
}

export interface CodexControlTerminalSessionResponse {
  status: string;
  terminal_session: CodexControlTerminalSession;
  board_json_path?: string | null;
  board_text_path?: string | null;
}

export interface AutonomySummaryResponse {
  objectives_total: number;
  objectives_by_status: Record<string, number>;
  jobs_total: number;
  jobs_by_status: Record<string, number>;
  observations_total: number;
  observations_by_severity: Record<string, number>;
  healing_actions_total: number;
  healing_actions_by_status: Record<string, number>;
  memories_total: number;
}

export interface AutonomyObjectiveRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  target_scopes: string[];
  success_criteria: string[];
  owner_kind: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_reviewed_at?: string | null;
}

export interface AutonomyObjectivesResponse {
  objectives: AutonomyObjectiveRecord[];
}

export interface AutonomyObjectiveCreateRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  target_scopes: string[];
  success_criteria: string[];
  owner_kind: string;
  metadata: Record<string, unknown>;
}

export interface AutonomyJobRecord {
  id: string;
  objective_id?: string | null;
  job_kind: string;
  title: string;
  summary: string;
  status: string;
  assigned_lane?: string | null;
  resource_keys: string[];
  depends_on: string[];
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface AutonomyJobsResponse {
  jobs: AutonomyJobRecord[];
}

export interface AutonomyJobCreateRequest {
  id: string;
  objective_id?: string | null;
  job_kind: string;
  title: string;
  summary: string;
  status: string;
  assigned_lane?: string | null;
  resource_keys: string[];
  depends_on: string[];
  input_payload: Record<string, unknown>;
  output_payload: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  last_error?: string | null;
}

export interface AutonomyJobUpdateRequest {
  status?: string | null;
  assigned_lane?: string | null;
  output_payload?: Record<string, unknown> | null;
  retry_count?: number | null;
  last_error?: string | null;
}

export interface AutonomyObservationCreateRequest {
  id: string;
  source_kind: string;
  source_ref?: string | null;
  category: string;
  severity: string;
  message: string;
  details: Record<string, unknown>;
}

export interface AutonomyObservationUpdateRequest {
  message?: string | null;
  details?: Record<string, unknown> | null;
}

export interface AutonomyObservationRecord {
  id: string;
  source_kind: string;
  source_ref?: string | null;
  category: string;
  severity: string;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface AutonomyObservationsResponse {
  observations: AutonomyObservationRecord[];
}

export interface AutonomyHealingActionCreateRequest {
  id: string;
  observation_id?: string | null;
  job_id?: string | null;
  action_kind: string;
  summary: string;
  status: string;
  details: Record<string, unknown>;
}

export interface AutonomyHealingActionUpdateRequest {
  status?: string | null;
  details?: Record<string, unknown> | null;
}

export interface AutonomyHealingActionRecord {
  id: string;
  observation_id?: string | null;
  job_id?: string | null;
  action_kind: string;
  summary: string;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface AutonomyHealingActionsResponse {
  healing_actions: AutonomyHealingActionRecord[];
}

export interface AutonomyMemoryRecord {
  id: string;
  memory_kind: string;
  title: string;
  content: string;
  tags: string[];
  confidence?: number | null;
  source_refs: string[];
  created_at: string;
  updated_at: string;
}

export interface AutonomyMemoriesResponse {
  memories: AutonomyMemoryRecord[];
}

export interface ProjectInspectResult {
  status: "simulated_success" | "real_success";
  tool: "project.inspect";
  agent: "project-build";
  project_root: string;
  engine_root: string;
  dry_run: boolean;
  simulated: boolean;
  execution_mode: "simulated" | "real";
  approval_class: "read_only";
  locks_acquired: string[];
  message: string;
}

export interface ProjectInspectEvidenceDetails {
  inspection_surface?: string;
  inspection_evidence?: string[];
  project_manifest_path?: string;
  manifest_keys?: string[];
  project_name?: string;
  include_flags?: Record<string, boolean>;
  project_config?: Record<string, unknown>;
  project_config_keys?: string[];
  available_project_config_keys?: string[];
  available_project_config_count?: number;
  requested_project_config_evidence?: string[];
  project_config_selection_mode?: string;
  requested_project_config_keys?: string[];
  matched_requested_project_config_keys?: string[];
  missing_requested_project_config_keys?: string[];
  available_project_origin?: unknown;
  available_project_origin_type?: string;
  available_project_origin_keys?: string[];
  project_origin_present?: boolean;
  available_project_id?: string | null;
  project_id_present?: boolean;
  available_user_tags?: string[];
  available_user_tag_count?: number;
  identity_fields_present?: boolean;
  available_display_name?: string | null;
  available_icon_path?: string | null;
  available_restricted_platform_name?: string | null;
  presentation_fields_present?: boolean;
  available_compatible_engines?: string[];
  available_compatible_engine_count?: number;
  available_engine_api_dependency_keys?: string[];
  available_engine_api_dependency_count?: number;
  engine_compatibility_fields_present?: boolean;
  requested_project_config_subset_present?: boolean;
  requested_settings_evidence?: string[];
  settings_evidence_source?: string;
  settings_selection_mode?: string;
  requested_settings_keys?: string[];
  matched_requested_settings_keys?: string[];
  missing_requested_settings_keys?: string[];
  matched_requested_settings_count?: number;
  missing_requested_settings_count?: number;
  requested_gem_evidence?: string[];
  gem_evidence_source?: string;
  gem_selection_mode?: string;
  requested_gem_names?: string[];
  matched_requested_gem_names?: string[];
  missing_requested_gem_names?: string[];
  matched_requested_gem_count?: number;
  missing_requested_gem_count?: number;
  available_gem_names?: string[];
  available_gem_count?: number;
  gem_names?: string[];
  gem_names_count?: number;
  gem_entries_present?: boolean;
  requested_gem_subset_present?: boolean;
  manifest_settings?: Record<string, unknown>;
  manifest_settings_keys?: string[];
  requested_settings_subset_present?: boolean;
  real_path_available?: boolean;
  fallback_reason?: string;
}

export interface SettingsPatchMutationAudit {
  phase?: string;
  status?: string;
  backup_created?: boolean;
  backup_target?: string;
  backup_source_path?: string;
  patch_plan_valid?: boolean;
  mutation_applied?: boolean;
  post_write_verification_attempted?: boolean;
  post_write_verification_succeeded?: boolean;
  rollback_attempted?: boolean;
  rollback_succeeded?: boolean;
  rollback_trigger?: string | null;
  rollback_outcome?: string | null;
  summary?: string;
  verified_operation_paths?: string[];
  verification_mismatched_paths?: string[];
}

export interface ApprovalRecord {
  id: string;
  run_id: string;
  request_id: string;
  agent: string;
  tool: string;
  approval_class: ApprovalClass;
  status: "pending" | "approved" | "rejected";
  reason?: string | null;
  token: string;
  created_at: string;
  decided_at?: string | null;
}

export interface ApprovalsResponse {
  approvals: ApprovalRecord[];
}

export interface ApprovalListItem {
  id: string;
  run_id: string;
  request_id: string;
  agent: string;
  tool: string;
  approval_class: ApprovalClass | string;
  status: "pending" | "approved" | "rejected" | string;
  reason?: string | null;
  created_at: string;
  decided_at?: string | null;
  can_decide: boolean;
}

export interface ApprovalsListResponse {
  approvals: ApprovalListItem[];
}

export interface EventRecord {
  id: string;
  run_id?: string | null;
  execution_id?: string | null;
  executor_id?: string | null;
  workspace_id?: string | null;
  category: string;
  event_type?: string | null;
  severity: "info" | "warning" | "error";
  message: string;
  created_at: string;
  previous_state?: string | null;
  current_state?: string | null;
  failure_category?: string | null;
  details: Record<string, unknown>;
}

export interface EventsResponse {
  events: EventRecord[];
}

export interface EventListItem {
  id: string;
  run_id?: string | null;
  execution_id?: string | null;
  executor_id?: string | null;
  workspace_id?: string | null;
  category: string;
  event_type?: string | null;
  severity: string;
  message: string;
  created_at: string;
  previous_state?: string | null;
  current_state?: string | null;
  failure_category?: string | null;
  capability_status?: string | null;
  adapter_mode?: string | null;
  verification_state?: string | null;
  verified_count?: number | null;
  assumed_count?: number | null;
  event_state: string;
}

export interface EventListResponse {
  events: EventListItem[];
}

export interface AppControlEventSummary {
  total_events: number;
  applied_events: number;
  reverted_events: number;
  verified_only_events: number;
  assumed_present_events: number;
  verification_not_recorded_events: number;
  latest_event_id?: string | null;
  latest_event_type?: string | null;
  latest_created_at?: string | null;
  latest_summary?: string | null;
  latest_verified_count?: number | null;
  latest_assumed_count?: number | null;
  latest_script_id?: string | null;
}

export interface EventSummaryResponse {
  app_control: AppControlEventSummary;
}

export interface AppControlEventDetailItem {
  id: string;
  label: string;
  detail: string;
  delta?: string | null;
  verification?: string | null;
}

export interface AppControlEventDetail {
  script_id?: string | null;
  mode?: string | null;
  summary?: string | null;
  verified_count?: number | null;
  assumed_count?: number | null;
  items: AppControlEventDetailItem[];
}

export interface EventDetailResponse {
  event: EventRecord;
  app_control?: AppControlEventDetail | null;
}

export interface RunRecord {
  id: string;
  request_id: string;
  agent: string;
  tool: string;
  status: "pending" | "waiting_approval" | "blocked" | "running" | "succeeded" | "rejected" | "failed";
  created_at: string;
  updated_at: string;
  dry_run: boolean;
  approval_id?: string | null;
  approval_token?: string | null;
  requested_locks: string[];
  granted_locks: string[];
  warnings: string[];
  execution_mode: string;
  result_summary?: string | null;
}

export interface RunsResponse {
  runs: RunRecord[];
}

export interface RunListItem {
  id: string;
  request_id: string;
  agent: string;
  tool: string;
  status: string;
  dry_run: boolean;
  execution_mode: string;
  result_summary?: string | null;
  audit_status?: string | null;
  audit_summary?: string | null;
  inspection_surface?: string | null;
  fallback_category?: string | null;
  project_manifest_source_of_truth?: string | null;
  executor_id?: string | null;
  workspace_id?: string | null;
  workspace_state?: string | null;
  runner_family?: string | null;
  execution_attempt_state?: string | null;
}

export interface RunListResponse {
  runs: RunListItem[];
}

export interface SettingsPatchAuditSummary {
  total_runs: number;
  preflight: number;
  blocked: number;
  succeeded: number;
  rolled_back: number;
  other: number;
  available_filters: string[];
}

export interface RunAuditRecord {
  run_id: string;
  tool: string;
  audit_status: string;
  audit_phase?: string | null;
  audit_summary?: string | null;
  execution_mode: string;
}

export interface RunsSummaryResponse {
  settings_patch_audit_summary: SettingsPatchAuditSummary;
  run_audits: RunAuditRecord[];
}

export interface LockRecord {
  name: string;
  owner_run_id: string;
  created_at: string;
}

export interface LocksResponse {
  locks: LockRecord[];
}

export interface LockListItem {
  name: string;
  owner_run_id: string;
  created_at: string;
}

export interface LocksListResponse {
  locks: LockListItem[];
}

export interface ToolPolicy {
  agent: string;
  tool: string;
  approval_class: string;
  adapter_family: string;
  capability_status: string;
  real_admission_stage: string;
  next_real_requirement: string;
  args_schema: string;
  result_schema: string;
  required_locks: string[];
  risk: string;
  requires_approval: boolean;
  supports_dry_run: boolean;
  execution_mode: string;
}

export interface PoliciesResponse {
  policies: ToolPolicy[];
}

export interface AssetForgeTaskCandidate {
  candidate_id: string;
  display_name: string;
  status: "demo" | "selected" | "rejected" | "failed" | "staged" | "planned";
  preview_notes: string;
  readiness_placeholder: string;
  estimated_triangles: string;
}

export interface AssetForgeTaskRecord {
  task_id: string;
  task_label: string;
  status: "plan-only" | "demo";
  prompt_text: string;
  created_at: string;
  source: string;
  warnings: string[];
  candidates: AssetForgeTaskCandidate[];
}

export interface AssetForgeTaskPlanRequest {
  prompt_text: string;
  style_tags: string[];
  target_triangle_budget: string;
  output_format: "glb" | "fbx" | "obj";
  source: string;
}

export interface AssetForgeProviderRegistryEntry {
  provider_id: string;
  display_name: string;
  mode: "disabled" | "mock" | "configured" | "real";
  configured: boolean;
  note: string;
}

export interface AssetForgeProviderStatusRecord {
  capability_name: string;
  maturity: "preflight-only";
  provider_mode: "disabled" | "mock" | "configured" | "real";
  configuration_ready: boolean;
  credential_status: string;
  external_task_creation_allowed: boolean;
  generation_execution_status: "blocked";
  providers: AssetForgeProviderRegistryEntry[];
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeBlenderStatusRecord {
  capability_name: string;
  maturity: "preflight-only";
  executable_found: boolean;
  executable_path: string | null;
  detection_source: string;
  version: string | null;
  version_probe_status: "detected" | "missing" | "failed";
  blender_prep_execution_status: "blocked";
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeEditorToolRecord {
  tool_id: string;
  label: string;
  shortcut: string | null;
  group: "transform" | "object" | "mesh" | "animation" | "grease_pencil" | "history" | "proof" | "review";
  truth_state: AssetForgeEditorTruthState;
  enabled: boolean;
  selected: boolean;
  description: string;
  blocked_reason: string | null;
  next_unlock: string | null;
  prompt_template_id: string | null;
  execution_admitted: boolean;
  mutation_admitted: boolean;
}

export interface AssetForgeOutlinerNodeRecord {
  node_id: string;
  label: string;
  kind: string;
  depth: number;
  truth_state: AssetForgeEditorTruthState;
  visible: boolean;
  selected: boolean;
}

export interface AssetForgeViewportRecord {
  label: string;
  mode: string;
  shading_modes: string[];
  active_shading_mode: string;
  grid_visible: boolean;
  preview_status: string;
  selected_object_label: string;
  overlays: string[];
}

export type AssetForgeEditorTruthState =
  | "demo"
  | "read-only"
  | "plan-only"
  | "preflight-only"
  | "proof-only"
  | "blocked";

export interface AssetForgeEditorPropertyRowRecord {
  row_id: string;
  label: string;
  name?: string;
  value: string;
  status?: string;
  truth_state: AssetForgeEditorTruthState;
  tone?: string;
  mutation_admitted: boolean;
}

export interface AssetForgePropertiesRecord {
  selected_object: string;
  material_preview_status: string;
  sections: string[];
  rows: AssetForgeEditorPropertyRowRecord[];
}

export interface AssetForgeAxisTripletRecord {
  x: number;
  y: number;
  z: number;
  admitted: boolean;
}

export interface AssetForgeTransformRecord {
  location: AssetForgeAxisTripletRecord;
  rotation: AssetForgeAxisTripletRecord;
  scale: AssetForgeAxisTripletRecord;
  dimensions: AssetForgeAxisTripletRecord;
  edit_status: "blocked" | "preflight-only" | "proof-only";
  blocked_reason: string;
}

export interface AssetForgeMaterialPreviewRecord {
  preview_shape: string;
  preview_surface: string;
  checker_visible: boolean;
  tabs: string[];
  active_tab: string;
  metadata_status: string;
  mutation_admitted: boolean;
  rows: AssetForgeEditorPropertyRowRecord[];
}

export interface AssetForgeTimelineRecord {
  start_frame: number;
  end_frame: number;
  current_frame: number;
  status: string;
}

export interface AssetForgeWorkflowStageRecord {
  stage_id: string;
  label: string;
  truth_state: AssetForgeEditorTruthState;
  action: string;
  status: string;
  prompt_template_id?: string | null;
  execution_admitted: boolean;
  mutation_admitted: boolean;
  auto_execute: boolean;
}

export interface AssetForgeStatusStripTabRecord {
  tab_id: string;
  label: string;
  truth_state: AssetForgeEditorTruthState;
  action: string;
  status: string;
  execution_admitted: boolean;
  mutation_admitted: boolean;
  auto_execute: boolean;
}

export interface AssetForgeEvidenceSummaryRecord {
  latest_run_id: string | null;
  latest_execution_id: string | null;
  latest_artifact_id: string | null;
  stage_write_evidence_reference: string | null;
  stage_write_readback_reference: string | null;
  stage_write_readback_status: string | null;
}

export interface AssetForgePromptTemplateRecord {
  template_id: string;
  label: string;
  description: string;
  text: string;
  truth_state: AssetForgeEditorTruthState;
  safety_labels: string[];
  auto_execute: boolean;
}

export interface AssetForgeBlockedCapabilityRecord {
  capability_id: string;
  label: string;
  reason: string;
  next_unlock: string;
}

export interface AssetForgeContextMenuItemRecord {
  item_id: string;
  label: string;
  truth_state: AssetForgeEditorTruthState;
  action: string;
  status: string;
  blocked_reason?: string | null;
  next_unlock?: string | null;
  execution_admitted: boolean;
  mutation_admitted: boolean;
  auto_execute: boolean;
}

export interface AssetForgeContextMenuGroupRecord {
  group_id: string;
  label: string;
  items: AssetForgeContextMenuItemRecord[];
}

export interface AssetForgeEditorModelRecord {
  source: string;
  inspection_surface: string;
  editor_model_status: string;
  execution_admitted: boolean;
  mutation_admitted: boolean;
  provider_generation_admitted: boolean;
  blender_execution_admitted: boolean;
  asset_processor_execution_admitted: boolean;
  placement_write_admitted: boolean;
  active_tool_id: string;
  viewport: AssetForgeViewportRecord;
  tools: AssetForgeEditorToolRecord[];
  context_menu_groups: AssetForgeContextMenuGroupRecord[];
  workflow_stages: AssetForgeWorkflowStageRecord[];
  outliner: AssetForgeOutlinerNodeRecord[];
  transform: AssetForgeTransformRecord;
  properties: AssetForgePropertiesRecord;
  material_preview: AssetForgeMaterialPreviewRecord;
  timeline: AssetForgeTimelineRecord;
  status_strip_tabs: AssetForgeStatusStripTabRecord[];
  evidence: AssetForgeEvidenceSummaryRecord;
  prompt_templates: AssetForgePromptTemplateRecord[];
  blocked_capabilities: AssetForgeBlockedCapabilityRecord[];
  next_safe_action: string;
}

export type CockpitWorkspaceId =
  | "create-game"
  | "create-movie"
  | "load-project"
  | "asset-forge";

export type CockpitShellMode =
  | "dockable-cockpit"
  | "full-screen-editor";

export type CockpitTone = "neutral" | "info" | "success" | "warning";

export interface CockpitAppRegistrationRecord {
  workspace_id: CockpitWorkspaceId;
  nav_label: string;
  nav_subtitle: string;
  workspace_title: string;
  workspace_subtitle: string;
  launch_title: string;
  detail: string;
  truth_state: string;
  blocked: string;
  next_safe_action: string;
  action_label: string;
  shell_mode: CockpitShellMode;
  tone: CockpitTone;
  help_tooltip: string;
  execution_admitted: boolean;
  mutation_admitted: boolean;
  provider_generation_admitted: boolean;
  blender_execution_admitted: boolean;
  asset_processor_execution_admitted: boolean;
  placement_write_admitted: boolean;
}

export interface CockpitAppBlockedCapabilityRecord {
  capability_id: string;
  label: string;
  reason: string;
  next_unlock: string;
}

export interface CockpitAppRegistryRecord {
  source: string;
  inspection_surface: string;
  registry_status: string;
  execution_admitted: boolean;
  mutation_admitted: boolean;
  provider_generation_admitted: boolean;
  blender_execution_admitted: boolean;
  asset_processor_execution_admitted: boolean;
  placement_write_admitted: boolean;
  registrations: CockpitAppRegistrationRecord[];
  blocked_capabilities: CockpitAppBlockedCapabilityRecord[];
  next_safe_action: string;
}

export interface AssetForgeStudioLaneStatusRecord {
  lane: "Provider" | "Blender" | "O3DE ingest" | "Placement" | "Review";
  truth: "demo" | "plan-only" | "preflight-only" | "gated-real" | "blocked";
  detail: string;
  source: string;
}

export interface AssetForgeStudioStatusRecord {
  capability_name: string;
  maturity: "preflight-only";
  lanes: AssetForgeStudioLaneStatusRecord[];
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeBlenderInspectRequest {
  artifact_path: string;
}

export interface AssetForgeBlenderInspectReport {
  capability_name: string;
  maturity: "preflight-only";
  inspection_status: "succeeded" | "blocked" | "failed";
  artifact_path: string;
  runtime_root: string;
  artifact_within_runtime_root: boolean;
  extension_allowed: boolean;
  script_id: "asset_forge_blender_readonly_inspector_v1";
  script_path: string;
  script_execution_status: "executed" | "blocked" | "failed";
  blender_execution_status: "blocked";
  metadata: Record<string, unknown>;
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeO3DEStagePlanRequest {
  candidate_id: string;
  candidate_label: string;
  desired_extension: string;
}

export interface AssetForgeO3DEStagePlanRecord {
  capability_name: string;
  maturity: "plan-only";
  plan_status: "ready-for-approval" | "blocked";
  candidate_id: string;
  candidate_label: string;
  project_root_hint: string | null;
  deterministic_staging_relative_path: string;
  deterministic_manifest_relative_path: string;
  expected_source_asset_path: string;
  stage_plan_policy: Record<string, unknown>;
  approval_required: boolean;
  project_write_admitted: boolean;
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeO3DEStageWriteRequest {
  candidate_id: string;
  candidate_label: string;
  source_artifact_path: string;
  stage_relative_path: string;
  manifest_relative_path: string;
  approval_state: "not-approved" | "approved";
  approval_note: string;
}

export interface AssetForgeO3DEStageWriteRecord {
  capability_name: string;
  maturity: "approval-gated-write";
  write_status: "approval-required" | "succeeded" | "blocked" | "failed";
  candidate_id: string;
  candidate_label: string;
  project_root: string | null;
  source_artifact_path: string;
  destination_source_asset_path: string | null;
  destination_manifest_path: string | null;
  approval_required: boolean;
  approval_state: "not-approved" | "approved";
  write_executed: boolean;
  project_write_admitted: boolean;
  bytes_copied: number | null;
  source_sha256: string | null;
  destination_sha256: string | null;
  manifest_sha256: string | null;
  post_write_readback: Record<string, unknown>;
  revert_paths: string[];
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeO3DEReadbackRequest {
  candidate_id: string;
  candidate_label: string;
  source_asset_relative_path: string;
  selected_platform: string;
}

export interface AssetForgeO3DEReadbackRecord {
  capability_name: string;
  maturity: "preflight-only";
  readback_status: "succeeded" | "blocked" | "failed";
  candidate_id: string;
  candidate_label: string;
  project_root: string | null;
  source_asset_relative_path: string;
  source_asset_absolute_path: string | null;
  selected_platform: string;
  source_exists: boolean;
  source_size_bytes: number | null;
  source_sha256: string | null;
  asset_database_path: string | null;
  asset_database_exists: boolean;
  asset_database_freshness_status: "fresh" | "stale_or_unverified" | "missing" | "unknown";
  asset_database_last_write_time: string | null;
  source_found_in_assetdb: boolean;
  source_id: number | null;
  source_guid: string | null;
  asset_processor_job_rows: string[];
  asset_processor_warning_count: number;
  asset_processor_error_count: number;
  product_count: number;
  dependency_count: number;
  representative_products: string[];
  representative_dependencies: string[];
  catalog_path: string | null;
  catalog_exists: boolean;
  catalog_freshness_status: "fresh" | "stale_or_unverified" | "missing" | "unknown";
  catalog_last_write_time: string | null;
  catalog_presence: boolean;
  catalog_product_path_presence: string[];
  read_only: boolean;
  mutation_occurred: boolean;
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeO3DEPlacementPlanRequest {
  candidate_id: string;
  candidate_label: string;
  staged_source_relative_path: string;
  target_level_relative_path: string;
  target_entity_name: string;
  target_component: string;
}

export interface AssetForgeO3DEPlacementPlanRecord {
  capability_name: string;
  maturity: "plan-only";
  plan_status: "ready-for-approval" | "blocked";
  candidate_id: string;
  candidate_label: string;
  staged_source_relative_path: string;
  target_level_relative_path: string;
  target_entity_name: string;
  target_component: string;
  placement_execution_status: "blocked";
  approval_required: boolean;
  placement_write_admitted: boolean;
  placement_plan_policy: Record<string, unknown>;
  placement_plan_summary: string;
  requirement_checklist: string[];
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeO3DEPlacementProofRequest {
  candidate_id: string;
  candidate_label: string;
  staged_source_relative_path: string;
  target_level_relative_path: string;
  target_entity_name: string;
  target_component: string;
  approval_state: "not-approved" | "approved";
  approval_note: string;
}

export interface AssetForgeO3DEPlacementProofRecord {
  capability_name: string;
  maturity: "proof-only";
  proof_status: "approval-required" | "blocked" | "ready-for-runtime-proof";
  candidate_id: string;
  candidate_label: string;
  staged_source_relative_path: string;
  target_level_relative_path: string;
  target_entity_name: string;
  target_component: string;
  approval_required: boolean;
  approval_state: "not-approved" | "approved";
  placement_proof_policy: Record<string, unknown>;
  placement_execution_status: "blocked";
  proof_runtime_gate_enabled: boolean;
  write_occurred: boolean;
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeO3DEPlacementEvidenceRequest {
  candidate_id: string;
  candidate_label: string;
  staged_source_relative_path: string;
  target_level_relative_path: string;
  selected_platform?: string;
}

export interface AssetForgeO3DEPlacementEvidenceRecord {
  capability_name: string;
  maturity: "preflight-only";
  evidence_status: "succeeded" | "blocked";
  candidate_id: string;
  candidate_label: string;
  project_root: string | null;
  staged_source_relative_path: string;
  staged_source_absolute_path: string | null;
  target_level_relative_path: string;
  target_level_absolute_path: string | null;
  selected_platform: string;
  staged_source_exists: boolean;
  target_level_exists: boolean;
  asset_database_path: string | null;
  asset_database_exists: boolean;
  source_found_in_assetdb: boolean;
  source_id: number | null;
  source_guid: string | null;
  product_count: number;
  dependency_count: number;
  read_only: boolean;
  mutation_occurred: boolean;
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeO3DEPlacementHarnessRequest {
  candidate_id: string;
  candidate_label: string;
  staged_source_relative_path: string;
  target_level_relative_path: string;
  target_entity_name: string;
  target_component: string;
  selected_platform?: string;
}

export interface AssetForgeO3DEPlacementHarnessRecord {
  capability_name: string;
  maturity: "plan-only";
  harness_status: "blocked" | "ready-for-admitted-runtime-harness";
  candidate_id: string;
  candidate_label: string;
  staged_source_relative_path: string;
  target_level_relative_path: string;
  target_entity_name: string;
  target_component: string;
  selected_platform: string;
  bridge_configured: boolean;
  bridge_heartbeat_fresh: boolean;
  runtime_gate_enabled: boolean;
  execution_performed: boolean;
  read_only: boolean;
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeO3DEPlacementHarnessExecuteRequest {
  candidate_id: string;
  candidate_label: string;
  staged_source_relative_path: string;
  target_level_relative_path: string;
  target_entity_name: string;
  target_component: string;
  selected_platform?: string;
  approval_state: "not-approved" | "approved";
  approval_note: string;
}

export interface AssetForgeO3DEPlacementHarnessExecuteRecord {
  capability_name: string;
  maturity: "proof-only";
  execute_status: "approval-required" | "blocked" | "submitted-proof-only";
  candidate_id: string;
  candidate_label: string;
  staged_source_relative_path: string;
  target_level_relative_path: string;
  target_entity_name: string;
  target_component: string;
  selected_platform: string;
  bridge_configured: boolean;
  bridge_heartbeat_fresh: boolean;
  runtime_gate_enabled: boolean;
  approval_state: "not-approved" | "approved";
  bridge_command_id: string | null;
  execution_performed: boolean;
  readback_captured: boolean;
  read_only: boolean;
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgeO3DEPlacementLiveProofRequest {
  candidate_id: string;
  candidate_label: string;
  target_level_relative_path: string;
  target_entity_name: string;
  selected_platform?: string;
  approval_state: "not-approved" | "approved";
  approval_note: string;
}

export interface AssetForgeO3DEPlacementLiveProofRecord {
  capability_name: string;
  maturity: "proof-only";
  proof_status: "approval-required" | "blocked" | "succeeded";
  candidate_id: string;
  candidate_label: string;
  target_level_relative_path: string;
  target_entity_name: string;
  selected_platform: string;
  bridge_configured: boolean;
  bridge_heartbeat_fresh: boolean;
  runtime_gate_enabled: boolean;
  execution_performed: boolean;
  readback_captured: boolean;
  entity_exists: boolean | null;
  bridge_command_id: string | null;
  evidence_bundle_path: string | null;
  revert_statement: string;
  read_only: boolean;
  warnings: string[];
  safest_next_step: string;
  source: string;
}

export interface AssetForgePlacementEvidenceBundleItem {
  path: string;
  recorded_at: string | null;
  candidate_id: string | null;
  bridge_command_id: string | null;
  proof_status: string | null;
  age_seconds: number | null;
}

export interface AssetForgePlacementEvidenceAppliedFilters {
  limit?: number;
  proof_status?: string;
  candidate_id?: string;
  from_age_s?: number;
}

export interface AssetForgePlacementEvidenceIndexRecord {
  capability_name: string;
  maturity: "preflight-only";
  index_status: "succeeded" | "empty";
  runtime_root: string;
  evidence_dir: string;
  applied_filters: AssetForgePlacementEvidenceAppliedFilters;
  freshness_window_seconds: number;
  fresh_item_count: number;
  items: AssetForgePlacementEvidenceBundleItem[];
  read_only: boolean;
  warnings: string[];
  source: string;
}

export interface ExecutionRecord {
  id: string;
  run_id: string;
  request_id: string;
  agent: string;
  tool: string;
  execution_mode: string;
  status: "pending" | "waiting_approval" | "blocked" | "running" | "succeeded" | "rejected" | "failed";
  started_at: string;
  finished_at?: string | null;
  warnings: string[];
  logs: string[];
  artifact_ids: string[];
  details: Record<string, unknown> | ProjectInspectEvidenceDetails;
  result_summary?: string | null;
}

export interface ExecutionsResponse {
  executions: ExecutionRecord[];
}

export interface ExecutionListItem {
  id: string;
  run_id: string;
  request_id: string;
  agent: string;
  tool: string;
  execution_mode: string;
  status: string;
  started_at: string;
  finished_at?: string | null;
  result_summary?: string | null;
  warning_count: number;
  artifact_count: number;
  inspection_surface?: string | null;
  fallback_category?: string | null;
  project_manifest_source_of_truth?: string | null;
  mutation_audit_status?: string | null;
  mutation_audit_summary?: string | null;
  executor_id?: string | null;
  workspace_id?: string | null;
  runner_family?: string | null;
  execution_attempt_state?: string | null;
  failure_category?: string | null;
}

export interface ExecutionListResponse {
  executions: ExecutionListItem[];
}

export interface ArtifactRecord {
  id: string;
  run_id: string;
  execution_id: string;
  label: string;
  kind: string;
  uri: string;
  path?: string | null;
  content_type?: string | null;
  simulated: boolean;
  created_at: string;
  metadata: Record<string, unknown> | ProjectInspectEvidenceDetails;
}

export interface ArtifactsResponse {
  artifacts: ArtifactRecord[];
}

export interface ArtifactListItem {
  id: string;
  run_id: string;
  execution_id: string;
  label: string;
  kind: string;
  uri: string;
  path?: string | null;
  content_type?: string | null;
  simulated: boolean;
  created_at: string;
  inspection_surface?: string | null;
  fallback_category?: string | null;
  project_manifest_source_of_truth?: string | null;
  execution_mode?: string | null;
  project_name?: string | null;
  mutation_audit_status?: string | null;
  mutation_audit_summary?: string | null;
  artifact_role?: string | null;
  executor_id?: string | null;
  workspace_id?: string | null;
  retention_class?: string | null;
  evidence_completeness?: string | null;
}

export interface ArtifactListResponse {
  artifacts: ArtifactListItem[];
}

export interface ExecutorRecord {
  id: string;
  executor_kind: string;
  executor_label: string;
  executor_host_label: string;
  execution_mode_class: string;
  availability_state: string;
  supported_runner_families: string[];
  capability_snapshot: Record<string, unknown>;
  last_heartbeat_at?: string | null;
  last_failure_summary?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutorsResponse {
  executors: ExecutorRecord[];
}

export interface WorkspaceRecord {
  id: string;
  workspace_kind: string;
  workspace_root: string;
  workspace_state: string;
  cleanup_policy: string;
  retention_class: string;
  engine_binding: Record<string, unknown>;
  project_binding: Record<string, unknown>;
  runner_family: string;
  owner_run_id?: string | null;
  owner_execution_id?: string | null;
  owner_executor_id?: string | null;
  created_at: string;
  activated_at?: string | null;
  completed_at?: string | null;
  cleaned_at?: string | null;
  last_failure_summary?: string | null;
}

export interface WorkspacesResponse {
  workspaces: WorkspaceRecord[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  approval_class: ApprovalClass;
  adapter_family?: string;
  capability_status?: string;
  real_adapter_availability?: boolean;
  default_locks: LockName[];
  default_timeout_s: number;
  risk: string;
  tags: string[];
}

export interface CatalogAgent {
  id: string;
  name: string;
  role: string;
  summary: string;
  tools: ToolDefinition[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  locks: LockName[];
  owned_tools: string[];
}

export interface AdapterFamilyStatus {
  family: string;
  mode: string;
  supports_real_execution: boolean;
  contract_version: string;
  execution_boundary: string;
  ready: boolean;
   real_tool_paths: string[];
   plan_only_tool_paths: string[];
   gated_tool_paths?: string[];
   simulated_tool_paths: string[];
  notes: string[];
}

export interface AdaptersResponse {
  configured_mode: string;
  active_mode: string;
  supported_modes: string[];
  contract_version: string;
  supports_real_execution: boolean;
  real_tool_paths: string[];
  plan_only_tool_paths: string[];
  gated_tool_paths?: string[];
  simulated_tool_paths: string[];
  families: AdapterFamilyStatus[];
  warning?: string | null;
  notes: string[];
}

export interface AdaptersEnvelope {
  adapters: AdaptersResponse;
}

export interface SchemaValidationStatus {
  mode: string;
  schema_scope: string;
  supports_request_args: boolean;
  supports_result_conformance: boolean;
  supports_persisted_execution_details: boolean;
  supports_persisted_artifact_metadata: boolean;
  active_keywords: string[];
  active_unsupported_keywords: string[];
  active_metadata_keywords: string[];
  supported_keywords: string[];
  supported_refs: string[];
  unsupported_keywords: string[];
  persisted_execution_details_tool_count: number;
  persisted_artifact_metadata_tool_count: number;
  persisted_execution_details_tools: string[];
  persisted_artifact_metadata_tools: string[];
  persisted_family_coverage: PersistedSchemaFamilyCoverage[];
  notes: string[];
}

export interface PersistedSchemaFamilyCoverage {
  family: string;
  total_tools: number;
  execution_details_tools: number;
  artifact_metadata_tools: number;
  covered_tools: string[];
  uncovered_tools: string[];
}

export interface AdapterModeStatus {
  ready: boolean;
  configured_mode: string;
  active_mode: string;
  supports_real_execution: boolean;
  contract_version: string;
  execution_boundary: string;
  supported_modes: string[];
  available_families: string[];
  real_tool_paths: string[];
  plan_only_tool_paths: string[];
  gated_tool_paths?: string[];
  simulated_tool_paths: string[];
  warning?: string | null;
  notes: string[];
}

export interface ReadinessStatus {
  ok: boolean;
  service: string;
  execution_mode: string;
  persistence_ready: boolean;
  requested_database_strategy: string;
  database_strategy: string;
  database_path: string;
  persistence_warning?: string | null;
  attempted_database_paths: string[];
  adapter_mode: AdapterModeStatus;
  schema_validation: SchemaValidationStatus;
  dependencies: string[];
}

export interface ControlPlaneSummaryResponse {
  prompt_sessions_total: number;
  prompt_sessions_by_status: Record<string, number>;
  prompt_sessions_waiting_approval: number;
  prompt_sessions_with_real_editor_children: number;
  runs_total: number;
  runs_by_status: Record<string, number>;
  runs_by_related_execution_mode: Record<string, number>;
  runs_by_inspection_surface: Record<string, number>;
  runs_by_fallback_category: Record<string, number>;
  runs_by_manifest_source_of_truth: Record<string, number>;
  approvals_total: number;
  approvals_pending: number;
  approvals_decided: number;
  executions_total: number;
  executions_by_status: Record<string, number>;
  executions_by_mode: Record<string, number>;
  executions_by_attempt_state: Record<string, number>;
  executions_by_failure_category: Record<string, number>;
  executions_by_inspection_surface: Record<string, number>;
  executions_by_fallback_category: Record<string, number>;
  executions_by_manifest_source_of_truth: Record<string, number>;
  artifacts_total: number;
  artifacts_by_mode: Record<string, number>;
  artifacts_by_inspection_surface: Record<string, number>;
  artifacts_by_fallback_category: Record<string, number>;
  artifacts_by_manifest_source_of_truth: Record<string, number>;
  events_total: number;
  active_events: number;
  events_by_severity: Record<string, number>;
  locks_total: number;
  executors_total: number;
  executors_by_availability_state: Record<string, number>;
  workspaces_total: number;
  workspaces_by_state: Record<string, number>;
}
