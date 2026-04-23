import { useState, type CSSProperties } from "react";

import O3DECreationDesk from "./O3DECreationDesk";

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

type HomeTaskModePanelProps = {
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
};

export default function HomeTaskModePanel({
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenBuilder,
}: HomeTaskModePanelProps) {
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
          <O3DECreationDesk
            title="O3DE game creation desk"
            subtitle="Generated viewport and editor control surface for gameplay work."
            viewportLabel="Game viewport control surface"
            intentLabel="Gameplay authoring intent"
            onOpenPromptStudio={onOpenPromptStudio}
            onOpenRuntimeOverview={onOpenRuntimeOverview}
            onOpenBuilder={onOpenBuilder}
            checklist={[
              "Start with session and level readiness before changing entities.",
              "Use natural language for root-level entity and component work that the bridge admits.",
              "Keep gameplay systems, assets, and build steps as separate mission-control tasks.",
            ]}
          />
        ) : null}
        {activeMode.id === "o3de-cinematic" ? (
          <O3DECreationDesk
            title="O3DE cinematic creation desk"
            subtitle="Generated viewport and editor control surface for movie, trailer, and previs work."
            viewportLabel="Cinematic viewport control surface"
            intentLabel="Cinematic authoring intent"
            onOpenPromptStudio={onOpenPromptStudio}
            onOpenRuntimeOverview={onOpenRuntimeOverview}
            onOpenBuilder={onOpenBuilder}
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
