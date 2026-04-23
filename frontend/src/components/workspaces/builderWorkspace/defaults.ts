import type {
  AutonomyJobDraft,
  AutonomyObjectiveDraft,
  LaneDraft,
  TaskDraft,
  TaskSupersedeDraft,
  TerminalLaunchDraft,
  WorkerHeartbeatDraft,
  WorkerSyncDraft,
} from "./types";

export const INITIAL_LANE_DRAFT: LaneDraft = {
  workerId: "",
  displayName: "",
  agentProfile: "Builder generalist",
  agentRuntime: "Codex Desktop",
  agentEntrypoint: "",
  agentAccessNotes: "User grants workspace/context access and approves any app-control script before execution.",
  identityNotes: "Named helper thread with its own branch, worktree, board identity, and resume trail.",
  personalityNotes: "Careful, concise, evidence-first, and collaborative.",
  soulDirective: "Protect the stable app while making steady, reviewable progress.",
  memoryNotes: "",
  bootstrapNotes: "Open this worktree, inspect mission control, claim only non-overlapping work, and publish heartbeats.",
  capabilityTags: "repo_read, mission_control",
  contextSources: "",
  avatarLabel: "",
  avatarColor: "#2563eb",
  avatarUri: "",
  branchName: "",
  worktreePath: "",
  baseBranch: "",
  resumeNotes: "",
  bootstrap: true,
};

export const INITIAL_TASK_DRAFT: TaskDraft = {
  title: "",
  summary: "",
  priority: 100,
  branchPrefix: "",
  scopePaths: "",
};

export const INITIAL_TASK_SUPERSEDE_DRAFT: TaskSupersedeDraft = {
  sourceTaskId: "",
  replacementTitle: "",
  replacementSummary: "",
  replacementPriority: 200,
  replacementScopePaths: "",
  replacementBranchPrefix: "",
  supersedeReason: "",
  stopActiveTerminal: true,
};

export const INITIAL_WORKER_SYNC_DRAFT: WorkerSyncDraft = {
  workerId: "",
  displayName: "",
  agentProfile: "",
  agentRuntime: "",
  agentEntrypoint: "",
  agentAccessNotes: "",
  identityNotes: "",
  personalityNotes: "",
  soulDirective: "",
  memoryNotes: "",
  bootstrapNotes: "",
  capabilityTags: "",
  contextSources: "",
  avatarLabel: "",
  avatarColor: "",
  avatarUri: "",
  branchName: "",
  worktreePath: "",
  baseBranch: "",
  status: "idle",
  summary: "",
  resumeNotes: "",
};

export const INITIAL_WORKER_HEARTBEAT_DRAFT: WorkerHeartbeatDraft = {
  status: "",
  summary: "",
  currentTaskId: "",
  agentProfile: "",
  agentRuntime: "",
  agentEntrypoint: "",
  agentAccessNotes: "",
  identityNotes: "",
  personalityNotes: "",
  soulDirective: "",
  memoryNotes: "",
  bootstrapNotes: "",
  capabilityTags: "",
  contextSources: "",
  avatarLabel: "",
  avatarColor: "",
  avatarUri: "",
  branchName: "",
  worktreePath: "",
  baseBranch: "",
  resumeNotes: "",
};

export const INITIAL_AUTONOMY_OBJECTIVE_DRAFT: AutonomyObjectiveDraft = {
  id: "",
  title: "",
  description: "",
  status: "active",
  priority: 100,
  targetScopes: "",
  successCriteria: "",
  ownerKind: "builder",
  metadataJson: "{}",
};

export const INITIAL_AUTONOMY_JOB_DRAFT: AutonomyJobDraft = {
  id: "",
  objectiveId: "",
  jobKind: "manual-thread-check",
  title: "",
  summary: "",
  status: "queued",
  assignedLane: "builder",
  resourceKeys: "",
  dependsOn: "",
  inputPayloadJson: "{}",
  maxRetries: 0,
};

export const INITIAL_TERMINAL_LAUNCH_DRAFT: TerminalLaunchDraft = {
  label: "",
  taskId: "",
  cwd: "",
  commandJson: "[\"powershell\", \"-NoProfile\", \"-Command\", \"Get-Location\"]",
};

export const STALE_BLOCKED_MINUTES = 10;
export const STALE_WORKER_HEARTBEAT_MINUTES = 10;

export const SUPPORTED_THREAD_CAPABILITIES = [
  "repo_read",
  "repo_edit",
  "frontend_ui",
  "backend_api",
  "o3de_bridge",
  "mission_control",
  "proof_validation",
  "docs_runbook",
  "terminal_observe",
  "terminal_control",
  "artifact_review",
  "source_upload_context",
  "external_agent",
  "openclaw_agent",
] as const;

export const THREAD_PROFILE_PRESETS = [
  {
    label: "Builder generalist",
    capabilityTags: "repo_read, repo_edit, mission_control, frontend_ui, backend_api",
    runtime: "Codex Desktop",
    accessNotes: "User grants repo/workspace access through Codex Desktop and app-control previews remain approval-gated.",
    color: "#2563eb",
  },
  {
    label: "O3DE authoring specialist",
    capabilityTags: "repo_read, mission_control, o3de_bridge, proof_validation, artifact_review",
    runtime: "Codex Desktop",
    accessNotes: "User grants O3DE target context through the repo bridge and keeps editor mutations approval-gated.",
    color: "#059669",
  },
  {
    label: "Frontend UX operator",
    capabilityTags: "repo_read, repo_edit, mission_control, frontend_ui, docs_runbook",
    runtime: "Codex Desktop",
    accessNotes: "User grants frontend worktree access; this worker should stay inside claimed UI scopes.",
    color: "#d97706",
  },
  {
    label: "Proof and release verifier",
    capabilityTags: "repo_read, mission_control, proof_validation, artifact_review, docs_runbook",
    runtime: "Codex Desktop",
    accessNotes: "User grants read/verification access; this worker should prefer evidence collection over mutation.",
    color: "#7c3aed",
  },
  {
    label: "OpenClaw external agent",
    capabilityTags: "repo_read, mission_control, source_upload_context, external_agent, openclaw_agent",
    runtime: "OpenClaw or compatible external agent",
    accessNotes: "User grants the external agent access to its own workspace/context pack; app-control actions still need user approval.",
    color: "#0f766e",
  },
] as const;
