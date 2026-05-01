import type {
  AdaptersEnvelope,
  AdaptersResponse,
  AppControlExecutionReport,
  AppControlExecutionReportRequest,
  AppControlPreviewRequest,
  AppControlScriptPreview,
  AutonomyHealingActionCreateRequest,
  AutonomyHealingActionUpdateRequest,
  AutonomyHealingActionsResponse,
  AutonomyJobCreateRequest,
  AutonomyJobUpdateRequest,
  AutonomyJobsResponse,
  AutonomyMemoriesResponse,
  AutonomyObservationCreateRequest,
  AutonomyObservationUpdateRequest,
  AutonomyObjectiveCreateRequest,
  AutonomyObjectivesResponse,
  AutonomyObservationsResponse,
  AutonomySummaryResponse,
  AssetForgeBlenderStatusRecord,
  AssetForgeEditorModelRecord,
  AssetForgeStudioStatusRecord,
  AssetForgeBlenderInspectRequest,
  AssetForgeBlenderInspectReport,
  AssetForgeO3DEStagePlanRequest,
  AssetForgeO3DEStagePlanRecord,
  AssetForgeO3DEReadbackRequest,
  AssetForgeO3DEReadbackRecord,
  AssetForgeO3DEPlacementPlanRequest,
  AssetForgeO3DEPlacementPlanRecord,
  AssetForgeO3DEPlacementEvidenceRequest,
  AssetForgeO3DEPlacementEvidenceRecord,
  AssetForgeO3DEPlacementHarnessRequest,
  AssetForgeO3DEPlacementHarnessRecord,
  AssetForgeO3DEPlacementHarnessExecuteRequest,
  AssetForgeO3DEPlacementHarnessExecuteRecord,
  AssetForgeO3DEPlacementLiveProofRequest,
  AssetForgeO3DEPlacementLiveProofRecord,
  AssetForgePlacementEvidenceIndexRecord,
  AssetForgeO3DEPlacementProofRequest,
  AssetForgeO3DEPlacementProofRecord,
  AssetForgeO3DEStageWriteRequest,
  AssetForgeO3DEStageWriteRecord,
  AssetForgeProviderStatusRecord,
  AssetForgeTaskRecord,
  AssetForgeTaskPlanRequest,
  ArtifactListItem,
  ArtifactListResponse,
  ArtifactRecord,
  ArtifactsResponse,
  ApprovalListItem,
  ApprovalsListResponse,
  ApprovalRecord,
  ApprovalsResponse,
  CodexControlLaneCreateRequest,
  CodexControlLaneCreateResponse,
  CodexControlNextTaskRequest,
  CodexControlNextTaskResponse,
  CodexControlNotificationCreateRequest,
  CodexControlNotificationsResponse,
  CodexControlStatusResponse,
  CodexControlTerminalLaunchRequest,
  CodexControlTerminalSessionResponse,
  CodexControlTerminalStopRequest,
  CodexControlTaskActionRequest,
  CodexControlTaskCreateRequest,
  CodexControlTaskSupersedeRequest,
  CodexControlTaskSupersedeResponse,
  CodexControlTaskResponse,
  CodexControlTaskWaitRequest,
  CodexControlWaiterResponse,
  CodexControlWorkerHeartbeatRequest,
  CodexControlWorkerResponse,
  CodexControlWorkerSyncRequest,
  ExecutorRecord,
  ExecutorsResponse,
  EventListItem,
  EventListResponse,
  EventDetailResponse,
  EventRecord,
  EventSummaryResponse,
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
  PromptShortcutRequest,
  PromptShortcutResponse,
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

async function postJson<TRequest, TResponse>(
  path: string,
  request: TRequest,
  errorPrefix: string,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`${errorPrefix} failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
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

export async function previewAppControlScript(
  request: AppControlPreviewRequest,
): Promise<AppControlScriptPreview> {
  return postJson<AppControlPreviewRequest, AppControlScriptPreview>(
    "/app/control/preview",
    request,
    "App control preview",
  );
}

export async function buildAppControlExecutionReport(
  request: AppControlExecutionReportRequest,
): Promise<AppControlExecutionReport> {
  return postJson<AppControlExecutionReportRequest, AppControlExecutionReport>(
    "/app/control/report",
    request,
    "App control execution report",
  );
}

export async function fetchAutonomySummary(): Promise<AutonomySummaryResponse> {
  return getJson<AutonomySummaryResponse>("/autonomy", "Autonomy summary fetch");
}

export async function fetchAutonomyObjectives() {
  const payload = await getJson<AutonomyObjectivesResponse>(
    "/autonomy/objectives",
    "Autonomy objectives fetch",
  );
  return payload.objectives ?? [];
}

export async function createAutonomyObjective(
  request: AutonomyObjectiveCreateRequest,
) {
  return postJson<AutonomyObjectiveCreateRequest, AutonomyObjectivesResponse["objectives"][number]>(
    "/autonomy/objectives",
    request,
    "Autonomy objective creation",
  );
}

export async function fetchAutonomyJobs() {
  const payload = await getJson<AutonomyJobsResponse>(
    "/autonomy/jobs",
    "Autonomy jobs fetch",
  );
  return payload.jobs ?? [];
}

export async function createAutonomyJob(
  request: AutonomyJobCreateRequest,
) {
  return postJson<AutonomyJobCreateRequest, AutonomyJobsResponse["jobs"][number]>(
    "/autonomy/jobs",
    request,
    "Autonomy job creation",
  );
}

export async function updateAutonomyJob(
  jobId: string,
  request: AutonomyJobUpdateRequest,
) {
  const response = await fetch(
    `${API_BASE_URL}/autonomy/jobs/${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(`Autonomy job update failed with status ${response.status}`);
  }

  return (await response.json()) as AutonomyJobsResponse["jobs"][number];
}

export async function fetchAutonomyObservations() {
  const payload = await getJson<AutonomyObservationsResponse>(
    "/autonomy/observations",
    "Autonomy observations fetch",
  );
  return payload.observations ?? [];
}

export async function createAutonomyObservation(
  request: AutonomyObservationCreateRequest,
) {
  return postJson<AutonomyObservationCreateRequest, AutonomyObservationsResponse["observations"][number]>(
    "/autonomy/observations",
    request,
    "Autonomy observation creation",
  );
}

export async function updateAutonomyObservation(
  observationId: string,
  request: AutonomyObservationUpdateRequest,
) {
  const response = await fetch(
    `${API_BASE_URL}/autonomy/observations/${encodeURIComponent(observationId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(`Autonomy observation update failed with status ${response.status}`);
  }

  return (await response.json()) as AutonomyObservationsResponse["observations"][number];
}

export async function fetchAutonomyHealingActions() {
  const payload = await getJson<AutonomyHealingActionsResponse>(
    "/autonomy/healing-actions",
    "Autonomy healing actions fetch",
  );
  return payload.healing_actions ?? [];
}

export async function createAutonomyHealingAction(
  request: AutonomyHealingActionCreateRequest,
) {
  return postJson<AutonomyHealingActionCreateRequest, AutonomyHealingActionsResponse["healing_actions"][number]>(
    "/autonomy/healing-actions",
    request,
    "Autonomy healing action creation",
  );
}

export async function updateAutonomyHealingAction(
  actionId: string,
  request: AutonomyHealingActionUpdateRequest,
) {
  const response = await fetch(
    `${API_BASE_URL}/autonomy/healing-actions/${encodeURIComponent(actionId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(`Autonomy healing action update failed with status ${response.status}`);
  }

  return (await response.json()) as AutonomyHealingActionsResponse["healing_actions"][number];
}

export async function fetchAutonomyMemories() {
  const payload = await getJson<AutonomyMemoriesResponse>(
    "/autonomy/memories",
    "Autonomy memories fetch",
  );
  return payload.memories ?? [];
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

export async function fetchCodexControlStatus(): Promise<CodexControlStatusResponse> {
  return getJson<CodexControlStatusResponse>("/codex/control", "Codex control fetch");
}

export async function createCodexControlLane(
  request: CodexControlLaneCreateRequest,
): Promise<CodexControlLaneCreateResponse> {
  const response = await fetch(`${API_BASE_URL}/codex/control/lanes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Codex lane creation failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlLaneCreateResponse;
}

export async function syncCodexControlWorker(
  request: CodexControlWorkerSyncRequest,
): Promise<CodexControlWorkerResponse> {
  const response = await fetch(`${API_BASE_URL}/codex/control/workers/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Codex worker sync failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlWorkerResponse;
}

export async function heartbeatCodexControlWorker(
  workerId: string,
  request: CodexControlWorkerHeartbeatRequest,
): Promise<CodexControlWorkerResponse> {
  const response = await fetch(
    `${API_BASE_URL}/codex/control/workers/${encodeURIComponent(workerId)}/heartbeat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(`Codex worker heartbeat failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlWorkerResponse;
}

export async function createCodexControlTask(
  request: CodexControlTaskCreateRequest,
): Promise<CodexControlTaskResponse> {
  const response = await fetch(`${API_BASE_URL}/codex/control/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Codex task creation failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlTaskResponse;
}

async function postCodexControlTaskAction(
  taskId: string,
  pathSuffix: "claim" | "release" | "complete",
  request: CodexControlTaskActionRequest,
): Promise<CodexControlTaskResponse> {
  const response = await fetch(`${API_BASE_URL}/codex/control/tasks/${encodeURIComponent(taskId)}/${pathSuffix}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Codex task ${pathSuffix} failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlTaskResponse;
}

export async function claimCodexControlTask(
  taskId: string,
  request: CodexControlTaskActionRequest,
): Promise<CodexControlTaskResponse> {
  return postCodexControlTaskAction(taskId, "claim", request);
}

export async function releaseCodexControlTask(
  taskId: string,
  request: CodexControlTaskActionRequest,
): Promise<CodexControlTaskResponse> {
  return postCodexControlTaskAction(taskId, "release", request);
}

export async function completeCodexControlTask(
  taskId: string,
  request: CodexControlTaskActionRequest,
): Promise<CodexControlTaskResponse> {
  return postCodexControlTaskAction(taskId, "complete", request);
}

export async function supersedeCodexControlTask(
  taskId: string,
  request: CodexControlTaskSupersedeRequest,
): Promise<CodexControlTaskSupersedeResponse> {
  const response = await fetch(`${API_BASE_URL}/codex/control/tasks/${encodeURIComponent(taskId)}/supersede`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Codex task supersede failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlTaskSupersedeResponse;
}

export async function waitForCodexControlTask(
  taskId: string,
  request: CodexControlTaskWaitRequest,
): Promise<CodexControlWaiterResponse> {
  const response = await fetch(`${API_BASE_URL}/codex/control/tasks/${encodeURIComponent(taskId)}/wait`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Codex task wait registration failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlWaiterResponse;
}

export async function fetchCodexControlNextTask(
  request: CodexControlNextTaskRequest,
): Promise<CodexControlNextTaskResponse> {
  const response = await fetch(`${API_BASE_URL}/codex/control/workers/next-task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Codex next-task fetch failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlNextTaskResponse;
}

export async function fetchCodexControlNotifications(
  workerId: string,
  includeAll = false,
): Promise<CodexControlNotificationsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/codex/control/workers/${encodeURIComponent(workerId)}/notifications?include_all=${includeAll ? "true" : "false"}`,
  );

  if (!response.ok) {
    throw new Error(`Codex notifications fetch failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlNotificationsResponse;
}

export async function createCodexControlNotification(
  workerId: string,
  request: CodexControlNotificationCreateRequest,
): Promise<CodexControlNotificationsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/codex/control/workers/${encodeURIComponent(workerId)}/notify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(`Codex notification creation failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlNotificationsResponse;
}

export async function launchCodexControlTerminal(
  request: CodexControlTerminalLaunchRequest,
): Promise<CodexControlTerminalSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/codex/control/terminals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Codex terminal launch failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlTerminalSessionResponse;
}

export async function stopCodexControlTerminal(
  sessionId: string,
  request: CodexControlTerminalStopRequest,
): Promise<CodexControlTerminalSessionResponse> {
  const response = await fetch(
    `${API_BASE_URL}/codex/control/terminals/${encodeURIComponent(sessionId)}/stop`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    throw new Error(`Codex terminal stop failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlTerminalSessionResponse;
}

export async function markCodexControlNotificationsRead(
  workerId: string,
): Promise<CodexControlNotificationsResponse> {
  const response = await fetch(
    `${API_BASE_URL}/codex/control/workers/${encodeURIComponent(workerId)}/notifications/mark-read`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`Codex notification mark-read failed with status ${response.status}`);
  }

  return (await response.json()) as CodexControlNotificationsResponse;
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

export async function createPromptShortcuts(
  request: PromptShortcutRequest,
): Promise<PromptShortcutResponse> {
  return postJson<PromptShortcutRequest, PromptShortcutResponse>(
    "/prompt/shortcuts",
    request,
    "Prompt shortcut generation",
  );
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

export async function fetchEventSummary(): Promise<EventSummaryResponse> {
  return getJson<EventSummaryResponse>("/events/summary", "Event summary fetch");
}

export async function fetchEventDetail(eventId: string): Promise<EventDetailResponse> {
  return getJson<EventDetailResponse>(`/events/${eventId}`, "Event detail fetch");
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

export async function fetchAssetForgeTask(): Promise<AssetForgeTaskRecord> {
  return getJson<AssetForgeTaskRecord>("/asset-forge/task", "Asset Forge task fetch");
}

export async function createAssetForgeTaskPlan(
  request: AssetForgeTaskPlanRequest,
): Promise<AssetForgeTaskRecord> {
  return postJson<AssetForgeTaskPlanRequest, AssetForgeTaskRecord>(
    "/asset-forge/task/plan",
    request,
    "Asset Forge task plan",
  );
}

export async function fetchAssetForgeProviderStatus(): Promise<AssetForgeProviderStatusRecord> {
  return getJson<AssetForgeProviderStatusRecord>(
    "/asset-forge/provider/status",
    "Asset Forge provider status fetch",
  );
}

export async function fetchAssetForgeBlenderStatus(): Promise<AssetForgeBlenderStatusRecord> {
  return getJson<AssetForgeBlenderStatusRecord>(
    "/asset-forge/blender/status",
    "Asset Forge Blender status fetch",
  );
}

export async function fetchAssetForgeStudioStatus(): Promise<AssetForgeStudioStatusRecord> {
  return getJson<AssetForgeStudioStatusRecord>(
    "/asset-forge/studio/status",
    "Asset Forge studio status fetch",
  );
}

export async function fetchAssetForgeEditorModel(): Promise<AssetForgeEditorModelRecord> {
  return getJson<AssetForgeEditorModelRecord>(
    "/asset-forge/editor-model",
    "Asset Forge editor model fetch",
  );
}

export async function inspectAssetForgeBlenderArtifact(
  request: AssetForgeBlenderInspectRequest,
): Promise<AssetForgeBlenderInspectReport> {
  return postJson<AssetForgeBlenderInspectRequest, AssetForgeBlenderInspectReport>(
    "/asset-forge/blender/inspect",
    request,
    "Asset Forge Blender inspection",
  );
}

export async function createAssetForgeO3DEStagePlan(
  request: AssetForgeO3DEStagePlanRequest,
): Promise<AssetForgeO3DEStagePlanRecord> {
  return postJson<AssetForgeO3DEStagePlanRequest, AssetForgeO3DEStagePlanRecord>(
    "/asset-forge/o3de/stage-plan",
    request,
    "Asset Forge O3DE stage plan",
  );
}

export async function executeAssetForgeO3DEStageWrite(
  request: AssetForgeO3DEStageWriteRequest,
): Promise<AssetForgeO3DEStageWriteRecord> {
  return postJson<AssetForgeO3DEStageWriteRequest, AssetForgeO3DEStageWriteRecord>(
    "/asset-forge/o3de/stage-write",
    request,
    "Asset Forge O3DE stage write",
  );
}

export async function readAssetForgeO3DEIngestEvidence(
  request: AssetForgeO3DEReadbackRequest,
): Promise<AssetForgeO3DEReadbackRecord> {
  return postJson<AssetForgeO3DEReadbackRequest, AssetForgeO3DEReadbackRecord>(
    "/asset-forge/o3de/readback",
    request,
    "Asset Forge O3DE ingest readback",
  );
}

export async function createAssetForgeO3DEPlacementPlan(
  request: AssetForgeO3DEPlacementPlanRequest,
): Promise<AssetForgeO3DEPlacementPlanRecord> {
  return postJson<AssetForgeO3DEPlacementPlanRequest, AssetForgeO3DEPlacementPlanRecord>(
    "/asset-forge/o3de/placement-plan",
    request,
    "Asset Forge O3DE placement plan",
  );
}

export async function executeAssetForgeO3DEPlacementProof(
  request: AssetForgeO3DEPlacementProofRequest,
): Promise<AssetForgeO3DEPlacementProofRecord> {
  return postJson<AssetForgeO3DEPlacementProofRequest, AssetForgeO3DEPlacementProofRecord>(
    "/asset-forge/o3de/placement-proof",
    request,
    "Asset Forge O3DE placement proof",
  );
}

export async function readAssetForgeO3DEPlacementEvidence(
  request: AssetForgeO3DEPlacementEvidenceRequest,
): Promise<AssetForgeO3DEPlacementEvidenceRecord> {
  return postJson<
    AssetForgeO3DEPlacementEvidenceRequest,
    AssetForgeO3DEPlacementEvidenceRecord
  >(
    "/asset-forge/o3de/placement-evidence",
    request,
    "Asset Forge O3DE placement evidence",
  );
}

export async function prepareAssetForgeO3DEPlacementRuntimeHarness(
  request: AssetForgeO3DEPlacementHarnessRequest,
): Promise<AssetForgeO3DEPlacementHarnessRecord> {
  return postJson<
    AssetForgeO3DEPlacementHarnessRequest,
    AssetForgeO3DEPlacementHarnessRecord
  >(
    "/asset-forge/o3de/placement-harness/prepare",
    request,
    "Asset Forge O3DE placement harness prepare",
  );
}

export async function executeAssetForgeO3DEPlacementRuntimeHarness(
  request: AssetForgeO3DEPlacementHarnessExecuteRequest,
): Promise<AssetForgeO3DEPlacementHarnessExecuteRecord> {
  return postJson<
    AssetForgeO3DEPlacementHarnessExecuteRequest,
    AssetForgeO3DEPlacementHarnessExecuteRecord
  >(
    "/asset-forge/o3de/placement-harness/execute",
    request,
    "Asset Forge O3DE placement harness execute",
  );
}

export async function executeAssetForgeO3DEPlacementLiveProof(
  request: AssetForgeO3DEPlacementLiveProofRequest,
): Promise<AssetForgeO3DEPlacementLiveProofRecord> {
  return postJson<
    AssetForgeO3DEPlacementLiveProofRequest,
    AssetForgeO3DEPlacementLiveProofRecord
  >(
    "/asset-forge/o3de/placement-harness/live-proof",
    request,
    "Asset Forge O3DE placement live proof",
  );
}

export async function getAssetForgeO3DEPlacementLiveProofEvidenceIndex(
  limit = 10,
  proofStatus = "",
  candidateId = "",
  fromAgeS?: number,
): Promise<AssetForgePlacementEvidenceIndexRecord> {
  const normalizedLimit = Math.max(1, Math.min(25, Math.trunc(limit)));
  const query = new URLSearchParams({ limit: String(normalizedLimit) });
  const statusValue = proofStatus.trim();
  const candidateValue = candidateId.trim();
  if (statusValue) {
    query.set("proof_status", statusValue);
  }
  if (candidateValue) {
    query.set("candidate_id", candidateValue);
  }
  if (typeof fromAgeS === "number" && Number.isFinite(fromAgeS)) {
    const normalizedAge = Math.max(0, Math.min(86400, Math.trunc(fromAgeS)));
    query.set("from_age_s", String(normalizedAge));
  }
  return getJson<AssetForgePlacementEvidenceIndexRecord>(
    `/asset-forge/o3de/placement-harness/evidence-index?${query.toString()}`,
    "Asset Forge O3DE placement evidence index",
  );
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
