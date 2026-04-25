import type { CSSProperties, ReactNode } from "react";

type ExpandablePanelSectionProps = {
  title: string;
  preview?: string | null;
  children: ReactNode;
  defaultOpen?: boolean;
};

export default function ExpandablePanelSection({
  title,
  preview = null,
  children,
  defaultOpen = false,
}: ExpandablePanelSectionProps) {
  return (
    <details open={defaultOpen} style={detailsStyle}>
      <summary style={summaryStyle}>
        <span style={summaryTitleStyle}>{title}</span>
        {preview ? <span style={summaryPreviewStyle}>{preview}</span> : null}
      </summary>
      <div style={bodyStyle}>
        {children}
      </div>
    </details>
  );
}

const detailsStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  padding: "10px 12px",
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const summaryStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  minWidth: 0,
  color: "var(--app-text-color)",
  fontWeight: 700,
} satisfies CSSProperties;

const summaryTitleStyle = {
  minWidth: 0,
} satisfies CSSProperties;

const summaryPreviewStyle = {
  minWidth: 0,
  color: "var(--app-muted-color)",
  fontSize: 12,
  fontWeight: 500,
  textAlign: "right" as const,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const bodyStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  color: "var(--app-muted-color)",
} satisfies CSSProperties;
