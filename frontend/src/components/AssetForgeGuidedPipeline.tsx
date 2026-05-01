import type { CSSProperties } from "react";

import CockpitPromptTemplatePanel from "./cockpits/CockpitPromptTemplatePanel";
import { getCockpitDefinition } from "./cockpits/registry/cockpitRegistry";

type AssetForgeGuidedPipelineProps = {
  onOpenPromptStudio?: () => void;
  onLaunchInspectTemplate?: () => void;
  onLaunchPlacementProofTemplate?: () => void;
  promptTemplateActionHandlers?: Partial<Record<string, (() => void) | undefined>>;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
  onViewEvidence?: () => void;
};

type PipelineStep = {
  id: string;
  label: string;
  truth: string;
  availableAction: string;
  blocker: string;
  nextUnlock: string;
};

const pipelineSteps: PipelineStep[] = [
  {
    id: "describe",
    label: "Describe",
    truth: "demo / plan-only",
    availableAction: "Write creative prompt intent in the generation workspace.",
    blocker: "Provider execution remains blocked.",
    nextUnlock: "Admitted provider corridor with explicit authorization + evidence.",
  },
  {
    id: "candidate",
    label: "Candidate",
    truth: "demo",
    availableAction: "Review/select candidate shells and metadata.",
    blocker: "No real generation output admitted in this shell.",
    nextUnlock: "Proof-backed generated candidate ingestion.",
  },
  {
    id: "preflight",
    label: "Preflight",
    truth: "preflight-only",
    availableAction: "Run read-only checks for provider/blender/runtime posture.",
    blocker: "No Blender execution admitted.",
    nextUnlock: "Bounded prep corridor with explicit policy gates.",
  },
  {
    id: "stage-plan",
    label: "Stage Plan",
    truth: "plan-only",
    availableAction: "Generate deterministic staging path + policy checklist.",
    blocker: "Plan does not execute writes.",
    nextUnlock: "Separate exact write admission corridor.",
  },
  {
    id: "stage-write",
    label: "Stage Write",
    truth: "blocked / fail-closed",
    availableAction: "Review gating details only.",
    blocker: "Project writes are non-admitted in this mission shell.",
    nextUnlock: "Server-owned write admission with readback + revert proof.",
  },
  {
    id: "readback",
    label: "Readback",
    truth: "preflight-only read-only",
    availableAction: "Collect bounded assetdb/catalog evidence.",
    blocker: "No placement mutation admitted from readback.",
    nextUnlock: "Use evidence for exact corridor decisions.",
  },
  {
    id: "placement-proof",
    label: "Placement Proof",
    truth: "proof-only / fail-closed",
    availableAction: "Prepare prompt-executable placement proof candidate.",
    blocker: "execution_admitted=false; placement_write_admitted=false.",
    nextUnlock: "Exact placement admission corridor with readback + revert/restore proof.",
  },
  {
    id: "review",
    label: "Review",
    truth: "reviewable",
    availableAction: "Open Records and Prompt summary for latest proof-only output.",
    blocker: "Review does not authorize execution by itself.",
    nextUnlock: "Operator-approved next safe packet.",
  },
];

const blockedExplanations = [
  {
    label: "Provider generation blocked",
    gate: "generation_execution_status=blocked",
    unlock: "admitted provider execution corridor",
  },
  {
    label: "Blender execution blocked",
    gate: "blender_prep_execution_status=blocked",
    unlock: "bounded blender execution admission",
  },
  {
    label: "Asset Processor execution blocked",
    gate: "asset processor execution not admitted in this shell",
    unlock: "separate admitted processing corridor",
  },
  {
    label: "Placement execution blocked",
    gate: "execution_admitted=false",
    unlock: "exact server-owned placement admission gate",
  },
  {
    label: "Placement write blocked",
    gate: "placement_write_admitted=false",
    unlock: "write corridor with readback + revert/restore proof",
  },
  {
    label: "Material/prefab mutation blocked",
    gate: "broad mutation surfaces non-admitted",
    unlock: "future exact bounded mutation packets",
  },
];

export default function AssetForgeGuidedPipeline({
  onOpenPromptStudio,
  onLaunchInspectTemplate,
  onLaunchPlacementProofTemplate,
  promptTemplateActionHandlers,
  onOpenRuntimeOverview,
  onOpenRecords,
  onViewEvidence,
}: AssetForgeGuidedPipelineProps) {
  const promptTemplates = (getCockpitDefinition("asset-forge")?.promptTemplates ?? []).map((template) => ({
    id: template.id,
    label: template.label,
    truthLabel: template.safetyLabels.join(" / "),
    promptText: template.text,
    actionLabel: template.id === "placement-proof-only"
      ? "Load placement proof-only template in Prompt Studio"
      : "Load inspect template in Prompt Studio",
    onAction: promptTemplateActionHandlers?.[template.id]
      ?? (template.id === "placement-proof-only" ? onLaunchPlacementProofTemplate : onLaunchInspectTemplate),
  }));

  return (
    <section aria-label="Asset Forge guided pipeline" style={styles.shell} data-testid="asset-forge-guided-pipeline">
      <header style={styles.header}>
        <strong>Asset Forge guided pipeline</strong>
        <p style={styles.detail}>
          {"Describe -> Candidate -> Preflight -> Stage Plan -> Stage Write -> Readback -> Placement Proof -> Review"}
        </p>
      </header>

      <div style={styles.actionRow}>
        <button type="button" onClick={onOpenPromptStudio} disabled={!onOpenPromptStudio} style={styles.button}>Open Prompt Studio</button>
        <button type="button" onClick={onOpenRuntimeOverview} disabled={!onOpenRuntimeOverview} style={styles.button}>Open Runtime Overview</button>
        <button type="button" onClick={onOpenRecords} disabled={!onOpenRecords} style={styles.button}>Open Records</button>
        <button type="button" onClick={onViewEvidence} disabled={!onViewEvidence} style={styles.button}>View evidence</button>
      </div>

      <CockpitPromptTemplatePanel
        title="Contextual prompt templates (prefill only)"
        detail="Templates load into Prompt Studio for preview. They do not auto-execute or bypass admission gates."
        templates={promptTemplates}
        dataTestId="asset-forge-template-panel"
      />

      <div style={styles.grid}>
        {pipelineSteps.map((step) => (
          <article key={step.id} style={styles.stepCard}>
            <div style={styles.stepHeader}>
              <strong>{step.label}</strong>
              <span style={styles.truth}>{step.truth}</span>
            </div>
            <p style={styles.detail}><strong>Available action:</strong> {step.availableAction}</p>
            <p style={styles.detail}><strong>Blocker:</strong> {step.blocker}</p>
            <p style={styles.detail}><strong>Next unlock:</strong> {step.nextUnlock}</p>
          </article>
        ))}
      </div>

      <section style={styles.blockedSection} aria-label="Blocked action explanations">
        <strong>Blocked action explanations</strong>
        <ul style={styles.list}>
          {blockedExplanations.map((entry) => (
            <li key={entry.label}>
              <strong>{entry.label}</strong>: blocked by {entry.gate}; next unlock: {entry.unlock}.
            </li>
          ))}
        </ul>
      </section>

      <p style={styles.detail}>
        Placement proof-only is prompt-executable but fail-closed: no placement execution, no placement writes, and no mutation admitted.
      </p>
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
  actionRow: {
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 8,
  },
  stepCard: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    display: "grid",
    gap: 6,
    background: "var(--app-panel-bg-muted)",
  },
  stepHeader: {
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
  blockedSection: {
    border: "1px solid rgba(236, 119, 143, 0.55)",
    borderRadius: 8,
    background: "rgba(74, 24, 35, 0.24)",
    padding: "8px 10px",
    display: "grid",
    gap: 6,
  },
  list: {
    margin: 0,
    paddingLeft: 18,
    display: "grid",
    gap: 4,
  },
} satisfies Record<string, CSSProperties>;
