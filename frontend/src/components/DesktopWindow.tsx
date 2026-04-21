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
            <span style={{ ...windowControlStyle, background: "#ffbd44" }} />
            <span style={{ ...windowControlStyle, background: "#00ca56" }} />
            <span style={{ ...windowControlStyle, background: "#ff605c" }} />
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
  padding: 18,
  borderRadius: 28,
  background: "rgba(251, 253, 255, 0.88)",
  border: "1px solid rgba(137, 156, 196, 0.22)",
  boxShadow: "0 24px 48px rgba(58, 84, 136, 0.12)",
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
  boxShadow: "0 1px 3px rgba(18, 32, 51, 0.18)",
} satisfies CSSProperties;

const windowTitleStyle = {
  fontSize: 19,
  lineHeight: 1.1,
  color: "#142238",
} satisfies CSSProperties;

const windowSubtitleStyle = {
  color: "#5a7198",
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
  border: "1px solid rgba(25, 118, 210, 0.24)",
  borderRadius: 999,
  padding: "6px 10px",
  background: "rgba(224, 241, 255, 0.82)",
  color: "#0e4c92",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
} satisfies CSSProperties;

const windowBodyStyle = {
  display: "grid",
  gap: 16,
} satisfies CSSProperties;
