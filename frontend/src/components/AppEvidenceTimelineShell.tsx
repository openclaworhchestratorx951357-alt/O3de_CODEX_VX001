import type { CSSProperties } from "react";

import StatusChip from "./StatusChip";
import {
  appEvidenceTimelineFixtureGeneratedAt,
  appEvidenceTimelineRows,
  type EvidenceTruthLabel,
} from "../fixtures/appEvidenceTimelineFixture";
import {
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

const boundaryLabels = [
  "Static fixture only",
  "Server-owned approval/session and gate-state truth",
  "Client authorization fields stay intent-only",
  "No backend execution admission changes",
  "No mutation corridor admission changes",
  "Dispatch unadmitted for validation.report.intake",
] as const;

export default function AppEvidenceTimelineShell() {
  const domainCounts = countBy(appEvidenceTimelineRows, (row) => row.domain);
  const truthLabelCounts = countBy(appEvidenceTimelineRows, (row) => row.truthLabel);

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 16,
        marginBottom: 24,
        background: "linear-gradient(120deg, rgba(15, 130, 135, 0.16) 0%, var(--app-panel-bg-muted) 58%, rgba(197, 130, 34, 0.16) 100%)",
      }}
      data-testid="app-evidence-timeline-shell"
    >
      <header style={{ display: "grid", gap: 8 }}>
        <strong>App-wide Evidence Timeline shell (static fixture)</strong>
        <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
          Cross-domain evidence chronology for audit/review readiness across demo, plan-only, dry-run, proof-only,
          and admitted-real lanes.
        </p>
        <p style={{ ...summaryMutedTextStyle, margin: 0, fontSize: 12 }}>
          Fixture baseline: {appEvidenceTimelineFixtureGeneratedAt}
        </p>
      </header>

      <div style={chipWrapStyle}>
        {boundaryLabels.map((label) => (
          <StatusChip key={label} label={label} tone="warning" />
        ))}
      </div>

      <div style={topGridStyle}>
        <article style={summaryCardStyle}>
          <strong>Domain evidence mix</strong>
          <div style={chipWrapStyle}>
            {Object.entries(domainCounts).map(([domain, count]) => (
              <StatusChip key={domain} label={`${domain}: ${count}`} tone="info" />
            ))}
          </div>
        </article>
        <article style={summaryCardStyle}>
          <strong>Truth-label mix</strong>
          <div style={chipWrapStyle}>
            {Object.entries(truthLabelCounts).map(([truthLabel, count]) => (
              <StatusChip
                key={truthLabel}
                label={`${truthLabel}: ${count}`}
                tone={getTruthLabelTone(truthLabel as EvidenceTruthLabel)}
              />
            ))}
          </div>
        </article>
      </div>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Recorded (UTC)</th>
              <th style={headerCellStyle}>Domain</th>
              <th style={headerCellStyle}>Evidence lane</th>
              <th style={headerCellStyle}>Capability window</th>
              <th style={headerCellStyle}>Truth label</th>
              <th style={headerCellStyle}>Review status</th>
              <th style={headerCellStyle}>Summary</th>
            </tr>
          </thead>
          <tbody>
            {appEvidenceTimelineRows.map((row) => (
              <tr key={`${row.recordedAtUtc}:${row.domain}:${row.evidenceLane}`}>
                <td style={bodyCellStyle}>
                  <code>{row.recordedAtUtc}</code>
                </td>
                <td style={bodyCellStyle}>{row.domain}</td>
                <td style={bodyCellStyle}>{row.evidenceLane}</td>
                <td style={bodyCellStyle}>
                  <code>{row.capabilityWindow}</code>
                </td>
                <td style={bodyCellStyle}>
                  <StatusChip label={row.truthLabel} tone={getTruthLabelTone(row.truthLabel)} />
                </td>
                <td style={bodyCellStyle}>{row.reviewStatus}</td>
                <td style={bodyCellStyle}>{row.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
        Recommended next packet: <strong>App-wide evidence timeline shell + approval/validation linkage audit</strong>.
      </p>
    </section>
  );
}

function countBy<T>(rows: readonly T[], getKey: (row: T) => string): Record<string, number> {
  return rows.reduce<Record<string, number>>((counts, row) => {
    const key = getKey(row);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function getTruthLabelTone(
  truthLabel: EvidenceTruthLabel,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (truthLabel === "admitted-real") {
    return "success";
  }
  if (truthLabel === "proof-only") {
    return "warning";
  }
  if (truthLabel === "dry-run only" || truthLabel === "plan-only") {
    return "info";
  }
  return "neutral";
}

const topGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} satisfies CSSProperties;

const chipWrapStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const summaryCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: 12,
  background: "var(--app-panel-bg)",
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const tableWrapStyle = {
  overflowX: "auto",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 1100,
} satisfies CSSProperties;

const headerCellStyle = {
  borderBottom: "1px solid var(--app-panel-border)",
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 12,
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const bodyCellStyle = {
  borderBottom: "1px solid var(--app-panel-border)",
  padding: "10px 12px",
  verticalAlign: "top",
} satisfies CSSProperties;




















