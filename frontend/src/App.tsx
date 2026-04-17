import AgentPanel from "./components/AgentPanel";
import ApprovalQueue from "./components/ApprovalQueue";
import LayoutHeader from "./components/LayoutHeader";
import TaskTimeline from "./components/TaskTimeline";
import { mockAgents } from "./data/mockAgents";
import { mockApprovals } from "./data/mockApprovals";
import { mockTimeline } from "./data/mockTimeline";

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
      <LayoutHeader
        title="O3DE Agent Control App"
        subtitle="Early operator shell for orchestrating O3DE-focused agents, approvals, logs, artifacts, and tool-driven workflows."
      />

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

      <TaskTimeline items={mockTimeline} />
    </main>
  );
}
