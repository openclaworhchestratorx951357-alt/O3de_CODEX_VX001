import { describeCatalogCapability } from "../lib/capabilityNarrative";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import type { CatalogAgent, ToolDefinition } from "../types/contracts";
import ExpandablePanelSection from "./ExpandablePanelSection";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import { getCapabilityTone } from "./statusChipTones";
import { summaryCardStyle, summaryMutedTextStyle } from "./summaryPrimitives";

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
      emptyGuideTitle="Load the live catalog first"
      emptyGuideDescription="The catalog is the app's source of truth for which tools exist, which ones are real, and which ones are still simulated."
      emptyGuideSteps={[
        "Confirm the local backend is running on http://127.0.0.1:8000.",
        "Refresh the app after the backend starts so the catalog can hydrate.",
        "Only submit typed dispatch once the relevant tool family appears here.",
      ]}
      emptyGuideExampleTitle="Safe first check"
      emptyGuideExample="Look for editor-control before trying editor.session.open, editor.level.open, entity create, or component work."
      marginTop={0}
      quickStartTitle="Dispatch first steps"
      quickStartItems={catalogPanelGuide.checklist}
    >
      <SummaryList>
        {agents.map((agent) => (
          <SummaryListItem key={agent.id} card>
            <div title={catalogAgentFamilyControlGuide.tooltip} style={familyCardStyle}>
              <strong>{agent.name}</strong>
              <p style={summaryMutedTextStyle}>{agent.summary}</p>
              <SummaryFacts>
                <SummaryFact label="Agent ID">
                  <code>{agent.id}</code>
                </SummaryFact>
                <SummaryFact label="Role">{agent.role}</SummaryFact>
                <SummaryFact label="Published tools">{agent.tools.length}</SummaryFact>
              </SummaryFacts>
              <ExpandablePanelSection
                title="Published tools"
                preview={`${agent.tools.length} tool${agent.tools.length === 1 ? "" : "s"} in this family`}
              >
                <div style={toolGridStyle}>
                  {agent.tools.map((tool) => (
                    <article
                      key={tool.name}
                      title={catalogToolEntryControlGuide.tooltip}
                      style={toolCardStyle}
                    >
                      <div style={toolHeaderStyle}>
                        <strong>{tool.name}</strong>
                        <StatusChip
                          label={tool.capability_status ?? "unspecified"}
                          tone={getCapabilityTone(tool.capability_status ?? "simulated-only")}
                        />
                      </div>
                      <SummaryFacts>
                        <SummaryFact label="Approval">{tool.approval_class}</SummaryFact>
                        <SummaryFact label="Risk">{tool.risk}</SummaryFact>
                        <SummaryFact label="Tags">
                          {tool.tags.length > 0 ? tool.tags.join(", ") : "none"}
                        </SummaryFact>
                      </SummaryFacts>
                      <ExpandablePanelSection
                        title="Meaning and defaults"
                        preview={summarizeCatalogToolPreview(tool)}
                      >
                        <p style={toolTextStyle}>
                          {describeCatalogCapability(tool.name, tool.capability_status)}
                        </p>
                        <SummaryFacts>
                          <SummaryFact label="Default locks">
                            {tool.default_locks.length > 0 ? tool.default_locks.join(", ") : "none"}
                          </SummaryFact>
                          <SummaryFact label="Default timeout">
                            {tool.default_timeout_s}s
                          </SummaryFact>
                          <SummaryFact label="Adapter family">
                            {tool.adapter_family ?? "not reported"}
                          </SummaryFact>
                          <SummaryFact label="Real adapter available">
                            {tool.real_adapter_availability ? "yes" : "no"}
                          </SummaryFact>
                        </SummaryFacts>
                      </ExpandablePanelSection>
                    </article>
                  ))}
                </div>
              </ExpandablePanelSection>
            </div>
          </SummaryListItem>
        ))}
      </SummaryList>
    </SummarySection>
  );
}

function summarizeCatalogToolPreview(tool: ToolDefinition): string {
  return [
    tool.approval_class,
    tool.capability_status ?? "unspecified",
    `timeout ${tool.default_timeout_s}s`,
  ].join(" / ");
}

const familyCardStyle = {
  display: "grid",
  gap: 10,
} as const;

const toolGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  alignItems: "start",
} as const;

const toolCardStyle = {
  ...summaryCardStyle,
  gap: 10,
} as const;

const toolHeaderStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
} as const;

const toolTextStyle = {
  ...summaryMutedTextStyle,
  margin: 0,
  overflowWrap: "anywhere",
} as const;
