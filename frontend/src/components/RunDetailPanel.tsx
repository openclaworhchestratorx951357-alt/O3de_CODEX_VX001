import { useEffect, useRef, useState } from "react";
import type {
  ProjectInspectEvidenceDetails,
  RunRecord,
  SettingsPatchMutationAudit,
} from "../types/contracts";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import {
  getFallbackCategoryLabel,
  getInspectionSurfaceLabel,
  getManifestSourceOfTruthLabel,
  getRunTruthBoundaryDescription,
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
  formatSummaryLabeledText,
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

const runDetailGuide = getPanelGuide("run-detail");
const runDetailRefreshControlGuide = getPanelControlGuide("run-detail", "refresh");
const runDetailLineageOpenControlGuide = getPanelControlGuide("run-detail", "lineage-open");
const runDetailJumpControlGuide = getPanelControlGuide("run-detail", "jump");
const runDetailRecordNavigationControlGuide = getPanelControlGuide("run-detail", "record-navigation");

function getRunDetailShortcutTitle(label: string): string {
  return `${runDetailRecordNavigationControlGuide.tooltip} Use the ${label} shortcut to reopen the related record from the current run-detail workflow.`;
}

function getRunDetailLaneHistoryTitle(
  entry: { kind: "run" | "execution" | "artifact"; id: string; label: string; detail: string },
): string {
  const detailSuffix = entry.detail ? ` ${entry.detail}` : "";
  return `${runDetailRecordNavigationControlGuide.tooltip} Return to recent ${entry.kind} ${entry.label} from the current run-detail lane history.${detailSuffix}`;
}

type RunDetailPanelProps = {
  item: RunRecord | null;
  loading: boolean;
  error: string | null;
  breadcrumbs?: Array<{ kind: "run" | "execution" | "artifact"; id: string; label: string }>;
  executionDetails?: Record<string, unknown> | null;
  relatedExecutionId?: string | null;
  relatedExecutionPriorityLabel?: string | null;
  relatedExecutionPriorityDescription?: string | null;
  relatedExecutionActionLabel?: string | null;
  relatedExecutionActionDescription?: string | null;
  relatedExecutionAttentionLabel?: string | null;
  relatedExecutionAttentionDescription?: string | null;
  priorityShortcutLabel?: string | null;
  priorityShortcutDescription?: string | null;
  warningShortcutLabel?: string | null;
  warningShortcutDescription?: string | null;
  originatingArtifactId?: string | null;
  originatingArtifactLabel?: string | null;
  originatingArtifactKind?: string | null;
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
  selectedRunId?: string | null;
  selectedExecutionId?: string | null;
  selectedArtifactId?: string | null;
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

function readMutationAudit(
  details: Record<string, unknown> | null | undefined,
): SettingsPatchMutationAudit | null {
  const value = details?.mutation_audit;
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as SettingsPatchMutationAudit)
    : null;
}

function readProjectInspectDetails(
  details: Record<string, unknown> | null | undefined,
): ProjectInspectEvidenceDetails | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  return details as ProjectInspectEvidenceDetails;
}

export default function RunDetailPanel({
  item,
  loading,
  error,
  breadcrumbs = [],
  executionDetails,
  relatedExecutionId,
  relatedExecutionPriorityLabel,
  relatedExecutionPriorityDescription,
  relatedExecutionActionLabel,
  relatedExecutionActionDescription,
  relatedExecutionAttentionLabel,
  relatedExecutionAttentionDescription,
  priorityShortcutLabel,
  priorityShortcutDescription,
  warningShortcutLabel,
  warningShortcutDescription,
  originatingArtifactId,
  originatingArtifactLabel,
  originatingArtifactKind,
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
  selectedRunId,
  selectedExecutionId,
  selectedArtifactId,
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
}: RunDetailPanelProps) {
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const mutationAudit = readMutationAudit(executionDetails);
  const projectInspectDetails = readProjectInspectDetails(executionDetails);
  const promptSafetyEnvelope = readPromptSafetyEnvelope(executionDetails);
  const truthMarkers = {
    inspection_surface: readTruthMarkerString(executionDetails, "inspection_surface"),
    fallback_category: readTruthMarkerString(executionDetails, "fallback_category"),
    project_manifest_source_of_truth: readTruthMarkerString(
      executionDetails,
      "project_manifest_source_of_truth",
    ),
  };
  const isProjectInspectDetail = item?.tool === "project.inspect" && projectInspectDetails;
  const truthBoundaryRef = useRef<HTMLElement | null>(null);
  const mutationAuditRef = useRef<HTMLElement | null>(null);
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
    recordKindLabel: "run",
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
  const handleJump = () => {
    if (isProjectInspectDetail && evidenceSummaryRef.current) {
      setHighlightedSection("evidence");
      evidenceSummaryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (item?.tool === "settings.patch" && mutationAudit && mutationAuditRef.current) {
      setHighlightedSection("mutation-audit");
      mutationAuditRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setHighlightedSection("truth-boundary");
    truthBoundaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const jumpLabel = isProjectInspectDetail
    ? "Jump to evidence"
    : item?.tool === "settings.patch" && mutationAudit
      ? "Jump to mutation audit"
      : "Jump to truth boundary";
  return (
    <SummarySection
      title="Run Detail"
      description="This view shows one persisted run record with explicit execution truth, including simulated runs."
      guideTooltip={runDetailGuide.tooltip}
      guideChecklist={runDetailGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage="Select a run to inspect its detail."
      hasItems={Boolean(item)}
      actionHint="Local refresh updates the selected persisted run detail and related execution evidence when available."
      actions={onRefresh && item ? (
        <button
          type="button"
          onClick={onRefresh}
          title={runDetailRefreshControlGuide.tooltip}
          disabled={refreshing}
          style={summaryActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh run detail"}
        </button>
      ) : null}
    >
      <div style={summaryTopStackStyle}>
        <RecordLineageStrip
          runId={item?.id ?? null}
          runStatus={item?.status ?? null}
          runSummary={item?.result_summary ?? null}
          executionId={relatedExecutionId}
          executionMode={item?.execution_mode ?? null}
          runUpdatedAt={item?.updated_at ?? null}
          runWarningCount={item?.warnings.length ?? null}
          selectedRunId={selectedRunId}
          selectedExecutionId={selectedExecutionId}
          onOpenExecution={onOpenExecution}
          executionActionTitle={runDetailLineageOpenControlGuide.tooltip}
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
          subjectLabel={relatedExecutionId ? `Related execution ${relatedExecutionId}` : null}
          priorityLabel={relatedExecutionPriorityLabel}
          priorityDescription={relatedExecutionPriorityDescription}
          actionLabel={relatedExecutionActionLabel}
          actionDescription={relatedExecutionActionDescription}
          attentionLabel={relatedExecutionAttentionLabel}
          attentionDescription={relatedExecutionAttentionDescription}
          jumpLabel={jumpLabel}
          jumpTitle={runDetailJumpControlGuide.tooltip}
          onJump={handleJump}
        />
        {priorityShortcutLabel && priorityShortcutDescription && onOpenPriorityRecord ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Triage Shortcut</h4>
            <div style={summaryCalloutStyle}>{priorityShortcutDescription}</div>
            <button
              type="button"
              style={summaryActionButtonStyle}
              onClick={onOpenPriorityRecord}
              title={getRunDetailShortcutTitle(priorityShortcutLabel)}
            >
              {priorityShortcutLabel}
            </button>
          </article>
        ) : null}
        {warningShortcutLabel && warningShortcutDescription && onOpenWarningRecord ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Warning Shortcut</h4>
            <div style={summaryCalloutStyle}>{warningShortcutDescription}</div>
            <button
              type="button"
              style={summaryActionButtonStyle}
              onClick={onOpenWarningRecord}
              title={getRunDetailShortcutTitle(warningShortcutLabel)}
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
                  title={getRunDetailLaneHistoryTitle(entry)}
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
                const onClick = breadcrumb.kind === "execution"
                  ? onOpenExecution
                    ? () => onOpenExecution(breadcrumb.id)
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
                    title={runDetailRecordNavigationControlGuide.tooltip}
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
        {originatingArtifactId ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Artifact Context</h4>
            <SummaryFacts>
              <SummaryFact label="Originating artifact" copyValue={originatingArtifactId}>
                {originatingArtifactId}
              </SummaryFact>
              <SummaryFact label="Label">
                {originatingArtifactLabel ?? "not recorded"}
              </SummaryFact>
              <SummaryFact label="Kind">
                {originatingArtifactKind ?? "not recorded"}
              </SummaryFact>
            </SummaryFacts>
            {onOpenArtifact ? (
              <button
                type="button"
                title={runDetailRecordNavigationControlGuide.tooltip}
                style={summaryActionButtonStyle}
                disabled={selectedArtifactId === originatingArtifactId}
                onClick={() => onOpenArtifact(originatingArtifactId)}
              >
                {selectedArtifactId === originatingArtifactId
                  ? "Origin artifact selected"
                  : "Return to origin artifact"}
              </button>
            ) : null}
          </article>
        ) : null}
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Run Identity</h4>
          <SummaryFacts>
            <SummaryFact label="Run ID" copyValue={item?.id ?? undefined}>{item?.id}</SummaryFact>
            <SummaryFact label="Request ID" copyValue={item?.request_id ?? undefined}>{item?.request_id}</SummaryFact>
            <SummaryFact label="Agent">{item?.agent}</SummaryFact>
            <SummaryFact label="Tool">{item?.tool}</SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Run Totals</h4>
          <SummaryFacts>
            <SummaryFact label="Dry run">{String(item?.dry_run)}</SummaryFact>
            <SummaryFact label="Created">
              {item ? formatSummaryTimestamp(item.created_at) : ""}
            </SummaryFact>
            {relatedExecutionId ? (
              <SummaryFact label="Related execution" copyValue={relatedExecutionId}>
                {relatedExecutionId}
              </SummaryFact>
            ) : null}
          </SummaryFacts>
        </article>
        <article
          ref={truthBoundaryRef}
          style={{
            ...summaryCardStyle,
            ...(highlightedSection === "truth-boundary" ? summaryHighlightedCardStyle : {}),
          }}
        >
          <h4 style={summaryCardHeadingStyle}>Truth Boundary</h4>
          <div style={summaryCalloutStyle}>
            {item ? formatSummaryLabeledText("Execution truth", getRunTruthBoundaryDescription(item)) : null}
          </div>
          {item?.result_summary ? (
            <div style={{ marginTop: 8 }}>
              <strong>Summary:</strong> {item.result_summary}
            </div>
          ) : null}
          <div style={{ marginTop: 8 }}>
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
          </div>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Locks And Warnings</h4>
          <SummaryFacts>
            <SummaryFact label="Requested locks">
              {item?.requested_locks.join(", ") || "none"}
            </SummaryFact>
            <SummaryFact label="Granted locks">
              {item?.granted_locks.join(", ") || "none"}
            </SummaryFact>
            <SummaryFact label="Warnings">
              {item?.warnings.join(", ") || "none"}
            </SummaryFact>
          </SummaryFacts>
        </article>
        <PromptSafetySummaryCard safetyEnvelope={promptSafetyEnvelope} />
        {item?.tool === "settings.patch" && mutationAudit ? (
          <article
            ref={mutationAuditRef}
            style={{
              ...summaryCardStyle,
              ...(highlightedSection === "mutation-audit" ? summaryHighlightedCardStyle : {}),
            }}
          >
            <h4 style={summaryCardHeadingStyle}>Mutation Audit</h4>
            <SummaryFacts>
              <SummaryFact label="Audit summary">{mutationAudit.summary ?? "available"}</SummaryFact>
              <SummaryFact label="Audit phase">{mutationAudit.phase ?? "unknown"}</SummaryFact>
              <SummaryFact label="Audit status">{mutationAudit.status ?? "unknown"}</SummaryFact>
              {typeof mutationAudit.backup_created === "boolean" ? (
                <SummaryFact label="Backup created">{String(mutationAudit.backup_created)}</SummaryFact>
              ) : null}
              {typeof mutationAudit.post_write_verification_succeeded === "boolean" ? (
                <SummaryFact label="Verification succeeded">
                  {String(mutationAudit.post_write_verification_succeeded)}
                </SummaryFact>
              ) : null}
              {mutationAudit.rollback_outcome ? (
                <SummaryFact label="Rollback outcome">{mutationAudit.rollback_outcome}</SummaryFact>
              ) : null}
            </SummaryFacts>
          </article>
        ) : null}
      </div>
      {isProjectInspectDetail ? (
        <div
          ref={evidenceSummaryRef}
          style={highlightedSection === "evidence" ? summaryHighlightedCardStyle : undefined}
        >
          <ProjectInspectEvidenceSummary details={projectInspectDetails} />
        </div>
      ) : null}
    </SummarySection>
  );
}
