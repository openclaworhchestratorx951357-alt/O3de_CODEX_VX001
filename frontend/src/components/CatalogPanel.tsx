import type { CatalogAgent } from "../types/contracts";

type CatalogPanelProps = {
  agents: CatalogAgent[];
};

export default function CatalogPanel({ agents }: CatalogPanelProps) {
  function describeCapability(toolName: string, capabilityStatus?: string): string {
    if (capabilityStatus === "hybrid-read-only" && toolName === "project.inspect") {
      return "Real read-only in hybrid mode when manifest preconditions are satisfied, with manifest-backed project-config, requested-vs-discovered Gem evidence, requested Gem subset matching, and top-level settings evidence.";
    }
    if (capabilityStatus === "plan-only" && toolName === "build.configure") {
      return "Real only as a plan-only preflight in hybrid mode when dry_run=true; no real configure mutation runs.";
    }
    if (capabilityStatus === "mutation-gated") {
      return "Still blocked from real mutation in the current phase.";
    }
    return "Still simulated in the current phase.";
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
      <h3 style={{ marginTop: 0 }}>Tools Catalog</h3>
      {agents.length === 0 ? (
        <p>Catalog not loaded yet.</p>
      ) : (
        <ul>
          {agents.map((agent) => (
            <li key={agent.id} style={{ marginBottom: 12 }}>
              <strong>{agent.name}</strong>
              <div>ID: {agent.id}</div>
              <div>Role: {agent.role}</div>
              <ul style={{ marginTop: 8 }}>
                {agent.tools.map((tool) => (
                  <li key={tool.name} style={{ marginBottom: 8 }}>
                    <strong>{tool.name}</strong>
                    <div>Approval: {tool.approval_class}</div>
                    <div>Capability: {tool.capability_status ?? "unspecified"}</div>
                    <div>
                      Meaning: {describeCapability(tool.name, tool.capability_status)}
                    </div>
                    <div>Risk: {tool.risk}</div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
