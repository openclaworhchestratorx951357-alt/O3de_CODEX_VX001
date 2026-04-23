import type { CSSProperties } from "react";

import type { RecommendationTone } from "../lib/recommendations";
import {
  summaryActionButtonStyle,
  summaryCardStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

export type WorkspaceNextStepEntry = {
  id: string;
  label: string;
  detail: string;
  reason: string;
  signals?: readonly string[];
  actionLabel: string;
  opensLabel?: string;
  tone: RecommendationTone;
  onAction: () => void;
};

export type WorkspaceNextStepRecentAction = {
  id: string;
  stepId: string;
  label: string;
  actionLabel: string;
  opensLabel?: string;
  workspaceId: string;
  workspaceLabel: string;
  usedAt: string;
};

type WorkspaceNextStepsPanelProps = {
  entries: readonly WorkspaceNextStepEntry[];
  recentActions?: readonly WorkspaceNextStepRecentAction[];
  onClearRecentActions?: () => void;
  onReplayRecentAction?: (entry: WorkspaceNextStepRecentAction) => void;
};

const toneStyles: Record<RecommendationTone, CSSProperties> = {
  info: {
    background: "var(--app-accent-soft)",
    borderColor: "var(--app-accent-strong)",
    color: "var(--app-text-color)",
  },
  success: {
    background: "var(--app-success-bg)",
    borderColor: "var(--app-success-border)",
    color: "var(--app-success-text)",
  },
  warning: {
    background: "var(--app-warning-bg)",
    borderColor: "var(--app-warning-border)",
    color: "var(--app-warning-text)",
  },
};

export default function WorkspaceNextStepsPanel({
  entries,
  recentActions = [],
  onClearRecentActions,
  onReplayRecentAction,
}: WorkspaceNextStepsPanelProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section aria-label="Workspace next steps" style={panelStyle}>
      <div style={headerStyle}>
        <span style={eyebrowStyle}>Guided next step</span>
        <strong>What should I do next?</strong>
        <p style={descriptionStyle}>
          These buttons use current app state to point you toward the safest next panel without hiding
          any advanced controls.
        </p>
      </div>

      <div style={entryGridStyle}>
        {entries.map((entry) => (
          <article key={entry.id} style={entryCardStyle}>
            <span style={{ ...badgeStyle, ...toneStyles[entry.tone] }}>{entry.label}</span>
            <p style={entryDetailStyle}>{entry.detail}</p>
            <details style={detailsStyle}>
              <summary style={summaryStyle}>Why this?</summary>
              <p style={reasonStyle}>{entry.reason}</p>
              {entry.signals?.length ? (
                <ul style={signalListStyle}>
                  {entry.signals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              ) : null}
            </details>
            {entry.opensLabel ? (
              <p style={opensLabelStyle}>
                Opens: <strong>{entry.opensLabel}</strong>
              </p>
            ) : null}
            <button type="button" onClick={entry.onAction} style={summaryActionButtonStyle}>
              {entry.actionLabel}
            </button>
          </article>
        ))}
      </div>

      {recentActions.length > 0 ? (
        <div style={recentPanelStyle} aria-label="Recently used next-step actions">
          <div style={recentHeaderStyle}>
            <strong>Recent guided jumps</strong>
            {onClearRecentActions ? (
              <button type="button" onClick={onClearRecentActions} style={clearButtonStyle}>
                Clear
              </button>
            ) : null}
          </div>
          <ul style={recentListStyle}>
            {recentActions.map((entry) => (
              <li key={entry.id} style={recentItemStyle}>
                <span style={recentSummaryStyle}>
                  <strong>{entry.label}</strong>
                  <span style={recentMetaStyle}>Action: {entry.actionLabel}</span>
                  {entry.opensLabel ? (
                    <span style={recentMetaStyle}>Opens: {entry.opensLabel}</span>
                  ) : null}
                </span>
                <span style={recentTimeStyle}>
                  from {entry.workspaceLabel} at {formatRecentActionTime(entry.usedAt)}
                </span>
                {onReplayRecentAction ? (
                  <button
                    type="button"
                    onClick={() => onReplayRecentAction(entry)}
                    style={recentJumpButtonStyle}
                  >
                    Jump again
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function formatRecentActionTime(usedAt: string): string {
  return new Date(usedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

const panelStyle = {
  ...summarySectionStyle,
  display: "grid",
  gap: 12,
  background: "linear-gradient(135deg, var(--app-panel-bg-muted) 0%, var(--app-accent-soft) 100%)",
} satisfies CSSProperties;

const headerStyle = {
  display: "grid",
  gap: 4,
} satisfies CSSProperties;

const eyebrowStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const descriptionStyle = {
  ...summaryMutedTextStyle,
  margin: 0,
  lineHeight: 1.45,
} satisfies CSSProperties;

const entryGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} satisfies CSSProperties;

const entryCardStyle = {
  ...summaryCardStyle,
  alignContent: "start",
} satisfies CSSProperties;

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-start",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const entryDetailStyle = {
  ...summaryMutedTextStyle,
  margin: 0,
  lineHeight: 1.5,
} satisfies CSSProperties;

const detailsStyle = {
  display: "grid",
  gap: 8,
  padding: "8px 10px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const summaryStyle = {
  cursor: "pointer",
  color: "var(--app-text-color)",
  fontWeight: 700,
  fontSize: 13,
} satisfies CSSProperties;

const reasonStyle = {
  ...summaryMutedTextStyle,
  margin: "8px 0 0",
  lineHeight: 1.45,
} satisfies CSSProperties;

const signalListStyle = {
  margin: "8px 0 0",
  paddingLeft: 18,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const opensLabelStyle = {
  ...summaryMutedTextStyle,
  margin: 0,
  fontSize: 12,
  lineHeight: 1.4,
} satisfies CSSProperties;

const recentPanelStyle = {
  display: "grid",
  gap: 8,
  padding: "10px 12px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const recentHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
} satisfies CSSProperties;

const clearButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "4px 9px",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontSize: 12,
} satisfies CSSProperties;

const recentListStyle = {
  listStyle: "none",
  display: "grid",
  gap: 6,
  margin: 0,
  padding: 0,
} satisfies CSSProperties;

const recentItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const recentSummaryStyle = {
  display: "grid",
  gap: 3,
  minWidth: 220,
} satisfies CSSProperties;

const recentMetaStyle = {
  color: "var(--app-muted-color)",
  fontSize: 12,
} satisfies CSSProperties;

const recentTimeStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 12,
  textAlign: "right",
} satisfies CSSProperties;

const recentJumpButtonStyle = {
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "5px 10px",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;
