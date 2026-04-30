import { useMemo, useState, type CSSProperties } from "react";

import type {
  CockpitCategory,
  CockpitPanelDefinition,
  CockpitTruthState,
} from "./registry/cockpitRegistryTypes";

type CockpitLayoutStyle =
  | "creator-viewport"
  | "inspector-workspace"
  | "records-dashboard"
  | "prompt-workflow"
  | "empty-cockpit";

type PromptTemplateDraft = {
  id: string;
  label: string;
  text: string;
  safetyLabels: string;
  truthState: CockpitTruthState;
};

type BlockedCapabilityDraft = {
  id: string;
  label: string;
  reason: string;
  nextUnlock: string;
};

type CockpitBuilderDraft = {
  name: string;
  cockpitId: string;
  category: CockpitCategory;
  subtitle: string;
  description: string;
  truthState: CockpitTruthState;
  homeCardTitle: string;
  homeCardDescription: string;
  primaryActionLabel: string;
  safetyNote: string;
  layoutStyle: CockpitLayoutStyle;
  includeTopZone: boolean;
  includeLeftZone: boolean;
  includeCenterZone: boolean;
  includeRightZone: boolean;
  includeBottomZone: boolean;
  promptTemplates: PromptTemplateDraft[];
  blockedCapabilities: BlockedCapabilityDraft[];
};

type CockpitDefinitionPreview = {
  id: string;
  routeKey: string;
  category: CockpitCategory;
  title: string;
  navLabel: string;
  navSubtitle: string;
  workspaceSubtitle: string;
  description: string;
  truthState: CockpitTruthState;
  homeCard: {
    title: string;
    description: string;
    truthState: CockpitTruthState;
    primaryActionLabel: string;
    safetyNote: string;
  };
  panels: CockpitPanelDefinition[];
  promptTemplates: Array<{
    id: string;
    label: string;
    description: string;
    text: string;
    truthState: CockpitTruthState;
    safetyLabels: string[];
    autoExecute: false;
  }>;
  blockedCapabilities: Array<{
    id: string;
    label: string;
    reason: string;
    nextUnlock: string;
  }>;
  notes: {
    localOnly: true;
    autoExecute: false;
    backendDispatch: false;
    fileWrites: false;
  };
};

export const COCKPIT_BUILDER_SESSION_PREVIEW_KEY = "cockpit-builder-session-preview-v1";

const categoryOptions: CockpitCategory[] = [
  "start",
  "create",
  "build",
  "operate",
  "inspect",
  "system",
];

const truthStateOptions: CockpitTruthState[] = [
  "read-only",
  "plan-only",
  "preflight-only",
  "proof-only",
  "fail-closed",
  "admitted-real",
  "gated-real",
  "blocked",
  "unknown",
  "demo",
];

const layoutStyleLabels: Record<CockpitLayoutStyle, string> = {
  "creator-viewport": "Creator viewport",
  "inspector-workspace": "Inspector workspace",
  "records-dashboard": "Records dashboard",
  "prompt-workflow": "Prompt workflow",
  "empty-cockpit": "Empty cockpit",
};

const layoutPanelsByStyle: Record<CockpitLayoutStyle, CockpitPanelDefinition[]> = {
  "creator-viewport": [
    { id: "top-command-strip", title: "Command strip", zone: "top", contentType: "pipeline" },
    { id: "left-tools", title: "Tools and outliner", zone: "left", contentType: "tool-cards" },
    { id: "center-viewport", title: "Dominant viewport", zone: "center", contentType: "viewport" },
    { id: "right-inspector", title: "Inspector and truth", zone: "right", contentType: "inspector" },
    { id: "bottom-evidence", title: "Evidence drawer", zone: "bottom", contentType: "evidence" },
  ],
  "inspector-workspace": [
    { id: "top-command-strip", title: "Command strip", zone: "top", contentType: "pipeline" },
    { id: "left-navigation", title: "Navigation", zone: "left", contentType: "tool-cards" },
    { id: "center-primary", title: "Primary work area", zone: "center", contentType: "custom" },
    { id: "right-inspector", title: "Inspector", zone: "right", contentType: "inspector" },
    { id: "bottom-evidence", title: "Evidence and prompts", zone: "bottom", contentType: "prompt-templates" },
  ],
  "records-dashboard": [
    { id: "top-summary-strip", title: "Summary strip", zone: "top", contentType: "pipeline" },
    { id: "left-filters", title: "Filters", zone: "left", contentType: "tool-cards" },
    { id: "center-evidence-grid", title: "Evidence grid", zone: "center", contentType: "evidence" },
    { id: "right-details", title: "Details", zone: "right", contentType: "inspector" },
    { id: "bottom-timeline", title: "Timeline drawer", zone: "bottom", contentType: "evidence" },
  ],
  "prompt-workflow": [
    { id: "top-workflow-strip", title: "Workflow strip", zone: "top", contentType: "pipeline" },
    { id: "left-templates", title: "Template browser", zone: "left", contentType: "prompt-templates" },
    { id: "center-prompt-editor", title: "Prompt editor", zone: "center", contentType: "custom" },
    { id: "right-safety", title: "Safety inspector", zone: "right", contentType: "truth-rail" },
    { id: "bottom-evidence", title: "Evidence and logs", zone: "bottom", contentType: "evidence" },
  ],
  "empty-cockpit": [
    { id: "top-strip", title: "Top strip", zone: "top", contentType: "custom" },
    { id: "left-lane", title: "Left lane", zone: "left", contentType: "custom" },
    { id: "center-lane", title: "Center lane", zone: "center", contentType: "custom" },
    { id: "right-lane", title: "Right lane", zone: "right", contentType: "custom" },
    { id: "bottom-lane", title: "Bottom drawer", zone: "bottom", contentType: "custom" },
  ],
};

const initialDraft: CockpitBuilderDraft = {
  name: "New Cockpit",
  cockpitId: "new-cockpit",
  category: "create",
  subtitle: "Generated cockpit preview for mission-first workflow planning.",
  description: "Draft cockpit definition preview generated from the Builder cockpit panel.",
  truthState: "plan-only",
  homeCardTitle: "New Cockpit",
  homeCardDescription: "Open this cockpit preview from Home once committed to the registry.",
  primaryActionLabel: "Open New Cockpit",
  safetyNote: "Preview only. No auto execution or backend dispatch.",
  layoutStyle: "creator-viewport",
  includeTopZone: true,
  includeLeftZone: true,
  includeCenterZone: true,
  includeRightZone: true,
  includeBottomZone: true,
  promptTemplates: [
    {
      id: "template-1",
      label: "Inspect target safely",
      text: "Inspect the active target and summarize readiness. Do not mutate content.",
      safetyLabels: "read-only, no-mutation",
      truthState: "read-only",
    },
  ],
  blockedCapabilities: [
    {
      id: "blocked-1",
      label: "Broad mutation",
      reason: "No admitted mutation corridor is defined for this cockpit yet.",
      nextUnlock: "Design and proof a bounded mutation corridor, then request admission review.",
    },
  ],
};

function slugify(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return normalized || "new-cockpit";
}

export function buildCockpitDefinitionPreview(draft: CockpitBuilderDraft): CockpitDefinitionPreview {
  const id = slugify(draft.cockpitId || draft.name);
  const routeKey = id;
  const zoneSelections: CockpitPanelDefinition["zone"][] = [];
  if (draft.includeTopZone) {
    zoneSelections.push("top");
  }
  if (draft.includeLeftZone) {
    zoneSelections.push("left");
  }
  if (draft.includeCenterZone) {
    zoneSelections.push("center");
  }
  if (draft.includeRightZone) {
    zoneSelections.push("right");
  }
  if (draft.includeBottomZone) {
    zoneSelections.push("bottom");
  }
  const selectedZones = new Set<CockpitPanelDefinition["zone"]>(zoneSelections);
  if (selectedZones.size === 0) {
    selectedZones.add("center");
  }
  if (!selectedZones.has("center")) {
    selectedZones.add("center");
  }

  const stylePanels = layoutPanelsByStyle[draft.layoutStyle];
  const panels = stylePanels
    .filter((panel) => selectedZones.has(panel.zone))
    .map((panel, index) => ({
      ...panel,
      id: `${id}-${panel.zone}-${index + 1}`,
    }));

  return {
    id,
    routeKey,
    category: draft.category,
    title: draft.name.trim() || "New Cockpit",
    navLabel: draft.name.trim() || "New Cockpit",
    navSubtitle: draft.subtitle.trim() || "Generated cockpit preview",
    workspaceSubtitle: draft.subtitle.trim() || "Generated cockpit preview",
    description: draft.description.trim() || "Generated cockpit preview from Builder.",
    truthState: draft.truthState,
    homeCard: {
      title: draft.homeCardTitle.trim() || draft.name.trim() || "New Cockpit",
      description: draft.homeCardDescription.trim() || "Generated Home launcher card preview.",
      truthState: draft.truthState,
      primaryActionLabel: draft.primaryActionLabel.trim() || `Open ${draft.name.trim() || "New Cockpit"}`,
      safetyNote: draft.safetyNote.trim() || "Preview only.",
    },
    panels,
    promptTemplates: draft.promptTemplates
      .map((template, index) => ({
        id: slugify(template.id || `${id}-template-${index + 1}`),
        label: template.label.trim(),
        description: `Prompt template for ${draft.name.trim() || "new cockpit"}`,
        text: template.text.trim(),
        truthState: template.truthState,
        safetyLabels: template.safetyLabels
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
        autoExecute: false as const,
      }))
      .filter((template) => template.label.length > 0 && template.text.length > 0),
    blockedCapabilities: draft.blockedCapabilities
      .map((capability, index) => ({
        id: slugify(capability.id || `${id}-blocked-${index + 1}`),
        label: capability.label.trim(),
        reason: capability.reason.trim() || "Reason not provided yet.",
        nextUnlock: capability.nextUnlock.trim() || "Define the next safe unlock step.",
      }))
      .filter((capability) => capability.label.length > 0),
    notes: {
      localOnly: true,
      autoExecute: false,
      backendDispatch: false,
      fileWrites: false,
    },
  };
}

function parseSessionPreviewList(raw: string | null): CockpitDefinitionPreview[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry) => entry && typeof entry === "object") as CockpitDefinitionPreview[];
  } catch {
    return [];
  }
}

export default function CockpitBuilderPanel() {
  const [draft, setDraft] = useState<CockpitBuilderDraft>(initialDraft);
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const previewDefinition = useMemo(() => buildCockpitDefinitionPreview(draft), [draft]);
  const previewJson = useMemo(() => JSON.stringify(previewDefinition, null, 2), [previewDefinition]);
  const routePreview = previewDefinition.routeKey;

  async function handleCopyPreview() {
    if (!navigator.clipboard?.writeText) {
      setClipboardMessage("Clipboard unavailable. Copy the JSON manually from the preview field.");
      return;
    }
    try {
      await navigator.clipboard.writeText(previewJson);
      setClipboardMessage(`Copied cockpit JSON preview for "${previewDefinition.id}".`);
    } catch (error) {
      setClipboardMessage(
        error instanceof Error
          ? `Clipboard copy failed: ${error.message}`
          : "Clipboard copy failed. Copy the JSON manually from the preview field.",
      );
    }
  }

  function handleSaveSessionPreview() {
    const current = parseSessionPreviewList(window.sessionStorage.getItem(COCKPIT_BUILDER_SESSION_PREVIEW_KEY));
    const next = [previewDefinition, ...current.filter((entry) => entry.id !== previewDefinition.id)].slice(0, 10);
    window.sessionStorage.setItem(COCKPIT_BUILDER_SESSION_PREVIEW_KEY, JSON.stringify(next));
    setSessionMessage(
      `Saved "${previewDefinition.id}" to session preview memory. This is local/session-only and does not modify registry files.`,
    );
  }

  return (
    <section aria-label="Cockpit Builder panel" style={styles.shell}>
      <header style={styles.header}>
        <strong>Cockpit Builder</strong>
        <p style={styles.detail}>
          Build cockpit-definition JSON previews from one form. This panel is frontend-only scaffolding:
          no prompt execution, no backend dispatch, no file writes, no permanent registry mutation.
        </p>
      </header>

      <div style={styles.grid}>
        <label style={styles.field}>
          Cockpit name
          <input
            aria-label="Cockpit name"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            style={styles.input}
          />
        </label>
        <label style={styles.field}>
          Cockpit id
          <input
            aria-label="Cockpit id"
            value={draft.cockpitId}
            onChange={(event) => setDraft((current) => ({ ...current, cockpitId: event.target.value }))}
            style={styles.input}
          />
        </label>
        <label style={styles.field}>
          Category
          <select
            aria-label="Cockpit category"
            value={draft.category}
            onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as CockpitCategory }))}
            style={styles.input}
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label style={styles.field}>
          Truth state
          <select
            aria-label="Cockpit truth state"
            value={draft.truthState}
            onChange={(event) => setDraft((current) => ({ ...current, truthState: event.target.value as CockpitTruthState }))}
            style={styles.input}
          >
            {truthStateOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      <label style={styles.field}>
        Subtitle
        <input
          aria-label="Cockpit subtitle"
          value={draft.subtitle}
          onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))}
          style={styles.input}
        />
      </label>
      <label style={styles.field}>
        Description
        <textarea
          aria-label="Cockpit description"
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          rows={3}
          style={styles.textarea}
        />
      </label>

      <section style={styles.block}>
        <strong>Home launcher card</strong>
        <div style={styles.grid}>
          <label style={styles.field}>
            Card title
            <input
              aria-label="Home card title"
              value={draft.homeCardTitle}
              onChange={(event) => setDraft((current) => ({ ...current, homeCardTitle: event.target.value }))}
              style={styles.input}
            />
          </label>
          <label style={styles.field}>
            Primary action label
            <input
              aria-label="Home card action label"
              value={draft.primaryActionLabel}
              onChange={(event) => setDraft((current) => ({ ...current, primaryActionLabel: event.target.value }))}
              style={styles.input}
            />
          </label>
        </div>
        <label style={styles.field}>
          Card description
          <textarea
            aria-label="Home card description"
            value={draft.homeCardDescription}
            onChange={(event) => setDraft((current) => ({ ...current, homeCardDescription: event.target.value }))}
            rows={2}
            style={styles.textarea}
          />
        </label>
        <label style={styles.field}>
          Safety note
          <textarea
            aria-label="Home card safety note"
            value={draft.safetyNote}
            onChange={(event) => setDraft((current) => ({ ...current, safetyNote: event.target.value }))}
            rows={2}
            style={styles.textarea}
          />
        </label>
      </section>

      <section style={styles.block}>
        <strong>Layout preset</strong>
        <label style={styles.field}>
          Default layout style
          <select
            aria-label="Cockpit layout style"
            value={draft.layoutStyle}
            onChange={(event) => setDraft((current) => ({ ...current, layoutStyle: event.target.value as CockpitLayoutStyle }))}
            style={styles.input}
          >
            {Object.entries(layoutStyleLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <div style={styles.checkboxRow}>
          <label style={styles.checkboxLabel}>
            <input
              aria-label="Include top zone"
              type="checkbox"
              checked={draft.includeTopZone}
              onChange={(event) => setDraft((current) => ({ ...current, includeTopZone: event.target.checked }))}
            />
            top command/pipeline strip
          </label>
          <label style={styles.checkboxLabel}>
            <input
              aria-label="Include left zone"
              type="checkbox"
              checked={draft.includeLeftZone}
              onChange={(event) => setDraft((current) => ({ ...current, includeLeftZone: event.target.checked }))}
            />
            left tools/outliner
          </label>
          <label style={styles.checkboxLabel}>
            <input
              aria-label="Include center zone"
              type="checkbox"
              checked={draft.includeCenterZone}
              onChange={(event) => setDraft((current) => ({ ...current, includeCenterZone: event.target.checked }))}
            />
            center work area
          </label>
          <label style={styles.checkboxLabel}>
            <input
              aria-label="Include right zone"
              type="checkbox"
              checked={draft.includeRightZone}
              onChange={(event) => setDraft((current) => ({ ...current, includeRightZone: event.target.checked }))}
            />
            right inspector/truth
          </label>
          <label style={styles.checkboxLabel}>
            <input
              aria-label="Include bottom zone"
              type="checkbox"
              checked={draft.includeBottomZone}
              onChange={(event) => setDraft((current) => ({ ...current, includeBottomZone: event.target.checked }))}
            />
            bottom evidence/log drawer
          </label>
        </div>
      </section>

      <section style={styles.block}>
        <div style={styles.rowBetween}>
          <strong>Prompt templates (autoExecute forced false)</strong>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              setDraft((current) => ({
                ...current,
                promptTemplates: [
                  ...current.promptTemplates,
                  {
                    id: `template-${current.promptTemplates.length + 1}`,
                    label: "",
                    text: "",
                    safetyLabels: "read-only",
                    truthState: "plan-only",
                  },
                ],
              }));
            }}
          >
            Add template
          </button>
        </div>
        {draft.promptTemplates.map((template, index) => (
          <article key={`${template.id}-${index}`} style={styles.subCard}>
            <div style={styles.grid}>
              <label style={styles.field}>
                Template label
                <input
                  aria-label={`Prompt template ${index + 1} label`}
                  value={template.label}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    promptTemplates: current.promptTemplates.map((entry, entryIndex) => (
                      entryIndex === index ? { ...entry, label: event.target.value } : entry
                    )),
                  }))}
                  style={styles.input}
                />
              </label>
              <label style={styles.field}>
                Safety labels (comma-separated)
                <input
                  aria-label={`Prompt template ${index + 1} safety labels`}
                  value={template.safetyLabels}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    promptTemplates: current.promptTemplates.map((entry, entryIndex) => (
                      entryIndex === index ? { ...entry, safetyLabels: event.target.value } : entry
                    )),
                  }))}
                  style={styles.input}
                />
              </label>
            </div>
            <label style={styles.field}>
              Template text
              <textarea
                aria-label={`Prompt template ${index + 1} text`}
                value={template.text}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  promptTemplates: current.promptTemplates.map((entry, entryIndex) => (
                    entryIndex === index ? { ...entry, text: event.target.value } : entry
                  )),
                }))}
                rows={3}
                style={styles.textarea}
              />
            </label>
            <div style={styles.rowBetween}>
              <span style={styles.metaText}>autoExecute is always false</span>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  setDraft((current) => ({
                    ...current,
                    promptTemplates: current.promptTemplates.filter((_, entryIndex) => entryIndex !== index),
                  }));
                }}
              >
                Remove template
              </button>
            </div>
          </article>
        ))}
      </section>

      <section style={styles.block}>
        <div style={styles.rowBetween}>
          <strong>Blocked capabilities</strong>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              setDraft((current) => ({
                ...current,
                blockedCapabilities: [
                  ...current.blockedCapabilities,
                  {
                    id: `blocked-${current.blockedCapabilities.length + 1}`,
                    label: "",
                    reason: "",
                    nextUnlock: "",
                  },
                ],
              }));
            }}
          >
            Add blocked capability
          </button>
        </div>
        {draft.blockedCapabilities.map((capability, index) => (
          <article key={`${capability.id}-${index}`} style={styles.subCard}>
            <label style={styles.field}>
              Capability label
              <input
                aria-label={`Blocked capability ${index + 1} label`}
                value={capability.label}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  blockedCapabilities: current.blockedCapabilities.map((entry, entryIndex) => (
                    entryIndex === index ? { ...entry, label: event.target.value } : entry
                  )),
                }))}
                style={styles.input}
              />
            </label>
            <label style={styles.field}>
              Reason
              <textarea
                aria-label={`Blocked capability ${index + 1} reason`}
                value={capability.reason}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  blockedCapabilities: current.blockedCapabilities.map((entry, entryIndex) => (
                    entryIndex === index ? { ...entry, reason: event.target.value } : entry
                  )),
                }))}
                rows={2}
                style={styles.textarea}
              />
            </label>
            <label style={styles.field}>
              Next unlock
              <textarea
                aria-label={`Blocked capability ${index + 1} next unlock`}
                value={capability.nextUnlock}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  blockedCapabilities: current.blockedCapabilities.map((entry, entryIndex) => (
                    entryIndex === index ? { ...entry, nextUnlock: event.target.value } : entry
                  )),
                }))}
                rows={2}
                style={styles.textarea}
              />
            </label>
          </article>
        ))}
      </section>

      <article style={styles.previewCard} aria-label="Cockpit definition preview">
        <div style={styles.rowBetween}>
          <strong>JSON definition preview</strong>
          <span style={styles.metaText}>Route key preview: <code>{routePreview}</code></span>
        </div>
        <div style={styles.actionRow}>
          <button type="button" style={styles.primaryButton} onClick={() => void handleCopyPreview()}>
            Copy JSON preview
          </button>
          <button type="button" style={styles.secondaryButton} onClick={handleSaveSessionPreview}>
            Add to Home preview (session-only)
          </button>
        </div>
        {clipboardMessage ? <p style={styles.statusText}>{clipboardMessage}</p> : null}
        {sessionMessage ? <p style={styles.statusText}>{sessionMessage}</p> : null}
        <p style={styles.detail}>
          Safety: preview-only output. No prompts are executed. No backend tools are dispatched.
        </p>
        <textarea
          aria-label="Cockpit JSON preview"
          data-testid="cockpit-builder-json-preview"
          readOnly
          value={previewJson}
          rows={18}
          style={styles.previewArea}
        />
      </article>
    </section>
  );
}

const styles = {
  shell: {
    display: "grid",
    gap: 12,
    minWidth: 0,
  },
  header: {
    display: "grid",
    gap: 6,
  },
  block: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: "var(--app-panel-radius)",
    background: "var(--app-panel-bg)",
    padding: 12,
    display: "grid",
    gap: 10,
  },
  subCard: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    background: "var(--app-panel-bg-muted)",
    padding: 10,
    display: "grid",
    gap: 8,
  },
  grid: {
    display: "grid",
    gap: 10,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  field: {
    display: "grid",
    gap: 6,
    fontSize: 13,
    minWidth: 0,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 8,
    border: "1px solid var(--app-input-border)",
    background: "var(--app-input-bg)",
    color: "var(--app-text-color)",
    padding: "8px 10px",
    font: "inherit",
    minWidth: 0,
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 8,
    border: "1px solid var(--app-input-border)",
    background: "var(--app-input-bg)",
    color: "var(--app-text-color)",
    padding: "8px 10px",
    font: "inherit",
    minWidth: 0,
    resize: "vertical",
    minHeight: 88,
  },
  checkboxRow: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  },
  checkboxLabel: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 13,
  },
  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  actionRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "1px solid var(--app-accent)",
    borderRadius: 8,
    background: "var(--app-accent-soft)",
    color: "var(--app-text-color)",
    padding: "7px 10px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    padding: "7px 10px",
    cursor: "pointer",
  },
  previewCard: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: "var(--app-panel-radius)",
    background: "var(--app-panel-bg)",
    padding: 12,
    display: "grid",
    gap: 10,
    minWidth: 0,
  },
  previewArea: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 8,
    border: "1px solid var(--app-input-border)",
    background: "var(--app-panel-bg-muted)",
    color: "var(--app-text-color)",
    padding: "10px 12px",
    fontFamily: "\"Cascadia Code\", \"Fira Code\", Consolas, monospace",
    fontSize: 12,
    lineHeight: 1.5,
    minWidth: 0,
    resize: "vertical",
  },
  metaText: {
    margin: 0,
    fontSize: 12,
    color: "var(--app-subtle-color)",
  },
  detail: {
    margin: 0,
    fontSize: 13,
    color: "var(--app-subtle-color)",
  },
  statusText: {
    margin: 0,
    fontSize: 12,
    color: "var(--app-text-color)",
  },
} satisfies Record<string, CSSProperties>;
