import type { ArtifactRecord } from "../types/contracts";

type ArtifactsPanelProps = {
  items: ArtifactRecord[];
  loading: boolean;
  error: string | null;
};

export default function ArtifactsPanel({
  items,
  loading,
  error,
}: ArtifactsPanelProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Artifacts</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        These are persisted artifact records. Simulated artifacts stay explicitly
        labeled as simulated.
      </p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading artifacts...</p>
      ) : items.length === 0 ? (
        <p>No artifacts recorded yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} style={{ marginBottom: 12 }}>
              <strong>{item.label}</strong>
              <div>Kind: {item.kind}</div>
              <div>Run ID: {item.run_id}</div>
              <div>Execution ID: {item.execution_id}</div>
              <div>URI: {item.uri}</div>
              {item.path ? <div>Path: {item.path}</div> : null}
              <div>Simulated: {String(item.simulated)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
