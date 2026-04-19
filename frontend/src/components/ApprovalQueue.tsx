import type { ApprovalListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import { getApprovalStatusTone } from "./statusChipTones";
import {
  formatSummaryTimestamp,
  formatSummaryLabeledText,
  summaryActionButtonStyle,
  summaryActionRowStyle,
  summaryCalloutStyle,
} from "./summaryPrimitives";

type ApprovalQueueProps = {
  items: ApprovalListItem[];
  loading: boolean;
  error: string | null;
  busyApprovalId: string | null;
  onApprove: (approvalId: string) => Promise<void>;
  onReject: (approvalId: string) => Promise<void>;
};

function formatApprovalTitle(item: ApprovalListItem): string {
  return `${item.tool} requested by ${item.agent}`;
}

function describeApprovalMeaning(item: ApprovalListItem): string | null {
  if (item.tool === "build.configure") {
    return "In hybrid mode, this approval may allow the real plan-only build.configure preflight path when dry_run=true. It does not imply a real configure mutation.";
  }
  return null;
}

export default function ApprovalQueue({
  items,
  loading,
  error,
  busyApprovalId,
  onApprove,
  onReject,
}: ApprovalQueueProps) {
  return (
    <SummarySection
      title="Approval Queue"
      description="Approval decisions resume capability-gated execution. Any real path still remains narrow and explicitly labeled."
      loading={loading}
      error={error}
      emptyMessage="No approvals are waiting for a decision."
      hasItems={items.length > 0}
      marginTop={0}
    >
      <SummaryList>
        {items.map((item) => (
          <SummaryListItem key={item.id} card>
            <strong>{formatApprovalTitle(item)}</strong>
            <SummaryFacts>
              <SummaryFact label="Class">{item.approval_class}</SummaryFact>
              <SummaryFact label="Status">
                <StatusChip label={item.status} tone={getApprovalStatusTone(item.status)} />
              </SummaryFact>
              <SummaryFact label="Run">{item.run_id}</SummaryFact>
              <SummaryFact label="Created">{formatSummaryTimestamp(item.created_at)}</SummaryFact>
              {item.decided_at ? (
                <SummaryFact label="Decided">{formatSummaryTimestamp(item.decided_at)}</SummaryFact>
              ) : null}
              {item.reason ? <SummaryFact label="Reason">{item.reason}</SummaryFact> : null}
            </SummaryFacts>
            {describeApprovalMeaning(item) ? (
              <div style={summaryCalloutStyle}>
                {formatSummaryLabeledText("Meaning", describeApprovalMeaning(item) ?? "")}
              </div>
            ) : null}
            {item.can_decide ? (
              <div style={summaryActionRowStyle}>
                <button
                  type="button"
                  style={summaryActionButtonStyle}
                  disabled={busyApprovalId === item.id}
                  onClick={() => void onApprove(item.id)}
                >
                  {busyApprovalId === item.id ? "Working..." : "Approve"}
                </button>
                <button
                  type="button"
                  style={summaryActionButtonStyle}
                  disabled={busyApprovalId === item.id}
                  onClick={() => void onReject(item.id)}
                >
                  {busyApprovalId === item.id ? "Working..." : "Reject"}
                </button>
              </div>
            ) : null}
          </SummaryListItem>
        ))}
      </SummaryList>
    </SummarySection>
  );
}
