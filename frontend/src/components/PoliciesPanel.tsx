import type { ToolPolicy } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryList, SummaryListItem } from "./SummaryList";
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
                <div>Agent: {item.agent}</div>
                <div>Approval class: {item.approval_class}</div>
                <div>Capability: {item.capability_status}</div>
                <div>Admission stage: {item.real_admission_stage}</div>
                <div>Requires approval: {String(item.requires_approval)}</div>
                <div>Required locks: {item.required_locks.join(", ") || "none"}</div>
                <div>Risk: {item.risk}</div>
                <div>Execution mode: {item.execution_mode}</div>
                <div>Next requirement: {item.next_real_requirement}</div>
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
