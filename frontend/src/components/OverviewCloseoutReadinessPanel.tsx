import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import PanelGuideDetails from "./PanelGuideDetails";
import {
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

const overviewCloseoutReadinessGuide = getPanelGuide("overview-closeout-readiness");
const overviewCloseoutReadinessEntryControlGuide = getPanelControlGuide("overview-closeout-readiness", "readiness-entry");

type OverviewCloseoutReadinessEntry = {
  id: string;
  laneLabel: string;
  focusLabel: string;
  ready: boolean;
  summaryLabel: string;
  detail: string;
};

type OverviewCloseoutReadinessPanelProps = {
  readyCount: number;
  pendingCount: number;
  entries: OverviewCloseoutReadinessEntry[];
};

export default function OverviewCloseoutReadinessPanel({
  readyCount,
  pendingCount,
  entries,
}: OverviewCloseoutReadinessPanelProps) {
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
        background: "linear-gradient(135deg, #ecfdf3 0%, #f6f8fa 100%)",
        borderColor: "#1a7f37",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>Closeout readiness</strong>
        <p style={summaryMutedTextStyle}>
          Local browser-session checklist for whether saved contexts look ready for a human handoff. This is a frontend-only readiness aid and does not imply backend workflow state.
        </p>
        <PanelGuideDetails
          tooltip={overviewCloseoutReadinessGuide.tooltip}
          checklist={overviewCloseoutReadinessGuide.checklist}
        />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={summaryBadgeStyle}>ready: {readyCount}</span>
        <span style={summaryBadgeStyle}>needs follow-up: {pendingCount}</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            title={overviewCloseoutReadinessEntryControlGuide.tooltip}
            style={{
              border: "1px solid #d0d7de",
              borderRadius: 10,
              padding: 12,
              background: "#ffffff",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={summaryBadgeStyle}>{entry.laneLabel}</span>
              <span
                style={{
                  ...summaryBadgeStyle,
                  borderColor: entry.ready ? "#1a7f37" : "#bf8700",
                  background: entry.ready ? "#dafbe1" : "#fff8c5",
                }}
              >
                {entry.summaryLabel}
              </span>
            </div>
            <strong>{entry.focusLabel}</strong>
            <p style={summaryMutedTextStyle}>{entry.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
