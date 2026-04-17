import AgentPanel from "./components/AgentPanel";
import ApprovalQueue from "./components/ApprovalQueue";
import { mockAgents } from "./data/mockAgents";
import { mockApprovals } from "./data/mockApprovals";

export default function App() {
  return (
    <main
      style={{
        fontFamily: "sans-serif",
        padding: 24,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1>O3DE Agent Control App</h1>
        <p>
          Early operator shell for orchestrating O3DE-focused agents, approvals,
          logs, artifacts, and tool-driven workflows.
        </p>
      </header>

      <section style={{ marginBottom: 32 }}>
        <h2>Agent Control</h2>
        {mockAgents.map((agent) => (
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
    </main>
  );
}
