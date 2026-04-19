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
  LocksResponse,
  PoliciesResponse,
  ReadinessStatus,
  RunListItem,
  RunListResponse,
  RunRecord,
  RunAuditRecord,
  RunsResponse,
  RunsSummaryResponse,
  SettingsPatchAuditSummary,
  ToolPolicy,
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
): Promise<RunListItem[]> {
  const params = new URLSearchParams();
  if (tool && tool !== "all") {
    params.set("tool", tool);
  }
  if (auditStatus && auditStatus !== "all") {
    params.set("audit_status", auditStatus);
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
