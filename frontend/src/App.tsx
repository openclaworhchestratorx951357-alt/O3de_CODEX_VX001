import { useEffect, useState } from "react";

import AgentPanel from "./components/AgentPanel";
import ApprovalQueue from "./components/ApprovalQueue";
import CatalogPanel from "./components/CatalogPanel";
import DispatchForm from "./components/DispatchForm";
import LayoutHeader from "./components/LayoutHeader";
import ResponseEnvelopeView from "./components/ResponseEnvelopeView";
import TaskTimeline from "./components/TaskTimeline";
import { mockAgents } from "./data/mockAgents";
import { mockApprovals } from "./data/mockApprovals";
import { mockTimeline } from "./data/mockTimeline";
import { fetchToolsCatalog } from "./lib/api";
import type { ResponseEnvelope } from "./types/contracts";

type CatalogAgent = {
  id: string;
  name: string;
  tools: string[];
};

type ToolsCatalog = {
  agents: CatalogAgent[];
};

export default function App() {
  const [lastResponse, setLastResponse] = useState<ResponseEnvelope | null>(null);
  const [catalogAgents, setCatalogAgents] = useState<CatalogAgent[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const catalog = (await fetchToolsCatalog()) as ToolsCatalog;
        setCatalogAgents(catalog.agents ?? []);
      } catch (error) {
        setCatalogError(
          error instanceof Error ? error.message : "Failed to load tools catalog",
        );
      }
    }

    void loadCatalog();
  }, []);

  const agentsForDisplay = catalogAgents.length > 0
    ? catalogAgents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: "Catalog-backed agent entry",
        locks: ["catalog"],
        owned_tools: agent.tools,
      }))
    : mockAgents;

  return (
    <main
      style={{
        fontFamily: "sans-serif",
        padding: 24,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <LayoutHeader
        title="O3DE Agent Control App"
        subtitle="Early operator shell for orchestrating O3DE-focused agents, approvals, logs, artifacts, and tool-driven workflows."
      />

      {catalogError ? <p style={{ color: "crimson" }}>{catalogError}</p> : null}

      <CatalogPanel agents={catalogAgents} />
      <DispatchForm
        agents={catalogAgents.length > 0 ? catalogAgents : [{ id: "project-build", name: "Project / Build Agent", tools: ["project.inspect"] }]}
        onResponse={setLastResponse}
      />
      <ResponseEnvelopeView response={lastResponse} />

      <section style={{ marginBottom: 32 }}>
        <h2>Agent Control</h2>
        {agentsForDisplay.map((agent) => (
          <AgentPanel
            key={agent.id}
            name={agent.name}
            role={agent.role}
            lockLabel={agent.locks.join(", ")}
            tools={agent.owned_tools}
          />
        ))}
      </section>

      <section>
        <ApprovalQueue items={mockApprovals} />
      </section>

      <TaskTimeline items={mockTimeline} />
    </main>
  );
}
