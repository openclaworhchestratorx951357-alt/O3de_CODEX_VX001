import type { EventRecord } from "../types/contracts";

type TaskTimelineProps = {
  items: EventRecord[];
  loading: boolean;
  error: string | null;
};

function formatEventState(item: EventRecord): "planned" | "active" | "done" {
  if (item.severity === "error") {
    return "active";
  }
  if (item.severity === "warning") {
    return "active";
  }
  return "done";
}

export default function TaskTimeline({ items, loading, error }: TaskTimelineProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Task Timeline</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        This timeline shows persisted control-plane events, including simulated
        execution activity where applicable.
      </p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading timeline...</p>
      ) : items.length === 0 ? (
        <p>No events recorded yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} style={{ marginBottom: 12 }}>
              <strong>{item.message}</strong>
              <div>Category: {item.category}</div>
              <div>Severity: {item.severity}</div>
              <div>State: {formatEventState(item)}</div>
              {item.run_id ? <div>Run: {item.run_id}</div> : null}
              <div>Created: {new Date(item.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
