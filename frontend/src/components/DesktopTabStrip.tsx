import type { CSSProperties } from "react";

export type DesktopTabStripItem = {
  id: string;
  label: string;
  detail?: string | null;
  badge?: string | null;
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
  border: "1px solid rgba(137, 156, 196, 0.2)",
  borderRadius: 18,
  padding: "12px 14px",
  background: "rgba(244, 248, 255, 0.78)",
  color: "#1b3256",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const activeTabButtonStyle = {
  borderColor: "rgba(33, 87, 201, 0.32)",
  background: "linear-gradient(145deg, rgba(222, 237, 255, 0.96) 0%, rgba(247, 250, 255, 0.94) 100%)",
  boxShadow: "0 14px 28px rgba(41, 83, 165, 0.14)",
} satisfies CSSProperties;

const tabHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
} satisfies CSSProperties;

const tabBadgeStyle = {
  border: "1px solid rgba(25, 118, 210, 0.24)",
  borderRadius: 999,
  padding: "4px 8px",
  background: "rgba(224, 241, 255, 0.84)",
  color: "#0e4c92",
  fontSize: 11,
  fontWeight: 700,
} satisfies CSSProperties;

const tabDetailStyle = {
  color: "#597199",
  fontSize: 12,
  lineHeight: 1.4,
} satisfies CSSProperties;
