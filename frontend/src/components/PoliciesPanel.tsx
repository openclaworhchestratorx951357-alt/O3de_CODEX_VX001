import type { ToolPolicy } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import {
  getAdmissionTone,
  getCapabilityTone,
  getExecutionModeTone,
} from "./statusChipTones";
import {
  summaryMutedTextStyle,
} from "./summaryPrimitives";

type PoliciesPanelProps = {
  items: ToolPolicy[];
  loading: boolean;
  error: string | null;
};

export default function PoliciesPanel({
  items,
  loading,
  error,
}: PoliciesPanelProps) {
  return (
    <SummarySection
      title="Policies"
      description="These policy records describe approval, lock, and execution guardrails. Execution mode and capability status remain explicitly labeled, including simulated, plan-only, and mutation-candidate tool surfaces."
      loading={loading}
      error={error}
      emptyMessage="No policies published yet."
      hasItems={items.length > 0}
    >
      <SummaryList>
          {items.map((item) => (
            <SummaryListItem key={`${item.agent}:${item.tool}`} card>
                <strong>{item.tool}</strong>
                <SummaryFacts>
                  <SummaryFact label="Agent">{item.agent}</SummaryFact>
                  <SummaryFact label="Approval class">{item.approval_class}</SummaryFact>
                  <SummaryFact label="Capability">
                    <StatusChip label={item.capability_status} tone={getCapabilityTone(item.capability_status)} />
                  </SummaryFact>
                  <SummaryFact label="Admission stage">
                    <StatusChip label={item.real_admission_stage} tone={getAdmissionTone(item.real_admission_stage)} />
                  </SummaryFact>
                  <SummaryFact label="Requires approval">
                    <StatusChip label={String(item.requires_approval)} tone={item.requires_approval ? "warning" : "neutral"} />
                  </SummaryFact>
                  <SummaryFact label="Required locks">
                    {item.required_locks.join(", ") || "none"}
                  </SummaryFact>
                  <SummaryFact label="Risk">{item.risk}</SummaryFact>
                  <SummaryFact label="Execution mode">
                    <StatusChip label={item.execution_mode} tone={getExecutionModeTone(item.execution_mode)} />
                  </SummaryFact>
                  <SummaryFact label="Next requirement">{item.next_real_requirement}</SummaryFact>
                </SummaryFacts>
              {item.tool === "build.configure" ? (
                <div style={{ ...summaryMutedTextStyle, marginTop: 8 }}>
                  Meaning: In hybrid mode this remains plan-only. Approval can
                  enable a real preflight path, but not a real configure mutation.
                </div>
              ) : null}
              {item.tool === "settings.patch" ? (
                <div style={{ ...summaryMutedTextStyle, marginTop: 8 }}>
                  Meaning: This is the first recommended mutation candidate, but it
                  remains simulated until backup, rollback, and failure-visible
                  patch-plan gates are explicitly admitted.
                </div>
              ) : null}
            </SummaryListItem>
          ))}
      </SummaryList>
    </SummarySection>
  );
}
