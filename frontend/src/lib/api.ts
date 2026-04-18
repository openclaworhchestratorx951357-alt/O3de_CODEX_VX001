import type {
  ApprovalRecord,
  ApprovalsResponse,
  EventRecord,
  EventsResponse,
  RequestEnvelope,
  ResponseEnvelope,
  RunRecord,
  RunsResponse,
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
