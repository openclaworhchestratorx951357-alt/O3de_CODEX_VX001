import {
  summaryActionButtonStyle,
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

type OverviewReviewSessionPanelProps = {
  inQueueCount: number;
  snoozedCount: number;
  reviewedCount: number;
  staleCount: number;
  driftedCount: number;
  longestSnoozedLabel?: string | null;
  longestSnoozedDetail?: string | null;
  lastSnapshotLabel?: string | null;
  compareSummaryLabel?: string | null;
  onCopySessionSnapshot?: (() => void) | null;
  onResetReviewState?: (() => void) | null;
  onReturnAllToQueue?: (() => void) | null;
};

export default function OverviewReviewSessionPanel({
  inQueueCount,
  snoozedCount,
  reviewedCount,
  staleCount,
  driftedCount,
  longestSnoozedLabel,
  longestSnoozedDetail,
  lastSnapshotLabel,
  compareSummaryLabel,
  onCopySessionSnapshot,
  onResetReviewState,
  onReturnAllToQueue,
}: OverviewReviewSessionPanelProps) {
  const totalCount = inQueueCount + snoozedCount + reviewedCount + staleCount + driftedCount;
  if (totalCount === 0) {
    return null;
  }

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 12,
        marginBottom: 24,
        background: "linear-gradient(135deg, #eef2ff 0%, #f6f8fa 100%)",
        borderColor: "#4c6ef5",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>Review session summary</strong>
        <p style={summaryMutedTextStyle}>
          Local browser-session review state for saved overview contexts. These counts do not reflect backend queue or task-state persistence.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={summaryBadgeStyle}>in queue: {inQueueCount}</span>
        <span style={summaryBadgeStyle}>snoozed: {snoozedCount}</span>
        <span style={summaryBadgeStyle}>reviewed: {reviewedCount}</span>
        <span style={summaryBadgeStyle}>stale: {staleCount}</span>
        <span style={summaryBadgeStyle}>drifted: {driftedCount}</span>
      </div>
      {longestSnoozedLabel ? (
        <div style={{ display: "grid", gap: 4 }}>
          <span style={summaryBadgeStyle}>{longestSnoozedLabel}</span>
          {longestSnoozedDetail ? (
            <p style={summaryMutedTextStyle}>{longestSnoozedDetail}</p>
          ) : null}
        </div>
      ) : null}
      {lastSnapshotLabel ? (
        <div style={{ display: "grid", gap: 4 }}>
          <span style={summaryBadgeStyle}>{lastSnapshotLabel}</span>
          {compareSummaryLabel ? (
            <p style={summaryMutedTextStyle}>{compareSummaryLabel}</p>
          ) : null}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {onCopySessionSnapshot ? (
          <button
            type="button"
            style={summaryActionButtonStyle}
            onClick={onCopySessionSnapshot}
          >
            Copy session snapshot
          </button>
        ) : null}
        {onReturnAllToQueue ? (
          <button
            type="button"
            style={summaryActionButtonStyle}
            onClick={onReturnAllToQueue}
          >
            Return all to queue
          </button>
        ) : null}
        {onResetReviewState ? (
          <button
            type="button"
            style={summaryActionButtonStyle}
            onClick={onResetReviewState}
          >
            Clear local review state
          </button>
        ) : null}
      </div>
    </section>
  );
}
