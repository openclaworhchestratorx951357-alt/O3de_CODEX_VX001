import { useEffect, useMemo } from "react";

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
import {
  type TaskTimelineActiveState,
  type TaskTimelineEventTypeFilter,
  type TaskTimelineRecoveryAction,
  type TaskTimelineSavedView,
  type TaskTimelineVerificationFilter,
  useEventTimelineViews,
} from "./useEventTimelineViews";

const taskTimelineGuide = getPanelGuide("task-timeline");
const taskTimelineRefreshControlGuide = getPanelControlGuide("task-timeline", "refresh");
const taskTimelineSearchControlGuide = getPanelControlGuide("task-timeline", "search");
const taskTimelineOpenLinkedRecordControlGuide = getPanelControlGuide("task-timeline", "open-linked-record");
type TaskTimelineProps = {
  items: EventListItem[];
  loading: boolean;
  error: string | null;
  presetActions?: Array<{
    id: string;
    label: string;
    title: string;
    onSelect: () => void;
  }>;
  onOpenEvent?: (eventId: string) => void;
  onOpenRun?: (runId: string) => void;
  onOpenExecution?: (executionId: string) => void;
  onOpenExecutor?: (executorId: string) => void;
  onOpenWorkspace?: (workspaceId: string) => void;
  eventTypePreset?: "all" | "app_control" | "app_control_applied" | "app_control_reverted";
  verificationPreset?: "all" | "verified_only" | "assumed_present" | "not_recorded";
  searchPreset?: string | null;
  savedViewsStorageKey?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
  lastRefreshedAt?: string | null;
  updateBadgeLabel?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
  onEmptyFilteredStateChange?: ((active: boolean) => void) | null;
  onActiveFiltersChange?: ((filters: {
    eventTypeLabel: string | null;
    verificationLabel: string | null;
    searchValue: string | null;
    hasActiveFilters: boolean;
  }) => void) | null;
  onEmptyRecoveryChange?: ((recovery: TaskTimelineRecoveryAction | null) => void) | null;
  onFilterResultsChange?: ((summary: {
    filteredCount: number;
    totalCount: number;
    hasActiveFilters: boolean;
  }) => void) | null;
  clearFiltersSignal?: number;
};

export default function TaskTimeline({
  items,
  loading,
  error,
  presetActions = [],
  onOpenEvent,
  onOpenRun,
  onOpenExecution,
  onOpenExecutor,
  onOpenWorkspace,
  eventTypePreset = "all",
  verificationPreset = "all",
  searchPreset,
  savedViewsStorageKey = null,
  focusLabel,
  onClearFocus,
  lastRefreshedAt,
  updateBadgeLabel,
  onRefresh,
  refreshing = false,
  onEmptyFilteredStateChange = null,
  onActiveFiltersChange = null,
  onEmptyRecoveryChange = null,
  onFilterResultsChange = null,
  clearFiltersSignal = 0,
}: TaskTimelineProps) {
  const {
    eventTypeFilter,
    setEventTypeFilter,
    verificationFilter,
    setVerificationFilter,
    searchValue,
    setSearchValue,
    savedViews,
    saveFeedback,
    lastNonEmptyState,
    applyActiveState,
    applySavedView,
    saveCurrentView,
    overwriteSavedView,
    renameSavedView,
    moveSavedViewFirst,
    removeSavedView,
    clearAllFilters,
    dismissSaveFeedback,
    updateLastNonEmptyState,
  } = useEventTimelineViews({
    eventTypePreset,
    verificationPreset,
    searchPreset,
    savedViewsStorageKey,
    clearFiltersSignal,
  });

  const normalizedQuery = searchValue.trim().toLowerCase();
  const eventTypeOptions = useMemo(
    () => buildEventTypeOptions(items),
    [items],
  );
  const verificationOptions = useMemo(
    () => buildVerificationOptions(items),
    [items],
  );
  const filteredItems = useMemo(
    () => items.filter((item) => (
      matchesEventTypeFilter(item, eventTypeFilter)
      && matchesVerificationFilter(item, verificationFilter)
      && matchesTimelineSearch(item, normalizedQuery)
    )),
    [eventTypeFilter, items, normalizedQuery, verificationFilter],
  );
  const activeFilters = useMemo(
    () => [
      eventTypeFilter !== "all" ? {
        id: "event-type",
        label: `Event type: ${formatEventTypeLabel(eventTypeFilter)}`,
        onClear: () => setEventTypeFilter("all" as const),
      } : null,
      verificationFilter !== "all" ? {
        id: "verification",
        label: `Verification: ${formatVerificationOptionLabel(verificationFilter)}`,
        onClear: () => setVerificationFilter("all" as const),
      } : null,
      normalizedQuery ? {
        id: "search",
        label: `Search: ${searchValue}`,
        onClear: () => setSearchValue(""),
      } : null,
    ].filter((value): value is {
      id: string;
      label: string;
      onClear: () => void;
    } => value !== null),
    [eventTypeFilter, normalizedQuery, searchValue, verificationFilter],
  );
  const hasSavableView = activeFilters.length > 0;
  const shouldShowEmptyFilterHelper = !loading && !error && filteredItems.length === 0 && items.length > 0;
  const suggestedPresetActions = useMemo(
    () => rankPresetActionsForEmptyState(
      presetActions,
      eventTypeFilter,
      verificationFilter,
      normalizedQuery,
    ).slice(0, 2),
    [eventTypeFilter, normalizedQuery, presetActions, verificationFilter],
  );
  const suggestedSavedViews = useMemo(
    () => rankSavedViewsForEmptyState(
      savedViews,
      eventTypeFilter,
      verificationFilter,
      searchValue,
    ).slice(0, 2),
    [eventTypeFilter, savedViews, searchValue, verificationFilter],
  );
  const hiddenItemCount = Math.max(items.length - filteredItems.length, 0);
  const filterPressure = getTimelineFilterPressure(filteredItems.length, items.length);
  const shouldShowInlineNarrowingWarning = activeFilters.length > 0
    && hiddenItemCount > 0
    && filterPressure === "high";
  const hasRestorableLastNonEmptyState = Boolean(
    lastNonEmptyState
    && !isActiveStateEqual(lastNonEmptyState, {
      eventTypeFilter,
      verificationFilter,
      searchValue,
    }),
  );
  const inlineNarrowingAction = normalizedQuery
    ? {
        label: "Clear search",
        onSelect: () => setSearchValue(""),
      }
    : {
        label: "Loosen filters",
        onSelect: () => {
          if (verificationFilter !== "all") {
            setVerificationFilter("all");
            return;
          }
          if (eventTypeFilter !== "all") {
            setEventTypeFilter("all");
          }
        },
      };

  const emptyStateRecoveryActions: TaskTimelineRecoveryAction[] = [
    ...(hasRestorableLastNonEmptyState && lastNonEmptyState
      ? [{
          label: "Restore last non-empty view",
          title: "Return to the most recent filter stack that still showed timeline events.",
          provenanceLabel: "session memory",
          provenanceDetail: "Recovered from the last browser-session filter stack that still showed persisted events.",
          onSelect: () => applyActiveState(lastNonEmptyState),
        }]
      : []),
    ...suggestedPresetActions.map((action) => ({
      label: `Try ${action.label}`,
      title: action.title,
      provenanceLabel: "preset path",
      provenanceDetail: `Recovered from the canned preset action "${action.label}".`,
      onSelect: action.onSelect,
    })),
    ...suggestedSavedViews.map((savedView) => ({
      label: `Open ${savedView.label}`,
      title: `Reopen saved view ${savedView.label}.`,
      provenanceLabel: "saved view",
      provenanceDetail: `Recovered from the saved browser-session view "${savedView.label}".`,
      onSelect: () => applySavedView(savedView),
    })),
  ];

  useEffect(() => {
    updateLastNonEmptyState(filteredItems.length);
  }, [filteredItems.length, updateLastNonEmptyState]);

  useEffect(() => {
    onEmptyFilteredStateChange?.(shouldShowEmptyFilterHelper);
  }, [onEmptyFilteredStateChange, shouldShowEmptyFilterHelper]);

  useEffect(() => {
    onActiveFiltersChange?.({
      eventTypeLabel: eventTypeFilter !== "all" ? formatEventTypeLabel(eventTypeFilter) : null,
      verificationLabel: verificationFilter !== "all" ? formatVerificationOptionLabel(verificationFilter) : null,
      searchValue: normalizedQuery ? searchValue : null,
      hasActiveFilters: eventTypeFilter !== "all"
        || verificationFilter !== "all"
        || normalizedQuery.length > 0,
    });
  }, [
    eventTypeFilter,
    normalizedQuery,
    onActiveFiltersChange,
    searchValue,
    verificationFilter,
  ]);

  useEffect(() => {
    if (!shouldShowEmptyFilterHelper) {
      onEmptyRecoveryChange?.(null);
      return;
    }

    if (hasRestorableLastNonEmptyState && lastNonEmptyState) {
      onEmptyRecoveryChange?.({
        label: "Restore last non-empty view",
        title: "Return to the most recent filter stack that still showed timeline events.",
        provenanceLabel: "session memory",
        provenanceDetail: "Recovered from the last browser-session filter stack that still showed persisted events.",
        onSelect: () => applyActiveState(lastNonEmptyState),
      });
      return;
    }

    const bestSavedView = suggestedSavedViews[0];
    if (bestSavedView) {
      onEmptyRecoveryChange?.({
        label: `Open ${bestSavedView.label}`,
        title: "Reopen the strongest saved view match for this empty event lane.",
        provenanceLabel: "saved view",
        provenanceDetail: `Recovered from the saved browser-session view "${bestSavedView.label}".`,
        onSelect: () => applySavedView(bestSavedView),
      });
      return;
    }

    const bestPresetAction = suggestedPresetActions[0];
    if (bestPresetAction) {
      onEmptyRecoveryChange?.({
        label: `Try ${bestPresetAction.label}`,
        title: bestPresetAction.title,
        provenanceLabel: "preset path",
        provenanceDetail: `Recovered from the canned preset action "${bestPresetAction.label}".`,
        onSelect: bestPresetAction.onSelect,
      });
      return;
    }

    onEmptyRecoveryChange?.(null);
  }, [
    hasRestorableLastNonEmptyState,
    lastNonEmptyState,
    onEmptyRecoveryChange,
    shouldShowEmptyFilterHelper,
    suggestedPresetActions,
    suggestedSavedViews,
  ]);

  useEffect(() => {
    onFilterResultsChange?.({
      filteredCount: filteredItems.length,
      totalCount: items.length,
      hasActiveFilters: activeFilters.length > 0,
    });
  }, [activeFilters.length, filteredItems.length, items.length, onFilterResultsChange]);

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
      renderChildrenWhenEmpty
      quickStartTitle="Investigation flow"
      quickStartItems={taskTimelineGuide.checklist}
      actions={(
        <div style={summaryControlRowStyle}>
          {onRefresh ? (
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
          {savedViewsStorageKey ? (
            <button
              type="button"
              disabled={!hasSavableView}
              onClick={saveCurrentView}
              style={summaryInlineActionButtonStyle}
              title="Save the current event filter combination for this browser session."
            >
              Save current view
            </button>
          ) : null}
          {saveFeedback ? (
            <span style={saveFeedbackBadgeStyle} title={saveFeedback.detail}>
              <span>{saveFeedback.label}</span>
              <button
                type="button"
                aria-label="Dismiss save feedback"
                onClick={dismissSaveFeedback}
                style={summaryInlineActionButtonStyle}
              >
                x
              </button>
            </span>
          ) : null}
        </div>
      )}
    >
      <div style={summaryControlRowStyle}>
        {presetActions.map((action) => (
          <button
            key={action.id}
            type="button"
            title={action.title}
            onClick={action.onSelect}
            style={summaryInlineActionButtonStyle}
          >
            {action.label}
          </button>
        ))}
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
        <div style={filterGroupStyle}>
          <span style={filterGroupLabelStyle}>Event type</span>
          {eventTypeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={eventTypeFilter === option.id}
              onClick={() => setEventTypeFilter(option.id)}
              style={summaryInlineActionButtonStyle}
              title={option.title}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div style={filterGroupStyle}>
          <span style={filterGroupLabelStyle}>Verification</span>
          {verificationOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={verificationFilter === option.id}
              onClick={() => setVerificationFilter(option.id)}
              style={summaryInlineActionButtonStyle}
              title={option.title}
            >
              {option.label}
            </button>
          ))}
        </div>
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
      {shouldShowInlineNarrowingWarning ? (
        <div style={inlineNarrowingWarningStyle}>
          <strong>High narrowing</strong>
          <span style={summaryTimestampNoteStyle}>
            This filter stack is hiding {hiddenItemCount} event{hiddenItemCount === 1 ? "" : "s"} before the lane reaches zero.
          </span>
          <div>
            <button
              type="button"
              onClick={inlineNarrowingAction.onSelect}
              style={summaryInlineActionButtonStyle}
            >
              {inlineNarrowingAction.label}
            </button>
          </div>
        </div>
      ) : null}
      {activeFilters.length > 0 ? (
        <div style={activeFilterStripStyle}>
          <span style={activeFilterStripLabelStyle}>Active filters</span>
          {activeFilters.map((filter) => (
            <span key={filter.id} style={activeFilterChipStyle}>
              {filter.label}
              <button
                type="button"
                onClick={filter.onClear}
                style={summaryInlineActionButtonStyle}
              >
                Clear
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {savedViews.length > 0 ? (
        <div style={activeFilterStripStyle}>
          <span style={activeFilterStripLabelStyle}>Saved views</span>
          {savedViews.map((savedView, index) => (
            <span key={savedView.id} style={activeFilterChipStyle}>
              <span style={savedViewLabelBlockStyle}>
                <span>{savedView.label}</span>
                <span style={savedViewMetaStyle}>
                  saved {formatSummaryTimestamp(savedView.createdAt)}
                  {savedView.lastUsedAt ? ` | last used ${formatSummaryTimestamp(savedView.lastUsedAt)}` : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() => applySavedView(savedView)}
                style={summaryInlineActionButtonStyle}
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => overwriteSavedView(savedView.id)}
                style={summaryInlineActionButtonStyle}
                title="Replace this saved view with the current event filters."
              >
                Overwrite
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window === "undefined") {
                    return;
                  }
                  const nextLabel = window.prompt("Rename saved view", savedView.label);
                  if (!nextLabel) {
                    return;
                  }
                  const trimmedLabel = nextLabel.trim();
                  if (!trimmedLabel) {
                    return;
                  }
                  renameSavedView(savedView.id, trimmedLabel);
                }}
                style={summaryInlineActionButtonStyle}
                title="Rename this saved view for this browser session."
              >
                Rename
              </button>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveSavedViewFirst(savedView.id)}
                style={summaryInlineActionButtonStyle}
                title="Move this saved view to the front of the session list."
              >
                Move first
              </button>
              <button
                type="button"
                onClick={() => removeSavedView(savedView.id)}
                style={summaryInlineActionButtonStyle}
              >
                Remove
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {shouldShowEmptyFilterHelper ? (
        <div style={emptyFilterHelperStyle}>
          <strong>No events match this filter stack</strong>
          <span style={summaryTimestampNoteStyle}>
            Clear the current filters, jump to a preset, or reopen a saved view instead of searching the full Records lane from scratch.
          </span>
          <div style={summaryControlRowStyle}>
            {activeFilters.length > 0 ? (
              <button
                type="button"
                onClick={clearAllFilters}
                style={summaryInlineActionButtonStyle}
              >
                Clear filters
              </button>
            ) : null}
            {emptyStateRecoveryActions.map((action) => (
              <span key={`${action.provenanceLabel}-${action.label}`} style={recoveryActionWrapStyle}>
                <button
                  type="button"
                  title={action.title}
                  onClick={action.onSelect}
                  style={summaryInlineActionButtonStyle}
                >
                  {action.label}
                </button>
                <span style={recoveryActionProvenanceStyle} title={action.provenanceDetail}>
                  {action.provenanceLabel}
                </span>
              </span>
            ))}
          </div>
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
                {item.verification_state ? (
                  <SummaryFact label="Verification posture">
                    <StatusChip
                      label={formatVerificationLabel(item.verification_state)}
                      tone={item.verification_state === "assumed_present" ? "warning" : "success"}
                    />
                  </SummaryFact>
                ) : null}
                {item.verified_count !== undefined && item.verified_count !== null ? (
                  <SummaryFact label="Verified count">{item.verified_count}</SummaryFact>
                ) : null}
                {item.assumed_count !== undefined && item.assumed_count !== null ? (
                  <SummaryFact label="Assumed count">{item.assumed_count}</SummaryFact>
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
                {onOpenEvent ? (
                  <SummaryFact label="Event">
                    <button
                      type="button"
                      title={taskTimelineOpenLinkedRecordControlGuide.tooltip}
                      style={summaryInlineActionButtonStyle}
                      onClick={() => onOpenEvent(item.id)}
                    >
                      Open detail
                    </button>
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
    item.verification_state ?? "",
  ].some((value) => value.toLowerCase().includes(query));
}

function matchesEventTypeFilter(
  item: EventListItem,
  filter: TaskTimelineEventTypeFilter,
): boolean {
  if (!filter || filter === "all") {
    return true;
  }
  if (filter === "app_control") {
    return item.category === "app_control";
  }
  return item.event_type === filter;
}

function matchesVerificationFilter(
  item: EventListItem,
  filter: TaskTimelineVerificationFilter,
): boolean {
  if (!filter || filter === "all") {
    return true;
  }
  return item.verification_state === filter;
}

function buildEventTypeOptions(items: EventListItem[]): Array<{
  id: TaskTimelineEventTypeFilter;
  label: string;
  title: string;
}> {
  const hasAppControl = items.some((item) => item.category === "app_control");
  const hasApplied = items.some((item) => item.event_type === "app_control_applied");
  const hasReverted = items.some((item) => item.event_type === "app_control_reverted");

  return [
    {
      id: "all",
      label: "All events",
      title: "Show every persisted event in the current timeline lane.",
    },
    ...(hasAppControl ? [{
      id: "app_control" as const,
      label: "App OS receipts",
      title: "Show persisted App OS receipt events only.",
    }] : []),
    ...(hasApplied ? [{
      id: "app_control_applied" as const,
      label: "Applied",
      title: "Show App OS apply receipts only.",
    }] : []),
    ...(hasReverted ? [{
      id: "app_control_reverted" as const,
      label: "Reverted",
      title: "Show App OS revert receipts only.",
    }] : []),
  ];
}

function buildVerificationOptions(items: EventListItem[]): Array<{
  id: TaskTimelineVerificationFilter;
  label: string;
  title: string;
}> {
  const hasVerifiedOnly = items.some((item) => item.verification_state === "verified_only");
  const hasAssumedPresent = items.some((item) => item.verification_state === "assumed_present");
  const hasNotRecorded = items.some((item) => item.verification_state === "not_recorded");

  return [
    {
      id: "all",
      label: "All posture",
      title: "Show every verification posture in the current event lane.",
    },
    ...(hasVerifiedOnly ? [{
      id: "verified_only" as const,
      label: "Verified only",
      title: "Show App OS receipts whose recorded results are fully verified.",
    }] : []),
    ...(hasAssumedPresent ? [{
      id: "assumed_present" as const,
      label: "Has assumed",
      title: "Show App OS receipts that still include assumed results.",
    }] : []),
    ...(hasNotRecorded ? [{
      id: "not_recorded" as const,
      label: "Not recorded",
      title: "Show App OS receipts that do not carry verification counts yet.",
    }] : []),
  ];
}

function formatVerificationLabel(value: string): string {
  switch (value) {
    case "verified_only":
      return "verified only";
    case "assumed_present":
      return "assumed present";
    case "not_recorded":
      return "not recorded";
    default:
      return value;
  }
}

function formatEventTypeLabel(
  value: TaskTimelineEventTypeFilter,
): string {
  switch (value) {
    case "app_control":
      return "App OS receipts";
    case "app_control_applied":
      return "Applied";
    case "app_control_reverted":
      return "Reverted";
    default:
      return "All events";
  }
}

function formatVerificationOptionLabel(
  value: TaskTimelineVerificationFilter,
): string {
  switch (value) {
    case "verified_only":
      return "Verified only";
    case "assumed_present":
      return "Has assumed";
    case "not_recorded":
      return "Not recorded";
    default:
      return "All posture";
  }
}

function rankPresetActionsForEmptyState(
  presetActions: TaskTimelineProps["presetActions"] = [],
  eventTypeFilter: TaskTimelineEventTypeFilter,
  verificationFilter: TaskTimelineVerificationFilter,
  normalizedQuery: string,
): NonNullable<TaskTimelineProps["presetActions"]> {
  const appControlFocused = eventTypeFilter !== "all" && eventTypeFilter.startsWith("app_control");
  const verificationFocused = verificationFilter !== "all";
  const queryHintsAppControl = normalizedQuery.includes("app") || normalizedQuery.includes("control") || normalizedQuery.includes("receipt");

  return [...presetActions].sort((left, right) => {
    const leftScore = scorePresetActionForEmptyState(left, appControlFocused, verificationFocused, queryHintsAppControl);
    const rightScore = scorePresetActionForEmptyState(right, appControlFocused, verificationFocused, queryHintsAppControl);
    return rightScore - leftScore;
  });
}

function scorePresetActionForEmptyState(
  action: NonNullable<TaskTimelineProps["presetActions"]>[number],
  appControlFocused: boolean,
  verificationFocused: boolean,
  queryHintsAppControl: boolean,
): number {
  const normalizedAction = `${action.id} ${action.label} ${action.title}`.toLowerCase();
  let score = 0;

  if (appControlFocused && (normalizedAction.includes("app os") || normalizedAction.includes("app_control") || normalizedAction.includes("receipt"))) {
    score += 4;
  }
  if (verificationFocused && (normalizedAction.includes("receipt") || normalizedAction.includes("app os"))) {
    score += 2;
  }
  if (queryHintsAppControl && (normalizedAction.includes("app os") || normalizedAction.includes("receipt") || normalizedAction.includes("control"))) {
    score += 2;
  }

  return score;
}

function rankSavedViewsForEmptyState(
  savedViews: TaskTimelineSavedView[],
  eventTypeFilter: TaskTimelineEventTypeFilter,
  verificationFilter: TaskTimelineVerificationFilter,
  searchValue: string,
): TaskTimelineSavedView[] {
  return [...savedViews]
    .filter((savedView) => !isCurrentFilterStack(savedView, eventTypeFilter, verificationFilter, searchValue))
    .sort((left, right) => {
      const leftScore = scoreSavedViewForEmptyState(left, eventTypeFilter, verificationFilter, searchValue);
      const rightScore = scoreSavedViewForEmptyState(right, eventTypeFilter, verificationFilter, searchValue);
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return getSavedViewRecency(right) - getSavedViewRecency(left);
    });
}

function scoreSavedViewForEmptyState(
  savedView: TaskTimelineSavedView,
  eventTypeFilter: TaskTimelineEventTypeFilter,
  verificationFilter: TaskTimelineVerificationFilter,
  searchValue: string,
): number {
  let score = 0;
  const normalizedCurrentSearch = searchValue.trim().toLowerCase();
  const normalizedSavedSearch = savedView.searchValue.trim().toLowerCase();

  if (savedView.eventTypeFilter === eventTypeFilter) {
    score += 4;
  }
  if (savedView.verificationFilter === verificationFilter) {
    score += 3;
  }
  if (normalizedCurrentSearch.length > 0) {
    if (normalizedSavedSearch.length === 0) {
      score += 2;
    } else if (
      normalizedSavedSearch.includes(normalizedCurrentSearch)
      || normalizedCurrentSearch.includes(normalizedSavedSearch)
    ) {
      score += 1;
    }
  }

  return score;
}

function isCurrentFilterStack(
  savedView: TaskTimelineSavedView,
  eventTypeFilter: TaskTimelineEventTypeFilter,
  verificationFilter: TaskTimelineVerificationFilter,
  searchValue: string,
): boolean {
  return savedView.eventTypeFilter === eventTypeFilter
    && savedView.verificationFilter === verificationFilter
    && savedView.searchValue === searchValue;
}

function getSavedViewRecency(savedView: TaskTimelineSavedView): number {
  const recencySource = savedView.lastUsedAt ?? savedView.createdAt;
  const timestamp = Date.parse(recencySource);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getTimelineFilterPressure(filteredCount: number, totalCount: number): "stable" | "light" | "moderate" | "high" {
  if (totalCount <= 0) {
    return "stable";
  }

  const visibleRatio = filteredCount / totalCount;
  if (visibleRatio <= 0.34) {
    return "high";
  }
  if (visibleRatio <= 0.67) {
    return "moderate";
  }
  return "light";
}

function isActiveStateEqual(
  left: TaskTimelineActiveState,
  right: TaskTimelineActiveState,
): boolean {
  return left.eventTypeFilter === right.eventTypeFilter
    && left.verificationFilter === right.verificationFilter
    && left.searchValue === right.searchValue;
}

const filterGroupStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
} as const;

const filterGroupLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  opacity: 0.78,
} as const;

const activeFilterStripStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
} as const;

const activeFilterStripLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  opacity: 0.78,
} as const;

const activeFilterChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  background: "rgba(15, 23, 42, 0.34)",
  fontSize: 12,
} as const;

const savedViewLabelBlockStyle = {
  display: "inline-flex",
  flexDirection: "column",
  gap: 2,
  maxWidth: 260,
} as const;

const savedViewMetaStyle = {
  opacity: 0.72,
  fontSize: 11,
} as const;

const saveFeedbackBadgeStyle = {
  ...summaryRefreshBadgeStyle,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
} as const;

const recoveryActionWrapStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
} as const;

const recoveryActionProvenanceStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid rgba(148, 163, 184, 0.24)",
  background: "rgba(15, 23, 42, 0.24)",
  fontSize: 11,
  opacity: 0.82,
} as const;

const inlineNarrowingWarningStyle = {
  display: "grid",
  gap: 4,
  marginTop: 8,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(245, 158, 11, 0.26)",
  background: "rgba(120, 53, 15, 0.18)",
} as const;

const emptyFilterHelperStyle = {
  display: "grid",
  gap: 8,
  marginBottom: 16,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  background: "rgba(15, 23, 42, 0.3)",
} as const;
