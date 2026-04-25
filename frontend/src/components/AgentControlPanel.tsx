import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import AgentPanel from "./AgentPanel";
import SummarySection from "./SummarySection";

const agentControlGuide = getPanelGuide("agent-control");
const agentControlCardGuide = getPanelControlGuide("agent-control", "agent-card");

type AgentControlPanelProps = {
  items: readonly {
    id: string;
    name: string;
    role: string;
    locks: readonly string[];
    owned_tools: readonly string[];
  }[];
};

export default function AgentControlPanel({ items }: AgentControlPanelProps) {
  return (
    <SummarySection
      title="Agent Control"
      description="Agent Control shows the operator-facing ownership map for agent families, their coordination locks, and the tool lanes they are expected to manage."
      guideTooltip={agentControlGuide.tooltip}
      guideChecklist={agentControlGuide.checklist}
      loading={false}
      error={null}
      emptyMessage="No agent families are published in the current catalog."
      hasItems={items.length > 0}
      marginTop={0}
    >
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((agent) => (
          <AgentPanel
            key={agent.id}
            name={agent.name}
            role={agent.role}
            lockLabel={agent.locks.join(", ")}
            tools={agent.owned_tools}
            tooltip={agentControlCardGuide.tooltip}
          />
        ))}
      </div>
    </SummarySection>
  );
}
