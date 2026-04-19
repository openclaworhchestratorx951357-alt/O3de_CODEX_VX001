import type { ArtifactListItem, ExecutionListItem } from "../types/contracts";

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
