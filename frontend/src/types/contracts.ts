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
  requested_project_config_evidence?: string[];
  project_config_selection_mode?: string;
  requested_project_config_keys?: string[];
  matched_requested_project_config_keys?: string[];
  missing_requested_project_config_keys?: string[];
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

export interface EventRecord {
  id: string;
  run_id?: string | null;
  category: string;
  severity: "info" | "warning" | "error";
  message: string;
  created_at: string;
  details: Record<string, string>;
}

export interface EventsResponse {
  events: EventRecord[];
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

export interface LockRecord {
  name: string;
  owner_run_id: string;
  created_at: string;
}

export interface LocksResponse {
  locks: LockRecord[];
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
