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
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
} satisfies CSSProperties;

const tabButtonStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "12px 14px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 6,
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const activeTabButtonStyle = {
  borderColor: "var(--app-accent-strong)",
  background: "linear-gradient(145deg, var(--app-accent-soft) 0%, var(--app-panel-bg-alt) 100%)",
  boxShadow: "var(--app-shadow-strong)",
} satisfies CSSProperties;

const tabHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
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
  color: "var(--app-muted-color)",
  fontSize: 12,
  lineHeight: 1.4,
} satisfies CSSProperties;
