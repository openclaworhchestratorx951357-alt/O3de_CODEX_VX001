import {
  summaryActionButtonStyle,
  summaryCalloutStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
} from "./summaryPrimitives";

export type LaneActionEntry = {
  key: string;
  title: string;
  detail: string;
  actionLabel: string | null;
  onClick: (() => void) | null;
};

type LaneActionsCardProps = {
  entries: LaneActionEntry[];
};

export default function LaneActionsCard({ entries }: LaneActionsCardProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <article style={summaryCardStyle}>
      <h4 style={summaryCardHeadingStyle}>Lane Actions</h4>
      <div style={{ display: "grid", gap: 8 }}>
        {entries.map((entry) => (
          <div key={entry.key} style={summaryCalloutStyle}>
            <strong>{entry.title}:</strong> {entry.detail}
            {entry.actionLabel && entry.onClick ? (
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  style={summaryActionButtonStyle}
                  onClick={entry.onClick}
                >
                  {entry.actionLabel}
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </article>
  );
}
