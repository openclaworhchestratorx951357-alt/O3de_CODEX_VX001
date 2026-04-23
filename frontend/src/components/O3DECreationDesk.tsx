import type { CSSProperties } from "react";

import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

type O3DECreationDeskProps = {
  title: string;
  subtitle: string;
  viewportLabel: string;
  intentLabel: string;
  checklist: string[];
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
};

export default function O3DECreationDesk({
  title,
  subtitle,
  viewportLabel,
  intentLabel,
  checklist,
  projectProfile,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenBuilder,
}: O3DECreationDeskProps) {
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
    <div style={editorShellStyle}>
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

      <div style={toolBayStyle}>
        {[
          "Entity Tools",
          "Component Palette",
          "Asset Browser",
          "Material and Lighting",
          "Animation and Camera",
          "Build and Test",
        ].map((tool) => (
          <span key={tool} style={toolTileStyle}>{tool}</span>
        ))}
      </div>

      <div style={truthNoteStyle}>
        <strong>Truth boundary:</strong> this is a generated control-surface shell, not an embedded O3DE renderer.
        It is designed to connect to the persistent editor bridge as capabilities become admitted real.
      </div>

      <ul style={checklistStyle}>
        {checklist.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const editorShellStyle = {
  display: "grid",
  gap: 12,
  padding: 14,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "linear-gradient(145deg, rgba(17, 36, 68, 0.96) 0%, var(--app-panel-bg) 100%)",
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
  color: "#dbe8ff",
  lineHeight: 1.45,
} satisfies CSSProperties;

const companionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 8,
  padding: 10,
  border: "1px solid rgba(124, 175, 255, 0.3)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(124, 175, 255, 0.1)",
  color: "#dbe8ff",
  lineHeight: 1.45,
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
  border: "1px solid rgba(124, 175, 255, 0.35)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(124, 175, 255, 0.12)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const editorToolbarStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  padding: 8,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(3, 10, 24, 0.42)",
} satisfies CSSProperties;

const toolButtonStyle = {
  border: "1px solid rgba(255, 255, 255, 0.18)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  background: "rgba(255, 255, 255, 0.08)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontSize: 12,
} satisfies CSSProperties;

const editorGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(150px, 0.72fr) minmax(320px, 2.2fr) minmax(190px, 0.9fr)",
  gap: 10,
  alignItems: "stretch",
} satisfies CSSProperties;

const editorRailStyle = {
  display: "grid",
  alignContent: "start",
  gap: 8,
  minHeight: 260,
  padding: 12,
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(0, 0, 0, 0.22)",
} satisfies CSSProperties;

const viewportStyle = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
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
  minHeight: 260,
  padding: 12,
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(0, 0, 0, 0.22)",
} satisfies CSSProperties;

const fieldLabelStyle = {
  display: "grid",
  gap: 4,
  color: "var(--app-subtle-color)",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const readonlyFieldStyle = {
  padding: "7px 9px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "var(--app-card-radius)",
  color: "var(--app-text-color)",
  background: "rgba(255, 255, 255, 0.06)",
  fontWeight: 500,
} satisfies CSSProperties;

const toolBayStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const toolTileStyle = {
  padding: "9px 10px",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(255, 255, 255, 0.07)",
  color: "var(--app-text-color)",
  fontSize: 12,
  fontWeight: 700,
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
