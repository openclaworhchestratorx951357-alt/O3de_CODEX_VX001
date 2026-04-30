import type { CSSProperties } from "react";

import { getHomeLaunchCockpits } from "./registry/cockpitRegistry";
import type { CockpitId } from "./registry/cockpitRegistryTypes";

type CockpitLauncherDeckProps = {
  onLaunchCockpit: (cockpitId: CockpitId) => void;
};

export default function CockpitLauncherDeck({ onLaunchCockpit }: CockpitLauncherDeckProps) {
  const launchCockpits = getHomeLaunchCockpits();

  return (
    <section aria-label="Cockpit launcher deck" data-testid="cockpit-launcher-deck" style={shellStyle}>
      <header style={headerStyle}>
        <strong>Cockpit launcher deck</strong>
        <p style={detailStyle}>
          Launch first-class cockpit apps from registry definitions. Navigation only; no prompt execution or mutation is triggered automatically.
        </p>
      </header>
      <div style={gridStyle}>
        {launchCockpits.map((cockpit) => (
          <article key={cockpit.id} style={cardStyle} data-testid={`cockpit-launcher-card-${cockpit.id}`}>
            <div style={cardHeaderStyle}>
              <strong>{cockpit.homeCard.title}</strong>
              <span style={truthBadgeStyle}>{cockpit.homeCard.truthState}</span>
            </div>
            <p style={detailStyle}>{cockpit.homeCard.description}</p>
            <p style={detailStyle}><strong>Safety:</strong> {cockpit.homeCard.safetyNote}</p>
            <button
              type="button"
              onClick={() => onLaunchCockpit(cockpit.id)}
              style={buttonStyle}
            >
              {cockpit.homeCard.primaryActionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

const shellStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  padding: 12,
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const headerStyle = {
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const gridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
} satisfies CSSProperties;

const cardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  padding: 10,
  background: "var(--app-panel-bg-muted)",
  display: "grid",
  gap: 8,
  minWidth: 0,
} satisfies CSSProperties;

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
} satisfies CSSProperties;

const truthBadgeStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  textTransform: "uppercase",
} satisfies CSSProperties;

const detailStyle = {
  margin: 0,
  fontSize: 13,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const buttonStyle = {
  border: "1px solid #5faeff",
  borderRadius: 8,
  padding: "7px 10px",
  background: "var(--app-panel-elevated)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontWeight: 700,
} satisfies CSSProperties;
