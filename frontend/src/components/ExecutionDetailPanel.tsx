import { useEffect, useRef, useState } from "react";
import type {
  ArtifactListItem,
  ExecutionRecord,
  ProjectInspectEvidenceDetails,
} from "../types/contracts";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import {
  compareArtifactPriority,
  describeArtifactAttention,
  describeArtifactPriority,
  getPreferredArtifact,
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
import EditorRestoreBoundarySummary from "./EditorRestoreBoundarySummary";
import PromptSafetySummaryCard from "./PromptSafetySummaryCard";
import ProjectInspectEvidenceSummary from "./ProjectInspectEvidenceSummary";
import RecordLineageStrip from "./RecordLineageStrip";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import TriageSummaryStrip from "./TriageSummaryStrip";
import { buildLaneActionEntries, buildOperatorLaneStateEntries } from "./laneViewModel";
import {
  getAuditStatusTone,
  getExecutionModeTone,
} from "./statusChipTones";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryCalloutStyle,
  summaryHighlightedCardStyle,
  summaryTimestampNoteStyle,
  summaryTopStackStyle,
} from "./summaryPrimitives";

const executionDetailGuide = getPanelGuide("execution-detail");
const executionDetailRefreshControlGuide = getPanelControlGuide("execution-detail", "refresh");
const executionDetailLineageOpenControlGuide = getPanelControlGuide("execution-detail", "lineage-open");
const executionDetailJumpControlGuide = getPanelControlGuide("execution-detail", "jump");
const executionDetailRecordNavigationControlGuide = getPanelControlGuide("execution-detail", "record-navigation");

function getExecutionDetailShortcutTitle(label: string): string {
  return `${executionDetailRecordNavigationControlGuide.tooltip} Use the ${label} shortcut to reopen the related record from the current execution-detail workflow.`;
}

function getExecutionDetailLaneHistoryTitle(
  entry: { kind: "run" | "execution" | "artifact"; id: string; label: string; detail: string },
): string {
  const detailSuffix = entry.detail ? ` ${entry.detail}` : "";
  return `${executionDetailRecordNavigationControlGuide.tooltip} Return to recent ${entry.kind} ${entry.label} from the current execution-detail lane history.${detailSuffix}`;
}

type AssetForgeOriginContext = {
  label: string;
  detail: string;
  runId: string | null;
  executionId: string | null;
  artifactId: string | null;
};

type ExecutionDetailPanelProps = {
  item: ExecutionRecord | null;
  loading: boolean;
  error: string | null;
  breadcrumbs?: Array<{ kind: "run" | "execution" | "artifact"; id: string; label: string }>;
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
  relatedArtifacts?: ArtifactListItem[];
  originatingArtifactLabel?: string | null;
  originatingArtifactKind?: string | null;
  onOpenRun?: (runId: string) => void;
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
  onOpenAssetForgeWorkspace?: (() => void) | null;
  assetForgeOriginContext?: AssetForgeOriginContext | null;
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

export default function ExecutionDetailPanel({
  item,
  loading,
  error,
  breadcrumbs = [],
  selectedRunId,
  selectedExecutionId,
  selectedArtifactId,
  pinnedRecordId,
  pinnedRecordStatusDetail,
  laneQueueLabel,
  laneQueueDetail,
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
  relatedArtifacts = [],
  originatingArtifactLabel,
  originatingArtifactKind,
  onOpenRun,
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
  onOpenAssetForgeWorkspace,
  assetForgeOriginContext,
  refreshHint,
  lastRefreshedAt,
  onRefresh,
  refreshing = false,
}: ExecutionDetailPanelProps) {
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const projectInspectDetails = item?.tool === "project.inspect"
    ? readProjectInspectDetails(item.details)
    : null;
  const promptSafetyEnvelope = readPromptSafetyEnvelope(item?.details ?? null);
  const truthMarkers = {
    inspection_surface: readTruthMarkerString(item?.details ?? null, "inspection_surface"),
    fallback_category: readTruthMarkerString(item?.details ?? null, "fallback_category"),
    project_manifest_source_of_truth: readTruthMarkerString(
      item?.details ?? null,
      "project_manifest_source_of_truth",
    ),
  };
  const relatedRecordsRef = useRef<HTMLElement | null>(null);
  const evidenceSummaryRef = useRef<HTMLDivElement | null>(null);
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
    recordKindLabel: "execution",
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
  useEffect(() => {
    if (!highlightedSection) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setHighlightedSection(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedSection]);
  const prioritizedArtifacts = [...relatedArtifacts].sort((left, right) => {
    if (selectedArtifactId) {
      if (left.id === selectedArtifactId && right.id !== selectedArtifactId) {
        return -1;
      }
      if (right.id === selectedArtifactId && left.id !== selectedArtifactId) {
        return 1;
      }
    }
    return compareArtifactPriority(left, right);
  });
  const preferredArtifact = getPreferredArtifact(relatedArtifacts);
  const lineageArtifact = selectedArtifactId
    ? relatedArtifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null
    : preferredArtifact;
  const lineageArtifactId = lineageArtifact?.id ?? item?.artifact_ids[0] ?? null;
  const lineageArtifactPriority = lineageArtifact
    ? describeArtifactPriority(lineageArtifact, relatedArtifacts, selectedArtifactId)
    : null;
  const lineageArtifactAction = lineageArtifact
    ? recommendArtifactAction(lineageArtifact, selectedArtifactId)
    : null;
  const lineageArtifactAttention = lineageArtifact
    ? describeArtifactAttention(lineageArtifact, selectedArtifactId)
    : null;
  const handleJump = () => {
    if (relatedArtifacts.length > 0 && relatedRecordsRef.current) {
      setHighlightedSection("related-records");
      relatedRecordsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setHighlightedSection("evidence");
    evidenceSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const jumpLabel = relatedArtifacts.length > 0 ? "Jump to related records" : "Jump to evidence";
  const openedFromAssetForgePacket = Boolean(assetForgeOriginContext) || (refreshHint ?? "").startsWith(
    "Auto-opened from Asset Forge packet origin:",
  );
  const canReturnToAssetForge = openedFromAssetForgePacket && Boolean(onOpenAssetForgeWorkspace);

  return (
    <SummarySection
      title="Execution Detail"
      description="This view shows one persisted execution record with provenance and evidence detail when available."
      guideTooltip={executionDetailGuide.tooltip}
      guideChecklist={executionDetailGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage="Select an execution to inspect its detail."
      hasItems={Boolean(item)}
      actionHint="Local refresh updates the selected execution detail and any currently related artifact records."
      actions={onRefresh && item ? (
        <button
          type="button"
          onClick={onRefresh}
          title={executionDetailRefreshControlGuide.tooltip}
          disabled={refreshing}
          style={summaryActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh execution detail"}
        </button>
      ) : null}
    >
      <div style={summaryTopStackStyle}>
        <RecordLineageStrip
          runId={item?.run_id ?? null}
          executionId={item?.id ?? null}
          executionStatus={item?.status ?? null}
          executionSummary={item?.result_summary ?? null}
          artifactId={lineageArtifactId}
          artifactLabel={lineageArtifact?.label ?? null}
          artifactKind={lineageArtifact?.kind ?? null}
          artifactMode={lineageArtifact?.execution_mode ?? null}
          artifactSimulated={lineageArtifact?.simulated ?? null}
          executionMode={item?.execution_mode ?? null}
          executionStartedAt={item?.started_at ?? null}
          executionWarningCount={item?.warnings.length ?? null}
          artifactCreatedAt={lineageArtifact?.created_at ?? null}
          artifactAuditStatus={lineageArtifact?.mutation_audit_status ?? null}
          selectedRunId={selectedRunId}
          selectedExecutionId={selectedExecutionId}
          selectedArtifactId={selectedArtifactId}
          onOpenRun={onOpenRun}
          onOpenArtifact={onOpenArtifact}
          runActionTitle={executionDetailLineageOpenControlGuide.tooltip}
          artifactActionTitle={executionDetailLineageOpenControlGuide.tooltip}
        />
        {refreshHint ? (
          <div style={summaryCalloutStyle}>{refreshHint}</div>
        ) : null}
        {assetForgeOriginContext ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Asset Forge Origin Context</h4>
            <div style={summaryCalloutStyle}>
              Packet origin: {assetForgeOriginContext.label}. {assetForgeOriginContext.detail}
            </div>
            <SummaryFacts>
              <SummaryFact label="Origin run" copyValue={assetForgeOriginContext.runId ?? undefined}>
                {assetForgeOriginContext.runId ?? "not recorded"}
              </SummaryFact>
              <SummaryFact label="Origin execution" copyValue={assetForgeOriginContext.executionId ?? undefined}>
                {assetForgeOriginContext.executionId ?? "not recorded"}
              </SummaryFact>
              <SummaryFact label="Origin artifact" copyValue={assetForgeOriginContext.artifactId ?? undefined}>
                {assetForgeOriginContext.artifactId ?? "not recorded"}
              </SummaryFact>
            </SummaryFacts>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {assetForgeOriginContext.runId && onOpenRun ? (
                <button
                  type="button"
                  style={summaryActionButtonStyle}
                  onClick={() => onOpenRun(assetForgeOriginContext.runId!)}
                  disabled={selectedRunId === assetForgeOriginContext.runId}
                  title={executionDetailRecordNavigationControlGuide.tooltip}
                >
                  {selectedRunId === assetForgeOriginContext.runId
                    ? "Origin run selected"
                    : "Open origin run"}
                </button>
              ) : null}
              {assetForgeOriginContext.artifactId && onOpenArtifact ? (
                <button
                  type="button"
                  style={summaryActionButtonStyle}
                  onClick={() => onOpenArtifact(assetForgeOriginContext.artifactId!)}
                  disabled={selectedArtifactId === assetForgeOriginContext.artifactId}
                  title={executionDetailRecordNavigationControlGuide.tooltip}
                >
                  {selectedArtifactId === assetForgeOriginContext.artifactId
                    ? "Origin artifact selected"
                    : "Open origin artifact"}
                </button>
              ) : null}
              {canReturnToAssetForge ? (
                <button
                  type="button"
                  style={summaryActionButtonStyle}
                  title="Return to the Asset Forge workspace to continue review continuity."
                  onClick={() => onOpenAssetForgeWorkspace?.()}
                >
                  Return to Asset Forge workspace
                </button>
              ) : null}
            </div>
          </article>
        ) : canReturnToAssetForge ? (
          <button
            type="button"
            style={summaryActionButtonStyle}
            title="Return to the Asset Forge workspace to continue review continuity."
            onClick={() => onOpenAssetForgeWorkspace?.()}
          >
            Return to Asset Forge workspace
          </button>
        ) : null}
        {lastRefreshedAt ? (
          <div style={summaryTimestampNoteStyle}>
            Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
          </div>
        ) : null}
        <OperatorLaneStateBlock entries={laneStateEntries} />
        <TriageSummaryStrip
          heading="Operator Triage Summary"
          subjectLabel={lineageArtifactId ? `Prioritized artifact ${lineageArtifactId}` : null}
          priorityLabel={lineageArtifactPriority?.label ?? null}
          priorityDescription={lineageArtifactPriority?.description ?? null}
          actionLabel={lineageArtifactAction?.label ?? null}
          actionDescription={lineageArtifactAction?.description ?? null}
          attentionLabel={lineageArtifactAttention?.label ?? null}
          attentionDescription={lineageArtifactAttention?.description ?? null}
          jumpLabel={projectInspectDetails || relatedArtifacts.length > 0 ? jumpLabel : null}
          jumpTitle={projectInspectDetails || relatedArtifacts.length > 0
            ? executionDetailJumpControlGuide.tooltip
            : null}
          onJump={projectInspectDetails || relatedArtifacts.length > 0 ? handleJump : null}
        />
        {priorityShortcutLabel && priorityShortcutDescription && onOpenPriorityRecord ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Triage Shortcut</h4>
            <div style={summaryCalloutStyle}>{priorityShortcutDescription}</div>
            <button
              type="button"
              style={summaryActionButtonStyle}
              onClick={onOpenPriorityRecord}
              title={getExecutionDetailShortcutTitle(priorityShortcutLabel)}
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
              title={getExecutionDetailShortcutTitle(warningShortcutLabel)}
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
                  title={getExecutionDetailLaneHistoryTitle(entry)}
                >
                  Recent: {entry.label}
                </button>
              ))}
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {breadcrumbs.map((breadcrumb) => {
                const isCurrent = (breadcrumb.kind === "run" && selectedRunId === breadcrumb.id)
                  || (breadcrumb.kind === "execution" && selectedExecutionId === breadcrumb.id)
                  || (breadcrumb.kind === "artifact" && selectedArtifactId === breadcrumb.id);
                const onClick = breadcrumb.kind === "run"
                  ? onOpenRun
                    ? () => onOpenRun(breadcrumb.id)
                    : null
                  : breadcrumb.kind === "artifact"
                    ? onOpenArtifact
                      ? () => onOpenArtifact(breadcrumb.id)
                      : null
                    : null;
                if (!onClick) {
                  return null;
                }
                return (
                  <button
                    key={`navigate-${breadcrumb.kind}-${breadcrumb.id}`}
                    type="button"
                    title={executionDetailRecordNavigationControlGuide.tooltip}
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
        {lineageArtifactId ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Artifact Context</h4>
            <SummaryFacts>
              <SummaryFact label="Originating artifact" copyValue={lineageArtifactId}>
                {lineageArtifactId}
              </SummaryFact>
              <SummaryFact label="Label">
                {originatingArtifactLabel ?? lineageArtifact?.label ?? "not recorded"}
              </SummaryFact>
              <SummaryFact label="Kind">
                {originatingArtifactKind ?? lineageArtifact?.kind ?? "not recorded"}
              </SummaryFact>
            </SummaryFacts>
            {onOpenArtifact ? (
              <button
                type="button"
                title={executionDetailRecordNavigationControlGuide.tooltip}
                style={summaryActionButtonStyle}
                disabled={selectedArtifactId === lineageArtifactId}
                onClick={() => onOpenArtifact(lineageArtifactId)}
              >
                {selectedArtifactId === lineageArtifactId
                  ? "Origin artifact selected"
                  : "Return to origin artifact"}
              </button>
            ) : null}
          </article>
        ) : null}
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Execution Identity</h4>
          <SummaryFacts>
            <SummaryFact label="Execution ID" copyValue={item?.id ?? undefined}>{item?.id}</SummaryFact>
            <SummaryFact label="Run ID" copyValue={item?.run_id ?? undefined}>{item?.run_id}</SummaryFact>
            <SummaryFact label="Tool">{item?.tool}</SummaryFact>
            <SummaryFact label="Agent">{item?.agent}</SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Execution Totals</h4>
          <SummaryFacts>
            <SummaryFact label="Finished">
              {item?.finished_at ? formatSummaryTimestamp(item.finished_at) : "not finished"}
            </SummaryFact>
            <SummaryFact label="Artifacts">{item?.artifact_ids.length ?? 0}</SummaryFact>
            <SummaryFact label="Warnings">{item?.warnings.length ?? 0}</SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Execution Truth Markers</h4>
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
        <EditorRestoreBoundarySummary details={item?.details ?? null} />
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
              <SummaryFact label="Artifact IDs">
                {item.artifact_ids.length > 0 ? item.artifact_ids.join(", ") : "none"}
              </SummaryFact>
              <SummaryFact label="Artifact records">
                {relatedArtifacts.length}
              </SummaryFact>
            </SummaryFacts>
            {onOpenArtifact && item.artifact_ids.length > 0 ? (
              <div style={{ ...summaryCardGridStyle, marginTop: 8 }}>
                {prioritizedArtifacts.map((artifact) => {
                  const artifactId = artifact.id;
                  const artifactLabel = artifact?.label ?? "artifact";
                  const artifactKind = artifact?.kind ?? "unknown kind";
                  return (
                    <article key={artifactId} style={summaryCardStyle}>
                      <h5 style={summaryCardHeadingStyle}>{artifactLabel}</h5>
                      <div style={summaryCalloutStyle}>{artifactKind}</div>
                      <SummaryFacts>
                        <SummaryFact label="Artifact ID" copyValue={artifactId}>
                          {artifactId}
                        </SummaryFact>
                        <SummaryFact label="Created">
                          {artifact?.created_at
                            ? formatSummaryTimestamp(artifact.created_at)
                            : "not recorded"}
                        </SummaryFact>
                        <SummaryFact label="Execution mode">
                          <StatusChip
                            label={artifact?.execution_mode ?? "unknown"}
                            tone={getExecutionModeTone(artifact?.execution_mode ?? "unknown")}
                          />
                        </SummaryFact>
                        <SummaryFact label="Fallback category">
                          {artifact.fallback_category ?? "none recorded"}
                        </SummaryFact>
                        <SummaryFact label="Manifest source of truth">
                          {artifact.project_manifest_source_of_truth ?? "none recorded"}
                        </SummaryFact>
                        <SummaryFact label="Simulated">
                          <StatusChip
                            label={String(artifact?.simulated ?? false)}
                            tone={artifact?.simulated ? "warning" : "success"}
                          />
                        </SummaryFact>
                        {artifact?.mutation_audit_status ? (
                          <SummaryFact label="Mutation audit">
                            <StatusChip
                              label={artifact.mutation_audit_status}
                              tone={getAuditStatusTone(artifact.mutation_audit_status)}
                            />
                          </SummaryFact>
                        ) : null}
                      </SummaryFacts>
                      <button
                        type="button"
                        title={executionDetailRecordNavigationControlGuide.tooltip}
                        style={summaryActionButtonStyle}
                        onClick={() => onOpenArtifact(artifactId)}
                      >
                        {selectedArtifactId === artifactId
                          ? "Artifact detail selected"
                          : "Open artifact detail"}
                      </button>
                    </article>
                  );
                })}
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
            title="Execution Evidence Summary"
          />
        </div>
      ) : null}
    </SummarySection>
  );
}
