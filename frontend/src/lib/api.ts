import type {
  AdaptersEnvelope,
  AdaptersResponse,
  ArtifactRecord,
  ArtifactsResponse,
  ApprovalRecord,
  ApprovalsResponse,
  EventRecord,
  EventsResponse,
  ExecutionRecord,
  ExecutionsResponse,
  RequestEnvelope,
  ResponseEnvelope,
  LockRecord,
  LocksResponse,
  PoliciesResponse,
  ReadinessStatus,
  RunRecord,
  RunAuditRecord,
  RunsResponse,
  RunsSummaryResponse,
  SettingsPatchAuditSummary,
  ToolPolicy,
} from "../types/contracts";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

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
  const response = await fetch(`${API_BASE_URL}/tools/catalog`);

  if (!response.ok) {
    throw new Error(`Catalog fetch failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchApprovals(): Promise<ApprovalRecord[]> {
  const response = await fetch(`${API_BASE_URL}/approvals`);

  if (!response.ok) {
    throw new Error(`Approvals fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ApprovalsResponse;
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
  const response = await fetch(`${API_BASE_URL}/events`);

  if (!response.ok) {
    throw new Error(`Events fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as EventsResponse;
  return payload.events ?? [];
}

export async function fetchRuns(): Promise<RunRecord[]> {
  const response = await fetch(`${API_BASE_URL}/runs`);

  if (!response.ok) {
    throw new Error(`Runs fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RunsResponse;
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
  auditStatus?: string,
): Promise<{
  settingsPatchAuditSummary: SettingsPatchAuditSummary;
  runAudits: RunAuditRecord[];
}> {
  const params = new URLSearchParams();
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
  const response = await fetch(`${API_BASE_URL}/locks`);

  if (!response.ok) {
    throw new Error(`Locks fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as LocksResponse;
  return payload.locks ?? [];
}

export async function fetchPolicies(): Promise<ToolPolicy[]> {
  const response = await fetch(`${API_BASE_URL}/policies`);

  if (!response.ok) {
    throw new Error(`Policies fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as PoliciesResponse;
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

export async function fetchArtifacts(): Promise<ArtifactRecord[]> {
  const response = await fetch(`${API_BASE_URL}/artifacts`);

  if (!response.ok) {
    throw new Error(`Artifacts fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ArtifactsResponse;
  return payload.artifacts ?? [];
}

export async function fetchAdapters(): Promise<AdaptersResponse> {
  const response = await fetch(`${API_BASE_URL}/adapters`);

  if (!response.ok) {
    throw new Error(`Adapters fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as AdaptersEnvelope;
  return payload.adapters;
}

export async function fetchReadiness(): Promise<ReadinessStatus> {
  const response = await fetch(`${API_BASE_URL}/ready`);

  if (!response.ok) {
    throw new Error(`Readiness fetch failed with status ${response.status}`);
  }

  return (await response.json()) as ReadinessStatus;
}
