import type { RunRecord } from "../types/contracts";

type RunsPanelProps = {
  items: RunRecord[];
  loading: boolean;
  error: string | null;
};

export default function RunsPanel({ items, loading, error }: RunsPanelProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Runs</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        Runs reflect persisted control-plane bookkeeping. Execution mode remains
        explicitly labeled, including simulated flows.
      </p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading runs...</p>
      ) : items.length === 0 ? (
        <p>No runs recorded yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} style={{ marginBottom: 12 }}>
              <strong>{item.tool}</strong>
              <div>Agent: {item.agent}</div>
              <div>Status: {item.status}</div>
              <div>Execution mode: {item.execution_mode}</div>
              <div>Dry run: {String(item.dry_run)}</div>
              <div>Run ID: {item.id}</div>
              {item.result_summary ? <div>Summary: {item.result_summary}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
