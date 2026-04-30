import type { CSSProperties } from "react";

import StatusChip from "./StatusChip";
import {
  appWorkspaceStatusChipRows,
  appWorkspaceStatusChipsFixtureGeneratedAt,
  type WorkspaceStatusTaxonomy,
} from "../fixtures/appWorkspaceStatusChipsFixture";
import {
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";
import {
  getStatusChipLinkageCue,
  sharedShellBoundaryLabels,
} from "./appShellTaxonomyParity";

const boundaryLabels = [
  ...sharedShellBoundaryLabels,
] as const;

export default function AppWorkspaceStatusChipsShell() {
  const taxonomyCounts = countBy(appWorkspaceStatusChipRows, (row) => row.taxonomy);

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 16,
        marginBottom: 24,
        background: "linear-gradient(140deg, rgba(20, 122, 88, 0.17) 0%, var(--app-panel-bg-muted) 58%, rgba(173, 127, 22, 0.15) 100%)",
      }}
      data-testid="app-workspace-status-chips-shell"
    >
      <header style={{ display: "grid", gap: 8 }}>
        <strong>Workspace status chips shell (static fixture)</strong>
        <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
          App-wide maturity taxonomy snapshot for quick operator review without admitting new runtime behavior.
        </p>
        <p style={{ ...summaryMutedTextStyle, margin: 0, fontSize: 12 }}>
          Fixture baseline: {appWorkspaceStatusChipsFixtureGeneratedAt}
        </p>
      </header>

      <div style={chipWrapStyle}>
        {boundaryLabels.map((label) => (
          <StatusChip key={label} label={label} tone="warning" />
        ))}
      </div>

      <article style={summaryCardStyle}>
        <strong>Taxonomy mix</strong>
        <div style={chipWrapStyle}>
          {Object.entries(taxonomyCounts).map(([taxonomy, count]) => (
            <StatusChip
              key={taxonomy}
              label={`${taxonomy}: ${count}`}
              tone={getTaxonomyTone(taxonomy as WorkspaceStatusTaxonomy)}
            />
          ))}
        </div>
      </article>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Workspace surface</th>
              <th style={headerCellStyle}>Capability window</th>
              <th style={headerCellStyle}>Status taxonomy</th>
              <th style={headerCellStyle}>Status-chip linkage cue</th>
              <th style={headerCellStyle}>Boundary</th>
              <th style={headerCellStyle}>Summary</th>
              <th style={headerCellStyle}>Next gate</th>
            </tr>
          </thead>
          <tbody>
            {appWorkspaceStatusChipRows.map((row) => (
              <tr key={`${row.workspace}:${row.capabilityWindow}`}>
                <td style={bodyCellStyle}>{row.workspace}</td>
                <td style={bodyCellStyle}>
                  <code>{row.capabilityWindow}</code>
                </td>
                <td style={bodyCellStyle}>
                  <StatusChip label={row.taxonomy} tone={getTaxonomyTone(row.taxonomy)} />
                </td>
                <td style={bodyCellStyle}>{getStatusChipLinkageCue(row.taxonomy)}</td>
                <td style={bodyCellStyle}>{row.boundary}</td>
                <td style={bodyCellStyle}>{row.summary}</td>
                <td style={bodyCellStyle}>{row.nextGate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
        Recommended next packet: <strong>Asset Forge placement readiness matrix refresh</strong>.
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

function getTaxonomyTone(taxonomy: WorkspaceStatusTaxonomy): "neutral" | "info" | "success" | "warning" | "danger" {
  if (taxonomy === "admitted-real") {
    return "success";
  }
  if (taxonomy === "proof-only") {
    return "warning";
  }
  if (taxonomy === "dry-run only" || taxonomy === "plan-only" || taxonomy === "demo") {
    return "info";
  }
  if (taxonomy === "blocked" || taxonomy === "hold-default-off") {
    return "danger";
  }
  return "neutral";
}

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
  minWidth: 1360,
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
