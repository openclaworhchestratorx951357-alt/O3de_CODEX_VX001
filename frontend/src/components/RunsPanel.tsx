import { useMemo, useState } from "react";

import type {
  RunListItem,
  RunAuditRecord,
  SettingsPatchAuditSummary,
} from "../types/contracts";
import OperatorStatusRail from "./OperatorStatusRail";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import {
  getAuditStatusTone,
  getCapabilityTone,
  getExecutionModeTone,
  getRunStatusTone,
} from "./statusChipTones";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryBadgeStyle,
  summaryControlRowStyle,
  summaryFocusBadgeStyle,
  summaryFilterButtonStyle,
  summaryInlineActionButtonStyle,
  summaryRefreshBadgeStyle,
  summarySearchInputStyle,
  summaryTimestampNoteStyle,
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
  searchPreset?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
  lastRefreshedAt?: string | null;
  updateBadgeLabel?: string | null;
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
  searchPreset,
  focusLabel,
  onClearFocus,
  lastRefreshedAt,
  updateBadgeLabel,
}: RunsPanelProps) {
  const [searchValue, setSearchValue] = useState(searchPreset ?? "");
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
  const normalizedQuery = searchValue.trim().toLowerCase();
  const visibleItems = useMemo(
    () =>
      filteredItems.filter((item) => {
        const audit = runAuditByRunId.get(item.id);
        return matchesRunSearch(item, audit, normalizedQuery);
      }),
    [filteredItems, normalizedQuery, runAuditByRunId],
  );

  return (
    <SummarySection
      title="Runs"
      description="Runs reflect persisted control-plane bookkeeping. Execution mode remains explicitly labeled, including simulated flows."
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No runs match the current search." : "No runs recorded yet."}
      hasItems={visibleItems.length > 0}
    >
      <div style={summaryControlRowStyle}>
        {focusLabel ? (
          <span style={summaryFocusBadgeStyle}>
            focused from overview: {focusLabel}
            {onClearFocus ? (
              <button
                type="button"
                style={summaryInlineActionButtonStyle}
                onClick={onClearFocus}
              >
                Clear
              </button>
            ) : null}
          </span>
        ) : null}
        {updateBadgeLabel ? (
          <span style={summaryRefreshBadgeStyle}>{updateBadgeLabel}</span>
        ) : null}
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
      <div style={summaryControlRowStyle}>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search runs by tool, agent, run ID, or summary"
          style={summarySearchInputStyle}
        />
      </div>
      {lastRefreshedAt ? (
        <div style={summaryTimestampNoteStyle}>
          Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
        </div>
      ) : null}
      <SummaryList>
          {visibleItems.map((item) => {
            const capability = getRunCapabilityLabel(item);
            const executionTruth = getRunExecutionTruth(item);
            const audit = runAuditByRunId.get(item.id);
            const auditStatus = getAuditStatusLabel(item, audit);

            return (
              <SummaryListItem key={item.id} card>
                <strong>{item.tool}</strong>
                <SummaryFacts>
                  <SummaryFact label="Agent">{item.agent}</SummaryFact>
                  <SummaryFact label="Operator status">
                    <OperatorStatusRail
                      executionMode={item.execution_mode}
                      auditStatus={auditStatus}
                      attentionLabel={getRunAttentionLabel(item, audit)}
                    />
                  </SummaryFact>
                  <SummaryFact label="Status">
                    <StatusChip label={item.status} tone={getRunStatusTone(item.status)} />
                  </SummaryFact>
                  <SummaryFact label="Execution mode">
                    <StatusChip label={item.execution_mode} tone={getExecutionModeTone(item.execution_mode)} />
                  </SummaryFact>
                  <SummaryFact label="Capability">
                    <StatusChip label={capability} tone={getCapabilityTone(capability)} />
                  </SummaryFact>
                  <SummaryFact label="Execution truth">{executionTruth}</SummaryFact>
                  {auditStatus ? (
                    <SummaryFact label="Audit status">
                      <StatusChip label={auditStatus} tone={getAuditStatusTone(auditStatus)} />
                    </SummaryFact>
                  ) : null}
                  {audit?.audit_phase ? (
                    <SummaryFact label="Audit phase">{audit.audit_phase}</SummaryFact>
                  ) : null}
                  {audit?.audit_summary ? (
                    <SummaryFact label="Audit summary">{audit.audit_summary}</SummaryFact>
                  ) : null}
                  <SummaryFact label="Dry run">{String(item.dry_run)}</SummaryFact>
                  <SummaryFact label="Run ID" copyValue={item.id}>{item.id}</SummaryFact>
                  {item.result_summary ? (
                    <SummaryFact label="Summary">{item.result_summary}</SummaryFact>
                  ) : null}
                </SummaryFacts>
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

function getRunAttentionLabel(
  item: RunListItem,
  audit: RunAuditRecord | undefined,
): string {
  const auditStatus = getAuditStatusLabel(item, audit);
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

function matchesRunSearch(
  item: RunListItem,
  audit: RunAuditRecord | undefined,
  query: string,
): boolean {
  if (!query) {
    return true;
  }

  return [
    item.id,
    item.request_id,
    item.agent,
    item.tool,
    item.status,
    item.execution_mode,
    item.result_summary ?? "",
    audit?.audit_status ?? "",
    audit?.audit_phase ?? "",
    audit?.audit_summary ?? "",
  ].some((value) => value.toLowerCase().includes(query));
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
