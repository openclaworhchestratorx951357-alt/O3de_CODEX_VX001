import type { ArtifactListItem, ExecutionListItem } from "../types/contracts";

export type PrioritySelectionReason = {
  label: string;
  description: string;
};

export type PriorityActionRecommendation = {
  label: string;
  description: string;
};

export type AttentionCue = {
  label: string;
  description: string;
};

function parseTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getExecutionStatusRank(status: string): number {
  switch (status) {
    case "succeeded":
      return 6;
    case "running":
      return 5;
    case "waiting_approval":
      return 4;
    case "blocked":
      return 3;
    case "pending":
      return 2;
    case "failed":
      return 1;
    case "rejected":
      return 0;
    default:
      return 0;
  }
}

function getArtifactAuditRank(status: string | null | undefined): number {
  switch (status) {
    case "succeeded":
    case "verified":
    case "completed":
      return 4;
    case "mutation_ready":
    case "ready":
      return 3;
    case "planned":
    case "preflight":
      return 2;
    case "failed":
    case "rolled_back":
      return 1;
    default:
      return 0;
  }
}

function compareDescending(left: number, right: number): number {
  return right - left;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function hasMoreRecentTimestamp(
  leftValue: string | null | undefined,
  rightValue: string | null | undefined,
): boolean {
  return parseTimestamp(leftValue) > parseTimestamp(rightValue);
}

export function compareExecutionPriority(
  left: ExecutionListItem,
  right: ExecutionListItem,
): number {
  const modeComparison = compareDescending(
    left.execution_mode === "real" ? 1 : 0,
    right.execution_mode === "real" ? 1 : 0,
  );
  if (modeComparison !== 0) {
    return modeComparison;
  }

  const statusComparison = compareDescending(
    getExecutionStatusRank(left.status),
    getExecutionStatusRank(right.status),
  );
  if (statusComparison !== 0) {
    return statusComparison;
  }

  const auditComparison = compareDescending(
    left.mutation_audit_status ? 1 : 0,
    right.mutation_audit_status ? 1 : 0,
  );
  if (auditComparison !== 0) {
    return auditComparison;
  }

  const artifactComparison = compareDescending(left.artifact_count, right.artifact_count);
  if (artifactComparison !== 0) {
    return artifactComparison;
  }

  const recencyComparison = compareDescending(
    parseTimestamp(left.finished_at ?? left.started_at),
    parseTimestamp(right.finished_at ?? right.started_at),
  );
  if (recencyComparison !== 0) {
    return recencyComparison;
  }

  return compareText(left.id, right.id);
}

export function getPreferredExecution(
  executions: ExecutionListItem[],
): ExecutionListItem | null {
  if (executions.length === 0) {
    return null;
  }

  return [...executions].sort(compareExecutionPriority)[0] ?? null;
}

export function describeExecutionPriority(
  execution: ExecutionListItem,
  executions: ExecutionListItem[],
  selectedExecutionId?: string | null,
): PrioritySelectionReason {
  if (selectedExecutionId && execution.id === selectedExecutionId) {
    return {
      label: "Selected execution",
      description: "The operator explicitly selected this execution, so it stays in focus.",
    };
  }

  const peerExecutions = executions.filter((candidate) => candidate.id !== execution.id);
  const hasSimulatedPeer = peerExecutions.some((candidate) => candidate.execution_mode !== "real");
  if (execution.execution_mode === "real" && hasSimulatedPeer) {
    return {
      label: "Preferred real execution",
      description: "Chosen because this related execution is explicitly real while other candidates are simulated or non-real.",
    };
  }

  const statusRank = getExecutionStatusRank(execution.status);
  if (peerExecutions.some((candidate) => getExecutionStatusRank(candidate.status) < statusRank)) {
    return {
      label: "Higher execution status",
      description: `Chosen because this related execution has the strongest persisted status (${execution.status}).`,
    };
  }

  if (execution.mutation_audit_status && peerExecutions.some((candidate) => !candidate.mutation_audit_status)) {
    return {
      label: "Audit-backed execution",
      description: "Chosen because this related execution carries persisted mutation-audit evidence.",
    };
  }

  if (peerExecutions.some((candidate) => candidate.artifact_count < execution.artifact_count)) {
    return {
      label: "Richer evidence set",
      description: "Chosen because this related execution links to the largest persisted artifact set.",
    };
  }

  if (peerExecutions.some((candidate) => hasMoreRecentTimestamp(
    execution.finished_at ?? execution.started_at,
    candidate.finished_at ?? candidate.started_at,
  ))) {
    return {
      label: "Most recent execution",
      description: "Chosen because this related execution is the newest persisted record.",
    };
  }

  return {
    label: "Stable preferred execution",
    description: "Chosen by the shared evidence-priority rules to keep related execution focus stable.",
  };
}

export function recommendExecutionAction(
  execution: ExecutionListItem,
  selectedExecutionId?: string | null,
): PriorityActionRecommendation {
  if (selectedExecutionId && execution.id === selectedExecutionId) {
    return {
      label: "Review current execution",
      description: "Inspect this execution's warnings, status, and linked artifacts before switching context.",
    };
  }
  if (execution.mutation_audit_status) {
    return {
      label: "Review audit state",
      description: "Open this execution detail and verify the persisted mutation-audit outcome before taking follow-up action.",
    };
  }
  if (execution.execution_mode === "simulated") {
    return {
      label: "Verify simulation label",
      description: "Open this execution and confirm the simulated boundary before treating it as real operational evidence.",
    };
  }
  if (execution.status === "running" || execution.status === "waiting_approval") {
    return {
      label: "Monitor execution progress",
      description: "Open this execution to check whether it is still active, waiting on approval, or ready for the next operator decision.",
    };
  }
  return {
    label: "Open execution detail",
    description: "Inspect this execution's persisted evidence and linked artifacts to continue operator triage.",
  };
}

export function describeExecutionAttention(
  execution: ExecutionListItem,
  selectedExecutionId?: string | null,
): AttentionCue {
  if (selectedExecutionId && execution.id === selectedExecutionId) {
    return {
      label: "Current operator focus",
      description: "This execution is already selected and should remain the current decision lane.",
    };
  }
  if (execution.execution_mode === "simulated") {
    return {
      label: "Simulation boundary",
      description: "This execution needs operator attention because it remains explicitly simulated.",
    };
  }
  if (execution.mutation_audit_status) {
    return {
      label: "Audit review needed",
      description: "This execution carries persisted mutation-audit state that should be reviewed before proceeding.",
    };
  }
  if (execution.status === "running" || execution.status === "waiting_approval") {
    return {
      label: "Live decision state",
      description: "This execution may still require monitoring or approval-adjacent operator action.",
    };
  }
  return {
    label: "Routine follow-up",
    description: "This execution can be reviewed as part of normal operator triage.",
  };
}

export function compareArtifactPriority(
  left: ArtifactListItem,
  right: ArtifactListItem,
): number {
  const simulatedComparison = compareDescending(
    left.simulated ? 0 : 1,
    right.simulated ? 0 : 1,
  );
  if (simulatedComparison !== 0) {
    return simulatedComparison;
  }

  const modeComparison = compareDescending(
    left.execution_mode === "real" ? 1 : 0,
    right.execution_mode === "real" ? 1 : 0,
  );
  if (modeComparison !== 0) {
    return modeComparison;
  }

  const auditComparison = compareDescending(
    getArtifactAuditRank(left.mutation_audit_status),
    getArtifactAuditRank(right.mutation_audit_status),
  );
  if (auditComparison !== 0) {
    return auditComparison;
  }

  const inspectionComparison = compareDescending(
    left.inspection_surface ? 1 : 0,
    right.inspection_surface ? 1 : 0,
  );
  if (inspectionComparison !== 0) {
    return inspectionComparison;
  }

  const projectComparison = compareDescending(
    left.project_name ? 1 : 0,
    right.project_name ? 1 : 0,
  );
  if (projectComparison !== 0) {
    return projectComparison;
  }

  const recencyComparison = compareDescending(
    parseTimestamp(left.created_at),
    parseTimestamp(right.created_at),
  );
  if (recencyComparison !== 0) {
    return recencyComparison;
  }

  return compareText(left.id, right.id);
}

export function getPreferredArtifact(
  artifacts: ArtifactListItem[],
): ArtifactListItem | null {
  if (artifacts.length === 0) {
    return null;
  }

  return [...artifacts].sort(compareArtifactPriority)[0] ?? null;
}

export function describeArtifactPriority(
  artifact: ArtifactListItem,
  artifacts: ArtifactListItem[],
  selectedArtifactId?: string | null,
): PrioritySelectionReason {
  if (selectedArtifactId && artifact.id === selectedArtifactId) {
    return {
      label: "Selected artifact",
      description: "The operator explicitly selected this artifact, so it stays in focus.",
    };
  }

  const peerArtifacts = artifacts.filter((candidate) => candidate.id !== artifact.id);
  const hasSimulatedPeer = peerArtifacts.some((candidate) => candidate.simulated);
  if (!artifact.simulated && hasSimulatedPeer) {
    return {
      label: "Preferred non-simulated artifact",
      description: "Chosen because this artifact is not simulated while other related artifacts are explicitly simulated.",
    };
  }

  const hasNonRealPeer = peerArtifacts.some((candidate) => candidate.execution_mode !== "real");
  if (artifact.execution_mode === "real" && hasNonRealPeer) {
    return {
      label: "Preferred real artifact",
      description: "Chosen because this artifact came from an explicitly real execution mode.",
    };
  }

  const auditRank = getArtifactAuditRank(artifact.mutation_audit_status);
  if (auditRank > 0 && peerArtifacts.some((candidate) => getArtifactAuditRank(candidate.mutation_audit_status) < auditRank)) {
    return {
      label: "Audit-backed artifact",
      description: "Chosen because this artifact carries the strongest persisted mutation-audit status.",
    };
  }

  if (artifact.inspection_surface && peerArtifacts.some((candidate) => !candidate.inspection_surface)) {
    return {
      label: "Provenance-rich artifact",
      description: "Chosen because this artifact includes explicit persisted inspection provenance.",
    };
  }

  if (artifact.project_name && peerArtifacts.some((candidate) => !candidate.project_name)) {
    return {
      label: "Project-identified artifact",
      description: "Chosen because this artifact preserves explicit project identity metadata.",
    };
  }

  if (peerArtifacts.some((candidate) => hasMoreRecentTimestamp(artifact.created_at, candidate.created_at))) {
    return {
      label: "Most recent artifact",
      description: "Chosen because this artifact is the newest persisted related record.",
    };
  }

  return {
    label: "Stable preferred artifact",
    description: "Chosen by the shared evidence-priority rules to keep related artifact focus stable.",
  };
}

export function recommendArtifactAction(
  artifact: ArtifactListItem,
  selectedArtifactId?: string | null,
): PriorityActionRecommendation {
  if (selectedArtifactId && artifact.id === selectedArtifactId) {
    return {
      label: "Inspect current artifact",
      description: "Review this artifact's persisted detail, provenance, and simulation label before switching to another record.",
    };
  }
  if (artifact.mutation_audit_status) {
    return {
      label: "Check audit-backed artifact",
      description: "Open this artifact detail and verify the persisted mutation-audit evidence before using it as an operational reference.",
    };
  }
  if (artifact.simulated) {
    return {
      label: "Confirm simulated artifact",
      description: "Open this artifact and confirm that the simulated label is still appropriate before treating it as concrete output.",
    };
  }
  if (artifact.execution_mode === "real" || artifact.inspection_surface) {
    return {
      label: "Inspect provenance detail",
      description: "Open this artifact detail to review its persisted provenance and linked execution context.",
    };
  }
  return {
    label: "Open artifact detail",
    description: "Inspect this artifact's detail record to continue operator triage.",
  };
}

export function describeArtifactAttention(
  artifact: ArtifactListItem,
  selectedArtifactId?: string | null,
): AttentionCue {
  if (selectedArtifactId && artifact.id === selectedArtifactId) {
    return {
      label: "Current operator focus",
      description: "This artifact is already selected and should remain in the current decision lane.",
    };
  }
  if (artifact.simulated) {
    return {
      label: "Simulation boundary",
      description: "This artifact needs attention because it remains explicitly simulated.",
    };
  }
  if (artifact.mutation_audit_status) {
    return {
      label: "Audit-backed evidence",
      description: "This artifact carries persisted mutation-audit state that should be reviewed carefully.",
    };
  }
  if (artifact.execution_mode === "real" || artifact.inspection_surface) {
    return {
      label: "Provenance check",
      description: "This artifact deserves attention because it carries stronger persisted provenance.",
    };
  }
  return {
    label: "Routine follow-up",
    description: "This artifact can be reviewed during normal operator triage.",
  };
}
