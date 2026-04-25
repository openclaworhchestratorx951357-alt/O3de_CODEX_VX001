import type {
  ControlPlaneSummaryResponse,
  ReadinessStatus,
  RunAuditRecord,
  RunListItem,
} from "../types/contracts";

export function getDominantMode(entries: Record<string, number>): string | null {
  const sortedEntries = Object.entries(entries).sort((left, right) => right[1] - left[1]);
  return sortedEntries[0]?.[0] ?? null;
}

export function getRunAuditStatusLabel(
  item: RunListItem,
  audit: RunAuditRecord | undefined,
): string | null {
  if (item.tool !== "settings.patch") {
    return null;
  }
  if (audit?.audit_status) {
    return audit.audit_status;
  }
  if (item.execution_mode === "simulated") {
    return "simulated";
  }
  return "unknown";
}

export function getRunAttentionLabel(
  item: RunListItem,
  audit: RunAuditRecord | undefined,
): string {
  const auditStatus = getRunAuditStatusLabel(item, audit);
  if (item.execution_mode === "simulated") {
    return "Simulation boundary";
  }
  if (auditStatus && auditStatus !== "unknown" && auditStatus !== "simulated") {
    return "Audit review needed";
  }
  if (item.status === "running" || item.status === "waiting_approval" || item.status === "pending") {
    return "Live decision state";
  }
  return "Routine follow-up";
}

export function getOverviewRunAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  const liveRuns = (summary.runs_by_status.running ?? 0)
    + (summary.runs_by_status.pending ?? 0)
    + (summary.runs_by_status.waiting_approval ?? 0);

  if (liveRuns > 0) {
    return "Live decision state";
  }

  return "Routine follow-up";
}

export function getOverviewApprovalAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  if (summary.approvals_pending > 0) {
    return "Audit review needed";
  }

  return "Routine follow-up";
}

export function getOverviewExecutionAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  if ((summary.executions_by_mode.simulated ?? 0) > 0) {
    return "Simulation boundary";
  }

  if ((summary.executions_by_status.running ?? 0) > 0) {
    return "Live decision state";
  }

  return "Routine follow-up";
}

export function getOverviewArtifactAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  if ((summary.artifacts_by_mode.simulated ?? 0) > 0) {
    return "Simulation boundary";
  }

  return "Routine follow-up";
}

export function getOverviewEventAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  if (summary.active_events > 0) {
    return "Monitor active pressure";
  }

  return "Routine follow-up";
}

export function getOverviewLockAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  if (summary.locks_total > 0) {
    return "Monitor live occupancy";
  }

  return "Routine follow-up";
}

export function getPersistenceAttentionLabel(readiness: ReadinessStatus): string {
  if (!readiness.persistence_ready || readiness.persistence_warning) {
    return "Audit review needed";
  }

  return "Operator baseline confirmed";
}

export function getSchemaAttentionLabel(readiness: ReadinessStatus): string {
  if (readiness.schema_validation.active_unsupported_keywords.length > 0) {
    return "Audit review needed";
  }

  return "Routine follow-up";
}

export function getCoverageAttentionLabel(readiness: ReadinessStatus): string {
  const coveredFamilies = readiness.schema_validation.persisted_family_coverage
    .filter((family) => family.execution_details_tools > 0);

  if (coveredFamilies.length === 0) {
    return "Audit review needed";
  }

  if (coveredFamilies.length < readiness.schema_validation.persisted_family_coverage.length) {
    return "Monitor partial coverage";
  }

  return "Operator baseline confirmed";
}

export function getAdapterAttentionLabel(readiness: ReadinessStatus): string {
  if (readiness.adapter_mode.configured_mode === "simulated") {
    return "Simulation boundary";
  }

  if (!readiness.adapter_mode.supports_real_execution) {
    return "Audit review needed";
  }

  return "Routine follow-up";
}
