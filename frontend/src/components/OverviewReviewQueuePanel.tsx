import {
  summaryActionButtonStyle,
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

type OverviewReviewQueueEntry = {
  id: string;
  laneLabel: string;
  focusLabel: string;
  priorityLabel: string;
  priorityDetail: string;
  savedAt: string;
  triageLabel: string;
  reviewDisposition: "in_queue" | "reviewed" | "snoozed";
  noteText: string;
  lastReviewedLabel: string | null;
  nextSuggestedCheck: string | null;
};

type OverviewReviewQueuePanelProps = {
  entries: OverviewReviewQueueEntry[];
  onOpenEntry: (entryId: string) => void;
  onTriageEntry: (entryId: string) => void;
  onMarkReviewed: (entryId: string) => void;
  onSnoozeEntry: (entryId: string) => void;
  onKeepInQueue: (entryId: string) => void;
};

export default function OverviewReviewQueuePanel({
  entries,
  onOpenEntry,
  onTriageEntry,
  onMarkReviewed,
  onSnoozeEntry,
  onKeepInQueue,
}: OverviewReviewQueuePanelProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 12,
        marginBottom: 24,
        background: "linear-gradient(135deg, #e9fef3 0%, #f6f8fa 100%)",
        borderColor: "#1a7f37",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>Review queue</strong>
        <p style={summaryMutedTextStyle}>
          Highest-priority local execution and artifact contexts derived from browser-session workspace memory. This is a frontend review aid only.
        </p>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              border: "1px solid #d0d7de",
              borderRadius: 10,
              padding: 12,
              background: "#ffffff",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={summaryBadgeStyle}>{entry.laneLabel}</span>
              <span style={summaryBadgeStyle}>{entry.priorityLabel}</span>
            </div>
            <div>
              <strong>{entry.focusLabel}</strong>
            </div>
            <p style={summaryMutedTextStyle}>{entry.priorityDetail}</p>
            {entry.lastReviewedLabel ? (
              <p style={summaryMutedTextStyle}>{entry.lastReviewedLabel}</p>
            ) : null}
            {entry.noteText ? (
              <p style={summaryMutedTextStyle}>Note: {entry.noteText}</p>
            ) : null}
            {entry.nextSuggestedCheck ? (
              <p style={summaryMutedTextStyle}>Next suggested check: {entry.nextSuggestedCheck}</p>
            ) : null}
            <p style={summaryMutedTextStyle}>
              Saved at {new Date(entry.savedAt).toLocaleTimeString()} in the current browser session.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={summaryActionButtonStyle}
                onClick={() => onOpenEntry(entry.id)}
              >
                Open saved context
              </button>
              <button
                type="button"
                style={summaryActionButtonStyle}
                onClick={() => onTriageEntry(entry.id)}
              >
                {entry.triageLabel}
              </button>
              <button
                type="button"
                style={summaryActionButtonStyle}
                onClick={() => onMarkReviewed(entry.id)}
              >
                Mark reviewed
              </button>
              <button
                type="button"
                style={summaryActionButtonStyle}
                onClick={() => onSnoozeEntry(entry.id)}
              >
                Snooze
              </button>
              {entry.reviewDisposition !== "in_queue" ? (
                <button
                  type="button"
                  style={summaryActionButtonStyle}
                  onClick={() => onKeepInQueue(entry.id)}
                >
                  Keep in queue
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
