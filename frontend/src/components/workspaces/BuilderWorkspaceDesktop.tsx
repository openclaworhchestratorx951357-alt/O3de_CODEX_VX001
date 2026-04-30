import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

import {
  claimCodexControlTask,
  completeCodexControlTask,
  createCodexControlNotification,
  createAutonomyHealingAction,
  createAutonomyJob,
  createAutonomyObservation,
  createAutonomyObjective,
  createCodexControlLane,
  createCodexControlTask,
  fetchAutonomyHealingActions,
  fetchAutonomyJobs,
  fetchAutonomyMemories,
  fetchAutonomyObjectives,
  fetchAutonomyObservations,
  fetchAutonomySummary,
  fetchCodexControlNextTask,
  fetchCodexControlNotifications,
  fetchCodexControlStatus,
  heartbeatCodexControlWorker,
  launchCodexControlTerminal,
  markCodexControlNotificationsRead,
  releaseCodexControlTask,
  stopCodexControlTerminal,
  supersedeCodexControlTask,
  syncCodexControlWorker,
  updateAutonomyHealingAction,
  updateAutonomyJob,
  updateAutonomyObservation,
  waitForCodexControlTask,
} from "../../lib/api";
import { buildBuilderRecommendationDescriptors } from "../../lib/recommendations";
import { useSettings, useThemeTokens } from "../../lib/settings/hooks";
import type {
  AutonomyHealingActionCreateRequest,
  AutonomyHealingActionRecord,
  AutonomyHealingActionUpdateRequest,
  AutonomyJobCreateRequest,
  AutonomyJobRecord,
  AutonomyJobUpdateRequest,
  AutonomyMemoryRecord,
  AutonomyObservationCreateRequest,
  AutonomyObjectiveCreateRequest,
  AutonomyObjectiveRecord,
  AutonomyObservationRecord,
  AutonomyObservationUpdateRequest,
  AutonomySummaryResponse,
  CodexControlLaneCreateRequest,
  CodexControlNotificationCreateRequest,
  CodexControlNotification,
  CodexControlStatusResponse,
  CodexControlTask,
  CodexControlTaskCreateRequest,
  CodexControlTaskSupersedeRequest,
  CodexControlTerminalLaunchRequest,
  CodexControlTerminalSession,
  CodexControlTerminalStopRequest,
  CodexControlWorkerHeartbeatRequest,
  CodexControlWorkerSyncRequest,
  CodexControlWorker,
  CodexControlWorktree,
} from "../../types/contracts";
import ActionReviewCard from "../ActionReviewCard";
import {
  INITIAL_AUTONOMY_JOB_DRAFT,
  INITIAL_AUTONOMY_OBJECTIVE_DRAFT,
  INITIAL_LANE_DRAFT,
  INITIAL_TASK_DRAFT,
  INITIAL_TASK_SUPERSEDE_DRAFT,
  INITIAL_TERMINAL_LAUNCH_DRAFT,
  INITIAL_WORKER_HEARTBEAT_DRAFT,
  INITIAL_WORKER_SYNC_DRAFT,
  STALE_BLOCKED_MINUTES,
  STALE_WORKER_HEARTBEAT_MINUTES,
  SUPPORTED_THREAD_CAPABILITIES,
  THREAD_PROFILE_PRESETS,
} from "./builderWorkspace/defaults";
import type {
  AutonomyDraftRecommendation,
  AutonomyJobAttentionSignal,
  AutonomyJobDraft,
  AutonomyObjectiveDraft,
  LaneDraft,
  LoadedWorkerDraftReview,
  TaskDraft,
  TaskSupersedeDraft,
  TerminalLaunchDraft,
  WorkerHeartbeatDraft,
  WorkerSyncDraft,
} from "./builderWorkspace/types";
import BuilderAutonomyRecommendationsPanel from "./builderWorkspace/BuilderAutonomyRecommendationsPanel";
import BuilderWorkspaceView from "./BuilderWorkspaceView";
import CockpitBuilderPanel from "../cockpits/CockpitBuilderPanel";

function formatTimestamp(value?: string | null): string {
  if (!value) {
    return "not recorded";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getAgeMinutes(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const diffMs = Date.now() - parsed.getTime();
  if (diffMs <= 0) {
    return 0;
  }

  return Math.floor(diffMs / 60000);
}

function formatAgeMinutes(minutes: number | null): string {
  if (minutes === null) {
    return "unknown age";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function listFlags(worktree: CodexControlWorktree): string[] {
  const flags: string[] = [];
  if (worktree.is_current_repo) {
    flags.push("current repo");
  }
  if (worktree.locked) {
    flags.push("locked");
  }
  if (worktree.detached) {
    flags.push("detached");
  }
  if (worktree.prunable) {
    flags.push("prunable");
  }
  if (worktree.bare) {
    flags.push("bare");
  }
  return flags;
}

function sanitizeOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseScopePaths(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseCapabilityTags(value: string): string[] {
  const supported = new Set<string>(SUPPORTED_THREAD_CAPABILITIES);
  return parseScopePaths(value)
    .map((entry) => entry.toLowerCase().replace(/[-\s]+/g, "_"))
    .filter((entry, index, values) => supported.has(entry) && values.indexOf(entry) === index);
}

function formatStringList(values?: string[] | null): string {
  return values?.filter(Boolean).join(", ") ?? "";
}

function buildWorkerAvatarLabel(worker: CodexControlWorker | null): string {
  const explicit = worker?.avatar_label?.trim();
  if (explicit) {
    return explicit.slice(0, 3).toUpperCase();
  }
  const source = worker?.display_name || worker?.worker_id || "CP";
  return source
    .split(/[\s_-]+/)
    .map((entry) => entry[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || "CP";
}

function renderWorkerAvatar(worker: CodexControlWorker | null, size = 44) {
  const avatarColor = worker?.avatar_color || "#2563eb";
  const avatarUri = worker?.avatar_uri?.trim();
  return (
    <span
      aria-hidden="true"
      style={{
        ...workerAvatarStyle,
        width: size,
        height: size,
        background: avatarUri
          ? "var(--app-panel-bg-muted)"
          : `linear-gradient(135deg, ${avatarColor}, rgba(15, 23, 42, 0.84))`,
      }}
    >
      {avatarUri ? (
        <img src={avatarUri} alt="" style={workerAvatarImageStyle} />
      ) : (
        buildWorkerAvatarLabel(worker)
      )}
    </span>
  );
}

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw Object.assign(new Error(
      `${label} must be valid JSON. ${error instanceof Error ? error.message : "Parse failed."}`,
    ), { cause: error });
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function parseJsonStringArray(value: string, label: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} must be a JSON array of command arguments.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw Object.assign(new Error(
      `${label} must be valid JSON. ${error instanceof Error ? error.message : "Parse failed."}`,
    ), { cause: error });
  }

  if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string" || !entry.trim())) {
    throw new Error(`${label} must be a JSON array of non-empty strings.`);
  }

  return parsed.map((entry) => String(entry));
}

function pickStatusTone(status: string): "neutral" | "success" | "warning" | "info" {
  if (["active", "running", "review"].includes(status)) {
    return "info";
  }
  if (["achieved", "succeeded", "completed", "read"].includes(status)) {
    return "success";
  }
  if (["blocked", "failed", "abandoned", "unread"].includes(status)) {
    return "warning";
  }
  return "neutral";
}

function pickSeverityTone(severity: string): "neutral" | "success" | "warning" | "info" {
  if (severity === "error") {
    return "warning";
  }
  if (severity === "warning") {
    return "warning";
  }
  if (severity === "info") {
    return "info";
  }
  return "neutral";
}

function summarizeCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return "none recorded";
  }

  return entries
    .map(([label, count]) => `${label} ${count}`)
    .join(", ");
}

function buildWorkerSyncDraft(
  worker: CodexControlWorker | null,
  status: CodexControlStatusResponse | null,
): WorkerSyncDraft {
  if (!worker) {
    return {
      ...INITIAL_WORKER_SYNC_DRAFT,
      branchName: status?.current_branch ?? "",
      worktreePath: status?.repo_root ?? "",
      baseBranch: status?.recommended_base_branch ?? "",
    };
  }

  return {
    workerId: worker.worker_id,
    displayName: worker.display_name,
    agentProfile: worker.agent_profile ?? "",
    agentRuntime: worker.agent_runtime ?? "",
    agentEntrypoint: worker.agent_entrypoint ?? "",
    agentAccessNotes: worker.agent_access_notes ?? "",
    identityNotes: worker.identity_notes ?? "",
    personalityNotes: worker.personality_notes ?? "",
    soulDirective: worker.soul_directive ?? "",
    memoryNotes: worker.memory_notes ?? "",
    bootstrapNotes: worker.bootstrap_notes ?? "",
    capabilityTags: formatStringList(worker.capability_tags),
    contextSources: formatStringList(worker.context_sources),
    avatarLabel: worker.avatar_label ?? "",
    avatarColor: worker.avatar_color ?? "",
    avatarUri: worker.avatar_uri ?? "",
    branchName: worker.branch_name ?? "",
    worktreePath: worker.worktree_path ?? "",
    baseBranch: worker.base_branch ?? status?.recommended_base_branch ?? "",
    status: worker.status,
    summary: worker.summary ?? "",
    resumeNotes: worker.resume_notes ?? "",
  };
}

function buildWorkerHeartbeatDraft(worker: CodexControlWorker | null): WorkerHeartbeatDraft {
  if (!worker) {
    return INITIAL_WORKER_HEARTBEAT_DRAFT;
  }

  return {
    status: worker.status,
    summary: worker.summary ?? "",
    currentTaskId: worker.current_task_id ?? "",
    agentProfile: worker.agent_profile ?? "",
    agentRuntime: worker.agent_runtime ?? "",
    agentEntrypoint: worker.agent_entrypoint ?? "",
    agentAccessNotes: worker.agent_access_notes ?? "",
    identityNotes: worker.identity_notes ?? "",
    personalityNotes: worker.personality_notes ?? "",
    soulDirective: worker.soul_directive ?? "",
    memoryNotes: worker.memory_notes ?? "",
    bootstrapNotes: worker.bootstrap_notes ?? "",
    capabilityTags: formatStringList(worker.capability_tags),
    contextSources: formatStringList(worker.context_sources),
    avatarLabel: worker.avatar_label ?? "",
    avatarColor: worker.avatar_color ?? "",
    avatarUri: worker.avatar_uri ?? "",
    branchName: worker.branch_name ?? "",
    worktreePath: worker.worktree_path ?? "",
    baseBranch: worker.base_branch ?? "",
    resumeNotes: worker.resume_notes ?? "",
  };
}

function buildWorkerHandoffPackage(
  status: CodexControlStatusResponse | null,
  worker: CodexControlWorker | null,
  task: CodexControlTask | null,
  notifications: CodexControlNotification[],
): string {
  const generatedAt = new Date().toISOString();
  const unreadNotifications = notifications.filter(
    (notification) => notification.status === "unread",
  );

  const lines = [
    "Codex Builder handoff package",
    `Generated: ${generatedAt}`,
    "",
    "Repo context",
    `- repo_root: ${status?.repo_root ?? "unknown"}`,
    `- current_branch: ${status?.current_branch ?? "unknown"}`,
    `- recommended_base_branch: ${status?.recommended_base_branch ?? "unknown"}`,
    `- mission_control_script: ${status?.mission_control_script_path ?? "unknown"}`,
    `- board_json_path: ${status?.board.board_json_path ?? "unknown"}`,
    `- board_text_path: ${status?.board.board_text_path ?? "unknown"}`,
    "",
    "Worker",
    `- worker_id: ${worker?.worker_id ?? "select a worker"}`,
    `- display_name: ${worker?.display_name ?? "n/a"}`,
    `- agent_profile: ${worker?.agent_profile ?? "n/a"}`,
    `- agent_runtime: ${worker?.agent_runtime ?? "n/a"}`,
    `- agent_entrypoint: ${worker?.agent_entrypoint ?? "n/a"}`,
    `- agent_access_notes: ${worker?.agent_access_notes ?? "n/a"}`,
    `- identity_notes: ${worker?.identity_notes ?? "n/a"}`,
    `- personality_notes: ${worker?.personality_notes ?? "n/a"}`,
    `- soul_directive: ${worker?.soul_directive ?? "n/a"}`,
    `- capability_tags: ${formatStringList(worker?.capability_tags) || "n/a"}`,
    `- context_sources: ${formatStringList(worker?.context_sources) || "n/a"}`,
    `- memory_notes: ${worker?.memory_notes ?? "n/a"}`,
    `- bootstrap_notes: ${worker?.bootstrap_notes ?? "n/a"}`,
    `- status: ${worker?.status ?? "n/a"}`,
    `- branch_name: ${worker?.branch_name ?? "n/a"}`,
    `- worktree_path: ${worker?.worktree_path ?? "n/a"}`,
    `- current_task_id: ${worker?.current_task_id ?? "n/a"}`,
    `- summary: ${worker?.summary ?? "n/a"}`,
    `- resume_notes: ${worker?.resume_notes ?? "n/a"}`,
    "",
    "Task",
    `- task_id: ${task?.task_id ?? "n/a"}`,
    `- title: ${task?.title ?? "n/a"}`,
    `- status: ${task?.status ?? "n/a"}`,
    `- scopes: ${task?.scope_paths.join(", ") ?? "n/a"}`,
    `- blockers: ${task?.blockers.join(", ") || "none"}`,
    `- summary: ${task?.summary ?? "n/a"}`,
    "",
    "Notifications",
    `- unread_count: ${unreadNotifications.length}`,
  ];

  if (unreadNotifications.length > 0) {
    unreadNotifications.slice(0, 5).forEach((notification) => {
      lines.push(
        `- unread: ${notification.kind} :: ${notification.message} (task ${notification.task_id ?? "n/a"})`,
      );
    });
  } else {
    lines.push("- unread: none");
  }

  lines.push(
    "",
    "Recommended next steps",
    worker?.worktree_path
      ? `1. Open the assigned worktree at ${worker.worktree_path}.`
      : "1. Create or sync the worker lane before starting edits.",
    worker?.current_task_id
      ? `2. Continue task ${worker.current_task_id} inside its claimed scope before touching overlapping files.`
      : "2. Claim or seed a coordination task before starting overlapping work.",
    worker?.bootstrap_notes
      ? `3. Follow this worker bootstrap first: ${worker.bootstrap_notes}`
      : "3. Run the repo bootstrap/status checks in that worktree before using O3DE-facing flows.",
    "4. Keep the mission-control board updated with heartbeat, wait, release, or complete actions as work changes.",
    worker?.context_sources?.length
      ? `5. Treat these as the worker context upload pack: ${worker.context_sources.join(", ")}.`
      : "5. Add source/context files to this worker profile before asking it to resume a complex slice.",
    "6. Treat this as a Builder handoff package for Codex Desktop, not as an autonomous self-prompting loop.",
  );

  return lines.join("\n");
}

function buildAutonomyThreadPrompt(
  status: CodexControlStatusResponse | null,
  summary: AutonomySummaryResponse | null,
  objectives: AutonomyObjectiveRecord[],
  jobs: AutonomyJobRecord[],
): string {
  const generatedAt = new Date().toISOString();
  const activeObjectives = objectives
    .filter((objective) => objective.status === "active" || objective.status === "proposed")
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 3);
  const queuedJobs = jobs
    .filter((job) => job.status === "queued" || job.status === "blocked" || job.status === "running")
    .slice(0, 5);

  const lines = [
    "Codex Builder inbox check",
    `Generated: ${generatedAt}`,
    "",
    "Repo context",
    `- repo_root: ${status?.repo_root ?? "unknown"}`,
    `- current_branch: ${status?.current_branch ?? "unknown"}`,
    `- recommended_base_branch: ${status?.recommended_base_branch ?? "unknown"}`,
    `- mission_control_script: ${status?.mission_control_script_path ?? "unknown"}`,
    `- board_json_path: ${status?.board.board_json_path ?? "unknown"}`,
    `- board_text_path: ${status?.board.board_text_path ?? "unknown"}`,
    "",
    "Autonomy inbox summary",
    `- objectives_total: ${summary?.objectives_total ?? 0}`,
    `- jobs_total: ${summary?.jobs_total ?? 0}`,
    `- jobs_by_status: ${summarizeCounts(summary?.jobs_by_status ?? {})}`,
    `- observations_by_severity: ${summarizeCounts(summary?.observations_by_severity ?? {})}`,
    "",
    "Active objectives",
  ];

  if (activeObjectives.length > 0) {
    activeObjectives.forEach((objective) => {
      lines.push(
        `- ${objective.id}: ${objective.title} [${objective.status}] priority=${objective.priority}`,
      );
    });
  } else {
    lines.push("- none");
  }

  lines.push("", "Queued jobs");

  if (queuedJobs.length > 0) {
    queuedJobs.forEach((job) => {
      lines.push(
        `- ${job.id}: ${job.title} [${job.status}] lane=${job.assigned_lane ?? "unassigned"} resources=${job.resource_keys.join(", ") || "none"}`,
      );
    });
  } else {
    lines.push("- none");
  }

  lines.push(
    "",
    "Instructions for the next Codex thread",
    "1. Open Builder and start in the Autonomy Inbox window.",
    "2. Read the active objectives and queued jobs before choosing work.",
    "3. Use Worker Lifecycle to sync your worker lane and Mission Board to claim or wait on overlapping task scopes.",
    "4. If a resource key or scope is already occupied, wait and publish a heartbeat instead of duplicating work.",
    "5. Report which inbox job or mission-board task you took, what remains blocked, and what the next helper thread should inspect.",
    "6. Treat this as manual operator-guided coordination, not as a self-prompting loop.",
  );

  return lines.join("\n");
}

function buildAutonomyDraftRecommendations({
  selectedWorkerId,
  unreadNotifications,
  staleBlockedJobCount,
  staleWorkerJobCount,
  refreshPendingJobCount,
  objectiveCount,
  queuedJobCount,
}: {
  selectedWorkerId: string | null;
  unreadNotifications: number;
  staleBlockedJobCount: number;
  staleWorkerJobCount: number;
  refreshPendingJobCount: number;
  objectiveCount: number;
  queuedJobCount: number;
}): AutonomyDraftRecommendation[] {
  const assignedLane = selectedWorkerId ?? "builder";
  const recommendations: AutonomyDraftRecommendation[] = [
    {
      id: "runtime-readability",
      label: "Improve runtime readability and inline guidance",
      detail: "Use this when runtime cards feel dense, long evidence text should stay collapsed by default, or new operators still need clearer step-by-step help affordances.",
      objective: {
        id: "builder-runtime-guidance",
        title: "Improve runtime readability and inline guidance",
        description: "Reduce dense runtime inspector walls, keep long evidence collapsed until requested, and make panel/window help markers obvious for inexperienced operators.",
        status: "active",
        priority: 180,
        targetScopes: "frontend/src/components, frontend/src/content, docs/APP-OPERATOR-GUIDE.md",
        successCriteria: "Runtime panels stay readable without overflow, long evidence is collapsed behind explicit dropdown disclosures, and visible info markers guide operators at the point of use.",
        ownerKind: "builder",
        metadataJson: JSON.stringify(
          {
            focus: "runtime-readability",
            requestedBy: "operator",
            selectedLane: assignedLane,
          },
          null,
          2,
        ),
      },
      job: {
        id: "job-audit-runtime-guidance",
        objectiveId: "builder-runtime-guidance",
        jobKind: "ui-runtime-review",
        title: "Audit runtime surfaces and load readability fixes",
        summary: "Inspect runtime overview and governance panels for overflow, missing inline guidance, and long text that should default to a collapsed disclosure.",
        status: "queued",
        assignedLane,
        resourceKeys: "runtime-overview, operator-guidance",
        dependsOn: "",
        inputPayloadJson: JSON.stringify(
          {
            focus: "runtime-readability",
            scope_paths: [
              "frontend/src/components",
              "frontend/src/content",
              "docs/APP-OPERATOR-GUIDE.md",
            ],
            recommended_checks: [
              "runtime overview overflow",
              "guide marker visibility",
              "collapsible long-form evidence",
            ],
          },
          null,
          2,
        ),
        maxRetries: 1,
      },
    },
  ];

  if (staleBlockedJobCount > 0 || staleWorkerJobCount > 0 || refreshPendingJobCount > 0) {
    recommendations.unshift({
      id: "coordination-recovery",
      label: "Recover stuck Builder coordination",
      detail: `Use current Builder signals to unblock stale work. Stale blockers: ${staleBlockedJobCount}, stale worker heartbeats: ${staleWorkerJobCount}, pending refresh requests: ${refreshPendingJobCount}.`,
      objective: {
        id: "builder-recover-stuck-coordination",
        title: "Recover stuck Builder coordination",
        description: "Clear stale blockers, refresh waiting lanes, and requeue helper work without duplicating scopes or losing current mission-control ownership.",
        status: "active",
        priority: 220,
        targetScopes: "frontend/src/components/workspaces, scripts/mission_control.py",
        successCriteria: "Blocked Builder jobs are either released, refreshed, or requeued with an explicit owner and the stale-thread signals return to a routine level.",
        ownerKind: "builder",
        metadataJson: JSON.stringify(
          {
            focus: "coordination-recovery",
            staleBlockedJobCount,
            staleWorkerJobCount,
            refreshPendingJobCount,
            selectedLane: assignedLane,
          },
          null,
          2,
        ),
      },
      job: {
        id: "job-recover-stuck-builder-coordination",
        objectiveId: "builder-recover-stuck-coordination",
        jobKind: "coordination-recovery",
        title: "Review stale Builder blockers and recover the next safe lane",
        summary: "Inspect stale blockers, pending refresh requests, and stale worker heartbeats, then choose whether to wait, ping refresh, or requeue the linked job.",
        status: "queued",
        assignedLane,
        resourceKeys: "builder-inbox, mission-board, worker-lifecycle",
        dependsOn: "",
        inputPayloadJson: JSON.stringify(
          {
            focus: "coordination-recovery",
            stale_blockers: staleBlockedJobCount,
            stale_worker_heartbeats: staleWorkerJobCount,
            refresh_pending: refreshPendingJobCount,
          },
          null,
          2,
        ),
        maxRetries: 2,
      },
    });
  }

  if (objectiveCount === 0 || queuedJobCount === 0 || unreadNotifications > 0) {
    recommendations.push({
      id: "builder-baseline",
      label: "Seed Builder inbox baseline",
      detail: unreadNotifications > 0
        ? `There are ${unreadNotifications} unread worker notification${unreadNotifications === 1 ? "" : "s"} and the inbox may need a clearer next-step objective.`
        : "Use this when Builder needs a clean baseline objective and a safe manual-thread check job instead of ad hoc prompts.",
      objective: {
        id: "builder-inbox-baseline",
        title: "Keep Builder inbox coordinated and operator-friendly",
        description: "Maintain a clean Builder inbox with bounded jobs, explicit ownership, and thread prompts that let new helper threads contribute safely.",
        status: "active",
        priority: 140,
        targetScopes: "frontend/src/components/workspaces, docs/APP-OPERATOR-GUIDE.md",
        successCriteria: "Builder shows at least one durable objective, the next helper job is ready to claim safely, and unread coordination follow-ups are acknowledged.",
        ownerKind: "builder",
        metadataJson: JSON.stringify(
          {
            focus: "builder-baseline",
            unreadNotifications,
            selectedLane: assignedLane,
          },
          null,
          2,
        ),
      },
      job: {
        id: "job-check-builder-inbox-baseline",
        objectiveId: "builder-inbox-baseline",
        jobKind: "manual-thread-check",
        title: "Check Builder inbox and claim the next safe slice",
        summary: "Open Builder, read the inbox and mission board, acknowledge unread coordination signals, and claim only the next safe scope for the selected lane.",
        status: "queued",
        assignedLane,
        resourceKeys: "builder-inbox, worker-lifecycle",
        dependsOn: "",
        inputPayloadJson: JSON.stringify(
          {
            focus: "builder-baseline",
            selected_lane: assignedLane,
            respect_existing_ownership: true,
          },
          null,
          2,
        ),
        maxRetries: 0,
      },
    });
  }

  return recommendations;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function parseOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getMissionTaskIdFromAutonomyJob(job: AutonomyJobRecord): string | null {
  const missionTaskId = job.output_payload["mission_control_task_id"];
  return typeof missionTaskId === "string" && missionTaskId.trim()
    ? missionTaskId.trim()
    : null;
}

function getLinkedWorkerIdFromAutonomyJob(job: AutonomyJobRecord): string | null {
  return parseOptionalString(job.output_payload["mission_control_claimed_by_worker_id"])
    ?? parseOptionalString(job.assigned_lane);
}

function getObservationHandledAt(observation: AutonomyObservationRecord): string | null {
  return parseOptionalString(observation.details["handled_at"]);
}

function getObservationHandledBy(observation: AutonomyObservationRecord): string | null {
  return parseOptionalString(observation.details["handled_by"]);
}

function getObservationLinkedJobId(observation: AutonomyObservationRecord): string | null {
  return parseOptionalString(observation.details["job_id"])
    ?? parseOptionalString(observation.source_ref);
}

function getHealingResolvedBy(action: AutonomyHealingActionRecord): string | null {
  return parseOptionalString(action.details["resolved_by"]);
}

function getHealingRefreshTarget(action: AutonomyHealingActionRecord): string | null {
  return parseOptionalString(action.details["refresh_target"])
    ?? parseOptionalString(action.details["notified_worker_id"]);
}

function getTerminalAttentionSignal(session: CodexControlTerminalSession): AutonomyJobAttentionSignal | null {
  if (session.status === "stopping") {
    return {
      id: `terminal-${session.session_id}-stopping`,
      label: "stop pending",
      tone: "warning",
      detail: `Stop requested${session.stop_requested_by ? ` by ${session.stop_requested_by}` : ""}.`,
    };
  }
  if (session.status === "running") {
    return {
      id: `terminal-${session.session_id}-running`,
      label: "live",
      tone: "success",
      detail: "This managed worker terminal is still running.",
    };
  }
  if (session.status === "stopped") {
    return {
      id: `terminal-${session.session_id}-stopped`,
      label: "stopped",
      tone: "neutral",
      detail: "This managed worker terminal was stopped by request.",
    };
  }
  return null;
}

function getRefreshRequestCountForJob(
  job: AutonomyJobRecord,
  notifications: CodexControlNotification[],
): number {
  const linkedWorkerId = getLinkedWorkerIdFromAutonomyJob(job);
  if (!linkedWorkerId) {
    return 0;
  }

  const missionTaskId = getMissionTaskIdFromAutonomyJob(job);
  return notifications.filter((notification) => (
    notification.status === "unread"
    && notification.kind === "refresh-request"
    && notification.worker_id === linkedWorkerId
    && (!missionTaskId || notification.task_id == null || notification.task_id === missionTaskId)
  )).length;
}

function buildAutonomyJobAttentionSignals(
  job: AutonomyJobRecord,
  workers: CodexControlWorker[],
  notifications: CodexControlNotification[],
): AutonomyJobAttentionSignal[] {
  const signals: AutonomyJobAttentionSignal[] = [];
  const linkedWorkerId = getLinkedWorkerIdFromAutonomyJob(job);
  const linkedWorker = linkedWorkerId
    ? workers.find((worker) => worker.worker_id === linkedWorkerId) ?? null
    : null;
  const jobAgeMinutes = getAgeMinutes(job.updated_at ?? job.started_at ?? job.created_at);
  const workerHeartbeatAgeMinutes = getAgeMinutes(linkedWorker?.last_seen_at ?? linkedWorker?.updated_at);
  const waiterStatus = parseOptionalString(job.output_payload["mission_control_waiter_status"]);
  const refreshRequestCount = getRefreshRequestCountForJob(job, notifications);

  if (job.status === "blocked" && jobAgeMinutes !== null && jobAgeMinutes >= STALE_BLOCKED_MINUTES) {
    signals.push({
      id: "stale-blocker",
      label: "stale blocker",
      tone: "warning",
      detail: `Blocked for ${formatAgeMinutes(jobAgeMinutes)} without a fresh state change.`,
    });
  }

  if (waiterStatus === "waiting") {
    signals.push({
      id: "waiting-on-owner",
      label: "waiting",
      tone: "neutral",
      detail: "This job is already parked on the linked mission-control task.",
    });
  }

  if (refreshRequestCount > 0) {
    signals.push({
      id: "refresh-pending",
      label: "refresh pending",
      tone: "info",
      detail: `${refreshRequestCount} unread refresh request${refreshRequestCount === 1 ? "" : "s"} already sent to ${linkedWorkerId ?? "the linked worker"}.`,
    });
  }

  if (
    linkedWorker
    && workerHeartbeatAgeMinutes !== null
    && workerHeartbeatAgeMinutes >= STALE_WORKER_HEARTBEAT_MINUTES
    && ["running", "blocked", "review"].includes(job.status)
  ) {
    signals.push({
      id: "worker-stale",
      label: "worker stale",
      tone: "warning",
      detail: `${linkedWorker.worker_id} heartbeat is ${formatAgeMinutes(workerHeartbeatAgeMinutes)} old.`,
    });
  }

  if (job.max_retries > 0 && job.retry_count >= job.max_retries && job.status === "blocked") {
    signals.push({
      id: "retry-budget-spent",
      label: "retry budget spent",
      tone: "warning",
      detail: `Retry count ${job.retry_count}/${job.max_retries} is already exhausted.`,
    });
  }

  return signals;
}

function getBranchPrefixFromAutonomyJob(job: AutonomyJobRecord): string | null {
  const branchPrefix = job.input_payload["branch_prefix"];
  if (typeof branchPrefix !== "string") {
    return null;
  }

  const trimmed = branchPrefix.trim();
  return trimmed ? trimmed : null;
}

function resolveAutonomyJobScopePaths(
  job: AutonomyJobRecord,
  objective: AutonomyObjectiveRecord | null,
): string[] {
  const inputPayloadScopes = parseStringArray(job.input_payload["scope_paths"]);
  if (inputPayloadScopes.length > 0) {
    return inputPayloadScopes;
  }

  if (job.resource_keys.length > 0) {
    return job.resource_keys;
  }

  return objective?.target_scopes ?? [];
}

function summarizeActionError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function buildLocalAutonomyRecordId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) {
    return `${prefix}-${uuid}`;
  }
  return `${prefix}-${Date.now()}`;
}

function toneStyle(kind: "neutral" | "success" | "warning" | "info"): CSSProperties {
  switch (kind) {
    case "success":
      return {
        background: "var(--app-success-bg)",
        border: "1px solid var(--app-success-border)",
        color: "var(--app-success-text)",
      };
    case "warning":
      return {
        background: "var(--app-warning-bg)",
        border: "1px solid var(--app-warning-border)",
        color: "var(--app-warning-text)",
      };
    case "info":
      return {
        background: "var(--app-accent-soft)",
        border: "1px solid var(--app-accent-strong)",
        color: "var(--app-text-color)",
      };
    case "neutral":
    default:
      return {
        background: "var(--app-panel-bg-muted)",
        border: "1px solid var(--app-panel-border)",
        color: "var(--app-text-color)",
      };
  }
}

function renderWorkerCard(worker: CodexControlWorker) {
  return (
    <article key={worker.worker_id} style={listCardStyle}>
      <div style={rowBetweenStyle}>
        <strong>{worker.display_name}</strong>
        <span style={{ ...pillStyle, ...toneStyle(worker.status === "active" ? "success" : "neutral") }}>
          {worker.status}
        </span>
      </div>
      <div style={metaStackStyle}>
        <span>Worker ID: <code>{worker.worker_id}</code></span>
        <span>Branch: <code>{worker.branch_name ?? "not assigned"}</code></span>
        <span>Task: <code>{worker.current_task_id ?? "idle"}</code></span>
        <span>Path: <code>{worker.worktree_path ?? "not assigned"}</code></span>
        {worker.summary ? <span>{worker.summary}</span> : null}
      </div>
    </article>
  );
}

function renderNotificationCard(notification: CodexControlNotification) {
  return (
    <article key={notification.notification_id} style={listCardStyle}>
      <div style={rowBetweenStyle}>
        <strong>{notification.kind}</strong>
        <span style={{ ...pillStyle, ...toneStyle(notification.status === "unread" ? "warning" : "neutral") }}>
          {notification.status}
        </span>
      </div>
      <div style={metaStackStyle}>
        <span>{notification.message}</span>
        <span>Worker: <code>{notification.worker_id}</code></span>
        <span>Task: <code>{notification.task_id ?? "n/a"}</code></span>
        <span>Created: {formatTimestamp(notification.created_at)}</span>
      </div>
    </article>
  );
}

function renderAutonomyObjectiveCard(objective: AutonomyObjectiveRecord) {
  return (
    <article key={objective.id} style={listCardStyle}>
      <div style={rowBetweenStyle}>
        <strong>{objective.title}</strong>
        <span style={{ ...pillStyle, ...toneStyle(pickStatusTone(objective.status)) }}>
          {objective.status}
        </span>
      </div>
      <div style={metaStackStyle}>
        <span>Objective ID: <code>{objective.id}</code></span>
        <span>Priority: {objective.priority}</span>
        <span>Owner: <code>{objective.owner_kind}</code></span>
        {objective.target_scopes.length > 0 ? (
          <span>Scopes: <code>{objective.target_scopes.join(", ")}</code></span>
        ) : null}
        <span>{objective.description}</span>
      </div>
    </article>
  );
}

function renderAutonomyJobCard(
  job: AutonomyJobRecord,
  attentionSignals: AutonomyJobAttentionSignal[] = [],
) {
  const missionTaskId = getMissionTaskIdFromAutonomyJob(job);
  const missionTaskStatus = typeof job.output_payload["mission_control_task_status"] === "string"
    ? String(job.output_payload["mission_control_task_status"])
    : null;
  const missionTaskOwner = typeof job.output_payload["mission_control_claimed_by_worker_id"] === "string"
    ? String(job.output_payload["mission_control_claimed_by_worker_id"])
    : null;
  return (
    <article key={job.id} style={listCardStyle}>
      <div style={rowBetweenStyle}>
        <strong>{job.title}</strong>
        <div style={statusRailStyle}>
          <span style={{ ...pillStyle, ...toneStyle(pickStatusTone(job.status)) }}>
            {job.status}
          </span>
          {attentionSignals.map((signal) => (
            <span key={signal.id} style={{ ...pillStyle, ...toneStyle(signal.tone) }} title={signal.detail}>
              {signal.label}
            </span>
          ))}
        </div>
      </div>
      <div style={metaStackStyle}>
        <span>Job ID: <code>{job.id}</code></span>
        <span>Kind: <code>{job.job_kind}</code></span>
        <span>Objective: <code>{job.objective_id ?? "none"}</code></span>
        <span>Lane: <code>{job.assigned_lane ?? "unassigned"}</code></span>
        <span>Linked task: <code>{missionTaskId ?? "not promoted"}</code></span>
        {missionTaskStatus ? <span>Linked task status: <code>{missionTaskStatus}</code></span> : null}
        {missionTaskOwner ? <span>Linked owner: <code>{missionTaskOwner}</code></span> : null}
        <span>Updated: {formatTimestamp(job.updated_at ?? job.started_at ?? job.created_at)}</span>
        <span>Retries: {job.retry_count}/{job.max_retries}</span>
        {job.resource_keys.length > 0 ? (
          <span>Resources: <code>{job.resource_keys.join(", ")}</code></span>
        ) : null}
        {job.depends_on.length > 0 ? (
          <span>Depends on: <code>{job.depends_on.join(", ")}</code></span>
        ) : null}
        {attentionSignals.length > 0 ? (
          <span>
            Attention: {attentionSignals.map((signal) => signal.detail).join(" ")}
          </span>
        ) : null}
        <span>{job.summary}</span>
        {job.last_error ? <span>Last error: {job.last_error}</span> : null}
      </div>
    </article>
  );
}

function renderAutonomyObservationCard(observation: AutonomyObservationRecord) {
  const handledAt = getObservationHandledAt(observation);
  const handledBy = getObservationHandledBy(observation);
  return (
    <article key={observation.id} style={listCardStyle}>
      <div style={rowBetweenStyle}>
        <strong>{observation.category}</strong>
        <span
          style={{
            ...pillStyle,
            ...toneStyle(handledAt ? "success" : pickSeverityTone(observation.severity)),
          }}
        >
          {handledAt ? "handled" : observation.severity}
        </span>
      </div>
      <div style={metaStackStyle}>
        <span>Observation ID: <code>{observation.id}</code></span>
        <span>Source: <code>{observation.source_kind}</code></span>
        <span>Ref: <code>{observation.source_ref ?? "n/a"}</code></span>
        {handledBy ? <span>Handled by: <code>{handledBy}</code></span> : null}
        {handledAt ? <span>Handled at: {formatTimestamp(handledAt)}</span> : null}
        <span>{observation.message}</span>
      </div>
    </article>
  );
}

function renderAutonomyHealingCard(action: AutonomyHealingActionRecord) {
  const refreshTarget = getHealingRefreshTarget(action);
  const resolvedBy = getHealingResolvedBy(action);
  return (
    <article key={action.id} style={listCardStyle}>
      <div style={rowBetweenStyle}>
        <strong>{action.action_kind}</strong>
        <span style={{ ...pillStyle, ...toneStyle(pickStatusTone(action.status)) }}>
          {action.status}
        </span>
      </div>
      <div style={metaStackStyle}>
        <span>Healing ID: <code>{action.id}</code></span>
        <span>Job: <code>{action.job_id ?? "n/a"}</code></span>
        <span>Observation: <code>{action.observation_id ?? "n/a"}</code></span>
        {refreshTarget ? <span>Refresh target: <code>{refreshTarget}</code></span> : null}
        {resolvedBy ? <span>Resolved by: <code>{resolvedBy}</code></span> : null}
        {action.resolved_at ? <span>Resolved at: {formatTimestamp(action.resolved_at)}</span> : null}
        <span>{action.summary}</span>
      </div>
    </article>
  );
}

function renderAutonomyMemoryCard(memory: AutonomyMemoryRecord) {
  return (
    <article key={memory.id} style={listCardStyle}>
      <div style={rowBetweenStyle}>
        <strong>{memory.title}</strong>
        <span style={{ ...pillStyle, ...toneStyle("neutral") }}>
          {memory.memory_kind}
        </span>
      </div>
      <div style={metaStackStyle}>
        <span>Memory ID: <code>{memory.id}</code></span>
        {memory.tags.length > 0 ? <span>Tags: <code>{memory.tags.join(", ")}</code></span> : null}
        <span>Confidence: {memory.confidence ?? "n/a"}</span>
        <span>{memory.content}</span>
      </div>
    </article>
  );
}

function renderTerminalSessionCard(session: CodexControlTerminalSession) {
  const attentionSignal = getTerminalAttentionSignal(session);
  return (
    <article key={session.session_id} style={listCardStyle}>
      <div style={rowBetweenStyle}>
        <strong>{session.label}</strong>
        <div style={statusRailStyle}>
          <span style={{ ...pillStyle, ...toneStyle(pickStatusTone(session.status)) }}>
            {session.status}
          </span>
          {attentionSignal ? (
            <span style={{ ...pillStyle, ...toneStyle(attentionSignal.tone) }} title={attentionSignal.detail}>
              {attentionSignal.label}
            </span>
          ) : null}
        </div>
      </div>
      <div style={metaStackStyle}>
        <span>Session ID: <code>{session.session_id}</code></span>
        <span>Worker: <code>{session.worker_id}</code></span>
        <span>Task: <code>{session.task_id ?? "n/a"}</code></span>
        <span>PID: <code>{session.pid ?? "n/a"}</code></span>
        <span>CWD: <code>{session.cwd}</code></span>
        <span>Command: <code>{session.command.join(" ")}</code></span>
        <span>Log: <code>{session.log_path}</code></span>
        <span>Updated: {formatTimestamp(session.updated_at)}</span>
        {session.stop_requested_at ? <span>Stop requested: {formatTimestamp(session.stop_requested_at)}</span> : null}
        {session.stop_reason ? <span>Stop reason: {session.stop_reason}</span> : null}
        {session.tail_preview.length > 0 ? (
          <pre style={terminalTailStyle}>{session.tail_preview.join("\n")}</pre>
        ) : (
          <span>No log lines captured yet.</span>
        )}
      </div>
    </article>
  );
}

export default function BuilderWorkspaceDesktop() {
  const { settings } = useSettings();
  const themeTokens = useThemeTokens();
  const [status, setStatus] = useState<CodexControlStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [laneDraft, setLaneDraft] = useState<LaneDraft>(INITIAL_LANE_DRAFT);
  const [laneSubmitting, setLaneSubmitting] = useState(false);
  const [laneError, setLaneError] = useState<string | null>(null);
  const [laneMessage, setLaneMessage] = useState<string | null>(null);

  const [taskDraft, setTaskDraft] = useState<TaskDraft>(INITIAL_TASK_DRAFT);
  const [taskSupersedeDraft, setTaskSupersedeDraft] = useState<TaskSupersedeDraft>(
    INITIAL_TASK_SUPERSEDE_DRAFT,
  );
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);

  const [workerSyncDraft, setWorkerSyncDraft] = useState<WorkerSyncDraft>(INITIAL_WORKER_SYNC_DRAFT);
  const [workerHeartbeatDraft, setWorkerHeartbeatDraft] = useState<WorkerHeartbeatDraft>(
    INITIAL_WORKER_HEARTBEAT_DRAFT,
  );
  const [loadedWorkerDraftReview, setLoadedWorkerDraftReview] = useState<LoadedWorkerDraftReview | null>(null);
  const [workerBusyLabel, setWorkerBusyLabel] = useState<string | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [workerMessage, setWorkerMessage] = useState<string | null>(null);
  const [handoffMessage, setHandoffMessage] = useState<string | null>(null);
  const [terminalDraft, setTerminalDraft] = useState<TerminalLaunchDraft>(INITIAL_TERMINAL_LAUNCH_DRAFT);
  const [terminalBusyLabel, setTerminalBusyLabel] = useState<string | null>(null);
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [terminalMessage, setTerminalMessage] = useState<string | null>(null);

  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [workerNotifications, setWorkerNotifications] = useState<CodexControlNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const [coordinationBusyLabel, setCoordinationBusyLabel] = useState<string | null>(null);
  const [coordinationError, setCoordinationError] = useState<string | null>(null);
  const [coordinationMessage, setCoordinationMessage] = useState<string | null>(null);

  const [autonomySummary, setAutonomySummary] = useState<AutonomySummaryResponse | null>(null);
  const [autonomyObjectives, setAutonomyObjectives] = useState<AutonomyObjectiveRecord[]>([]);
  const [autonomyJobs, setAutonomyJobs] = useState<AutonomyJobRecord[]>([]);
  const [autonomyObservations, setAutonomyObservations] = useState<AutonomyObservationRecord[]>([]);
  const [autonomyHealingActions, setAutonomyHealingActions] = useState<AutonomyHealingActionRecord[]>([]);
  const [autonomyMemories, setAutonomyMemories] = useState<AutonomyMemoryRecord[]>([]);
  const [autonomyLoading, setAutonomyLoading] = useState(true);
  const [autonomyBusyLabel, setAutonomyBusyLabel] = useState<string | null>(null);
  const [autonomyError, setAutonomyError] = useState<string | null>(null);
  const [autonomyMessage, setAutonomyMessage] = useState<string | null>(null);
  const [autonomyPromptMessage, setAutonomyPromptMessage] = useState<string | null>(null);
  const [objectiveDraft, setObjectiveDraft] = useState<AutonomyObjectiveDraft>(
    INITIAL_AUTONOMY_OBJECTIVE_DRAFT,
  );
  const [jobDraft, setJobDraft] = useState<AutonomyJobDraft>(INITIAL_AUTONOMY_JOB_DRAFT);
  const [loadedAutonomyRecommendation, setLoadedAutonomyRecommendation] =
    useState<AutonomyDraftRecommendation | null>(null);

  const workers = status?.board.workers ?? [];
  const tasks = status?.board.tasks ?? [];
  const waiters = status?.board.waiters ?? [];
  const terminalSessions = status?.board.terminal_sessions ?? [];
  const workerIdSet = new Set(workers.map((worker) => worker.worker_id));
  const selectedWorker = workers.find((worker) => worker.worker_id === selectedWorkerId) ?? null;
  const selectedWorkerTask = selectedWorker?.current_task_id
    ? tasks.find((task) => task.task_id === selectedWorker.current_task_id) ?? null
    : tasks.find((task) => task.claimed_by_worker_id === selectedWorkerId) ?? null;
  const selectedWorkerTerminals = terminalSessions.filter((session) => session.worker_id === selectedWorkerId);
  const selectedActiveTerminal = selectedWorkerTerminals.find((session) => session.status === "running" || session.status === "stopping") ?? null;
  const terminalLaunchLabel = terminalDraft.label.trim() || `${selectedWorkerId || "selected worker"} terminal`;
  const terminalLaunchCwd = terminalDraft.cwd.trim() || selectedWorker?.worktree_path || status?.repo_root || "not set";
  const terminalLaunchTaskId = terminalDraft.taskId.trim() || "not linked";
  const terminalLaunchCommandJson = terminalDraft.commandJson.trim() || "[]";
  const urgentInterruptWorkerReview = selectedWorkerId || "none selected";
  const urgentInterruptTaskReview = selectedWorkerTask?.task_id ?? "none";
  const urgentInterruptTerminalReview = selectedActiveTerminal?.session_id ?? "none";
  const urgentInterruptStopReview = selectedActiveTerminal
    ? `force-stop ${selectedActiveTerminal.session_id}`
    : "no active managed terminal to stop";
  const taskSupersedeScopeReview = taskSupersedeDraft.replacementScopePaths.trim() || "not set";
  const taskSupersedeBranchReview = taskSupersedeDraft.replacementBranchPrefix.trim() || "not set";
  const taskSupersedeReasonReview = taskSupersedeDraft.supersedeReason.trim() || "not set";
  const taskSupersedeStopReview = taskSupersedeDraft.stopActiveTerminal
    ? selectedActiveTerminal
      ? `yes (${selectedActiveTerminal.session_id})`
      : "yes (no active managed terminal selected)"
    : "no";
  const handoffPackage = buildWorkerHandoffPackage(
    status,
    selectedWorker,
    selectedWorkerTask,
    workerNotifications,
  );
  const autonomyThreadPrompt = buildAutonomyThreadPrompt(
    status,
    autonomySummary,
    autonomyObjectives,
    autonomyJobs,
  );
  const boardNotifications = status?.board.notifications ?? [];
  const unreadNotifications = status?.board.notifications.filter(
    (notification) => notification.status === "unread",
  ).length ?? 0;
  const autonomyJobEntries = autonomyJobs.map((job) => ({
    job,
    objective: autonomyObjectives.find((entry) => entry.id === job.objective_id) ?? null,
    attentionSignals: buildAutonomyJobAttentionSignals(job, workers, boardNotifications),
  }));
  const staleBlockedJobCount = autonomyJobEntries.filter((entry) => (
    entry.attentionSignals.some((signal) => signal.id === "stale-blocker")
  )).length;
  const refreshPendingJobCount = autonomyJobEntries.filter((entry) => (
    entry.attentionSignals.some((signal) => signal.id === "refresh-pending")
  )).length;
  const staleWorkerJobCount = autonomyJobEntries.filter((entry) => (
    entry.attentionSignals.some((signal) => signal.id === "worker-stale")
  )).length;
  const queuedAutonomyJobCount = autonomyJobs.filter((job) => job.status === "queued").length;
  const autonomyDraftRecommendations = buildAutonomyDraftRecommendations({
    selectedWorkerId,
    unreadNotifications,
    staleBlockedJobCount,
    staleWorkerJobCount,
    refreshPendingJobCount,
    objectiveCount: autonomyObjectives.length,
    queuedJobCount: queuedAutonomyJobCount,
  });
  const builderRecommendations = buildBuilderRecommendationDescriptors({
    missionControlAvailable: status?.mission_control_available ?? false,
    workerCount: workers.length,
    taskCount: tasks.length,
    waiterCount: waiters.filter((waiter) => waiter.status === "waiting").length,
    unreadNotificationCount: unreadNotifications,
    terminalSessionCount: terminalSessions.length,
    queuedAutonomyJobCount: queuedAutonomyJobCount,
    autonomyAttentionCount: staleBlockedJobCount + staleWorkerJobCount + refreshPendingJobCount,
  });

  async function refreshStatus() {
    setLoading(true);
    setError(null);
    try {
      const nextStatus = await fetchCodexControlStatus();
      setStatus(nextStatus);
      setLaneDraft((current) => (
        current.baseBranch
          ? current
          : { ...current, baseBranch: nextStatus.recommended_base_branch }
      ));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Builder status fetch failed.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshWorkerNotifications(workerId: string) {
    if (!workerId) {
      setWorkerNotifications([]);
      setNotificationsError(null);
      return;
    }

    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const response = await fetchCodexControlNotifications(workerId, true);
      setWorkerNotifications(response.notifications);
    } catch (notificationError) {
      setNotificationsError(
        notificationError instanceof Error
          ? notificationError.message
          : "Notification fetch failed.",
      );
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function refreshAutonomy() {
    setAutonomyLoading(true);
    setAutonomyError(null);
    try {
      const [
        nextSummary,
        nextObjectives,
        nextJobs,
        nextObservations,
        nextHealingActions,
        nextMemories,
      ] = await Promise.all([
        fetchAutonomySummary(),
        fetchAutonomyObjectives(),
        fetchAutonomyJobs(),
        fetchAutonomyObservations(),
        fetchAutonomyHealingActions(),
        fetchAutonomyMemories(),
      ]);

      setAutonomySummary(nextSummary);
      setAutonomyObjectives(nextObjectives);
      setAutonomyJobs(nextJobs);
      setAutonomyObservations(nextObservations);
      setAutonomyHealingActions(nextHealingActions);
      setAutonomyMemories(nextMemories);
      setJobDraft((current) => (
        current.objectiveId || nextObjectives.length === 0
          ? current
          : { ...current, objectiveId: nextObjectives[0]?.id ?? "" }
      ));
    } catch (refreshError) {
      setAutonomyError(
        refreshError instanceof Error ? refreshError.message : "Autonomy inbox fetch failed.",
      );
    } finally {
      setAutonomyLoading(false);
    }
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  useEffect(() => {
    void refreshAutonomy();
  }, []);

  useEffect(() => {
    if (!workers.length) {
      if (selectedWorkerId) {
        setSelectedWorkerId("");
      }
      return;
    }

    const currentStillExists = workers.some((worker) => worker.worker_id === selectedWorkerId);
    if (!selectedWorkerId || !currentStillExists) {
      setSelectedWorkerId(workers[0]?.worker_id ?? "");
    }
  }, [workers, selectedWorkerId]);

  useEffect(() => {
    void refreshWorkerNotifications(selectedWorkerId);
  }, [selectedWorkerId]);

  useEffect(() => {
    setWorkerSyncDraft(buildWorkerSyncDraft(selectedWorker, status));
    setWorkerHeartbeatDraft(buildWorkerHeartbeatDraft(selectedWorker));
    setHandoffMessage(null);
    setTerminalDraft((current) => {
      const selectedWorkerCwd = selectedWorker?.worktree_path ?? "";
      const repoRootFallback = status?.repo_root ?? "";
      const shouldUseWorkerCwd =
        Boolean(selectedWorkerCwd) && (!current.cwd || current.cwd === repoRootFallback);

      return {
        ...current,
        label: current.label || (selectedWorker ? `${selectedWorker.display_name} terminal` : ""),
        cwd: shouldUseWorkerCwd ? selectedWorkerCwd : current.cwd || repoRootFallback,
        taskId: current.taskId || selectedWorker?.current_task_id || "",
      };
    });
  }, [selectedWorker, status]);

  useEffect(() => {
    setJobDraft((current) => (
      current.assignedLane
        ? current
        : { ...current, assignedLane: selectedWorker?.worker_id ?? "builder" }
    ));
  }, [selectedWorker]);

  useEffect(() => {
    const sourceTaskId = selectedWorkerTask?.task_id ?? "";
    const sourceScopePaths = selectedWorkerTask?.scope_paths.join(", ") ?? "";
    const sourceBranchPrefix = selectedWorkerTask?.recommended_branch_prefix ?? "";
    const sourceTitle = selectedWorkerTask?.title ?? "";

    setTaskSupersedeDraft((current) => {
      if (current.sourceTaskId === sourceTaskId) {
        return current;
      }

      if (!sourceTaskId) {
        return INITIAL_TASK_SUPERSEDE_DRAFT;
      }

      return {
        sourceTaskId,
        replacementTitle: `Urgent override for ${sourceTitle}`,
        replacementSummary: `Preempt ${sourceTaskId} with a higher-priority Builder slice.`,
        replacementPriority: Math.max((selectedWorkerTask?.priority ?? 100) + 100, 200),
        replacementScopePaths: sourceScopePaths,
        replacementBranchPrefix: sourceBranchPrefix,
        supersedeReason: `Urgent higher-priority work preempted ${sourceTaskId}.`,
        stopActiveTerminal: true,
      };
    });
  }, [selectedWorkerTask]);

  async function handleLaneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLaneError(null);
    setLaneMessage(null);

    if (!laneDraft.workerId.trim()) {
      setLaneError("Worker ID is required before creating a lane.");
      return;
    }

    const request: CodexControlLaneCreateRequest = {
      worker_id: laneDraft.workerId.trim(),
      display_name: sanitizeOptional(laneDraft.displayName),
      agent_profile: sanitizeOptional(laneDraft.agentProfile),
      agent_runtime: sanitizeOptional(laneDraft.agentRuntime),
      agent_entrypoint: sanitizeOptional(laneDraft.agentEntrypoint),
      agent_access_notes: sanitizeOptional(laneDraft.agentAccessNotes),
      identity_notes: sanitizeOptional(laneDraft.identityNotes),
      personality_notes: sanitizeOptional(laneDraft.personalityNotes),
      soul_directive: sanitizeOptional(laneDraft.soulDirective),
      memory_notes: sanitizeOptional(laneDraft.memoryNotes),
      bootstrap_notes: sanitizeOptional(laneDraft.bootstrapNotes),
      capability_tags: parseCapabilityTags(laneDraft.capabilityTags),
      context_sources: parseScopePaths(laneDraft.contextSources),
      avatar_label: sanitizeOptional(laneDraft.avatarLabel),
      avatar_color: sanitizeOptional(laneDraft.avatarColor),
      avatar_uri: sanitizeOptional(laneDraft.avatarUri),
      branch_name: sanitizeOptional(laneDraft.branchName),
      worktree_path: sanitizeOptional(laneDraft.worktreePath),
      base_branch: sanitizeOptional(laneDraft.baseBranch),
      resume_notes: sanitizeOptional(laneDraft.resumeNotes),
      bootstrap: laneDraft.bootstrap,
    };

    setLaneSubmitting(true);
    try {
      const response = await createCodexControlLane(request);
      setLaneMessage(
        `Lane ready on ${response.worker.branch_name ?? "new branch"} at ${response.worktree_path}.`,
      );
      setLaneDraft((current) => ({
        ...current,
        branchName: response.worker.branch_name ?? current.branchName,
        worktreePath: response.worktree_path,
      }));
      await refreshStatus();
    } catch (submissionError) {
      setLaneError(submissionError instanceof Error ? submissionError.message : "Lane creation failed.");
    } finally {
      setLaneSubmitting(false);
    }
  }

  async function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTaskError(null);
    setTaskMessage(null);

    const scopePaths = parseScopePaths(taskDraft.scopePaths);
    if (!taskDraft.title.trim() || !taskDraft.summary.trim()) {
      setTaskError("Task title and summary are required before creating a coordination task.");
      return;
    }
    if (scopePaths.length === 0) {
      setTaskError("At least one comma-separated scope path is required.");
      return;
    }

    const request: CodexControlTaskCreateRequest = {
      title: taskDraft.title.trim(),
      summary: taskDraft.summary.trim(),
      priority: taskDraft.priority,
      branch_prefix: sanitizeOptional(taskDraft.branchPrefix),
      scope_paths: scopePaths,
    };

    setTaskSubmitting(true);
    try {
      const response = await createCodexControlTask(request);
      setTaskMessage(
        `Task ${response.task.task_id} is ready with scopes ${response.task.scope_paths.join(", ")}.`,
      );
      setTaskDraft(INITIAL_TASK_DRAFT);
      await refreshStatus();
    } catch (submissionError) {
      setTaskError(submissionError instanceof Error ? submissionError.message : "Task creation failed.");
    } finally {
      setTaskSubmitting(false);
    }
  }

  async function handleTaskSupersedeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedWorkerId) {
      setCoordinationError("Select a worker before superseding its current task.");
      return;
    }

    if (!selectedWorkerTask) {
      setCoordinationError("The selected worker does not have an active task to supersede.");
      return;
    }

    const replacementScopePaths = parseScopePaths(taskSupersedeDraft.replacementScopePaths);
    if (!taskSupersedeDraft.replacementTitle.trim() || !taskSupersedeDraft.replacementSummary.trim()) {
      setCoordinationError("Replacement title and summary are required before superseding a task.");
      return;
    }
    if (!taskSupersedeDraft.supersedeReason.trim()) {
      setCoordinationError("A supersede reason is required before interrupting the current task.");
      return;
    }
    if (replacementScopePaths.length === 0) {
      setCoordinationError("At least one replacement scope path is required for the urgent task.");
      return;
    }

    const request: CodexControlTaskSupersedeRequest = {
      worker_id: selectedWorkerId,
      replacement_title: taskSupersedeDraft.replacementTitle.trim(),
      replacement_summary: taskSupersedeDraft.replacementSummary.trim(),
      replacement_priority: taskSupersedeDraft.replacementPriority,
      replacement_scope_paths: replacementScopePaths,
      replacement_branch_prefix: sanitizeOptional(taskSupersedeDraft.replacementBranchPrefix),
      replacement_task_id: null,
      supersede_reason: taskSupersedeDraft.supersedeReason.trim(),
      requested_by: selectedWorkerId,
      stop_active_terminal: taskSupersedeDraft.stopActiveTerminal,
    };

    await runCoordinationAction("Superseding current task", async () => {
      const response = await supersedeCodexControlTask(selectedWorkerTask.task_id, request);
      const stoppedTerminalLabel = response.stopped_terminal_session?.session_id
        ? ` and stopped ${response.stopped_terminal_session.session_id}`
        : "";
      const notifiedWorkers = response.notified_workers.length
        ? ` Notified ${response.notified_workers.join(", ")}.`
        : "";
      setCoordinationMessage(
        `Superseded ${response.superseded_task.task_id} with urgent task ${response.replacement_task.task_id}${stoppedTerminalLabel}.${notifiedWorkers}`,
      );
    });
  }

  async function handleWorkerSyncSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkerError(null);
    setWorkerMessage(null);
    setHandoffMessage(null);

    if (!workerSyncDraft.workerId.trim()) {
      setWorkerError("Worker ID is required before syncing a worker lane.");
      return;
    }

    const request: CodexControlWorkerSyncRequest = {
      worker_id: workerSyncDraft.workerId.trim(),
      display_name: sanitizeOptional(workerSyncDraft.displayName),
      agent_profile: sanitizeOptional(workerSyncDraft.agentProfile),
      agent_runtime: sanitizeOptional(workerSyncDraft.agentRuntime),
      agent_entrypoint: sanitizeOptional(workerSyncDraft.agentEntrypoint),
      agent_access_notes: sanitizeOptional(workerSyncDraft.agentAccessNotes),
      identity_notes: sanitizeOptional(workerSyncDraft.identityNotes),
      personality_notes: sanitizeOptional(workerSyncDraft.personalityNotes),
      soul_directive: sanitizeOptional(workerSyncDraft.soulDirective),
      memory_notes: sanitizeOptional(workerSyncDraft.memoryNotes),
      bootstrap_notes: sanitizeOptional(workerSyncDraft.bootstrapNotes),
      capability_tags: parseCapabilityTags(workerSyncDraft.capabilityTags),
      context_sources: parseScopePaths(workerSyncDraft.contextSources),
      avatar_label: sanitizeOptional(workerSyncDraft.avatarLabel),
      avatar_color: sanitizeOptional(workerSyncDraft.avatarColor),
      avatar_uri: sanitizeOptional(workerSyncDraft.avatarUri),
      branch_name: sanitizeOptional(workerSyncDraft.branchName),
      worktree_path: sanitizeOptional(workerSyncDraft.worktreePath),
      base_branch: sanitizeOptional(workerSyncDraft.baseBranch),
      status: workerSyncDraft.status.trim() || "idle",
      summary: sanitizeOptional(workerSyncDraft.summary),
      resume_notes: sanitizeOptional(workerSyncDraft.resumeNotes),
    };

    setWorkerBusyLabel("Syncing worker");
    try {
      const response = await syncCodexControlWorker(request);
      setWorkerMessage(
        `Worker ${response.worker.worker_id} is now ${response.worker.status} on the shared board.`,
      );
      setSelectedWorkerId(response.worker.worker_id);
      await refreshStatus();
    } catch (submissionError) {
      setWorkerError(submissionError instanceof Error ? submissionError.message : "Worker sync failed.");
    } finally {
      setWorkerBusyLabel(null);
    }
  }

  async function handleWorkerHeartbeatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkerError(null);
    setWorkerMessage(null);
    setHandoffMessage(null);

    if (!selectedWorkerId) {
      setWorkerError("Select a worker before sending a heartbeat.");
      return;
    }

    const request: CodexControlWorkerHeartbeatRequest = {
      status: sanitizeOptional(workerHeartbeatDraft.status),
      summary: sanitizeOptional(workerHeartbeatDraft.summary),
      current_task_id: sanitizeOptional(workerHeartbeatDraft.currentTaskId),
      agent_profile: sanitizeOptional(workerHeartbeatDraft.agentProfile),
      agent_runtime: sanitizeOptional(workerHeartbeatDraft.agentRuntime),
      agent_entrypoint: sanitizeOptional(workerHeartbeatDraft.agentEntrypoint),
      agent_access_notes: sanitizeOptional(workerHeartbeatDraft.agentAccessNotes),
      identity_notes: sanitizeOptional(workerHeartbeatDraft.identityNotes),
      personality_notes: sanitizeOptional(workerHeartbeatDraft.personalityNotes),
      soul_directive: sanitizeOptional(workerHeartbeatDraft.soulDirective),
      memory_notes: sanitizeOptional(workerHeartbeatDraft.memoryNotes),
      bootstrap_notes: sanitizeOptional(workerHeartbeatDraft.bootstrapNotes),
      capability_tags: workerHeartbeatDraft.capabilityTags.trim()
        ? parseCapabilityTags(workerHeartbeatDraft.capabilityTags)
        : null,
      context_sources: workerHeartbeatDraft.contextSources.trim()
        ? parseScopePaths(workerHeartbeatDraft.contextSources)
        : null,
      avatar_label: sanitizeOptional(workerHeartbeatDraft.avatarLabel),
      avatar_color: sanitizeOptional(workerHeartbeatDraft.avatarColor),
      avatar_uri: sanitizeOptional(workerHeartbeatDraft.avatarUri),
      branch_name: sanitizeOptional(workerHeartbeatDraft.branchName),
      worktree_path: sanitizeOptional(workerHeartbeatDraft.worktreePath),
      base_branch: sanitizeOptional(workerHeartbeatDraft.baseBranch),
      resume_notes: sanitizeOptional(workerHeartbeatDraft.resumeNotes),
    };

    setWorkerBusyLabel("Sending heartbeat");
    try {
      const response = await heartbeatCodexControlWorker(selectedWorkerId, request);
      setWorkerMessage(
        `Heartbeat recorded for ${response.worker.worker_id} with status ${response.worker.status}.`,
      );
      await refreshStatus();
      await refreshWorkerNotifications(selectedWorkerId);
    } catch (submissionError) {
      setWorkerError(
        submissionError instanceof Error ? submissionError.message : "Worker heartbeat failed.",
      );
    } finally {
      setWorkerBusyLabel(null);
    }
  }

  function handleResetWorkerSyncDraft() {
    const nextDraft = buildWorkerSyncDraft(selectedWorker, status);
    setWorkerSyncDraft(nextDraft);
    setLoadedWorkerDraftReview({
      label: "Worker sync draft reloaded",
      changedFields: "Worker ID, display name, agent profile, avatar, capabilities, context sources, branch, worktree, base branch, status, summary, resume notes",
      workerId: nextDraft.workerId || "new worker lane",
      status: nextDraft.status || "idle",
      branchName: nextDraft.branchName || "none",
      worktreePath: nextDraft.worktreePath || "none",
      baseBranch: nextDraft.baseBranch || "none",
      agentProfile: nextDraft.agentProfile || "none",
      agentRuntime: nextDraft.agentRuntime || "none",
      agentEntrypoint: nextDraft.agentEntrypoint || "none",
      agentAccessNotes: nextDraft.agentAccessNotes || "none",
      identityNotes: nextDraft.identityNotes || "none",
      personalityNotes: nextDraft.personalityNotes || "none",
      soulDirective: nextDraft.soulDirective || "none",
      memoryNotes: nextDraft.memoryNotes || "none",
      bootstrapNotes: nextDraft.bootstrapNotes || "none",
      capabilityTags: nextDraft.capabilityTags || "none",
      contextSources: nextDraft.contextSources || "none",
      avatar: nextDraft.avatarUri || nextDraft.avatarLabel || "generated initials",
      summary: nextDraft.summary || "none",
      resumeNotes: nextDraft.resumeNotes || "none",
      safeMessage: "Nothing was written to mission control. Review the draft, then use Sync worker lane when ready.",
    });
  }

  function handleResetWorkerHeartbeatDraft() {
    const nextDraft = buildWorkerHeartbeatDraft(selectedWorker);
    setWorkerHeartbeatDraft(nextDraft);
    setLoadedWorkerDraftReview({
      label: "Heartbeat draft reloaded",
      changedFields: "Status, current task, profile, context, branch, worktree, base branch, summary",
      workerId: selectedWorkerId || "no worker selected",
      status: nextDraft.status || "keep current",
      branchName: nextDraft.branchName || "keep current",
      worktreePath: nextDraft.worktreePath || "keep current",
      baseBranch: nextDraft.baseBranch || "keep current",
      currentTaskId: nextDraft.currentTaskId || "keep current",
      agentProfile: nextDraft.agentProfile || "keep current",
      agentRuntime: nextDraft.agentRuntime || "keep current",
      agentEntrypoint: nextDraft.agentEntrypoint || "keep current",
      agentAccessNotes: nextDraft.agentAccessNotes || "keep current",
      identityNotes: nextDraft.identityNotes || "keep current",
      personalityNotes: nextDraft.personalityNotes || "keep current",
      soulDirective: nextDraft.soulDirective || "keep current",
      memoryNotes: nextDraft.memoryNotes || "keep current",
      bootstrapNotes: nextDraft.bootstrapNotes || "keep current",
      capabilityTags: nextDraft.capabilityTags || "keep current",
      contextSources: nextDraft.contextSources || "keep current",
      avatar: nextDraft.avatarUri || nextDraft.avatarLabel || "keep current",
      summary: nextDraft.summary || "keep current",
      resumeNotes: nextDraft.resumeNotes || "keep current",
      safeMessage: "Nothing was published. Review the draft, then use Send heartbeat when ready.",
    });
  }

  async function handleCopyHandoffPackage() {
    setWorkerError(null);
    setWorkerMessage(null);

    if (!selectedWorker) {
      setHandoffMessage("Select a worker first, then Builder will generate a concrete handoff package.");
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        setHandoffMessage("Clipboard write is unavailable here. Copy the handoff package from the text box below.");
        return;
      }
      await navigator.clipboard.writeText(handoffPackage);
      setHandoffMessage(`Copied the ${selectedWorker.worker_id} handoff package to the clipboard.`);
    } catch (clipboardError) {
      setHandoffMessage(
        clipboardError instanceof Error
          ? `Clipboard copy failed: ${clipboardError.message}`
          : "Clipboard copy failed. Copy the handoff package manually from the text box below.",
      );
    }
  }

  async function runTerminalAction(
    busyLabel: string,
    action: () => Promise<void>,
  ) {
    setTerminalBusyLabel(busyLabel);
    setTerminalError(null);
    setTerminalMessage(null);
    try {
      await action();
    } catch (actionError) {
      setTerminalError(
        actionError instanceof Error ? actionError.message : `${busyLabel} failed.`,
      );
    } finally {
      setTerminalBusyLabel(null);
    }
  }

  async function handleLaunchTerminalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWorkerId) {
      setTerminalError("Select a worker before launching a managed terminal.");
      return;
    }

    let command: string[];
    try {
      command = parseJsonStringArray(terminalDraft.commandJson, "Terminal command JSON");
    } catch (error) {
      setTerminalError(error instanceof Error ? error.message : "Terminal command JSON is invalid.");
      return;
    }

    const request: CodexControlTerminalLaunchRequest = {
      worker_id: selectedWorkerId,
      label: sanitizeOptional(terminalDraft.label) ?? `${selectedWorkerId} terminal`,
      command,
      cwd: sanitizeOptional(terminalDraft.cwd),
      task_id: sanitizeOptional(terminalDraft.taskId),
    };

    await runTerminalAction("Launching terminal", async () => {
      const response = await launchCodexControlTerminal(request);
      setTerminalMessage(
        `Managed terminal ${response.terminal_session.session_id} is now ${response.terminal_session.status}.`,
      );
      await refreshStatus();
    });
  }

  async function handleStopTerminal(
    session: CodexControlTerminalSession,
    options: { force: boolean },
  ) {
    const { force } = options;
    await runTerminalAction(force ? "Stopping terminal" : "Requesting stop", async () => {
      const request: CodexControlTerminalStopRequest = {
        requested_by: selectedWorkerId || "operator",
        reason: force
          ? "Urgent override requested from Builder."
          : "Operator requested a managed terminal stop from Builder.",
        force,
      };
      const response = await stopCodexControlTerminal(session.session_id, request);
      setTerminalMessage(
        `Managed terminal ${response.terminal_session.session_id} is now ${response.terminal_session.status}.`,
      );
      await refreshStatus();
    });
  }

  async function handleInterruptSelectedWorker() {
    if (!selectedWorkerId) {
      setTerminalError("Select a worker before sending an interrupt request.");
      return;
    }

    await runTerminalAction("Interrupting worker", async () => {
      const interruptTaskId = selectedWorkerTask?.task_id ?? selectedActiveTerminal?.task_id ?? null;

      if (selectedActiveTerminal) {
        await stopCodexControlTerminal(selectedActiveTerminal.session_id, {
          requested_by: selectedWorkerId,
          reason: "Urgent override requested from Builder.",
          force: true,
        });
      }

      const notificationRequest: CodexControlNotificationCreateRequest = {
        kind: "interrupt-request",
        message:
          "Urgent override requested from Builder. Stop current work, refresh the mission board, and wait for reassignment.",
        task_id: interruptTaskId,
      };
      await createCodexControlNotification(selectedWorkerId, notificationRequest);
      setTerminalMessage(
        selectedActiveTerminal
          ? `Stopped ${selectedActiveTerminal.session_id} and sent an interrupt request to ${selectedWorkerId}.`
          : `Sent an interrupt request to ${selectedWorkerId}.`,
      );
      await refreshStatus();
      await refreshWorkerNotifications(selectedWorkerId);
    });
  }

  async function handleAutonomyObjectiveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAutonomyError(null);
    setAutonomyMessage(null);
    setAutonomyPromptMessage(null);

    if (!objectiveDraft.id.trim() || !objectiveDraft.title.trim() || !objectiveDraft.description.trim()) {
      setAutonomyError("Objective ID, title, and description are required before adding an inbox objective.");
      return;
    }

    let metadata: Record<string, unknown>;
    try {
      metadata = parseJsonObject(objectiveDraft.metadataJson, "Objective metadata JSON");
    } catch (error) {
      setAutonomyError(error instanceof Error ? error.message : "Objective metadata JSON is invalid.");
      return;
    }

    const request: AutonomyObjectiveCreateRequest = {
      id: objectiveDraft.id.trim(),
      title: objectiveDraft.title.trim(),
      description: objectiveDraft.description.trim(),
      status: objectiveDraft.status.trim() || "active",
      priority: objectiveDraft.priority,
      target_scopes: parseScopePaths(objectiveDraft.targetScopes),
      success_criteria: parseScopePaths(objectiveDraft.successCriteria),
      owner_kind: objectiveDraft.ownerKind.trim() || "builder",
      metadata,
    };

    setAutonomyBusyLabel("Creating objective");
    try {
      const response = await createAutonomyObjective(request);
      setAutonomyMessage(`Objective ${response.id} is now available in the Builder inbox.`);
      setObjectiveDraft(INITIAL_AUTONOMY_OBJECTIVE_DRAFT);
      await refreshAutonomy();
    } catch (submissionError) {
      setAutonomyError(
        submissionError instanceof Error ? submissionError.message : "Autonomy objective creation failed.",
      );
    } finally {
      setAutonomyBusyLabel(null);
    }
  }

  async function handleAutonomyJobSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAutonomyError(null);
    setAutonomyMessage(null);
    setAutonomyPromptMessage(null);

    if (!jobDraft.id.trim() || !jobDraft.jobKind.trim() || !jobDraft.title.trim() || !jobDraft.summary.trim()) {
      setAutonomyError("Job ID, kind, title, and summary are required before adding an inbox job.");
      return;
    }

    let inputPayload: Record<string, unknown>;
    try {
      inputPayload = parseJsonObject(jobDraft.inputPayloadJson, "Job input payload JSON");
    } catch (error) {
      setAutonomyError(error instanceof Error ? error.message : "Job input payload JSON is invalid.");
      return;
    }

    const request: AutonomyJobCreateRequest = {
      id: jobDraft.id.trim(),
      objective_id: sanitizeOptional(jobDraft.objectiveId),
      job_kind: jobDraft.jobKind.trim(),
      title: jobDraft.title.trim(),
      summary: jobDraft.summary.trim(),
      status: jobDraft.status.trim() || "queued",
      assigned_lane: sanitizeOptional(jobDraft.assignedLane),
      resource_keys: parseScopePaths(jobDraft.resourceKeys),
      depends_on: parseScopePaths(jobDraft.dependsOn),
      input_payload: inputPayload,
      output_payload: {},
      retry_count: 0,
      max_retries: jobDraft.maxRetries,
      last_error: null,
    };

    setAutonomyBusyLabel("Creating job");
    try {
      const response = await createAutonomyJob(request);
      setAutonomyMessage(`Inbox job ${response.id} is queued for manual thread pickup.`);
      setJobDraft((current) => ({
        ...INITIAL_AUTONOMY_JOB_DRAFT,
        objectiveId: current.objectiveId,
        assignedLane: current.assignedLane,
      }));
      await refreshAutonomy();
    } catch (submissionError) {
      setAutonomyError(
        submissionError instanceof Error ? submissionError.message : "Autonomy job creation failed.",
      );
    } finally {
      setAutonomyBusyLabel(null);
    }
  }

  function handleLoadAutonomyRecommendation(recommendation: AutonomyDraftRecommendation) {
    setAutonomyError(null);
    setAutonomyPromptMessage(null);
    setObjectiveDraft(recommendation.objective);
    setJobDraft(recommendation.job);
    setLoadedAutonomyRecommendation(recommendation);
    setAutonomyMessage(`Loaded recommended drafts for ${recommendation.label}.`);
  }

  async function handleCopyAutonomyThreadPrompt() {
    setAutonomyError(null);
    setAutonomyMessage(null);

    try {
      if (!navigator.clipboard?.writeText) {
        setAutonomyPromptMessage("Clipboard write is unavailable here. Copy the inbox prompt from the text box below.");
        return;
      }
      await navigator.clipboard.writeText(autonomyThreadPrompt);
      setAutonomyPromptMessage("Copied the Builder inbox-check prompt to the clipboard.");
    } catch (clipboardError) {
      setAutonomyPromptMessage(
        clipboardError instanceof Error
          ? `Clipboard copy failed: ${clipboardError.message}`
          : "Clipboard copy failed. Copy the inbox prompt manually from the text box below.",
      );
    }
  }

  async function runAutonomyAction(
    label: string,
    action: () => Promise<void>,
  ) {
    setAutonomyBusyLabel(label);
    setAutonomyError(null);
    setAutonomyMessage(null);
    setAutonomyPromptMessage(null);
    try {
      await action();
      await refreshAutonomy();
    } catch (actionError) {
      await refreshAutonomy().catch(() => undefined);
      setAutonomyError(
        summarizeActionError(actionError, `${label} failed.`),
      );
    } finally {
      setAutonomyBusyLabel(null);
    }
  }

  async function recordAutonomyJobFailure(
    job: AutonomyJobRecord,
    options: {
      actionLabel: string;
      failureStage: string;
      error: unknown;
      scopePaths: string[];
      missionTaskId?: string | null;
      missionTaskStatus?: string | null;
      boardJsonPath?: string | null;
      boardTextPath?: string | null;
      claimedByWorkerId?: string | null;
    },
  ) {
    const timestamp = new Date().toISOString();
    const errorMessage = summarizeActionError(options.error, `${options.actionLabel} failed.`);
    const existingMissionTaskId = getMissionTaskIdFromAutonomyJob(job);
    const existingMissionTaskStatus = typeof job.output_payload["mission_control_task_status"] === "string"
      ? String(job.output_payload["mission_control_task_status"])
      : null;
    const existingClaimedByWorkerId = typeof job.output_payload["mission_control_claimed_by_worker_id"] === "string"
      ? String(job.output_payload["mission_control_claimed_by_worker_id"])
      : null;
    const existingScopePaths = parseStringArray(job.output_payload["mission_control_scope_paths"]);
    const boardJsonPath = options.boardJsonPath
      ?? (typeof job.output_payload["mission_control_board_json_path"] === "string"
        ? String(job.output_payload["mission_control_board_json_path"])
        : null);
    const boardTextPath = options.boardTextPath
      ?? (typeof job.output_payload["mission_control_board_text_path"] === "string"
        ? String(job.output_payload["mission_control_board_text_path"])
        : null);
    const observationId = buildLocalAutonomyRecordId("autonomy-observation");
    const healingActionId = buildLocalAutonomyRecordId("autonomy-healing");
    const resolvedMissionTaskId = options.missionTaskId ?? existingMissionTaskId;
    const resolvedMissionTaskStatus = options.missionTaskStatus ?? existingMissionTaskStatus;
    const resolvedClaimedByWorkerId = options.claimedByWorkerId ?? existingClaimedByWorkerId;
    const resolvedScopePaths = options.scopePaths.length > 0 ? options.scopePaths : existingScopePaths;
    const failureDetails: Record<string, unknown> = {
      action_label: options.actionLabel,
      failure_stage: options.failureStage,
      error_message: errorMessage,
      captured_at: timestamp,
      job_id: job.id,
      objective_id: job.objective_id ?? null,
      selected_worker_id: selectedWorkerId || null,
      mission_control_task_id: resolvedMissionTaskId,
      mission_control_task_status: resolvedMissionTaskStatus,
      mission_control_claimed_by_worker_id: resolvedClaimedByWorkerId,
      mission_control_scope_paths: resolvedScopePaths,
      mission_control_board_json_path: boardJsonPath,
      mission_control_board_text_path: boardTextPath,
      retry_count_before_failure: job.retry_count,
    };

    let recordedObservationId: string | null;

    try {
      const observationRequest: AutonomyObservationCreateRequest = {
        id: observationId,
        source_kind: "builder-autonomy-job",
        source_ref: job.id,
        category: "mission-control-promotion",
        severity: "warning",
        message: `${options.actionLabel} failed for ${job.id}: ${errorMessage}`,
        details: failureDetails,
      };
      const observation = await createAutonomyObservation(observationRequest);
      recordedObservationId = observation.id;
    } catch {
      recordedObservationId = null;
    }

    try {
      const healingActionRequest: AutonomyHealingActionCreateRequest = {
        id: healingActionId,
        observation_id: recordedObservationId,
        job_id: job.id,
        action_kind: "operator-retry",
        summary: `Review ${job.id} and retry the Builder promotion flow after clearing the blocker.`,
        status: "proposed",
        details: {
          ...failureDetails,
          recommended_next_step: resolvedMissionTaskId
            ? "Inspect linked mission-board ownership and retry the Builder claim or sync step."
            : "Inspect Builder scope paths and mission-control availability, then retry promotion.",
        },
      };
      await createAutonomyHealingAction(healingActionRequest);
    } catch {
      // Best-effort only. The original promotion error should remain the UI-visible failure.
    }

    try {
      await updateAutonomyJob(job.id, {
        status: "blocked",
        assigned_lane: selectedWorkerId || job.assigned_lane || null,
        retry_count: job.retry_count + 1,
        output_payload: {
          ...job.output_payload,
          mission_control_task_id: resolvedMissionTaskId,
          mission_control_task_status: resolvedMissionTaskStatus,
          mission_control_scope_paths: resolvedScopePaths,
          mission_control_board_json_path: boardJsonPath,
          mission_control_board_text_path: boardTextPath,
          mission_control_claimed_by_worker_id: resolvedClaimedByWorkerId,
          builder_last_failure_at: timestamp,
          builder_last_failure_stage: options.failureStage,
          builder_last_failure_observation_id: recordedObservationId,
          builder_last_failure_healing_action_id: healingActionId,
          builder_last_failure_action_label: options.actionLabel,
        },
        last_error: errorMessage,
      });
    } catch {
      // The failure artifacts are supplemental; do not replace the original action error if this patch fails.
    }
  }

  function resolveNotificationTargetWorkerId(candidate: string | null | undefined): string | null {
    if (!candidate) {
      return null;
    }
    return workerIdSet.has(candidate) ? candidate : null;
  }

  async function sendRefreshPing(options: {
    workerId: string;
    jobId?: string | null;
    taskId?: string | null;
    message: string;
  }) {
    const request: CodexControlNotificationCreateRequest = {
      kind: "refresh-request",
      message: options.message,
      task_id: options.taskId ?? null,
    };
    await createCodexControlNotification(options.workerId, request);
    if (options.workerId === selectedWorkerId) {
      await refreshWorkerNotifications(options.workerId);
    }
    setAutonomyMessage(
      options.jobId
        ? `Sent a refresh ping to ${options.workerId} for ${options.jobId}.`
        : `Sent a refresh ping to ${options.workerId}.`,
    );
  }

  async function handleAutonomyJobStatusPatch(
    job: AutonomyJobRecord,
    nextStatus: "running" | "blocked" | "succeeded",
  ) {
    await runAutonomyAction(`Updating ${job.id}`, async () => {
      const request: AutonomyJobUpdateRequest = {
        status: nextStatus,
        assigned_lane: selectedWorkerId || job.assigned_lane || null,
        output_payload: {
          ...job.output_payload,
          builder_status_updated_at: new Date().toISOString(),
          builder_status_updated_to: nextStatus,
        },
        last_error: nextStatus === "blocked"
          ? "Waiting on mission-control ownership, resources, or operator follow-through."
          : null,
      };

      await updateAutonomyJob(job.id, request);
      setAutonomyMessage(`Inbox job ${job.id} is now ${nextStatus}.`);
    });
  }

  async function handlePromoteAutonomyJob(job: AutonomyJobRecord) {
    await runAutonomyAction(`Promoting ${job.id}`, async () => {
      const objective = autonomyObjectives.find((entry) => entry.id === job.objective_id) ?? null;
      const scopePaths = resolveAutonomyJobScopePaths(job, objective);
      let missionTaskId = getMissionTaskIdFromAutonomyJob(job);
      let missionTaskStatus = typeof job.output_payload["mission_control_task_status"] === "string"
        ? String(job.output_payload["mission_control_task_status"])
        : "pending";
      let boardJsonPath = typeof job.output_payload["mission_control_board_json_path"] === "string"
        ? String(job.output_payload["mission_control_board_json_path"])
        : null;
      let boardTextPath = typeof job.output_payload["mission_control_board_text_path"] === "string"
        ? String(job.output_payload["mission_control_board_text_path"])
        : null;
      let claimedByWorkerId = typeof job.output_payload["mission_control_claimed_by_worker_id"] === "string"
        ? String(job.output_payload["mission_control_claimed_by_worker_id"])
        : null;
      let failureStage = missionTaskId ? "claim-task" : "create-task";

      try {
        if (!missionTaskId) {
          if (scopePaths.length === 0) {
            throw new Error(
              `Inbox job ${job.id} cannot be promoted yet because it has no scope paths, resource keys, or linked objective target scopes.`,
            );
          }

          const createResponse = await createCodexControlTask({
            title: job.title,
            summary: job.summary,
            priority: objective?.priority ?? 100,
            branch_prefix: getBranchPrefixFromAutonomyJob(job),
            scope_paths: scopePaths,
          });
          missionTaskId = createResponse.task.task_id;
          missionTaskStatus = createResponse.task.status;
          boardJsonPath = createResponse.board_json_path ?? null;
          boardTextPath = createResponse.board_text_path ?? null;
        }

        if (selectedWorkerId) {
          failureStage = "claim-task";
          const claimResponse = await claimCodexControlTask(missionTaskId, {
            worker_id: selectedWorkerId,
          });
          missionTaskStatus = claimResponse.task.status;
          claimedByWorkerId = claimResponse.task.claimed_by_worker_id ?? selectedWorkerId;
          boardJsonPath = claimResponse.board_json_path ?? boardJsonPath;
          boardTextPath = claimResponse.board_text_path ?? boardTextPath;
        }

        failureStage = "update-job";
        await updateAutonomyJob(job.id, {
          status: selectedWorkerId ? "running" : job.status,
          assigned_lane: selectedWorkerId || job.assigned_lane || null,
          output_payload: {
            ...job.output_payload,
            mission_control_task_id: missionTaskId,
            mission_control_task_status: missionTaskStatus,
            mission_control_scope_paths: scopePaths,
            mission_control_board_json_path: boardJsonPath,
            mission_control_board_text_path: boardTextPath,
            mission_control_claimed_by_worker_id: claimedByWorkerId,
            promoted_from_builder_at: new Date().toISOString(),
          },
          last_error: null,
        });

        await refreshStatus();
        if (selectedWorkerId) {
          await refreshWorkerNotifications(selectedWorkerId);
        }

        setAutonomyMessage(
          selectedWorkerId
            ? `Promoted ${job.id} to mission task ${missionTaskId} and claimed it for ${selectedWorkerId}.`
            : `Promoted ${job.id} to mission task ${missionTaskId}. Select a worker to claim it from Builder.`,
        );
      } catch (promotionError) {
        await recordAutonomyJobFailure(job, {
          actionLabel: `Promoting ${job.id}`,
          failureStage,
          error: promotionError,
          scopePaths,
          missionTaskId,
          missionTaskStatus,
          boardJsonPath,
          boardTextPath,
          claimedByWorkerId,
        });
        throw promotionError;
      }
    });
  }

  async function handleWaitAutonomyJob(job: AutonomyJobRecord) {
    await runAutonomyAction(`Waiting on ${job.id}`, async () => {
      const missionTaskId = getMissionTaskIdFromAutonomyJob(job);
      if (!missionTaskId) {
        throw new Error(`Inbox job ${job.id} does not have a linked mission task yet.`);
      }
      if (!selectedWorkerId) {
        throw new Error("Select a worker before registering a wait on a linked mission task.");
      }

      const waitReason = `Builder inbox job ${job.id} is waiting on linked task ${missionTaskId} until ownership or overlapping scope clears.`;
      const waitResponse = await waitForCodexControlTask(missionTaskId, {
        worker_id: selectedWorkerId,
        reason: waitReason,
      });
      const missionTaskStatus = typeof job.output_payload["mission_control_task_status"] === "string"
        ? String(job.output_payload["mission_control_task_status"])
        : "waiting";

      await updateAutonomyJob(job.id, {
        status: "blocked",
        assigned_lane: selectedWorkerId,
        output_payload: {
          ...job.output_payload,
          mission_control_task_id: missionTaskId,
          mission_control_task_status: missionTaskStatus,
          mission_control_waiter_id: waitResponse.waiter.waiter_id,
          mission_control_waiter_status: waitResponse.waiter.status,
          mission_control_wait_reason: waitResponse.waiter.reason,
          mission_control_wait_registered_at: new Date().toISOString(),
          mission_control_board_json_path: waitResponse.board_json_path ?? null,
          mission_control_board_text_path: waitResponse.board_text_path ?? null,
        },
        last_error: waitReason,
      });

      await refreshStatus();
      await refreshWorkerNotifications(selectedWorkerId);
      setAutonomyMessage(
        `Registered waiter ${waitResponse.waiter.waiter_id} on linked mission task ${missionTaskId} and marked ${job.id} blocked.`,
      );
    });
  }

  async function handlePingAutonomyJobRefresh(job: AutonomyJobRecord) {
    await runAutonomyAction(`Pinging ${job.id}`, async () => {
      const missionTaskId = getMissionTaskIdFromAutonomyJob(job);
      const targetWorkerId = resolveNotificationTargetWorkerId(
        selectedWorkerId || getLinkedWorkerIdFromAutonomyJob(job),
      );

      if (!targetWorkerId) {
        throw new Error(
          "Select a valid worker lane before sending a refresh ping for this Builder inbox job.",
        );
      }

      await sendRefreshPing({
        workerId: targetWorkerId,
        jobId: job.id,
        taskId: missionTaskId,
        message: missionTaskId
          ? `Builder requested a refresh for inbox job ${job.id}. Re-check linked task ${missionTaskId} and your lane status.`
          : `Builder requested a refresh for inbox job ${job.id}. Re-check the inbox state and your lane status.`,
      });
    });
  }

  async function handleReleaseAutonomyJob(job: AutonomyJobRecord) {
    await runAutonomyAction(`Releasing ${job.id}`, async () => {
      const missionTaskId = getMissionTaskIdFromAutonomyJob(job);
      if (!missionTaskId) {
        throw new Error(`Inbox job ${job.id} does not have a linked mission task yet.`);
      }
      if (!selectedWorkerId) {
        throw new Error("Select a worker before releasing a linked mission task from Builder.");
      }

      const releaseResponse = await releaseCodexControlTask(missionTaskId, {
        worker_id: selectedWorkerId,
      });

      await updateAutonomyJob(job.id, {
        status: "queued",
        assigned_lane: null,
        output_payload: {
          ...job.output_payload,
          mission_control_task_id: missionTaskId,
          mission_control_task_status: releaseResponse.task.status,
          mission_control_board_json_path: releaseResponse.board_json_path ?? null,
          mission_control_board_text_path: releaseResponse.board_text_path ?? null,
          mission_control_claimed_by_worker_id: releaseResponse.task.claimed_by_worker_id ?? null,
          mission_control_released_at: new Date().toISOString(),
        },
        last_error: null,
      });

      await refreshStatus();
      await refreshWorkerNotifications(selectedWorkerId);
      setAutonomyMessage(`Released linked mission task ${missionTaskId} and returned ${job.id} to queued.`);
    });
  }

  async function handleMarkObservationHandled(observation: AutonomyObservationRecord) {
    await runAutonomyAction(`Handling ${observation.id}`, async () => {
      const handledAt = new Date().toISOString();
      const request: AutonomyObservationUpdateRequest = {
        message: observation.message,
        details: {
          ...observation.details,
          handled_at: handledAt,
          handled_by: selectedWorkerId || "operator",
          handled_via: "builder-autonomy-inbox",
        },
      };
      await updateAutonomyObservation(observation.id, request);
      setAutonomyMessage(`Marked observation ${observation.id} as handled.`);
    });
  }

  async function handleResolveHealingAction(action: AutonomyHealingActionRecord) {
    await runAutonomyAction(`Resolving ${action.id}`, async () => {
      const resolvedAt = new Date().toISOString();
      const request: AutonomyHealingActionUpdateRequest = {
        status: "succeeded",
        details: {
          ...action.details,
          resolved_by: selectedWorkerId || "operator",
          resolved_via: "builder-autonomy-inbox",
          resolved_note: "The blocker was cleared and Builder queued a refresh/retry handoff.",
        },
      };
      await updateAutonomyHealingAction(action.id, request);

      let linkedJob: AutonomyJobRecord | null = null;
      if (action.job_id) {
        linkedJob = autonomyJobs.find((job) => job.id === action.job_id) ?? null;
      }

      if (linkedJob) {
        const missionTaskId = getMissionTaskIdFromAutonomyJob(linkedJob);
        await updateAutonomyJob(linkedJob.id, {
          status: "queued",
          assigned_lane: null,
          output_payload: {
            ...linkedJob.output_payload,
            builder_unblocked_at: resolvedAt,
            builder_last_healing_action_id: action.id,
            builder_last_healing_resolved_by: selectedWorkerId || "operator",
          },
          last_error: null,
        });

        const pingTarget = resolveNotificationTargetWorkerId(
          selectedWorkerId || getLinkedWorkerIdFromAutonomyJob(linkedJob) || getHealingRefreshTarget(action),
        );
        if (pingTarget) {
          await sendRefreshPing({
            workerId: pingTarget,
            jobId: linkedJob.id,
            taskId: missionTaskId,
            message: missionTaskId
              ? `Builder cleared the blocker for inbox job ${linkedJob.id}. Refresh your lane and re-check linked task ${missionTaskId}.`
              : `Builder cleared the blocker for inbox job ${linkedJob.id}. Refresh your lane and re-check the Builder inbox.`,
          });
          await updateAutonomyHealingAction(action.id, {
            status: "succeeded",
            details: {
              ...action.details,
              resolved_by: selectedWorkerId || "operator",
              resolved_via: "builder-autonomy-inbox",
              resolved_note: "The blocker was cleared and Builder queued a refresh/retry handoff.",
              notified_worker_id: pingTarget,
              notified_at: new Date().toISOString(),
            },
          });
        }
      }

      setAutonomyMessage(
        action.job_id
          ? `Resolved healing action ${action.id} and re-queued ${action.job_id} for another safe pass.`
          : `Resolved healing action ${action.id}.`,
      );
    });
  }

  async function handleCompleteAutonomyJob(job: AutonomyJobRecord) {
    await runAutonomyAction(`Completing ${job.id}`, async () => {
      const missionTaskId = getMissionTaskIdFromAutonomyJob(job);
      if (!missionTaskId) {
        throw new Error(`Inbox job ${job.id} does not have a linked mission task yet.`);
      }
      if (!selectedWorkerId) {
        throw new Error("Select a worker before completing a linked mission task from Builder.");
      }

      const completeResponse = await completeCodexControlTask(missionTaskId, {
        worker_id: selectedWorkerId,
      });

      await updateAutonomyJob(job.id, {
        status: "succeeded",
        assigned_lane: selectedWorkerId,
        output_payload: {
          ...job.output_payload,
          mission_control_task_id: missionTaskId,
          mission_control_task_status: completeResponse.task.status,
          mission_control_completed_at: new Date().toISOString(),
          mission_control_board_json_path: completeResponse.board_json_path ?? null,
          mission_control_board_text_path: completeResponse.board_text_path ?? null,
          mission_control_claimed_by_worker_id: selectedWorkerId,
        },
        last_error: null,
      });

      await refreshStatus();
      await refreshWorkerNotifications(selectedWorkerId);
      setAutonomyMessage(`Completed linked mission task ${missionTaskId} and marked ${job.id} as succeeded.`);
    });
  }

  async function runCoordinationAction(
    label: string,
    action: () => Promise<void>,
  ) {
    setCoordinationBusyLabel(label);
    setCoordinationError(null);
    setCoordinationMessage(null);
    try {
      await action();
      await refreshStatus();
      await refreshWorkerNotifications(selectedWorkerId);
    } catch (actionError) {
      setCoordinationError(
        actionError instanceof Error ? actionError.message : `${label} failed.`,
      );
    } finally {
      setCoordinationBusyLabel(null);
    }
  }

  async function handleNextTask(mode: "inspect" | "claim" | "wait") {
    if (!selectedWorkerId) {
      setCoordinationError("Select a worker before asking for the next task.");
      return;
    }

    await runCoordinationAction(
      mode === "inspect"
        ? "Checking next task"
        : mode === "claim"
          ? "Claiming next task"
          : "Registering wait",
      async () => {
        const response = await fetchCodexControlNextTask({
          worker_id: selectedWorkerId,
          claim: mode === "claim",
          wait: mode === "wait",
          wait_reason: mode === "wait"
            ? "waiting for overlapping scope/resource to clear"
            : null,
        });

        if (response.task) {
          if (response.decision === "claimed") {
            setCoordinationMessage(`Worker ${selectedWorkerId} claimed ${response.task.task_id}.`);
            return;
          }
          if (response.decision === "waiting" && response.waiter) {
            setCoordinationMessage(
              `Worker ${selectedWorkerId} is waiting on ${response.task.task_id} as waiter ${response.waiter.waiter_id}.`,
            );
            return;
          }
          setCoordinationMessage(
            `Next-task decision: ${response.decision} for ${response.task.task_id}.`,
          );
          return;
        }

        setCoordinationMessage(`Next-task decision: ${response.decision}.`);
      },
    );
  }

  async function handleTaskAction(
    task: CodexControlTask,
    action: "claim" | "release" | "complete" | "wait",
  ) {
    if (!selectedWorkerId) {
      setCoordinationError("Select a worker before changing task ownership.");
      return;
    }

    await runCoordinationAction(
      `${action} ${task.task_id}`,
      async () => {
        if (action === "claim") {
          const response = await claimCodexControlTask(task.task_id, {
            worker_id: selectedWorkerId,
          });
          setCoordinationMessage(`Claimed ${response.task.task_id} for ${selectedWorkerId}.`);
          return;
        }

        if (action === "release") {
          const response = await releaseCodexControlTask(task.task_id, {
            worker_id: selectedWorkerId,
          });
          setCoordinationMessage(`Released ${response.task.task_id} back to pending.`);
          return;
        }

        if (action === "complete") {
          const response = await completeCodexControlTask(task.task_id, {
            worker_id: selectedWorkerId,
          });
          setCoordinationMessage(`Completed ${response.task.task_id}.`);
          return;
        }

        const response = await waitForCodexControlTask(task.task_id, {
          worker_id: selectedWorkerId,
          reason: `waiting on ${task.task_id} until its overlapping scope clears`,
        });
        setCoordinationMessage(
          `Registered waiter ${response.waiter.waiter_id} for ${task.task_id}.`,
        );
      },
    );
  }

  async function handleMarkNotificationsRead() {
    if (!selectedWorkerId) {
      setCoordinationError("Select a worker before marking notifications read.");
      return;
    }

    await runCoordinationAction("Marking notifications read", async () => {
      await markCodexControlNotificationsRead(selectedWorkerId);
      setCoordinationMessage(`Marked notifications as read for ${selectedWorkerId}.`);
    });
  }

  const overviewContent = (
    <div style={{ ...stackStyle, gap: themeTokens.compactDensity ? 12 : 16 }}>
      <div style={summaryGridStyle}>
        <article style={summaryCardStyle}>
          <strong>Repo status</strong>
          <div style={metaStackStyle}>
            <span>Repo root: <code>{status?.repo_root ?? "loading..."}</code></span>
            <span>Current branch: <code>{status?.current_branch ?? "not detected"}</code></span>
            <span>Git common dir: <code>{status?.git_common_dir ?? "loading..."}</code></span>
            <span>Recommended base branch: <code>{status?.recommended_base_branch ?? "loading..."}</code></span>
          </div>
        </article>

        {(status?.harnesses ?? []).map((harness) => (
          <article key={harness.harness_id} style={summaryCardStyle}>
            <div style={rowBetweenStyle}>
              <strong>{harness.label}</strong>
              <span style={{ ...pillStyle, ...toneStyle(harness.configured ? "success" : "warning") }}>
                {harness.status}
              </span>
            </div>
            <p style={mutedParagraphStyle}>{harness.detail}</p>
            {harness.notes.length > 0 ? (
              <div style={metaStackStyle}>
                {harness.notes.map((note) => (
                  <span key={note}>{note}</span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div style={statusRailStyle}>
        <span style={{ ...pillStyle, ...toneStyle(status?.board.available ? "success" : "warning") }}>
          board {status?.board.available ? "live" : "missing"}
        </span>
        <span style={{ ...pillStyle, ...toneStyle(status?.mission_control_available ? "info" : "warning") }}>
          mission control {status?.mission_control_available ? "available" : "unavailable"}
        </span>
        <span style={{ ...pillStyle, ...toneStyle(unreadNotifications > 0 ? "warning" : "neutral") }}>
          unread notifications {unreadNotifications}
        </span>
      </div>

      {status?.notes.length ? (
        <article style={summaryCardStyle}>
          <strong>Current notes</strong>
          <div style={metaStackStyle}>
            {status.notes.map((note) => (
              <span key={note}>{note}</span>
            ))}
          </div>
        </article>
      ) : null}

      {error ? (
        <article style={{ ...summaryCardStyle, ...toneStyle("warning") }}>
          <strong>Builder status needs attention</strong>
          <p style={mutedParagraphStyle}>{error}</p>
        </article>
      ) : null}
    </div>
  );

  const worktreesContent = (
    <div style={stackStyle}>
      <div style={rowBetweenStyle}>
        <strong>Attached worktrees</strong>
        <button type="button" onClick={() => void refreshStatus()} style={buttonStyle}>
          {loading ? "Refreshing..." : "Refresh builder status"}
        </button>
      </div>
      {status?.worktrees.length ? (
        <div style={stackStyle}>
          {status.worktrees.map((worktree) => {
            const flags = listFlags(worktree);
            return (
              <article key={worktree.path} style={listCardStyle}>
                <div style={rowBetweenStyle}>
                  <strong>{worktree.branch_name ?? "detached worktree"}</strong>
                  <div style={statusRailStyle}>
                    {flags.length === 0 ? (
                      <span style={{ ...pillStyle, ...toneStyle("neutral") }}>clean lane</span>
                    ) : (
                      flags.map((flag) => (
                        <span
                          key={flag}
                          style={{ ...pillStyle, ...toneStyle(flag === "current repo" ? "info" : "warning") }}
                        >
                          {flag}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div style={metaStackStyle}>
                  <span>Path: <code>{worktree.path}</code></span>
                  <span>HEAD: <code>{worktree.head ?? "unknown"}</code></span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <article style={summaryCardStyle}>
          <strong>{loading ? "Loading worktrees..." : "No worktrees reported"}</strong>
          <p style={mutedParagraphStyle}>
            Builder will show attached git worktrees here once the backend status surface is reachable.
          </p>
        </article>
      )}
    </div>
  );

  const missionBoardContent = (
    <div style={stackStyle}>
      <div style={summaryGridStyle}>
        <article style={summaryCardStyle}>
          <strong>Board snapshot</strong>
          <div style={metaStackStyle}>
            <span>Generated: {formatTimestamp(status?.board.generated_at)}</span>
            <span>Workers: {workers.length}</span>
            <span>Tasks: {tasks.length}</span>
            <span>Waiters: {waiters.length}</span>
            <span>Unread notifications: {unreadNotifications}</span>
          </div>
        </article>

        <article style={summaryCardStyle}>
          <strong>Board files</strong>
          <div style={metaStackStyle}>
            <span>JSON: <code>{status?.board.board_json_path ?? "not available"}</code></span>
            <span>Text: <code>{status?.board.board_text_path ?? "not available"}</code></span>
            <span>State dir: <code>{status?.board.state_dir ?? "not available"}</code></span>
          </div>
        </article>
      </div>

      <article style={summaryCardStyle}>
        <div style={rowBetweenStyle}>
          <strong>Coordination controls</strong>
          <span style={{ ...pillStyle, ...toneStyle(selectedWorkerId ? "info" : "warning") }}>
            {selectedWorkerId ? `worker ${selectedWorkerId}` : "select a worker"}
          </span>
        </div>
        <div style={formGridStyle}>
          <label style={fieldStyle}>
            Active worker
            <select
              value={selectedWorkerId}
              onChange={(event) => setSelectedWorkerId(event.target.value)}
              style={inputStyle}
              disabled={workers.length === 0}
            >
              <option value="">
                {workers.length === 0 ? "No registered workers" : "Select a worker"}
              </option>
              {workers.map((worker) => (
                <option key={worker.worker_id} value={worker.worker_id}>
                  {worker.display_name} ({worker.worker_id})
                </option>
              ))}
            </select>
          </label>
        </div>
        {workers.length ? (
          <div style={workerQuickAccessGridStyle} aria-label="Thread quick access">
            {workers.map((worker) => (
              <button
                key={worker.worker_id}
                type="button"
                style={{
                  ...workerQuickAccessButtonStyle,
                  ...(selectedWorkerId === worker.worker_id ? workerQuickAccessButtonActiveStyle : {}),
                }}
                onClick={() => setSelectedWorkerId(worker.worker_id)}
              >
                {renderWorkerAvatar(worker, 38)}
                <span style={workerQuickAccessTextStyle}>
                  <strong>{worker.display_name}</strong>
                  <small>{worker.agent_profile || worker.worker_id}</small>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div style={actionRowStyle}>
          <button
            type="button"
            style={buttonStyle}
            disabled={!selectedWorkerId || coordinationBusyLabel !== null}
            onClick={() => void handleNextTask("inspect")}
          >
            {coordinationBusyLabel === "Checking next task" ? "Checking..." : "Check next task"}
          </button>
          <button
            type="button"
            style={buttonStyle}
            disabled={!selectedWorkerId || coordinationBusyLabel !== null}
            onClick={() => void handleNextTask("claim")}
          >
            {coordinationBusyLabel === "Claiming next task" ? "Claiming..." : "Claim next task"}
          </button>
          <button
            type="button"
            style={secondaryButtonStyle}
            disabled={!selectedWorkerId || coordinationBusyLabel !== null}
            onClick={() => void handleNextTask("wait")}
          >
            {coordinationBusyLabel === "Registering wait" ? "Registering..." : "Wait on blocked task"}
          </button>
          <button
            type="button"
            style={secondaryButtonStyle}
            disabled={!selectedWorkerId || coordinationBusyLabel !== null}
            onClick={() => void handleMarkNotificationsRead()}
          >
            {coordinationBusyLabel === "Marking notifications read" ? "Updating..." : "Mark notifications read"}
          </button>
        </div>

        <form onSubmit={(event) => void handleTaskSupersedeSubmit(event)} style={stackStyle}>
          <article style={summaryCardStyle}>
            <strong>Supersede current task</strong>
            <p style={mutedParagraphStyle}>
              Use this when the selected lane must drop its current slice immediately, claim a higher-priority
              replacement task, and optionally stop the selected managed terminal in the same repo-owned action.
            </p>
            <div style={metaStackStyle}>
              <span>Current task: <code>{selectedWorkerTask?.task_id ?? "none"}</code></span>
              <span>Current status: <code>{selectedWorkerTask?.status ?? "n/a"}</code></span>
              <span>Active terminal: <code>{selectedActiveTerminal?.session_id ?? "none"}</code></span>
              <span>Current scopes: <code>{selectedWorkerTask?.scope_paths.join(", ") || "n/a"}</code></span>
            </div>
          </article>

          <div style={formGridStyle}>
            <label style={fieldStyle}>
              Replacement title
              <input
                value={taskSupersedeDraft.replacementTitle}
                onChange={(event) => setTaskSupersedeDraft((current) => ({
                  ...current,
                  replacementTitle: event.target.value,
                }))}
                placeholder="Urgent Builder hotfix"
                style={inputStyle}
                disabled={!selectedWorkerTask}
              />
            </label>

            <label style={fieldStyle}>
              Replacement priority
              <input
                type="number"
                min={0}
                value={taskSupersedeDraft.replacementPriority}
                onChange={(event) => setTaskSupersedeDraft((current) => ({
                  ...current,
                  replacementPriority: Number(event.target.value) || 0,
                }))}
                style={inputStyle}
                disabled={!selectedWorkerTask}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Replacement summary
              <textarea
                value={taskSupersedeDraft.replacementSummary}
                onChange={(event) => setTaskSupersedeDraft((current) => ({
                  ...current,
                  replacementSummary: event.target.value,
                }))}
                rows={3}
                style={{ ...textareaStyle, minHeight: 120 }}
                disabled={!selectedWorkerTask}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Replacement scope paths
              <input
                value={taskSupersedeDraft.replacementScopePaths}
                onChange={(event) => setTaskSupersedeDraft((current) => ({
                  ...current,
                  replacementScopePaths: event.target.value,
                }))}
                placeholder="frontend/src/components/workspaces"
                style={inputStyle}
                disabled={!selectedWorkerTask}
              />
            </label>

            <label style={fieldStyle}>
              Replacement branch prefix
              <input
                value={taskSupersedeDraft.replacementBranchPrefix}
                onChange={(event) => setTaskSupersedeDraft((current) => ({
                  ...current,
                  replacementBranchPrefix: event.target.value,
                }))}
                placeholder="codex/worker"
                style={inputStyle}
                disabled={!selectedWorkerTask}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Supersede reason
              <textarea
                value={taskSupersedeDraft.supersedeReason}
                onChange={(event) => setTaskSupersedeDraft((current) => ({
                  ...current,
                  supersedeReason: event.target.value,
                }))}
                rows={3}
                style={{ ...textareaStyle, minHeight: 120 }}
                disabled={!selectedWorkerTask}
              />
            </label>
          </div>

          <label style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={taskSupersedeDraft.stopActiveTerminal}
              onChange={(event) => setTaskSupersedeDraft((current) => ({
                ...current,
                stopActiveTerminal: event.target.checked,
              }))}
              disabled={!selectedWorkerTask}
            />
            Stop the selected worker's active managed terminal as part of the override
          </label>

          <ActionReviewCard
            ariaLabel="Task supersede review"
            eyebrow="Override review"
            eyebrowTone={selectedWorkerTask ? "warning" : "neutral"}
            title="Review before superseding the current task"
            description="No task is superseded yet. This summarizes the replacement task, stop behavior, and notification target before the urgent action runs."
            statusLabel={selectedWorkerTask ? "manual trigger" : "select active task"}
            statusTone={selectedWorkerTask ? "warning" : "neutral"}
            details={[
              { label: "Worker", value: selectedWorkerId || "none selected" },
              { label: "Current task", value: selectedWorkerTask?.task_id ?? "none" },
              { label: "Replacement title", value: taskSupersedeDraft.replacementTitle.trim() || "not set" },
              { label: "Replacement priority", value: taskSupersedeDraft.replacementPriority },
              { label: "Replacement scopes", value: taskSupersedeScopeReview },
              { label: "Replacement branch prefix", value: taskSupersedeBranchReview },
              { label: "Stop active terminal", value: taskSupersedeStopReview },
              { label: "Reason", value: taskSupersedeReasonReview },
            ]}
          />

          <div style={actionRowStyle}>
            <button
              type="submit"
              style={buttonStyle}
              disabled={!selectedWorkerTask || coordinationBusyLabel !== null}
            >
              {coordinationBusyLabel === "Superseding current task"
                ? "Superseding..."
                : "Supersede current task"}
            </button>
          </div>
        </form>

        {coordinationMessage ? (
          <article style={{ ...summaryCardStyle, ...toneStyle("success") }}>
            <strong>Coordination update</strong>
            <p style={mutedParagraphStyle}>{coordinationMessage}</p>
          </article>
        ) : null}

        {coordinationError ? (
          <article style={{ ...summaryCardStyle, ...toneStyle("warning") }}>
            <strong>Coordination needs attention</strong>
            <p style={mutedParagraphStyle}>{coordinationError}</p>
          </article>
        ) : null}
      </article>

      {!status?.board.available ? (
        <article style={{ ...summaryCardStyle, ...toneStyle("warning") }}>
          <strong>Mission board not seeded yet</strong>
          <p style={mutedParagraphStyle}>
            Create or sync a lane first so the shared mission-control board can publish workers, tasks, and notifications.
          </p>
        </article>
      ) : null}

      <section style={stackStyle}>
        <strong>Workers</strong>
        {workers.length ? workers.map(renderWorkerCard) : (
          <article style={summaryCardStyle}>
            <span>No workers are registered on the board yet.</span>
          </article>
        )}
      </section>

      <section style={stackStyle}>
        <strong>Tasks</strong>
        {tasks.length ? (
          tasks.map((task) => {
            const canClaim = task.status === "pending";
            const canReleaseOrComplete = task.claimed_by_worker_id === selectedWorkerId;
            const canWait = task.status !== "completed";

            return (
              <article key={task.task_id} style={listCardStyle}>
                <div style={rowBetweenStyle}>
                  <strong>{task.title}</strong>
                  <span style={{ ...pillStyle, ...toneStyle(task.status === "in_progress" ? "info" : "neutral") }}>
                    {task.status}
                  </span>
                </div>
                <div style={metaStackStyle}>
                  <span>Task ID: <code>{task.task_id}</code></span>
                  <span>Priority: {task.priority}</span>
                  <span>Scopes: <code>{task.scope_paths.join(", ") || "none"}</code></span>
                  <span>Owner: <code>{task.claimed_by_worker_id ?? "unclaimed"}</code></span>
                  {task.superseded_by_task_id ? (
                    <span>
                      Superseded by: <code>{task.superseded_by_task_id}</code> at {formatTimestamp(task.superseded_at)}
                    </span>
                  ) : null}
                  {task.supersede_reason ? (
                    <span>Supersede reason: {task.supersede_reason}</span>
                  ) : null}
                  {task.blockers.length > 0 ? (
                    <span>Blockers: <code>{task.blockers.join(", ")}</code></span>
                  ) : null}
                  <span>{task.summary}</span>
                </div>
                <div style={actionRowStyle}>
                  <button
                    type="button"
                    style={buttonStyle}
                    disabled={!selectedWorkerId || !canClaim || coordinationBusyLabel !== null}
                    onClick={() => void handleTaskAction(task, "claim")}
                  >
                    Claim
                  </button>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    disabled={!selectedWorkerId || !canReleaseOrComplete || coordinationBusyLabel !== null}
                    onClick={() => void handleTaskAction(task, "release")}
                  >
                    Release
                  </button>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    disabled={!selectedWorkerId || !canReleaseOrComplete || coordinationBusyLabel !== null}
                    onClick={() => void handleTaskAction(task, "complete")}
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    disabled={!selectedWorkerId || !canWait || coordinationBusyLabel !== null}
                    onClick={() => void handleTaskAction(task, "wait")}
                  >
                    Wait
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <article style={summaryCardStyle}>
            <span>No tasks are currently recorded on the board.</span>
          </article>
        )}
      </section>

      <section style={stackStyle}>
        <strong>Waiters</strong>
        {waiters.length ? (
          waiters.map((waiter) => (
            <article key={`${waiter.waiter_id}-${waiter.worker_id}`} style={listCardStyle}>
              <div style={rowBetweenStyle}>
                <strong>{waiter.worker_id}</strong>
                <span style={{ ...pillStyle, ...toneStyle(waiter.status === "ready" ? "success" : "warning") }}>
                  {waiter.status}
                </span>
              </div>
              <div style={metaStackStyle}>
                <span>Task: <code>{waiter.task_id}</code></span>
                <span>Reason: {waiter.reason}</span>
                <span>Updated: {formatTimestamp(waiter.updated_at)}</span>
              </div>
            </article>
          ))
        ) : (
          <article style={summaryCardStyle}>
            <span>No active waiters are recorded on the board.</span>
          </article>
        )}
      </section>

      <section style={stackStyle}>
        <div style={rowBetweenStyle}>
          <strong>Selected worker notifications</strong>
          <button
            type="button"
            style={secondaryButtonStyle}
            disabled={!selectedWorkerId || notificationsLoading}
            onClick={() => void refreshWorkerNotifications(selectedWorkerId)}
          >
            {notificationsLoading ? "Refreshing..." : "Refresh notifications"}
          </button>
        </div>
        {notificationsError ? (
          <article style={{ ...summaryCardStyle, ...toneStyle("warning") }}>
            <strong>Notifications need attention</strong>
            <p style={mutedParagraphStyle}>{notificationsError}</p>
          </article>
        ) : null}
        {workerNotifications.length ? workerNotifications.slice(0, 8).map(renderNotificationCard) : (
          <article style={summaryCardStyle}>
            <span>
              {selectedWorkerId
                ? "No notifications are currently stored for the selected worker."
                : "Select a worker to inspect notifications."}
            </span>
          </article>
        )}
      </section>
    </div>
  );

  const laneCreateContent = (
    <div style={stackStyle}>
      <form onSubmit={(event) => void handleLaneSubmit(event)} style={stackStyle}>
        <article style={summaryCardStyle}>
          <strong>Lane creation truth</strong>
          <p style={mutedParagraphStyle}>
            This slice creates repo-native worktree lanes and updates the shared mission-control board. It does not yet mean the app is autonomously driving Codex Desktop.
          </p>
        </article>

        <div style={formGridStyle}>
          <label style={fieldStyle}>
            Worker ID
            <input
              value={laneDraft.workerId}
              onChange={(event) => setLaneDraft((current) => ({ ...current, workerId: event.target.value }))}
              placeholder="builder-alpha"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Display name
            <input
              value={laneDraft.displayName}
              onChange={(event) => setLaneDraft((current) => ({ ...current, displayName: event.target.value }))}
              placeholder="Builder Alpha"
              style={inputStyle}
            />
          </label>

          <details style={{ ...summaryCardStyle, gridColumn: "1 / -1" }} open>
            <summary style={detailsSummaryStyle}>Thread identity, avatar, capabilities, and context pack</summary>
            <div style={formGridStyle}>
              <label style={fieldStyle}>
                Agent profile
                <input
                  value={laneDraft.agentProfile}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, agentProfile: event.target.value }))}
                  placeholder="Builder generalist"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                Agent runtime / provider
                <input
                  value={laneDraft.agentRuntime}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, agentRuntime: event.target.value }))}
                  placeholder="Codex Desktop, OpenClaw, custom local agent"
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Agent entrypoint
                <input
                  value={laneDraft.agentEntrypoint}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, agentEntrypoint: event.target.value }))}
                  placeholder="How to open or contact this agent: thread name, app profile, workspace URL, local path, or command notes"
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Agent access notes
                <textarea
                  value={laneDraft.agentAccessNotes}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, agentAccessNotes: event.target.value }))}
                  placeholder="What the user has granted this agent: workspace path, source pack, repo scope, approval boundaries"
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={fieldStyle}>
                Avatar initials
                <input
                  value={laneDraft.avatarLabel}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, avatarLabel: event.target.value }))}
                  placeholder="BA"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                Avatar color
                <input
                  type="color"
                  value={laneDraft.avatarColor}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, avatarColor: event.target.value }))}
                  style={{ ...inputStyle, minHeight: 44 }}
                />
              </label>

              <label style={fieldStyle}>
                Avatar image URL or data URL
                <input
                  value={laneDraft.avatarUri}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, avatarUri: event.target.value }))}
                  placeholder="Optional small image URL"
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                OpenClaw-style capabilities
                <input
                  value={laneDraft.capabilityTags}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, capabilityTags: event.target.value }))}
                  placeholder={SUPPORTED_THREAD_CAPABILITIES.join(", ")}
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Workspace context sources
                <input
                  value={laneDraft.contextSources}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, contextSources: event.target.value }))}
                  placeholder="docs/APP-OPERATOR-GUIDE.md, frontend/src/App.tsx, uploaded design notes"
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Identity
                <textarea
                  value={laneDraft.identityNotes}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, identityNotes: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Personality settings
                <textarea
                  value={laneDraft.personalityNotes}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, personalityNotes: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Soul / mission directive
                <textarea
                  value={laneDraft.soulDirective}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, soulDirective: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Memory notes
                <textarea
                  value={laneDraft.memoryNotes}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, memoryNotes: event.target.value }))}
                  placeholder="Durable facts this thread should remember when resuming."
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Bootstrap instructions
                <textarea
                  value={laneDraft.bootstrapNotes}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, bootstrapNotes: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Resume notes
                <textarea
                  value={laneDraft.resumeNotes}
                  onChange={(event) => setLaneDraft((current) => ({ ...current, resumeNotes: event.target.value }))}
                  placeholder="Leave a continuation note for the next thread that opens this workspace."
                  rows={2}
                  style={textareaStyle}
                />
              </label>
            </div>
            <div style={actionRowStyle}>
              {THREAD_PROFILE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  style={secondaryButtonStyle}
                  onClick={() => setLaneDraft((current) => ({
                    ...current,
                    agentProfile: preset.label,
                    agentRuntime: preset.runtime,
                    agentAccessNotes: preset.accessNotes,
                    capabilityTags: preset.capabilityTags,
                    avatarColor: preset.color,
                  }))}
                >
                  Use {preset.label}
                </button>
              ))}
            </div>
          </details>

          <label style={fieldStyle}>
            Branch name
            <input
              value={laneDraft.branchName}
              onChange={(event) => setLaneDraft((current) => ({ ...current, branchName: event.target.value }))}
              placeholder="codex/worker/builder-alpha"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Worktree or external workspace path
            <input
              value={laneDraft.worktreePath}
              onChange={(event) => setLaneDraft((current) => ({ ...current, worktreePath: event.target.value }))}
              placeholder="Leave blank for launchpad worktree, or paste the external agent workspace path."
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Base branch
            <input
              value={laneDraft.baseBranch}
              onChange={(event) => setLaneDraft((current) => ({ ...current, baseBranch: event.target.value }))}
              placeholder={status?.recommended_base_branch ?? "codex/control-plane/o3de-thread-launchpad-stable"}
              style={inputStyle}
            />
          </label>

          <label style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={laneDraft.bootstrap}
              onChange={(event) => setLaneDraft((current) => ({ ...current, bootstrap: event.target.checked }))}
            />
            Bootstrap the new worktree after creation
          </label>
        </div>

        <div style={actionRowStyle}>
          <button type="submit" style={buttonStyle} disabled={laneSubmitting}>
            {laneSubmitting ? "Creating lane..." : "Create worktree lane"}
          </button>
          <button type="button" style={secondaryButtonStyle} onClick={() => void refreshStatus()}>
            Refresh board
          </button>
        </div>

        {laneMessage ? (
          <article style={{ ...summaryCardStyle, ...toneStyle("success") }}>
            <strong>Lane created</strong>
            <p style={mutedParagraphStyle}>{laneMessage}</p>
          </article>
        ) : null}

        {laneError ? (
          <article style={{ ...summaryCardStyle, ...toneStyle("warning") }}>
            <strong>Lane creation needs attention</strong>
            <p style={mutedParagraphStyle}>{laneError}</p>
          </article>
        ) : null}
      </form>

      <form onSubmit={(event) => void handleTaskSubmit(event)} style={stackStyle}>
        <article style={summaryCardStyle}>
          <strong>Seed a coordination task</strong>
          <p style={mutedParagraphStyle}>
            Create shared mission-control tasks here so parallel threads can claim scopes, wait cleanly, and avoid duplicated work across the same files.
          </p>
        </article>

        <div style={formGridStyle}>
          <label style={fieldStyle}>
            Task title
            <input
              value={taskDraft.title}
              onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Builder coordination"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Summary
            <input
              value={taskDraft.summary}
              onChange={(event) => setTaskDraft((current) => ({ ...current, summary: event.target.value }))}
              placeholder="Wire the next builder feature slice."
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Priority
            <input
              type="number"
              min={1}
              max={999}
              value={taskDraft.priority}
              onChange={(event) => setTaskDraft((current) => ({
                ...current,
                priority: Number(event.target.value) || 1,
              }))}
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Branch prefix
            <input
              value={taskDraft.branchPrefix}
              onChange={(event) => setTaskDraft((current) => ({ ...current, branchPrefix: event.target.value }))}
              placeholder="codex/worker"
              style={inputStyle}
            />
          </label>

          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            Scope paths
            <input
              value={taskDraft.scopePaths}
              onChange={(event) => setTaskDraft((current) => ({ ...current, scopePaths: event.target.value }))}
              placeholder="frontend/src/components/workspaces, backend/app/services/codex_control.py"
              style={inputStyle}
            />
          </label>
        </div>

        <div style={actionRowStyle}>
          <button type="submit" style={buttonStyle} disabled={taskSubmitting}>
            {taskSubmitting ? "Creating task..." : "Create coordination task"}
          </button>
        </div>

        {taskMessage ? (
          <article style={{ ...summaryCardStyle, ...toneStyle("success") }}>
            <strong>Task created</strong>
            <p style={mutedParagraphStyle}>{taskMessage}</p>
          </article>
        ) : null}

        {taskError ? (
          <article style={{ ...summaryCardStyle, ...toneStyle("warning") }}>
            <strong>Task creation needs attention</strong>
            <p style={mutedParagraphStyle}>{taskError}</p>
          </article>
        ) : null}
      </form>
    </div>
  );

  const workerLifecycleContent = (
    <div style={stackStyle}>
      <article style={summaryCardStyle}>
        <div style={rowBetweenStyle}>
          <div style={workerSnapshotTitleStyle}>
            {renderWorkerAvatar(selectedWorker)}
            <strong>Selected thread workspace</strong>
          </div>
          <span style={{ ...pillStyle, ...toneStyle(selectedWorker ? "info" : "warning") }}>
            {selectedWorker ? selectedWorker.worker_id : "no worker selected"}
          </span>
        </div>
        <div style={metaStackStyle}>
          <span>Display name: <code>{selectedWorker?.display_name ?? "n/a"}</code></span>
          <span>Agent profile: <code>{selectedWorker?.agent_profile ?? "n/a"}</code></span>
          <span>Runtime/provider: <code>{selectedWorker?.agent_runtime ?? "n/a"}</code></span>
          <span>Agent entrypoint: <code>{selectedWorker?.agent_entrypoint ?? "n/a"}</code></span>
          <span>Access notes: {selectedWorker?.agent_access_notes ?? "n/a"}</span>
          <span>Capabilities: <code>{formatStringList(selectedWorker?.capability_tags) || "n/a"}</code></span>
          <span>Context sources: <code>{formatStringList(selectedWorker?.context_sources) || "n/a"}</code></span>
          <span>Soul directive: {selectedWorker?.soul_directive ?? "n/a"}</span>
          <span>Bootstrap: {selectedWorker?.bootstrap_notes ?? "n/a"}</span>
          <span>Memory: {selectedWorker?.memory_notes ?? "n/a"}</span>
          <span>Status: <code>{selectedWorker?.status ?? "n/a"}</code></span>
          <span>Branch: <code>{selectedWorker?.branch_name ?? "n/a"}</code></span>
          <span>Worktree: <code>{selectedWorker?.worktree_path ?? "n/a"}</code></span>
          <span>Current task: <code>{selectedWorkerTask?.task_id ?? selectedWorker?.current_task_id ?? "n/a"}</code></span>
          <span>Resume notes: {selectedWorker?.resume_notes ?? "n/a"}</span>
          <span>Unread notifications loaded: {workerNotifications.filter((notification) => notification.status === "unread").length}</span>
        </div>
      </article>

      <form onSubmit={(event) => void handleWorkerSyncSubmit(event)} style={stackStyle}>
        <article style={summaryCardStyle}>
          <strong>Sync worker lane</strong>
          <p style={mutedParagraphStyle}>
            Refresh the shared board with the worker lane&apos;s branch, worktree, status, and summary so other threads see the same source of truth.
          </p>
        </article>

        <div style={formGridStyle}>
          <label style={fieldStyle}>
            Worker ID
            <input
              value={workerSyncDraft.workerId}
              onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, workerId: event.target.value }))}
              placeholder="builder-alpha"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Display name
            <input
              value={workerSyncDraft.displayName}
              onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, displayName: event.target.value }))}
              placeholder="Builder Alpha"
              style={inputStyle}
            />
          </label>

          <details style={{ ...summaryCardStyle, gridColumn: "1 / -1" }}>
            <summary style={detailsSummaryStyle}>Edit thread profile, avatar, memory, and context sources</summary>
            <div style={formGridStyle}>
              <label style={fieldStyle}>
                Agent profile
                <input
                  value={workerSyncDraft.agentProfile}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, agentProfile: event.target.value }))}
                  placeholder="O3DE authoring specialist"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                Agent runtime / provider
                <input
                  value={workerSyncDraft.agentRuntime}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, agentRuntime: event.target.value }))}
                  placeholder="Codex Desktop, OpenClaw, custom local agent"
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Agent entrypoint
                <input
                  value={workerSyncDraft.agentEntrypoint}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, agentEntrypoint: event.target.value }))}
                  placeholder="Thread name, app profile, workspace URL, local path, or command notes"
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Agent access notes
                <textarea
                  value={workerSyncDraft.agentAccessNotes}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, agentAccessNotes: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={fieldStyle}>
                Avatar initials
                <input
                  value={workerSyncDraft.avatarLabel}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, avatarLabel: event.target.value }))}
                  placeholder="OA"
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                Avatar color
                <input
                  type="color"
                  value={workerSyncDraft.avatarColor || "#2563eb"}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, avatarColor: event.target.value }))}
                  style={{ ...inputStyle, minHeight: 44 }}
                />
              </label>

              <label style={fieldStyle}>
                Avatar image URL or data URL
                <input
                  value={workerSyncDraft.avatarUri}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, avatarUri: event.target.value }))}
                  placeholder="Optional small image URL"
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                OpenClaw-style capabilities
                <input
                  value={workerSyncDraft.capabilityTags}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, capabilityTags: event.target.value }))}
                  placeholder={SUPPORTED_THREAD_CAPABILITIES.join(", ")}
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Workspace context sources
                <input
                  value={workerSyncDraft.contextSources}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, contextSources: event.target.value }))}
                  placeholder="Mini source upload pack for this thread: files, docs, screenshots, notes"
                  style={inputStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Identity
                <textarea
                  value={workerSyncDraft.identityNotes}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, identityNotes: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Personality settings
                <textarea
                  value={workerSyncDraft.personalityNotes}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, personalityNotes: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Soul / mission directive
                <textarea
                  value={workerSyncDraft.soulDirective}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, soulDirective: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Memory notes
                <textarea
                  value={workerSyncDraft.memoryNotes}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, memoryNotes: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Bootstrap instructions
                <textarea
                  value={workerSyncDraft.bootstrapNotes}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, bootstrapNotes: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>

              <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                Resume notes
                <textarea
                  value={workerSyncDraft.resumeNotes}
                  onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, resumeNotes: event.target.value }))}
                  rows={2}
                  style={textareaStyle}
                />
              </label>
            </div>
          </details>

          <label style={fieldStyle}>
            Status
            <select
              value={workerSyncDraft.status}
              onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, status: event.target.value }))}
              style={inputStyle}
            >
              <option value="idle">idle</option>
              <option value="active">active</option>
              <option value="blocked">blocked</option>
              <option value="review">review</option>
            </select>
          </label>

          <label style={fieldStyle}>
            Base branch
            <input
              value={workerSyncDraft.baseBranch}
              onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, baseBranch: event.target.value }))}
              placeholder={status?.recommended_base_branch ?? "codex/control-plane/o3de-thread-launchpad-stable"}
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Branch name
            <input
              value={workerSyncDraft.branchName}
              onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, branchName: event.target.value }))}
              placeholder="codex/worker/builder-alpha"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            Worktree path
            <input
              value={workerSyncDraft.worktreePath}
              onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, worktreePath: event.target.value }))}
              placeholder="C:\\path\\to\\worktree"
              style={inputStyle}
            />
          </label>

          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            Summary
            <input
              value={workerSyncDraft.summary}
              onChange={(event) => setWorkerSyncDraft((current) => ({ ...current, summary: event.target.value }))}
              placeholder="Claimed Builder coordination slice."
              style={inputStyle}
            />
          </label>
        </div>

        <div style={actionRowStyle}>
          <button type="submit" style={buttonStyle} disabled={workerBusyLabel !== null}>
            {workerBusyLabel === "Syncing worker" ? "Syncing..." : "Sync worker lane"}
          </button>
          <button
            type="button"
            style={secondaryButtonStyle}
            disabled={workerBusyLabel !== null}
            onClick={handleResetWorkerSyncDraft}
          >
            Reset to selected worker
          </button>
        </div>
      </form>

      <form onSubmit={(event) => void handleWorkerHeartbeatSubmit(event)} style={stackStyle}>
        <article style={summaryCardStyle}>
          <strong>Publish heartbeat</strong>
          <p style={mutedParagraphStyle}>
            Send a lightweight worker heartbeat when status, current task context, or path notes change and you need the board to stay fresh without creating a new lane.
          </p>
        </article>

        <div style={formGridStyle}>
          <label style={fieldStyle}>
            Selected worker
            <input value={selectedWorkerId} readOnly style={{ ...inputStyle, opacity: 0.85 }} />
          </label>

          <label style={fieldStyle}>
            Status
            <select
              value={workerHeartbeatDraft.status}
              onChange={(event) => setWorkerHeartbeatDraft((current) => ({ ...current, status: event.target.value }))}
              style={inputStyle}
              disabled={!selectedWorkerId}
            >
              <option value="">keep current</option>
              <option value="idle">idle</option>
              <option value="active">active</option>
              <option value="blocked">blocked</option>
              <option value="review">review</option>
            </select>
          </label>

          <label style={fieldStyle}>
            Current task ID
            <input
              value={workerHeartbeatDraft.currentTaskId}
              onChange={(event) => setWorkerHeartbeatDraft((current) => ({ ...current, currentTaskId: event.target.value }))}
              placeholder="Leave blank to preserve current task."
              style={inputStyle}
              disabled={!selectedWorkerId}
            />
          </label>

          <label style={fieldStyle}>
            Base branch
            <input
              value={workerHeartbeatDraft.baseBranch}
              onChange={(event) => setWorkerHeartbeatDraft((current) => ({ ...current, baseBranch: event.target.value }))}
              placeholder="Leave blank to preserve current base branch."
              style={inputStyle}
              disabled={!selectedWorkerId}
            />
          </label>

          <label style={fieldStyle}>
            Branch name
            <input
              value={workerHeartbeatDraft.branchName}
              onChange={(event) => setWorkerHeartbeatDraft((current) => ({ ...current, branchName: event.target.value }))}
              placeholder="Leave blank to preserve current branch."
              style={inputStyle}
              disabled={!selectedWorkerId}
            />
          </label>

          <label style={fieldStyle}>
            Worktree path
            <input
              value={workerHeartbeatDraft.worktreePath}
              onChange={(event) => setWorkerHeartbeatDraft((current) => ({ ...current, worktreePath: event.target.value }))}
              placeholder="Leave blank to preserve current worktree."
              style={inputStyle}
              disabled={!selectedWorkerId}
            />
          </label>

          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            Summary
            <input
              value={workerHeartbeatDraft.summary}
              onChange={(event) => setWorkerHeartbeatDraft((current) => ({ ...current, summary: event.target.value }))}
              placeholder="Waiting on overlapping scope to clear."
              style={inputStyle}
              disabled={!selectedWorkerId}
            />
          </label>
        </div>

        <div style={actionRowStyle}>
          <button type="submit" style={buttonStyle} disabled={!selectedWorkerId || workerBusyLabel !== null}>
            {workerBusyLabel === "Sending heartbeat" ? "Sending..." : "Send heartbeat"}
          </button>
          <button
            type="button"
            style={secondaryButtonStyle}
            disabled={!selectedWorkerId || workerBusyLabel !== null}
            onClick={handleResetWorkerHeartbeatDraft}
          >
            Reset heartbeat draft
          </button>
        </div>
      </form>

      {loadedWorkerDraftReview ? (
        <ActionReviewCard
          ariaLabel="Loaded worker draft review"
          eyebrow="Loaded worker draft review"
          eyebrowTone="info"
          title={loadedWorkerDraftReview.label}
          description={loadedWorkerDraftReview.safeMessage}
          action={(
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => setLoadedWorkerDraftReview(null)}
            >
              Clear worker review
            </button>
          )}
          details={[
            { label: "Changed fields", value: loadedWorkerDraftReview.changedFields },
            { label: "Worker", value: loadedWorkerDraftReview.workerId },
            { label: "Status", value: loadedWorkerDraftReview.status },
            { label: "Branch", value: loadedWorkerDraftReview.branchName },
            { label: "Worktree", value: loadedWorkerDraftReview.worktreePath },
            { label: "Base branch", value: loadedWorkerDraftReview.baseBranch },
            { label: "Agent profile", value: loadedWorkerDraftReview.agentProfile ?? "none" },
            { label: "Agent runtime", value: loadedWorkerDraftReview.agentRuntime ?? "none" },
            { label: "Agent entrypoint", value: loadedWorkerDraftReview.agentEntrypoint ?? "none" },
            { label: "Agent access notes", value: loadedWorkerDraftReview.agentAccessNotes ?? "none" },
            { label: "Identity", value: loadedWorkerDraftReview.identityNotes ?? "none" },
            { label: "Personality", value: loadedWorkerDraftReview.personalityNotes ?? "none" },
            { label: "Soul directive", value: loadedWorkerDraftReview.soulDirective ?? "none" },
            { label: "Capabilities", value: loadedWorkerDraftReview.capabilityTags ?? "none" },
            { label: "Context sources", value: loadedWorkerDraftReview.contextSources ?? "none" },
            { label: "Avatar", value: loadedWorkerDraftReview.avatar ?? "generated initials" },
            { label: "Memory", value: loadedWorkerDraftReview.memoryNotes ?? "none" },
            { label: "Bootstrap", value: loadedWorkerDraftReview.bootstrapNotes ?? "none" },
            ...(loadedWorkerDraftReview.currentTaskId
              ? [{ label: "Current task", value: loadedWorkerDraftReview.currentTaskId }]
              : []),
            { label: "Summary", value: loadedWorkerDraftReview.summary },
            { label: "Resume notes", value: loadedWorkerDraftReview.resumeNotes ?? "none" },
          ]}
        />
      ) : null}

      {workerMessage ? (
        <article style={{ ...summaryCardStyle, ...toneStyle("success") }}>
          <strong>Worker lifecycle updated</strong>
          <p style={mutedParagraphStyle}>{workerMessage}</p>
        </article>
      ) : null}

      {workerError ? (
        <article style={{ ...summaryCardStyle, ...toneStyle("warning") }}>
          <strong>Worker lifecycle needs attention</strong>
          <p style={mutedParagraphStyle}>{workerError}</p>
        </article>
      ) : null}

      <article style={summaryCardStyle}>
        <div style={rowBetweenStyle}>
          <strong>Thread handoff package</strong>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => void handleCopyHandoffPackage()}
          >
            Copy handoff package
          </button>
        </div>
        <p style={mutedParagraphStyle}>
          Copy this package into the next Codex Desktop thread so it starts from the same repo, board, worker, and task truth without rebuilding the handoff from memory.
        </p>
        <textarea
          readOnly
          value={handoffPackage}
          rows={18}
          style={textareaStyle}
        />
        {handoffMessage ? (
          <p style={mutedParagraphStyle}>{handoffMessage}</p>
        ) : null}
      </article>
    </div>
  );

  const terminalsContent = (
    <div style={stackStyle}>
      <article style={summaryCardStyle}>
        <div style={rowBetweenStyle}>
          <strong>Managed worker terminals</strong>
          <span style={{ ...pillStyle, ...toneStyle(selectedWorkerId ? "info" : "warning") }}>
            {selectedWorkerId ? `worker ${selectedWorkerId}` : "select a worker"}
          </span>
        </div>
        <div style={metaStackStyle}>
          <span>Selected worker terminals: {selectedWorkerTerminals.length}</span>
          <span>Active managed terminal: <code>{selectedActiveTerminal?.session_id ?? "none"}</code></span>
          <span>
            These sessions stay tracked in mission control. On Windows they launch as real terminal windows you can use
            directly, while still writing observable logs back into Builder. They do not automatically control arbitrary
            Codex chat threads unless those threads choose to work through this managed surface.
          </span>
        </div>
      </article>

      <form onSubmit={(event) => void handleLaunchTerminalSubmit(event)} style={stackStyle}>
        <article style={summaryCardStyle}>
          <strong>Launch a managed terminal</strong>
          <p style={mutedParagraphStyle}>
            Start one mission-controlled worker terminal for the selected lane. On Windows this opens a real console
            window, while Builder keeps the session observable, stoppable, and tied back to the selected worker lane.
          </p>
        </article>

        <div style={formGridStyle}>
          <label style={fieldStyle}>
            Selected worker
            <input value={selectedWorkerId} readOnly style={{ ...inputStyle, opacity: 0.85 }} />
          </label>

          <label style={fieldStyle}>
            Label
            <input
              value={terminalDraft.label}
              onChange={(event) => setTerminalDraft((current) => ({ ...current, label: event.target.value }))}
              placeholder="Builder dev server"
              style={inputStyle}
              disabled={!selectedWorkerId}
            />
          </label>

          <label style={fieldStyle}>
            Linked task ID
            <input
              value={terminalDraft.taskId}
              onChange={(event) => setTerminalDraft((current) => ({ ...current, taskId: event.target.value }))}
              placeholder={selectedWorkerTask?.task_id ?? "Optional"}
              style={inputStyle}
              disabled={!selectedWorkerId}
            />
          </label>

          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            CWD
            <input
              value={terminalDraft.cwd}
              onChange={(event) => setTerminalDraft((current) => ({ ...current, cwd: event.target.value }))}
              placeholder={selectedWorker?.worktree_path ?? status?.repo_root ?? "C:\\path\\to\\worktree"}
              style={inputStyle}
              disabled={!selectedWorkerId}
            />
          </label>

          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            Command JSON
            <textarea
              value={terminalDraft.commandJson}
              onChange={(event) => setTerminalDraft((current) => ({ ...current, commandJson: event.target.value }))}
              rows={4}
              style={{ ...textareaStyle, minHeight: 120 }}
              disabled={!selectedWorkerId}
            />
          </label>
        </div>

        <ActionReviewCard
          ariaLabel="Managed terminal launch review"
          eyebrow="Launch review"
          eyebrowTone={selectedWorkerId ? "warning" : "neutral"}
          title="Review before opening a real terminal"
          description="Nothing has launched yet. On Windows, the next button opens a real terminal window tied to this worker lane and records the session in mission control."
          statusLabel={selectedWorkerId ? "ready to review" : "select worker first"}
          statusTone={selectedWorkerId ? "info" : "warning"}
          details={[
            { label: "Worker", value: selectedWorkerId || "none selected" },
            { label: "Label", value: terminalLaunchLabel },
            { label: "Linked task", value: terminalLaunchTaskId },
            { label: "CWD", value: terminalLaunchCwd },
            { label: "Command JSON", value: <code>{terminalLaunchCommandJson}</code> },
          ]}
        />

        <ActionReviewCard
          ariaLabel="Urgent interrupt review"
          eyebrow="Urgent review"
          eyebrowTone={selectedActiveTerminal ? "warning" : "info"}
          title="Review before interrupting this worker"
          description="Nothing is interrupted yet. This action is for urgent overrides when a worker should stop, refresh, and avoid continuing stale work."
          statusLabel={selectedWorkerId ? "manual trigger" : "select worker first"}
          statusTone={selectedWorkerId ? "warning" : "neutral"}
          details={[
            { label: "Worker", value: urgentInterruptWorkerReview },
            { label: "Current task", value: urgentInterruptTaskReview },
            { label: "Active terminal", value: urgentInterruptTerminalReview },
            { label: "Stop behavior", value: urgentInterruptStopReview },
            {
              label: "Notification",
              value: selectedWorkerId
                ? `send interrupt request to ${selectedWorkerId}`
                : "select a worker before sending a notification",
            },
          ]}
        />

        <div style={actionRowStyle}>
          <button type="submit" style={buttonStyle} disabled={!selectedWorkerId || terminalBusyLabel !== null}>
            {terminalBusyLabel === "Launching terminal" ? "Launching..." : "Launch managed terminal"}
          </button>
          <button
            type="button"
            style={secondaryButtonStyle}
            disabled={!selectedWorkerId || terminalBusyLabel !== null}
            onClick={() => void handleInterruptSelectedWorker()}
          >
            Interrupt selected worker
          </button>
        </div>
      </form>

      {terminalMessage ? (
        <article style={{ ...summaryCardStyle, ...toneStyle("success") }}>
          <strong>Terminal control updated</strong>
          <p style={mutedParagraphStyle}>{terminalMessage}</p>
        </article>
      ) : null}

      {terminalError ? (
        <article style={{ ...summaryCardStyle, ...toneStyle("warning") }}>
          <strong>Terminal control needs attention</strong>
          <p style={mutedParagraphStyle}>{terminalError}</p>
        </article>
      ) : null}

      <section style={stackStyle}>
        <strong>Selected worker terminal sessions</strong>
        {selectedWorkerTerminals.length ? selectedWorkerTerminals.map((session) => (
          <div key={session.session_id} style={stackStyle}>
            {renderTerminalSessionCard(session)}
            <div style={actionRowStyle}>
              <button
                type="button"
                style={secondaryButtonStyle}
                disabled={terminalBusyLabel !== null || !["running", "stopping"].includes(session.status)}
                onClick={() => void handleStopTerminal(session, { force: false })}
              >
                {session.status === "stopping" ? "Stop requested" : "Request stop"}
              </button>
              <button
                type="button"
                style={secondaryButtonStyle}
                disabled={terminalBusyLabel !== null || !["running", "stopping"].includes(session.status)}
                onClick={() => void handleStopTerminal(session, { force: true })}
              >
                Stop now
              </button>
            </div>
          </div>
        )) : (
          <article style={summaryCardStyle}>
            <span>
              {selectedWorkerId
                ? "No managed worker terminals are recorded for the selected lane yet."
                : "Select a worker to inspect or launch managed terminals."}
            </span>
          </article>
        )}
      </section>

      <article style={summaryCardStyle}>
        <strong>Urgent overrides</strong>
        <p style={mutedParagraphStyle}>
          Direct task creation already exists in Create Lane. For urgent work, seed a higher-priority task there, then use
          the interrupt action here to stop any managed terminal and notify the worker lane to refresh before reassignment.
        </p>
      </article>
    </div>
  );

  const autonomyInboxContent = (
    <div style={stackStyle}>
      <article style={summaryCardStyle}>
        <div style={rowBetweenStyle}>
          <div style={stackStyle}>
            <strong>Builder autonomy inbox</strong>
            <p style={mutedParagraphStyle}>
              Use this as the app-native queue for manual helper threads. It stores objectives,
              inbox jobs, observations, healing notes, and reusable memory without pretending the
              app is already a self-prompting organism.
            </p>
          </div>
          <div style={actionRowStyle}>
            <button
              type="button"
              style={buttonStyle}
              disabled={autonomyLoading || autonomyBusyLabel !== null}
              onClick={() => void refreshAutonomy()}
            >
              {autonomyLoading ? "Refreshing..." : "Refresh inbox"}
            </button>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => void handleCopyAutonomyThreadPrompt()}
            >
              Copy inbox prompt
            </button>
          </div>
        </div>
      </article>

      <CockpitBuilderPanel />

      <div style={summaryGridStyle}>
        <article style={summaryCardStyle}>
          <strong>Objectives</strong>
          <div style={metaStackStyle}>
            <span>Total: {autonomySummary?.objectives_total ?? 0}</span>
            <span>By status: {summarizeCounts(autonomySummary?.objectives_by_status ?? {})}</span>
          </div>
        </article>

        <article style={summaryCardStyle}>
          <strong>Jobs</strong>
          <div style={metaStackStyle}>
            <span>Total: {autonomySummary?.jobs_total ?? 0}</span>
            <span>By status: {summarizeCounts(autonomySummary?.jobs_by_status ?? {})}</span>
          </div>
        </article>

        <article style={summaryCardStyle}>
          <strong>Observations</strong>
          <div style={metaStackStyle}>
            <span>Total: {autonomySummary?.observations_total ?? 0}</span>
            <span>By severity: {summarizeCounts(autonomySummary?.observations_by_severity ?? {})}</span>
          </div>
        </article>

        <article style={summaryCardStyle}>
          <strong>Healing and memory</strong>
          <div style={metaStackStyle}>
            <span>Healing actions: {autonomySummary?.healing_actions_total ?? 0}</span>
            <span>Memories: {autonomySummary?.memories_total ?? 0}</span>
            <span>Healing states: {summarizeCounts(autonomySummary?.healing_actions_by_status ?? {})}</span>
          </div>
        </article>
      </div>

      {autonomyMessage ? (
        <article style={{ ...summaryCardStyle, ...toneStyle("success") }}>
          <strong>Autonomy inbox updated</strong>
          <p style={mutedParagraphStyle}>{autonomyMessage}</p>
        </article>
      ) : null}

      {autonomyError ? (
        <article style={{ ...summaryCardStyle, ...toneStyle("warning") }}>
          <strong>Autonomy inbox needs attention</strong>
          <p style={mutedParagraphStyle}>{autonomyError}</p>
        </article>
      ) : null}

      <BuilderAutonomyRecommendationsPanel
        recommendations={autonomyDraftRecommendations}
        loadedRecommendation={loadedAutonomyRecommendation}
        onLoadRecommendation={handleLoadAutonomyRecommendation}
        onClearLoadedRecommendation={() => setLoadedAutonomyRecommendation(null)}
      />

      <div style={summaryGridStyle}>
        <form onSubmit={(event) => void handleAutonomyObjectiveSubmit(event)} style={stackStyle}>
          <article style={summaryCardStyle}>
            <strong>Add objective</strong>
            <p style={mutedParagraphStyle}>
              Seed a durable objective when you want helper threads to understand the long-running
              outcome they are supporting, not just the next isolated task.
            </p>
          </article>

          <div style={formGridStyle}>
            <label style={fieldStyle}>
              Objective ID
              <input
                value={objectiveDraft.id}
                onChange={(event) => setObjectiveDraft((current) => ({ ...current, id: event.target.value }))}
                placeholder="builder-inbox-live"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Status
              <select
                value={objectiveDraft.status}
                onChange={(event) => setObjectiveDraft((current) => ({ ...current, status: event.target.value }))}
                style={inputStyle}
              >
                <option value="proposed">proposed</option>
                <option value="active">active</option>
                <option value="blocked">blocked</option>
                <option value="achieved">achieved</option>
                <option value="archived">archived</option>
              </select>
            </label>

            <label style={fieldStyle}>
              Priority
              <input
                type="number"
                min={1}
                max={999}
                value={objectiveDraft.priority}
                onChange={(event) => setObjectiveDraft((current) => ({
                  ...current,
                  priority: Number(event.target.value) || 1,
                }))}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Owner kind
              <input
                value={objectiveDraft.ownerKind}
                onChange={(event) => setObjectiveDraft((current) => ({ ...current, ownerKind: event.target.value }))}
                placeholder="builder"
                style={inputStyle}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Title
              <input
                value={objectiveDraft.title}
                onChange={(event) => setObjectiveDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Keep Builder inbox work coordinated"
                style={inputStyle}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Description
              <textarea
                value={objectiveDraft.description}
                onChange={(event) => setObjectiveDraft((current) => ({ ...current, description: event.target.value }))}
                rows={4}
                style={{ ...textareaStyle, minHeight: 120 }}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Target scopes
              <input
                value={objectiveDraft.targetScopes}
                onChange={(event) => setObjectiveDraft((current) => ({ ...current, targetScopes: event.target.value }))}
                placeholder="frontend/src/components/workspaces, docs"
                style={inputStyle}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Success criteria
              <input
                value={objectiveDraft.successCriteria}
                onChange={(event) => setObjectiveDraft((current) => ({ ...current, successCriteria: event.target.value }))}
                placeholder="Builder shows queued jobs, threads can copy a check-in prompt"
                style={inputStyle}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Metadata JSON
              <textarea
                value={objectiveDraft.metadataJson}
                onChange={(event) => setObjectiveDraft((current) => ({ ...current, metadataJson: event.target.value }))}
                rows={4}
                style={{ ...textareaStyle, minHeight: 120 }}
              />
            </label>
          </div>

          <div style={actionRowStyle}>
            <button type="submit" style={buttonStyle} disabled={autonomyBusyLabel !== null}>
              {autonomyBusyLabel === "Creating objective" ? "Creating..." : "Add objective"}
            </button>
          </div>
        </form>

        <form onSubmit={(event) => void handleAutonomyJobSubmit(event)} style={stackStyle}>
          <article style={summaryCardStyle}>
            <strong>Add inbox job</strong>
            <p style={mutedParagraphStyle}>
              Queue a bounded manual job here when you want the next thread to inspect Builder,
              claim a lane safely, and help without colliding with existing mission-board owners.
            </p>
          </article>

          <div style={formGridStyle}>
            <label style={fieldStyle}>
              Job ID
              <input
                value={jobDraft.id}
                onChange={(event) => setJobDraft((current) => ({ ...current, id: event.target.value }))}
                placeholder="job-check-builder-inbox"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Objective
              <select
                value={jobDraft.objectiveId}
                onChange={(event) => setJobDraft((current) => ({ ...current, objectiveId: event.target.value }))}
                style={inputStyle}
              >
                <option value="">No linked objective</option>
                {autonomyObjectives.map((objective) => (
                  <option key={objective.id} value={objective.id}>
                    {objective.title} ({objective.id})
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              Job kind
              <input
                value={jobDraft.jobKind}
                onChange={(event) => setJobDraft((current) => ({ ...current, jobKind: event.target.value }))}
                placeholder="manual-thread-check"
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Status
              <select
                value={jobDraft.status}
                onChange={(event) => setJobDraft((current) => ({ ...current, status: event.target.value }))}
                style={inputStyle}
              >
                <option value="queued">queued</option>
                <option value="running">running</option>
                <option value="blocked">blocked</option>
                <option value="succeeded">succeeded</option>
                <option value="failed">failed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Title
              <input
                value={jobDraft.title}
                onChange={(event) => setJobDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="Check the Builder inbox and claim the next safe slice"
                style={inputStyle}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Summary
              <textarea
                value={jobDraft.summary}
                onChange={(event) => setJobDraft((current) => ({ ...current, summary: event.target.value }))}
                rows={4}
                style={{ ...textareaStyle, minHeight: 120 }}
              />
            </label>

            <label style={fieldStyle}>
              Assigned lane
              <input
                value={jobDraft.assignedLane}
                onChange={(event) => setJobDraft((current) => ({ ...current, assignedLane: event.target.value }))}
                placeholder={selectedWorker?.worker_id ?? "builder"}
                style={inputStyle}
              />
            </label>

            <label style={fieldStyle}>
              Max retries
              <input
                type="number"
                min={0}
                max={20}
                value={jobDraft.maxRetries}
                onChange={(event) => setJobDraft((current) => ({
                  ...current,
                  maxRetries: Number(event.target.value) || 0,
                }))}
                style={inputStyle}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Resource keys
              <input
                value={jobDraft.resourceKeys}
                onChange={(event) => setJobDraft((current) => ({ ...current, resourceKeys: event.target.value }))}
                placeholder="builder-inbox, worker-lifecycle"
                style={inputStyle}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Depends on
              <input
                value={jobDraft.dependsOn}
                onChange={(event) => setJobDraft((current) => ({ ...current, dependsOn: event.target.value }))}
                placeholder="job-seed-builder-objective"
                style={inputStyle}
              />
            </label>

            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              Input payload JSON
              <textarea
                value={jobDraft.inputPayloadJson}
                onChange={(event) => setJobDraft((current) => ({ ...current, inputPayloadJson: event.target.value }))}
                rows={4}
                style={{ ...textareaStyle, minHeight: 120 }}
              />
            </label>
          </div>

          <div style={actionRowStyle}>
            <button type="submit" style={buttonStyle} disabled={autonomyBusyLabel !== null}>
              {autonomyBusyLabel === "Creating job" ? "Creating..." : "Add inbox job"}
            </button>
          </div>
        </form>
      </div>

      <section style={stackStyle}>
        <strong>Objectives</strong>
        {autonomyObjectives.length ? autonomyObjectives.map(renderAutonomyObjectiveCard) : (
          <article style={summaryCardStyle}>
            <span>{autonomyLoading ? "Loading objectives..." : "No Builder objectives are recorded yet."}</span>
          </article>
        )}
      </section>

      <section style={stackStyle}>
        <strong>Jobs</strong>
        <article style={summaryCardStyle}>
          <strong>Stuck-thread signals</strong>
          <div style={metaStackStyle}>
            <span>Stale blockers: {staleBlockedJobCount}</span>
            <span>Refresh requests pending: {refreshPendingJobCount}</span>
            <span>Jobs linked to stale worker heartbeats: {staleWorkerJobCount}</span>
            <span>
              Use these signals to decide whether to wait, ping refresh, or resolve a healing action
              instead of polling the same lane repeatedly.
            </span>
          </div>
        </article>
        {autonomyJobEntries.length ? autonomyJobEntries.map(({ job, objective, attentionSignals }) => {
          const missionTaskId = getMissionTaskIdFromAutonomyJob(job);
          const scopePaths = resolveAutonomyJobScopePaths(job, objective);
          const missionTaskStatus = typeof job.output_payload["mission_control_task_status"] === "string"
            ? String(job.output_payload["mission_control_task_status"])
            : "not linked";
          const linkedTaskOwner = typeof job.output_payload["mission_control_claimed_by_worker_id"] === "string"
            ? String(job.output_payload["mission_control_claimed_by_worker_id"])
            : "unclaimed";

          return (
            <div key={job.id} style={stackStyle}>
              {renderAutonomyJobCard(job, attentionSignals)}
              <div style={actionRowStyle}>
                <button
                  type="button"
                  style={buttonStyle}
                  disabled={autonomyBusyLabel !== null}
                  onClick={() => void handlePromoteAutonomyJob(job)}
                >
                  {missionTaskId
                    ? (selectedWorkerId ? "Claim linked task" : "Refresh linked task")
                    : (selectedWorkerId ? "Promote + claim" : "Promote to task")}
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={autonomyBusyLabel !== null}
                  onClick={() => void handleAutonomyJobStatusPatch(job, "running")}
                >
                  Mark running
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={autonomyBusyLabel !== null}
                  onClick={() => void handleAutonomyJobStatusPatch(job, "blocked")}
                >
                  Mark blocked
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={autonomyBusyLabel !== null || !missionTaskId || !selectedWorkerId}
                  onClick={() => void handleWaitAutonomyJob(job)}
                >
                  {missionTaskId ? "Wait on linked task" : "Wait after linking"}
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={autonomyBusyLabel !== null || !missionTaskId || !selectedWorkerId}
                  onClick={() => void handleReleaseAutonomyJob(job)}
                >
                  {missionTaskId ? "Release linked task" : "Release after linking"}
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={autonomyBusyLabel !== null}
                  onClick={() => void handlePingAutonomyJobRefresh(job)}
                >
                  {attentionSignals.some((signal) => signal.id === "refresh-pending")
                    ? "Refresh already pending"
                    : "Ping refresh"}
                </button>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={autonomyBusyLabel !== null || !missionTaskId || !selectedWorkerId}
                  onClick={() => void handleCompleteAutonomyJob(job)}
                >
                  {missionTaskId ? "Complete + succeed" : "Succeed after linking"}
                </button>
              </div>
              <article style={summaryCardStyle}>
                <strong>Promotion inputs</strong>
                <div style={metaStackStyle}>
                  <span>Derived scope paths: <code>{scopePaths.join(", ") || "none"}</code></span>
                  <span>Selected worker: <code>{selectedWorkerId || "none selected"}</code></span>
                  <span>Linked objective priority: {objective?.priority ?? "default 100"}</span>
                  <span>Linked task status: <code>{missionTaskStatus}</code></span>
                  <span>Linked owner: <code>{linkedTaskOwner}</code></span>
                </div>
              </article>
            </div>
          );
        }) : (
          <article style={summaryCardStyle}>
            <span>{autonomyLoading ? "Loading jobs..." : "No inbox jobs are queued yet."}</span>
          </article>
        )}
      </section>

      <div style={summaryGridStyle}>
        <section style={stackStyle}>
          <strong>Observations</strong>
          {autonomyObservations.length ? autonomyObservations.slice(0, 4).map((observation) => {
            const linkedJobId = getObservationLinkedJobId(observation);
            return (
              <div key={observation.id} style={stackStyle}>
                {renderAutonomyObservationCard(observation)}
                <div style={actionRowStyle}>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    disabled={autonomyBusyLabel !== null || getObservationHandledAt(observation) !== null}
                    onClick={() => void handleMarkObservationHandled(observation)}
                  >
                    {getObservationHandledAt(observation) ? "Handled" : "Mark handled"}
                  </button>
                  {linkedJobId ? (
                    <span style={{ ...pillStyle, ...toneStyle("neutral") }}>
                      linked job <code>{linkedJobId}</code>
                    </span>
                  ) : null}
                </div>
              </div>
            );
          }) : (
            <article style={summaryCardStyle}>
              <span>No observations are recorded yet.</span>
            </article>
          )}
        </section>

        <section style={stackStyle}>
          <strong>Healing actions</strong>
          {autonomyHealingActions.length ? autonomyHealingActions.slice(0, 4).map((action) => (
            <div key={action.id} style={stackStyle}>
              {renderAutonomyHealingCard(action)}
              <div style={actionRowStyle}>
                <button
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={autonomyBusyLabel !== null || action.status === "succeeded"}
                  onClick={() => void handleResolveHealingAction(action)}
                >
                  {action.status === "succeeded" ? "Resolved" : "Resolve + requeue"}
                </button>
              </div>
            </div>
          )) : (
            <article style={summaryCardStyle}>
              <span>No healing actions are recorded yet.</span>
            </article>
          )}
        </section>
      </div>

      <section style={stackStyle}>
        <strong>Memory</strong>
        {autonomyMemories.length ? autonomyMemories.slice(0, 4).map(renderAutonomyMemoryCard) : (
          <article style={summaryCardStyle}>
            <span>No Builder memory entries are recorded yet.</span>
          </article>
        )}
      </section>

      <article style={summaryCardStyle}>
        <div style={rowBetweenStyle}>
          <strong>Manual inbox prompt for a new thread</strong>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => void handleCopyAutonomyThreadPrompt()}
          >
            Copy inbox prompt
          </button>
        </div>
        <p style={mutedParagraphStyle}>
          Paste this into a new Codex thread when you want it to open Builder, inspect the inbox,
          respect mission-board ownership, and help manually from the current repo truth.
        </p>
        <textarea
          readOnly
          value={autonomyThreadPrompt}
          rows={18}
          style={textareaStyle}
        />
        {autonomyPromptMessage ? <p style={mutedParagraphStyle}>{autonomyPromptMessage}</p> : null}
      </article>
    </div>
  );

  return (
    <BuilderWorkspaceView
      overviewContent={overviewContent}
      worktreesContent={worktreesContent}
      missionBoardContent={missionBoardContent}
      laneCreateContent={laneCreateContent}
      workerLifecycleContent={workerLifecycleContent}
      terminalsContent={terminalsContent}
      autonomyInboxContent={autonomyInboxContent}
      recommendations={builderRecommendations}
      guidedMode={settings.layout.guidedMode}
    />
  );
}

const stackStyle = {
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const summaryGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
} satisfies CSSProperties;

const detailsSummaryStyle = {
  cursor: "pointer",
  fontWeight: 800,
  color: "var(--app-text)",
  marginBottom: 12,
} satisfies CSSProperties;

const workerSnapshotTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
} satisfies CSSProperties;

const workerAvatarStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  borderRadius: "999px",
  border: "1px solid color-mix(in srgb, var(--app-panel-border), white 18%)",
  color: "white",
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: "0.04em",
  overflow: "hidden",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
} satisfies CSSProperties;

const workerAvatarImageStyle = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
} satisfies CSSProperties;

const workerQuickAccessGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  marginTop: 12,
} satisfies CSSProperties;

const workerQuickAccessButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 16,
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg)",
  color: "var(--app-text)",
  textAlign: "left",
  cursor: "pointer",
} satisfies CSSProperties;

const workerQuickAccessButtonActiveStyle = {
  borderColor: "color-mix(in srgb, var(--app-accent), white 18%)",
  boxShadow: "0 0 0 3px color-mix(in srgb, var(--app-accent), transparent 76%)",
} satisfies CSSProperties;

const workerQuickAccessTextStyle = {
  display: "grid",
  gap: 2,
  minWidth: 0,
} satisfies CSSProperties;

const summaryCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  background: "var(--app-panel-bg-muted)",
  padding: "14px 16px",
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const listCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  background: "var(--app-panel-bg)",
  padding: "14px 16px",
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const rowBetweenStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
} satisfies CSSProperties;

const statusRailStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const pillStyle = {
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
} satisfies CSSProperties;

const metaStackStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 13,
} satisfies CSSProperties;

const mutedParagraphStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  lineHeight: 1.55,
} satisfies CSSProperties;

const terminalTailStyle = {
  margin: 0,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  fontFamily: `"Cascadia Code", "Fira Code", Consolas, monospace`,
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
} satisfies CSSProperties;

const formGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} satisfies CSSProperties;

const fieldStyle = {
  display: "grid",
  gap: 6,
  fontWeight: 600,
} satisfies CSSProperties;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid var(--app-input-border)",
  background: "var(--app-input-bg)",
  color: "var(--app-text-color)",
  boxShadow: "var(--app-input-shadow)",
  colorScheme: "var(--app-color-scheme)",
  caretColor: "var(--app-accent)",
  padding: "10px 12px",
  font: "inherit",
} satisfies CSSProperties;

const textareaStyle = {
  ...inputStyle,
  minHeight: 280,
  resize: "vertical",
  fontFamily: `"Cascadia Code", "Fira Code", Consolas, monospace`,
  lineHeight: 1.5,
} satisfies CSSProperties;

const checkboxRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontWeight: 600,
} satisfies CSSProperties;

const actionRowStyle = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
} satisfies CSSProperties;

const buttonStyle = {
  borderRadius: 10,
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  padding: "10px 14px",
  font: "inherit",
  cursor: "pointer",
} satisfies CSSProperties;

const secondaryButtonStyle = {
  ...buttonStyle,
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;
