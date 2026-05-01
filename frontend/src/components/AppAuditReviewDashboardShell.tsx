import type { CSSProperties } from "react";

import StatusChip from "./StatusChip";
import {
  appAuditReviewDashboardGeneratedAt,
  appAuditReviewDashboardRows,
  type AuditRisk,
  type AuditVerdict,
} from "../fixtures/appAuditReviewDashboardFixture";
import {
  summaryCardStyle,
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

export default function AppAuditReviewDashboardShell() {
  const verdictCounts = countBy(appAuditReviewDashboardRows, (row) => row.verdict);
  const riskCounts = countBy(appAuditReviewDashboardRows, (row) => row.risk);
  const statusTaxonomyCounts = countBy(appAuditReviewDashboardRows, (row) => row.statusTaxonomy);

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 16,
        marginBottom: 24,
        background: "linear-gradient(130deg, rgba(229, 168, 56, 0.16) 0%, var(--app-panel-bg-muted) 58%, rgba(20, 137, 191, 0.16) 100%)",
      }}
      data-testid="app-audit-review-dashboard-shell"
    >
      <header style={{ display: "grid", gap: 8 }}>
        <strong>Audit review dashboard shell (static fixture)</strong>
        <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
          Cross-domain review gate snapshot for fast-but-safe capability unlock operations.
        </p>
        <p style={{ ...summaryMutedTextStyle, margin: 0, fontSize: 12 }}>
          Fixture baseline: {appAuditReviewDashboardGeneratedAt}
        </p>
      </header>

      <div style={chipWrapStyle}>
        {boundaryLabels.map((label) => (
          <StatusChip key={label} label={label} tone="warning" />
        ))}
      </div>

      <div style={topGridStyle}>
        <article style={summaryCardStyle}>
          <strong>Verdict mix</strong>
          <div style={chipWrapStyle}>
            {Object.entries(verdictCounts).map(([verdict, count]) => (
              <StatusChip key={verdict} label={`${verdict}: ${count}`} tone={getVerdictTone(verdict as AuditVerdict)} />
            ))}
          </div>
        </article>
        <article style={summaryCardStyle}>
          <strong>Risk mix</strong>
          <div style={chipWrapStyle}>
            {Object.entries(riskCounts).map(([risk, count]) => (
              <StatusChip key={risk} label={`${risk}: ${count}`} tone={getRiskTone(risk as AuditRisk)} />
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
                tone={getTaxonomyTone(taxonomy as (typeof appAuditReviewDashboardRows)[number]["statusTaxonomy"])}
              />
            ))}
          </div>
        </article>
      </div>

      <div style={cardGridStyle}>
        {appAuditReviewDashboardRows.map((row) => (
          <article key={`${row.domain}:${row.capabilityWindow}`} style={summaryCardStyle}>
            <div style={rowHeadStyle}>
              <strong>{row.domain}</strong>
              <StatusChip label={row.verdict} tone={getVerdictTone(row.verdict)} />
            </div>
            <div style={chipWrapStyle}>
              <StatusChip label={row.currentMaturity} tone="info" />
              <StatusChip label={row.statusTaxonomy} tone={getTaxonomyTone(row.statusTaxonomy)} />
              <StatusChip label={row.risk} tone={getRiskTone(row.risk)} />
            </div>
            <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
              <strong>Window:</strong> {row.capabilityWindow}
            </p>
            <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
              <strong>Gate:</strong> {row.gateStatus}
            </p>
            <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
              <strong>Status-chip linkage:</strong> {getStatusChipLinkageCue(row.statusTaxonomy)}
            </p>
            <p style={{ ...summaryMutedTextStyle, margin: 0 }}>{row.findings}</p>
            <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
              <strong>Next gate:</strong> {row.nextGate}
            </p>
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

function getVerdictTone(verdict: AuditVerdict): "neutral" | "info" | "success" | "warning" | "danger" {
  if (verdict === "pass") {
    return "success";
  }
  if (verdict === "watch") {
    return "warning";
  }
  return "danger";
}

function getRiskTone(risk: AuditRisk): "neutral" | "info" | "success" | "warning" | "danger" {
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

function getTaxonomyTone(
  taxonomy: (typeof appAuditReviewDashboardRows)[number]["statusTaxonomy"],
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
