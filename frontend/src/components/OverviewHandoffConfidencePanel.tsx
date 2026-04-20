import {
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

type OverviewHandoffConfidencePanelProps = {
  confidenceLabel: string;
  confidenceDetail: string;
  tone: "high" | "caution" | "risk";
  staleCount: number;
  driftedCount: number;
  excludedCount: number;
  changedSinceSnapshotCount: number;
};

export default function OverviewHandoffConfidencePanel({
  confidenceLabel,
  confidenceDetail,
  tone,
  staleCount,
  driftedCount,
  excludedCount,
  changedSinceSnapshotCount,
}: OverviewHandoffConfidencePanelProps) {
  const toneStyles = tone === "high"
    ? {
        borderColor: "#1a7f37",
        background: "linear-gradient(135deg, #ecfdf3 0%, #f6f8fa 100%)",
        badgeBackground: "#dafbe1",
      }
    : tone === "caution"
      ? {
          borderColor: "#bf8700",
          background: "linear-gradient(135deg, #fff8c5 0%, #f6f8fa 100%)",
          badgeBackground: "#fff8c5",
        }
      : {
          borderColor: "#d1242f",
          background: "linear-gradient(135deg, #fff1f2 0%, #f6f8fa 100%)",
          badgeBackground: "#ffebe9",
        };

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 12,
        marginBottom: 24,
        borderColor: toneStyles.borderColor,
        background: toneStyles.background,
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>Handoff confidence</strong>
        <p style={summaryMutedTextStyle}>
          Local browser-session confidence cue for the current handoff draft. This is a frontend-only risk summary and does not represent backend policy, approval, or orchestration state.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            ...summaryBadgeStyle,
            background: toneStyles.badgeBackground,
            borderColor: toneStyles.borderColor,
          }}
        >
          {confidenceLabel}
        </span>
        <span style={summaryBadgeStyle}>stale: {staleCount}</span>
        <span style={summaryBadgeStyle}>drifted: {driftedCount}</span>
        <span style={summaryBadgeStyle}>excluded: {excludedCount}</span>
        <span style={summaryBadgeStyle}>changed since snapshot: {changedSinceSnapshotCount}</span>
      </div>
      <p style={summaryMutedTextStyle}>{confidenceDetail}</p>
    </section>
  );
}
