import type { CSSProperties } from "react";

export type DesktopTabStripItem = {
  id: string;
  label: string;
  detail?: string | null;
  badge?: string | null;
  helpTooltip?: string | null;
};

type DesktopTabStripProps = {
  items: readonly DesktopTabStripItem[];
  activeItemId: string;
  onSelectItem: (itemId: string) => void;
};

export default function DesktopTabStrip({
  items,
  activeItemId,
  onSelectItem,
}: DesktopTabStripProps) {
  return (
    <div style={tabStripStyle}>
      {items.map((item) => {
        const active = item.id === activeItemId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectItem(item.id)}
            title={item.helpTooltip ?? undefined}
            style={{
              ...tabButtonStyle,
              ...(active ? activeTabButtonStyle : null),
            }}
          >
            <div style={tabHeaderStyle}>
              <strong>{item.label}</strong>
              {item.badge ? (
                <span style={tabBadgeStyle}>{item.badge}</span>
              ) : null}
            </div>
            {item.detail ? (
              <span style={tabDetailStyle}>{item.detail}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

const tabStripStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  minWidth: 0,
} satisfies CSSProperties;

const tabButtonStyle = {
  position: "relative",
  flex: "0 0 auto",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  textAlign: "left",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "var(--app-shadow-soft)",
  minHeight: 34,
  maxWidth: 240,
} satisfies CSSProperties;

const activeTabButtonStyle = {
  borderColor: "var(--app-accent-strong)",
  background: "linear-gradient(145deg, var(--app-accent-soft) 0%, var(--app-panel-bg-alt) 100%)",
  boxShadow: "var(--app-shadow-strong)",
} satisfies CSSProperties;

const tabHeaderStyle = {
  display: "inline-flex",
  justifyContent: "center",
  gap: 8,
  alignItems: "center",
  whiteSpace: "nowrap" as const,
} satisfies CSSProperties;

const tabBadgeStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "4px 8px",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  fontSize: 11,
  fontWeight: 700,
} satisfies CSSProperties;

const tabDetailStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  border: 0,
} satisfies CSSProperties;
