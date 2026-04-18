import type { ApprovalRecord } from "../types/contracts";

type ApprovalQueueProps = {
  items: ApprovalRecord[];
  loading: boolean;
  error: string | null;
  busyApprovalId: string | null;
  onApprove: (approvalId: string) => Promise<void>;
  onReject: (approvalId: string) => Promise<void>;
};

function formatApprovalTitle(item: ApprovalRecord): string {
  return `${item.tool} requested by ${item.agent}`;
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
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Approval Queue</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        Approval decisions resume simulated execution only. No real O3DE adapter
        work is implied here.
      </p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading approvals...</p>
      ) : items.length === 0 ? (
        <p>No pending approvals.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} style={{ marginBottom: 12 }}>
              <strong>{formatApprovalTitle(item)}</strong>
              <div>Class: {item.approval_class}</div>
              <div>Status: {item.status}</div>
              <div>Run: {item.run_id}</div>
              {item.reason ? <div>Reason: {item.reason}</div> : null}
              {item.status === "pending" ? (
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
      )}
    </section>
  );
}
