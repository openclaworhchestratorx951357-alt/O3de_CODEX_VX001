import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import PanelGuideDetails from "./PanelGuideDetails";
import {
  summaryActionButtonStyle,
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

const overviewContextMemoryGuide = getPanelGuide("overview-context-memory");
const overviewContextMemoryClearAllControlGuide = getPanelControlGuide("overview-context-memory", "clear-all");
const overviewContextMemoryOpenControlGuide = getPanelControlGuide("overview-context-memory", "open-context");
const overviewContextMemoryReviewActionsControlGuide = getPanelControlGuide("overview-context-memory", "local-review-actions");
const overviewContextMemoryNoteControlGuide = getPanelControlGuide("overview-context-memory", "note-editor");
const overviewContextMemoryClearEntryControlGuide = getPanelControlGuide("overview-context-memory", "clear-entry");

type OverviewContextMemoryEntry = {
  id: string;
  laneLabel: string;
  focusLabel: string;
  originLabel: string;
  savedAt: string;
  triageLabel?: string | null;
  reviewDisposition: "in_queue" | "reviewed" | "snoozed";
  noteText: string;
  lastReviewedLabel: string | null;
  lastReviewedDetail: string | null;
  nextSuggestedCheck: string | null;
};

type OverviewContextMemoryPanelProps = {
  entries: OverviewContextMemoryEntry[];
  onOpenEntry: (entryId: string) => void;
  onTriageEntry?: ((entryId: string) => void) | null;
  onMarkReviewed?: ((entryId: string) => void) | null;
  onSnoozeEntry?: ((entryId: string) => void) | null;
  onKeepInQueue?: ((entryId: string) => void) | null;
  onSaveNote?: ((entryId: string, text: string) => void) | null;
  onClearEntry: (entryId: string) => void;
  onClearAll?: (() => void) | null;
};

export default function OverviewContextMemoryPanel({
  entries,
  onOpenEntry,
  onTriageEntry,
  onMarkReviewed,
  onSnoozeEntry,
  onKeepInQueue,
  onSaveNote,
  onClearEntry,
  onClearAll,
}: OverviewContextMemoryPanelProps) {
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
        background: "linear-gradient(135deg, #fff8e1 0%, #f6f8fa 100%)",
        borderColor: "#bf8700",
      }}
    >
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 4 }}>
          <strong>Workspace memory</strong>
          <p style={summaryMutedTextStyle}>
            Local overview-context presets saved in this browser session. These do not create backend presets or server persistence.
          </p>
          <PanelGuideDetails
            tooltip={overviewContextMemoryGuide.tooltip}
            checklist={overviewContextMemoryGuide.checklist}
          />
        </div>
        {onClearAll ? (
          <button
            type="button"
            title={overviewContextMemoryClearAllControlGuide.tooltip}
            style={summaryActionButtonStyle}
            onClick={onClearAll}
          >
            Clear all local context presets
          </button>
        ) : null}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            title={overviewContextMemoryOpenControlGuide.tooltip}
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
              <span style={summaryBadgeStyle}>{entry.originLabel}</span>
              <span style={summaryBadgeStyle}>review: {entry.reviewDisposition.replace("_", " ")}</span>
            </div>
            <div>
              <strong>{entry.focusLabel}</strong>
            </div>
            <p style={summaryMutedTextStyle}>
              Saved at {new Date(entry.savedAt).toLocaleTimeString()} in the current browser session.
            </p>
            {entry.lastReviewedLabel ? (
              <p style={summaryMutedTextStyle}>{entry.lastReviewedLabel}</p>
            ) : null}
            {entry.lastReviewedDetail ? (
              <p style={summaryMutedTextStyle}>{entry.lastReviewedDetail}</p>
            ) : null}
            {entry.noteText ? (
              <p style={summaryMutedTextStyle}>
                Note: {entry.noteText}
              </p>
            ) : null}
            {entry.nextSuggestedCheck ? (
              <p style={summaryMutedTextStyle}>
                Next suggested check: {entry.nextSuggestedCheck}
              </p>
            ) : null}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                title={overviewContextMemoryOpenControlGuide.tooltip}
                style={summaryActionButtonStyle}
                onClick={() => onOpenEntry(entry.id)}
              >
                Open saved context
              </button>
              {entry.triageLabel && onTriageEntry ? (
                <button
                  type="button"
                  title={overviewContextMemoryReviewActionsControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={() => onTriageEntry(entry.id)}
                >
                  {entry.triageLabel}
                </button>
              ) : null}
              {onMarkReviewed ? (
                <button
                  type="button"
                  title={overviewContextMemoryReviewActionsControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={() => onMarkReviewed(entry.id)}
                >
                  Mark reviewed
                </button>
              ) : null}
              {onSnoozeEntry ? (
                <button
                  type="button"
                  title={overviewContextMemoryReviewActionsControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={() => onSnoozeEntry(entry.id)}
                >
                  Snooze
                </button>
              ) : null}
              {entry.reviewDisposition !== "in_queue" && onKeepInQueue ? (
                <button
                  type="button"
                  title={overviewContextMemoryReviewActionsControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={() => onKeepInQueue(entry.id)}
                >
                  Keep in queue
                </button>
              ) : null}
              <button
                type="button"
                title={overviewContextMemoryClearEntryControlGuide.tooltip}
                style={summaryActionButtonStyle}
                onClick={() => onClearEntry(entry.id)}
              >
                Clear saved context
              </button>
            </div>
            {onSaveNote ? (
              <div style={{ display: "grid", gap: 8 }}>
                <textarea
                  key={`${entry.id}:${entry.noteText}`}
                  title={overviewContextMemoryNoteControlGuide.tooltip}
                  defaultValue={entry.noteText}
                  rows={2}
                  placeholder="Local browser-session note for this saved context."
                  style={{
                    width: "100%",
                    resize: "vertical",
                    border: "1px solid #d0d7de",
                    borderRadius: 6,
                    padding: 8,
                    font: "inherit",
                    color: "#1f2328",
                    backgroundColor: "#ffffff",
                  }}
                  onBlur={(event) => onSaveNote(entry.id, event.target.value)}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
