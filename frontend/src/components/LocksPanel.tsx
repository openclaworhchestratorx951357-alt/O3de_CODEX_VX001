import type { LockRecord } from "../types/contracts";

type LocksPanelProps = {
  items: LockRecord[];
  loading: boolean;
  error: string | null;
};

export default function LocksPanel({ items, loading, error }: LocksPanelProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Locks</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        These are persisted control-plane lock records. They describe orchestration
        ownership, not proof of real O3DE adapter execution.
      </p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading locks...</p>
      ) : items.length === 0 ? (
        <p>No active locks recorded.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={`${item.name}:${item.owner_run_id}`} style={{ marginBottom: 12 }}>
              <strong>{item.name}</strong>
              <div>Owner run: {item.owner_run_id}</div>
              <div>Created: {new Date(item.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
