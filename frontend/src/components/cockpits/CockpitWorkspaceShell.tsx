import type { CSSProperties, ReactNode } from "react";

import DesktopWindow from "../DesktopWindow";

export type CockpitAction = {
  label: string;
  onClick?: () => void;
};

export type CockpitPipelineStep = {
  id: string;
  name: string;
  does: string;
  truthState: string;
  blocker: string;
  nextSafeAction: string;
};

export type CockpitToolCard = {
  id: string;
  title: string;
  truthState: string;
  description: string;
  blocked: string;
  nextSafeAction: string;
  actionLabel?: string;
  onAction?: () => void;
};

export type CockpitPromptTemplate = {
  id: string;
  label: string;
  truthLabels: string;
  promptText: string;
};

export type CockpitBlockedCapability = {
  id: string;
  label: string;
  reason: string;
  nextUnlock: string;
};

type CockpitWorkspaceShellProps = {
  title: string;
  subtitle: string;
  truthLabel: string;
  missionPurpose: string;
  commandActions: CockpitAction[];
  pipelineTitle: string;
  pipelineSteps: CockpitPipelineStep[];
  toolCardsTitle: string;
  toolCards: CockpitToolCard[];
  promptTemplates: CockpitPromptTemplate[];
  blockedCapabilities: CockpitBlockedCapability[];
  truthRail?: ReactNode;
  reviewNote: string;
};

export default function CockpitWorkspaceShell({
  title,
  subtitle,
  truthLabel,
  missionPurpose,
  commandActions,
  pipelineTitle,
  pipelineSteps,
  toolCardsTitle,
  toolCards,
  promptTemplates,
  blockedCapabilities,
  truthRail,
  reviewNote,
}: CockpitWorkspaceShellProps) {
  return (
    <DesktopWindow
      title={title}
      subtitle={subtitle}
      helpTooltip="Mission cockpit workspace"
      guideTitle="How to use this cockpit"
      guideChecklist={[
        "Start with command bar actions to select the safest next move.",
        "Read truth states before expecting runtime mutation behavior.",
        "Use templates as suggested prompt text only; execute from Prompt Studio with preview.",
      ]}
    >
      <section aria-label={`${title} identity`} style={styles.identityCard}>
        <div style={styles.identityHeader}>
          <strong>{title}</strong>
          <span style={styles.truthBadge}>{truthLabel}</span>
        </div>
        <p style={styles.detail}><strong>Mission purpose:</strong> {missionPurpose}</p>
      </section>

      {truthRail ?? null}

      <section aria-label={`${title} command bar`} style={styles.panel}>
        <strong>Command bar</strong>
        <div style={styles.actionRow}>
          {commandActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={!action.onClick}
              style={styles.button}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section aria-label={pipelineTitle} style={styles.panel}>
        <strong>{pipelineTitle}</strong>
        <div style={styles.grid}>
          {pipelineSteps.map((step) => (
            <article key={step.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>{step.name}</strong>
                <span style={styles.truthPill}>{step.truthState}</span>
              </div>
              <p style={styles.detail}><strong>Does:</strong> {step.does}</p>
              <p style={styles.detail}><strong>Blocker:</strong> {step.blocker}</p>
              <p style={styles.detail}><strong>Next safe action:</strong> {step.nextSafeAction}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={toolCardsTitle} style={styles.panel}>
        <strong>{toolCardsTitle}</strong>
        <div style={styles.grid}>
          {toolCards.map((card) => (
            <article key={card.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>{card.title}</strong>
                <span style={styles.truthPill}>{card.truthState}</span>
              </div>
              <p style={styles.detail}>{card.description}</p>
              <p style={styles.detail}><strong>Blocked/allowed:</strong> {card.blocked}</p>
              <p style={styles.detail}><strong>Next safe action:</strong> {card.nextSafeAction}</p>
              {card.actionLabel ? (
                <button
                  type="button"
                  onClick={card.onAction}
                  disabled={!card.onAction}
                  style={styles.primaryButton}
                >
                  {card.actionLabel}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section aria-label={`${title} suggested prompt templates`} style={styles.panel}>
        <strong>Suggested prompt templates</strong>
        <div style={styles.templateGrid}>
          {promptTemplates.map((template) => (
            <article key={template.id} style={styles.templateCard}>
              <strong>{template.label}</strong>
              <p style={styles.detail}><strong>Truth label:</strong> {template.truthLabels}</p>
              <pre style={styles.templateBody}>{template.promptText}</pre>
            </article>
          ))}
        </div>
      </section>

      <section aria-label={`${title} blocked capabilities`} style={styles.blockedPanel}>
        <strong>Blocked capabilities and future unlocks</strong>
        <ul style={styles.list}>
          {blockedCapabilities.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>: {item.reason}. Next unlock: {item.nextUnlock}.
            </li>
          ))}
        </ul>
      </section>

      <p style={styles.detail}><strong>Review note:</strong> {reviewNote}</p>
    </DesktopWindow>
  );
}

const styles = {
  identityCard: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 12,
    background: "var(--app-panel-bg)",
    display: "grid",
    gap: 8,
  },
  identityHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  truthBadge: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "2px 9px",
    fontSize: 11,
    textTransform: "uppercase",
    background: "var(--app-panel-bg-muted)",
  },
  panel: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 12,
    background: "var(--app-panel-bg)",
    display: "grid",
    gap: 10,
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 10,
  },
  card: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    display: "grid",
    gap: 8,
    background: "var(--app-panel-bg-muted)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  truthPill: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 11,
    textTransform: "uppercase",
  },
  templateGrid: {
    display: "grid",
    gap: 10,
  },
  templateCard: {
    border: "1px solid rgba(173, 204, 238, 0.55)",
    borderRadius: 10,
    background: "rgba(24, 40, 62, 0.45)",
    padding: 10,
    display: "grid",
    gap: 8,
  },
  templateBody: {
    margin: 0,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontSize: 12,
  },
  blockedPanel: {
    border: "1px solid rgba(236, 119, 143, 0.55)",
    borderRadius: 10,
    background: "rgba(74, 24, 35, 0.24)",
    padding: 10,
    display: "grid",
    gap: 8,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    display: "grid",
    gap: 6,
  },
  detail: {
    margin: 0,
    fontSize: 13,
    color: "var(--app-subtle-color)",
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
