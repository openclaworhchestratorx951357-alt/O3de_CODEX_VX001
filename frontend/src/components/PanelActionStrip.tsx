import type { CSSProperties } from "react";

type PanelActionStripProps = {
  title?: string;
  description?: string | null;
  items: readonly string[];
};

export default function PanelActionStrip({
  title = "What to do first",
  description = null,
  items,
}: PanelActionStripProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <span style={badgeStyle}>Start here</span>
        <div style={titleGroupStyle}>
          <strong style={titleStyle}>{title}</strong>
          {description ? <span style={descriptionStyle}>{description}</span> : null}
        </div>
      </div>
      <div style={gridStyle}>
        {items.map((item, index) => (
          <article key={`${index + 1}-${item}`} style={cardStyle}>
            <div style={stepHeaderStyle}>
              <span aria-hidden="true" style={stepBadgeStyle}>{index + 1}</span>
              <strong style={stepLabelStyle}>Step {index + 1}</strong>
            </div>
            <p style={stepTextStyle}>{item}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const sectionStyle = {
  display: "grid",
  gap: 10,
  marginBottom: 16,
  padding: "12px 14px",
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const headerStyle = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  flexWrap: "wrap",
} satisfies CSSProperties;

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--app-pill-radius)",
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const titleGroupStyle = {
  display: "grid",
  gap: 4,
  minWidth: 0,
  flex: "1 1 240px",
} satisfies CSSProperties;

const titleStyle = {
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const descriptionStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
  lineHeight: 1.45,
} satisfies CSSProperties;

const gridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "start",
} satisfies CSSProperties;

const cardStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  padding: "10px 12px",
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const stepHeaderStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
} satisfies CSSProperties;

const stepBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1,
} satisfies CSSProperties;

const stepLabelStyle = {
  color: "var(--app-text-color)",
  fontSize: 13,
} satisfies CSSProperties;

const stepTextStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  fontSize: 13,
  lineHeight: 1.5,
  overflowWrap: "anywhere",
} satisfies CSSProperties;
