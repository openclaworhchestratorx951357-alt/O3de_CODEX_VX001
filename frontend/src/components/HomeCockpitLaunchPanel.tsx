import type { CSSProperties } from "react";

import { getHomeLaunchCockpits } from "./cockpits/registry/cockpitRegistry";
import type { CockpitId } from "./cockpits/registry/cockpitRegistryTypes";

type HomeCockpitLaunchPanelProps = {
  onOpenCockpit?: (cockpitId: CockpitId) => void;
  onOpenAssetForge?: () => void;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
};

type CockpitLaunchCard = {
  id: string;
  title: string;
  detail: string;
  truthState: string;
  safetyNote: string;
  actionLabel: string;
  cockpitId: CockpitId;
};

export default function HomeCockpitLaunchPanel({
  onOpenCockpit,
  onOpenAssetForge,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenRecords,
}: HomeCockpitLaunchPanelProps) {
  const cards: CockpitLaunchCard[] = getHomeLaunchCockpits().map((cockpit) => ({
    id: cockpit.id,
    cockpitId: cockpit.id,
    title: cockpit.homeCard.title,
    detail: cockpit.homeCard.description,
    truthState: cockpit.homeCard.truthState,
    safetyNote: cockpit.homeCard.safetyNote,
    actionLabel: cockpit.homeCard.primaryActionLabel,
  }));

  return (
    <section aria-label="Cockpit launch shortcuts" data-testid="home-cockpit-launch-panel" style={styles.shell}>
      <header style={styles.header}>
        <strong>Cockpit launch shortcuts</strong>
        <p style={styles.detail}>
          Launch first-class cockpit apps from registry definitions. Add one cockpit definition and it appears here automatically.
        </p>
      </header>

      <div style={styles.grid}>
        {cards.map((card) => (
          <article key={card.id} data-testid={`home-cockpit-card-${card.id}`} style={styles.card}>
            <div style={styles.cardHeader}>
              <strong>{card.title}</strong>
              <span style={styles.truthBadge}>{card.truthState}</span>
            </div>
            <p style={styles.detail}><strong>Does:</strong> {card.detail}</p>
            <p style={styles.detail}><strong>Safety note:</strong> {card.safetyNote}</p>
            <button
              type="button"
              onClick={() => onOpenCockpit?.(card.cockpitId)}
              disabled={!onOpenCockpit}
              style={styles.primaryButton}
            >
              {card.actionLabel}
            </button>
          </article>
        ))}
      </div>

      <div style={styles.secondaryActions}>
        <button type="button" onClick={onOpenPromptStudio} disabled={!onOpenPromptStudio} style={styles.button}>
          Open Prompt Studio
        </button>
        <button type="button" onClick={onOpenAssetForge} disabled={!onOpenAssetForge} style={styles.button}>
          Open Asset Forge
        </button>
        <button type="button" onClick={onOpenRuntimeOverview} disabled={!onOpenRuntimeOverview} style={styles.button}>
          Open Runtime Overview
        </button>
        <button type="button" onClick={onOpenRecords} disabled={!onOpenRecords} style={styles.button}>
          Open Records
        </button>
      </div>
    </section>
  );
}

const styles = {
  shell: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: "var(--app-card-radius)",
    background: "var(--app-panel-bg)",
    padding: 12,
    display: "grid",
    gap: 10,
  },
  header: {
    display: "grid",
    gap: 6,
  },
  detail: {
    margin: 0,
    fontSize: 13,
    color: "var(--app-subtle-color)",
  },
  grid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
  card: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--app-panel-bg-muted)",
    display: "grid",
    gap: 8,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  truthBadge: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 11,
    textTransform: "uppercase",
  },
  secondaryActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "6px 10px",
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    cursor: "pointer",
  },
  primaryButton: {
    border: "1px solid #5faeff",
    borderRadius: 8,
    padding: "7px 10px",
    background: "var(--app-panel-elevated)",
    color: "var(--app-text-color)",
    cursor: "pointer",
    fontWeight: 700,
  },
} satisfies Record<string, CSSProperties>;
