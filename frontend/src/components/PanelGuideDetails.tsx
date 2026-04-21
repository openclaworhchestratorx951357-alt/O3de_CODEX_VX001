import type { CSSProperties } from "react";

type PanelGuideDetailsProps = {
  title?: string;
  tooltip?: string | null;
  checklist?: readonly string[];
};

export default function PanelGuideDetails({
  title = "How to use this panel",
  tooltip = null,
  checklist = [],
}: PanelGuideDetailsProps) {
  if (!tooltip && checklist.length === 0) {
    return null;
  }

  return (
    <details style={detailsStyle}>
      <summary
        title={tooltip ?? undefined}
        style={summaryStyle}
      >
        {title}
      </summary>
      {tooltip ? (
        <p style={bodyStyle}>{tooltip}</p>
      ) : null}
      {checklist.length > 0 ? (
        <ul style={listStyle}>
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </details>
  );
}

const detailsStyle = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const summaryStyle = {
  cursor: "pointer",
  fontWeight: 700,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const bodyStyle = {
  marginTop: 10,
  marginBottom: 8,
  color: "var(--app-muted-color)",
  lineHeight: 1.5,
} satisfies CSSProperties;

const listStyle = {
  margin: 0,
  paddingLeft: 18,
  color: "var(--app-muted-color)",
  lineHeight: 1.55,
} satisfies CSSProperties;
