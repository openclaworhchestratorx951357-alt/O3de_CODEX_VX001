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

type AssetForgeOriginContext = {
  label: string;
  detail: string;
  runId: string | null;
  executionId: string | null;
  artifactId: string | null;
  packetCapturedAtIso: string | null;
  packetCapturedAtSource: string | null;
  packetResolutionSummary: string | null;
  packetResolvedLane: string | null;
  packetAttemptSummaryLines: string[];
};

type RecordsWorkspaceDesktopProps = {
  activeSurfaceId: ComponentProps<typeof RecordsWorkspaceView>["activeSurfaceId"];
  items: ComponentProps<typeof RecordsWorkspaceView>["items"];
  onSelectSurface: ComponentProps<typeof RecordsWorkspaceView>["onSelectSurface"];
  assetForgeOriginContext?: AssetForgeOriginContext | null;
  onOpenAssetForgeWorkspace?: (() => void) | null;
  onClearAssetForgeOriginContext?: (() => void) | null;
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
  assetForgeOriginContext,
  onOpenAssetForgeWorkspace,
  onClearAssetForgeOriginContext,
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
  const hasAssetForgeOriginRecord = Boolean(
    assetForgeOriginContext?.artifactId
      || assetForgeOriginContext?.executionId
      || assetForgeOriginContext?.runId,
  );
  const hasAssetForgeResolutionDiagnostics = Boolean(
    assetForgeOriginContext?.packetResolutionSummary
      || assetForgeOriginContext?.packetResolvedLane
      || (assetForgeOriginContext?.packetAttemptSummaryLines?.length ?? 0) > 0,
  );
  const packetLaneSurface = useMemo(
    () => getRecordsSurfaceIdFromResolvedLane(assetForgeOriginContext?.packetResolvedLane ?? null),
    [assetForgeOriginContext?.packetResolvedLane],
  );
  const hasPacketLaneDrift = Boolean(packetLaneSurface && packetLaneSurface !== activeSurfaceId);
  const packetCaptureFreshness = useMemo(
    () => describePacketCaptureFreshness(assetForgeOriginContext?.packetCapturedAtIso ?? null),
    [assetForgeOriginContext?.packetCapturedAtIso],
  );
  const packetCapturedAtLabel = useMemo(
    () => formatPacketCaptureTimestamp(assetForgeOriginContext?.packetCapturedAtIso ?? null),
    [assetForgeOriginContext?.packetCapturedAtIso],
  );
  const packetCapturedAtSourceLabel = assetForgeOriginContext?.packetCapturedAtSource ?? "Unknown / unavailable";

  return (
    <RecordsWorkspaceView
      activeSurfaceId={activeSurfaceId}
      items={items}
      onSelectSurface={onSelectSurface}
      workspaceBanner={assetForgeOriginContext ? (
        <section style={assetForgeOriginBannerStyle} aria-label="Asset Forge packet-origin context">
          <div style={assetForgeOriginBannerHeadingRowStyle}>
            <strong style={assetForgeOriginBannerHeadingStyle}>Opened from Asset Forge review packet origin</strong>
            <span style={assetForgeOriginBannerBadgeStyle}>read-only context</span>
          </div>
          <span style={assetForgeOriginBannerDetailStyle}>
            {assetForgeOriginContext.label}. {assetForgeOriginContext.detail}
          </span>
          <div style={assetForgeOriginBannerFactsStyle}>
            <span>Origin run: {assetForgeOriginContext.runId ?? "not recorded"}</span>
            <span>Origin execution: {assetForgeOriginContext.executionId ?? "not recorded"}</span>
            <span>Origin artifact: {assetForgeOriginContext.artifactId ?? "not recorded"}</span>
            <span>Origin captured at: {packetCapturedAtLabel}</span>
            <span>Origin capture source: {packetCapturedAtSourceLabel}</span>
            <span>
              Origin freshness: <strong style={packetCaptureFreshnessToneStyle(packetCaptureFreshness.tone)}>
                {packetCaptureFreshness.label}
              </strong>
            </span>
          </div>
          <span style={assetForgeOriginBannerHintStyle}>{packetCaptureFreshness.detail}</span>
          {assetForgeOriginContext?.packetResolvedLane ? (
            <div
              aria-label="Asset Forge lane alignment status"
              style={hasPacketLaneDrift ? assetForgeLaneAlignmentDriftStyle : assetForgeLaneAlignmentAlignedStyle}
            >
              <strong>{hasPacketLaneDrift ? "Lane drift detected" : "Lane alignment confirmed"}</strong>
              <span>
                Packet resolved lane: {formatResolvedLane(assetForgeOriginContext.packetResolvedLane)}.
              </span>
              <span>
                Active Records surface: {formatRecordsSurfaceLabel(activeSurfaceId)}.
              </span>
              {hasPacketLaneDrift ? (
                <>
                  <span>
                    Guidance: switch to the packet lane surface first, then refresh packet lanes from Asset Forge Review
                    before trusting readiness.
                  </span>
                  <button
                    type="button"
                    style={assetForgeOriginBannerButtonStyle}
                    onClick={() => {
                      if (packetLaneSurface) {
                        onSelectSurface(packetLaneSurface);
                      }
                    }}
                    title={packetLaneSurface
                      ? `Switch Records to ${formatRecordsSurfaceLabel(packetLaneSurface)} lane.`
                      : "Packet lane surface is unavailable for this context."}
                    disabled={!packetLaneSurface}
                  >
                    Open packet lane surface
                  </button>
                </>
              ) : (
                <span>
                  Guidance: current Records lane matches packet resolution. Continue read-only review or return to Asset
                  Forge Review.
                </span>
              )}
            </div>
          ) : null}
          {hasAssetForgeResolutionDiagnostics ? (
            <div aria-label="Asset Forge lane diagnostics context" style={assetForgeResolutionDiagnosticsStyle}>
              <strong style={assetForgeResolutionDiagnosticsHeadingStyle}>Packet lane diagnostics (read-only)</strong>
              <span>
                Resolution summary: {assetForgeOriginContext.packetResolutionSummary ?? "Unknown / unavailable"}
              </span>
              <span>
                Resolved lane: {formatResolvedLane(assetForgeOriginContext.packetResolvedLane)}
              </span>
              {assetForgeOriginContext.packetAttemptSummaryLines.length > 0 ? (
                <ul style={assetForgeResolutionDiagnosticsListStyle}>
                  {assetForgeOriginContext.packetAttemptSummaryLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <span>No lane-attempt details were recorded for this handoff.</span>
              )}
            </div>
          ) : null}
          <div style={assetForgeOriginBannerActionsStyle}>
            <button
              type="button"
              style={assetForgeOriginBannerButtonStyle}
              onClick={() => onOpenAssetForgeWorkspace?.()}
              disabled={!onOpenAssetForgeWorkspace}
              title={onOpenAssetForgeWorkspace
                ? "Return to the Asset Forge Review page."
                : "Asset Forge workspace navigation is unavailable in this view."}
            >
              Back to Asset Forge Review
            </button>
            <button
              type="button"
              style={assetForgeOriginBannerButtonStyle}
              onClick={() => onClearAssetForgeOriginContext?.()}
              disabled={!onClearAssetForgeOriginContext}
              title={onClearAssetForgeOriginContext
                ? "Clear packet-origin breadcrumbs from this Records workspace."
                : "Packet-origin context clear action is unavailable in this view."}
            >
              Clear origin context
            </button>
            <span style={assetForgeOriginBannerHintStyle}>
              {hasAssetForgeOriginRecord
                ? "Records lane can pivot to run, execution, or artifact details without writing project state."
                : "No persisted run, execution, or artifact id was recorded in this packet origin."}
            </span>
          </div>
        </section>
      ) : null}
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

type PacketCaptureFreshnessTone = "current" | "aging" | "stale" | "unknown";

type PacketCaptureFreshness = {
  label: string;
  detail: string;
  tone: PacketCaptureFreshnessTone;
};

function formatPacketCaptureTimestamp(value: string | null): string {
  if (!value || value.trim().length === 0) {
    return "Unknown / unavailable";
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toISOString();
}

function getRecordsSurfaceIdFromResolvedLane(
  lane: string | null,
): "runs" | "executions" | "artifacts" | null {
  if (!lane) {
    return null;
  }
  if (lane === "run") {
    return "runs";
  }
  if (lane === "execution") {
    return "executions";
  }
  if (lane === "artifact") {
    return "artifacts";
  }
  return null;
}

function formatRecordsSurfaceLabel(
  surfaceId: "runs" | "executions" | "artifacts" | "events",
): string {
  if (surfaceId === "runs") {
    return "Runs lane";
  }
  if (surfaceId === "executions") {
    return "Executions lane";
  }
  if (surfaceId === "artifacts") {
    return "Artifacts lane";
  }
  return "Events lane";
}

function formatPacketCaptureAge(diffMs: number): string {
  const absMs = Math.abs(diffMs);
  if (absMs < 60_000) {
    const seconds = Math.max(0, Math.round(absMs / 1000));
    return `${seconds}s`;
  }
  if (absMs < 3_600_000) {
    const minutes = Math.max(0, Math.round(absMs / 60_000));
    return `${minutes}m`;
  }
  if (absMs < 86_400_000) {
    const hours = Math.max(0, Math.round(absMs / 3_600_000));
    return `${hours}h`;
  }
  const days = Math.max(0, Math.round(absMs / 86_400_000));
  return `${days}d`;
}

function describePacketCaptureFreshness(capturedAtIso: string | null): PacketCaptureFreshness {
  if (!capturedAtIso || capturedAtIso.trim().length === 0) {
    return {
      label: "Unknown / unavailable",
      detail: "No packet capture timestamp was available for this handoff.",
      tone: "unknown",
    };
  }

  const parsed = Date.parse(capturedAtIso);
  if (Number.isNaN(parsed)) {
    return {
      label: "Timestamp unparseable",
      detail: `Capture timestamp is present but not parseable: ${capturedAtIso}`,
      tone: "unknown",
    };
  }

  const now = Date.now();
  const diffMs = now - parsed;
  const ageLabel = formatPacketCaptureAge(diffMs);
  if (diffMs < -120_000) {
    return {
      label: "Clock skew detected",
      detail: `Capture timestamp is ${ageLabel} in the future. Verify operator clock alignment before trusting freshness.`,
      tone: "unknown",
    };
  }
  if (diffMs <= 15 * 60_000) {
    return {
      label: "Current evidence",
      detail: `Packet capture age is ${ageLabel}; read-only evidence looks current for operator review.`,
      tone: "current",
    };
  }
  if (diffMs <= 2 * 60 * 60_000) {
    return {
      label: "Aging evidence",
      detail: `Packet capture age is ${ageLabel}; continue read-only review and refresh evidence before any approval corridor.`,
      tone: "aging",
    };
  }
  return {
    label: "Stale evidence",
    detail: `Packet capture age is ${ageLabel}; refresh packet lanes outside Codex before trusting readiness.`,
    tone: "stale",
  };
}

function packetCaptureFreshnessToneStyle(tone: PacketCaptureFreshnessTone) {
  if (tone === "current") {
    return {
      color: "rgba(134, 239, 172, 1)",
    } as const;
  }
  if (tone === "aging") {
    return {
      color: "rgba(253, 224, 71, 1)",
    } as const;
  }
  if (tone === "stale") {
    return {
      color: "rgba(251, 113, 133, 1)",
    } as const;
  }
  return {
    color: "rgba(226, 232, 240, 0.92)",
  } as const;
}

function formatResolvedLane(value: string | null): string {
  if (!value || value.trim().length === 0) {
    return "Unresolved";
  }
  if (value === "artifact") {
    return "Artifact lane";
  }
  if (value === "execution") {
    return "Execution lane";
  }
  if (value === "run") {
    return "Run lane";
  }
  return value;
}

const assetForgeOriginBannerStyle = {
  display: "grid",
  gap: 8,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid rgba(96, 165, 250, 0.26)",
  background: "rgba(15, 23, 42, 0.34)",
} as const;

const assetForgeOriginBannerHeadingRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
} as const;

const assetForgeOriginBannerHeadingStyle = {
  fontSize: 14,
} as const;

const assetForgeOriginBannerBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  border: "1px solid rgba(74, 222, 128, 0.35)",
  background: "rgba(22, 163, 74, 0.16)",
  color: "rgba(134, 239, 172, 1)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.03em",
  padding: "2px 8px",
  textTransform: "uppercase",
} as const;

const assetForgeOriginBannerDetailStyle = {
  fontSize: 12,
  opacity: 0.9,
} as const;

const assetForgeOriginBannerFactsStyle = {
  display: "grid",
  gap: 4,
  fontSize: 12,
  opacity: 0.9,
} as const;

const assetForgeResolutionDiagnosticsStyle = {
  display: "grid",
  gap: 4,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(96, 165, 250, 0.2)",
  background: "rgba(30, 41, 59, 0.24)",
  fontSize: 12,
  opacity: 0.92,
} as const;

const assetForgeResolutionDiagnosticsHeadingStyle = {
  fontSize: 12,
  letterSpacing: "0.02em",
} as const;

const assetForgeResolutionDiagnosticsListStyle = {
  margin: "2px 0 0",
  paddingLeft: 16,
  display: "grid",
  gap: 2,
} as const;

const assetForgeOriginBannerActionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
} as const;

const assetForgeOriginBannerButtonStyle = {
  border: "1px solid rgba(148, 163, 184, 0.28)",
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(15, 23, 42, 0.36)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontSize: 12,
} as const;

const assetForgeOriginBannerHintStyle = {
  fontSize: 12,
  opacity: 0.8,
} as const;

const assetForgeLaneAlignmentAlignedStyle = {
  display: "grid",
  gap: 4,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(74, 222, 128, 0.28)",
  background: "rgba(22, 163, 74, 0.14)",
  fontSize: 12,
  opacity: 0.94,
} as const;

const assetForgeLaneAlignmentDriftStyle = {
  display: "grid",
  gap: 4,
  padding: "8px 10px",
  borderRadius: 12,
  border: "1px solid rgba(251, 113, 133, 0.34)",
  background: "rgba(190, 24, 93, 0.12)",
  fontSize: 12,
  opacity: 0.96,
} as const;
