import type { ApprovalListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
import {
  formatSummaryTimestamp,
  summaryItemStyle,
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
      <ul>
        {items.map((item) => (
          <li key={item.id} style={summaryItemStyle}>
            <strong>{formatApprovalTitle(item)}</strong>
            <div>Class: {item.approval_class}</div>
            <div>Status: {item.status}</div>
            <div>Run: {item.run_id}</div>
            <div>Created: {formatSummaryTimestamp(item.created_at)}</div>
            {item.decided_at ? (
              <div>Decided: {formatSummaryTimestamp(item.decided_at)}</div>
            ) : null}
            {describeApprovalMeaning(item) ? (
              <div>Meaning: {describeApprovalMeaning(item)}</div>
            ) : null}
            {item.reason ? <div>Reason: {item.reason}</div> : null}
            {item.can_decide ? (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  disabled={busyApprovalId === item.id}
                  onClick={() => void onApprove(item.id)}
                >
                  {busyApprovalId === item.id ? "Working..." : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={busyApprovalId === item.id}
                  onClick={() => void onReject(item.id)}
                >
                  {busyApprovalId === item.id ? "Working..." : "Reject"}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </SummarySection>
  );
}
