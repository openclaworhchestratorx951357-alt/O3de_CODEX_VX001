import { useMemo, useState } from "react";

import { dispatchTool } from "../lib/api";
import type {
  AdaptersResponse,
  CatalogAgent,
  LockName,
  RequestEnvelope,
  ReadinessStatus,
  ResponseEnvelope,
} from "../types/contracts";

type DispatchFormProps = {
  agents: CatalogAgent[];
  adapters: AdaptersResponse | null;
  readiness: ReadinessStatus | null;
  onResponse: (response: ResponseEnvelope) => void;
};

export default function DispatchForm({
  agents,
  adapters,
  readiness,
  onResponse,
}: DispatchFormProps) {
  const firstAgent = agents[0]?.id ?? "project-build";
  const toolsForSelectedAgent = useMemo(() => {
    return (
      agents.find((agent) => agent.id === firstAgent)?.tools ?? [{
        name: "project.inspect",
        description: "Inspect project manifest and override state.",
        approval_class: "read_only",
        default_locks: ["project_config"],
        default_timeout_s: 30,
        risk: "low",
        tags: ["project", "inspect"],
      }]
    );
  }, [agents, firstAgent]);

  const [request, setRequest] = useState<RequestEnvelope>({
    request_id: crypto.randomUUID(),
    tool: toolsForSelectedAgent[0]?.name ?? "project.inspect",
    agent: firstAgent,
    project_root: "/path/to/project",
    engine_root: "/path/to/engine",
    dry_run: true,
    locks: ["project_config"],
    timeout_s: 30,
    args: {},
  });
  const [argsText, setArgsText] = useState("{}");
  const [locksText, setLocksText] = useState("project_config");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAgent = agents.find((agent) => agent.id === request.agent);
  const effectiveAgent = selectedAgent ?? agents[0] ?? null;
  const availableTools = effectiveAgent?.tools ?? [];
  const selectedTool = availableTools.find((tool) => tool.name === request.tool);
  const effectiveToolName = selectedTool?.name ?? availableTools[0]?.name ?? request.tool;
  const hybridModeActive = readiness?.adapter_mode.active_mode === "hybrid";
  const selectedFamily = selectedTool?.adapter_family ?? effectiveAgent?.id ?? request.agent;
  const selectedFamilyStatus = adapters?.families.find(
    (family) => family.family === selectedFamily,
  );
  const selectedToolMayUseRealPath = hybridModeActive
    && effectiveToolName === "project.inspect"
    && selectedFamilyStatus?.supports_real_execution === true;
  const hybridDispatchNote = hybridModeActive
    ? selectedToolMayUseRealPath
      ? "Hybrid mode is active. This tool may use the first real read-only project inspection path when its manifest preconditions are satisfied; otherwise it will fall back to simulation."
      : "Hybrid mode is active, but this selected tool will still remain simulated in this phase."
    : null;

  function isLockName(value: string): value is LockName {
    return [
      "editor_session",
      "project_config",
      "asset_pipeline",
      "render_pipeline",
      "build_tree",
      "engine_source",
      "test_runtime",
    ].includes(value);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Dispatch Tool Request</h3>
      {hybridDispatchNote ? (
        <p style={{ marginTop: 0, color: "#57606a" }}>{hybridDispatchNote}</p>
      ) : null}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            Agent
            <select
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={effectiveAgent?.id ?? request.agent}
              onChange={(e) => {
                const nextAgent = agents.find((agent) => agent.id === e.target.value);
                setRequest({
                  ...request,
                  agent: e.target.value,
                  tool: nextAgent?.tools[0]?.name ?? request.tool,
                });
              }}
            >
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
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={effectiveToolName}
              onChange={(e) => setRequest({ ...request, tool: e.target.value })}
            >
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
                border: "1px solid #d8dee4",
                borderRadius: 8,
                padding: 12,
                background: "#f6f8fa",
                color: "#57606a",
              }}
            >
              <div><strong>Approval class:</strong> {selectedTool.approval_class}</div>
              <div><strong>Risk:</strong> {selectedTool.risk}</div>
              <div>
                <strong>Expected execution truth:</strong>{" "}
                {selectedToolMayUseRealPath
                  ? "Possible real read-only project inspection in hybrid mode; simulated fallback remains explicit."
                  : "Simulated in the current phase."}
              </div>
            </div>
          ) : null}

          <label>
            Project Root
            <input
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
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
            />
          </label>

          <label>
            Dry Run
            <input
              type="checkbox"
              style={{ marginLeft: 8 }}
              checked={request.dry_run}
              onChange={(e) =>
                setRequest({ ...request, dry_run: e.target.checked })
              }
            />
          </label>

          <button type="submit" disabled={submitting || agents.length === 0}>
            {submitting ? "Dispatching..." : "Dispatch Request"}
          </button>

          {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
