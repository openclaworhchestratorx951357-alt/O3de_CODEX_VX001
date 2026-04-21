import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import {
  createPromptSession,
  executePromptSession,
  fetchO3deTarget,
  fetchPromptCapabilities,
  fetchPromptSession,
  fetchPromptSessions,
} from "../lib/api";
import type {
  O3DETargetConfig,
  PromptCapabilityEntry,
  PromptRequest,
  PromptSessionRecord,
} from "../types/contracts";
import { useSettings } from "../lib/settings/hooks";
import PanelGuideDetails from "./PanelGuideDetails";
import PromptCapabilityPanel from "./PromptCapabilityPanel";
import PromptExecutionTimeline from "./PromptExecutionTimeline";
import PromptPlanPanel from "./PromptPlanPanel";
import PromptSessionPanel from "./PromptSessionPanel";

const promptControlGuide = getPanelGuide("prompt-control");
const promptControlPromptTextGuide = getPanelControlGuide("prompt-control", "prompt-text");
const promptControlProjectRootGuide = getPanelControlGuide("prompt-control", "project-root");
const promptControlEngineRootGuide = getPanelControlGuide("prompt-control", "engine-root");
const promptControlWorkspaceIdGuide = getPanelControlGuide("prompt-control", "workspace-id");
const promptControlExecutorIdGuide = getPanelControlGuide("prompt-control", "executor-id");
const promptControlPreferredDomainsGuide = getPanelControlGuide("prompt-control", "preferred-domains");
const promptControlOperatorNoteGuide = getPanelControlGuide("prompt-control", "operator-note");
const promptControlDryRunGuide = getPanelControlGuide("prompt-control", "dry-run");
const promptControlPreviewPlanGuide = getPanelControlGuide("prompt-control", "preview-plan");
const promptControlRefreshSessionsGuide = getPanelControlGuide("prompt-control", "refresh-sessions");
const promptControlExecuteSelectedGuide = getPanelControlGuide("prompt-control", "execute-selected");

type PromptControlPanelProps = {
  selectedWorkspaceId?: string | null;
  selectedExecutorId?: string | null;
};

export default function PromptControlPanel({
  selectedWorkspaceId = null,
  selectedExecutorId = null,
}: PromptControlPanelProps) {
  const { settings } = useSettings();
  const [promptText, setPromptText] = useState("");
  const [projectRoot, setProjectRoot] = useState(settings.operatorDefaults.projectRoot);
  const [engineRoot, setEngineRoot] = useState(settings.operatorDefaults.engineRoot);
  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceIdEdited, setWorkspaceIdEdited] = useState(false);
  const [executorId, setExecutorId] = useState("");
  const [executorIdEdited, setExecutorIdEdited] = useState(false);
  const [preferredDomainsText, setPreferredDomainsText] = useState("");
  const [operatorNote, setOperatorNote] = useState("");
  const [dryRun, setDryRun] = useState(settings.operatorDefaults.dryRun);
  const [sessions, setSessions] = useState<PromptSessionRecord[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<PromptSessionRecord | null>(null);
  const [capabilities, setCapabilities] = useState<PromptCapabilityEntry[]>([]);
  const [targetConfig, setTargetConfig] = useState<O3DETargetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousOperatorDefaultsRef = useRef(settings.operatorDefaults);
  const initialProjectRootRef = useRef(projectRoot);
  const initialEngineRootRef = useRef(engineRoot);
  const effectiveWorkspaceId = workspaceIdEdited ? workspaceId : (selectedWorkspaceId ?? "");
  const effectiveExecutorId = executorIdEdited ? executorId : (selectedExecutorId ?? "");
  const preferredDomainSuggestions = Array.from(new Set(
    capabilities
      .map((capability) => capability.agent_family.trim())
      .filter(Boolean),
  ));
  const preferredDomainsPlaceholder = preferredDomainSuggestions.length > 0
    ? preferredDomainSuggestions.join(", ")
    : "Leave blank to allow the planner to choose from admitted domains.";
  const projectRootEnv = (import.meta.env.VITE_O3DE_TARGET_PROJECT_ROOT as string | undefined) ?? "";
  const engineRootEnv = (import.meta.env.VITE_O3DE_TARGET_ENGINE_ROOT as string | undefined) ?? "";

  const getDefaultProjectRoot = useCallback((nextTarget: O3DETargetConfig | null): string => (
    settings.operatorDefaults.projectRoot
      || nextTarget?.project_root
      || projectRootEnv
  ), [projectRootEnv, settings.operatorDefaults.projectRoot]);

  const getDefaultEngineRoot = useCallback((nextTarget: O3DETargetConfig | null): string => (
    settings.operatorDefaults.engineRoot
      || nextTarget?.engine_root
      || engineRootEnv
  ), [engineRootEnv, settings.operatorDefaults.engineRoot]);

  const loadPromptData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextTarget, capabilityList, sessionList] = await Promise.all([
        fetchO3deTarget().catch(() => null),
        fetchPromptCapabilities(),
        fetchPromptSessions(),
      ]);
      setTargetConfig(nextTarget);
      if (!projectRoot.trim()) {
        setProjectRoot(getDefaultProjectRoot(nextTarget));
      }
      if (!engineRoot.trim()) {
        setEngineRoot(getDefaultEngineRoot(nextTarget));
      }
      setCapabilities(capabilityList);
      setSessions(sessionList);
      if (!selectedPromptId && sessionList[0]) {
        setSelectedPromptId(sessionList[0].prompt_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown prompt-panel error");
    } finally {
      setLoading(false);
    }
  }, [
    engineRoot,
    getDefaultEngineRoot,
    getDefaultProjectRoot,
    projectRoot,
    selectedPromptId,
  ]);

  useEffect(() => {
    const initialProjectRoot = initialProjectRootRef.current;
    const initialEngineRoot = initialEngineRootRef.current;
    let cancelled = false;
    void Promise.all([
      fetchO3deTarget().catch(() => null),
      fetchPromptCapabilities(),
      fetchPromptSessions(),
    ])
      .then(([nextTarget, capabilityList, sessionList]) => {
        if (cancelled) {
          return;
        }
        setTargetConfig(nextTarget);
        if (!initialProjectRoot.trim()) {
          setProjectRoot(nextTarget?.project_root || projectRootEnv);
        }
        if (!initialEngineRoot.trim()) {
          setEngineRoot(nextTarget?.engine_root || engineRootEnv);
        }
        setCapabilities(capabilityList);
        setSessions(sessionList);
        if (sessionList[0]) {
          setSelectedPromptId(sessionList[0].prompt_id);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unknown prompt-panel error");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [engineRootEnv, projectRootEnv]);

  useEffect(() => {
    if (!selectedPromptId) {
      return;
    }
    let cancelled = false;
    void fetchPromptSession(selectedPromptId)
      .then((session) => {
        if (cancelled) {
          return;
        }
        setSelectedSession(session);
        setSessions((current) => current.map((entry) => (
          entry.prompt_id === session.prompt_id ? session : entry
        )));
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Prompt session detail load failed");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPromptId]);

  useEffect(() => {
    const previousDefaults = previousOperatorDefaultsRef.current;
    const previousProjectRoot = previousDefaults.projectRoot;
    const previousEngineRoot = previousDefaults.engineRoot;
    const nextProjectRoot = getDefaultProjectRoot(targetConfig);
    const nextEngineRoot = getDefaultEngineRoot(targetConfig);

    if (projectRoot === previousProjectRoot || (!projectRoot && !previousProjectRoot)) {
      setProjectRoot(nextProjectRoot);
    }
    if (engineRoot === previousEngineRoot || (!engineRoot && !previousEngineRoot)) {
      setEngineRoot(nextEngineRoot);
    }
    if (dryRun === previousDefaults.dryRun) {
      setDryRun(settings.operatorDefaults.dryRun);
    }

    previousOperatorDefaultsRef.current = settings.operatorDefaults;
  }, [
    dryRun,
    engineRoot,
    getDefaultEngineRoot,
    getDefaultProjectRoot,
    projectRoot,
    settings.operatorDefaults,
    targetConfig,
  ]);

  async function handlePreviewPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const request: PromptRequest = {
        prompt_id: crypto.randomUUID(),
        prompt_text: promptText,
        project_root: projectRoot,
        engine_root: engineRoot,
        workspace_id: effectiveWorkspaceId.trim() || null,
        executor_id: effectiveExecutorId.trim() || null,
        dry_run: dryRun,
        preferred_domains: preferredDomainsText
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        operator_note: operatorNote.trim() || null,
      };
      const session = await createPromptSession(request);
      setSessions((current) => [session, ...current.filter((entry) => entry.prompt_id !== session.prompt_id)]);
      setSelectedPromptId(session.prompt_id);
      setSelectedSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt session preview failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExecuteSelectedSession() {
    if (!selectedPromptId) {
      return;
    }
    setExecuting(true);
    setError(null);
    try {
      const session = await executePromptSession(selectedPromptId);
      setSelectedSession(session);
      setSessions((current) => current.map((entry) => (
        entry.prompt_id === session.prompt_id ? session : entry
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt session execution failed");
    } finally {
      setExecuting(false);
    }
  }

  const executeDisabled = !selectedSession
    || !selectedSession.plan?.admitted
    || selectedSession.status === "completed"
    || selectedSession.status === "running"
    || selectedSession.status === "refused";
  const executeLabel = selectedSession && selectedSession.status !== "planned"
    ? "Execute / Continue Selected Prompt"
    : "Execute Selected Prompt";

  return (
    <section style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>Prompt Control</h2>
      <p style={subtleTextStyle}>
        Natural-language prompts compile into admitted typed control-plane steps only. The prompt layer never runs arbitrary shell, Python, or editor commands directly.
      </p>
      <p style={subtleTextStyle}>
        Each prompt-exposed surface carries an explicit safety envelope for state scope, backup, rollback, verification, retention, and natural-language readiness, so broader authoring can widen without hiding what is still blocked or simulated.
      </p>
      <PanelGuideDetails
        tooltip={promptControlGuide.tooltip}
        checklist={promptControlGuide.checklist}
      />
      {targetConfig?.project_root || targetConfig?.engine_root ? (
        <p style={subtleTextStyle}>
          Active local target: <strong>{targetConfig.project_root ?? "project unset"}</strong>
          {" "}on{" "}
          <strong>{targetConfig.engine_root ?? "engine unset"}</strong>
          {" "}via {targetConfig.source_label}.
        </p>
      ) : (
        <p style={subtleTextStyle}>
          Live target detection is not available yet. Confirm the project root and
          engine root manually before previewing a prompt plan.
        </p>
      )}
      <form onSubmit={handlePreviewPlan} style={{ display: "grid", gap: 12 }}>
        <label>
          Prompt text
          <textarea
            title={promptControlPromptTextGuide.tooltip}
            rows={4}
            style={inputStyle}
            value={promptText}
            onChange={(event) => setPromptText(event.target.value)}
            placeholder="Inspect project manifest, capture viewport, and check asset processor status."
          />
        </label>
        <div style={twoColumnGridStyle}>
          <label>
            Project root
            <input
              title={promptControlProjectRootGuide.tooltip}
              style={inputStyle}
              value={projectRoot}
              onChange={(event) => setProjectRoot(event.target.value)}
              placeholder="Saved default or detected local target project root"
            />
          </label>
          <label>
            Engine root
            <input
              title={promptControlEngineRootGuide.tooltip}
              style={inputStyle}
              value={engineRoot}
              onChange={(event) => setEngineRoot(event.target.value)}
              placeholder="Saved default or detected local target engine root"
            />
          </label>
          <label>
            Workspace id
            <input
              title={promptControlWorkspaceIdGuide.tooltip}
              style={inputStyle}
              value={effectiveWorkspaceId}
              onChange={(event) => {
                setWorkspaceIdEdited(true);
                setWorkspaceId(event.target.value);
              }}
            />
          </label>
          <label>
            Executor id
            <input
              title={promptControlExecutorIdGuide.tooltip}
              style={inputStyle}
              value={effectiveExecutorId}
              onChange={(event) => {
                setExecutorIdEdited(true);
                setExecutorId(event.target.value);
              }}
            />
          </label>
        </div>
        <div style={twoColumnGridStyle}>
          <label>
            Preferred domains (comma-separated)
            <input
              title={promptControlPreferredDomainsGuide.tooltip}
              style={inputStyle}
              value={preferredDomainsText}
              onChange={(event) => setPreferredDomainsText(event.target.value)}
              placeholder={preferredDomainsPlaceholder}
            />
          </label>
          <label>
            Operator note
            <input
              title={promptControlOperatorNoteGuide.tooltip}
              style={inputStyle}
              value={operatorNote}
              onChange={(event) => setOperatorNote(event.target.value)}
            />
          </label>
        </div>
        <label style={checkboxStyle}>
          <input
            title={promptControlDryRunGuide.tooltip}
            type="checkbox"
            checked={dryRun}
            onChange={(event) => setDryRun(event.target.checked)}
          />
          Default child dispatches to dry-run where the admitted capability supports it.
        </label>
        <div style={actionRowStyle}>
          <button
            type="submit"
            title={promptControlPreviewPlanGuide.tooltip}
            disabled={submitting || !promptText.trim() || !projectRoot.trim() || !engineRoot.trim()}
          >
            {submitting ? "Planning..." : "Preview Prompt Plan"}
          </button>
          <button
            type="button"
            title={promptControlRefreshSessionsGuide.tooltip}
            onClick={() => { void loadPromptData(); }}
            disabled={loading}
          >
            Refresh Prompt Sessions
          </button>
          <button
            type="button"
            title={promptControlExecuteSelectedGuide.tooltip}
            onClick={() => { void handleExecuteSelectedSession(); }}
            disabled={executeDisabled || executing}
          >
            {executing ? "Executing..." : executeLabel}
          </button>
        </div>
        {error ? <div style={errorStyle}>{error}</div> : null}
      </form>

      <div style={promptGridStyle}>
        <PromptSessionPanel
          sessions={sessions}
          selectedPromptId={selectedPromptId}
          onSelect={setSelectedPromptId}
        />
        <PromptPlanPanel session={selectedSession} />
      </div>
      <div style={promptGridStyle}>
        <PromptExecutionTimeline session={selectedSession} />
        <PromptCapabilityPanel capabilities={capabilities} session={selectedSession} />
      </div>
    </section>
  );
}

const panelStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "var(--app-panel-padding)",
  marginBottom: 24,
  background: "var(--app-panel-bg-muted)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: 8,
  borderRadius: "var(--app-card-radius)",
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-input-bg)",
  color: "var(--app-text-color)",
  font: "inherit",
} satisfies CSSProperties;

const twoColumnGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
} satisfies CSSProperties;

const promptGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
  marginTop: 16,
} satisfies CSSProperties;

const actionRowStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
} satisfies CSSProperties;

const checkboxStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const errorStyle = {
  color: "var(--app-danger-text)",
} satisfies CSSProperties;
