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
  actionLabel: string;
  tone: RecommendationTone;
  onAction: () => void;
};

type WorkspaceNextStepsPanelProps = {
  entries: readonly WorkspaceNextStepEntry[];
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
            <button type="button" onClick={entry.onAction} style={summaryActionButtonStyle}>
              {entry.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
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
