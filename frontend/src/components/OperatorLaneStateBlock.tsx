import {
  summaryCalloutStyle,
  summaryMutedTextStyle,
} from "./summaryPrimitives";

export type OperatorLaneStateEntry = {
  label: string;
  detail: string;
  tone: "default" | "warning";
};

type OperatorLaneStateBlockProps = {
  entries: OperatorLaneStateEntry[];
  compact?: boolean;
};

export default function OperatorLaneStateBlock({
  entries,
  compact = false,
}: OperatorLaneStateBlockProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: compact ? 8 : 0,
        marginBottom: compact ? 12 : 0,
        padding: "10px 12px",
        border: "1px solid var(--app-panel-border)",
        borderRadius: 8,
        backgroundColor: "var(--app-panel-bg-muted)",
      }}
    >
      <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
        Operator lane state
      </p>
      {entries.map((entry) => (
        <p
          key={`${entry.label}-${entry.detail}`}
          style={{
            ...(compact ? summaryMutedTextStyle : summaryCalloutStyle),
            margin: "8px 0 0 0",
            color: entry.tone === "warning"
              ? "var(--app-warning-text)"
              : compact
                ? summaryMutedTextStyle.color
                : summaryCalloutStyle.color,
          }}
        >
          {entry.label}: {entry.detail}
        </p>
      ))}
    </div>
  );
}
