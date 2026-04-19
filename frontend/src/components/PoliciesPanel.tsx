import type { ToolPolicy } from "../types/contracts";
import SummarySection from "./SummarySection";
import { summaryItemStyle } from "./summaryPrimitives";

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
      <ul>
          {items.map((item) => (
            <li key={`${item.agent}:${item.tool}`} style={summaryItemStyle}>
              <div style={policyCardStyle}>
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
              </div>
              {item.tool === "build.configure" ? (
                <div style={meaningStyle}>
                  Meaning: In hybrid mode this remains plan-only. Approval can
                  enable a real preflight path, but not a real configure mutation.
                </div>
              ) : null}
              {item.tool === "settings.patch" ? (
                <div style={meaningStyle}>
                  Meaning: This is the first recommended mutation candidate, but it
                  remains simulated until backup, rollback, and failure-visible
                  patch-plan gates are explicitly admitted.
                </div>
              ) : null}
            </li>
          ))}
      </ul>
    </SummarySection>
  );
}

const policyCardStyle = {
  border: "1px solid #d8dee4",
  borderRadius: 10,
  padding: 12,
  background: "#f6f8fa",
  display: "grid",
  gap: 6,
};

const meaningStyle = {
  marginTop: 8,
  color: "#57606a",
};
