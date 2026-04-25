import { lazy, Suspense, useState, type CSSProperties } from "react";

import type { O3DEProductionMode } from "./O3DEProductionPlanner";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

const O3DEProductionPlanner = lazy(() => import("./O3DEProductionPlanner"));

type O3DECreationDeskProps = {
  title: string;
  subtitle: string;
  viewportLabel: string;
  intentLabel: string;
  checklist: string[];
  productionMode?: O3DEProductionMode;
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
};

type O3DEToolGuide = {
  id: string;
  label: string;
  description: string;
  safePrompt: string;
  verifyWith: string;
};

const toolGuides: O3DEToolGuide[] = [
  {
    id: "entity-tools",
    label: "Entity Tools",
    description: "Create and review root-level named entities before adding behavior.",
    safePrompt: "Open the current level and create a root-level entity named TrainingMarker.",
    verifyWith: "Prompt Studio result, bridge command id, and Records evidence for editor.entity.create.",
  },
  {
    id: "component-palette",
    label: "Component Palette",
    description: "Attach only allowlisted components to an existing entity in the loaded level.",
    safePrompt: "Add a Comment component to the selected entity without changing any properties.",
    verifyWith: "Runtime bridge status plus Records evidence for editor.component.add.",
  },
  {
    id: "asset-browser",
    label: "Asset Browser",
    description: "Plan asset inspection or source-file work without mutating the editor scene first.",
    safePrompt: "Inspect the project assets needed for this level and propose a safe import plan.",
    verifyWith: "Catalog capability mode and Records artifacts before any destructive asset changes.",
  },
  {
    id: "material-lighting",
    label: "Material and Lighting",
    description: "Keep lookdev as a planned task until material editing is explicitly admitted.",
    safePrompt: "Create a lookdev checklist for lighting this scene without changing materials yet.",
    verifyWith: "Builder task ownership and explicit simulated/plan-only labels.",
  },
  {
    id: "animation-camera",
    label: "Animation and Camera",
    description: "Draft shot or camera intent before moving into cinematic bridge operations.",
    safePrompt: "Plan a three-shot camera sequence for this level and list the bridge capabilities required.",
    verifyWith: "Prompt plan output and operator approval before any editor mutation.",
  },
  {
    id: "build-test",
    label: "Build and Test",
    description: "Treat build, run, and validation as separate tasks so editor authoring stays traceable.",
    safePrompt: "Create a mission-control task to validate this O3DE slice after the editor changes land.",
    verifyWith: "Builder lane status, test command output, and Records run evidence.",
  },
];

export default function O3DECreationDesk({
  title,
  subtitle,
  viewportLabel,
  intentLabel,
  checklist,
  productionMode = "game",
  projectProfile,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenBuilder,
}: O3DECreationDeskProps) {
  const [activeToolId, setActiveToolId] = useState(toolGuides[0].id);
  const activeTool = toolGuides.find((tool) => tool.id === activeToolId) ?? toolGuides[0];
  const actions = [
    {
      label: "Create with natural language",
      detail: "Open Prompt Studio",
      onClick: onOpenPromptStudio,
    },
    {
      label: "Check bridge/runtime",
      detail: "Open Runtime Overview",
      onClick: onOpenRuntimeOverview,
    },
    {
      label: "Coordinate tasks",
      detail: "Open Builder",
      onClick: onOpenBuilder,
    },
  ].filter((action): action is { label: string; detail: string; onClick: () => void } => Boolean(action.onClick));

  return (
    <section aria-label={title} style={editorShellStyle}>
      <div style={editorHeaderStyle}>
        <div>
          <strong>{title}</strong>
          <p style={mutedParagraphStyle}>{subtitle}</p>
          <p style={companionTextStyle}>
            O3DE stays the full-size editor and viewport. This app adds a companion command deck for
            prompts, project profiles, bridge checks, tasks, evidence, and safe automation.
          </p>
        </div>
        <span style={statusPillStyle}>Bridge-backed edits only when admitted</span>
      </div>

      <div aria-label="O3DE companion layout guidance" style={companionGridStyle}>
        <span><strong>Primary viewport:</strong> keep O3DE Editor full-size or snapped beside this app.</span>
        <span><strong>Control plane:</strong> use this app for prompts, approvals, bridge truth, and work planning.</span>
        <span><strong>No shrink-wrap:</strong> the browser shell should augment O3DE tools, not replace the editor UI.</span>
      </div>

      <Suspense fallback={<div style={plannerFallbackStyle}>Loading adaptive production planner...</div>}>
        <O3DEProductionPlanner
          mode={productionMode}
          viewportLabel={viewportLabel}
          activeToolLabel={activeTool.label}
          projectProfileName={projectProfile?.name}
          onOpenPromptStudio={onOpenPromptStudio}
          onOpenBuilder={onOpenBuilder}
        />
      </Suspense>

      {actions.length > 0 ? (
        <div aria-label="O3DE creation desk actions" style={actionBarStyle}>
          {actions.map((action) => (
            <button key={action.label} type="button" onClick={action.onClick} style={actionButtonStyle}>
              <strong>{action.label}</strong>
              <span>{action.detail}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div style={editorToolbarStyle} aria-label="O3DE editor toolbar preview">
        {["Select", "Move", "Rotate", "Scale", "Snap", "Camera", "Play"].map((tool) => (
          <button key={tool} type="button" style={toolButtonStyle}>
            {tool}
          </button>
        ))}
      </div>

      <div style={editorGridStyle}>
        <aside style={editorRailStyle} aria-label="O3DE scene tools">
          <strong>Entity Outliner</strong>
          <span>Level Root</span>
          <span>Player Start</span>
          <span>Lighting Rig</span>
          <span>Camera Set</span>
        </aside>

        <div style={viewportStyle} aria-label={viewportLabel}>
          <div style={viewportTopBarStyle}>
            <span>{viewportLabel}</span>
            <span>Perspective | Lit | 60 FPS target</span>
          </div>
          <div style={viewportCanvasStyle}>
            <div style={viewportHorizonStyle} />
            <div style={viewportGridStyle} />
            <div style={viewportGizmoStyle}>XYZ</div>
            <div style={viewportCalloutStyle}>
              Natural-language edits should become reviewed bridge commands here, not untracked clicks.
            </div>
          </div>
        </div>

        <aside style={inspectorStyle} aria-label="O3DE inspector tools">
          <strong>{intentLabel}</strong>
          <label style={fieldLabelStyle}>
            Project profile
            <span style={readonlyFieldStyle}>{projectProfile?.name ?? "No selected project profile"}</span>
          </label>
          <label style={fieldLabelStyle}>
            Project root
            <span style={readonlyFieldStyle}>{projectProfile?.projectRoot ?? "Select or save a project first"}</span>
          </label>
          <label style={fieldLabelStyle}>
            Engine root
            <span style={readonlyFieldStyle}>{projectProfile?.engineRoot ?? "Select or save an engine first"}</span>
          </label>
          <label style={fieldLabelStyle}>
            Editor runner
            <span style={readonlyFieldStyle}>{projectProfile?.editorRunner || "Not stored for this profile"}</span>
          </label>
          <label style={fieldLabelStyle}>
            Edit queue
            <span style={readonlyFieldStyle}>Reviewed natural-language commands</span>
          </label>
        </aside>
      </div>

      <section aria-label="O3DE guided tool dock" style={toolDockStyle}>
        <div style={toolDockHeaderStyle}>
          <div>
            <strong>O3DE guided tool dock</strong>
            <p style={mutedParagraphStyle}>
              Pick a tool area to see the safest natural-language prompt and the evidence to check next.
            </p>
          </div>
          <span style={statusPillStyle}>Click a tool to focus</span>
        </div>
        <div style={toolBayStyle}>
          {toolGuides.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveToolId(tool.id)}
              aria-pressed={tool.id === activeTool.id}
              title={tool.description}
              style={{
                ...toolTileStyle,
                ...(tool.id === activeTool.id ? activeToolTileStyle : null),
              }}
            >
              <span>{tool.label}</span>
              <span aria-hidden="true" style={toolInfoBadgeStyle}>i</span>
            </button>
          ))}
        </div>
        <div style={toolGuidePanelStyle} aria-live="polite">
          <div>
            <span style={eyebrowStyle}>Selected O3DE area</span>
            <strong>{activeTool.label}</strong>
            <p style={mutedParagraphStyle}>{activeTool.description}</p>
          </div>
          <div style={toolGuideGridStyle}>
            <span>
              <strong>Suggested prompt</strong>
              {activeTool.safePrompt}
            </span>
            <span>
              <strong>Verify with</strong>
              {activeTool.verifyWith}
            </span>
          </div>
        </div>
      </section>

      <div style={truthNoteStyle}>
        <strong>Truth boundary:</strong> this is a generated control-surface shell, not an embedded O3DE renderer.
        It is designed to connect to the persistent editor bridge as capabilities become admitted real.
      </div>

      <ul style={checklistStyle}>
        {checklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

const editorShellStyle = {
  display: "grid",
  gap: 12,
  padding: 14,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background:
    "linear-gradient(145deg, color-mix(in srgb, var(--app-accent-soft) 54%, var(--app-panel-bg-alt) 46%) 0%, color-mix(in srgb, var(--app-panel-bg) 94%, var(--app-page-bg) 6%) 100%)",
  color: "var(--app-text-color)",
  overflow: "hidden",
} satisfies CSSProperties;

const editorHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "start",
} satisfies CSSProperties;

const statusPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid var(--app-success-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  background: "var(--app-success-bg)",
  color: "var(--app-success-text)",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const companionTextStyle = {
  margin: "6px 0 0",
  color: "color-mix(in srgb, var(--app-muted-color) 88%, var(--app-text-color) 12%)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const companionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 8,
  padding: 10,
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-card-radius)",
  background: "color-mix(in srgb, var(--app-info-bg) 72%, var(--app-panel-bg) 28%)",
  color: "var(--app-info-text)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const plannerFallbackStyle = {
  padding: 12,
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-card-radius)",
  background: "color-mix(in srgb, var(--app-info-bg) 70%, var(--app-panel-bg) 30%)",
  color: "var(--app-info-text)",
  fontWeight: 700,
} satisfies CSSProperties;

const actionBarStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const actionButtonStyle = {
  display: "grid",
  gap: 3,
  textAlign: "left",
  padding: "10px 12px",
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-card-radius)",
  background: "color-mix(in srgb, var(--app-info-bg) 64%, var(--app-panel-bg) 36%)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const editorToolbarStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  padding: 8,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--app-panel-bg-muted) 86%, var(--app-panel-bg) 14%) 0%, var(--app-panel-bg) 100%)",
} satisfies CSSProperties;

const toolButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontSize: 12,
} satisfies CSSProperties;

const editorGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(150px, 0.72fr) minmax(360px, 2.1fr) minmax(300px, 1fr)",
  gap: 10,
  alignItems: "stretch",
  overflowX: "auto",
  paddingBottom: 4,
} satisfies CSSProperties;

const editorRailStyle = {
  display: "grid",
  alignContent: "start",
  gap: 8,
  minWidth: 0,
  minHeight: 260,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--app-panel-bg-alt) 92%, var(--app-page-bg) 8%) 0%, var(--app-panel-bg) 100%)",
} satisfies CSSProperties;

const viewportStyle = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  minWidth: 0,
  minHeight: 300,
  border: "1px solid rgba(124, 175, 255, 0.34)",
  borderRadius: "var(--app-card-radius)",
  overflow: "hidden",
  background: "#071225",
} satisfies CSSProperties;

const viewportTopBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 10px",
  color: "#dbe8ff",
  background: "rgba(4, 13, 28, 0.92)",
  fontSize: 12,
} satisfies CSSProperties;

const viewportCanvasStyle = {
  position: "relative",
  minHeight: 260,
  overflow: "hidden",
  background: "radial-gradient(circle at 50% 35%, rgba(70, 134, 255, 0.32), transparent 32%), linear-gradient(180deg, #17345f 0%, #081426 62%, #06101d 100%)",
} satisfies CSSProperties;

const viewportHorizonStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  top: "48%",
  height: 1,
  background: "rgba(255, 255, 255, 0.2)",
} satisfies CSSProperties;

const viewportGridStyle = {
  position: "absolute",
  inset: "48% -20% -28%",
  backgroundImage: "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
  backgroundSize: "34px 34px",
  transform: "perspective(460px) rotateX(62deg)",
  transformOrigin: "top",
} satisfies CSSProperties;

const viewportGizmoStyle = {
  position: "absolute",
  top: 14,
  right: 14,
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: "var(--app-card-radius)",
  padding: "8px 10px",
  color: "#dbe8ff",
  background: "rgba(0, 0, 0, 0.32)",
  fontSize: 12,
  fontWeight: 800,
} satisfies CSSProperties;

const viewportCalloutStyle = {
  position: "absolute",
  left: 18,
  bottom: 18,
  maxWidth: 360,
  padding: 12,
  border: "1px solid rgba(124, 175, 255, 0.35)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(2, 8, 18, 0.72)",
  color: "#e8f1ff",
  lineHeight: 1.45,
} satisfies CSSProperties;

const inspectorStyle = {
  display: "grid",
  alignContent: "start",
  gap: 10,
  minWidth: 0,
  minHeight: 260,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--app-panel-bg-alt) 92%, var(--app-page-bg) 8%) 0%, var(--app-panel-bg) 100%)",
} satisfies CSSProperties;

const fieldLabelStyle = {
  display: "grid",
  gap: 4,
  minWidth: 0,
  color: "var(--app-subtle-color)",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const readonlyFieldStyle = {
  display: "block",
  boxSizing: "border-box",
  maxWidth: "100%",
  minWidth: 0,
  padding: "7px 9px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  color: "var(--app-text-color)",
  background: "var(--app-panel-bg)",
  fontWeight: 500,
  overflowWrap: "anywhere",
  whiteSpace: "normal",
} satisfies CSSProperties;

const toolBayStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const toolDockStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-card-radius)",
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--app-panel-bg-alt) 90%, var(--app-info-bg) 10%) 0%, color-mix(in srgb, var(--app-panel-bg) 96%, var(--app-page-bg) 4%) 100%)",
} satisfies CSSProperties;

const toolDockHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "start",
} satisfies CSSProperties;

const toolTileStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  textAlign: "left",
  padding: "9px 10px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  font: "inherit",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const activeToolTileStyle = {
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const toolInfoBadgeStyle = {
  display: "inline-grid",
  placeItems: "center",
  flex: "0 0 auto",
  width: 18,
  height: 18,
  border: "1px solid var(--app-info-border)",
  borderRadius: "50%",
  background: "var(--app-panel-bg)",
  color: "var(--app-info-text)",
  fontSize: 12,
  fontWeight: 800,
} satisfies CSSProperties;

const toolGuidePanelStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const toolGuideGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const eyebrowStyle = {
  display: "block",
  marginBottom: 4,
  color: "var(--app-subtle-color)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  lineHeight: 1.2,
  textTransform: "uppercase",
} satisfies CSSProperties;

const truthNoteStyle = {
  padding: 12,
  border: "1px solid var(--app-warning-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-warning-bg)",
  color: "var(--app-warning-text)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const mutedParagraphStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const checklistStyle = {
  margin: 0,
  paddingLeft: 18,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;
