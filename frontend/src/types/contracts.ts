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

export interface ToolDefinition {
  name: string;
  description: string;
  approval_class: ApprovalClass;
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
