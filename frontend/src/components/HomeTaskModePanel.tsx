import { useMemo, useState, type CSSProperties } from "react";

import O3DECreationDesk from "./O3DECreationDesk";
import { fetchO3deTarget } from "../lib/api";
import {
  createO3DEProjectProfile,
  getActiveO3DEProjectProfile,
  loadO3DEProjectProfilesStore,
  saveO3DEProjectProfilesStore,
  selectO3DEProjectProfile,
  upsertO3DEProjectProfile,
} from "../lib/o3deProjectProfiles";
import { useSettings } from "../lib/settings/hooks";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

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

type O3DEProjectProfileDraft = {
  name: string;
  projectRoot: string;
  engineRoot: string;
  editorRunner: string;
};

function profileToDraft(profile: O3DEProjectProfile): O3DEProjectProfileDraft {
  return {
    name: profile.name,
    projectRoot: profile.projectRoot,
    engineRoot: profile.engineRoot,
    editorRunner: profile.editorRunner,
  };
}

export default function HomeTaskModePanel({
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenBuilder,
}: HomeTaskModePanelProps) {
  const { settings, saveSettings } = useSettings();
  const [activeModeId, setActiveModeId] = useState<HomeTaskModeId>("app");
  const [profileStore, setProfileStore] = useState(() => loadO3DEProjectProfilesStore());
  const activeProjectProfile = useMemo(
    () => getActiveO3DEProjectProfile(profileStore),
    [profileStore],
  );
  const [profileDraft, setProfileDraft] = useState<O3DEProjectProfileDraft>(() => (
    profileToDraft(getActiveO3DEProjectProfile(loadO3DEProjectProfilesStore()))
  ));
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [backendTargetLoading, setBackendTargetLoading] = useState(false);
  const activeMode = taskModes.find((mode) => mode.id === activeModeId) ?? taskModes[0];

  function syncSettingsToProfile(profile: O3DEProjectProfile): void {
    saveSettings({
      ...settings,
      operatorDefaults: {
        ...settings.operatorDefaults,
        projectRoot: profile.projectRoot,
        engineRoot: profile.engineRoot,
      },
    });
  }

  function selectProjectProfile(profile: O3DEProjectProfile): void {
    const nextStore = saveO3DEProjectProfilesStore(
      selectO3DEProjectProfile(profileStore, profile.id),
    );
    setProfileStore(nextStore);
    setProfileDraft(profileToDraft(profile));
    syncSettingsToProfile(profile);
    setProfileStatus(`${profile.name} is now selected for O3DE creation defaults.`);
  }

  function saveProjectProfile(): void {
    if (!profileDraft.name.trim() || !profileDraft.projectRoot.trim() || !profileDraft.engineRoot.trim()) {
      setProfileStatus("Project profile needs a name, project root, and engine root before saving.");
      return;
    }

    const profile = createO3DEProjectProfile({
      id: activeProjectProfile.kind === "saved" ? activeProjectProfile.id : undefined,
      name: profileDraft.name,
      kind: "saved",
      projectRoot: profileDraft.projectRoot,
      engineRoot: profileDraft.engineRoot,
      editorRunner: profileDraft.editorRunner,
      sourceLabel: "operator-saved-project-profile",
    });
    const nextStore = saveO3DEProjectProfilesStore(
      selectO3DEProjectProfile(upsertO3DEProjectProfile(profileStore, profile), profile.id),
    );

    setProfileStore(nextStore);
    setProfileDraft(profileToDraft(profile));
    syncSettingsToProfile(profile);
    setProfileStatus(`${profile.name} was saved and selected.`);
  }

  async function captureBackendTarget(): Promise<void> {
    setBackendTargetLoading(true);
    setProfileStatus("Checking the backend O3DE target...");

    try {
      const target = await fetchO3deTarget();
      if (!target.project_root || !target.engine_root) {
        setProfileStatus("Backend target is not configured yet. Open Runtime and fix /o3de/target first.");
        return;
      }

      const profile = createO3DEProjectProfile({
        id: "live-backend-target",
        name: "Live backend target",
        kind: "backend",
        projectRoot: target.project_root,
        engineRoot: target.engine_root,
        editorRunner: target.editor_runner ?? "",
        sourceLabel: target.source_label,
      });
      const nextStore = saveO3DEProjectProfilesStore(
        selectO3DEProjectProfile(upsertO3DEProjectProfile(profileStore, profile), profile.id),
      );

      setProfileStore(nextStore);
      setProfileDraft(profileToDraft(profile));
      syncSettingsToProfile(profile);
      setProfileStatus("Live backend target was captured and selected.");
    } catch (error) {
      setProfileStatus(error instanceof Error ? error.message : "Backend target check failed.");
    } finally {
      setBackendTargetLoading(false);
    }
  }

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
            productionMode="game"
            projectProfile={activeProjectProfile}
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
            productionMode="cinematic"
            projectProfile={activeProjectProfile}
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
        {activeMode.id === "load-project" ? (
          <LoadProjectMode
            activeProjectProfile={activeProjectProfile}
            profiles={profileStore.profiles}
            profileDraft={profileDraft}
            profileStatus={profileStatus}
            backendTargetLoading={backendTargetLoading}
            onProfileDraftChange={setProfileDraft}
            onSelectProjectProfile={selectProjectProfile}
            onSaveProjectProfile={saveProjectProfile}
            onCaptureBackendTarget={() => void captureBackendTarget()}
            onOpenPromptStudio={onOpenPromptStudio}
            onOpenRuntimeOverview={onOpenRuntimeOverview}
          />
        ) : null}
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

function LoadProjectMode({
  activeProjectProfile,
  profiles,
  profileDraft,
  profileStatus,
  backendTargetLoading,
  onProfileDraftChange,
  onSelectProjectProfile,
  onSaveProjectProfile,
  onCaptureBackendTarget,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
}: {
  activeProjectProfile: O3DEProjectProfile;
  profiles: O3DEProjectProfile[];
  profileDraft: O3DEProjectProfileDraft;
  profileStatus: string | null;
  backendTargetLoading: boolean;
  onProfileDraftChange: (draft: O3DEProjectProfileDraft) => void;
  onSelectProjectProfile: (profile: O3DEProjectProfile) => void;
  onSaveProjectProfile: () => void;
  onCaptureBackendTarget: () => void;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
}) {
  const guidedSteps = [
    {
      number: "1",
      title: "Choose the project profile",
      detail: "Confirm the project root, engine root, and editor runner before sending any O3DE prompt.",
      status: activeProjectProfile.name,
    },
    {
      number: "2",
      title: "Capture the live backend target",
      detail: "Use the backend target only after it reports a configured project and engine.",
      status: backendTargetLoading ? "Checking backend now" : "Ready when backend is running",
      actionLabel: backendTargetLoading ? "Checking backend..." : "Capture live target",
      onAction: onCaptureBackendTarget,
      disabled: backendTargetLoading,
    },
    {
      number: "3",
      title: "Verify runtime and bridge",
      detail: "Open Runtime and confirm backend readiness plus bridge heartbeat before authoring.",
      status: "Do this after startup or crashes",
      actionLabel: "Open Runtime checklist",
      onAction: onOpenRuntimeOverview,
    },
    {
      number: "4",
      title: "Start natural-language work",
      detail: "Move into Prompt Studio only after the selected profile matches the live target.",
      status: "Use admitted real tools only",
      actionLabel: "Open Prompt Studio",
      onAction: onOpenPromptStudio,
    },
  ];

  return (
    <div style={profileShellStyle}>
      <section style={guidedReconnectStyle} aria-label="Load Project guided setup">
        <div>
          <span style={eyebrowStyle}>Guided reconnect path</span>
          <h4 style={profileTitleStyle}>Load an O3DE project safely</h4>
          <p style={mutedParagraphStyle}>
            Follow these steps after choosing an existing project, restarting the laptop, or reopening O3DE.
            The app profile helps fill defaults, while Runtime proves what is actually live.
          </p>
        </div>
        <div style={guidedStepGridStyle}>
          {guidedSteps.map((step) => (
            <article key={step.number} style={guidedStepCardStyle}>
              <span style={stepNumberStyle}>{step.number}</span>
              <div style={guidedStepBodyStyle}>
                <strong>{step.title}</strong>
                <p style={mutedParagraphStyle}>{step.detail}</p>
                <span style={stepStatusStyle}>{step.status}</span>
                {step.actionLabel && step.onAction ? (
                  <button
                    type="button"
                    onClick={step.onAction}
                    disabled={step.disabled}
                    style={secondaryActionButtonStyle}
                  >
                    {step.actionLabel}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section style={profileSummaryStyle} aria-label="Active O3DE project profile">
        <div>
          <span style={eyebrowStyle}>Active Project Profile</span>
          <h4 style={profileTitleStyle}>{activeProjectProfile.name}</h4>
          <p style={mutedParagraphStyle}>
            This selection updates the app-local O3DE project profile and syncs project/engine roots into
            operator defaults. It does not change backend target env vars by itself.
          </p>
        </div>
        <div style={profilePathGridStyle}>
          <span><strong>Project</strong>{activeProjectProfile.projectRoot}</span>
          <span><strong>Engine</strong>{activeProjectProfile.engineRoot}</span>
          <span><strong>Editor</strong>{activeProjectProfile.editorRunner || "Not stored for this profile"}</span>
          <span><strong>Source</strong>{activeProjectProfile.sourceLabel}</span>
        </div>
      </section>

      <div style={profileGridStyle}>
        <section style={modeCardStyle}>
          <strong>Saved project profiles</strong>
          <p style={mutedParagraphStyle}>
            Choose the intended project before sending natural-language O3DE work. Profiles are local,
            versioned browser data, not backend runtime evidence.
          </p>
          <div style={profileListStyle}>
            {profiles.map((profile) => {
              const selected = profile.id === activeProjectProfile.id;
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => onSelectProjectProfile(profile)}
                  aria-pressed={selected}
                  style={{
                    ...profileSelectButtonStyle,
                    ...(selected ? profileSelectButtonActiveStyle : null),
                  }}
                >
                  <strong>{profile.name}</strong>
                  <span>{profile.projectRoot}</span>
                  <small>{profile.kind}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section style={modeCardStyle}>
          <strong>Add or update a project profile</strong>
          <p style={mutedParagraphStyle}>
            Save explicit target paths for a project you already started. Selecting a profile only changes
            UI/default wiring; Runtime still verifies the live backend and bridge.
          </p>
          <label style={formFieldStyle}>
            Profile name
            <input
              value={profileDraft.name}
              onChange={(event) => onProfileDraftChange({ ...profileDraft, name: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={formFieldStyle}>
            Project root
            <input
              value={profileDraft.projectRoot}
              onChange={(event) => onProfileDraftChange({ ...profileDraft, projectRoot: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={formFieldStyle}>
            Engine root
            <input
              value={profileDraft.engineRoot}
              onChange={(event) => onProfileDraftChange({ ...profileDraft, engineRoot: event.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={formFieldStyle}>
            Editor runner
            <input
              value={profileDraft.editorRunner}
              onChange={(event) => onProfileDraftChange({ ...profileDraft, editorRunner: event.target.value })}
              style={inputStyle}
            />
          </label>
          <div style={buttonRowStyle}>
            <button type="button" onClick={onSaveProjectProfile} style={primaryActionButtonStyle}>
              Save project profile
            </button>
            <button
              type="button"
              onClick={onCaptureBackendTarget}
              disabled={backendTargetLoading}
              style={secondaryActionButtonStyle}
            >
              {backendTargetLoading ? "Checking backend..." : "Capture backend target"}
            </button>
          </div>
          {profileStatus ? <p role="status" style={statusTextStyle}>{profileStatus}</p> : null}
        </section>

        <section style={modeCardStyle}>
          <strong>Reconnect checklist</strong>
          <p style={mutedParagraphStyle}>
            After a laptop restart or O3DE crash, reconnect through verification instead of guessing.
          </p>
          <ul style={checklistStyle}>
            <li>Confirm project root, engine root, and editor runner.</li>
            <li>Open Runtime and check backend readiness plus bridge heartbeat.</li>
            <li>Use Prompt Studio only after the active profile matches the intended project.</li>
          </ul>
          <div style={buttonRowStyle}>
            {onOpenRuntimeOverview ? (
              <button type="button" onClick={onOpenRuntimeOverview} style={secondaryActionButtonStyle}>
                Open Runtime
              </button>
            ) : null}
            {onOpenPromptStudio ? (
              <button type="button" onClick={onOpenPromptStudio} style={secondaryActionButtonStyle}>
                Open Prompt Studio
              </button>
            ) : null}
          </div>
        </section>
      </div>
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
  display: "block",
  marginBottom: 4,
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.1em",
  lineHeight: 1.2,
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

const profileShellStyle = {
  display: "grid",
  gap: 14,
} satisfies CSSProperties;

const guidedReconnectStyle = {
  display: "grid",
  gap: 14,
  padding: 16,
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-card-radius)",
  background: "linear-gradient(135deg, var(--app-accent-soft) 0%, var(--app-panel-bg) 100%)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const guidedStepGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
} satisfies CSSProperties;

const guidedStepCardStyle = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 10,
  minWidth: 0,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const stepNumberStyle = {
  display: "inline-grid",
  placeItems: "center",
  width: 28,
  height: 28,
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "50%",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  fontSize: 13,
  fontWeight: 900,
} satisfies CSSProperties;

const guidedStepBodyStyle = {
  display: "grid",
  gap: 7,
  minWidth: 0,
  alignContent: "start",
} satisfies CSSProperties;

const stepStatusStyle = {
  display: "inline-flex",
  width: "fit-content",
  maxWidth: "100%",
  padding: "5px 8px",
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-pill-radius)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
  fontSize: 12,
  fontWeight: 700,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const profileSummaryStyle = {
  display: "grid",
  gap: 12,
  padding: 16,
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-card-radius)",
  background: "linear-gradient(135deg, var(--app-info-bg) 0%, var(--app-panel-bg) 100%)",
} satisfies CSSProperties;

const profileTitleStyle = {
  margin: "4px 0",
  fontSize: 22,
  lineHeight: 1.1,
} satisfies CSSProperties;

const profilePathGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
} satisfies CSSProperties;

const profileGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
  alignItems: "start",
} satisfies CSSProperties;

const profileListStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const profileSelectButtonStyle = {
  display: "grid",
  gap: 4,
  textAlign: "left",
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;

const profileSelectButtonActiveStyle = {
  border: "1px solid var(--app-success-border)",
  background: "var(--app-success-bg)",
  color: "var(--app-success-text)",
} satisfies CSSProperties;

const formFieldStyle = {
  display: "grid",
  gap: 5,
  color: "var(--app-muted-color)",
  fontSize: 13,
  fontWeight: 700,
} satisfies CSSProperties;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: "9px 10px",
  background: "var(--app-input-bg)",
  color: "var(--app-text-color)",
  font: "inherit",
} satisfies CSSProperties;

const buttonRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const primaryActionButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  cursor: "pointer",
  fontWeight: 800,
} satisfies CSSProperties;

const secondaryActionButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontWeight: 700,
} satisfies CSSProperties;

const statusTextStyle = {
  margin: 0,
  padding: 10,
  border: "1px solid var(--app-warning-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-warning-bg)",
  color: "var(--app-warning-text)",
  lineHeight: 1.4,
} satisfies CSSProperties;
