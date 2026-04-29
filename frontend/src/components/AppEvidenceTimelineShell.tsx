import type { CSSProperties } from "react";

import StatusChip from "./StatusChip";
import {
  appEvidenceTimelineGeneratedAt,
  appEvidenceTimelineRows,
  type EvidenceTruthClass,
} from "../fixtures/appEvidenceTimelineFixture";
import type { CapabilityMaturity, CapabilityRisk } from "../fixtures/appCapabilityDashboardFixture";
import {
  summaryCardStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

const boundaryLabels = [
  "Static fixture only",
  "No backend execution admission changes",
  "No mutation path enablement",
  "No client-side authorization",
] as const;

export default function AppEvidenceTimelineShell() {
  const domainCounts = countBy(appEvidenceTimelineRows, (row) => row.domain);
  const truthClassCounts = countBy(appEvidenceTimelineRows, (row) => row.truthClass);

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 16,
        marginBottom: 24,
        background: "linear-gradient(124deg, rgba(0, 113, 188, 0.16) 0%, var(--app-panel-bg-muted) 54%, rgba(232, 124, 18, 0.16) 100%)",
      }}
      data-testid="app-evidence-timeline-shell"
    >
      <header style={{ display: "grid", gap: 8 }}>
        <strong>App-wide Evidence Timeline shell (static fixture)</strong>
        <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
          Cross-domain evidence chronology with explicit truth labels for demo, plan-only, dry-run only,
          proof-only, and admitted-real capability states.
        </p>
        <p style={{ ...summaryMutedTextStyle, margin: 0, fontSize: 12 }}>
          Fixture baseline: {appEvidenceTimelineGeneratedAt}
        </p>
      </header>

      <div style={chipWrapStyle}>
        {boundaryLabels.map((label) => (
          <StatusChip key={label} label={label} tone="warning" />
        ))}
      </div>

      <div style={topGridStyle}>
        <article style={summaryCardStyle}>
          <strong>Domain evidence coverage</strong>
          <div style={chipWrapStyle}>
            {Object.entries(domainCounts).map(([domain, count]) => (
              <StatusChip key={domain} label={`${domain}: ${count}`} tone="info" />
            ))}
          </div>
        </article>
        <article style={summaryCardStyle}>
          <strong>Truth-class mix</strong>
          <div style={chipWrapStyle}>
            {Object.entries(truthClassCounts).map(([truthClass, count]) => (
              <StatusChip
                key={truthClass}
                label={`${truthClass}: ${count}`}
                tone={getTruthClassTone(truthClass as EvidenceTruthClass)}
              />
            ))}
          </div>
        </article>
      </div>

      <ol style={timelineListStyle}>
        {appEvidenceTimelineRows.map((row) => (
          <li key={row.id} style={timelineItemStyle}>
            <article style={summaryCardStyle}>
              <div style={rowHeadStyle}>
                <strong>{row.occurredAt}</strong>
                <StatusChip label={row.risk} tone={getRiskTone(row.risk)} />
              </div>
              <div style={chipWrapStyle}>
                <StatusChip label={row.domain} tone="info" />
                <StatusChip label={row.truthClass} tone={getTruthClassTone(row.truthClass)} />
                <StatusChip label={row.maturity} tone={getMaturityTone(row.maturity)} />
              </div>
              <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
                <code>{row.capability}</code>
              </p>
              <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
                <strong>Evidence:</strong> {row.evidence}
              </p>
              <p style={{ ...summaryMutedTextStyle, margin: 0 }}>{row.notes}</p>
            </article>
          </li>
        ))}
      </ol>

      <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
        Recommended next packet: <strong>Approval/session dashboard shell</strong> (frontend/static-fixture first,
        intent-only labels, no execution admission changes).
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

function getRiskTone(risk: CapabilityRisk): "neutral" | "info" | "success" | "warning" | "danger" {
  if (risk === "Critical") {
    return "danger";
  }
  if (risk === "High") {
    return "warning";
  }
  if (risk === "Medium") {
    return "info";
  }
  return "success";
}

function getMaturityTone(maturity: CapabilityMaturity): "neutral" | "info" | "success" | "warning" | "danger" {
  if (maturity === "admitted-real" || maturity === "reviewable" || maturity === "production-ready") {
    return "success";
  }
  if (maturity === "proof-only" || maturity === "gated execution") {
    return "warning";
  }
  if (maturity === "read-only" || maturity === "preflight-only" || maturity === "dry-run only" || maturity === "GUI/demo only") {
    return "info";
  }
  if (maturity === "missing" || maturity === "needs baseline") {
    return "danger";
  }
  return "neutral";
}

function getTruthClassTone(truthClass: EvidenceTruthClass): "neutral" | "info" | "success" | "warning" | "danger" {
  if (truthClass === "admitted-real") {
    return "success";
  }
  if (truthClass === "proof-only") {
    return "warning";
  }
  if (truthClass === "dry-run only" || truthClass === "demo") {
    return "info";
  }
  return "neutral";
}

const topGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
} satisfies CSSProperties;

const chipWrapStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const rowHeadStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
} satisfies CSSProperties;

const timelineListStyle = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const timelineItemStyle = {
  margin: 0,
  padding: 0,
} satisfies CSSProperties;
