import type {
  AdaptersEnvelope,
  AdaptersResponse,
  ArtifactListItem,
  ArtifactListResponse,
  ArtifactRecord,
  ArtifactsResponse,
  ApprovalListItem,
  ApprovalsListResponse,
  ApprovalRecord,
  ApprovalsResponse,
  ExecutorRecord,
  ExecutorsResponse,
  EventListItem,
  EventListResponse,
  EventRecord,
  EventsResponse,
  ExecutionListItem,
  ExecutionListResponse,
  ExecutionRecord,
  ExecutionsResponse,
  ControlPlaneSummaryResponse,
  RequestEnvelope,
  ResponseEnvelope,
  LockRecord,
  LockListItem,
  LocksListResponse,
  O3DEBridgeResultsCleanupResult,
  O3DEBridgeStatus,
  O3DETargetConfig,
  LocksResponse,
  PoliciesResponse,
  PromptCapabilitiesResponse,
  PromptCapabilityEntry,
  PromptRequest,
  PromptSessionRecord,
  PromptSessionsResponse,
  ReadinessStatus,
  RunListItem,
  RunListResponse,
  RunRecord,
  RunAuditRecord,
  RunsResponse,
  RunsSummaryResponse,
  SettingsPatchAuditSummary,
  ToolPolicy,
  WorkspaceRecord,
  WorkspacesResponse,
} from "../types/contracts";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

async function getJson<T>(path: string, errorPrefix: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`${errorPrefix} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function dispatchTool(
  request: RequestEnvelope,
): Promise<ResponseEnvelope> {
  const response = await fetch(`${API_BASE_URL}/tools/dispatch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Dispatch failed with status ${response.status}`);
  }

  return (await response.json()) as ResponseEnvelope;
}

export async function fetchToolsCatalog(): Promise<unknown> {
  return getJson("/tools/catalog", "Catalog fetch");
}

export async function fetchO3deTarget(): Promise<O3DETargetConfig> {
  return getJson<O3DETargetConfig>("/o3de/target", "O3DE target fetch");
}

export async function fetchO3deBridge(): Promise<O3DEBridgeStatus> {
  return getJson<O3DEBridgeStatus>("/o3de/bridge", "O3DE bridge fetch");
}

export async function cleanupO3deBridgeResults(
  minAgeS = 300,
): Promise<O3DEBridgeResultsCleanupResult> {
  const response = await fetch(
    `${API_BASE_URL}/o3de/bridge/results/cleanup?min_age_s=${encodeURIComponent(String(minAgeS))}`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`O3DE bridge cleanup failed with status ${response.status}`);
  }

  return (await response.json()) as O3DEBridgeResultsCleanupResult;
}

export async function createPromptSession(
  request: PromptRequest,
): Promise<PromptSessionRecord> {
  const response = await fetch(`${API_BASE_URL}/prompt/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Prompt session creation failed with status ${response.status}`);
  }

  return (await response.json()) as PromptSessionRecord;
}

export async function executePromptSession(
  promptId: string,
): Promise<PromptSessionRecord> {
  const response = await fetch(`${API_BASE_URL}/prompt/sessions/${promptId}/execute`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Prompt session execution failed with status ${response.status}`);
  }

  return (await response.json()) as PromptSessionRecord;
}

export async function fetchPromptSession(
  promptId: string,
): Promise<PromptSessionRecord> {
  const response = await fetch(`${API_BASE_URL}/prompt/sessions/${promptId}`);

  if (!response.ok) {
    throw new Error(`Prompt session fetch failed with status ${response.status}`);
  }

  return (await response.json()) as PromptSessionRecord;
}

export async function fetchPromptSessions(): Promise<PromptSessionRecord[]> {
  const payload = await getJson<PromptSessionsResponse>(
    "/prompt/sessions",
    "Prompt sessions fetch",
  );
  return payload.sessions ?? [];
}

export async function fetchPromptCapabilities(): Promise<PromptCapabilityEntry[]> {
  const payload = await getJson<PromptCapabilitiesResponse>(
    "/prompt/capabilities",
    "Prompt capabilities fetch",
  );
  return payload.capabilities ?? [];
}

export async function fetchApprovals(): Promise<ApprovalRecord[]> {
  const payload = await getJson<ApprovalsResponse>("/approvals", "Approvals fetch");
  return payload.approvals ?? [];
}

export async function fetchApprovalCards(): Promise<ApprovalListItem[]> {
  const payload = await getJson<ApprovalsListResponse>(
    "/approvals/cards",
    "Approval cards fetch",
  );
  return payload.approvals ?? [];
}

export async function approveApproval(approvalId: string): Promise<ApprovalRecord> {
  const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Approval decision failed with status ${response.status}`);
  }

  return (await response.json()) as ApprovalRecord;
}

export async function rejectApproval(approvalId: string): Promise<ApprovalRecord> {
  const response = await fetch(`${API_BASE_URL}/approvals/${approvalId}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Approval decision failed with status ${response.status}`);
  }

  return (await response.json()) as ApprovalRecord;
}

export async function fetchEvents(): Promise<EventRecord[]> {
  const payload = await getJson<EventsResponse>("/events", "Events fetch");
  return payload.events ?? [];
}

export async function fetchEventCards(): Promise<EventListItem[]> {
  const payload = await getJson<EventListResponse>("/events/cards", "Event cards fetch");
  return payload.events ?? [];
}

export async function fetchRuns(
  tool?: string,
  auditStatus?: string,
): Promise<RunRecord[]> {
  const params = new URLSearchParams();
  if (tool && tool !== "all") {
    params.set("tool", tool);
  }
  if (auditStatus && auditStatus !== "all") {
    params.set("audit_status", auditStatus);
  }
  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/runs${query ? `?${query}` : ""}`,
  );

  if (!response.ok) {
    throw new Error(`Runs fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RunsResponse;
  return payload.runs ?? [];
}

export async function fetchRunCards(
  tool?: string,
  auditStatus?: string,
  filters?: {
    inspectionSurface?: string | null;
    fallbackCategory?: string | null;
    manifestSourceOfTruth?: string | null;
  },
): Promise<RunListItem[]> {
  const params = new URLSearchParams();
  if (tool && tool !== "all") {
    params.set("tool", tool);
  }
  if (auditStatus && auditStatus !== "all") {
    params.set("audit_status", auditStatus);
  }
  if (filters?.inspectionSurface) {
    params.set("inspection_surface", filters.inspectionSurface);
  }
  if (filters?.fallbackCategory) {
    params.set("fallback_category", filters.fallbackCategory);
  }
  if (filters?.manifestSourceOfTruth) {
    params.set("manifest_source_of_truth", filters.manifestSourceOfTruth);
  }
  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/runs/cards${query ? `?${query}` : ""}`,
  );

  if (!response.ok) {
    throw new Error(`Run cards fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RunListResponse;
  return payload.runs ?? [];
}

export async function fetchRun(runId: string): Promise<RunRecord> {
  const response = await fetch(`${API_BASE_URL}/runs/${runId}`);

  if (!response.ok) {
    throw new Error(`Run fetch failed with status ${response.status}`);
  }

  return (await response.json()) as RunRecord;
}

export async function fetchRunsSummary(): Promise<{
  settingsPatchAuditSummary: SettingsPatchAuditSummary;
  runAudits: RunAuditRecord[];
}> {
  return fetchRunsSummaryForFilter();
}

export async function fetchRunsSummaryForFilter(
  tool?: string,
  auditStatus?: string,
): Promise<{
  settingsPatchAuditSummary: SettingsPatchAuditSummary;
  runAudits: RunAuditRecord[];
}> {
  const params = new URLSearchParams();
  if (tool && tool !== "all") {
    params.set("tool", tool);
  }
  if (auditStatus && auditStatus !== "all") {
    params.set("audit_status", auditStatus);
  }
  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/runs/summary${query ? `?${query}` : ""}`,
  );

  if (!response.ok) {
    throw new Error(`Runs summary fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RunsSummaryResponse;
  return {
    settingsPatchAuditSummary: payload.settings_patch_audit_summary,
    runAudits: payload.run_audits ?? [],
  };
}

export async function fetchLocks(): Promise<LockRecord[]> {
  const payload = await getJson<LocksResponse>("/locks", "Locks fetch");
  return payload.locks ?? [];
}

export async function fetchLockCards(): Promise<LockListItem[]> {
  const payload = await getJson<LocksListResponse>("/locks/cards", "Lock cards fetch");
  return payload.locks ?? [];
}

export async function fetchPolicies(): Promise<ToolPolicy[]> {
  const payload = await getJson<PoliciesResponse>("/policies", "Policies fetch");
  return payload.policies ?? [];
}

export async function fetchExecutions(): Promise<ExecutionRecord[]> {
  const response = await fetch(`${API_BASE_URL}/executions`);

  if (!response.ok) {
    throw new Error(`Executions fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ExecutionsResponse;
  return payload.executions ?? [];
}

export async function fetchExecutionCards(): Promise<ExecutionListItem[]> {
  const response = await fetch(`${API_BASE_URL}/executions/cards`);

  if (!response.ok) {
    throw new Error(`Execution cards fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ExecutionListResponse;
  return payload.executions ?? [];
}

export async function fetchExecutionCardsForTruthFilter(filters?: {
  inspectionSurface?: string | null;
  fallbackCategory?: string | null;
  manifestSourceOfTruth?: string | null;
}): Promise<ExecutionListItem[]> {
  const params = new URLSearchParams();
  if (filters?.inspectionSurface) {
    params.set("inspection_surface", filters.inspectionSurface);
  }
  if (filters?.fallbackCategory) {
    params.set("fallback_category", filters.fallbackCategory);
  }
  if (filters?.manifestSourceOfTruth) {
    params.set("manifest_source_of_truth", filters.manifestSourceOfTruth);
  }
  const query = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/executions/cards${query ? `?${query}` : ""}`,
  );

  if (!response.ok) {
    throw new Error(`Execution cards fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ExecutionListResponse;
  return payload.executions ?? [];
}

export async function fetchExecution(executionId: string): Promise<ExecutionRecord> {
  const response = await fetch(`${API_BASE_URL}/executions/${executionId}`);

  if (!response.ok) {
    throw new Error(`Execution fetch failed with status ${response.status}`);
  }

  return (await response.json()) as ExecutionRecord;
}

export async function fetchArtifacts(): Promise<ArtifactRecord[]> {
  const payload = await getJson<ArtifactsResponse>("/artifacts", "Artifacts fetch");
  return payload.artifacts ?? [];
}

export async function fetchArtifactCards(): Promise<ArtifactListItem[]> {
  const payload = await getJson<ArtifactListResponse>(
    "/artifacts/cards",
    "Artifact cards fetch",
  );
  return payload.artifacts ?? [];
}

export async function fetchArtifactCardsForTruthFilter(filters?: {
  inspectionSurface?: string | null;
  fallbackCategory?: string | null;
  manifestSourceOfTruth?: string | null;
}): Promise<ArtifactListItem[]> {
  const params = new URLSearchParams();
  if (filters?.inspectionSurface) {
    params.set("inspection_surface", filters.inspectionSurface);
  }
  if (filters?.fallbackCategory) {
    params.set("fallback_category", filters.fallbackCategory);
  }
  if (filters?.manifestSourceOfTruth) {
    params.set("manifest_source_of_truth", filters.manifestSourceOfTruth);
  }
  const query = params.toString();
  const payload = await getJson<ArtifactListResponse>(
    `/artifacts/cards${query ? `?${query}` : ""}`,
    "Artifact cards fetch",
  );
  return payload.artifacts ?? [];
}

export async function fetchArtifact(artifactId: string): Promise<ArtifactRecord> {
  const artifacts = await fetchArtifacts();
  const match = artifacts.find((artifact) => artifact.id === artifactId);
  if (!match) {
    throw new Error(`Artifact fetch failed because artifact ${artifactId} was not found`);
  }
  return match;
}

export async function fetchAdapters(): Promise<AdaptersResponse> {
  const payload = await getJson<AdaptersEnvelope>("/adapters", "Adapters fetch");
  return payload.adapters;
}

export async function fetchReadiness(): Promise<ReadinessStatus> {
  return getJson<ReadinessStatus>("/ready", "Readiness fetch");
}

export async function fetchControlPlaneSummary(): Promise<ControlPlaneSummaryResponse> {
  return getJson<ControlPlaneSummaryResponse>("/summary", "Control-plane summary fetch");
}

export async function fetchExecutors(): Promise<ExecutorRecord[]> {
  const payload = await getJson<ExecutorsResponse>("/executors", "Executors fetch");
  return payload.executors ?? [];
}

export async function fetchExecutor(executorId: string): Promise<ExecutorRecord> {
  return getJson<ExecutorRecord>(`/executors/${executorId}`, "Executor fetch");
}

export async function fetchWorkspaces(): Promise<WorkspaceRecord[]> {
  const payload = await getJson<WorkspacesResponse>("/workspaces", "Workspaces fetch");
  return payload.workspaces ?? [];
}

export async function fetchWorkspace(workspaceId: string): Promise<WorkspaceRecord> {
  return getJson<WorkspaceRecord>(`/workspaces/${workspaceId}`, "Workspace fetch");
}
