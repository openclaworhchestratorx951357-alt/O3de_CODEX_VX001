import { useMemo, useState, type ComponentProps, type RefObject } from "react";

import AppControlAuditSummaryPanel from "../AppControlAuditSummaryPanel";
import ArtifactDetailPanel from "../ArtifactDetailPanel";
import ArtifactsPanel from "../ArtifactsPanel";
import EventDetailPanel from "../EventDetailPanel";
import ExecutionDetailPanel from "../ExecutionDetailPanel";
import ExecutionsPanel from "../ExecutionsPanel";
import OverviewContextStrip from "../OverviewContextStrip";
import RunDetailPanel from "../RunDetailPanel";
import RunsPanel from "../RunsPanel";
import TaskTimeline from "../TaskTimeline";
import RecordsWorkspaceView from "./RecordsWorkspaceView";

type RecordsWorkspaceDesktopProps = {
  activeSurfaceId: ComponentProps<typeof RecordsWorkspaceView>["activeSurfaceId"];
  items: ComponentProps<typeof RecordsWorkspaceView>["items"];
  onSelectSurface: ComponentProps<typeof RecordsWorkspaceView>["onSelectSurface"];
  artifacts: {
    panelKey: string;
    sectionRef: RefObject<HTMLDivElement>;
    detailSectionRef: RefObject<HTMLDivElement>;
    contextStrip: ComponentProps<typeof OverviewContextStrip>;
    artifactsPanel: ComponentProps<typeof ArtifactsPanel>;
    artifactDetailPanel: ComponentProps<typeof ArtifactDetailPanel>;
  };
  executions: {
    panelKey: string;
    sectionRef: RefObject<HTMLDivElement>;
    detailSectionRef: RefObject<HTMLDivElement>;
    contextStrip: ComponentProps<typeof OverviewContextStrip>;
    executionsPanel: ComponentProps<typeof ExecutionsPanel>;
    executionDetailPanel: ComponentProps<typeof ExecutionDetailPanel>;
  };
  runs: {
    panelKey: string;
    sectionRef: RefObject<HTMLDivElement>;
    detailSectionRef: RefObject<HTMLDivElement>;
    contextStrip: ComponentProps<typeof OverviewContextStrip>;
    runsPanel: ComponentProps<typeof RunsPanel>;
    runDetailPanel: ComponentProps<typeof RunDetailPanel>;
  };
  events: {
    panelKey: string;
    sectionRef: RefObject<HTMLDivElement>;
    detailSectionRef: RefObject<HTMLDivElement>;
    contextStrip: ComponentProps<typeof OverviewContextStrip>;
    auditSummaryPanel: ComponentProps<typeof AppControlAuditSummaryPanel>;
    timelinePanel: ComponentProps<typeof TaskTimeline>;
    eventDetailPanel: ComponentProps<typeof EventDetailPanel>;
  };
};

export default function RecordsWorkspaceDesktop({
  activeSurfaceId,
  items,
  onSelectSurface,
  artifacts,
  executions,
  runs,
  events,
}: RecordsWorkspaceDesktopProps) {
  const [eventsFilterEmpty, setEventsFilterEmpty] = useState(false);
  const [eventsClearFiltersSignal, setEventsClearFiltersSignal] = useState(0);
  const [eventsActiveFilters, setEventsActiveFilters] = useState<{
    eventTypeLabel: string | null;
    verificationLabel: string | null;
    searchValue: string | null;
    hasActiveFilters: boolean;
  }>({
    eventTypeLabel: null,
    verificationLabel: null,
    searchValue: null,
    hasActiveFilters: false,
  });
  const [eventsBestRecoveryAction, setEventsBestRecoveryAction] = useState<{
    label: string;
    title: string;
    provenanceLabel: string;
    provenanceDetail: string;
    onSelect: () => void;
  } | null>(null);
  const [eventsFilterResults, setEventsFilterResults] = useState<{
    filteredCount: number;
    totalCount: number;
    hasActiveFilters: boolean;
  }>({
    filteredCount: 0,
    totalCount: 0,
    hasActiveFilters: false,
  });
  const eventsEmptyReason = useMemo(() => {
    const parts = [
      eventsActiveFilters.eventTypeLabel,
      eventsActiveFilters.verificationLabel,
      eventsActiveFilters.searchValue ? `search "${eventsActiveFilters.searchValue}"` : null,
    ].filter((value): value is string => Boolean(value));

    return parts.length > 0 ? parts.join(" + ") : "the current review stack";
  }, [eventsActiveFilters]);
  const shouldShowEventsFilterSummary = eventsFilterResults.totalCount > 0
    && (eventsFilterResults.hasActiveFilters || eventsFilterResults.filteredCount < eventsFilterResults.totalCount);
  const eventsHiddenCount = Math.max(eventsFilterResults.totalCount - eventsFilterResults.filteredCount, 0);
  const eventsFilterPressureLabel = eventsFilterResults.hasActiveFilters
    ? getEventsFilterPressureLabel(eventsFilterResults.filteredCount, eventsFilterResults.totalCount)
    : null;

  return (
    <RecordsWorkspaceView
      activeSurfaceId={activeSurfaceId}
      items={items}
      onSelectSurface={onSelectSurface}
      artifactsContent={(
        <>
          <div ref={artifacts.sectionRef}>
            <OverviewContextStrip {...artifacts.contextStrip} />
            <ArtifactsPanel key={artifacts.panelKey} {...artifacts.artifactsPanel} />
          </div>
          <div ref={artifacts.detailSectionRef}>
            <ArtifactDetailPanel {...artifacts.artifactDetailPanel} />
          </div>
        </>
      )}
      executionsContent={(
        <>
          <div ref={executions.sectionRef}>
            <OverviewContextStrip {...executions.contextStrip} />
            <ExecutionsPanel key={executions.panelKey} {...executions.executionsPanel} />
          </div>
          <div ref={executions.detailSectionRef}>
            <ExecutionDetailPanel {...executions.executionDetailPanel} />
          </div>
        </>
      )}
      eventsContent={(
        <>
          <div ref={events.sectionRef}>
            {eventsFilterEmpty ? (
              <div style={eventsQuickReturnStyle}>
                <strong>Events lane is empty because the current filters are too narrow.</strong>
                <span style={eventsQuickReturnHintStyle}>
                  No persisted events matched {eventsEmptyReason}.
                </span>
                {eventsBestRecoveryAction ? (
                  <span style={eventsQuickReturnHintStyle} title={eventsBestRecoveryAction.provenanceDetail}>
                    Best recovery source: {eventsBestRecoveryAction.provenanceLabel}.
                  </span>
                ) : null}
                <div style={eventsQuickReturnActionsStyle}>
                  {eventsBestRecoveryAction ? (
                    <button
                      type="button"
                      style={eventsQuickReturnButtonStyle}
                      title={eventsBestRecoveryAction.title}
                      onClick={eventsBestRecoveryAction.onSelect}
                    >
                      {eventsBestRecoveryAction.label}
                    </button>
                  ) : null}
                  {eventsActiveFilters.hasActiveFilters ? (
                    <button
                      type="button"
                      style={eventsQuickReturnButtonStyle}
                      onClick={() => setEventsClearFiltersSignal((current) => current + 1)}
                    >
                      Clear Events filters
                    </button>
                  ) : null}
                  <button
                    type="button"
                    style={eventsQuickReturnButtonStyle}
                    onClick={() => events.sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    Return to Events review stack
                  </button>
                </div>
              </div>
            ) : null}
            {shouldShowEventsFilterSummary ? (
              <div style={eventsFilterSummaryStyle}>
                <div style={eventsFilterSummaryHeadlineStyle}>
                  <strong>
                    Showing {eventsFilterResults.filteredCount} of {eventsFilterResults.totalCount} events
                  </strong>
                  {eventsFilterPressureLabel ? (
                    <span style={eventsFilterPressureBadgeStyle}>
                      {eventsFilterPressureLabel}
                    </span>
                  ) : null}
                </div>
                <span style={eventsQuickReturnHintStyle}>
                  {eventsFilterResults.hasActiveFilters
                    ? `The current Events review stack is narrowing the lane before it reaches zero.`
                    : "Some persisted events are currently outside the visible Events lane."}
                </span>
                {eventsHiddenCount > 0 ? (
                  <span style={eventsFilterHiddenCountStyle}>
                    Hidden by the current lane: {eventsHiddenCount}
                  </span>
                ) : null}
              </div>
            ) : null}
            <OverviewContextStrip {...events.contextStrip} />
            <AppControlAuditSummaryPanel {...events.auditSummaryPanel} />
            <TaskTimeline
              key={events.panelKey}
              {...events.timelinePanel}
              onEmptyFilteredStateChange={setEventsFilterEmpty}
              onActiveFiltersChange={setEventsActiveFilters}
              onEmptyRecoveryChange={setEventsBestRecoveryAction}
              onFilterResultsChange={setEventsFilterResults}
              clearFiltersSignal={eventsClearFiltersSignal}
            />
          </div>
          <div ref={events.detailSectionRef}>
            <EventDetailPanel {...events.eventDetailPanel} />
          </div>
        </>
      )}
      runsContent={(
        <>
          <div ref={runs.sectionRef}>
            <OverviewContextStrip {...runs.contextStrip} />
            <RunsPanel key={runs.panelKey} {...runs.runsPanel} />
          </div>
          <div ref={runs.detailSectionRef}>
            <RunDetailPanel {...runs.runDetailPanel} />
          </div>
        </>
      )}
    />
  );
}

const eventsQuickReturnStyle = {
  display: "grid",
  gap: 8,
  padding: "12px 14px",
  borderRadius: 18,
  border: "1px solid rgba(148, 163, 184, 0.28)",
  background: "rgba(15, 23, 42, 0.32)",
} as const;

const eventsFilterSummaryStyle = {
  display: "grid",
  gap: 6,
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 16,
  border: "1px solid rgba(96, 165, 250, 0.2)",
  background: "rgba(30, 41, 59, 0.24)",
} as const;

const eventsFilterSummaryHeadlineStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
} as const;

const eventsFilterPressureBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 8px",
  borderRadius: 999,
  border: "1px solid rgba(96, 165, 250, 0.24)",
  background: "rgba(37, 99, 235, 0.14)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
} as const;

const eventsFilterHiddenCountStyle = {
  fontSize: 12,
  opacity: 0.76,
} as const;

const eventsQuickReturnHintStyle = {
  fontSize: 12,
  opacity: 0.82,
} as const;

const eventsQuickReturnActionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
} as const;

const eventsQuickReturnButtonStyle = {
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(15, 23, 42, 0.34)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontSize: 12,
} as const;

function getEventsFilterPressureLabel(filteredCount: number, totalCount: number): string {
  if (totalCount <= 0) {
    return "stable";
  }

  const visibleRatio = filteredCount / totalCount;
  if (visibleRatio <= 0.34) {
    return "high narrowing";
  }
  if (visibleRatio <= 0.67) {
    return "moderate narrowing";
  }
  return "light narrowing";
}
