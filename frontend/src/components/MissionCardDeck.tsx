import type { CSSProperties } from "react";

import CockpitPromptTemplatePanel from "./cockpits/CockpitPromptTemplatePanel";
import { getCockpitDefinition } from "./cockpits/registry/cockpitRegistry";

type MissionCardDeckProps = {
  latestRunId?: string | null;
  latestExecutionId?: string | null;
  latestArtifactId?: string | null;
  onViewLatestRun?: () => void;
  onViewExecution?: () => void;
  onViewArtifact?: () => void;
  onViewEvidence?: () => void;
  onOpenPromptStudio?: () => void;
  onOpenAssetForge?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
  onLaunchInspectTemplate?: () => void;
  onLaunchCreateEntityTemplate?: () => void;
  onLaunchAddMeshTemplate?: () => void;
  onLaunchPlacementProofTemplate?: () => void;
  promptTemplateActionHandlers?: Partial<Record<string, (() => void) | undefined>>;
};

type MissionCard = {
  id: string;
  title: string;
  does: string;
  truthState: string;
  destination: "Prompt" | "Asset Forge" | "Runtime" | "Records" | "Review";
  safeBecause: string;
  blocked: string;
  nextUnlock: string;
};

const cards: MissionCard[] = [
  {
    id: "inspect-project",
    title: "Inspect project",
    does: "Collects read-only project/target evidence before any mutation request.",
    truthState: "admitted-real read-only",
    destination: "Prompt",
    safeBecause: "Read-only inspection path does not mutate O3DE project content.",
    blocked: "No mutation surface is requested in this mission.",
    nextUnlock: "Use inspection evidence to choose the next narrow admitted or proof-only step.",
  },
  {
    id: "create-safe-entity",
    title: "Create safe O3DE entity",
    does: "Plans/executes narrow root-level named entity creation in admitted corridors.",
    truthState: "admitted-real narrow",
    destination: "Prompt",
    safeBecause: "Scope is bounded to allowlisted entity-create behavior.",
    blocked: "Broader transform/prefab/material mutation remains blocked.",
    nextUnlock: "Keep exact corridor boundaries and verify readback evidence.",
  },
  {
    id: "add-allowlisted-component",
    title: "Add allowlisted component",
    does: "Guides component-add intents through allowlisted component boundaries.",
    truthState: "admitted-real narrow",
    destination: "Prompt",
    safeBecause: "Non-allowlisted components are refused by policy.",
    blocked: "Generic/broad component mutation remains non-admitted.",
    nextUnlock: "Add targeted readback and rollback evidence before widening.",
  },
  {
    id: "asset-forge-candidate",
    title: "Asset Forge candidate",
    does: "Builds candidate intent and review metadata for generated-asset flow.",
    truthState: "demo / plan-only",
    destination: "Asset Forge",
    safeBecause: "Candidate planning is non-mutating and label-explicit.",
    blocked: "Provider generation execution is blocked.",
    nextUnlock: "Separate admitted generation corridor with explicit safety gates.",
  },
  {
    id: "stage-generated-asset",
    title: "Stage generated asset",
    does: "Prepares deterministic stage/readback planning for one bounded candidate.",
    truthState: "plan-only / preflight-only",
    destination: "Asset Forge",
    safeBecause: "Bounded path policy and readback-first posture are explicit.",
    blocked: "Asset Processor execution and project writes are not admitted in this mission shell.",
    nextUnlock: "Exact staged-path admission with proof and revert plan.",
  },
  {
    id: "placement-proof-only",
    title: "Placement proof-only",
    does: "Records a bounded placement proof candidate using staged asset, level/entity/component, and evidence references.",
    truthState: "proof-only / fail-closed",
    destination: "Prompt",
    safeBecause: "Fail-closed policy keeps execution non-admitted and non-mutating.",
    blocked: "`execution_admitted=false` and `placement_write_admitted=false`.",
    nextUnlock: "Exact placement admission corridor with readback and revert/restore proof.",
  },
  {
    id: "review-latest-run",
    title: "Review latest run",
    does: "Routes to persisted run/execution/artifact evidence for operator review.",
    truthState: "reviewable",
    destination: "Review",
    safeBecause: "Evidence review is read-only and truth-label driven.",
    blocked: "No new runtime execution is admitted by review alone.",
    nextUnlock: "Use review output to pick one next narrow packet.",
  },
];

const homePromptTemplates = getCockpitDefinition("home")?.promptTemplates ?? [];

function destinationAction(
  destination: MissionCard["destination"],
  actions: MissionCardDeckProps,
): { label: string; onClick?: () => void } {
  if (destination === "Prompt") {
    return { label: "Open Prompt Studio", onClick: actions.onOpenPromptStudio };
  }
  if (destination === "Asset Forge") {
    return { label: "Open Asset Forge", onClick: actions.onOpenAssetForge };
  }
  if (destination === "Runtime") {
    return { label: "Open Runtime Overview", onClick: actions.onOpenRuntimeOverview };
  }
  return { label: "Open Records", onClick: actions.onOpenRecords };
}

function templateAction(
  cardId: MissionCard["id"],
  actions: MissionCardDeckProps,
): { id: string; label: string; truthLabel: string; promptText: string; actionLabel: string; note?: string; onClick?: () => void } | null {
  const templateIdByCard: Partial<Record<MissionCard["id"], string>> = {
    "inspect-project": "inspect-project",
    "create-safe-entity": "create-safe-entity",
    "add-allowlisted-component": "add-allowlisted-mesh",
    "placement-proof-only": "placement-proof-only",
  };
  const templateId = templateIdByCard[cardId];
  if (!templateId) {
    return null;
  }
  const template = homePromptTemplates.find((entry) => entry.id === templateId);
  if (!template) {
    return null;
  }
  const fallbackActionsByTemplateId: Partial<Record<string, (() => void) | undefined>> = {
    "inspect-project": actions.onLaunchInspectTemplate,
    "create-safe-entity": actions.onLaunchCreateEntityTemplate,
    "add-allowlisted-mesh": actions.onLaunchAddMeshTemplate,
    "placement-proof-only": actions.onLaunchPlacementProofTemplate,
  };
  const actionLabelByTemplateId: Partial<Record<string, string>> = {
    "inspect-project": "Load inspect template in Prompt Studio",
    "create-safe-entity": "Load create-entity template in Prompt Studio",
    "add-allowlisted-mesh": "Load add-component template in Prompt Studio",
    "placement-proof-only": "Load placement proof-only template in Prompt Studio",
  };
  if (cardId === "inspect-project") {
    return {
      id: template.id,
      label: template.label,
      truthLabel: template.safetyLabels.join(" / "),
      promptText: template.text,
      actionLabel: actionLabelByTemplateId[template.id] ?? "Load template in Prompt Studio",
      onClick: actions.promptTemplateActionHandlers?.[template.id] ?? fallbackActionsByTemplateId[template.id],
    };
  }
  if (cardId === "create-safe-entity") {
    return {
      id: template.id,
      label: template.label,
      truthLabel: template.safetyLabels.join(" / "),
      promptText: template.text,
      actionLabel: actionLabelByTemplateId[template.id] ?? "Load template in Prompt Studio",
      onClick: actions.promptTemplateActionHandlers?.[template.id] ?? fallbackActionsByTemplateId[template.id],
    };
  }
  if (cardId === "add-allowlisted-component") {
    return {
      id: template.id,
      label: template.label,
      truthLabel: template.safetyLabels.join(" / "),
      promptText: template.text,
      actionLabel: actionLabelByTemplateId[template.id] ?? "Load template in Prompt Studio",
      onClick: actions.promptTemplateActionHandlers?.[template.id] ?? fallbackActionsByTemplateId[template.id],
    };
  }
  if (cardId === "placement-proof-only") {
    return {
      id: template.id,
      label: template.label,
      truthLabel: template.safetyLabels.join(" / "),
      promptText: template.text,
      actionLabel: actionLabelByTemplateId[template.id] ?? "Load template in Prompt Studio",
      note: "Explicit truth: placement execution is non-admitted, placement write is non-admitted, and no mutation occurred.",
      onClick: actions.promptTemplateActionHandlers?.[template.id] ?? fallbackActionsByTemplateId[template.id],
    };
  }
  return null;
}

export default function MissionCardDeck(props: MissionCardDeckProps) {
  return (
    <section aria-label="Mission card deck" style={styles.shell} data-testid="mission-card-deck">
      <header style={styles.header}>
        <strong>Mission-first creator workflow</strong>
        <p style={styles.detail}>
          {"Start mission -> describe intent -> preview plan -> execute admitted/proof-only safe step -> review evidence -> continue next safe step."}
        </p>
      </header>

      <div style={styles.actionRail}>
        <button type="button" onClick={props.onViewLatestRun} disabled={!props.onViewLatestRun} style={styles.button}>View latest run ({props.latestRunId ?? "none"})</button>
        <button type="button" onClick={props.onViewExecution} disabled={!props.onViewExecution} style={styles.button}>View execution ({props.latestExecutionId ?? "none"})</button>
        <button type="button" onClick={props.onViewArtifact} disabled={!props.onViewArtifact} style={styles.button}>View artifact ({props.latestArtifactId ?? "none"})</button>
        <button type="button" onClick={props.onViewEvidence} disabled={!props.onViewEvidence} style={styles.button}>View evidence</button>
        <button type="button" onClick={props.onOpenPromptStudio} disabled={!props.onOpenPromptStudio} style={styles.button}>Open Prompt Studio</button>
        <button type="button" onClick={props.onOpenRuntimeOverview} disabled={!props.onOpenRuntimeOverview} style={styles.button}>Open Runtime Overview</button>
        <button type="button" onClick={props.onOpenRecords} disabled={!props.onOpenRecords} style={styles.button}>Open Records</button>
      </div>

      <div style={styles.grid}>
        {cards.map((card) => {
          const primaryAction = destinationAction(card.destination, props);
          const contextualTemplateAction = templateAction(card.id, props);
          return (
            <article key={card.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>{card.title}</strong>
                <span style={styles.truth}>{card.truthState}</span>
              </div>
              <p style={styles.detail}><strong>Does:</strong> {card.does}</p>
              <p style={styles.detail}><strong>Primary destination:</strong> {card.destination}</p>
              <p style={styles.detail}><strong>Why this is safe:</strong> {card.safeBecause}</p>
              <p style={styles.detail}><strong>What remains blocked:</strong> {card.blocked}</p>
              <p style={styles.detail}><strong>Next unlock:</strong> {card.nextUnlock}</p>

              {contextualTemplateAction ? (
                <CockpitPromptTemplatePanel
                  title="Suggested prompt template"
                  detail="Prefill only. Open Prompt Studio, preview plan, then execute manually if admitted."
                  templates={[
                    {
                      id: contextualTemplateAction.id,
                      label: contextualTemplateAction.label,
                      truthLabel: contextualTemplateAction.truthLabel,
                      promptText: contextualTemplateAction.promptText,
                      actionLabel: contextualTemplateAction.actionLabel,
                      note: contextualTemplateAction.note,
                      onAction: contextualTemplateAction.onClick,
                    },
                  ]}
                  dataTestId={`mission-card-template-${card.id}`}
                />
              ) : null}

              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={!primaryAction.onClick}
                style={styles.primaryButton}
              >
                {primaryAction.label}
              </button>
            </article>
          );
        })}
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
  actionRail: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
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
  truth: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "2px 9px",
    fontSize: 11,
    textTransform: "uppercase",
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
