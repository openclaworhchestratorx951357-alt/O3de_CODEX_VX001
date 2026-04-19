import { useMemo, useState } from "react";

import type {
  ExecutionRecord,
  RunRecord,
  SettingsPatchMutationAudit,
} from "../types/contracts";

type RunsPanelProps = {
  items: RunRecord[];
  executions: ExecutionRecord[];
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

export default function RunsPanel({
  items,
  executions,
  loading,
  error,
  selectedRunId,
  onSelectRun,
}: RunsPanelProps) {
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("all");
  const executionByRunId = useMemo(
    () =>
      new Map(
        executions.map((execution) => [execution.run_id, execution] as const),
      ),
    [executions],
  );
  const settingsPatchRuns = items.filter((item) => item.tool === "settings.patch");
  const auditSummary = summarizeAuditStates(settingsPatchRuns, executionByRunId);
  const filteredItems = items.filter((item) =>
    matchesAuditFilter(item, executionByRunId.get(item.id), auditFilter),
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
      {settingsPatchRuns.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <span style={summaryBadgeStyle}>
            settings.patch runs: {settingsPatchRuns.length}
          </span>
          <span style={summaryBadgeStyle}>
            preflight: {auditSummary.preflight}
          </span>
          <span style={summaryBadgeStyle}>
            blocked: {auditSummary.blocked}
          </span>
          <span style={summaryBadgeStyle}>
            succeeded: {auditSummary.succeeded}
          </span>
          <span style={summaryBadgeStyle}>
            rolled_back: {auditSummary.rolledBack}
          </span>
          <span style={summaryBadgeStyle}>
            other: {auditSummary.other}
          </span>
        </div>
      ) : null}
      {settingsPatchRuns.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {(
            [
              ["all", "All runs"],
              ["preflight", "Preflight"],
              ["blocked", "Blocked"],
              ["succeeded", "Succeeded"],
              ["rolled_back", "Rolled back"],
              ["other", "Other"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setAuditFilter(value)}
              style={{
                ...filterButtonStyle,
                background: auditFilter === value ? "#ddf4ff" : "#f6f8fa",
                borderColor: auditFilter === value ? "#0969da" : "#d0d7de",
              }}
            >
              {label}
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
            const execution = executionByRunId.get(item.id);
            const audit = readMutationAudit(execution);
            const auditStatus = getAuditStatusLabel(item, execution);

            return (
              <li key={item.id} style={{ marginBottom: 12 }}>
                <strong>{item.tool}</strong>
                <div>Agent: {item.agent}</div>
                <div>Status: {item.status}</div>
                <div>Execution mode: {item.execution_mode}</div>
                <div>Capability: {capability}</div>
                <div>Execution truth: {executionTruth}</div>
                {auditStatus ? <div>Audit status: {auditStatus}</div> : null}
                {audit?.summary ? <div>Audit summary: {audit.summary}</div> : null}
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

function readMutationAudit(
  execution: ExecutionRecord | undefined,
): SettingsPatchMutationAudit | null {
  const details = execution?.details as Record<string, unknown> | null | undefined;
  const value = details?.mutation_audit;
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as SettingsPatchMutationAudit)
    : null;
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
  execution: ExecutionRecord | undefined,
): string | null {
  if (item.tool !== "settings.patch") {
    return null;
  }
  const audit = readMutationAudit(execution);
  if (audit?.status) {
    return audit.status;
  }
  if (item.execution_mode === "simulated") {
    return "simulated";
  }
  return "unknown";
}

function matchesAuditFilter(
  item: RunRecord,
  execution: ExecutionRecord | undefined,
  filter: AuditFilter,
): boolean {
  if (filter === "all") {
    return true;
  }
  if (item.tool !== "settings.patch") {
    return filter === "other";
  }
  const status = getAuditStatusLabel(item, execution);
  if (filter === "rolled_back") {
    return status === "rolled_back";
  }
  if (filter === "other") {
    return !status || !["preflight", "blocked", "succeeded", "rolled_back"].includes(status);
  }
  return status === filter;
}

function summarizeAuditStates(
  items: RunRecord[],
  executionByRunId: Map<string, ExecutionRecord>,
): {
  preflight: number;
  blocked: number;
  succeeded: number;
  rolledBack: number;
  other: number;
} {
  return items.reduce(
    (summary, item) => {
      const status = getAuditStatusLabel(item, executionByRunId.get(item.id));
      if (status === "preflight") {
        summary.preflight += 1;
      } else if (status === "blocked") {
        summary.blocked += 1;
      } else if (status === "succeeded") {
        summary.succeeded += 1;
      } else if (status === "rolled_back") {
        summary.rolledBack += 1;
      } else {
        summary.other += 1;
      }
      return summary;
    },
    {
      preflight: 0,
      blocked: 0,
      succeeded: 0,
      rolledBack: 0,
      other: 0,
    },
  );
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
