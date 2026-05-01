import type { CSSProperties } from "react";

import StatusChip from "./StatusChip";
import type { CapabilityMaturity, CapabilityRisk } from "../fixtures/appCapabilityDashboardFixture";
import {
  appWorkspaceStatusChips,
  appWorkspaceStatusChipsGeneratedAt,
} from "../fixtures/appWorkspaceStatusChipsFixture";
import { summaryCardStyle, summaryMutedTextStyle, summarySectionStyle } from "./summaryPrimitives";

const boundaryLabels = [
  "Static fixture only",
  "No backend execution admission changes",
  "No mutation path enablement",
  "No client-side authorization",
] as const;

export default function AppWorkspaceStatusChipsShell() {
  const workspaceCounts = countBy(appWorkspaceStatusChips, (chip) => chip.workspace);
  const statusCounts = countBy(appWorkspaceStatusChips, (chip) => chip.status);

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 16,
        marginBottom: 24,
        background:
          "linear-gradient(122deg, rgba(220, 110, 43, 0.14) 0%, var(--app-panel-bg-muted) 52%, rgba(30, 120, 173, 0.14) 100%)",
      }}
      data-testid="app-workspace-status-chips-shell"
    >
      <header style={{ display: "grid", gap: 8 }}>
        <strong>Workspace status chips shell (static fixture)</strong>
        <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
          Compact cross-workspace truth chips for maturity, risk, and blocked/watch/ready posture without implying
          execution admission.
        </p>
        <p style={{ ...summaryMutedTextStyle, margin: 0, fontSize: 12 }}>
          Fixture baseline: {appWorkspaceStatusChipsGeneratedAt}
        </p>
      </header>

      <div style={chipWrapStyle}>
        {boundaryLabels.map((label) => (
          <StatusChip key={label} label={label} tone="warning" />
        ))}
      </div>

      <div style={topGridStyle}>
        <article style={summaryCardStyle}>
          <strong>Workspace coverage</strong>
          <div style={chipWrapStyle}>
            {Object.entries(workspaceCounts).map(([workspace, count]) => (
              <StatusChip key={workspace} label={`${workspace}: ${count}`} tone="info" />
            ))}
          </div>
        </article>
        <article style={summaryCardStyle}>
          <strong>Status mix</strong>
          <div style={chipWrapStyle}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <StatusChip key={status} label={`${status}: ${count}`} tone={getStatusTone(status)} />
            ))}
          </div>
        </article>
      </div>

      <div style={cardGridStyle}>
        {appWorkspaceStatusChips.map((chip) => (
          <article key={chip.id} style={summaryCardStyle}>
            <div style={rowHeadStyle}>
              <strong>{chip.workspace}</strong>
              <StatusChip label={chip.status} tone={getStatusTone(chip.status)} />
            </div>
            <div style={chipWrapStyle}>
              <StatusChip label={chip.label} tone="neutral" />
              <StatusChip label={chip.maturity} tone={getMaturityTone(chip.maturity)} />
              <StatusChip label={chip.risk} tone={getRiskTone(chip.risk)} />
            </div>
            <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
              <code>{chip.evidenceLink}</code>
            </p>
            <p style={{ ...summaryMutedTextStyle, margin: 0 }}>{chip.note}</p>
          </article>
        ))}
      </div>

      <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
        Recommended next packet: <strong>Validation intake endpoint-candidate admission design</strong> (docs/design
        first, default fail-closed, no execution admission changes).
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

function getStatusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "ready") {
    return "success";
  }
  if (status === "watch") {
    return "warning";
  }
  if (status === "blocked") {
    return "danger";
  }
  return "neutral";
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

const topGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} satisfies CSSProperties;

const cardGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
