import type { CSSProperties } from "react";

import {
  cockpitAppRegistry,
  type CockpitAppRegistration,
  type CockpitShellMode,
  type CockpitWorkspaceId,
} from "../lib/cockpitAppRegistry";

type HomeCockpitLaunchPanelProps = {
  registry?: readonly CockpitAppRegistration[];
  onOpenCreateGame?: () => void;
  onOpenCreateMovie?: () => void;
  onOpenLoadProject?: () => void;
  onOpenAssetForge?: () => void;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
};

export default function HomeCockpitLaunchPanel({
  registry,
  onOpenCreateGame,
  onOpenCreateMovie,
  onOpenLoadProject,
  onOpenAssetForge,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenRecords,
}: HomeCockpitLaunchPanelProps) {
  const launchCards = registry ?? cockpitAppRegistry;
  const cardActions: Record<CockpitWorkspaceId, (() => void) | undefined> = {
    "create-game": onOpenCreateGame,
    "create-movie": onOpenCreateMovie,
    "load-project": onOpenLoadProject,
    "asset-forge": onOpenAssetForge,
  };

  return (
    <section aria-label="Cockpit launch shortcuts" data-testid="home-cockpit-launch-panel" style={styles.shell}>
      <header style={styles.header}>
        <strong>Cockpit launch shortcuts</strong>
        <p style={styles.detail}>
          Create Game, Create Movie, Load Project, and Asset Forge now run as first-class cockpit environments in the App OS shell.
        </p>
      </header>

      <div style={styles.grid}>
        {launchCards.map((card) => (
          <article key={card.workspaceId} data-testid={`cockpit-launch-${card.workspaceId}`} style={styles.card}>
            <div style={styles.cardHeader}>
              <strong>{card.launchTitle}</strong>
              <span style={styles.truthBadge}>{formatShellMode(card.shellMode)}</span>
            </div>
            <p style={styles.detail}><strong>Truth:</strong> {card.truthState}</p>
            <p style={styles.detail}><strong>Does:</strong> {card.detail}</p>
            <p style={styles.detail}><strong>Blocked:</strong> {card.blocked}</p>
            <p style={styles.detail}><strong>Next safe action:</strong> {card.nextSafeAction}</p>
            <p style={styles.safetyLine}>{formatSafetyFlags(card)}</p>
            <button
              type="button"
              onClick={cardActions[card.workspaceId]}
              disabled={!cardActions[card.workspaceId]}
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

function formatShellMode(shellMode: CockpitShellMode): string {
  return shellMode === "full-screen-editor" ? "full-screen editor" : "dockable cockpit";
}

function formatSafetyFlags(card: CockpitAppRegistration): string {
  return [
    `execution_admitted=${card.executionAdmitted}`,
    `mutation_admitted=${card.mutationAdmitted}`,
    `provider_generation_admitted=${card.providerGenerationAdmitted}`,
    `blender_execution_admitted=${card.blenderExecutionAdmitted}`,
    `asset_processor_execution_admitted=${card.assetProcessorExecutionAdmitted}`,
    `placement_write_admitted=${card.placementWriteAdmitted}`,
  ].join(" / ");
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
  safetyLine: {
    margin: 0,
    fontSize: 11,
    color: "var(--app-muted-color)",
    overflowWrap: "anywhere",
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
