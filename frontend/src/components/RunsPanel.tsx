import { useMemo, useState } from "react";

import type {
  RunListItem,
  RunAuditRecord,
  SettingsPatchAuditSummary,
} from "../types/contracts";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import {
  getFallbackCategoryLabel,
  getInspectionSurfaceLabel,
  getManifestSourceOfTruthLabel,
  getRunExecutionTruthLabel,
} from "../lib/executionTruth";
import {
  getRunAttentionLabel,
  getRunAuditStatusLabel,
} from "../lib/operatorStatus";
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
  onTruthFilterSelect?: (
    filter: "inspection_surface" | "fallback_category" | "manifest_source_of_truth",
    value: string,
  ) => void;
  searchPreset?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
  lastRefreshedAt?: string | null;
  updateBadgeLabel?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
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

const runsPanelGuide = getPanelGuide("runs-panel");
const runsPanelRefreshControlGuide = getPanelControlGuide("runs-panel", "refresh");
const runsPanelSearchControlGuide = getPanelControlGuide("runs-panel", "search");
const runsPanelToolFilterControlGuide = getPanelControlGuide("runs-panel", "tool-filter");
const runsPanelAuditFilterControlGuide = getPanelControlGuide("runs-panel", "audit-filter");
const runsPanelSelectDetailControlGuide = getPanelControlGuide("runs-panel", "select-detail");

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
  onTruthFilterSelect,
  searchPreset,
  focusLabel,
  onClearFocus,
  lastRefreshedAt,
  updateBadgeLabel,
  onRefresh,
  refreshing = false,
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
      guideTooltip={runsPanelGuide.tooltip}
      guideChecklist={runsPanelGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No runs match the current search." : "No runs recorded yet."}
      hasItems={visibleItems.length > 0}
      actionHint="Local refresh updates the persisted records lane and preserves selected detail context when possible."
      actions={onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          title={runsPanelRefreshControlGuide.tooltip}
          disabled={refreshing}
          style={summaryActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh runs"}
        </button>
      ) : null}
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
            title={runsPanelToolFilterControlGuide.tooltip}
            onClick={() => onToolFilterChange(value)}
            style={{
              ...summaryFilterButtonStyle,
              background: selectedToolFilter === value ? "var(--app-info-bg)" : "var(--app-panel-bg-muted)",
              borderColor: selectedToolFilter === value ? "var(--app-info-border)" : "var(--app-panel-border)",
              color: selectedToolFilter === value ? "var(--app-info-text)" : "var(--app-text-color)",
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
              title={runsPanelAuditFilterControlGuide.tooltip}
              onClick={() => onAuditFilterChange(value)}
              style={{
                ...summaryFilterButtonStyle,
                background: selectedAuditFilter === value ? "var(--app-info-bg)" : "var(--app-panel-bg-muted)",
                borderColor: selectedAuditFilter === value ? "var(--app-info-border)" : "var(--app-panel-border)",
                color: selectedAuditFilter === value ? "var(--app-info-text)" : "var(--app-text-color)",
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
          title={runsPanelSearchControlGuide.tooltip}
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
                  {item.inspection_surface ? (
                    <SummaryFact label="Inspection surface">
                      {onTruthFilterSelect ? (
                        <button
                          type="button"
                          style={summaryInlineActionButtonStyle}
                          onClick={() => onTruthFilterSelect("inspection_surface", item.inspection_surface!)}
                        >
                          {getInspectionSurfaceLabel(item)}
                        </button>
                      ) : (
                        getInspectionSurfaceLabel(item)
                      )}
                    </SummaryFact>
                  ) : null}
                  {item.fallback_category ? (
                    <SummaryFact label="Fallback category">
                      {onTruthFilterSelect ? (
                        <button
                          type="button"
                          style={summaryInlineActionButtonStyle}
                          onClick={() => onTruthFilterSelect("fallback_category", item.fallback_category!)}
                        >
                          {getFallbackCategoryLabel(item)}
                        </button>
                      ) : (
                        getFallbackCategoryLabel(item)
                      )}
                    </SummaryFact>
                  ) : null}
                  {item.project_manifest_source_of_truth ? (
                    <SummaryFact label="Manifest source of truth">
                      {onTruthFilterSelect ? (
                        <button
                          type="button"
                          style={summaryInlineActionButtonStyle}
                          onClick={() => onTruthFilterSelect("manifest_source_of_truth", item.project_manifest_source_of_truth!)}
                        >
                          {getManifestSourceOfTruthLabel(item)}
                        </button>
                      ) : (
                        getManifestSourceOfTruthLabel(item)
                      )}
                    </SummaryFact>
                  ) : null}
                  {item.runner_family ? (
                    <SummaryFact label="Runner family">{item.runner_family}</SummaryFact>
                  ) : null}
                  {item.execution_attempt_state ? (
                    <SummaryFact label="Attempt state">
                      <StatusChip
                        label={item.execution_attempt_state}
                        tone={getAttemptStateTone(item.execution_attempt_state)}
                      />
                    </SummaryFact>
                  ) : null}
                  {item.executor_id ? (
                    <SummaryFact label="Executor ID" copyValue={item.executor_id}>
                      {item.executor_id}
                    </SummaryFact>
                  ) : null}
                  {item.workspace_id ? (
                    <SummaryFact label="Workspace ID" copyValue={item.workspace_id}>
                      {item.workspace_id}
                    </SummaryFact>
                  ) : null}
                  {item.workspace_state ? (
                    <SummaryFact label="Workspace state">
                      <StatusChip
                        label={item.workspace_state}
                        tone={getWorkspaceStateTone(item.workspace_state)}
                      />
                    </SummaryFact>
                  ) : null}
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
                  title={runsPanelSelectDetailControlGuide.tooltip}
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
  if (item.tool === "editor.session.open" || item.tool === "editor.level.open") {
    return "real-authoring";
  }
  if (item.tool === "editor.entity.create") {
    return "runtime-reaching";
  }
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
  return getRunExecutionTruthLabel(item);
}

function getAuditStatusLabel(
  item: RunListItem,
  audit: RunAuditRecord | undefined,
): string | null {
  return getRunAuditStatusLabel(item, audit);
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
    item.inspection_surface ?? "",
    item.fallback_category ?? "",
    item.project_manifest_source_of_truth ?? "",
    item.executor_id ?? "",
    item.workspace_id ?? "",
    item.workspace_state ?? "",
    item.runner_family ?? "",
    item.execution_attempt_state ?? "",
    audit?.audit_status ?? "",
    audit?.audit_phase ?? "",
    audit?.audit_summary ?? "",
  ].some((value) => value.toLowerCase().includes(query));
}

function getAttemptStateTone(
  state: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (state === "succeeded") {
    return "success";
  }
  if (state === "failed") {
    return "danger";
  }
  if (state.includes("running") || state.includes("started")) {
    return "info";
  }
  if (state.includes("queued") || state.includes("pending") || state.includes("waiting")) {
    return "warning";
  }
  return "neutral";
}

function getWorkspaceStateTone(
  state: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (state === "ready") {
    return "success";
  }
  if (state === "failed" || state === "stale") {
    return "danger";
  }
  if (state.includes("preparing") || state.includes("active")) {
    return "info";
  }
  if (state.includes("pending") || state.includes("recycling")) {
    return "warning";
  }
  return "neutral";
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
