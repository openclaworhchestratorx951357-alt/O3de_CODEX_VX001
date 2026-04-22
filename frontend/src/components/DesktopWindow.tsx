import type { CSSProperties, ReactNode } from "react";

type DesktopWindowProps = {
  title: string;
  subtitle?: string | null;
  helpTooltip?: string | null;
  toolbar?: ReactNode;
  variant?: "primary" | "nested";
  children: ReactNode;
};

export default function DesktopWindow({
  title,
  subtitle = null,
  helpTooltip = null,
  toolbar = null,
  variant = "primary",
  children,
}: DesktopWindowProps) {
  const nested = variant === "nested";

  return (
    <section style={{ ...windowStyle, ...(nested ? nestedWindowStyle : null) }}>
      <div style={{ ...windowHeaderStyle, ...(nested ? nestedWindowHeaderStyle : null) }}>
        <div style={windowTitleGroupStyle}>
          {!nested ? (
            <div style={windowControlsStyle}>
              <span style={{ ...windowControlStyle, background: "var(--app-window-control-minimize)" }} />
              <span style={{ ...windowControlStyle, background: "var(--app-window-control-maximize)" }} />
              <span style={{ ...windowControlStyle, background: "var(--app-window-control-close)" }} />
            </div>
          ) : null}
          <div style={{ display: "grid", gap: 4 }}>
            <strong style={{ ...windowTitleStyle, ...(nested ? nestedWindowTitleStyle : null) }}>{title}</strong>
            {subtitle ? (
              <span style={{ ...windowSubtitleStyle, ...(nested ? nestedWindowSubtitleStyle : null) }}>{subtitle}</span>
            ) : null}
          </div>
        </div>
        {toolbar || helpTooltip ? (
          <div style={{ ...windowToolbarStyle, ...(nested ? nestedWindowToolbarStyle : null) }}>
            {helpTooltip ? (
              <span
                aria-label={`${title} guide`}
                title={helpTooltip}
                style={windowHelpBadgeStyle}
              >
                <span aria-hidden="true" style={windowHelpIconStyle}>i</span>
                <span>Guide</span>
              </span>
            ) : null}
            {toolbar}
          </div>
          ) : null}
      </div>
      <div style={{ ...windowBodyStyle, ...(nested ? nestedWindowBodyStyle : null) }}>
        {children}
      </div>
    </section>
  );
}

const windowStyle = {
  display: "grid",
  gap: 16,
  minWidth: 0,
  padding: "var(--app-panel-padding)",
  borderRadius: "var(--app-window-radius)",
  background: "var(--app-panel-bg-alt)",
  border: "1px solid var(--app-panel-border)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const nestedWindowStyle = {
  gap: 12,
  padding: "14px 16px",
  background: "color-mix(in srgb, var(--app-panel-bg) 72%, var(--app-panel-bg-alt) 28%)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
} satisfies CSSProperties;

const windowHeaderStyle = {
  display: "flex",
  gap: 16,
  minWidth: 0,
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap",
} satisfies CSSProperties;

const nestedWindowHeaderStyle = {
  gap: 12,
  alignItems: "center",
} satisfies CSSProperties;

const windowTitleGroupStyle = {
  display: "flex",
  gap: 14,
  minWidth: 0,
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

const nestedWindowTitleStyle = {
  fontSize: 16,
} satisfies CSSProperties;

const windowSubtitleStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
  lineHeight: 1.45,
} satisfies CSSProperties;

const nestedWindowSubtitleStyle = {
  fontSize: 12,
  lineHeight: 1.35,
} satisfies CSSProperties;

const windowToolbarStyle = {
  display: "flex",
  gap: 8,
  minWidth: 0,
  alignItems: "center",
  flexWrap: "wrap",
} satisfies CSSProperties;

const nestedWindowToolbarStyle = {
  width: "100%",
} satisfies CSSProperties;

const windowHelpBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
} satisfies CSSProperties;

const windowHelpIconStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  borderRadius: "50%",
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-panel-bg)",
  fontSize: 12,
  lineHeight: 1,
} satisfies CSSProperties;

const windowBodyStyle = {
  display: "grid",
  gap: 16,
  minWidth: 0,
} satisfies CSSProperties;

const nestedWindowBodyStyle = {
  gap: 14,
} satisfies CSSProperties;
