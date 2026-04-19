import { useMemo } from "react";

import type {
  RunAuditRecord,
  RunRecord,
  SettingsPatchAuditSummary,
} from "../types/contracts";

type RunsPanelProps = {
  items: RunRecord[];
  runAudits: RunAuditRecord[];
  settingsPatchAuditSummary: SettingsPatchAuditSummary | null;
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
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Runs</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        Runs reflect persisted control-plane bookkeeping. Execution mode remains
        explicitly labeled, including simulated flows.
      </p>
      {settingsPatchAuditSummary && settingsPatchAuditSummary.total_runs > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {availableFilters.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onAuditFilterChange(value)}
              style={{
                ...filterButtonStyle,
                background: selectedAuditFilter === value ? "#ddf4ff" : "#f6f8fa",
                borderColor: selectedAuditFilter === value ? "#0969da" : "#d0d7de",
              }}
            >
              {getFilterLabel(value)}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading runs...</p>
      ) : filteredItems.length === 0 ? (
        <p>No runs recorded yet.</p>
      ) : (
        <ul>
          {filteredItems.map((item) => {
            const capability = getRunCapabilityLabel(item);
            const executionTruth = getRunExecutionTruth(item);
            const audit = runAuditByRunId.get(item.id);
            const auditStatus = getAuditStatusLabel(item, audit);

            return (
              <li key={item.id} style={{ marginBottom: 12 }}>
                <strong>{item.tool}</strong>
                <div>Agent: {item.agent}</div>
                <div>Status: {item.status}</div>
                <div>Execution mode: {item.execution_mode}</div>
                <div>Capability: {capability}</div>
                <div>Execution truth: {executionTruth}</div>
                {auditStatus ? <div>Audit status: {auditStatus}</div> : null}
                {audit?.audit_summary ? <div>Audit summary: {audit.audit_summary}</div> : null}
                <div>Dry run: {String(item.dry_run)}</div>
                <div>Run ID: {item.id}</div>
                {item.result_summary ? <div>Summary: {item.result_summary}</div> : null}
                <button
                  type="button"
                  style={{ marginTop: 8 }}
                  disabled={selectedRunId === item.id}
                  onClick={() => onSelectRun(item.id)}
                >
                  {selectedRunId === item.id ? "Selected" : "View detail"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function getRunCapabilityLabel(item: RunRecord): string {
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

function getRunExecutionTruth(item: RunRecord): string {
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
  item: RunRecord,
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
  item: RunRecord,
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

const summaryBadgeStyle = {
  border: "1px solid #d0d7de",
  borderRadius: 999,
  padding: "6px 10px",
  background: "#f6f8fa",
  fontSize: 12,
};

const filterButtonStyle = {
  border: "1px solid #d0d7de",
  borderRadius: 999,
  padding: "6px 12px",
  cursor: "pointer",
};
