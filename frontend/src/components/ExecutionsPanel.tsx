import { useMemo, useState } from "react";

import type { ExecutionListItem } from "../types/contracts";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import {
  getExecutionProvenanceLabel,
  getFallbackCategoryLabel,
  getManifestSourceOfTruthLabel,
} from "../lib/executionTruth";
import { describeExecutionAttention } from "../lib/recordPriority";
import OperatorStatusRail from "./OperatorStatusRail";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import {
  getAuditStatusTone,
  getExecutionModeTone,
  getExecutionStatusTone,
} from "./statusChipTones";
import {
  formatSummaryLabeledText,
  formatSummaryTimestamp,
  summaryCalloutStyle,
  summaryControlRowStyle,
  summaryFocusBadgeStyle,
  summaryInlineActionButtonStyle,
  summaryRefreshBadgeStyle,
  summarySearchInputStyle,
  summaryTimestampNoteStyle,
} from "./summaryPrimitives";

const executionsPanelGuide = getPanelGuide("executions-panel");
const executionsPanelRefreshControlGuide = getPanelControlGuide("executions-panel", "refresh");
const executionsPanelSearchControlGuide = getPanelControlGuide("executions-panel", "search");
const executionsPanelSelectDetailControlGuide = getPanelControlGuide("executions-panel", "select-detail");

type ExecutionsPanelProps = {
  items: ExecutionListItem[];
  loading: boolean;
  error: string | null;
  selectedExecutionId?: string | null;
  onSelectExecution?: (executionId: string) => void;
  searchPreset?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
  lastRefreshedAt?: string | null;
  updateBadgeLabel?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

export default function ExecutionsPanel({
  items,
  loading,
  error,
  selectedExecutionId,
  onSelectExecution,
  searchPreset,
  focusLabel,
  onClearFocus,
  lastRefreshedAt,
  updateBadgeLabel,
  onRefresh,
  refreshing = false,
}: ExecutionsPanelProps) {
  const [searchValue, setSearchValue] = useState(searchPreset ?? "");
  const normalizedQuery = searchValue.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      items.filter((item) => matchesExecutionSearch(item, normalizedQuery)),
    [items, normalizedQuery],
  );

  return (
    <SummarySection
      title="Executions"
      description="These are persisted execution records. Execution mode remains explicit, including simulated control-plane runs."
      guideTooltip={executionsPanelGuide.tooltip}
      guideChecklist={executionsPanelGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No executions match the current search." : "No executions are recorded yet."}
      hasItems={filteredItems.length > 0}
      emptyGuideTitle={normalizedQuery ? "Widen the execution search" : "Create execution evidence first"}
      emptyGuideDescription={normalizedQuery
        ? "The current search hides all execution records. Executions are easiest to find by tool name, run ID, executor, or result summary."
        : "Execution records are created under runs and show the exact tool path, execution mode, warnings, and provenance."}
      emptyGuideSteps={normalizedQuery ? [
        "Clear the search or try a broader tool family such as editor-control.",
        "Search for real, simulated, warning, or a run ID when tracing a dispatch.",
        "Refresh executions if another thread just completed a tool call.",
      ] : [
        "Submit a prompt or dispatch a typed tool request.",
        "Approve gated work if the backend pauses for approval.",
        "Return here to inspect the tool-level execution record and provenance.",
      ]}
      emptyGuideExampleTitle={normalizedQuery ? "Search examples" : "Example execution source"}
      emptyGuideExample={normalizedQuery
        ? "Try editor.component.add, real, warning, executor ID, or the first few characters of a run ID."
        : "A bridge-backed editor.component.add proof creates an execution record that should show real mode and bridge provenance."}
      renderChildrenWhenEmpty
      actionHint="Local refresh updates persisted execution records without reloading the full overview lane."
      actions={onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          title={executionsPanelRefreshControlGuide.tooltip}
          disabled={refreshing}
          style={summaryInlineActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh executions"}
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
        <input
          type="search"
          title={executionsPanelSearchControlGuide.tooltip}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search executions by tool, agent, run ID, or summary"
          style={summarySearchInputStyle}
        />
      </div>
      {lastRefreshedAt ? (
        <div style={summaryTimestampNoteStyle}>
          Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
        </div>
      ) : null}
      <SummaryList>
        {filteredItems.map((item) => {
          const provenanceLabel = getExecutionProvenanceLabel(item);
          const attentionLabel = describeExecutionAttention(item).label;
          return (
            <SummaryListItem key={item.id} card>
              <strong>{item.tool}</strong>
              <SummaryFacts>
                <SummaryFact label="Agent">{item.agent}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    executionMode={item.execution_mode}
                    auditStatus={item.mutation_audit_status ?? null}
                    attentionLabel={attentionLabel}
                  />
                </SummaryFact>
                <SummaryFact label="Status">
                  <StatusChip label={item.status} tone={getExecutionStatusTone(item.status)} />
                </SummaryFact>
                <SummaryFact label="Execution mode">
                  <StatusChip label={item.execution_mode} tone={getExecutionModeTone(item.execution_mode)} />
                </SummaryFact>
                <SummaryFact label="Run ID" copyValue={item.run_id}>{item.run_id}</SummaryFact>
                <SummaryFact label="Started">{formatSummaryTimestamp(item.started_at)}</SummaryFact>
                {item.finished_at ? (
                  <SummaryFact label="Finished">{formatSummaryTimestamp(item.finished_at)}</SummaryFact>
                ) : null}
                <SummaryFact label="Provenance">
                  <span style={summaryCalloutStyle}>
                    {formatSummaryLabeledText("Provenance", provenanceLabel)}
                  </span>
                </SummaryFact>
                <SummaryFact label="Fallback category">
                  {getFallbackCategoryLabel(item)}
                </SummaryFact>
                <SummaryFact label="Manifest source of truth">
                  {getManifestSourceOfTruthLabel(item)}
                </SummaryFact>
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
                {item.failure_category ? (
                  <SummaryFact label="Failure category">
                    <StatusChip
                      label={item.failure_category}
                      tone={getFailureCategoryTone(item.failure_category)}
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
                {item.mutation_audit_summary ? (
                  <SummaryFact label="Mutation audit">{item.mutation_audit_summary}</SummaryFact>
                ) : null}
                {item.mutation_audit_status ? (
                  <SummaryFact label="Mutation audit status">
                    <StatusChip label={item.mutation_audit_status} tone={getAuditStatusTone(item.mutation_audit_status)} />
                  </SummaryFact>
                ) : null}
                {item.result_summary ? (
                  <SummaryFact label="Summary">{item.result_summary}</SummaryFact>
                ) : null}
                <SummaryFact label="Warnings">{item.warning_count}</SummaryFact>
                <SummaryFact label="Artifacts">{item.artifact_count}</SummaryFact>
                {onSelectExecution ? (
                  <SummaryFact label="Detail">
                    <button
                      type="button"
                      title={executionsPanelSelectDetailControlGuide.tooltip}
                      style={summaryInlineActionButtonStyle}
                      onClick={() => onSelectExecution(item.id)}
                    >
                      {selectedExecutionId === item.id ? "Selected" : "View detail"}
                    </button>
                  </SummaryFact>
                ) : null}
              </SummaryFacts>
            </SummaryListItem>
          );
        })}
      </SummaryList>
    </SummarySection>
  );
}

function matchesExecutionSearch(item: ExecutionListItem, query: string): boolean {
  if (!query) {
    return true;
  }

  return [
    item.id,
    item.run_id,
    item.request_id,
    item.agent,
    item.tool,
    item.execution_mode,
    item.status,
    item.result_summary ?? "",
    item.fallback_category ?? "",
    item.project_manifest_source_of_truth ?? "",
    item.executor_id ?? "",
    item.workspace_id ?? "",
    item.runner_family ?? "",
    item.execution_attempt_state ?? "",
    item.failure_category ?? "",
    item.mutation_audit_summary ?? "",
    item.mutation_audit_status ?? "",
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

function getFailureCategoryTone(
  category: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (category === "none") {
    return "success";
  }
  if (category.includes("policy") || category.includes("approval") || category.includes("lock")) {
    return "warning";
  }
  if (category.includes("failed") || category.includes("error") || category.includes("crash")) {
    return "danger";
  }
  return "neutral";
}
