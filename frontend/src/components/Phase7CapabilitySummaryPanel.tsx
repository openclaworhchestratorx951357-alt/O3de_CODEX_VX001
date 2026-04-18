import type { CSSProperties } from "react";

import type { CatalogAgent } from "../types/contracts";

type Phase7CapabilitySummaryPanelProps = {
  agents: CatalogAgent[];
};

type CapabilityBucket = {
  label: string;
  tools: string[];
  description: string;
};

const CAPABILITY_ORDER = [
  "hybrid-read-only",
  "plan-only",
  "mutation-gated",
  "simulated-only",
] as const;

const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  "hybrid-read-only":
    "May use a real read-only path in hybrid mode when its preconditions are satisfied.",
  "plan-only":
    "Not real yet; reserved for planning or preflight-oriented work in later slices.",
  "mutation-gated":
    "Still blocked from real execution until stricter approval and recovery boundaries are proven.",
  "simulated-only":
    "Still fully simulated in the current phase.",
};

export default function Phase7CapabilitySummaryPanel({
  agents,
}: Phase7CapabilitySummaryPanelProps) {
  const buckets = buildBuckets(agents);

  return (
    <section style={{ marginBottom: 32 }}>
      <h2>Phase 7 Capability Summary</h2>
      <p style={{ marginTop: 0, color: "#555" }}>
        Current operator summary of which tool surfaces are real-capable,
        hybrid-only, planning-only, mutation-gated, or still simulated.
      </p>
      {buckets.length === 0 ? (
        <p>No capability summary is available until the catalog loads.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {buckets.map((bucket) => (
            <article key={bucket.label} style={cardStyle}>
              <h3 style={headingStyle}>{bucket.label}</h3>
              <p style={{ marginTop: 0, color: "#57606a" }}>{bucket.description}</p>
              <p><strong>Count:</strong> {bucket.tools.length}</p>
              <ul style={{ marginBottom: 0 }}>
                {bucket.tools.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function buildBuckets(agents: CatalogAgent[]): CapabilityBucket[] {
  const grouped = new Map<string, string[]>();

  for (const agent of agents) {
    for (const tool of agent.tools) {
      const status = tool.capability_status ?? "simulated-only";
      const tools = grouped.get(status) ?? [];
      tools.push(tool.name);
      grouped.set(status, tools);
    }
  }

  return CAPABILITY_ORDER
    .map((status) => ({
      label: status,
      tools: grouped.get(status) ?? [],
      description: CAPABILITY_DESCRIPTIONS[status],
    }))
    .filter((bucket) => bucket.tools.length > 0);
}

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 16,
  background: "#fafafa",
};

const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
};
