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
  event_state: string;
}

export interface EventListResponse {
  events: EventListItem[];
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
