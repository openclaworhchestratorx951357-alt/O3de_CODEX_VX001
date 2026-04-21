import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import PanelGuideDetails from "./PanelGuideDetails";
import {
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

const overviewHandoffConfidenceGuide = getPanelGuide("overview-handoff-confidence");
const overviewHandoffConfidenceSummaryControlGuide = getPanelControlGuide("overview-handoff-confidence", "confidence-summary");

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
        borderColor: "var(--app-success-border)",
        background: "linear-gradient(135deg, var(--app-success-bg) 0%, var(--app-panel-bg-muted) 100%)",
        badgeBackground: "var(--app-success-bg)",
        badgeText: "var(--app-success-text)",
      }
    : tone === "caution"
      ? {
          borderColor: "var(--app-warning-border)",
          background: "linear-gradient(135deg, var(--app-warning-bg) 0%, var(--app-panel-bg-muted) 100%)",
          badgeBackground: "var(--app-warning-bg)",
          badgeText: "var(--app-warning-text)",
        }
      : {
          borderColor: "var(--app-danger-border)",
          background: "linear-gradient(135deg, var(--app-danger-bg) 0%, var(--app-panel-bg-muted) 100%)",
          badgeBackground: "var(--app-danger-bg)",
          badgeText: "var(--app-danger-text)",
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
        <PanelGuideDetails
          tooltip={overviewHandoffConfidenceGuide.tooltip}
          checklist={overviewHandoffConfidenceGuide.checklist}
        />
      </div>
      <div title={overviewHandoffConfidenceSummaryControlGuide.tooltip} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            ...summaryBadgeStyle,
            background: toneStyles.badgeBackground,
            borderColor: toneStyles.borderColor,
            color: toneStyles.badgeText,
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
