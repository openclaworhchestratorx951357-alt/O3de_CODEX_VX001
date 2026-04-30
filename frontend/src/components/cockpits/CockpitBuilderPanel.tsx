import { useMemo, useState, type CSSProperties } from "react";

import { toCockpitSlug } from "./registry/createCockpitDefinition";
import type {
  CockpitCategory,
  CockpitPanelBlueprint,
  CockpitTruthState,
} from "./registry/cockpitRegistryTypes";

type LayoutStyle = "creator-viewport" | "inspector-workspace" | "records-dashboard" | "prompt-workflow" | "empty-cockpit";

type BuilderDraft = {
  name: string;
  routeKey: string;
  category: CockpitCategory;
  subtitle: string;
  description: string;
  truthState: CockpitTruthState;
  homeCardTitle: string;
  homeCardDescription: string;
  primaryActionLabel: string;
  layoutStyle: LayoutStyle;
  promptLabel: string;
  promptText: string;
  promptSafetyLabels: string;
  blockedLabel: string;
  blockedReason: string;
  blockedNextUnlock: string;
};

const INITIAL_DRAFT: BuilderDraft = {
  name: "",
  routeKey: "",
  category: "create",
  subtitle: "",
  description: "",
  truthState: "read-only",
  homeCardTitle: "",
  homeCardDescription: "",
  primaryActionLabel: "Open Cockpit",
  layoutStyle: "creator-viewport",
  promptLabel: "Suggested prompt",
  promptText: "",
  promptSafetyLabels: "read-only, preview-first",
  blockedLabel: "",
  blockedReason: "",
  blockedNextUnlock: "",
};

function buildPanelBlueprint(layoutStyle: LayoutStyle): CockpitPanelBlueprint[] {
  const base: CockpitPanelBlueprint[] = [
    {
      id: "command-strip",
      title: "Command strip",
      zone: "top",
      truthState: "read-only",
      contentType: "custom",
    },
    {
      id: "left-tools",
      title: "Left tools",
      zone: "left",
      truthState: "read-only",
      contentType: "tool-cards",
    },
    {
      id: "center-work",
      title: "Center work area",
      zone: "center",
      truthState: "read-only",
      contentType: "viewport",
    },
    {
      id: "right-inspector",
      title: "Right inspector",
      zone: "right",
      truthState: "read-only",
      contentType: "inspector",
    },
    {
      id: "bottom-evidence",
      title: "Bottom evidence",
      zone: "bottom",
      truthState: "read-only",
      contentType: "evidence",
    },
  ];

  if (layoutStyle === "records-dashboard") {
    base[2] = {
      ...base[2],
      title: "Center records dashboard",
      contentType: "custom",
    };
  } else if (layoutStyle === "prompt-workflow") {
    base[1] = {
      ...base[1],
      title: "Left workflow steps",
      contentType: "pipeline",
    };
    base[4] = {
      ...base[4],
      title: "Bottom prompt templates",
      contentType: "prompt-templates",
    };
  } else if (layoutStyle === "inspector-workspace") {
    base[3] = {
      ...base[3],
      title: "Right truth and details",
      contentType: "truth-rail",
    };
  } else if (layoutStyle === "empty-cockpit") {
    return [
      {
        id: "command-strip",
        title: "Command strip",
        zone: "top",
        truthState: "read-only",
        contentType: "custom",
      },
      {
        id: "center-work",
        title: "Center work area",
        zone: "center",
        truthState: "unknown",
        contentType: "custom",
      },
    ];
  }

  return base;
}

export default function CockpitBuilderPanel() {
  const [draft, setDraft] = useState<BuilderDraft>(INITIAL_DRAFT);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const cockpitId = useMemo(() => {
    const routeHint = draft.routeKey.trim() || draft.name;
    return toCockpitSlug(routeHint);
  }, [draft.routeKey, draft.name]);

  const routeKey = cockpitId;
  const panelBlueprint = useMemo(() => buildPanelBlueprint(draft.layoutStyle), [draft.layoutStyle]);

  const previewDefinition = useMemo(() => {
    const safetyLabels = draft.promptSafetyLabels
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    return {
      id: cockpitId || "new-cockpit",
      title: draft.name.trim() || "New Cockpit",
      navLabel: draft.name.trim() || "New Cockpit",
      navSubtitle: draft.subtitle.trim() || "Custom cockpit",
      workspaceTitle: draft.name.trim() || "New Cockpit",
      workspaceSubtitle: draft.description.trim() || "Custom cockpit generated from Builder preview.",
      subtitle: draft.subtitle.trim() || "Custom cockpit",
      category: draft.category,
      description: draft.description.trim() || "",
      truthState: draft.truthState,
      routeKey: routeKey || "new-cockpit",
      homeCard: {
        title: draft.homeCardTitle.trim() || draft.name.trim() || "New Cockpit",
        description: draft.homeCardDescription.trim() || "Launch this cockpit from Home.",
        truthState: draft.truthState,
        primaryActionLabel: draft.primaryActionLabel.trim() || "Open Cockpit",
        safetyNote: "Builder preview only. No backend execution or file writes.",
      },
      commandBar: [
        {
          id: "open-prompt",
          label: "Open Prompt Studio",
          targetWorkspaceId: "prompt",
          truthState: "read-only",
        },
      ],
      pipeline: [
        {
          id: "plan",
          label: "Plan",
          description: "Define the cockpit mission and safest next action.",
          truthState: "plan-only",
          blocker: "No automatic execution in builder preview.",
          nextAction: "Open Prompt Studio manually if needed.",
        },
      ],
      panels: panelBlueprint,
      promptTemplates: draft.promptText.trim()
        ? [
            {
              id: toCockpitSlug(draft.promptLabel || "template") || "template",
              label: draft.promptLabel.trim() || "Suggested template",
              description: "Builder preview template",
              text: draft.promptText,
              truthState: draft.truthState,
              safetyLabels,
              autoExecute: false,
            },
          ]
        : [],
      blockedCapabilities: draft.blockedLabel.trim()
        ? [
            {
              id: toCockpitSlug(draft.blockedLabel) || "blocked-capability",
              label: draft.blockedLabel.trim(),
              reason: draft.blockedReason.trim() || "not specified",
              nextUnlock: draft.blockedNextUnlock.trim() || "future bounded packet",
            },
          ]
        : [],
    };
  }, [cockpitId, draft, panelBlueprint, routeKey]);

  async function handleCopyPreview(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setCopyStatus("Clipboard unavailable in this environment.");
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(previewDefinition, null, 2));
    setCopyStatus("JSON copied to clipboard.");
  }

  return (
    <section aria-label="Cockpit Builder panel" data-testid="cockpit-builder-panel" style={shellStyle}>
      <header style={headerStyle}>
        <strong>Cockpit Builder</strong>
        <p style={detailStyle}>
          Create a local/session cockpit definition preview. This panel never writes files, never executes prompts, and never dispatches backend tools.
        </p>
      </header>

      <div style={formGridStyle}>
        <label style={fieldStyle}>
          Cockpit name
          <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          Route key hint
          <input value={draft.routeKey} onChange={(event) => setDraft((current) => ({ ...current, routeKey: event.target.value }))} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          Category
          <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as CockpitCategory }))} style={inputStyle}>
            <option value="start">start</option>
            <option value="create">create</option>
            <option value="build">build</option>
            <option value="operate">operate</option>
            <option value="inspect">inspect</option>
            <option value="system">system</option>
          </select>
        </label>
        <label style={fieldStyle}>
          Truth state
          <select value={draft.truthState} onChange={(event) => setDraft((current) => ({ ...current, truthState: event.target.value as CockpitTruthState }))} style={inputStyle}>
            <option value="read-only">read-only</option>
            <option value="plan-only">plan-only</option>
            <option value="preflight-only">preflight-only</option>
            <option value="proof-only">proof-only</option>
            <option value="fail-closed">fail-closed</option>
            <option value="admitted-real">admitted-real</option>
            <option value="gated-real">gated-real</option>
            <option value="blocked">blocked</option>
            <option value="unknown">unknown</option>
            <option value="demo">demo</option>
          </select>
        </label>
        <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
          Subtitle
          <input value={draft.subtitle} onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))} style={inputStyle} />
        </label>
        <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
          Description
          <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} style={textareaStyle} rows={3} />
        </label>
        <label style={fieldStyle}>
          Home card title
          <input value={draft.homeCardTitle} onChange={(event) => setDraft((current) => ({ ...current, homeCardTitle: event.target.value }))} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          Primary action label
          <input value={draft.primaryActionLabel} onChange={(event) => setDraft((current) => ({ ...current, primaryActionLabel: event.target.value }))} style={inputStyle} />
        </label>
        <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
          Home card description
          <textarea value={draft.homeCardDescription} onChange={(event) => setDraft((current) => ({ ...current, homeCardDescription: event.target.value }))} style={textareaStyle} rows={2} />
        </label>
        <label style={fieldStyle}>
          Default layout style
          <select value={draft.layoutStyle} onChange={(event) => setDraft((current) => ({ ...current, layoutStyle: event.target.value as LayoutStyle }))} style={inputStyle}>
            <option value="creator-viewport">Creator viewport</option>
            <option value="inspector-workspace">Inspector workspace</option>
            <option value="records-dashboard">Records dashboard</option>
            <option value="prompt-workflow">Prompt workflow</option>
            <option value="empty-cockpit">Empty cockpit</option>
          </select>
        </label>
      </div>

      <div style={summaryCardStyle}>
        <strong>Generated route preview</strong>
        <p style={detailStyle}>Cockpit id/route: <code>{cockpitId || "new-cockpit"}</code></p>
      </div>

      <div style={formGridStyle}>
        <label style={fieldStyle}>
          Prompt template label
          <input value={draft.promptLabel} onChange={(event) => setDraft((current) => ({ ...current, promptLabel: event.target.value }))} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          Prompt safety labels
          <input value={draft.promptSafetyLabels} onChange={(event) => setDraft((current) => ({ ...current, promptSafetyLabels: event.target.value }))} style={inputStyle} />
        </label>
        <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
          Prompt template text (preview/copy only)
          <textarea value={draft.promptText} onChange={(event) => setDraft((current) => ({ ...current, promptText: event.target.value }))} style={textareaStyle} rows={4} />
        </label>
      </div>

      <div style={formGridStyle}>
        <label style={fieldStyle}>
          Blocked capability label
          <input value={draft.blockedLabel} onChange={(event) => setDraft((current) => ({ ...current, blockedLabel: event.target.value }))} style={inputStyle} />
        </label>
        <label style={fieldStyle}>
          Blocked reason
          <input value={draft.blockedReason} onChange={(event) => setDraft((current) => ({ ...current, blockedReason: event.target.value }))} style={inputStyle} />
        </label>
        <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
          Next unlock
          <input value={draft.blockedNextUnlock} onChange={(event) => setDraft((current) => ({ ...current, blockedNextUnlock: event.target.value }))} style={inputStyle} />
        </label>
      </div>

      <div style={actionsStyle}>
        <button type="button" onClick={() => setDraft(INITIAL_DRAFT)} style={secondaryButtonStyle}>Reset draft</button>
        <button type="button" onClick={() => void handleCopyPreview()} style={primaryButtonStyle}>Copy JSON preview</button>
      </div>
      {copyStatus ? <p style={detailStyle}>{copyStatus}</p> : null}

      <article style={previewCardStyle}>
        <strong>JSON preview</strong>
        <p style={detailStyle}>autoExecute is always <code>false</code> for generated prompt templates.</p>
        <pre aria-label="Cockpit builder JSON preview" data-testid="cockpit-builder-json-preview" style={preStyle}>
          {JSON.stringify(previewDefinition, null, 2)}
        </pre>
      </article>
    </section>
  );
}

const shellStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  padding: 12,
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const headerStyle = {
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const detailStyle = {
  margin: 0,
  fontSize: 13,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const formGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} satisfies CSSProperties;

const fieldStyle = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  color: "var(--app-subtle-color)",
} satisfies CSSProperties;

const inputStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  padding: "8px 10px",
  font: "inherit",
} satisfies CSSProperties;

const textareaStyle = {
  ...inputStyle,
  minHeight: 90,
  resize: "vertical",
} satisfies CSSProperties;

const summaryCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  background: "var(--app-panel-bg-muted)",
  padding: 10,
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const actionsStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: "1px solid #5faeff",
  borderRadius: 8,
  padding: "7px 10px",
  background: "var(--app-panel-elevated)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontWeight: 700,
} satisfies CSSProperties;

const secondaryButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: "7px 10px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;

const previewCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  background: "var(--app-panel-bg-muted)",
  padding: 10,
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const preStyle = {
  margin: 0,
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  maxHeight: 420,
  overflow: "auto",
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: 10,
  background: "var(--app-panel-bg-alt)",
  fontSize: 12,
} satisfies CSSProperties;
