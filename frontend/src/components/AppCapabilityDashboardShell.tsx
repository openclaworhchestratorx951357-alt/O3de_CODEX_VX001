import type { CSSProperties } from "react";

import StatusChip from "./StatusChip";
import {
  appCapabilityDashboardFixtureGeneratedAt,
  appCapabilityDashboardRows,
  type CapabilityMaturity,
  type CapabilityRisk,
} from "../fixtures/appCapabilityDashboardFixture";
import {
  summaryCardStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

const executionBoundaryLabels = [
  "Static fixture only",
  "Server-owned authorization truth",
  "Client fields are intent-only",
  "No backend execution admission changes",
  "No mutation corridor broadening",
  "No provider / Blender / Asset Processor execution",
  "No placement execution",
] as const;

export default function AppCapabilityDashboardShell() {
  const domainCounts = countByKey(appCapabilityDashboardRows, (row) => row.domain);
  const maturityCounts = countByKey(appCapabilityDashboardRows, (row) => row.currentMaturity);
  const statusTaxonomyCounts = countByKey(appCapabilityDashboardRows, (row) => row.statusTaxonomy);

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 16,
        marginBottom: 24,
        background: "linear-gradient(125deg, rgba(19, 87, 198, 0.14) 0%, var(--app-panel-bg-muted) 58%, rgba(16, 121, 89, 0.14) 100%)",
      }}
      data-testid="app-capability-dashboard-shell"
    >
      <header style={{ display: "grid", gap: 8 }}>
        <strong>App-wide Capability Dashboard shell (static fixture)</strong>
        <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
          Frontend truth view for capability maturity across the whole app. This panel is static-fixture-first and
          does not enable execution.
        </p>
        <p style={{ ...summaryMutedTextStyle, margin: 0, fontSize: 12 }}>
          Fixture baseline: {appCapabilityDashboardFixtureGeneratedAt}
        </p>
      </header>

      <div style={boundaryLabelRowStyle}>
        {executionBoundaryLabels.map((label) => (
          <StatusChip key={label} label={label} tone="warning" />
        ))}
      </div>

      <div style={topGridStyle}>
        <article style={summaryCardStyle}>
          <strong>Domain coverage</strong>
          <div style={chipWrapStyle}>
            {Object.entries(domainCounts).map(([domain, count]) => (
              <StatusChip key={domain} label={`${domain}: ${count}`} tone="info" />
            ))}
          </div>
        </article>
        <article style={summaryCardStyle}>
          <strong>Current maturity mix</strong>
          <div style={chipWrapStyle}>
            {Object.entries(maturityCounts).map(([maturity, count]) => (
              <StatusChip
                key={maturity}
                label={`${maturity}: ${count}`}
                tone={getMaturityTone(maturity as CapabilityMaturity)}
              />
            ))}
          </div>
        </article>
        <article style={summaryCardStyle}>
          <strong>Status taxonomy mix</strong>
          <div style={chipWrapStyle}>
            {Object.entries(statusTaxonomyCounts).map(([taxonomy, count]) => (
              <StatusChip
                key={taxonomy}
                label={`${taxonomy}: ${count}`}
                tone={getTaxonomyTone(taxonomy as (typeof appCapabilityDashboardRows)[number]["statusTaxonomy"])}
              />
            ))}
          </div>
        </article>
      </div>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Domain</th>
              <th style={headerCellStyle}>Capability</th>
              <th style={headerCellStyle}>Current</th>
              <th style={headerCellStyle}>Next</th>
              <th style={headerCellStyle}>Status taxonomy</th>
              <th style={headerCellStyle}>Risk</th>
              <th style={headerCellStyle}>Required gate</th>
              <th style={headerCellStyle}>Recommended packet</th>
            </tr>
          </thead>
          <tbody>
            {appCapabilityDashboardRows.map((row) => (
              <tr key={`${row.domain}:${row.capability}`}>
                <td style={bodyCellStyle}>{row.domain}</td>
                <td style={bodyCellStyle}>
                  <code>{row.capability}</code>
                </td>
                <td style={bodyCellStyle}>
                  <StatusChip label={row.currentMaturity} tone={getMaturityTone(row.currentMaturity)} />
                </td>
                <td style={bodyCellStyle}>
                  <StatusChip label={row.desiredNextMaturity} tone={getMaturityTone(row.desiredNextMaturity)} />
                </td>
                <td style={bodyCellStyle}>
                  <StatusChip label={row.statusTaxonomy} tone={getTaxonomyTone(row.statusTaxonomy)} />
                </td>
                <td style={bodyCellStyle}>
                  <StatusChip label={row.risk} tone={getRiskTone(row.risk)} />
                </td>
                <td style={bodyCellStyle}>{row.requiredGate}</td>
                <td style={bodyCellStyle}>{row.recommendedNextPacket}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
        Recommended next packet: <strong>Approval/session dashboard parity checkpoint packet</strong>.
      </p>
    </section>
  );
}

function countByKey<T>(rows: readonly T[], getKey: (row: T) => string): Record<string, number> {
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
  if (maturity === "missing" || maturity === "needs baseline" || maturity === "hold-default-off" || maturity === "blocked") {
    return "danger";
  }
  return "neutral";
}

function getTaxonomyTone(
  taxonomy: (typeof appCapabilityDashboardRows)[number]["statusTaxonomy"],
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (taxonomy === "admitted-real") {
    return "success";
  }
  if (taxonomy === "proof-only") {
    return "warning";
  }
  if (taxonomy === "dry-run only" || taxonomy === "plan-only" || taxonomy === "demo") {
    return "info";
  }
  if (taxonomy === "hold-default-off" || taxonomy === "blocked") {
    return "danger";
  }
  return "neutral";
}

const boundaryLabelRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const topGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} satisfies CSSProperties;

const chipWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
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
