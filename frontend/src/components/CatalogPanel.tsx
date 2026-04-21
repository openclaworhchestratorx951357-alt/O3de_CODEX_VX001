import { describeCatalogCapability } from "../lib/capabilityNarrative";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { CatalogAgent } from "../types/contracts";
import SummarySection from "./SummarySection";

const catalogPanelGuide = getPanelGuide("catalog-panel");
const catalogAgentFamilyControlGuide = getPanelControlGuide("catalog-panel", "agent-family");
const catalogToolEntryControlGuide = getPanelControlGuide("catalog-panel", "tool-entry");

type CatalogPanelProps = {
  agents: CatalogAgent[];
};

export default function CatalogPanel({ agents }: CatalogPanelProps) {
  return (
    <SummarySection
      title="Tools Catalog"
      description="Read-only catalog of currently published tools, ownership, approval posture, and capability meaning."
      guideTooltip={catalogPanelGuide.tooltip}
      guideChecklist={catalogPanelGuide.checklist}
      loading={false}
      error={null}
      emptyMessage="No live tools catalog has been returned yet."
      hasItems={agents.length > 0}
      marginTop={0}
    >
      <ul>
        {agents.map((agent) => (
          <li
            key={agent.id}
            title={catalogAgentFamilyControlGuide.tooltip}
            style={{ marginBottom: 12 }}
          >
            <strong>{agent.name}</strong>
            <div>ID: {agent.id}</div>
            <div>Role: {agent.role}</div>
            <ul style={{ marginTop: 8 }}>
              {agent.tools.map((tool) => (
                <li
                  key={tool.name}
                  title={catalogToolEntryControlGuide.tooltip}
                  style={{ marginBottom: 8 }}
                >
                  <strong>{tool.name}</strong>
                  <div>Approval: {tool.approval_class}</div>
                  <div>Capability: {tool.capability_status ?? "unspecified"}</div>
                  <div>
                    Meaning: {describeCatalogCapability(tool.name, tool.capability_status)}
                  </div>
                  <div>Risk: {tool.risk}</div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </SummarySection>
  );
}
