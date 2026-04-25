export type RecommendationTone = "info" | "success" | "warning";

export type HomeRecommendationActionId =
  | "open_prompt"
  | "open_builder"
  | "open_runtime_overview"
  | "open_records_runs"
  | "open_operations_approvals";

export type RuntimeRecommendationActionId =
  | "open_runtime_overview"
  | "open_runtime_executors"
  | "open_runtime_workspaces"
  | "open_runtime_governance";

export type BuilderRecommendationActionId =
  | "open_builder_start"
  | "open_builder_mission_control"
  | "open_builder_active_lane"
  | "open_builder_autonomy";

export type RecommendationDescriptor<TActionId extends string = string> = {
  id: string;
  label: string;
  detail: string;
  actionLabel: string;
  actionId: TActionId;
  tone: RecommendationTone;
};

type HomeRecommendationInputs = {
  pendingApprovalCount: number;
  warningExecutionCount: number;
  unresolvedRunCount: number;
  persistenceReady: boolean;
  bridgeConfigured: boolean;
  bridgeHeartbeatFresh: boolean;
  supportsRealExecution: boolean;
};

type RuntimeRecommendationInputs = {
  persistenceReady: boolean;
  bridgeConfigured: boolean;
  bridgeHeartbeatFresh: boolean;
  supportsRealExecution: boolean;
  executorCount: number;
  workspaceCount: number;
  activeLockCount: number;
  policyCount: number;
};

type BuilderRecommendationInputs = {
  missionControlAvailable: boolean;
  workerCount: number;
  taskCount: number;
  waiterCount: number;
  unreadNotificationCount: number;
  terminalSessionCount: number;
  queuedAutonomyJobCount: number;
  autonomyAttentionCount: number;
};

export function buildHomeRecommendationDescriptors({
  pendingApprovalCount,
  warningExecutionCount,
  unresolvedRunCount,
  persistenceReady,
  bridgeConfigured,
  bridgeHeartbeatFresh,
  supportsRealExecution,
}: HomeRecommendationInputs): RecommendationDescriptor<HomeRecommendationActionId>[] {
  const recommendations: RecommendationDescriptor<HomeRecommendationActionId>[] = [];

  if (pendingApprovalCount > 0) {
    recommendations.push({
      id: "pending-approvals",
      label: "Approvals need a decision",
      detail: `${pendingApprovalCount} approval${pendingApprovalCount === 1 ? "" : "s"} are waiting before blocked work can continue.`,
      actionLabel: "Open approvals",
      actionId: "open_operations_approvals",
      tone: "warning",
    });
  }

  if (!persistenceReady || !bridgeConfigured || !bridgeHeartbeatFresh || !supportsRealExecution) {
    recommendations.push({
      id: "runtime-health",
      label: "Check runtime health",
      detail: buildRuntimeHealthDetail({
        persistenceReady,
        bridgeConfigured,
        bridgeHeartbeatFresh,
        supportsRealExecution,
      }),
      actionLabel: "Open runtime",
      actionId: "open_runtime_overview",
      tone: "warning",
    });
  }

  if (warningExecutionCount > 0 || unresolvedRunCount > 0) {
    recommendations.push({
      id: "records-review",
      label: "Review persisted records",
      detail: buildRecordsDetail({
        warningExecutionCount,
        unresolvedRunCount,
      }),
      actionLabel: "Open records",
      actionId: "open_records_runs",
      tone: "warning",
    });
  }

  const starterRecommendations: RecommendationDescriptor<HomeRecommendationActionId>[] = [
    {
      id: "start-prompt",
      label: "Start with Prompt Studio",
      detail: "Use the natural-language entry point when you want the fastest path from idea to a typed tool plan.",
      actionLabel: "Open Prompt Studio",
      actionId: "open_prompt",
      tone: "info",
    },
    {
      id: "open-builder",
      label: "Open Builder mission control",
      detail: "Use Builder when you want worktree lanes, mission-control tasks, or Codex-guided draft templates.",
      actionLabel: "Open Builder",
      actionId: "open_builder",
      tone: "info",
    },
    {
      id: "verify-runtime",
      label: "Verify live runtime posture",
      detail: "Check bridge, persistence, and governance posture before you rely on any live O3DE path.",
      actionLabel: "Open runtime",
      actionId: "open_runtime_overview",
      tone: "success",
    },
  ];

  for (const recommendation of starterRecommendations) {
    if (recommendations.length >= 3) {
      break;
    }
    if (recommendations.some((entry) => entry.actionId === recommendation.actionId)) {
      continue;
    }
    recommendations.push(recommendation);
  }

  return recommendations.slice(0, 3);
}

export function buildRuntimeRecommendationDescriptors({
  persistenceReady,
  bridgeConfigured,
  bridgeHeartbeatFresh,
  supportsRealExecution,
  executorCount,
  workspaceCount,
  activeLockCount,
  policyCount,
}: RuntimeRecommendationInputs): RecommendationDescriptor<RuntimeRecommendationActionId>[] {
  const recommendations: RecommendationDescriptor<RuntimeRecommendationActionId>[] = [];

  if (!persistenceReady || !bridgeConfigured || !bridgeHeartbeatFresh || !supportsRealExecution) {
    recommendations.push({
      id: "runtime-health",
      label: "Check runtime health",
      detail: buildRuntimeHealthDetail({
        persistenceReady,
        bridgeConfigured,
        bridgeHeartbeatFresh,
        supportsRealExecution,
      }),
      actionLabel: "Open runtime overview",
      actionId: "open_runtime_overview" satisfies RuntimeRecommendationActionId,
      tone: "warning",
    });
  }

  if (activeLockCount > 0) {
    recommendations.push({
      id: "runtime-locks",
      label: "Review active locks",
      detail: `${activeLockCount} active lock${activeLockCount === 1 ? "" : "s"} may affect dispatch ordering or explain why work is waiting.`,
      actionLabel: "Open governance",
      actionId: "open_runtime_governance" satisfies RuntimeRecommendationActionId,
      tone: "warning",
    });
  }

  if (workspaceCount === 0) {
    recommendations.push({
      id: "runtime-workspaces-empty",
      label: "Confirm workspace records",
      detail: "No workspace records are visible yet, so check the workspace lane before assuming substrate ownership is established.",
      actionLabel: "Open workspaces",
      actionId: "open_runtime_workspaces" satisfies RuntimeRecommendationActionId,
      tone: "info",
    });
  }

  if (executorCount === 0) {
    recommendations.push({
      id: "runtime-executors-empty",
      label: "Confirm executor inventory",
      detail: "No executor records are visible yet, so check executor availability before assigning work to a runner lane.",
      actionLabel: "Open executors",
      actionId: "open_runtime_executors" satisfies RuntimeRecommendationActionId,
      tone: "info",
    });
  }

  const starterRecommendations: RecommendationDescriptor<RuntimeRecommendationActionId>[] = [
    {
      id: "runtime-governance",
      label: "Review capability boundaries",
      detail: policyCount > 0
        ? `${policyCount} policy record${policyCount === 1 ? "" : "s"} are available for checking admitted-real, plan-only, and simulated boundaries.`
        : "Open governance before widening any claim about real O3DE execution.",
      actionLabel: "Open governance",
      actionId: "open_runtime_governance" satisfies RuntimeRecommendationActionId,
      tone: "success",
    },
    {
      id: "runtime-workspaces",
      label: "Inspect workspaces",
      detail: workspaceCount > 0
        ? `${workspaceCount} workspace record${workspaceCount === 1 ? "" : "s"} can help confirm ownership and cleanup state.`
        : "Use workspace records to confirm ownership before treating a lane as ready.",
      actionLabel: "Open workspaces",
      actionId: "open_runtime_workspaces" satisfies RuntimeRecommendationActionId,
      tone: "info",
    },
    {
      id: "runtime-executors",
      label: "Inspect executors",
      detail: executorCount > 0
        ? `${executorCount} executor record${executorCount === 1 ? "" : "s"} can help confirm runner availability.`
        : "Use executor records to confirm runner availability before routing work.",
      actionLabel: "Open executors",
      actionId: "open_runtime_executors" satisfies RuntimeRecommendationActionId,
      tone: "info",
    },
  ];

  return fillRecommendationSlots(recommendations, starterRecommendations);
}

export function buildBuilderRecommendationDescriptors({
  missionControlAvailable,
  workerCount,
  taskCount,
  waiterCount,
  unreadNotificationCount,
  terminalSessionCount,
  queuedAutonomyJobCount,
  autonomyAttentionCount,
}: BuilderRecommendationInputs): RecommendationDescriptor<BuilderRecommendationActionId>[] {
  const recommendations: RecommendationDescriptor<BuilderRecommendationActionId>[] = [];

  if (!missionControlAvailable) {
    recommendations.push({
      id: "builder-setup",
      label: "Check Builder setup",
      detail: "Mission-control tooling is not available yet, so start with the Builder overview and lane setup before assigning work.",
      actionLabel: "Open Builder start",
      actionId: "open_builder_start" satisfies BuilderRecommendationActionId,
      tone: "warning",
    });
  }

  if (unreadNotificationCount > 0 || waiterCount > 0) {
    recommendations.push({
      id: "builder-mission-control",
      label: "Resolve board attention",
      detail: buildBuilderBoardDetail({ unreadNotificationCount, waiterCount }),
      actionLabel: "Open mission control",
      actionId: "open_builder_mission_control" satisfies BuilderRecommendationActionId,
      tone: "warning",
    });
  }

  if (workerCount === 0) {
    recommendations.push({
      id: "builder-first-lane",
      label: "Create a worker lane",
      detail: "No worker lanes are registered yet, so start by creating a worktree lane before asking another thread to help.",
      actionLabel: "Open Builder start",
      actionId: "open_builder_start" satisfies BuilderRecommendationActionId,
      tone: "info",
    });
  }

  if (autonomyAttentionCount > 0 || queuedAutonomyJobCount > 0) {
    recommendations.push({
      id: "builder-autonomy",
      label: "Review Builder inbox",
      detail: buildBuilderAutonomyDetail({ autonomyAttentionCount, queuedAutonomyJobCount }),
      actionLabel: "Open autonomy inbox",
      actionId: "open_builder_autonomy" satisfies BuilderRecommendationActionId,
      tone: autonomyAttentionCount > 0 ? "warning" : "info",
    });
  }

  if (terminalSessionCount > 0) {
    recommendations.push({
      id: "builder-active-lane",
      label: "Check managed terminals",
      detail: `${terminalSessionCount} managed terminal session${terminalSessionCount === 1 ? "" : "s"} are visible for lane-level observation or stop requests.`,
      actionLabel: "Open active lane",
      actionId: "open_builder_active_lane" satisfies BuilderRecommendationActionId,
      tone: "info",
    });
  }

  const starterRecommendations: RecommendationDescriptor<BuilderRecommendationActionId>[] = [
    {
      id: "builder-start",
      label: "Start with lane setup",
      detail: workerCount > 0
        ? `${workerCount} worker lane${workerCount === 1 ? "" : "s"} are available; use Start Here to review lane setup and worktrees.`
        : "Use Start Here to create the first safe worker lane.",
      actionLabel: "Open Builder start",
      actionId: "open_builder_start" satisfies BuilderRecommendationActionId,
      tone: "success",
    },
    {
      id: "builder-board",
      label: "Check mission board",
      detail: taskCount > 0
        ? `${taskCount} mission-control task${taskCount === 1 ? "" : "s"} are visible for claim, release, wait, or completion.`
        : "Use Mission Control to seed shared tasks before parallel threads start editing overlapping scopes.",
      actionLabel: "Open mission control",
      actionId: "open_builder_mission_control" satisfies BuilderRecommendationActionId,
      tone: "info",
    },
    {
      id: "builder-inbox",
      label: "Prepare Codex inbox drafts",
      detail: "Use Autonomy to load practical draft recommendations into objective and job templates.",
      actionLabel: "Open autonomy inbox",
      actionId: "open_builder_autonomy" satisfies BuilderRecommendationActionId,
      tone: "info",
    },
  ];

  return fillRecommendationSlots(recommendations, starterRecommendations);
}

function fillRecommendationSlots<TActionId extends string>(
  primaryRecommendations: RecommendationDescriptor<TActionId>[],
  starterRecommendations: RecommendationDescriptor<TActionId>[],
): RecommendationDescriptor<TActionId>[] {
  const recommendations = [...primaryRecommendations];
  for (const recommendation of starterRecommendations) {
    if (recommendations.length >= 3) {
      break;
    }
    if (recommendations.some((entry) => entry.actionId === recommendation.actionId)) {
      continue;
    }
    recommendations.push(recommendation);
  }
  return recommendations.slice(0, 3);
}

function buildRuntimeHealthDetail({
  persistenceReady,
  bridgeConfigured,
  bridgeHeartbeatFresh,
  supportsRealExecution,
}: Pick<HomeRecommendationInputs, "persistenceReady" | "bridgeConfigured" | "bridgeHeartbeatFresh" | "supportsRealExecution">): string {
  if (!persistenceReady) {
    return "Backend persistence is not ready yet, so the desktop cannot safely treat runtime state as healthy.";
  }
  if (!bridgeConfigured) {
    return "The live editor bridge is not configured for the current target, so real-editor claims need verification before dispatch.";
  }
  if (!bridgeHeartbeatFresh) {
    return "The live editor bridge heartbeat is stale, so runtime truth may be behind the real target state.";
  }
  if (!supportsRealExecution) {
    return "The active adapter posture does not currently expose real execution, so check the runtime boundary before making live-authoring assumptions.";
  }
  return "Runtime state looks healthy enough for the next operator step.";
}

function buildRecordsDetail({
  warningExecutionCount,
  unresolvedRunCount,
}: Pick<HomeRecommendationInputs, "warningExecutionCount" | "unresolvedRunCount">): string {
  if (warningExecutionCount > 0 && unresolvedRunCount > 0) {
    return `${warningExecutionCount} warning-bearing execution${warningExecutionCount === 1 ? "" : "s"} and ${unresolvedRunCount} unresolved run${unresolvedRunCount === 1 ? "" : "s"} still need review.`;
  }
  if (warningExecutionCount > 0) {
    return `${warningExecutionCount} warning-bearing execution${warningExecutionCount === 1 ? "" : "s"} still need operator review.`;
  }
  return `${unresolvedRunCount} unresolved run${unresolvedRunCount === 1 ? "" : "s"} still need operator review.`;
}

function buildBuilderBoardDetail({
  unreadNotificationCount,
  waiterCount,
}: Pick<BuilderRecommendationInputs, "unreadNotificationCount" | "waiterCount">): string {
  if (unreadNotificationCount > 0 && waiterCount > 0) {
    return `${unreadNotificationCount} unread notification${unreadNotificationCount === 1 ? "" : "s"} and ${waiterCount} waiter${waiterCount === 1 ? "" : "s"} need board review.`;
  }
  if (unreadNotificationCount > 0) {
    return `${unreadNotificationCount} unread notification${unreadNotificationCount === 1 ? "" : "s"} need review before threads assume the board is quiet.`;
  }
  return `${waiterCount} waiter${waiterCount === 1 ? "" : "s"} are waiting for resources or a turn to continue.`;
}

function buildBuilderAutonomyDetail({
  autonomyAttentionCount,
  queuedAutonomyJobCount,
}: Pick<BuilderRecommendationInputs, "autonomyAttentionCount" | "queuedAutonomyJobCount">): string {
  if (autonomyAttentionCount > 0 && queuedAutonomyJobCount > 0) {
    return `${autonomyAttentionCount} inbox attention signal${autonomyAttentionCount === 1 ? "" : "s"} and ${queuedAutonomyJobCount} queued job${queuedAutonomyJobCount === 1 ? "" : "s"} are ready for review.`;
  }
  if (autonomyAttentionCount > 0) {
    return `${autonomyAttentionCount} inbox attention signal${autonomyAttentionCount === 1 ? "" : "s"} need review.`;
  }
  return `${queuedAutonomyJobCount} queued autonomy job${queuedAutonomyJobCount === 1 ? "" : "s"} can be turned into concrete work or checked by a thread.`;
}
