import { useEffect, useMemo, useState } from "react";

import { dispatchTool } from "../lib/api";
import type { RequestEnvelope, ResponseEnvelope } from "../types/contracts";

type CatalogAgent = {
  id: string;
  name: string;
  tools: string[];
};

type DispatchFormProps = {
  agents: CatalogAgent[];
  onResponse: (response: ResponseEnvelope) => void;
};

export default function DispatchForm({ agents, onResponse }: DispatchFormProps) {
  const firstAgent = agents[0]?.id ?? "project-build";
  const toolsForSelectedAgent = useMemo(() => {
    return agents.find((agent) => agent.id === firstAgent)?.tools ?? ["project.inspect"];
  }, [agents, firstAgent]);

  const [request, setRequest] = useState<RequestEnvelope>({
    request_id: crypto.randomUUID(),
    tool: toolsForSelectedAgent[0] ?? "project.inspect",
    agent: firstAgent,
    project_root: "/path/to/project",
    engine_root: "/path/to/engine",
    dry_run: true,
    locks: ["project_config"],
    timeout_s: 30,
    args: {},
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAgent = agents.find((agent) => agent.id === request.agent);
  const availableTools = selectedAgent?.tools ?? [];

  useEffect(() => {
    if (!selectedAgent && agents.length > 0) {
      const fallbackAgent = agents[0];
      setRequest((current) => ({
        ...current,
        agent: fallbackAgent.id,
        tool: fallbackAgent.tools[0] ?? current.tool,
      }));
      return;
    }

    if (selectedAgent && !selectedAgent.tools.includes(request.tool)) {
      setRequest((current) => ({
        ...current,
        tool: selectedAgent.tools[0] ?? current.tool,
      }));
    }
  }, [agents, request.tool, selectedAgent]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await dispatchTool({
        ...request,
        request_id: crypto.randomUUID(),
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
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: 12 }}>
          <label>
            Agent
            <select
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={request.agent}
              onChange={(e) => {
                const nextAgent = agents.find((agent) => agent.id === e.target.value);
                setRequest({
                  ...request,
                  agent: e.target.value,
                  tool: nextAgent?.tools[0] ?? request.tool,
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
              value={request.tool}
              onChange={(e) => setRequest({ ...request, tool: e.target.value })}
            >
              {availableTools.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>
          </label>

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
