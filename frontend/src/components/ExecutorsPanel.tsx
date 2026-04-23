import { useMemo, useState } from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { ExecutorRecord } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryControlRowStyle,
  summaryFocusBadgeStyle,
  summaryInlineActionButtonStyle,
  summaryRefreshBadgeStyle,
  summarySearchInputStyle,
  summaryTimestampNoteStyle,
} from "./summaryPrimitives";

const executorsPanelGuide = getPanelGuide("executors-panel");
const executorsPanelRefreshControlGuide = getPanelControlGuide("executors-panel", "refresh");
const executorsPanelSearchControlGuide = getPanelControlGuide("executors-panel", "search");
const executorsPanelSelectDetailControlGuide = getPanelControlGuide("executors-panel", "select-detail");

type ExecutorsPanelProps = {
  items: ExecutorRecord[];
  loading: boolean;
  error: string | null;
  selectedExecutorId?: string | null;
  onSelectExecutor?: (executorId: string) => void;
  searchPreset?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
  lastRefreshedAt?: string | null;
  updateBadgeLabel?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

export default function ExecutorsPanel({
  items,
  loading,
  error,
  selectedExecutorId,
  onSelectExecutor,
  searchPreset,
  focusLabel,
  onClearFocus,
  lastRefreshedAt,
  updateBadgeLabel,
  onRefresh,
  refreshing = false,
}: ExecutorsPanelProps) {
  const [searchValue, setSearchValue] = useState(searchPreset ?? "");
  const normalizedQuery = searchValue.trim().toLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => matchesExecutorSearch(item, normalizedQuery)),
    [items, normalizedQuery],
  );

  return (
    <SummarySection
      title="Executors"
      description="Persisted remote substrate bookkeeping for executor inventory. These records describe executor availability and runner-family support only, and do not widen admitted real O3DE automation coverage."
      guideTooltip={executorsPanelGuide.tooltip}
      guideChecklist={executorsPanelGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No executors match the current search." : "No executors are recorded yet."}
      hasItems={filteredItems.length > 0}
      emptyGuideTitle={normalizedQuery ? "Widen the executor search" : "Register or inspect executor lanes"}
      emptyGuideDescription={normalizedQuery
        ? "The current search hides all executor records. Executor inventory is easiest to find by label, host, runner family, or availability state."
        : "Executor records describe who can own work. They are inventory only and do not widen the admitted O3DE mutation surface."}
      emptyGuideSteps={normalizedQuery ? [
        "Clear the search or try the host label, runner family, ready, available, or offline.",
        "Refresh executors if a worker lane was just created.",
        "Use Workspaces next to confirm which lane an executor owns.",
      ] : [
        "Create or bootstrap a Builder worktree lane when you need another thread to help.",
        "Refresh executor inventory after lane setup.",
        "Open detail only after a record appears so you can inspect ownership and readiness.",
      ]}
      emptyGuideExampleTitle={normalizedQuery ? "Search examples" : "Beginner lane example"}
      emptyGuideExample={normalizedQuery
        ? "Try codex, local, worker, available, or a runner family name."
        : "A safe helper thread should have its own worktree lane, clear task ownership, and a recorded executor/workspace trail."}
      actionHint="Refresh updates persisted executor inventory and availability state without changing the current admitted adapter boundary."
      actions={onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          title={executorsPanelRefreshControlGuide.tooltip}
          disabled={refreshing}
          style={summaryActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh executors"}
        </button>
      ) : null}
    >
      <div style={summaryControlRowStyle}>
        {focusLabel ? (
          <span style={summaryFocusBadgeStyle}>
            focused from overview: {focusLabel}
            {onClearFocus ? (
              <button type="button" style={summaryInlineActionButtonStyle} onClick={onClearFocus}>
                Clear
              </button>
            ) : null}
          </span>
        ) : null}
        {updateBadgeLabel ? <span style={summaryRefreshBadgeStyle}>{updateBadgeLabel}</span> : null}
        <input
          type="search"
          title={executorsPanelSearchControlGuide.tooltip}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search executors by id, label, host, kind, or runner family"
          style={summarySearchInputStyle}
        />
      </div>
      {lastRefreshedAt ? (
        <div style={summaryTimestampNoteStyle}>
          Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
        </div>
      ) : null}
      <SummaryList>
        {filteredItems.map((item) => (
          <SummaryListItem key={item.id} card>
            <strong>{item.executor_label}</strong>
            <SummaryFacts>
              <SummaryFact label="Executor ID" copyValue={item.id}>{item.id}</SummaryFact>
              <SummaryFact label="Kind">{item.executor_kind}</SummaryFact>
              <SummaryFact label="Host">{item.executor_host_label}</SummaryFact>
              <SummaryFact label="Mode class">
                <StatusChip label={item.execution_mode_class} tone={getExecutionModeClassTone(item.execution_mode_class)} />
              </SummaryFact>
              <SummaryFact label="Availability">
                <StatusChip label={item.availability_state} tone={getAvailabilityTone(item.availability_state)} />
              </SummaryFact>
              <SummaryFact label="Runner families">
                {item.supported_runner_families.length > 0 ? item.supported_runner_families.join(", ") : "none"}
              </SummaryFact>
              {item.last_heartbeat_at ? (
                <SummaryFact label="Last heartbeat">{formatSummaryTimestamp(item.last_heartbeat_at)}</SummaryFact>
              ) : null}
              {item.last_failure_summary ? (
                <SummaryFact label="Last failure">{item.last_failure_summary}</SummaryFact>
              ) : null}
              <SummaryFact label="Updated">{formatSummaryTimestamp(item.updated_at)}</SummaryFact>
            </SummaryFacts>
            {onSelectExecutor ? (
              <button
                type="button"
                title={executorsPanelSelectDetailControlGuide.tooltip}
                style={{ ...summaryActionButtonStyle, marginTop: 8 }}
                disabled={selectedExecutorId === item.id}
                onClick={() => onSelectExecutor(item.id)}
              >
                {selectedExecutorId === item.id ? "Selected" : "View detail"}
              </button>
            ) : null}
          </SummaryListItem>
        ))}
      </SummaryList>
    </SummarySection>
  );
}

function matchesExecutorSearch(item: ExecutorRecord, query: string): boolean {
  if (!query) {
    return true;
  }

  return [
    item.id,
    item.executor_kind,
    item.executor_label,
    item.executor_host_label,
    item.execution_mode_class,
    item.availability_state,
    ...item.supported_runner_families,
    item.last_failure_summary ?? "",
  ].some((value) => value.toLowerCase().includes(query));
}

function getExecutionModeClassTone(
  value: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (value === "hybrid") {
    return "info";
  }
  if (value === "real") {
    return "success";
  }
  if (value === "simulated") {
    return "warning";
  }
  return "neutral";
}

function getAvailabilityTone(
  value: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (value === "available" || value === "ready") {
    return "success";
  }
  if (value === "offline" || value === "failed") {
    return "danger";
  }
  if (value.includes("busy") || value.includes("active")) {
    return "info";
  }
  if (value.includes("draining") || value.includes("pending")) {
    return "warning";
  }
  return "neutral";
}
