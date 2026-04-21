import { useEffect, useState, type CSSProperties, type FormEvent } from "react";

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
import PromptCapabilityPanel from "./PromptCapabilityPanel";
import PromptExecutionTimeline from "./PromptExecutionTimeline";
import PromptPlanPanel from "./PromptPlanPanel";
import PromptSessionPanel from "./PromptSessionPanel";

type PromptControlPanelProps = {
  selectedWorkspaceId?: string | null;
  selectedExecutorId?: string | null;
};

export default function PromptControlPanel({
  selectedWorkspaceId = null,
  selectedExecutorId = null,
}: PromptControlPanelProps) {
  const [promptText, setPromptText] = useState("");
  const [projectRoot, setProjectRoot] = useState("");
  const [engineRoot, setEngineRoot] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [executorId, setExecutorId] = useState("");
  const [preferredDomainsText, setPreferredDomainsText] = useState("");
  const [operatorNote, setOperatorNote] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [sessions, setSessions] = useState<PromptSessionRecord[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<PromptSessionRecord | null>(null);
  const [capabilities, setCapabilities] = useState<PromptCapabilityEntry[]>([]);
  const [targetConfig, setTargetConfig] = useState<O3DETargetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPromptData();
  }, []);

  useEffect(() => {
    if (!workspaceId.trim() && selectedWorkspaceId) {
      setWorkspaceId(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, workspaceId]);

  useEffect(() => {
    if (!executorId.trim() && selectedExecutorId) {
      setExecutorId(selectedExecutorId);
    }
  }, [selectedExecutorId, executorId]);

  useEffect(() => {
    if (!selectedPromptId) {
      setSelectedSession(null);
      return;
    }
    void loadSelectedSession(selectedPromptId);
  }, [selectedPromptId]);

  async function loadPromptData() {
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
        setProjectRoot(
          nextTarget?.project_root
          ?? ((import.meta.env.VITE_O3DE_TARGET_PROJECT_ROOT as string | undefined) ?? ""),
        );
      }
      if (!engineRoot.trim()) {
        setEngineRoot(
          nextTarget?.engine_root
          ?? ((import.meta.env.VITE_O3DE_TARGET_ENGINE_ROOT as string | undefined) ?? ""),
        );
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
  }

  async function loadSelectedSession(promptId: string) {
    try {
      const session = await fetchPromptSession(promptId);
      setSelectedSession(session);
      setSessions((current) => current.map((entry) => (
        entry.prompt_id === session.prompt_id ? session : entry
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prompt session detail load failed");
    }
  }

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
        workspace_id: workspaceId.trim() || null,
        executor_id: executorId.trim() || null,
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
      {targetConfig?.project_root || targetConfig?.engine_root ? (
        <p style={subtleTextStyle}>
          Active local target: <strong>{targetConfig.project_root ?? "project unset"}</strong>
          {" "}on{" "}
          <strong>{targetConfig.engine_root ?? "engine unset"}</strong>
          {" "}via {targetConfig.source_label}.
        </p>
      ) : null}
      <form onSubmit={handlePreviewPlan} style={{ display: "grid", gap: 12 }}>
        <label>
          Prompt text
          <textarea
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
              style={inputStyle}
              value={projectRoot}
              onChange={(event) => setProjectRoot(event.target.value)}
              placeholder="C:\\Users\\operator\\O3DE\\MyProject"
            />
          </label>
          <label>
            Engine root
            <input
              style={inputStyle}
              value={engineRoot}
              onChange={(event) => setEngineRoot(event.target.value)}
              placeholder="C:\\O3DE\\engine"
            />
          </label>
          <label>
            Workspace id
            <input
              style={inputStyle}
              value={workspaceId}
              onChange={(event) => setWorkspaceId(event.target.value)}
            />
          </label>
          <label>
            Executor id
            <input
              style={inputStyle}
              value={executorId}
              onChange={(event) => setExecutorId(event.target.value)}
            />
          </label>
        </div>
        <div style={twoColumnGridStyle}>
          <label>
            Preferred domains (comma-separated)
            <input
              style={inputStyle}
              value={preferredDomainsText}
              onChange={(event) => setPreferredDomainsText(event.target.value)}
              placeholder="project-build, render-lookdev"
            />
          </label>
          <label>
            Operator note
            <input
              style={inputStyle}
              value={operatorNote}
              onChange={(event) => setOperatorNote(event.target.value)}
            />
          </label>
        </div>
        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(event) => setDryRun(event.target.checked)}
          />
          Default child dispatches to dry-run where the admitted capability supports it.
        </label>
        <div style={actionRowStyle}>
          <button
            type="submit"
            disabled={submitting || !promptText.trim() || !projectRoot.trim() || !engineRoot.trim()}
          >
            {submitting ? "Planning..." : "Preview Prompt Plan"}
          </button>
          <button type="button" onClick={() => { void loadPromptData(); }} disabled={loading}>
            Refresh Prompt Sessions
          </button>
          <button type="button" onClick={() => { void handleExecuteSelectedSession(); }} disabled={executeDisabled || executing}>
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
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 16,
  marginBottom: 24,
  background: "#ffffff",
} satisfies CSSProperties;

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: 8,
  borderRadius: 8,
  border: "1px solid #d0d7de",
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
  color: "#57606a",
} satisfies CSSProperties;

const subtleTextStyle = {
  color: "#57606a",
} satisfies CSSProperties;

const errorStyle = {
  color: "#cf222e",
} satisfies CSSProperties;
