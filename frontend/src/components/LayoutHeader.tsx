import OperatorLaneStateBlock, { type OperatorLaneStateEntry } from "./OperatorLaneStateBlock";
import { buildOperatorLaneStateEntries } from "./laneViewModel";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryBadgeStyle,
  summaryMutedTextStyle,
} from "./summaryPrimitives";

type LayoutHeaderProps = {
  title: string;
  subtitle: string;
  refreshing?: boolean;
  lastRefreshedAt?: string | null;
  refreshStatusLabel?: string | null;
  refreshStatusDetail?: string | null;
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
  laneMemoryLabel?: string | null;
  laneMemoryDetail?: string | null;
  laneHistoryEntries?: Array<{ kind: "run" | "execution" | "artifact"; id: string; label: string; detail: string }>;
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
  onReturnToLane?: (() => void) | null;
  onOpenLaneHistoryEntry?: ((entry: { kind: "run" | "execution" | "artifact"; id: string; label: string; detail: string }) => void) | null;
  onApplyLaneRecovery?: (() => void) | null;
  onDropStaleLaneHistory?: (() => void) | null;
  onApplyLanePreset?: ((presetId: "execution_warnings" | "artifact_audit_risk" | "simulated_review") => void) | null;
  onCopyLaneContext?: (() => void) | null;
  onLaneOperatorNoteDraftChange?: ((value: string) => void) | null;
  onSaveLaneOperatorNote?: (() => void) | null;
  onClearLaneOperatorNote?: (() => void) | null;
  refreshActions?: Array<{
    label: string;
    onClick: () => void;
  }>;
};

export default function LayoutHeader({
  title,
  subtitle,
  refreshing = false,
  lastRefreshedAt,
  refreshStatusLabel,
  refreshStatusDetail,
  pinnedRecordLabel,
  pinnedRecordSummary,
  pinnedRecordStatusLabel,
  pinnedRecordStatusDetail,
  nextPinnedLaneLabel,
  nextPinnedLaneDetail,
  laneCompletionLabel,
  laneCompletionDetail,
  laneRolloverLabel,
  laneRolloverDetail,
  laneMetricsLabel,
  laneMetricsDetail,
  laneDriverLabel,
  laneDriverDetail,
  laneFilterLabel,
  laneMemoryLabel,
  laneMemoryDetail,
  laneHistoryEntries = [],
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
  onReturnToLane,
  onOpenLaneHistoryEntry,
  onApplyLaneRecovery,
  onDropStaleLaneHistory,
  onApplyLanePreset,
  onCopyLaneContext,
  onLaneOperatorNoteDraftChange,
  onSaveLaneOperatorNote,
  onClearLaneOperatorNote,
  refreshActions = [],
}: LayoutHeaderProps) {
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
    <header
      style={{
        borderBottom: "1px solid #d0d7de",
        paddingBottom: 16,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p style={{ margin: "8px 0 0 0" }}>{subtitle}</p>
          {refreshStatusDetail ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              {refreshStatusDetail}
            </p>
          ) : null}
          {pinnedRecordLabel ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              Pinned lane: {pinnedRecordLabel}
              {pinnedRecordSummary ? ` | ${pinnedRecordSummary}` : ""}
            </p>
          ) : null}
          {pinnedRecordStatusDetail ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              {pinnedRecordStatusDetail}
            </p>
          ) : null}
          {nextPinnedLaneDetail ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              {nextPinnedLaneDetail}
            </p>
          ) : null}
          {laneCompletionDetail ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              {laneCompletionDetail}
            </p>
          ) : null}
          {laneRolloverDetail ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              {laneRolloverDetail}
            </p>
          ) : null}
          {laneMetricsDetail ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              {laneMetricsDetail}
            </p>
          ) : null}
          {laneDriverDetail ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              {laneDriverDetail}
            </p>
          ) : null}
          {laneMemoryDetail ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              {laneMemoryDetail}
            </p>
          ) : null}
          {laneReadinessDetail ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              {laneReadinessDetail}
            </p>
          ) : null}
          {laneHistoryStatusDetail ? (
            <p style={{ ...summaryMutedTextStyle, margin: "8px 0 0 0" }}>
              {laneHistoryStatusDetail}
            </p>
          ) : null}
          <OperatorLaneStateBlock entries={laneStateEntries} compact />
          {(pinnedRecordLabel || laneMemoryLabel || laneHistoryEntries.length > 0) ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
                alignItems: "center",
              }}
            >
              {pinnedRecordLabel ? <span style={summaryBadgeStyle}>shortcut: ] advance lane</span> : null}
              {laneMemoryLabel ? <span style={summaryBadgeStyle}>shortcut: [ return to lane</span> : null}
              {laneHistoryEntries.slice(0, 3).map((entry) => (
                <span key={`header-history-${entry.kind}-${entry.id}`} style={summaryBadgeStyle}>
                  recent: {entry.label}
                </span>
              ))}
            </div>
          ) : null}
          {lanePresetEntries.length > 0 ? (
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
                alignItems: "center",
              }}
            >
              {lanePresetEntries.map((preset) => (
                <span
                  key={`preset-${preset.id}`}
                  style={{
                    ...summaryBadgeStyle,
                    opacity: preset.available ? 1 : 0.6,
                  }}
                  title={preset.availabilityDetail}
                >
                  {preset.available ? "preset" : "preset unavailable"}: {preset.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {refreshStatusLabel ? (
            <span style={summaryBadgeStyle}>{refreshStatusLabel}</span>
          ) : null}
          {lastRefreshedAt ? (
            <span style={summaryBadgeStyle}>
              last refresh: {formatSummaryTimestamp(lastRefreshedAt)}
            </span>
          ) : null}
          {pinnedRecordStatusLabel ? (
            <span style={summaryBadgeStyle}>{pinnedRecordStatusLabel}</span>
          ) : null}
          {nextPinnedLaneLabel ? (
            <span style={summaryBadgeStyle}>{nextPinnedLaneLabel}</span>
          ) : null}
          {laneCompletionLabel ? (
            <span style={summaryBadgeStyle}>{laneCompletionLabel}</span>
          ) : null}
          {laneRolloverLabel ? (
            <span style={summaryBadgeStyle}>{laneRolloverLabel}</span>
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
            <span style={{ ...summaryBadgeStyle, color: "#8a4600", borderColor: "#f0b429" }}>
              {lanePresetDriftLabel}
            </span>
          ) : null}
          {pinnedRecordLabel && onOpenPinnedRecord ? (
            <button
              type="button"
              onClick={onOpenPinnedRecord}
              style={summaryActionButtonStyle}
            >
              Open pinned lane
            </button>
          ) : null}
          {pinnedRecordLabel && onRefocusPinnedRecord ? (
            <button
              type="button"
              onClick={onRefocusPinnedRecord}
              style={summaryActionButtonStyle}
            >
              Re-focus pinned lane
            </button>
          ) : null}
          {pinnedRecordLabel && onClearPinnedRecord ? (
            <button
              type="button"
              onClick={onClearPinnedRecord}
              style={summaryActionButtonStyle}
            >
              Clear pinned lane
            </button>
          ) : null}
          {onClearLocalLaneContext ? (
            <button
              type="button"
              onClick={onClearLocalLaneContext}
              style={summaryActionButtonStyle}
            >
              Clear local lane context
            </button>
          ) : null}
          {nextPinnedLaneLabel && onOpenNextPinnedLaneRecord ? (
            <button
              type="button"
              onClick={onOpenNextPinnedLaneRecord}
              style={summaryActionButtonStyle}
            >
              Advance pinned lane
            </button>
          ) : null}
          {laneRolloverLabel && onOpenLaneRolloverRecord ? (
            <button
              type="button"
              onClick={onOpenLaneRolloverRecord}
              style={summaryActionButtonStyle}
            >
              Roll over lane
            </button>
          ) : null}
          {laneMemoryLabel && onReturnToLane ? (
            <button
              type="button"
              onClick={onReturnToLane}
              style={summaryActionButtonStyle}
            >
              Return to lane
            </button>
          ) : null}
          {pinnedRecordLabel && onCopyLaneContext ? (
            <button
              type="button"
              onClick={onCopyLaneContext}
              style={summaryActionButtonStyle}
            >
              Copy lane context
            </button>
          ) : null}
          {laneHistoryEntries.length > 0 && onOpenLaneHistoryEntry ? (
            laneHistoryEntries.slice(0, 3).map((entry) => (
              <button
                key={`history-${entry.kind}-${entry.id}`}
                type="button"
                onClick={() => onOpenLaneHistoryEntry(entry)}
                style={summaryActionButtonStyle}
              >
                Recent: {entry.label}
              </button>
            ))
          ) : null}
          {laneRecoveryLabel && onApplyLaneRecovery ? (
            <button
              type="button"
              onClick={onApplyLaneRecovery}
              style={summaryActionButtonStyle}
            >
              {laneRecoveryLabel}
            </button>
          ) : null}
          {laneHistoryStatusLabel === "recent returns stale" && onDropStaleLaneHistory ? (
            <button
              type="button"
              onClick={onDropStaleLaneHistory}
              style={summaryActionButtonStyle}
            >
              Drop stale recent returns
            </button>
          ) : null}
          {lanePresetEntries.length > 0 && onApplyLanePreset ? (
            lanePresetEntries.map((preset) => (
              <button
                key={`apply-preset-${preset.id}`}
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
                  value={laneOperatorNoteDraft}
                  onChange={(event) => onLaneOperatorNoteDraftChange(event.target.value)}
                  rows={3}
                  placeholder="Local browser-session note for the pinned lane."
                  style={{
                    marginTop: 6,
                    width: "100%",
                    resize: "vertical",
                    border: "1px solid #d0d7de",
                    borderRadius: 6,
                    padding: 8,
                    font: "inherit",
                    color: "#1f2328",
                    backgroundColor: "#ffffff",
                  }}
                />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={onSaveLaneOperatorNote}
                  style={summaryActionButtonStyle}
                >
                  Save lane note
                </button>
                {onClearLaneOperatorNote ? (
                  <button
                    type="button"
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
                onClick={() => onSetLaneFilterMode("all")}
                style={summaryActionButtonStyle}
              >
                All signals
              </button>
              <button
                type="button"
                onClick={() => onSetLaneFilterMode("warnings")}
                style={summaryActionButtonStyle}
              >
                Warnings only
              </button>
              <button
                type="button"
                onClick={() => onSetLaneFilterMode("audit_risk")}
                style={summaryActionButtonStyle}
              >
                Audit risk
              </button>
              <button
                type="button"
                onClick={() => onSetLaneFilterMode("simulated_only")}
                style={summaryActionButtonStyle}
              >
                Simulated only
              </button>
            </>
          ) : null}
          {refreshActions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              type="button"
              onClick={action.onClick}
              disabled={refreshing}
              style={summaryActionButtonStyle}
            >
              {refreshing ? "Refreshing..." : action.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
