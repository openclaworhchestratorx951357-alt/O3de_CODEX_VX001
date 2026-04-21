import type { CSSProperties } from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { ControlPlaneSummaryResponse } from "../types/contracts";
import {
  getDominantMode,
  getOverviewApprovalAttentionLabel,
  getOverviewArtifactAttentionLabel,
  getOverviewEventAttentionLabel,
  getOverviewExecutionAttentionLabel,
  getOverviewLockAttentionLabel,
  getOverviewRunAttentionLabel,
} from "../lib/operatorStatus";
import OperatorStatusRail from "./OperatorStatusRail";
import OperatorLaneStateBlock, { type OperatorLaneStateEntry } from "./OperatorLaneStateBlock";
import SummarySection from "./SummarySection";
import { buildOperatorLaneStateEntries } from "./laneViewModel";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  getApprovalStatusTone,
  getExecutionModeTone,
  getExecutionStatusTone,
  getRunStatusTone,
  getSeverityTone,
} from "./statusChipTones";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryBadgeStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryMutedTextStyle,
  summaryTimestampNoteStyle,
} from "./summaryPrimitives";

const operatorOverviewGuide = getPanelGuide("operator-overview");
const operatorOverviewRefreshControlGuide = getPanelControlGuide("operator-overview", "refresh");
const operatorOverviewStatusFiltersControlGuide = getPanelControlGuide("operator-overview", "status-filters");
const operatorOverviewLaneActionsControlGuide = getPanelControlGuide("operator-overview", "lane-actions");

type OperatorOverviewPanelProps = {
  summary: ControlPlaneSummaryResponse | null;
  loading: boolean;
  error: string | null;
  lastRefreshedAt?: string | null;
  pinnedRecordLabel?: string | null;
  pinnedRecordSummary?: string | null;
  pinnedRecordStatusLabel?: string | null;
  pinnedRecordStatusDetail?: string | null;
  nextPinnedLaneLabel?: string | null;
  nextPinnedLaneDetail?: string | null;
  laneCompletionLabel?: string | null;
  laneCompletionDetail?: string | null;
  laneRolloverLabel?: string | null;
  laneRolloverDetail?: string | null;
  laneMetricsLabel?: string | null;
  laneMetricsDetail?: string | null;
  laneDriverLabel?: string | null;
  laneDriverDetail?: string | null;
  laneFilterLabel?: string | null;
  laneReadinessLabel?: string | null;
  laneReadinessDetail?: string | null;
  laneHistoryStatusLabel?: string | null;
  laneHistoryStatusDetail?: string | null;
  laneRecoveryLabel?: string | null;
  laneHandoffLabel?: string | null;
  laneHandoffDetail?: string | null;
  laneExportLabel?: string | null;
  laneExportDetail?: string | null;
  laneOperatorNoteLabel?: string | null;
  laneOperatorNoteDetail?: string | null;
  laneOperatorNoteDraft?: string;
  activeLanePresetLabel?: string | null;
  activeLanePresetDetail?: string | null;
  lanePresetRestoredLabel?: string | null;
  lanePresetRestoredDetail?: string | null;
  lanePresetDriftLabel?: string | null;
  lanePresetDriftDetail?: string | null;
  lanePresetEntries?: Array<{
    id: "execution_warnings" | "artifact_audit_risk" | "simulated_review";
    label: string;
    detail: string;
    available: boolean;
    availabilityDetail: string;
  }>;
  onOpenPinnedRecord?: (() => void) | null;
  onRefocusPinnedRecord?: (() => void) | null;
  onClearPinnedRecord?: (() => void) | null;
  onClearLocalLaneContext?: (() => void) | null;
  onOpenNextPinnedLaneRecord?: (() => void) | null;
  onOpenLaneRolloverRecord?: (() => void) | null;
  onSetLaneFilterMode?: ((mode: "all" | "warnings" | "audit_risk" | "simulated_only") => void) | null;
  onApplyLaneRecovery?: (() => void) | null;
  onDropStaleLaneHistory?: (() => void) | null;
  onApplyLanePreset?: ((presetId: "execution_warnings" | "artifact_audit_risk" | "simulated_review") => void) | null;
  onCopyLaneContext?: (() => void) | null;
  onLaneOperatorNoteDraftChange?: ((value: string) => void) | null;
  onSaveLaneOperatorNote?: (() => void) | null;
  onClearLaneOperatorNote?: (() => void) | null;
  onRunStatusSelect: (status: string) => void;
  onRunInspectionSurfaceSelect?: (value: string) => void;
  onRunFallbackCategorySelect?: (value: string) => void;
  onRunManifestSourceSelect?: (value: string) => void;
  onPendingApprovalsSelect: () => void;
  onExecutionModeSelect: (mode: string) => void;
  onArtifactModeSelect: (mode: string) => void;
  onEventSeveritySelect: (severity: string) => void;
  onExecutorAvailabilitySelect?: (value: string) => void;
  onWorkspaceStateSelect?: (value: string) => void;
  onExecutionInspectionSurfaceSelect?: (value: string) => void;
  onExecutionFallbackCategorySelect?: (value: string) => void;
  onExecutionManifestSourceSelect?: (value: string) => void;
  onArtifactInspectionSurfaceSelect?: (value: string) => void;
  onArtifactFallbackCategorySelect?: (value: string) => void;
  onArtifactManifestSourceSelect?: (value: string) => void;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

export default function OperatorOverviewPanel({
  summary,
  loading,
  error,
  lastRefreshedAt,
  pinnedRecordLabel,
  pinnedRecordSummary,
  pinnedRecordStatusLabel,
  pinnedRecordStatusDetail,
  nextPinnedLaneLabel,
  nextPinnedLaneDetail,
  laneCompletionDetail,
  laneRolloverLabel,
  laneRolloverDetail,
  laneMetricsLabel,
  laneMetricsDetail,
  laneDriverLabel,
  laneDriverDetail,
  laneFilterLabel,
  laneReadinessLabel,
  laneReadinessDetail,
  laneHistoryStatusLabel,
  laneHistoryStatusDetail,
  laneRecoveryLabel,
  laneHandoffLabel,
  laneHandoffDetail,
  laneExportLabel,
  laneExportDetail,
  laneOperatorNoteLabel,
  laneOperatorNoteDetail,
  laneOperatorNoteDraft = "",
  activeLanePresetLabel,
  activeLanePresetDetail,
  lanePresetRestoredLabel,
  lanePresetRestoredDetail,
  lanePresetDriftLabel,
  lanePresetDriftDetail,
  lanePresetEntries = [],
  onOpenPinnedRecord,
  onRefocusPinnedRecord,
  onClearPinnedRecord,
  onClearLocalLaneContext,
  onOpenNextPinnedLaneRecord,
  onOpenLaneRolloverRecord,
  onSetLaneFilterMode,
  onApplyLaneRecovery,
  onDropStaleLaneHistory,
  onApplyLanePreset,
  onCopyLaneContext,
  onLaneOperatorNoteDraftChange,
  onSaveLaneOperatorNote,
  onClearLaneOperatorNote,
  onRunStatusSelect,
  onRunInspectionSurfaceSelect,
  onRunFallbackCategorySelect,
  onRunManifestSourceSelect,
  onPendingApprovalsSelect,
  onExecutionModeSelect,
  onArtifactModeSelect,
  onEventSeveritySelect,
  onExecutorAvailabilitySelect,
  onWorkspaceStateSelect,
  onExecutionInspectionSurfaceSelect,
  onExecutionFallbackCategorySelect,
  onExecutionManifestSourceSelect,
  onArtifactInspectionSurfaceSelect,
  onArtifactFallbackCategorySelect,
  onArtifactManifestSourceSelect,
  onRefresh,
  refreshing = false,
}: OperatorOverviewPanelProps) {
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

  return (
    <SummarySection
      title="Operator Overview"
      description="Compact persisted snapshot of run volume, approvals, execution modes, artifacts, event pressure, and lock occupancy. This is an operator aggregate only: simulated execution must remain explicitly labeled, and these counts do not expand the admitted real O3DE adapter boundary."
      guideTooltip={operatorOverviewGuide.tooltip}
      guideChecklist={operatorOverviewGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage="No persisted operator summary is available."
      hasItems={Boolean(summary)}
      marginTop={24}
      actionHint="Local refresh keeps overview surfaces current without reloading the full records lane."
      actions={onRefresh ? (
        <button
          type="button"
          title={operatorOverviewRefreshControlGuide.tooltip}
          onClick={onRefresh}
          disabled={refreshing}
          style={summaryActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh overview"}
        </button>
      ) : null}
    >
      {summary ? (
        <>
          {lastRefreshedAt ? (
            <div style={summaryTimestampNoteStyle}>
              Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
            </div>
          ) : null}
          <div style={badgeRowStyle}>
            <span style={summaryBadgeStyle}>prompt sessions: {summary.prompt_sessions_total}</span>
            <span style={summaryBadgeStyle}>runs: {summary.runs_total}</span>
            <span style={summaryBadgeStyle}>approvals: {summary.approvals_total}</span>
            <span style={summaryBadgeStyle}>executions: {summary.executions_total}</span>
            <span style={summaryBadgeStyle}>artifacts: {summary.artifacts_total}</span>
            <span style={summaryBadgeStyle}>events: {summary.events_total}</span>
            <span style={summaryBadgeStyle}>locks: {summary.locks_total}</span>
            <span style={summaryBadgeStyle}>executors: {summary.executors_total}</span>
            <span style={summaryBadgeStyle}>workspaces: {summary.workspaces_total}</span>
            {pinnedRecordLabel ? (
              <span style={summaryBadgeStyle}>pinned: {pinnedRecordLabel}</span>
            ) : null}
            {pinnedRecordStatusLabel ? (
              <span style={summaryBadgeStyle}>{pinnedRecordStatusLabel}</span>
            ) : null}
          </div>
          {pinnedRecordLabel ? (
            <article style={{ ...summaryCardStyle, marginBottom: 12 }}>
              <h3 style={summaryCardHeadingStyle}>Pinned Decision Lane</h3>
              <p style={summaryMutedTextStyle}>
                {pinnedRecordLabel}
                {pinnedRecordSummary ? ` | ${pinnedRecordSummary}` : ""}
              </p>
              {pinnedRecordStatusDetail ? (
                <p style={summaryMutedTextStyle}>{pinnedRecordStatusDetail}</p>
              ) : null}
              {nextPinnedLaneDetail ? (
                <p style={summaryMutedTextStyle}>{nextPinnedLaneDetail}</p>
              ) : null}
              {laneCompletionDetail ? (
                <p style={summaryMutedTextStyle}>{laneCompletionDetail}</p>
              ) : null}
              {laneRolloverDetail ? (
                <p style={summaryMutedTextStyle}>{laneRolloverDetail}</p>
              ) : null}
              {laneMetricsDetail ? (
                <p style={summaryMutedTextStyle}>{laneMetricsDetail}</p>
              ) : null}
              {laneDriverDetail ? (
                <p style={summaryMutedTextStyle}>{laneDriverDetail}</p>
              ) : null}
              {laneReadinessDetail ? (
                <p style={summaryMutedTextStyle}>{laneReadinessDetail}</p>
              ) : null}
              {laneHistoryStatusDetail ? (
                <p style={summaryMutedTextStyle}>{laneHistoryStatusDetail}</p>
              ) : null}
              <OperatorLaneStateBlock entries={laneStateEntries} compact />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {onOpenPinnedRecord ? (
                  <button
                    type="button"
                    title={operatorOverviewLaneActionsControlGuide.tooltip}
                    onClick={onOpenPinnedRecord}
                    style={summaryActionButtonStyle}
                  >
                    Open pinned lane
                  </button>
                ) : null}
                {onRefocusPinnedRecord ? (
                  <button
                    type="button"
                    title={operatorOverviewLaneActionsControlGuide.tooltip}
                    onClick={onRefocusPinnedRecord}
                    style={summaryActionButtonStyle}
                  >
                    Re-focus pinned lane
                  </button>
                ) : null}
                {onClearPinnedRecord ? (
                  <button
                    type="button"
                    title={operatorOverviewLaneActionsControlGuide.tooltip}
                    onClick={onClearPinnedRecord}
                    style={summaryActionButtonStyle}
                  >
                    Clear pinned lane
                  </button>
                ) : null}
                {onClearLocalLaneContext ? (
                  <button
                    type="button"
                    title={operatorOverviewLaneActionsControlGuide.tooltip}
                    onClick={onClearLocalLaneContext}
                    style={summaryActionButtonStyle}
                  >
                    Clear local lane context
                  </button>
                ) : null}
                {nextPinnedLaneLabel && onOpenNextPinnedLaneRecord ? (
                  <button
                    type="button"
                    title={operatorOverviewLaneActionsControlGuide.tooltip}
                    onClick={onOpenNextPinnedLaneRecord}
                    style={summaryActionButtonStyle}
                  >
                    Advance pinned lane
                  </button>
                ) : null}
                {laneRolloverLabel && onOpenLaneRolloverRecord ? (
                  <button
                    type="button"
                    title={operatorOverviewLaneActionsControlGuide.tooltip}
                    onClick={onOpenLaneRolloverRecord}
                    style={summaryActionButtonStyle}
                  >
                    Roll over lane
                  </button>
                ) : null}
                {laneMetricsLabel ? (
                  <span style={summaryBadgeStyle}>{laneMetricsLabel}</span>
                ) : null}
                {laneDriverLabel ? (
                  <span style={summaryBadgeStyle}>{laneDriverLabel}</span>
                ) : null}
                {laneFilterLabel ? (
                  <span style={summaryBadgeStyle}>{laneFilterLabel}</span>
                ) : null}
                {laneReadinessLabel ? (
                  <span style={summaryBadgeStyle}>{laneReadinessLabel}</span>
                ) : null}
                {laneHistoryStatusLabel ? (
                  <span style={summaryBadgeStyle}>{laneHistoryStatusLabel}</span>
                ) : null}
                {laneRecoveryLabel ? (
                  <span style={summaryBadgeStyle}>{laneRecoveryLabel}</span>
                ) : null}
                {laneHandoffLabel ? (
                  <span style={summaryBadgeStyle}>{laneHandoffLabel}</span>
                ) : null}
                {laneExportLabel ? (
                  <span style={summaryBadgeStyle}>{laneExportLabel}</span>
                ) : null}
                {laneOperatorNoteLabel ? (
                  <span style={summaryBadgeStyle}>{laneOperatorNoteLabel}</span>
                ) : null}
                {activeLanePresetLabel ? (
                  <span style={summaryBadgeStyle}>{activeLanePresetLabel}</span>
                ) : null}
                {lanePresetRestoredLabel ? (
                  <span style={summaryBadgeStyle}>{lanePresetRestoredLabel}</span>
                ) : null}
                {lanePresetDriftLabel ? (
                  <span
                    style={{
                      ...summaryBadgeStyle,
                      color: "var(--app-warning-text)",
                      borderColor: "var(--app-warning-border)",
                      background: "var(--app-warning-bg)",
                    }}
                  >
                    {lanePresetDriftLabel}
                  </span>
                ) : null}
                {laneRecoveryLabel && onApplyLaneRecovery ? (
                  <button
                    type="button"
                    title={operatorOverviewLaneActionsControlGuide.tooltip}
                    onClick={onApplyLaneRecovery}
                    style={summaryActionButtonStyle}
                  >
                    {laneRecoveryLabel}
                  </button>
                ) : null}
                {pinnedRecordLabel && onCopyLaneContext ? (
                  <button
                    type="button"
                    title={operatorOverviewLaneActionsControlGuide.tooltip}
                    onClick={onCopyLaneContext}
                    style={summaryActionButtonStyle}
                  >
                    Copy lane context
                  </button>
                ) : null}
                {laneHistoryStatusLabel === "recent returns stale" && onDropStaleLaneHistory ? (
                  <button
                    type="button"
                    title={operatorOverviewLaneActionsControlGuide.tooltip}
                    onClick={onDropStaleLaneHistory}
                    style={summaryActionButtonStyle}
                  >
                    Drop stale recent returns
                  </button>
                ) : null}
                {lanePresetEntries.length > 0 && onApplyLanePreset ? (
                  lanePresetEntries.map((preset) => (
                    <button
                      key={`overview-preset-${preset.id}`}
                      type="button"
                      onClick={() => onApplyLanePreset(preset.id)}
                      disabled={!preset.available}
                      title={preset.available ? preset.detail : preset.availabilityDetail}
                      style={summaryActionButtonStyle}
                    >
                      Preset: {preset.label}
                    </button>
                  ))
                ) : null}
                {onLaneOperatorNoteDraftChange && onSaveLaneOperatorNote ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      minWidth: 280,
                      maxWidth: 380,
                    }}
                  >
                    <label style={summaryMutedTextStyle}>
                      Operator note
                      <textarea
                        title={operatorOverviewLaneActionsControlGuide.tooltip}
                        value={laneOperatorNoteDraft}
                        onChange={(event) => onLaneOperatorNoteDraftChange(event.target.value)}
                        rows={3}
                        placeholder="Local browser-session note for the pinned lane."
                        style={{
                          marginTop: 6,
                          width: "100%",
                          resize: "vertical",
                          border: "1px solid var(--app-panel-border)",
                          borderRadius: 6,
                          padding: 8,
                          font: "inherit",
                          color: "var(--app-text-color)",
                          backgroundColor: "var(--app-input-bg)",
                        }}
                      />
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        title={operatorOverviewLaneActionsControlGuide.tooltip}
                        onClick={onSaveLaneOperatorNote}
                        style={summaryActionButtonStyle}
                      >
                        Save lane note
                      </button>
                      {onClearLaneOperatorNote ? (
                        <button
                          type="button"
                          title={operatorOverviewLaneActionsControlGuide.tooltip}
                          onClick={onClearLaneOperatorNote}
                          style={summaryActionButtonStyle}
                        >
                          Clear lane note
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {onSetLaneFilterMode ? (
                  <>
                    <button
                      type="button"
                      title={operatorOverviewLaneActionsControlGuide.tooltip}
                      onClick={() => onSetLaneFilterMode("all")}
                      style={summaryActionButtonStyle}
                    >
                      All signals
                    </button>
                    <button
                      type="button"
                      title={operatorOverviewLaneActionsControlGuide.tooltip}
                      onClick={() => onSetLaneFilterMode("warnings")}
                      style={summaryActionButtonStyle}
                    >
                      Warnings only
                    </button>
                    <button
                      type="button"
                      title={operatorOverviewLaneActionsControlGuide.tooltip}
                      onClick={() => onSetLaneFilterMode("audit_risk")}
                      style={summaryActionButtonStyle}
                    >
                      Audit risk
                    </button>
                    <button
                      type="button"
                      title={operatorOverviewLaneActionsControlGuide.tooltip}
                      onClick={() => onSetLaneFilterMode("simulated_only")}
                      style={summaryActionButtonStyle}
                    >
                      Simulated only
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          ) : null}
          <div style={summaryCardGridStyle}>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Prompt Sessions</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.prompt_sessions_total}</SummaryFact>
                <SummaryFact label="Waiting approval">
                  <StatusChip
                    label={String(summary.prompt_sessions_waiting_approval)}
                    tone={getApprovalStatusTone(
                      summary.prompt_sessions_waiting_approval > 0 ? "pending" : "approved",
                    )}
                  />
                </SummaryFact>
                <SummaryFact label="Real editor child paths">
                  <StatusChip
                    label={String(summary.prompt_sessions_with_real_editor_children)}
                    tone={summary.prompt_sessions_with_real_editor_children > 0 ? "success" : "neutral"}
                  />
                </SummaryFact>
                <SummaryFact label="Statuses">
                  <StatusBreakdown
                    entries={summary.prompt_sessions_by_status}
                    toneForKey={getPromptSessionStatusTone}
                    emptyLabel="none"
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
              </SummaryFacts>
              <p style={summaryMutedTextStyle}>
                Prompt-session counts summarize the natural-language front door only. They do not bypass tool approvals, locks, or the admitted capability boundary, and real editor child work remains limited to the current real-authoring editor path.
              </p>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Runs</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.runs_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    attentionLabel={getOverviewRunAttentionLabel(summary)}
                  />
                </SummaryFact>
                <SummaryFact label="Statuses">
                  <StatusBreakdown
                    entries={summary.runs_by_status}
                    toneForKey={getRunStatusTone}
                    emptyLabel="none"
                    onSelect={onRunStatusSelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Run Truth</h3>
              <SummaryFacts>
                <SummaryFact label="Related execution modes">
                  <StatusBreakdown
                    entries={summary.runs_by_related_execution_mode}
                    toneForKey={getExecutionModeTone}
                    emptyLabel="none"
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Inspection surfaces">
                  <StatusBreakdown
                    entries={summary.runs_by_inspection_surface}
                    toneForKey={getInspectionSurfaceTone}
                    emptyLabel="none"
                    onSelect={onRunInspectionSurfaceSelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Fallback categories">
                  <StatusBreakdown
                    entries={summary.runs_by_fallback_category}
                    toneForKey={getFallbackCategoryTone}
                    emptyLabel="none"
                    onSelect={onRunFallbackCategorySelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Manifest source of truth">
                  <StatusBreakdown
                    entries={summary.runs_by_manifest_source_of_truth}
                    toneForKey={getManifestSourceTone}
                    emptyLabel="none"
                    onSelect={onRunManifestSourceSelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
              </SummaryFacts>
              <p style={summaryMutedTextStyle}>
                Run truth counts summarize each run by its preferred related execution evidence. The related execution mode mix above shows whether those run-truth counts are currently being driven by simulated persisted executions or admitted hybrid real-path evidence, and it does not expand the admitted real O3DE adapter boundary.
              </p>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Approvals</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.approvals_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    attentionLabel={getOverviewApprovalAttentionLabel(summary)}
                  />
                </SummaryFact>
                <SummaryFact label="Pending">
                  <button
                    type="button"
                    title={operatorOverviewStatusFiltersControlGuide.tooltip}
                    onClick={onPendingApprovalsSelect}
                    style={chipButtonStyle}
                  >
                    <StatusChip
                      label={String(summary.approvals_pending)}
                      tone={getApprovalStatusTone(summary.approvals_pending > 0 ? "pending" : "approved")}
                    />
                  </button>
                </SummaryFact>
                <SummaryFact label="Decided">{summary.approvals_decided}</SummaryFact>
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Executions</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.executions_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    executionMode={getDominantMode(summary.executions_by_mode)}
                    attentionLabel={getOverviewExecutionAttentionLabel(summary)}
                  />
                </SummaryFact>
                <SummaryFact label="Statuses">
                  <StatusBreakdown
                    entries={summary.executions_by_status}
                    toneForKey={getExecutionStatusTone}
                    emptyLabel="none"
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Modes">
                  <StatusBreakdown
                    entries={summary.executions_by_mode}
                    toneForKey={getExecutionModeTone}
                    emptyLabel="none"
                    onSelect={onExecutionModeSelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Attempt states">
                  <StatusBreakdown
                    entries={summary.executions_by_attempt_state}
                    toneForKey={getAttemptStateTone}
                    emptyLabel="none"
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Failure categories">
                  <StatusBreakdown
                    entries={summary.executions_by_failure_category}
                    toneForKey={getFailureCategoryTone}
                    emptyLabel="none"
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Remote Substrate</h3>
              <SummaryFacts>
                <SummaryFact label="Executors total">{summary.executors_total}</SummaryFact>
                <SummaryFact label="Executor availability">
                  <StatusBreakdown
                    entries={summary.executors_by_availability_state}
                    toneForKey={getAvailabilityStateTone}
                    emptyLabel="none"
                    onSelect={onExecutorAvailabilitySelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Workspaces total">{summary.workspaces_total}</SummaryFact>
                <SummaryFact label="Workspace states">
                  <StatusBreakdown
                    entries={summary.workspaces_by_state}
                    toneForKey={getWorkspaceStateTone}
                    emptyLabel="none"
                    onSelect={onWorkspaceStateSelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
              </SummaryFacts>
              <p style={summaryMutedTextStyle}>
                These substrate counts are control-plane bookkeeping for remote executor isolation and workspace lifecycle only. They do not claim broader real O3DE adapter admission beyond the currently admitted surfaces.
              </p>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Execution Truth</h3>
              <SummaryFacts>
                <SummaryFact label="Inspection surfaces">
                  <StatusBreakdown
                    entries={summary.executions_by_inspection_surface}
                    toneForKey={getInspectionSurfaceTone}
                    emptyLabel="none"
                    onSelect={onExecutionInspectionSurfaceSelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Fallback categories">
                  <StatusBreakdown
                    entries={summary.executions_by_fallback_category}
                    toneForKey={getFallbackCategoryTone}
                    emptyLabel="none"
                    onSelect={onExecutionFallbackCategorySelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Manifest source of truth">
                  <StatusBreakdown
                    entries={summary.executions_by_manifest_source_of_truth}
                    toneForKey={getManifestSourceTone}
                    emptyLabel="none"
                    onSelect={onExecutionManifestSourceSelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
              </SummaryFacts>
              <p style={summaryMutedTextStyle}>
                Real-path aggregates here only summarize persisted evidence. Simulated execution remains explicitly labeled, and real O3DE adapters are still not broadly implemented.
              </p>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Artifacts</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.artifacts_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    executionMode={getDominantMode(summary.artifacts_by_mode)}
                    simulated={summary.artifacts_by_mode.simulated > 0}
                    attentionLabel={getOverviewArtifactAttentionLabel(summary)}
                  />
                </SummaryFact>
                <SummaryFact label="Modes">
                  <StatusBreakdown
                    entries={summary.artifacts_by_mode}
                    toneForKey={getExecutionModeTone}
                    emptyLabel="none"
                    onSelect={onArtifactModeSelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Artifact Truth</h3>
              <SummaryFacts>
                <SummaryFact label="Inspection surfaces">
                  <StatusBreakdown
                    entries={summary.artifacts_by_inspection_surface}
                    toneForKey={getInspectionSurfaceTone}
                    emptyLabel="none"
                    onSelect={onArtifactInspectionSurfaceSelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Fallback categories">
                  <StatusBreakdown
                    entries={summary.artifacts_by_fallback_category}
                    toneForKey={getFallbackCategoryTone}
                    emptyLabel="none"
                    onSelect={onArtifactFallbackCategorySelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
                <SummaryFact label="Manifest source of truth">
                  <StatusBreakdown
                    entries={summary.artifacts_by_manifest_source_of_truth}
                    toneForKey={getManifestSourceTone}
                    emptyLabel="none"
                    onSelect={onArtifactManifestSourceSelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
              </SummaryFacts>
              <p style={summaryMutedTextStyle}>
                Artifact provenance is an operator-visible audit surface only. It does not imply broader mutation admission outside the currently admitted hybrid paths.
              </p>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Events</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.events_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    attentionLabel={getOverviewEventAttentionLabel(summary)}
                  />
                </SummaryFact>
                <SummaryFact label="Active pressure">
                  <StatusChip
                    label={String(summary.active_events)}
                    tone={summary.active_events > 0 ? "warning" : "success"}
                  />
                </SummaryFact>
                <SummaryFact label="Severity mix">
                  <StatusBreakdown
                    entries={summary.events_by_severity}
                    toneForKey={getSeverityTone}
                    emptyLabel="none"
                    onSelect={onEventSeveritySelect}
                    buttonTitle={operatorOverviewStatusFiltersControlGuide.tooltip}
                  />
                </SummaryFact>
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Locks</h3>
              <SummaryFacts>
                <SummaryFact label="Held">{summary.locks_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    attentionLabel={getOverviewLockAttentionLabel(summary)}
                  />
                </SummaryFact>
              </SummaryFacts>
              <p style={summaryMutedTextStyle}>
                Persisted lock count shows current occupancy only. It does not imply broader real execution than the currently admitted hybrid surfaces.
              </p>
            </article>
          </div>
        </>
      ) : null}
    </SummarySection>
  );
}

type StatusBreakdownProps = {
  entries: Record<string, number>;
  toneForKey: (key: string) => "neutral" | "info" | "success" | "warning" | "danger";
  emptyLabel: string;
  onSelect?: (key: string) => void;
  buttonTitle?: string;
};

function StatusBreakdown({
  entries,
  toneForKey,
  emptyLabel,
  onSelect,
  buttonTitle,
}: StatusBreakdownProps) {
  const sortedEntries = Object.entries(entries).sort(([left], [right]) => left.localeCompare(right));

  if (sortedEntries.length === 0) {
    return <span>{emptyLabel}</span>;
  }

  return (
    <div style={chipWrapStyle}>
      {sortedEntries.map(([key, value]) => (
        <button
          key={key}
          type="button"
          title={buttonTitle}
          onClick={onSelect ? () => onSelect(key) : undefined}
          style={chipButtonStyle}
        >
          <StatusChip
            label={`${key}: ${value}`}
            tone={toneForKey(key)}
          />
        </button>
      ))}
    </div>
  );
}

function getInspectionSurfaceTone(
  key: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (key === "simulated") {
    return "warning";
  }
  if (key.includes("mutation")) {
    return "success";
  }
  if (key.includes("preflight") || key === "project_manifest") {
    return "info";
  }
  return "neutral";
}

function getPromptSessionStatusTone(
  key: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (key === "completed") {
    return "success";
  }
  if (key === "failed" || key === "blocked" || key === "refused") {
    return "danger";
  }
  if (key === "waiting_approval" || key === "running" || key === "planned") {
    return "warning";
  }
  return "neutral";
}

function getFallbackCategoryTone(
  key: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (key === "mutation-not-admitted" || key === "manifest-unreadable") {
    return "danger";
  }
  if (key === "manifest-missing" || key === "dry-run-required") {
    return "warning";
  }
  return "neutral";
}

function getManifestSourceTone(): "neutral" | "info" | "success" | "warning" | "danger" {
  return "info";
}

function getAttemptStateTone(
  key: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (key === "succeeded") {
    return "success";
  }
  if (key === "failed") {
    return "danger";
  }
  if (key.includes("running") || key.includes("started")) {
    return "info";
  }
  if (key.includes("queued") || key.includes("pending") || key.includes("waiting")) {
    return "warning";
  }
  return "neutral";
}

function getFailureCategoryTone(
  key: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (key === "none") {
    return "success";
  }
  if (key.includes("approval") || key.includes("policy") || key.includes("lock")) {
    return "warning";
  }
  if (key.includes("error") || key.includes("failed") || key.includes("crash")) {
    return "danger";
  }
  return "neutral";
}

function getAvailabilityStateTone(
  key: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (key === "available" || key === "ready") {
    return "success";
  }
  if (key === "offline" || key === "failed") {
    return "danger";
  }
  if (key.includes("busy") || key.includes("active")) {
    return "info";
  }
  if (key.includes("draining") || key.includes("pending")) {
    return "warning";
  }
  return "neutral";
}

function getWorkspaceStateTone(
  key: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (key === "ready") {
    return "success";
  }
  if (key === "failed" || key === "stale") {
    return "danger";
  }
  if (key.includes("active") || key.includes("preparing")) {
    return "info";
  }
  if (key.includes("pending") || key.includes("recycling")) {
    return "warning";
  }
  return "neutral";
}

const badgeRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
};

const chipWrapStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const chipButtonStyle: CSSProperties = {
  border: "none",
  padding: 0,
  background: "transparent",
  cursor: "pointer",
};
