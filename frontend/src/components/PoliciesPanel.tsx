import type { ToolPolicy } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
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
                <div>
                  Capability:{" "}
                  <StatusChip label={item.capability_status} tone={getCapabilityTone(item.capability_status)} />
                </div>
                <div>
                  Admission stage:{" "}
                  <StatusChip label={item.real_admission_stage} tone={getAdmissionTone(item.real_admission_stage)} />
                </div>
                <div>
                  Requires approval:{" "}
                  <StatusChip label={String(item.requires_approval)} tone={item.requires_approval ? "warning" : "neutral"} />
                </div>
                <div>Required locks: {item.required_locks.join(", ") || "none"}</div>
                <div>Risk: {item.risk}</div>
                <div>
                  Execution mode: <StatusChip label={item.execution_mode} tone={getExecutionModeTone(item.execution_mode)} />
                </div>
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

function getCapabilityTone(capability: string) {
  if (capability === "hybrid-read-only") {
    return "info" as const;
  }
  if (capability === "plan-only") {
    return "warning" as const;
  }
  if (capability === "mutation-gated") {
    return "danger" as const;
  }
  if (capability === "simulated-only") {
    return "neutral" as const;
  }
  return "neutral" as const;
}

function getAdmissionTone(stage: string) {
  if (stage.includes("real")) {
    return "success" as const;
  }
  if (stage.includes("plan") || stage.includes("candidate")) {
    return "warning" as const;
  }
  return "neutral" as const;
}

function getExecutionModeTone(mode: string) {
  if (mode === "real") {
    return "success" as const;
  }
  if (mode === "simulated") {
    return "warning" as const;
  }
  return "neutral" as const;
}
