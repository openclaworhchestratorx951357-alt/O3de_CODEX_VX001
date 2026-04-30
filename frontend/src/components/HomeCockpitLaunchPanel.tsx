import type { CSSProperties } from "react";

type HomeCockpitLaunchPanelProps = {
  onOpenCreateGame?: () => void;
  onOpenCreateMovie?: () => void;
  onOpenLoadProject?: () => void;
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
  blocked: string;
  nextSafeAction: string;
  actionLabel: string;
  onClick?: () => void;
};

export default function HomeCockpitLaunchPanel({
  onOpenCreateGame,
  onOpenCreateMovie,
  onOpenLoadProject,
  onOpenAssetForge,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenRecords,
}: HomeCockpitLaunchPanelProps) {
  const cards: CockpitLaunchCard[] = [
    {
      id: "create-game",
      title: "Create Game Cockpit",
      detail: "Build a game through staged concept, level, entity, component, and review steps.",
      truthState: "mission cockpit / narrow admitted editor actions + read-only support",
      blocked: "Full game generation and broad mutation remain blocked.",
      nextSafeAction: "Open cockpit and start with inspect or a narrow admitted editor plan.",
      actionLabel: "Open Create Game",
      onClick: onOpenCreateGame,
    },
    {
      id: "create-movie",
      title: "Create Movie Cockpit",
      detail: "Plan cinematic shots, camera placeholders, and proof-only prop placement review.",
      truthState: "planning + narrow editor actions + proof-only placement",
      blocked: "Render/export automation and placement writes remain blocked.",
      nextSafeAction: "Open cockpit and use proof-only templates before any future admission packet.",
      actionLabel: "Open Create Movie",
      onClick: onOpenCreateMovie,
    },
    {
      id: "load-project",
      title: "Load Project Cockpit",
      detail: "Verify active target, bridge status, and readiness before authoring prompts.",
      truthState: "read-only / configuration preflight",
      blocked: "Project registration and project file writes are not admitted in this packet.",
      nextSafeAction: "Open cockpit and verify target checklist before continuing.",
      actionLabel: "Open Load Project",
      onClick: onOpenLoadProject,
    },
  ];

  return (
    <section aria-label="Cockpit launch shortcuts" data-testid="home-cockpit-launch-panel" style={styles.shell}>
      <header style={styles.header}>
        <strong>Cockpit launch shortcuts</strong>
        <p style={styles.detail}>
          Create Game, Create Movie, and Load Project now run as first-class cockpit environments in the App OS shell.
        </p>
      </header>

      <div style={styles.grid}>
        {cards.map((card) => (
          <article key={card.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <strong>{card.title}</strong>
              <span style={styles.truthBadge}>{card.truthState}</span>
            </div>
            <p style={styles.detail}><strong>Does:</strong> {card.detail}</p>
            <p style={styles.detail}><strong>Blocked:</strong> {card.blocked}</p>
            <p style={styles.detail}><strong>Next safe action:</strong> {card.nextSafeAction}</p>
            <button type="button" onClick={card.onClick} disabled={!card.onClick} style={styles.primaryButton}>
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
