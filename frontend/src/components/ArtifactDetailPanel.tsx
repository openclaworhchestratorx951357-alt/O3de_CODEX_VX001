import { useEffect, useRef, useState } from "react";
import type {
  ArtifactListItem,
  ArtifactRecord,
  ProjectInspectEvidenceDetails,
} from "../types/contracts";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import {
  describeArtifactAttention,
  describeArtifactPriority,
  recommendArtifactAction,
} from "../lib/recordPriority";
import {
  getFallbackCategoryLabel,
  getInspectionSurfaceLabel,
  getManifestSourceOfTruthLabel,
  readPromptSafetyEnvelope,
  readTruthMarkerString,
} from "../lib/executionTruth";
import LaneActionsCard, { type LaneActionEntry } from "./LaneActionsCard";
import OperatorLaneStateBlock, { type OperatorLaneStateEntry } from "./OperatorLaneStateBlock";
import PromptSafetySummaryCard from "./PromptSafetySummaryCard";
import ProjectInspectEvidenceSummary from "./ProjectInspectEvidenceSummary";
import RecordLineageStrip from "./RecordLineageStrip";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import TriageSummaryStrip from "./TriageSummaryStrip";
import { buildLaneActionEntries, buildOperatorLaneStateEntries } from "./laneViewModel";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryActionRowStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryCalloutStyle,
  summaryHighlightedCardStyle,
  summaryTimestampNoteStyle,
  summaryTopStackStyle,
} from "./summaryPrimitives";

const artifactDetailGuide = getPanelGuide("artifact-detail");
const artifactDetailRefreshControlGuide = getPanelControlGuide("artifact-detail", "refresh");
const artifactDetailLineageOpenControlGuide = getPanelControlGuide("artifact-detail", "lineage-open");
const artifactDetailJumpControlGuide = getPanelControlGuide("artifact-detail", "jump");
const artifactDetailNextHopControlGuide = getPanelControlGuide("artifact-detail", "next-hop");
const artifactDetailRecordNavigationControlGuide = getPanelControlGuide("artifact-detail", "record-navigation");

function getArtifactDetailShortcutTitle(label: string): string {
  return `${artifactDetailRecordNavigationControlGuide.tooltip} Use the ${label} shortcut to reopen the related record from the current artifact-detail workflow.`;
}

function getArtifactDetailLaneHistoryTitle(
  entry: { kind: "run" | "execution" | "artifact"; id: string; label: string; detail: string },
): string {
  const detailSuffix = entry.detail ? ` ${entry.detail}` : "";
  return `${artifactDetailRecordNavigationControlGuide.tooltip} Return to recent ${entry.kind} ${entry.label} from the current artifact-detail lane history.${detailSuffix}`;
}

type ArtifactDetailPanelProps = {
  item: ArtifactRecord | null;
  loading: boolean;
  error: string | null;
  selectedRunId?: string | null;
  selectedExecutionId?: string | null;
  selectedArtifactId?: string | null;
  pinnedRecordId?: string | null;
  pinnedRecordStatusLabel?: string | null;
  pinnedRecordStatusDetail?: string | null;
  laneQueueLabel?: string | null;
  laneQueueDetail?: string | null;
  laneCompletionLabel?: string | null;
  laneCompletionDetail?: string | null;
  laneRolloverLabel?: string | null;
  laneRolloverDetail?: string | null;
  laneMetricsLabel?: string | null;
  laneMetricsDetail?: string | null;
  laneDriverLabel?: string | null;
  laneDriverDetail?: string | null;
  laneMemoryLabel?: string | null;
  laneMemoryDetail?: string | null;
  laneHistoryEntries?: Array<{ kind: "run" | "execution" | "artifact"; id: string; label: string; detail: string }>;
  laneHandoffLabel?: string | null;
  laneHandoffDetail?: string | null;
  laneExportLabel?: string | null;
  laneExportDetail?: string | null;
  laneOperatorNoteLabel?: string | null;
  laneOperatorNoteDetail?: string | null;
  activeLanePresetLabel?: string | null;
  activeLanePresetDetail?: string | null;
  lanePresetRestoredLabel?: string | null;
  lanePresetRestoredDetail?: string | null;
  lanePresetDriftLabel?: string | null;
  lanePresetDriftDetail?: string | null;
  priorityShortcutLabel?: string | null;
  priorityShortcutDescription?: string | null;
  warningShortcutLabel?: string | null;
  warningShortcutDescription?: string | null;
  breadcrumbs?: Array<{ kind: "run" | "execution" | "artifact"; id: string; label: string }>;
  relatedArtifacts?: ArtifactListItem[];
  relatedRunStatus?: string | null;
  relatedRunSummary?: string | null;
  relatedExecutionStatus?: string | null;
  relatedExecutionSummary?: string | null;
  relatedExecutionMode?: string | null;
  relatedExecutionStartedAt?: string | null;
  relatedExecutionWarningCount?: number | null;
  onOpenRun?: (runId: string) => void;
  onOpenExecution?: (executionId: string) => void;
  onOpenArtifact?: (artifactId: string) => void;
  onOpenPriorityRecord?: (() => void) | null;
  onOpenWarningRecord?: (() => void) | null;
  onPinRecord?: (() => void) | null;
  onUnpinRecord?: (() => void) | null;
  onRefocusPinnedRecord?: (() => void) | null;
  onOpenNextLaneRecord?: (() => void) | null;
  onOpenLaneRolloverRecord?: (() => void) | null;
  onReturnToLane?: (() => void) | null;
  onOpenLaneHistoryEntry?: ((entry: { kind: "run" | "execution" | "artifact"; id: string; label: string; detail: string }) => void) | null;
  refreshHint?: string | null;
  lastRefreshedAt?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

function readProjectInspectDetails(
  details: Record<string, unknown> | ProjectInspectEvidenceDetails | null | undefined,
): ProjectInspectEvidenceDetails | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  return details as ProjectInspectEvidenceDetails;
}

function getExecutionHopReason(
  status: string | null | undefined,
  mode: string | null | undefined,
  warningCount: number | null | undefined,
): string {
  if (mode === "simulated") {
    return "Execution is the best next hop when you need to confirm the simulation boundary before treating this artifact as real output.";
  }
  if (status === "running" || status === "waiting_approval") {
    return "Execution is the best next hop when this artifact may still belong to an active or approval-adjacent decision lane.";
  }
  if (typeof warningCount === "number" && warningCount > 0) {
    return "Execution is the best next hop when you need to inspect warnings tied to the artifact's immediate operational context.";
  }
  return "Execution is the best next hop when you want the closest persisted context for how this artifact was produced.";
}

function getRunHopReason(
  status: string | null | undefined,
  runSummary: string | null | undefined,
): string {
  if (status === "blocked" || status === "waiting_approval") {
    return "Run is the best next hop when the broader workflow may still be blocked or waiting on an operator decision.";
  }
  if (status === "failed" || status === "rejected") {
    return "Run is the best next hop when you need the highest-level outcome for a failed or rejected workflow.";
  }
  if (runSummary) {
    return "Run is the best next hop when you want the broader persisted outcome summary that surrounds this artifact.";
  }
  return "Run is the best next hop when you need the wider workflow context beyond this artifact's immediate execution.";
}

export default function ArtifactDetailPanel({
  item,
  loading,
  error,
  selectedRunId,
  selectedExecutionId,
  selectedArtifactId,
  pinnedRecordId,
  pinnedRecordStatusLabel,
  pinnedRecordStatusDetail,
  laneQueueLabel,
  laneQueueDetail,
  laneCompletionLabel,
  laneCompletionDetail,
  laneRolloverLabel,
  laneRolloverDetail,
  laneMetricsLabel,
  laneMetricsDetail,
  laneDriverLabel,
  laneDriverDetail,
  laneMemoryLabel,
  laneMemoryDetail,
  laneHistoryEntries = [],
  laneHandoffLabel,
  laneHandoffDetail,
  laneExportLabel,
  laneExportDetail,
  laneOperatorNoteLabel,
  laneOperatorNoteDetail,
  activeLanePresetLabel,
  activeLanePresetDetail,
  lanePresetRestoredLabel,
  lanePresetRestoredDetail,
  lanePresetDriftLabel,
  lanePresetDriftDetail,
  priorityShortcutLabel,
  priorityShortcutDescription,
  warningShortcutLabel,
  warningShortcutDescription,
  breadcrumbs = [],
  relatedArtifacts = [],
  relatedRunStatus,
  relatedRunSummary,
  relatedExecutionStatus,
  relatedExecutionSummary,
  relatedExecutionMode,
  relatedExecutionStartedAt,
  relatedExecutionWarningCount,
  onOpenRun,
  onOpenExecution,
  onOpenArtifact,
  onOpenPriorityRecord,
  onOpenWarningRecord,
  onPinRecord,
  onUnpinRecord,
  onRefocusPinnedRecord,
  onOpenNextLaneRecord,
  onOpenLaneRolloverRecord,
  onReturnToLane,
  onOpenLaneHistoryEntry,
  refreshHint,
  lastRefreshedAt,
  onRefresh,
  refreshing = false,
}: ArtifactDetailPanelProps) {
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const relatedRecordsRef = useRef<HTMLElement | null>(null);
  const evidenceSummaryRef = useRef<HTMLDivElement | null>(null);
  const siblingArtifacts = relatedArtifacts.filter((artifact) => artifact.id !== item?.id);
  const projectInspectDetails = item?.metadata && item.kind === "project_manifest_inspection"
    ? readProjectInspectDetails(item.metadata)
    : null;
  const promptSafetyEnvelope = readPromptSafetyEnvelope(item?.metadata ?? null);
  const truthMarkers = {
    inspection_surface: readTruthMarkerString(item?.metadata ?? null, "inspection_surface"),
    fallback_category: readTruthMarkerString(item?.metadata ?? null, "fallback_category"),
    project_manifest_source_of_truth: readTruthMarkerString(
      item?.metadata ?? null,
      "project_manifest_source_of_truth",
    ),
  };
  const selectedArtifactListItem = selectedArtifactId
    ? relatedArtifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null
    : null;
  const artifactPriority = selectedArtifactListItem
    ? describeArtifactPriority(selectedArtifactListItem, relatedArtifacts, selectedArtifactId)
    : null;
  const artifactAction = selectedArtifactListItem
    ? recommendArtifactAction(selectedArtifactListItem, selectedArtifactId)
    : null;
  const artifactAttention = selectedArtifactListItem
    ? describeArtifactAttention(selectedArtifactListItem, selectedArtifactId)
    : null;
  const laneStateEntries: OperatorLaneStateEntry[] = buildOperatorLaneStateEntries({
    laneHandoffLabel,
    laneHandoffDetail,
    laneExportLabel,
    laneExportDetail,
    laneOperatorNoteLabel,
    laneOperatorNoteDetail,
    activeLanePresetLabel,
    activeLanePresetDetail,
    lanePresetRestoredLabel,
    lanePresetRestoredDetail,
    lanePresetDriftLabel,
    lanePresetDriftDetail,
  });
  const laneActionEntries: LaneActionEntry[] = buildLaneActionEntries({
    recordKindLabel: "artifact",
    isPinnedRecord: Boolean(item && pinnedRecordId === item.id),
    pinnedRecordStatusDetail,
    laneQueueLabel,
    laneQueueDetail,
    laneCompletionDetail,
    laneRolloverLabel,
    laneRolloverDetail,
    laneMemoryLabel,
    laneMemoryDetail,
    onPinRecord,
    onUnpinRecord,
    onRefocusPinnedRecord,
    onRefresh,
    refreshing,
    onOpenNextLaneRecord,
    onOpenLaneRolloverRecord,
    onReturnToLane,
  });
  const executionHopReason = getExecutionHopReason(
    relatedExecutionStatus,
    relatedExecutionMode,
    relatedExecutionWarningCount,
  );
  const runHopReason = getRunHopReason(relatedRunStatus, relatedRunSummary);

  useEffect(() => {
    if (!highlightedSection) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setHighlightedSection(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedSection]);

  const handleJump = () => {
    if (relatedRecordsRef.current) {
      setHighlightedSection("related-records");
      relatedRecordsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setHighlightedSection("evidence");
    evidenceSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const jumpLabel = siblingArtifacts.length > 0 ? "Jump to related records" : "Jump to evidence";

  return (
    <SummarySection
      title="Artifact Detail"
      description="This view shows one persisted artifact record with provenance and evidence detail when available."
      guideTooltip={artifactDetailGuide.tooltip}
      guideChecklist={artifactDetailGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage="Select an artifact to inspect its detail."
      hasItems={Boolean(item)}
      actionHint="Local refresh updates the selected persisted artifact detail without reloading unrelated sections."
      actions={onRefresh && item ? (
        <button
          type="button"
          onClick={onRefresh}
          title={artifactDetailRefreshControlGuide.tooltip}
          disabled={refreshing}
          style={summaryActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh artifact detail"}
        </button>
      ) : null}
    >
      <div style={summaryTopStackStyle}>
        <RecordLineageStrip
          runId={item?.run_id ?? null}
          runStatus={relatedRunStatus}
          runSummary={relatedRunSummary}
          executionId={item?.execution_id ?? null}
          executionStatus={relatedExecutionStatus}
          executionSummary={relatedExecutionSummary}
          executionMode={relatedExecutionMode}
          executionStartedAt={relatedExecutionStartedAt}
          executionWarningCount={relatedExecutionWarningCount}
          artifactId={item?.id ?? null}
          artifactLabel={item?.label ?? null}
          artifactKind={item?.kind ?? null}
          artifactSimulated={item?.simulated ?? null}
          artifactCreatedAt={item?.created_at ?? null}
          selectedRunId={selectedRunId}
          selectedExecutionId={selectedExecutionId}
          selectedArtifactId={selectedArtifactId}
          onOpenRun={onOpenRun}
          onOpenExecution={onOpenExecution}
          onOpenArtifact={onOpenArtifact}
          runActionTitle={artifactDetailLineageOpenControlGuide.tooltip}
          executionActionTitle={artifactDetailLineageOpenControlGuide.tooltip}
          artifactActionTitle={artifactDetailLineageOpenControlGuide.tooltip}
        />
        {refreshHint ? (
          <div style={summaryCalloutStyle}>{refreshHint}</div>
        ) : null}
        {lastRefreshedAt ? (
          <div style={summaryTimestampNoteStyle}>
            Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
          </div>
        ) : null}
        <OperatorLaneStateBlock entries={laneStateEntries} />
        <TriageSummaryStrip
          heading="Operator Triage Summary"
          subjectLabel={item ? `Artifact ${item.id} within execution ${item.execution_id}` : null}
          priorityLabel={artifactPriority?.label ?? null}
          priorityDescription={artifactPriority?.description ?? null}
          actionLabel={artifactAction?.label ?? null}
          actionDescription={artifactAction?.description ?? null}
          attentionLabel={artifactAttention?.label ?? null}
          attentionDescription={artifactAttention?.description ?? null}
          jumpLabel={projectInspectDetails || siblingArtifacts.length > 0 ? jumpLabel : null}
          jumpTitle={projectInspectDetails || siblingArtifacts.length > 0
            ? artifactDetailJumpControlGuide.tooltip
            : null}
          onJump={projectInspectDetails || siblingArtifacts.length > 0 ? handleJump : null}
        />
        {priorityShortcutLabel && priorityShortcutDescription && onOpenPriorityRecord ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Triage Shortcut</h4>
            <div style={summaryCalloutStyle}>{priorityShortcutDescription}</div>
            <button
              type="button"
              style={summaryActionButtonStyle}
              onClick={onOpenPriorityRecord}
              title={getArtifactDetailShortcutTitle(priorityShortcutLabel)}
            >
              {priorityShortcutLabel}
            </button>
          </article>
        ) : null}
        {warningShortcutLabel && warningShortcutDescription && onOpenWarningRecord ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Risk Shortcut</h4>
            <div style={summaryCalloutStyle}>{warningShortcutDescription}</div>
            <button
              type="button"
              style={summaryActionButtonStyle}
              onClick={onOpenWarningRecord}
              title={getArtifactDetailShortcutTitle(warningShortcutLabel)}
            >
              {warningShortcutLabel}
            </button>
          </article>
        ) : null}
        <LaneActionsCard entries={laneActionEntries} />
        {item && pinnedRecordId === item.id && laneMetricsLabel && laneMetricsDetail ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Lane Metrics</h4>
            <div style={summaryCalloutStyle}>{laneMetricsDetail}</div>
            {laneDriverLabel ? (
              <div style={summaryCalloutStyle}>
                <strong>{laneDriverLabel}:</strong> {laneDriverDetail ?? "Signal driver is available from persisted lane heuristics."}
              </div>
            ) : null}
          </article>
        ) : null}
        {laneHistoryEntries.length > 0 && onOpenLaneHistoryEntry ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Recent Lane Returns</h4>
            <div style={{ display: "grid", gap: 8 }}>
              {laneHistoryEntries.map((entry) => (
                <button
                  key={`${entry.kind}-${entry.id}`}
                  type="button"
                  style={summaryActionButtonStyle}
                  onClick={() => onOpenLaneHistoryEntry(entry)}
                  title={getArtifactDetailLaneHistoryTitle(entry)}
                >
                  Recent: {entry.label}
                </button>
              ))}
            </div>
          </article>
        ) : null}
        {item && (onOpenExecution || onOpenRun) ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Next Hop Guidance</h4>
            {onOpenExecution ? (
              <div>
                <strong>Open related execution:</strong>{" "}
                <span style={summaryCalloutStyle}>{executionHopReason}</span>
              </div>
            ) : null}
            {onOpenRun ? (
              <div>
                <strong>Open related run:</strong>{" "}
                <span style={summaryCalloutStyle}>{runHopReason}</span>
              </div>
            ) : null}
            <div style={summaryActionRowStyle}>
              {item.execution_id && onOpenExecution ? (
                <button
                  type="button"
                  title={artifactDetailNextHopControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  disabled={selectedExecutionId === item.execution_id}
                  onClick={() => onOpenExecution(item.execution_id)}
                >
                  {selectedExecutionId === item.execution_id
                    ? "Current execution"
                    : "Open related execution"}
                </button>
              ) : null}
              {item.run_id && onOpenRun ? (
                <button
                  type="button"
                  title={artifactDetailNextHopControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  disabled={selectedRunId === item.run_id}
                  onClick={() => onOpenRun(item.run_id)}
                >
                  {selectedRunId === item.run_id ? "Current run" : "Open related run"}
                </button>
              ) : null}
            </div>
          </article>
        ) : null}
      </div>
      <div style={summaryCardGridStyle}>
        {breadcrumbs.length > 0 ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Navigated From</h4>
            <SummaryFacts>
              {breadcrumbs.map((breadcrumb) => (
                <SummaryFact
                  key={`${breadcrumb.kind}-${breadcrumb.id}`}
                  label={breadcrumb.kind}
                  copyValue={breadcrumb.id}
                >
                  {breadcrumb.label}
                </SummaryFact>
              ))}
            </SummaryFacts>
            <div style={summaryActionRowStyle}>
              {breadcrumbs.map((breadcrumb) => {
                const isCurrent = (breadcrumb.kind === "run" && selectedRunId === breadcrumb.id)
                  || (breadcrumb.kind === "execution" && selectedExecutionId === breadcrumb.id)
                  || (breadcrumb.kind === "artifact" && selectedArtifactId === breadcrumb.id);
                const onClick = breadcrumb.kind === "run"
                  ? onOpenRun
                    ? () => onOpenRun(breadcrumb.id)
                    : null
                  : breadcrumb.kind === "execution"
                    ? onOpenExecution
                      ? () => onOpenExecution(breadcrumb.id)
                      : null
                    : onOpenArtifact
                      ? () => onOpenArtifact(breadcrumb.id)
                      : null;
                if (!onClick) {
                  return null;
                }
                return (
                  <button
                    key={`navigate-${breadcrumb.kind}-${breadcrumb.id}`}
                    type="button"
                    title={artifactDetailRecordNavigationControlGuide.tooltip}
                    style={summaryActionButtonStyle}
                    disabled={isCurrent}
                    onClick={onClick}
                  >
                    {isCurrent ? `Current ${breadcrumb.kind}` : `Open ${breadcrumb.kind}`}
                  </button>
                );
              })}
            </div>
          </article>
        ) : null}
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Artifact</h4>
          <SummaryFacts>
            <SummaryFact label="Artifact ID" copyValue={item?.id ?? undefined}>{item?.id}</SummaryFact>
            <SummaryFact label="Label">{item?.label}</SummaryFact>
            <SummaryFact label="Kind">{item?.kind}</SummaryFact>
            <SummaryFact label="Run ID" copyValue={item?.run_id ?? undefined}>{item?.run_id}</SummaryFact>
            <SummaryFact label="Execution ID" copyValue={item?.execution_id ?? undefined}>{item?.execution_id}</SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Location</h4>
          <SummaryFacts>
            <SummaryFact label="URI" copyValue={item?.uri ?? undefined}>{item?.uri}</SummaryFact>
            <SummaryFact label="Path" copyValue={item?.path ?? undefined}>{item?.path ?? "not recorded"}</SummaryFact>
            <SummaryFact label="Content type">{item?.content_type ?? "not recorded"}</SummaryFact>
            <SummaryFact label="Created">
              {item ? formatSummaryTimestamp(item.created_at) : ""}
            </SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Artifact Truth Markers</h4>
          <SummaryFacts>
            <SummaryFact label="Inspection surface">
              {getInspectionSurfaceLabel(truthMarkers)}
            </SummaryFact>
            <SummaryFact label="Fallback category">
              {getFallbackCategoryLabel(truthMarkers)}
            </SummaryFact>
            <SummaryFact label="Manifest source of truth">
              {getManifestSourceOfTruthLabel(truthMarkers)}
            </SummaryFact>
          </SummaryFacts>
        </article>
        <PromptSafetySummaryCard safetyEnvelope={promptSafetyEnvelope} />
        {item ? (
          <article
            ref={relatedRecordsRef}
            style={{
              ...summaryCardStyle,
              ...(highlightedSection === "related-records" ? summaryHighlightedCardStyle : {}),
            }}
          >
            <h4 style={summaryCardHeadingStyle}>Related Records</h4>
            <SummaryFacts>
              <SummaryFact label="Run ID" copyValue={item.run_id}>{item.run_id}</SummaryFact>
              <SummaryFact label="Execution ID" copyValue={item.execution_id}>
                {item.execution_id}
              </SummaryFact>
              <SummaryFact label="Run status">{relatedRunStatus ?? "not recorded"}</SummaryFact>
              <SummaryFact label="Execution status">{relatedExecutionStatus ?? "not recorded"}</SummaryFact>
              <SummaryFact label="Execution mode">{relatedExecutionMode ?? "not recorded"}</SummaryFact>
              <SummaryFact label="Sibling artifacts">{siblingArtifacts.length}</SummaryFact>
            </SummaryFacts>
            {onOpenArtifact && siblingArtifacts.length > 0 ? (
              <div style={{ ...summaryCardGridStyle, marginTop: 8 }}>
                {siblingArtifacts.map((artifact) => (
                  <article key={artifact.id} style={summaryCardStyle}>
                    <h5 style={summaryCardHeadingStyle}>{artifact.label}</h5>
                    <div style={summaryCalloutStyle}>{artifact.kind}</div>
                    <SummaryFacts>
                      <SummaryFact label="Artifact ID" copyValue={artifact.id}>
                        {artifact.id}
                      </SummaryFact>
                      <SummaryFact label="Created">
                        {formatSummaryTimestamp(artifact.created_at)}
                      </SummaryFact>
                      <SummaryFact label="Execution mode">
                        {artifact.execution_mode ?? "not recorded"}
                      </SummaryFact>
                      <SummaryFact label="Fallback category">
                        {artifact.fallback_category ?? "none recorded"}
                      </SummaryFact>
                      <SummaryFact label="Manifest source of truth">
                        {artifact.project_manifest_source_of_truth ?? "none recorded"}
                      </SummaryFact>
                      <SummaryFact label="Simulated">
                        {artifact.simulated ? "yes" : "no"}
                      </SummaryFact>
                    </SummaryFacts>
                    <button
                      type="button"
                      title={artifactDetailRecordNavigationControlGuide.tooltip}
                      style={summaryActionButtonStyle}
                      onClick={() => onOpenArtifact(artifact.id)}
                    >
                      Open sibling artifact
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
      {projectInspectDetails ? (
        <div
          ref={evidenceSummaryRef}
          style={highlightedSection === "evidence" ? summaryHighlightedCardStyle : undefined}
        >
          <ProjectInspectEvidenceSummary
            details={projectInspectDetails}
            title="Artifact Evidence Summary"
          />
        </div>
      ) : null}
    </SummarySection>
  );
}
