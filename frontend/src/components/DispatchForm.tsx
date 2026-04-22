import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { dispatchTool, fetchO3deTarget } from "../lib/api";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import {
  getDispatchExpectedExecutionTruth,
  getHybridDispatchNote,
} from "../lib/executionTruth";
import { useSettings } from "../lib/settings/hooks";
import PanelGuideDetails from "./PanelGuideDetails";
import StatusChip from "./StatusChip";
import {
  getCapabilityTone,
  getDispatchExpectedExecutionTruthTone,
} from "./statusChipTones";
import type {
  AdaptersResponse,
  CatalogAgent,
  LockName,
  O3DETargetConfig,
  RequestEnvelope,
  ReadinessStatus,
  ResponseEnvelope,
} from "../types/contracts";
import { LOCK_NAME_VALUES } from "../types/settings";

type DispatchFormProps = {
  agents: CatalogAgent[];
  adapters: AdaptersResponse | null;
  readiness: ReadinessStatus | null;
  onResponse: (response: ResponseEnvelope) => void;
};

const dispatchFormGuide = getPanelGuide("dispatch-form");
const dispatchAgentControlGuide = getPanelControlGuide("dispatch-form", "agent");
const dispatchToolControlGuide = getPanelControlGuide("dispatch-form", "tool");
const dispatchProjectRootControlGuide = getPanelControlGuide("dispatch-form", "project-root");
const dispatchEngineRootControlGuide = getPanelControlGuide("dispatch-form", "engine-root");
const dispatchLocksControlGuide = getPanelControlGuide("dispatch-form", "locks");
const dispatchTimeoutControlGuide = getPanelControlGuide("dispatch-form", "timeout");
const dispatchArgsControlGuide = getPanelControlGuide("dispatch-form", "args");
const dispatchDryRunControlGuide = getPanelControlGuide("dispatch-form", "dry-run");
const dispatchSubmitControlGuide = getPanelControlGuide("dispatch-form", "submit");

export default function DispatchForm({
  agents,
  adapters,
  readiness,
  onResponse,
}: DispatchFormProps) {
  const { settings } = useSettings();
  const firstAgent = agents[0]?.id ?? "";
  const toolsForSelectedAgent = useMemo(
    () => agents.find((agent) => agent.id === firstAgent)?.tools ?? [],
    [agents, firstAgent],
  );

  const [request, setRequest] = useState<RequestEnvelope>(() => ({
    request_id: crypto.randomUUID(),
    tool: toolsForSelectedAgent[0]?.name ?? "",
    agent: firstAgent,
    project_root: settings.operatorDefaults.projectRoot || "/path/to/project",
    engine_root: settings.operatorDefaults.engineRoot || "/path/to/engine",
    dry_run: settings.operatorDefaults.dryRun,
    locks: settings.operatorDefaults.locks,
    timeout_s: settings.operatorDefaults.timeoutSeconds,
    args: {},
  }));
  const [argsText, setArgsText] = useState("{}");
  const [locksText, setLocksText] = useState(settings.operatorDefaults.locks.join(", "));
  const [targetConfig, setTargetConfig] = useState<O3DETargetConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousOperatorDefaultsRef = useRef(settings.operatorDefaults);

  const selectedAgent = agents.find((agent) => agent.id === request.agent);
  const effectiveAgent = selectedAgent ?? agents[0] ?? null;
  const availableTools = effectiveAgent?.tools ?? [];
  const selectedTool = availableTools.find((tool) => tool.name === request.tool);
  const effectiveToolName = selectedTool?.name ?? availableTools[0]?.name ?? "";
  const hybridModeActive = readiness?.adapter_mode.active_mode === "hybrid";
  const selectedFamily = selectedTool?.adapter_family ?? effectiveAgent?.id ?? request.agent;
  const selectedFamilyStatus = adapters?.families.find(
    (family) => family.family === selectedFamily,
  );
  const selectedToolMayUseRealPath = hybridModeActive
    && selectedFamilyStatus?.supports_real_execution === true
    && selectedTool?.real_adapter_availability === true;
  const selectedToolMayUseRealPlanOnlyPath = hybridModeActive
    && effectiveToolName === "build.configure"
    && selectedFamilyStatus?.supports_real_execution === true;
  const selectedCapabilityStatus = selectedTool?.capability_status ?? "simulated-only";
  const selectedExpectedExecutionTruth = getDispatchExpectedExecutionTruth(
    effectiveToolName,
    selectedCapabilityStatus,
    selectedToolMayUseRealPath,
    selectedToolMayUseRealPlanOnlyPath,
  );
  const hybridDispatchNote = getHybridDispatchNote(
    hybridModeActive,
    effectiveToolName,
    selectedToolMayUseRealPath,
    selectedToolMayUseRealPlanOnlyPath,
  );

  const getDefaultProjectRoot = useCallback((target: O3DETargetConfig | null): string => {
    return settings.operatorDefaults.projectRoot
      || target?.project_root
      || ((import.meta.env.VITE_O3DE_TARGET_PROJECT_ROOT as string | undefined) ?? "/path/to/project");
  }, [settings.operatorDefaults.projectRoot]);

  const getDefaultEngineRoot = useCallback((target: O3DETargetConfig | null): string => {
    return settings.operatorDefaults.engineRoot
      || target?.engine_root
      || ((import.meta.env.VITE_O3DE_TARGET_ENGINE_ROOT as string | undefined) ?? "/path/to/engine");
  }, [settings.operatorDefaults.engineRoot]);

  useEffect(() => {
    let cancelled = false;
    void fetchO3deTarget()
      .then((target) => {
        if (cancelled) {
          return;
        }
        setTargetConfig(target);
        setRequest((current) => ({
          ...current,
          project_root: current.project_root === "/path/to/project"
            ? getDefaultProjectRoot(target)
            : current.project_root,
          engine_root: current.engine_root === "/path/to/engine"
            ? getDefaultEngineRoot(target)
            : current.engine_root,
        }));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setRequest((current) => ({
          ...current,
          project_root: current.project_root === "/path/to/project"
            ? getDefaultProjectRoot(null)
            : current.project_root,
          engine_root: current.engine_root === "/path/to/engine"
            ? getDefaultEngineRoot(null)
            : current.engine_root,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [getDefaultEngineRoot, getDefaultProjectRoot]);

  useEffect(() => {
    const previousDefaults = previousOperatorDefaultsRef.current;
    const previousProjectRoot = previousDefaults.projectRoot || "/path/to/project";
    const previousEngineRoot = previousDefaults.engineRoot || "/path/to/engine";
    const nextProjectRoot = getDefaultProjectRoot(targetConfig);
    const nextEngineRoot = getDefaultEngineRoot(targetConfig);

    setRequest((current) => ({
      ...current,
      project_root: current.project_root === previousProjectRoot || current.project_root === "/path/to/project"
        ? nextProjectRoot
        : current.project_root,
      engine_root: current.engine_root === previousEngineRoot || current.engine_root === "/path/to/engine"
        ? nextEngineRoot
        : current.engine_root,
      dry_run: current.dry_run === previousDefaults.dryRun ? settings.operatorDefaults.dryRun : current.dry_run,
      timeout_s: current.timeout_s === previousDefaults.timeoutSeconds
        ? settings.operatorDefaults.timeoutSeconds
        : current.timeout_s,
      locks: current.locks.join(",") === previousDefaults.locks.join(",")
        ? settings.operatorDefaults.locks
        : current.locks,
    }));

    if (locksText === previousDefaults.locks.join(", ")) {
      setLocksText(settings.operatorDefaults.locks.join(", "));
    }

    previousOperatorDefaultsRef.current = settings.operatorDefaults;
  }, [getDefaultEngineRoot, getDefaultProjectRoot, locksText, settings.operatorDefaults, targetConfig]);

  function isLockName(value: string): value is LockName {
    return LOCK_NAME_VALUES.includes(value as LockName);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!effectiveAgent || !effectiveToolName) {
      setError("The live tools catalog is not available yet, so dispatch is still disabled.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const parsedArgs = JSON.parse(argsText) as Record<string, unknown>;
      const parsedLocks = locksText
        .split(",")
        .map((item) => item.trim())
        .filter(isLockName);

      const response = await dispatchTool({
        ...request,
        request_id: crypto.randomUUID(),
        agent: effectiveAgent?.id ?? request.agent,
        tool: effectiveToolName,
        args: parsedArgs,
        locks: parsedLocks,
      });
      onResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown dispatch error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      style={{
        border: "1px solid var(--app-panel-border)",
        borderRadius: "var(--app-panel-radius)",
        padding: "var(--app-panel-padding)",
        background: "var(--app-panel-bg-muted)",
        boxShadow: "var(--app-shadow-soft)",
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Dispatch Tool Request</h3>
      {hybridDispatchNote ? (
        <p style={{ marginTop: 0, color: "var(--app-muted-color)" }}>{hybridDispatchNote}</p>
      ) : null}
      {targetConfig?.project_root || targetConfig?.engine_root ? (
        <p style={{ marginTop: 0, color: "var(--app-muted-color)" }}>
          Active local target: <strong>{targetConfig.project_root ?? "project unset"}</strong>
          {" "}on{" "}
          <strong>{targetConfig.engine_root ?? "engine unset"}</strong>
          {" "}via {targetConfig.source_label}.
        </p>
      ) : null}
      <PanelGuideDetails
        tooltip={dispatchFormGuide.tooltip}
        checklist={dispatchFormGuide.checklist}
      />
      {agents.length === 0 ? (
        <p style={{ marginTop: 0, color: "var(--app-warning-text)" }}>
          Dispatch is disabled until the live tools catalog is available.
        </p>
      ) : null}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            Agent
            <select
              title={dispatchAgentControlGuide.tooltip}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={effectiveAgent?.id ?? request.agent}
              disabled={agents.length === 0}
              onChange={(e) => {
                const nextAgent = agents.find((agent) => agent.id === e.target.value);
                setRequest({
                  ...request,
                  agent: e.target.value,
                  tool: nextAgent?.tools[0]?.name ?? request.tool,
                });
              }}
            >
              {agents.length === 0 ? (
                <option value="">No live agents available</option>
              ) : null}
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tool
            <select
              title={dispatchToolControlGuide.tooltip}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={effectiveToolName}
              disabled={!effectiveAgent || availableTools.length === 0}
              onChange={(e) => setRequest({ ...request, tool: e.target.value })}
            >
              {availableTools.length === 0 ? (
                <option value="">No live tools available</option>
              ) : null}
              {availableTools.map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name}
                </option>
              ))}
            </select>
          </label>

          {selectedTool ? (
            <div
              style={{
                border: "1px solid var(--app-panel-border)",
                borderRadius: "var(--app-card-radius)",
                padding: 12,
                background: "var(--app-panel-bg)",
                color: "var(--app-muted-color)",
              }}
            >
              <div><strong>Approval class:</strong> {selectedTool.approval_class}</div>
              <div>
                <strong>Capability:</strong>{" "}
                <StatusChip
                  label={selectedCapabilityStatus}
                  tone={getCapabilityTone(selectedCapabilityStatus)}
                />
              </div>
              <div><strong>Risk:</strong> {selectedTool.risk}</div>
              <div>
                <strong>Expected execution truth:</strong>{" "}
                <StatusChip
                  label={selectedExpectedExecutionTruth}
                  tone={getDispatchExpectedExecutionTruthTone(
                    selectedCapabilityStatus,
                    selectedToolMayUseRealPath,
                    selectedToolMayUseRealPlanOnlyPath,
                  )}
                />
              </div>
            </div>
          ) : null}

          <label>
            Project Root
            <input
              title={dispatchProjectRootControlGuide.tooltip}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={request.project_root}
              onChange={(e) =>
                setRequest({ ...request, project_root: e.target.value })
              }
            />
          </label>

          <label>
            Engine Root
            <input
              title={dispatchEngineRootControlGuide.tooltip}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={request.engine_root}
              onChange={(e) =>
                setRequest({ ...request, engine_root: e.target.value })
              }
            />
          </label>

          <label>
            Locks (comma-separated)
            <input
              title={dispatchLocksControlGuide.tooltip}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={locksText}
              onChange={(e) => setLocksText(e.target.value)}
            />
          </label>

          <label>
            Timeout (seconds)
            <input
              type="number"
              min={1}
              title={dispatchTimeoutControlGuide.tooltip}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={request.timeout_s}
              onChange={(e) =>
                setRequest({ ...request, timeout_s: Number(e.target.value) || 1 })
              }
            />
          </label>

          <label>
            Args (JSON)
            <textarea
              rows={6}
              title={dispatchArgsControlGuide.tooltip}
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
            />
          </label>
          {effectiveToolName === "project.inspect" ? (
            <p style={{ margin: 0, color: "var(--app-muted-color)" }}>
              Tip: set <code>include_project_config</code>, <code>include_gems</code>,
              optional <code>requested_gem_names</code>, <code>include_settings</code>,
              and optional <code>requested_settings_keys</code> in args JSON to
              request the currently supported real manifest-backed project-config,
              requested-vs-discovered Gem evidence, requested settings subset
              matching, and the explicit manifest-backed origin, presentation,
              identity, and tag inventories in hybrid mode.
            </p>
          ) : null}

          <label>
            Dry Run
            <input
              type="checkbox"
              title={dispatchDryRunControlGuide.tooltip}
              style={{ marginLeft: 8 }}
              checked={request.dry_run}
              onChange={(e) =>
                setRequest({ ...request, dry_run: e.target.checked })
              }
            />
          </label>

          <button
            type="submit"
            title={dispatchSubmitControlGuide.tooltip}
            disabled={submitting || !effectiveAgent || !effectiveToolName}
          >
            {submitting ? "Dispatching..." : "Dispatch Request"}
          </button>

          {error ? <p style={{ color: "var(--app-danger-text)" }}>{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
