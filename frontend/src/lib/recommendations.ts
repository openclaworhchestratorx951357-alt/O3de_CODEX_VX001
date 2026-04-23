export type RecommendationTone = "info" | "success" | "warning";

export type HomeRecommendationActionId =
  | "open_prompt"
  | "open_builder"
  | "open_runtime_overview"
  | "open_records_runs"
  | "open_operations_approvals";

export type RecommendationDescriptor = {
  id: string;
  label: string;
  detail: string;
  actionLabel: string;
  actionId: HomeRecommendationActionId;
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

export function buildHomeRecommendationDescriptors({
  pendingApprovalCount,
  warningExecutionCount,
  unresolvedRunCount,
  persistenceReady,
  bridgeConfigured,
  bridgeHeartbeatFresh,
  supportsRealExecution,
}: HomeRecommendationInputs): RecommendationDescriptor[] {
  const recommendations: RecommendationDescriptor[] = [];

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

  const starterRecommendations: RecommendationDescriptor[] = [
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
