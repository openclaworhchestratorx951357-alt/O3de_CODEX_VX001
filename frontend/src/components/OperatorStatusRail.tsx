import StatusChip from "./StatusChip";
import {
  getAuditStatusTone,
  getExecutionModeTone,
} from "./statusChipTones";

type OperatorStatusRailProps = {
  executionMode?: string | null;
  simulated?: boolean | null;
  auditStatus?: string | null;
  attentionLabel?: string | null;
};

export default function OperatorStatusRail({
  executionMode,
  simulated,
  auditStatus,
  attentionLabel,
}: OperatorStatusRailProps) {
  const chips = [];

  if (executionMode) {
    chips.push(
      <StatusChip
        key={`mode-${executionMode}`}
        label={executionMode}
        tone={getExecutionModeTone(executionMode)}
      />,
    );
  }

  if (typeof simulated === "boolean") {
    chips.push(
      <StatusChip
        key={`simulated-${String(simulated)}`}
        label={simulated ? "simulated" : "non-simulated"}
        tone={simulated ? "warning" : "success"}
      />,
    );
  }

  if (auditStatus) {
    chips.push(
      <StatusChip
        key={`audit-${auditStatus}`}
        label={auditStatus}
        tone={getAuditStatusTone(auditStatus)}
      />,
    );
  }

  if (attentionLabel) {
    chips.push(
      <StatusChip
        key={`attention-${attentionLabel}`}
        label={attentionLabel}
        tone={attentionLabel.toLowerCase().includes("routine") ? "neutral" : "info"}
      />,
    );
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {chips}
    </div>
  );
}
