import { useState, type CSSProperties } from "react";

type HomeTaskModeId = "app" | "o3de-game" | "o3de-cinematic" | "load-project";

type HomeTaskMode = {
  id: HomeTaskModeId;
  label: string;
  eyebrow: string;
  description: string;
  help: string;
};

const taskModes: HomeTaskMode[] = [
  {
    id: "app",
    label: "Develop the App",
    eyebrow: "Control Plane",
    description: "Improve this website, mission-control workflow, docs, and Codex coordination surfaces.",
    help: "Use this when the next work is about making the control app itself easier, safer, or more capable.",
  },
  {
    id: "o3de-game",
    label: "O3DE Game",
    eyebrow: "Game Creation",
    description: "Shape gameplay, levels, entities, components, assets, and testable game slices through O3DE.",
    help: "Use this when you want to create or modify an O3DE game project through guided natural-language steps.",
  },
  {
    id: "o3de-cinematic",
    label: "O3DE Movie",
    eyebrow: "Cinematic Creation",
    description: "Plan scenes, cameras, lighting, animation beats, and render-lookdev passes for a movie workflow.",
    help: "Use this when the goal is a cinematic, trailer, previs sequence, or non-game O3DE production.",
  },
  {
    id: "load-project",
    label: "Load Project",
    eyebrow: "Existing Work",
    description: "Reconnect to an existing O3DE project, review its bridge state, and continue safely.",
    help: "Use this before changing a project that already exists, especially after restarting the laptop or editor.",
  },
];

export default function HomeTaskModePanel() {
  const [activeModeId, setActiveModeId] = useState<HomeTaskModeId>("app");
  const activeMode = taskModes.find((mode) => mode.id === activeModeId) ?? taskModes[0];

  return (
    <section aria-label="Home task modes" style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <span style={eyebrowStyle}>Task Launcher</span>
          <h3 style={headingStyle}>Choose what you are building</h3>
          <p style={introStyle}>
            Pick the kind of work first. The panel below changes the workspace guidance without hiding the
            full app controls.
          </p>
        </div>
      </div>

      <div role="tablist" aria-label="Home task mode tabs" style={tabListStyle}>
        {taskModes.map((mode) => {
          const isActive = mode.id === activeModeId;
          return (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveModeId(mode.id)}
              title={mode.help}
              style={{
                ...tabButtonStyle,
                ...(isActive ? activeTabButtonStyle : null),
              }}
            >
              <span style={tabEyebrowStyle}>{mode.eyebrow}</span>
              <strong>{mode.label}</strong>
              <span style={tabDescriptionStyle}>{mode.description}</span>
              <span aria-label={`${mode.label} help`} title={mode.help} style={infoBadgeStyle}>
                i
              </span>
            </button>
          );
        })}
      </div>

      <div style={modeBodyStyle}>
        {activeMode.id === "app" ? <AppDevelopmentMode /> : null}
        {activeMode.id === "o3de-game" ? (
          <O3DECreationMode
            title="O3DE game creation desk"
            subtitle="Generated viewport and editor control surface for gameplay work."
            viewportLabel="Game viewport control surface"
            intentLabel="Gameplay authoring intent"
            checklist={[
              "Start with session and level readiness before changing entities.",
              "Use natural language for root-level entity and component work that the bridge admits.",
              "Keep gameplay systems, assets, and build steps as separate mission-control tasks.",
            ]}
          />
        ) : null}
        {activeMode.id === "o3de-cinematic" ? (
          <O3DECreationMode
            title="O3DE cinematic creation desk"
            subtitle="Generated viewport and editor control surface for movie, trailer, and previs work."
            viewportLabel="Cinematic viewport control surface"
            intentLabel="Cinematic authoring intent"
            checklist={[
              "Start with level, camera, lighting, and sequence planning before asset mutation.",
              "Keep shot setup, animation, lookdev, and render validation as separate safe tasks.",
              "Use the bridge only for admitted editor operations until wider cinematic tools are proven.",
            ]}
          />
        ) : null}
        {activeMode.id === "load-project" ? <LoadProjectMode /> : null}
      </div>
    </section>
  );
}

function AppDevelopmentMode() {
  return (
    <div style={appModeGridStyle}>
      <ModeCard
        title="Develop this control app"
        detail="Use this path when you want Codex to improve the React UI, backend orchestration, docs, runbooks, or mission-control workflow."
        items={[
          "Open Builder for worktree lanes and mission-control tasks.",
          "Use Runtime before changing live O3DE assumptions.",
          "Use Records to verify what actually happened.",
        ]}
      />
      <ModeCard
        title="Safe next step pattern"
        detail="The app should help threads claim work, avoid stale ports, preserve evidence, and commit small slices."
        items={[
          "One narrow slice at a time.",
          "Tests and build before push.",
          "Truthful labels for simulated, plan-only, and real-authoring paths.",
        ]}
      />
      <ModeCard
        title="Recommended thread prompt"
        detail="For a new Codex thread, start from the Builder lane and ask it to check mission-control ownership before editing."
        items={[
          "Use the correct worktree.",
          "Claim the task before touching files.",
          "Report changed files, tests, commit, and push status.",
        ]}
      />
    </div>
  );
}

function O3DECreationMode({
  title,
  subtitle,
  viewportLabel,
  intentLabel,
  checklist,
}: {
  title: string;
  subtitle: string;
  viewportLabel: string;
  intentLabel: string;
  checklist: string[];
}) {
  return (
    <div style={editorShellStyle}>
      <div style={editorHeaderStyle}>
        <div>
          <strong>{title}</strong>
          <p style={mutedParagraphStyle}>{subtitle}</p>
        </div>
        <span style={statusPillStyle}>Bridge-backed edits only when admitted</span>
      </div>

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
            Project
            <span style={readonlyFieldStyle}>McpSandbox or selected project</span>
          </label>
          <label style={fieldLabelStyle}>
            Level
            <span style={readonlyFieldStyle}>Current loaded level</span>
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

function LoadProjectMode() {
  return (
    <div style={appModeGridStyle}>
      <ModeCard
        title="Load or reconnect a project"
        detail="Use this path when the project already exists and you want to continue without losing bridge truth or stale-port safety."
        items={[
          "Confirm project root, engine root, and editor runner.",
          "Check bridge heartbeat before claiming real editor control.",
          "Review existing mission-control tasks before starting new work.",
        ]}
      />
      <ModeCard
        title="Project library"
        detail="This is the future home for saved O3DE project profiles and recent workspaces."
        items={[
          "McpSandbox remains the current canonical live target.",
          "Additional projects should get explicit target profiles.",
          "Loading a project should not silently widen admitted tool scope.",
        ]}
      />
      <ModeCard
        title="Reconnect checklist"
        detail="After a laptop restart or O3DE crash, reconnect through verification instead of guessing."
        items={[
          "Check backend readiness.",
          "Check bridge status.",
          "Run a narrow proof before live authoring.",
        ]}
      />
    </div>
  );
}

function ModeCard({
  title,
  detail,
  items,
}: {
  title: string;
  detail: string;
  items: string[];
}) {
  return (
    <article style={modeCardStyle}>
      <strong>{title}</strong>
      <p style={mutedParagraphStyle}>{detail}</p>
      <ul style={checklistStyle}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

const panelStyle = {
  display: "grid",
  gap: 16,
  padding: 18,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "linear-gradient(135deg, var(--app-panel-bg-muted) 0%, var(--app-panel-bg) 100%)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
} satisfies CSSProperties;

const eyebrowStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const headingStyle = {
  margin: "4px 0",
  fontSize: "clamp(20px, 2vw, 28px)",
  lineHeight: 1.1,
} satisfies CSSProperties;

const introStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.5,
} satisfies CSSProperties;

const tabListStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 10,
} satisfies CSSProperties;

const tabButtonStyle = {
  position: "relative",
  display: "grid",
  gap: 5,
  textAlign: "left",
  padding: "14px 38px 14px 14px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const activeTabButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  boxShadow: "var(--app-shadow-strong)",
} satisfies CSSProperties;

const tabEyebrowStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const tabDescriptionStyle = {
  color: "var(--app-muted-color)",
  fontSize: 12,
  lineHeight: 1.35,
} satisfies CSSProperties;

const infoBadgeStyle = {
  position: "absolute",
  top: 12,
  right: 12,
  width: 18,
  height: 18,
  display: "grid",
  placeItems: "center",
  border: "1px solid var(--app-info-border)",
  borderRadius: "50%",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
  fontSize: 12,
  fontWeight: 800,
} satisfies CSSProperties;

const modeBodyStyle = {
  display: "grid",
  gap: 14,
} satisfies CSSProperties;

const appModeGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
} satisfies CSSProperties;

const modeCardStyle = {
  display: "grid",
  gap: 8,
  padding: 14,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
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
