type ApprovalItem = {
  id: string;
  title: string;
  approvalClass: string;
  status: "pending" | "approved" | "rejected";
};

type ApprovalQueueProps = {
  items: ApprovalItem[];
};

export default function ApprovalQueue({ items }: ApprovalQueueProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Approval Queue</h3>
      {items.length === 0 ? (
        <p>No pending approvals.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} style={{ marginBottom: 12 }}>
              <strong>{item.title}</strong>
              <div>Class: {item.approvalClass}</div>
              <div>Status: {item.status}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
