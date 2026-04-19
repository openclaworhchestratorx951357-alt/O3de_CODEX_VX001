import { useMemo } from "react";

import type {
  RunListItem,
  RunAuditRecord,
  SettingsPatchAuditSummary,
} from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import {
  summaryActionButtonStyle,
  summaryBadgeStyle,
  summaryControlRowStyle,
  summaryFilterButtonStyle,
} from "./summaryPrimitives";

type RunsPanelProps = {
  items: RunListItem[];
  runAudits: RunAuditRecord[];
  settingsPatchAuditSummary: SettingsPatchAuditSummary | null;
  selectedToolFilter: ToolFilter;
  onToolFilterChange: (filter: ToolFilter) => void;
  selectedAuditFilter: AuditFilter;
  onAuditFilterChange: (filter: AuditFilter) => void;
  loading: boolean;
  error: string | null;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
};

type AuditFilter =
  | "all"
  | "preflight"
  | "blocked"
  | "succeeded"
  | "rolled_back"
  | "other";

type ToolFilter = "all" | "settings.patch";

const DEFAULT_AUDIT_FILTERS: AuditFilter[] = [
  "all",
  "preflight",
  "blocked",
  "succeeded",
  "rolled_back",
  "other",
];

export default function RunsPanel({
  items,
  runAudits,
  settingsPatchAuditSummary,
  selectedToolFilter,
  onToolFilterChange,
  selectedAuditFilter,
  onAuditFilterChange,
  loading,
  error,
  selectedRunId,
  onSelectRun,
}: RunsPanelProps) {
  const runAuditByRunId = useMemo(
    () => new Map(runAudits.map((audit) => [audit.run_id, audit] as const)),
    [runAudits],
  );
  const availableFilters = useMemo(
    () =>
      settingsPatchAuditSummary?.available_filters?.filter(
        (value): value is AuditFilter =>
          DEFAULT_AUDIT_FILTERS.includes(value as AuditFilter),
      ) ?? DEFAULT_AUDIT_FILTERS,
    [settingsPatchAuditSummary],
  );
  const filteredItems = items.filter((item) =>
    matchesAuditFilter(item, runAuditByRunId.get(item.id), selectedAuditFilter),
  );

  return (
    <SummarySection
      title="Runs"
      description="Runs reflect persisted control-plane bookkeeping. Execution mode remains explicitly labeled, including simulated flows."
      loading={loading}
      error={error}
      emptyMessage="No runs recorded yet."
      hasItems={filteredItems.length > 0}
    >
      <div style={summaryControlRowStyle}>
        {(["all", "settings.patch"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onToolFilterChange(value)}
            style={{
              ...summaryFilterButtonStyle,
              background: selectedToolFilter === value ? "#ddf4ff" : "#f6f8fa",
              borderColor: selectedToolFilter === value ? "#0969da" : "#d0d7de",
            }}
          >
            {value === "all" ? "All tools" : "settings.patch only"}
          </button>
        ))}
      </div>
      {settingsPatchAuditSummary && settingsPatchAuditSummary.total_runs > 0 ? (
        <div style={summaryControlRowStyle}>
          <span style={summaryBadgeStyle}>
            settings.patch runs: {settingsPatchAuditSummary.total_runs}
          </span>
          <span style={summaryBadgeStyle}>
            preflight: {settingsPatchAuditSummary.preflight}
          </span>
          <span style={summaryBadgeStyle}>
            blocked: {settingsPatchAuditSummary.blocked}
          </span>
          <span style={summaryBadgeStyle}>
            succeeded: {settingsPatchAuditSummary.succeeded}
          </span>
          <span style={summaryBadgeStyle}>
            rolled_back: {settingsPatchAuditSummary.rolled_back}
          </span>
          <span style={summaryBadgeStyle}>
            other: {settingsPatchAuditSummary.other}
          </span>
        </div>
      ) : null}
      {settingsPatchAuditSummary && settingsPatchAuditSummary.total_runs > 0 ? (
        <div style={summaryControlRowStyle}>
          {availableFilters.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onAuditFilterChange(value)}
              style={{
                ...summaryFilterButtonStyle,
                background: selectedAuditFilter === value ? "#ddf4ff" : "#f6f8fa",
                borderColor: selectedAuditFilter === value ? "#0969da" : "#d0d7de",
              }}
            >
              {getFilterLabel(value)}
            </button>
          ))}
        </div>
      ) : null}
      <SummaryList>
          {filteredItems.map((item) => {
            const capability = getRunCapabilityLabel(item);
            const executionTruth = getRunExecutionTruth(item);
            const audit = runAuditByRunId.get(item.id);
            const auditStatus = getAuditStatusLabel(item, audit);

            return (
              <SummaryListItem key={item.id} card>
                <strong>{item.tool}</strong>
                <div>Agent: {item.agent}</div>
                <div>Status: <StatusChip label={item.status} tone={getRunStatusTone(item.status)} /></div>
                <div>Execution mode: <StatusChip label={item.execution_mode} tone={getExecutionModeTone(item.execution_mode)} /></div>
                <div>Capability: <StatusChip label={capability} tone={getCapabilityTone(capability)} /></div>
                <div>Execution truth: {executionTruth}</div>
                {auditStatus ? (
                  <div>Audit status: <StatusChip label={auditStatus} tone={getAuditStatusTone(auditStatus)} /></div>
                ) : null}
                {audit?.audit_phase ? <div>Audit phase: {audit.audit_phase}</div> : null}
                {audit?.audit_summary ? <div>Audit summary: {audit.audit_summary}</div> : null}
                <div>Dry run: {String(item.dry_run)}</div>
                <div>Run ID: {item.id}</div>
                {item.result_summary ? <div>Summary: {item.result_summary}</div> : null}
                <button
                  type="button"
                  style={{
                    ...summaryActionButtonStyle,
                    marginTop: 8,
                  }}
                  disabled={selectedRunId === item.id}
                  onClick={() => onSelectRun(item.id)}
                >
                  {selectedRunId === item.id ? "Selected" : "View detail"}
                </button>
              </SummaryListItem>
            );
          })}
      </SummaryList>
    </SummarySection>
  );
}

function getRunCapabilityLabel(item: RunListItem): string {
  if (item.tool === "project.inspect") {
    return "hybrid-read-only";
  }
  if (item.tool === "build.configure") {
    return "plan-only";
  }
  if (item.tool === "settings.patch" || item.tool === "gem.enable" || item.tool === "build.compile") {
    return "mutation-gated";
  }
  return "simulated-only";
}

function getRunExecutionTruth(item: RunListItem): string {
  if (item.tool === "build.configure") {
    return item.execution_mode === "real"
      ? "Real plan-only preflight path."
      : "Simulated path or hybrid fallback.";
  }
  if (item.tool === "project.inspect") {
    return item.execution_mode === "real"
      ? "Real read-only inspection path."
      : "Simulated path or hybrid fallback.";
  }
  return item.execution_mode === "real"
    ? "Narrow real adapter path."
    : "Simulated path.";
}

function getAuditStatusLabel(
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

function matchesAuditFilter(
  item: RunListItem,
  audit: RunAuditRecord | undefined,
  filter: AuditFilter,
): boolean {
  if (filter === "all") {
    return true;
  }
  if (item.tool !== "settings.patch") {
    return filter === "other";
  }
  const status = getAuditStatusLabel(item, audit);
  if (filter === "rolled_back") {
    return status === "rolled_back";
  }
  if (filter === "other") {
    return !status || !["preflight", "blocked", "succeeded", "rolled_back"].includes(status);
  }
  return status === filter;
}

function getFilterLabel(filter: AuditFilter): string {
  if (filter === "all") {
    return "All runs";
  }
  if (filter === "rolled_back") {
    return "Rolled back";
  }
  return filter.charAt(0).toUpperCase() + filter.slice(1);
}

function getRunStatusTone(status: string) {
  if (status === "succeeded") {
    return "success" as const;
  }
  if (status === "failed" || status === "rejected" || status === "blocked") {
    return "danger" as const;
  }
  if (status === "waiting_approval" || status === "pending" || status === "running") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function getExecutionModeTone(mode: string) {
  if (mode === "real") {
    return "success" as const;
  }
  if (mode === "simulated") {
    return "warning" as const;
  }
  return "neutral" as const;
}

function getCapabilityTone(capability: string) {
  if (capability === "hybrid-read-only") {
    return "info" as const;
  }
  if (capability === "plan-only") {
    return "warning" as const;
  }
  if (capability === "mutation-gated") {
    return "danger" as const;
  }
  return "neutral" as const;
}

function getAuditStatusTone(status: string) {
  if (status === "succeeded") {
    return "success" as const;
  }
  if (status === "blocked" || status === "rolled_back") {
    return "danger" as const;
  }
  if (status === "preflight" || status === "simulated" || status === "unknown") {
    return "warning" as const;
  }
  return "neutral" as const;
}
