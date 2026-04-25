export type LaneDraft = {
  workerId: string;
  displayName: string;
  agentProfile: string;
  agentRuntime: string;
  agentEntrypoint: string;
  agentAccessNotes: string;
  identityNotes: string;
  personalityNotes: string;
  soulDirective: string;
  memoryNotes: string;
  bootstrapNotes: string;
  capabilityTags: string;
  contextSources: string;
  avatarLabel: string;
  avatarColor: string;
  avatarUri: string;
  branchName: string;
  worktreePath: string;
  baseBranch: string;
  resumeNotes: string;
  bootstrap: boolean;
};

export type TaskDraft = {
  title: string;
  summary: string;
  priority: number;
  branchPrefix: string;
  scopePaths: string;
};

export type TaskSupersedeDraft = {
  sourceTaskId: string;
  replacementTitle: string;
  replacementSummary: string;
  replacementPriority: number;
  replacementScopePaths: string;
  replacementBranchPrefix: string;
  supersedeReason: string;
  stopActiveTerminal: boolean;
};

export type WorkerSyncDraft = {
  workerId: string;
  displayName: string;
  agentProfile: string;
  agentRuntime: string;
  agentEntrypoint: string;
  agentAccessNotes: string;
  identityNotes: string;
  personalityNotes: string;
  soulDirective: string;
  memoryNotes: string;
  bootstrapNotes: string;
  capabilityTags: string;
  contextSources: string;
  avatarLabel: string;
  avatarColor: string;
  avatarUri: string;
  branchName: string;
  worktreePath: string;
  baseBranch: string;
  status: string;
  summary: string;
  resumeNotes: string;
};

export type WorkerHeartbeatDraft = {
  status: string;
  summary: string;
  currentTaskId: string;
  agentProfile: string;
  agentRuntime: string;
  agentEntrypoint: string;
  agentAccessNotes: string;
  identityNotes: string;
  personalityNotes: string;
  soulDirective: string;
  memoryNotes: string;
  bootstrapNotes: string;
  capabilityTags: string;
  contextSources: string;
  avatarLabel: string;
  avatarColor: string;
  avatarUri: string;
  branchName: string;
  worktreePath: string;
  baseBranch: string;
  resumeNotes: string;
};

export type LoadedWorkerDraftReview = {
  label: string;
  changedFields: string;
  workerId: string;
  status: string;
  branchName: string;
  worktreePath: string;
  baseBranch: string;
  currentTaskId?: string;
  agentProfile?: string;
  agentRuntime?: string;
  agentEntrypoint?: string;
  agentAccessNotes?: string;
  identityNotes?: string;
  personalityNotes?: string;
  soulDirective?: string;
  memoryNotes?: string;
  bootstrapNotes?: string;
  capabilityTags?: string;
  contextSources?: string;
  avatar?: string;
  summary: string;
  resumeNotes?: string;
  safeMessage: string;
};

export type AutonomyObjectiveDraft = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  targetScopes: string;
  successCriteria: string;
  ownerKind: string;
  metadataJson: string;
};

export type AutonomyJobDraft = {
  id: string;
  objectiveId: string;
  jobKind: string;
  title: string;
  summary: string;
  status: string;
  assignedLane: string;
  resourceKeys: string;
  dependsOn: string;
  inputPayloadJson: string;
  maxRetries: number;
};

export type TerminalLaunchDraft = {
  label: string;
  taskId: string;
  cwd: string;
  commandJson: string;
};

export type AttentionTone = "neutral" | "success" | "warning" | "info";

export type AutonomyJobAttentionSignal = {
  id: string;
  label: string;
  tone: AttentionTone;
  detail: string;
};

export type AutonomyDraftRecommendation = {
  id: string;
  label: string;
  detail: string;
  objective: AutonomyObjectiveDraft;
  job: AutonomyJobDraft;
};
