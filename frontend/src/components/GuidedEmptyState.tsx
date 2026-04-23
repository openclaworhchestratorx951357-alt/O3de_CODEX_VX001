import type { CSSProperties } from "react";

type GuidedEmptyStateProps = {
  message: string;
  title?: string;
  description?: string | null;
  steps?: readonly string[];
  exampleTitle?: string;
  exampleBody?: string | null;
};

export default function GuidedEmptyState({
  message,
  title = "Start here",
  description = null,
  steps = [],
  exampleTitle = "Example",
  exampleBody = null,
}: GuidedEmptyStateProps) {
  const hasGuidance = Boolean(description) || steps.length > 0 || Boolean(exampleBody);

  if (!hasGuidance) {
    return <p style={simpleMessageStyle}>{message}</p>;
  }

  return (
    <article style={emptyStateStyle} role="note" aria-label={title}>
      <div style={headerStyle}>
        <span aria-hidden="true" style={infoMarkerStyle}>i</span>
        <div style={titleGroupStyle}>
          <strong style={titleStyle}>{title}</strong>
          <p style={messageStyle}>{message}</p>
        </div>
      </div>

      {description ? (
        <p style={descriptionStyle}>{description}</p>
      ) : null}

      {steps.length > 0 ? (
        <ol style={stepListStyle}>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}

      {exampleBody ? (
        <details style={exampleDetailsStyle}>
          <summary style={exampleSummaryStyle}>{exampleTitle}</summary>
          <p style={exampleBodyStyle}>{exampleBody}</p>
        </details>
      ) : null}
    </article>
  );
}

const simpleMessageStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.5,
} satisfies CSSProperties;

const emptyStateStyle = {
  display: "grid",
  gap: 12,
  padding: "14px 16px",
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const headerStyle = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
} satisfies CSSProperties;

const infoMarkerStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1,
} satisfies CSSProperties;

const titleGroupStyle = {
  display: "grid",
  gap: 4,
  minWidth: 0,
} satisfies CSSProperties;

const titleStyle = {
  color: "var(--app-text-color)",
  fontSize: 16,
} satisfies CSSProperties;

const messageStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const descriptionStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.5,
} satisfies CSSProperties;

const stepListStyle = {
  display: "grid",
  gap: 8,
  margin: 0,
  paddingLeft: 22,
  color: "var(--app-text-color)",
  lineHeight: 1.5,
} satisfies CSSProperties;

const exampleDetailsStyle = {
  padding: "10px 12px",
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const exampleSummaryStyle = {
  cursor: "pointer",
  color: "var(--app-text-color)",
  fontWeight: 700,
} satisfies CSSProperties;

const exampleBodyStyle = {
  margin: "8px 0 0",
  color: "var(--app-muted-color)",
  lineHeight: 1.5,
  overflowWrap: "anywhere",
} satisfies CSSProperties;
