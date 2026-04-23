import { useMemo, useState } from "react";

import { describeTimelineMeaning } from "../lib/capabilityNarrative";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { EventListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import {
  getAdapterModeTone,
  getCapabilityTone,
  getSeverityTone,
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

const taskTimelineGuide = getPanelGuide("task-timeline");
const taskTimelineRefreshControlGuide = getPanelControlGuide("task-timeline", "refresh");
const taskTimelineSearchControlGuide = getPanelControlGuide("task-timeline", "search");
const taskTimelineOpenLinkedRecordControlGuide = getPanelControlGuide("task-timeline", "open-linked-record");

type TaskTimelineProps = {
  items: EventListItem[];
  loading: boolean;
  error: string | null;
  onOpenRun?: (runId: string) => void;
  onOpenExecution?: (executionId: string) => void;
  onOpenExecutor?: (executorId: string) => void;
  onOpenWorkspace?: (workspaceId: string) => void;
  searchPreset?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
  lastRefreshedAt?: string | null;
  updateBadgeLabel?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

export default function TaskTimeline({
  items,
  loading,
  error,
  onOpenRun,
  onOpenExecution,
  onOpenExecutor,
  onOpenWorkspace,
  searchPreset,
  focusLabel,
  onClearFocus,
  lastRefreshedAt,
  updateBadgeLabel,
  onRefresh,
  refreshing = false,
}: TaskTimelineProps) {
  const [searchValue, setSearchValue] = useState(searchPreset ?? "");
  const normalizedQuery = searchValue.trim().toLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => matchesTimelineSearch(item, normalizedQuery)),
    [items, normalizedQuery],
  );

  return (
    <SummarySection
      title="Task Timeline"
      description="This timeline shows persisted control-plane events, including simulated execution activity where applicable."
      guideTooltip={taskTimelineGuide.tooltip}
      guideChecklist={taskTimelineGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No timeline events match the current search." : "No timeline events are recorded yet."}
      hasItems={filteredItems.length > 0}
      actionHint="Local refresh updates persisted timeline events without reloading the full dashboard."
      quickStartTitle="Investigation flow"
      quickStartItems={taskTimelineGuide.checklist}
      actions={onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          title={taskTimelineRefreshControlGuide.tooltip}
          disabled={refreshing}
          style={summaryInlineActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh events"}
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
          title={taskTimelineSearchControlGuide.tooltip}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search timeline by message, run, category, state, or capability"
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
          const capabilityStatus = item.capability_status ?? null;
          const adapterMode = item.adapter_mode ?? null;
          const meaning = describeTimelineMeaning(capabilityStatus, adapterMode, item.message);
          return (
            <SummaryListItem key={item.id} card>
              <strong>{item.message}</strong>
              <SummaryFacts>
                <SummaryFact label="Category">{item.category}</SummaryFact>
                <SummaryFact label="Severity">
                  <StatusChip label={item.severity} tone={getSeverityTone(item.severity)} />
                </SummaryFact>
                <SummaryFact label="State">
                  <StatusChip label={item.event_state} tone="neutral" />
                </SummaryFact>
                {capabilityStatus ? (
                  <SummaryFact label="Capability">
                    <StatusChip label={capabilityStatus} tone={getCapabilityTone(capabilityStatus)} />
                  </SummaryFact>
                ) : null}
                {adapterMode ? (
                  <SummaryFact label="Adapter mode">
                    <StatusChip label={adapterMode} tone={getAdapterModeTone(adapterMode)} />
                  </SummaryFact>
                ) : null}
                {item.event_type ? (
                  <SummaryFact label="Event type">{item.event_type}</SummaryFact>
                ) : null}
                {item.previous_state ? (
                  <SummaryFact label="Previous state">{item.previous_state}</SummaryFact>
                ) : null}
                {item.current_state ? (
                  <SummaryFact label="Current state">{item.current_state}</SummaryFact>
                ) : null}
                {item.failure_category ? (
                  <SummaryFact label="Failure category">{item.failure_category}</SummaryFact>
                ) : null}
                {item.run_id ? (
                  <SummaryFact label="Run">
                    {onOpenRun ? (
                      <button
                        type="button"
                        title={taskTimelineOpenLinkedRecordControlGuide.tooltip}
                        style={summaryInlineActionButtonStyle}
                        onClick={() => onOpenRun(item.run_id!)}
                      >
                        {item.run_id}
                      </button>
                    ) : (
                      item.run_id
                    )}
                  </SummaryFact>
                ) : null}
                {item.execution_id ? (
                  <SummaryFact label="Execution">
                    {onOpenExecution ? (
                      <button
                        type="button"
                        title={taskTimelineOpenLinkedRecordControlGuide.tooltip}
                        style={summaryInlineActionButtonStyle}
                        onClick={() => onOpenExecution(item.execution_id!)}
                      >
                        {item.execution_id}
                      </button>
                    ) : (
                      item.execution_id
                    )}
                  </SummaryFact>
                ) : null}
                {item.executor_id ? (
                  <SummaryFact label="Executor">
                    {onOpenExecutor ? (
                      <button
                        type="button"
                        title={taskTimelineOpenLinkedRecordControlGuide.tooltip}
                        style={summaryInlineActionButtonStyle}
                        onClick={() => onOpenExecutor(item.executor_id!)}
                      >
                        {item.executor_id}
                      </button>
                    ) : (
                      item.executor_id
                    )}
                  </SummaryFact>
                ) : null}
                {item.workspace_id ? (
                  <SummaryFact label="Workspace">
                    {onOpenWorkspace ? (
                      <button
                        type="button"
                        title={taskTimelineOpenLinkedRecordControlGuide.tooltip}
                        style={summaryInlineActionButtonStyle}
                        onClick={() => onOpenWorkspace(item.workspace_id!)}
                      >
                        {item.workspace_id}
                      </button>
                    ) : (
                      item.workspace_id
                    )}
                  </SummaryFact>
                ) : null}
                <SummaryFact label="Created">{formatSummaryTimestamp(item.created_at)}</SummaryFact>
              </SummaryFacts>
              {meaning ? (
                <div style={summaryCalloutStyle}>
                  {formatSummaryLabeledText("Meaning", meaning)}
                </div>
              ) : null}
            </SummaryListItem>
          );
        })}
      </SummaryList>
    </SummarySection>
  );
}

function matchesTimelineSearch(item: EventListItem, query: string): boolean {
  if (!query) {
    return true;
  }

  return [
    item.id,
    item.message,
    item.category,
    item.severity,
    item.event_state,
    item.run_id ?? "",
    item.execution_id ?? "",
    item.executor_id ?? "",
    item.workspace_id ?? "",
    item.event_type ?? "",
    item.previous_state ?? "",
    item.current_state ?? "",
    item.failure_category ?? "",
    item.capability_status ?? "",
    item.adapter_mode ?? "",
  ].some((value) => value.toLowerCase().includes(query));
}
