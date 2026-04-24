import type { CSSProperties, ReactNode } from "react";

type GuidedAdvancedSectionProps = {
  guidedMode: boolean;
  title: string;
  description: string;
  children: ReactNode;
};

export default function GuidedAdvancedSection({
  guidedMode,
  title,
  description,
  children,
}: GuidedAdvancedSectionProps) {
  if (!guidedMode) {
    return <>{children}</>;
  }

  return (
    <details style={detailsStyle}>
      <summary style={summaryStyle}>
        <span style={summaryTitleStyle}>{title}</span>
        <span style={summaryHintStyle}>Show advanced panels</span>
      </summary>
      <p style={descriptionStyle}>{description}</p>
      <div style={bodyStyle}>{children}</div>
    </details>
  );
}

const detailsStyle = {
  display: "grid",
  gap: 12,
  minWidth: 0,
  padding: "14px 16px",
  borderRadius: "var(--app-panel-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg-muted)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const summaryStyle = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  cursor: "pointer",
  color: "var(--app-text-color)",
  fontWeight: 700,
} satisfies CSSProperties;

const summaryTitleStyle = {
  minWidth: 0,
} satisfies CSSProperties;

const summaryHintStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "5px 10px",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const descriptionStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.5,
} satisfies CSSProperties;

const bodyStyle = {
  display: "grid",
  gap: 16,
  minWidth: 0,
} satisfies CSSProperties;
