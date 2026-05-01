import type { CSSProperties } from "react";

import StatusChip from "./StatusChip";
import {
  appApprovalSessionDashboardGeneratedAt,
  appApprovalSessionDashboardRows,
  type ApprovalSessionStatus,
  type ApprovalSessionTruthLabel,
} from "../fixtures/appApprovalSessionDashboardFixture";
import type { CapabilityRisk } from "../fixtures/appCapabilityDashboardFixture";
import { summaryCardStyle, summaryMutedTextStyle, summarySectionStyle } from "./summaryPrimitives";

const boundaryLabels = [
  "Static fixture only",
  "Server-owned authorization only",
  "Client approval fields are intent-only",
  "No execution admission changes",
] as const;

export default function AppApprovalSessionDashboardShell() {
  const statusCounts = countBy(appApprovalSessionDashboardRows, (row) => row.sessionStatus);
  const truthCounts = countBy(appApprovalSessionDashboardRows, (row) => row.truthLabel);

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 16,
        marginBottom: 24,
        background:
          "linear-gradient(128deg, rgba(45, 134, 84, 0.14) 0%, var(--app-panel-bg-muted) 52%, rgba(18, 112, 164, 0.14) 100%)",
      }}
      data-testid="app-approval-session-dashboard-shell"
    >
      <header style={{ display: "grid", gap: 8 }}>
        <strong>Approval/session dashboard shell (static fixture)</strong>
        <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
          Operator truth view that separates client intent from server-owned authorization and shows fail-closed
          session outcomes.
        </p>
        <p style={{ ...summaryMutedTextStyle, margin: 0, fontSize: 12 }}>
          Fixture baseline: {appApprovalSessionDashboardGeneratedAt}
        </p>
      </header>

      <div style={chipWrapStyle}>
        {boundaryLabels.map((label) => (
          <StatusChip key={label} label={label} tone="warning" />
        ))}
      </div>

      <div style={topGridStyle}>
        <article style={summaryCardStyle}>
          <strong>Session status mix</strong>
          <div style={chipWrapStyle}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <StatusChip
                key={status}
                label={`${status}: ${count}`}
                tone={getSessionStatusTone(status as ApprovalSessionStatus)}
              />
            ))}
          </div>
        </article>
        <article style={summaryCardStyle}>
          <strong>Authorization truth mix</strong>
          <div style={chipWrapStyle}>
            {Object.entries(truthCounts).map(([truthLabel, count]) => (
              <StatusChip
                key={truthLabel}
                label={`${truthLabel}: ${count}`}
                tone={getTruthTone(truthLabel as ApprovalSessionTruthLabel)}
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
              <th style={headerCellStyle}>Operation</th>
              <th style={headerCellStyle}>Client intent</th>
              <th style={headerCellStyle}>Server evaluation</th>
              <th style={headerCellStyle}>Session status</th>
              <th style={headerCellStyle}>Truth</th>
              <th style={headerCellStyle}>Execution admitted</th>
              <th style={headerCellStyle}>Project write admitted</th>
            </tr>
          </thead>
          <tbody>
            {appApprovalSessionDashboardRows.map((row) => (
              <tr key={row.id}>
                <td style={bodyCellStyle}>{row.domain}</td>
                <td style={bodyCellStyle}>
                  <code>{row.operation}</code>
                </td>
                <td style={bodyCellStyle}>{row.clientIntent}</td>
                <td style={bodyCellStyle}>{row.serverEvaluation}</td>
                <td style={bodyCellStyle}>
                  <StatusChip label={row.sessionStatus} tone={getSessionStatusTone(row.sessionStatus)} />
                </td>
                <td style={bodyCellStyle}>
                  <StatusChip label={row.truthLabel} tone={getTruthTone(row.truthLabel)} />
                </td>
                <td style={bodyCellStyle}>
                  <StatusChip label={String(row.executionAdmitted)} tone={row.executionAdmitted ? "success" : "danger"} />
                </td>
                <td style={bodyCellStyle}>
                  <StatusChip
                    label={String(row.projectWriteAdmitted)}
                    tone={row.projectWriteAdmitted ? "success" : "danger"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={noteGridStyle}>
        {appApprovalSessionDashboardRows.map((row) => (
          <article key={`${row.id}:note`} style={summaryCardStyle}>
            <div style={rowHeadStyle}>
              <strong>{row.domain}</strong>
              <StatusChip label={row.risk} tone={getRiskTone(row.risk)} />
            </div>
            <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
              <code>{row.operation}</code>
            </p>
            <p style={{ ...summaryMutedTextStyle, margin: 0 }}>{row.notes}</p>
            <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
              <strong>Authorization source:</strong> {row.authorizationSource}
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

function getSessionStatusTone(status: ApprovalSessionStatus): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "admitted") {
    return "success";
  }
  if (status === "ready_but_not_admitted") {
    return "warning";
  }
  if (status === "missing" || status === "expired" || status === "revoked" || status === "fingerprint_mismatch") {
    return "danger";
  }
  return "neutral";
}

function getTruthTone(truthLabel: ApprovalSessionTruthLabel): "neutral" | "info" | "success" | "warning" | "danger" {
  if (truthLabel === "admitted-by-server") {
    return "success";
  }
  if (truthLabel === "blocked") {
    return "danger";
  }
  if (truthLabel === "server-evaluated") {
    return "warning";
  }
  return "info";
}

const topGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
} satisfies CSSProperties;

const chipWrapStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
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
  minWidth: 980,
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

const noteGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
} satisfies CSSProperties;

const rowHeadStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
} satisfies CSSProperties;
