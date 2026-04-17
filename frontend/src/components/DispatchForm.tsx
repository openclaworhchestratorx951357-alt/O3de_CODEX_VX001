import { useState } from "react";

import { dispatchTool } from "../lib/api";
import type { RequestEnvelope, ResponseEnvelope } from "../types/contracts";

type DispatchFormProps = {
  onResponse: (response: ResponseEnvelope) => void;
};

const initialRequest: RequestEnvelope = {
  request_id: crypto.randomUUID(),
  tool: "project.inspect",
  agent: "project-build",
  project_root: "/path/to/project",
  engine_root: "/path/to/engine",
  dry_run: true,
  locks: ["project_config"],
  timeout_s: 30,
  args: {},
};

export default function DispatchForm({ onResponse }: DispatchFormProps) {
  const [request, setRequest] = useState<RequestEnvelope>(initialRequest);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            Tool
            <input
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={request.tool}
              onChange={(e) => setRequest({ ...request, tool: e.target.value })}
            />
          </label>

          <label>
            Agent
            <input
              style={{ display: "block", width: "100%", marginTop: 4 }}
              value={request.agent}
              onChange={(e) => setRequest({ ...request, agent: e.target.value })}
            />
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

          <button type="submit" disabled={submitting}>
            {submitting ? "Dispatching..." : "Dispatch Request"}
          </button>

          {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
