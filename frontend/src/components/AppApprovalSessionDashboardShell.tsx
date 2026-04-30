import type { CSSProperties } from "react";

import StatusChip from "./StatusChip";
import {
  appApprovalSessionDashboardFailClosedRows,
  appApprovalSessionDashboardGateStateRows,
  appApprovalSessionDashboardGeneratedAt,
  appApprovalSessionDashboardOperatorReviewFields,
  appApprovalSessionDashboardRows,
  type ApprovalSessionGateState,
  type ApprovalSessionTruthLabel,
} from "../fixtures/appApprovalSessionDashboardFixture";
import {
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";
import { sharedShellBoundaryLabels } from "./appShellTaxonomyParity";

const boundaryLabels = [...sharedShellBoundaryLabels] as const;

export default function AppApprovalSessionDashboardShell() {
  const truthCounts = countBy(appApprovalSessionDashboardRows, (row) => row.truthLabel);

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 16,
        marginBottom: 24,
        background:
          "linear-gradient(135deg, rgba(17, 107, 173, 0.17) 0%, var(--app-panel-bg-muted) 58%, rgba(196, 145, 20, 0.15) 100%)",
      }}
      data-testid="app-approval-session-dashboard-shell"
    >
      <header style={{ display: "grid", gap: 8 }}>
        <strong>Approval/session dashboard shell (static fixture)</strong>
        <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
          Operator-facing shell for approval and server-session truth without widening runtime authorization.
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

      <article style={summaryCardStyle}>
        <strong>Truth-label mix</strong>
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

      <div style={topGridStyle}>
        <article style={summaryCardStyle}>
          <strong>Server gate-state matrix</strong>
          <div style={stackStyle}>
            {appApprovalSessionDashboardGateStateRows.map((row) => (
              <div key={row.gateState} style={matrixRowStyle}>
                <StatusChip label={row.gateState} tone={getGateStateTone(row.gateState)} />
                <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
                  {row.endpointAvailability}. {row.reviewImplication}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article style={summaryCardStyle}>
          <strong>Operator review/status fields</strong>
          <div style={chipWrapStyle}>
            {appApprovalSessionDashboardOperatorReviewFields.map((fieldName) => (
              <StatusChip key={fieldName} label={fieldName} tone="neutral" />
            ))}
          </div>
          <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
            These fields are review output only; they do not authorize execution or mutation.
          </p>
        </article>
      </div>

      <article style={summaryCardStyle}>
        <strong>Fail-closed refusal matrix</strong>
        <div style={stackStyle}>
          {appApprovalSessionDashboardFailClosedRows.map((row) => (
            <p key={row.scenario} style={{ ...summaryMutedTextStyle, margin: 0 }}>
              <strong>{row.scenario}:</strong> {row.expectedStatus}. {row.boundary}.
            </p>
          ))}
        </div>
      </article>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Lane</th>
              <th style={headerCellStyle}>Source surface</th>
              <th style={headerCellStyle}>Truth label</th>
              <th style={headerCellStyle}>Authorization model</th>
              <th style={headerCellStyle}>Runtime admission</th>
              <th style={headerCellStyle}>Summary</th>
              <th style={headerCellStyle}>Next gate</th>
            </tr>
          </thead>
          <tbody>
            {appApprovalSessionDashboardRows.map((row) => (
              <tr key={`${row.lane}:${row.truthLabel}`}>
                <td style={bodyCellStyle}>{row.lane}</td>
                <td style={bodyCellStyle}>
                  <code>{row.sourceSurface}</code>
                </td>
                <td style={bodyCellStyle}>
                  <StatusChip label={row.truthLabel} tone={getTruthTone(row.truthLabel)} />
                </td>
                <td style={bodyCellStyle}>{row.authorizationModel}</td>
                <td style={bodyCellStyle}>{row.runtimeAdmission}</td>
                <td style={bodyCellStyle}>{row.summary}</td>
                <td style={bodyCellStyle}>{row.nextGate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ ...summaryMutedTextStyle, margin: 0 }}>
        Recommended next packet: <strong>Editor placement proof-only readiness audit</strong>.
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

function getTruthTone(label: ApprovalSessionTruthLabel): "neutral" | "info" | "success" | "warning" | "danger" {
  if (label === "admitted-real") {
    return "success";
  }
  if (label === "preflight-only" || label === "gui-demo") {
    return "info";
  }
  if (label === "blocked") {
    return "danger";
  }
  return "neutral";
}

function getGateStateTone(state: ApprovalSessionGateState): "neutral" | "info" | "success" | "warning" | "danger" {
  if (state === "explicit_on") {
    return "info";
  }
  if (state === "invalid_default_off") {
    return "danger";
  }
  return "warning";
}

const chipWrapStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const topGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
} satisfies CSSProperties;

const stackStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const matrixRowStyle = {
  display: "grid",
  gap: 8,
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
  minWidth: 1180,
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
