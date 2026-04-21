import type { CSSProperties, ReactNode } from "react";

type DesktopWindowProps = {
  title: string;
  subtitle?: string | null;
  helpTooltip?: string | null;
  toolbar?: ReactNode;
  children: ReactNode;
};

export default function DesktopWindow({
  title,
  subtitle = null,
  helpTooltip = null,
  toolbar = null,
  children,
}: DesktopWindowProps) {
  return (
    <section style={windowStyle}>
      <div style={windowHeaderStyle}>
        <div style={windowTitleGroupStyle}>
          <div style={windowControlsStyle}>
            <span style={{ ...windowControlStyle, background: "var(--app-window-control-minimize)" }} />
            <span style={{ ...windowControlStyle, background: "var(--app-window-control-maximize)" }} />
            <span style={{ ...windowControlStyle, background: "var(--app-window-control-close)" }} />
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <strong style={windowTitleStyle}>{title}</strong>
            {subtitle ? (
              <span style={windowSubtitleStyle}>{subtitle}</span>
            ) : null}
          </div>
        </div>
        {toolbar || helpTooltip ? (
          <div style={windowToolbarStyle}>
            {helpTooltip ? (
              <span
                aria-label={`${title} guide`}
                title={helpTooltip}
                style={windowHelpBadgeStyle}
              >
                How to use
              </span>
            ) : null}
            {toolbar}
          </div>
        ) : null}
      </div>
      <div style={windowBodyStyle}>
        {children}
      </div>
    </section>
  );
}

const windowStyle = {
  display: "grid",
  gap: 16,
  padding: "var(--app-panel-padding)",
  borderRadius: "var(--app-window-radius)",
  background: "var(--app-panel-bg-alt)",
  border: "1px solid var(--app-panel-border)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const windowHeaderStyle = {
  display: "flex",
  gap: 16,
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap",
} satisfies CSSProperties;

const windowTitleGroupStyle = {
  display: "flex",
  gap: 14,
  alignItems: "flex-start",
} satisfies CSSProperties;

const windowControlsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  paddingTop: 4,
} satisfies CSSProperties;

const windowControlStyle = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  boxShadow: "var(--app-window-control-shadow)",
} satisfies CSSProperties;

const windowTitleStyle = {
  fontSize: 19,
  lineHeight: 1.1,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const windowSubtitleStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
  lineHeight: 1.45,
} satisfies CSSProperties;

const windowToolbarStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
} satisfies CSSProperties;

const windowHelpBadgeStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
} satisfies CSSProperties;

const windowBodyStyle = {
  display: "grid",
  gap: 16,
} satisfies CSSProperties;
