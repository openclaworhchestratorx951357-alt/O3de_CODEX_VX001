import { useMemo, useState } from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { WorkspaceRecord } from "../types/contracts";
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

const workspacesPanelGuide = getPanelGuide("workspaces-panel");
const workspacesPanelRefreshControlGuide = getPanelControlGuide("workspaces-panel", "refresh");
const workspacesPanelSearchControlGuide = getPanelControlGuide("workspaces-panel", "search");
const workspacesPanelSelectDetailControlGuide = getPanelControlGuide("workspaces-panel", "select-detail");

type WorkspacesPanelProps = {
  items: WorkspaceRecord[];
  loading: boolean;
  error: string | null;
  selectedWorkspaceId?: string | null;
  onSelectWorkspace?: (workspaceId: string) => void;
  searchPreset?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
  lastRefreshedAt?: string | null;
  updateBadgeLabel?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

export default function WorkspacesPanel({
  items,
  loading,
  error,
  selectedWorkspaceId,
  onSelectWorkspace,
  searchPreset,
  focusLabel,
  onClearFocus,
  lastRefreshedAt,
  updateBadgeLabel,
  onRefresh,
  refreshing = false,
}: WorkspacesPanelProps) {
  const [searchValue, setSearchValue] = useState(searchPreset ?? "");
  const normalizedQuery = searchValue.trim().toLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => matchesWorkspaceSearch(item, normalizedQuery)),
    [items, normalizedQuery],
  );

  return (
    <SummarySection
      title="Workspaces"
      description="Persisted workspace-isolation bookkeeping for remote substrate planning. Workspace state, ownership, and cleanup policy remain operator-visible inventory only."
      guideTooltip={workspacesPanelGuide.tooltip}
      guideChecklist={workspacesPanelGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No workspaces match the current search." : "No workspaces are recorded yet."}
      hasItems={filteredItems.length > 0}
      emptyGuideTitle={normalizedQuery ? "Widen the workspace search" : "Create a safe workspace lane"}
      emptyGuideDescription={normalizedQuery
        ? "The current search hides all workspace records. Workspace inventory is easiest to find by root path, state, runner family, or owner ID."
        : "Workspace records show isolation and ownership. They help threads avoid colliding while the app stays on the same protected branch baseline."}
      emptyGuideSteps={normalizedQuery ? [
        "Clear the search or try the workspace state, runner family, owner executor ID, or part of the path.",
        "Refresh workspaces if a lane was just created or recycled.",
        "Open detail when you need cleanup policy, retention, or linked run ownership.",
      ] : [
        "Use Builder to create a dedicated worktree lane before assigning parallel work.",
        "Keep each lane focused on a narrow file or capability scope.",
        "Return here to confirm root path, owner, state, and cleanup policy.",
      ]}
      emptyGuideExampleTitle={normalizedQuery ? "Search examples" : "Safe workspace example"}
      emptyGuideExample={normalizedQuery
        ? "Try ready, active, gui-overhaul, editor-control, or part of the worktree path."
        : "A GUI-overhaul thread should work from its own worktree branch and avoid touching O3DE live bridge scripts unless that slice explicitly owns them."}
      actionHint="Refresh updates persisted workspace lifecycle records without changing admitted tool capability."
      actions={onRefresh ? (
        <button
          type="button"
          title={workspacesPanelRefreshControlGuide.tooltip}
          onClick={onRefresh}
          disabled={refreshing}
          style={summaryActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh workspaces"}
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
          title={workspacesPanelSearchControlGuide.tooltip}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search workspaces by id, root, state, runner family, or owner"
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
            <strong>{item.workspace_root}</strong>
            <SummaryFacts>
              <SummaryFact label="Workspace ID" copyValue={item.id}>{item.id}</SummaryFact>
              <SummaryFact label="Kind">{item.workspace_kind}</SummaryFact>
              <SummaryFact label="State">
                <StatusChip label={item.workspace_state} tone={getWorkspaceStateTone(item.workspace_state)} />
              </SummaryFact>
              <SummaryFact label="Runner family">{item.runner_family}</SummaryFact>
              <SummaryFact label="Retention">{item.retention_class}</SummaryFact>
              <SummaryFact label="Cleanup">{item.cleanup_policy}</SummaryFact>
              {item.owner_executor_id ? (
                <SummaryFact label="Owner executor" copyValue={item.owner_executor_id}>
                  {item.owner_executor_id}
                </SummaryFact>
              ) : null}
              {item.owner_execution_id ? (
                <SummaryFact label="Owner execution" copyValue={item.owner_execution_id}>
                  {item.owner_execution_id}
                </SummaryFact>
              ) : null}
              {item.owner_run_id ? (
                <SummaryFact label="Owner run" copyValue={item.owner_run_id}>{item.owner_run_id}</SummaryFact>
              ) : null}
              <SummaryFact label="Created">{formatSummaryTimestamp(item.created_at)}</SummaryFact>
            </SummaryFacts>
            {onSelectWorkspace ? (
              <button
                type="button"
                title={workspacesPanelSelectDetailControlGuide.tooltip}
                style={{ ...summaryActionButtonStyle, marginTop: 8 }}
                disabled={selectedWorkspaceId === item.id}
                onClick={() => onSelectWorkspace(item.id)}
              >
                {selectedWorkspaceId === item.id ? "Selected" : "View detail"}
              </button>
            ) : null}
          </SummaryListItem>
        ))}
      </SummaryList>
    </SummarySection>
  );
}

function matchesWorkspaceSearch(item: WorkspaceRecord, query: string): boolean {
  if (!query) {
    return true;
  }

  return [
    item.id,
    item.workspace_kind,
    item.workspace_root,
    item.workspace_state,
    item.cleanup_policy,
    item.retention_class,
    item.runner_family,
    item.owner_run_id ?? "",
    item.owner_execution_id ?? "",
    item.owner_executor_id ?? "",
    item.last_failure_summary ?? "",
  ].some((value) => value.toLowerCase().includes(query));
}

function getWorkspaceStateTone(
  value: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (value === "ready") {
    return "success";
  }
  if (value === "failed" || value === "stale") {
    return "danger";
  }
  if (value.includes("active") || value.includes("preparing")) {
    return "info";
  }
  if (value.includes("pending") || value.includes("recycling")) {
    return "warning";
  }
  return "neutral";
}
