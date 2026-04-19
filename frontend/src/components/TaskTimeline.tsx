import type { EventListItem } from "../types/contracts";

type TaskTimelineProps = {
  items: EventListItem[];
  loading: boolean;
  error: string | null;
};

function describeTimelineMeaning(item: EventListItem): string | null {
  const capabilityStatus = item.capability_status ?? null;
  const adapterMode = item.adapter_mode ?? null;
  const message = item.message.toLowerCase();

  if (capabilityStatus === "plan-only") {
    if (adapterMode === "real" || message.includes("plan-only build.configure preflight")) {
      return "This event reflects the real plan-only build.configure preflight path, not a real configure mutation.";
    }
    return "This event reflects plan-only build.configure behavior; simulated fallback still remains possible in this phase.";
  }

  if (capabilityStatus === "hybrid-read-only") {
    return "This event reflects the first real read-only project.inspect path or its simulated fallback.";
  }

  return null;
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
            (() => {
              const capabilityStatus = item.capability_status ?? null;
              const adapterMode = item.adapter_mode ?? null;
              const meaning = describeTimelineMeaning(item);
              return (
                <li key={item.id} style={{ marginBottom: 12 }}>
                  <strong>{item.message}</strong>
                  <div>Category: {item.category}</div>
                  <div>Severity: {item.severity}</div>
                  <div>State: {item.event_state}</div>
                  {capabilityStatus ? <div>Capability: {capabilityStatus}</div> : null}
                  {adapterMode ? <div>Adapter mode: {adapterMode}</div> : null}
                  {meaning ? <div>Meaning: {meaning}</div> : null}
                  {item.run_id ? <div>Run: {item.run_id}</div> : null}
                  <div>Created: {new Date(item.created_at).toLocaleString()}</div>
                </li>
              );
            })()
          ))}
        </ul>
      )}
    </section>
  );
}
