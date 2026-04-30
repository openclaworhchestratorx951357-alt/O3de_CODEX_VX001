import type { CSSProperties, ReactNode } from "react";

import type { CockpitLayoutZone } from "./cockpitLayoutTypes";

type DockablePanelProps = {
  panelId: string;
  title: string;
  subtitle?: string;
  truthState?: string;
  collapsed: boolean;
  collapsible: boolean;
  onToggleCollapse: () => void;
  onMoveToZone?: (zone: CockpitLayoutZone) => void;
  body: ReactNode;
  footer?: ReactNode;
  actionSlot?: ReactNode;
  minHeight?: number;
  minWidth?: number;
  defaultHeight?: number;
  scrollMode?: "panel" | "content" | "none";
};

const zoneChoices: readonly CockpitLayoutZone[] = [
  "left",
  "center",
  "right",
  "bottom",
  "top",
];

export default function DockablePanel({
  panelId,
  title,
  subtitle,
  truthState,
  collapsed,
  collapsible,
  onToggleCollapse,
  onMoveToZone,
  body,
  footer,
  actionSlot,
  minHeight = 170,
  minWidth = 180,
  defaultHeight = 220,
  scrollMode = "content",
}: DockablePanelProps) {
  const panelHeight = collapsed ? undefined : Math.max(defaultHeight, minHeight);
  const shouldBodyScroll = scrollMode === "content";
  const shouldPanelScroll = scrollMode === "panel";

  return (
    <article
      aria-label={`${title} panel`}
      data-testid={`dockable-panel-${panelId}`}
      style={{
        ...rootStyle,
        minHeight,
        minWidth,
        flex: collapsed ? "0 0 auto" : `1 1 ${panelHeight}px`,
        ...(shouldPanelScroll ? panelScrollModeStyle : null),
      }}
    >
      <header style={headerStyle}>
        <div style={titleGroupStyle}>
          <h3 style={titleStyle}>{title}</h3>
          {subtitle ? <p style={subtitleStyle}>{subtitle}</p> : null}
        </div>
        <div style={actionsStyle}>
          {truthState ? <span style={truthPillStyle}>{truthState}</span> : null}
          {actionSlot}
          {onMoveToZone ? (
            <details>
              <summary style={summaryActionStyle}>Move</summary>
              <div style={menuStyle}>
                {zoneChoices.map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => onMoveToZone(zone)}
                    style={menuButtonStyle}
                  >
                    {`Send to ${zone}`}
                  </button>
                ))}
              </div>
            </details>
          ) : null}
          <button
            type="button"
            aria-label={collapsed ? `Expand ${title} panel` : `Collapse ${title} panel`}
            onClick={onToggleCollapse}
            disabled={!collapsible}
            style={toggleButtonStyle}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </header>

      {!collapsed ? (
        <div
          data-testid={`dockable-panel-body-${panelId}`}
          style={{
            ...bodyStyle,
            ...(shouldBodyScroll ? bodyScrollModeStyle : null),
          }}
        >
          {body}
        </div>
      ) : null}

      {!collapsed && footer ? (
        <footer style={footerStyle}>
          {footer}
        </footer>
      ) : null}
    </article>
  );
}

const rootStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 12,
  background: "var(--app-panel-bg)",
  boxShadow: "var(--app-shadow-soft)",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr) auto",
} satisfies CSSProperties;

const panelScrollModeStyle = {
  overflow: "auto",
} satisfies CSSProperties;

const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  padding: "10px 11px",
  borderBottom: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg-alt)",
  minWidth: 0,
} satisfies CSSProperties;

const titleGroupStyle = {
  display: "grid",
  gap: 4,
  minWidth: 0,
} satisfies CSSProperties;

const titleStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.25,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const subtitleStyle = {
  margin: 0,
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const actionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const truthPillStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  color: "var(--app-subtle-color)",
  textTransform: "uppercase",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const summaryActionStyle = {
  cursor: "pointer",
  fontSize: 12,
  color: "var(--app-text-color)",
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: "2px 7px",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const menuStyle = {
  marginTop: 6,
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  background: "var(--app-panel-bg)",
  padding: 6,
  display: "grid",
  gap: 4,
  minWidth: 130,
} satisfies CSSProperties;

const menuButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 7,
  padding: "4px 7px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  fontSize: 12,
  cursor: "pointer",
  textAlign: "left",
} satisfies CSSProperties;

const toggleButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  padding: "4px 9px",
  cursor: "pointer",
  fontSize: 12,
} satisfies CSSProperties;

const bodyStyle = {
  minWidth: 0,
  minHeight: 0,
  padding: "10px 11px",
  display: "grid",
  gap: 8,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const bodyScrollModeStyle = {
  overflow: "auto",
} satisfies CSSProperties;

const footerStyle = {
  padding: "8px 11px 10px",
  borderTop: "1px solid var(--app-panel-border)",
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;
