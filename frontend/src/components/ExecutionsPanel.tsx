import type { ExecutionRecord } from "../types/contracts";

type ExecutionsPanelProps = {
  items: ExecutionRecord[];
  loading: boolean;
  error: string | null;
};

function readString(details: Record<string, unknown>, key: string): string | null {
  const value = details[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBoolean(details: Record<string, unknown>, key: string): boolean | null {
  const value = details[key];
  return typeof value === "boolean" ? value : null;
}

export default function ExecutionsPanel({
  items,
  loading,
  error,
}: ExecutionsPanelProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Executions</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        These are persisted execution records. Execution mode remains explicit,
        including simulated control-plane runs.
      </p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading executions...</p>
      ) : items.length === 0 ? (
        <p>No executions recorded yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            (() => {
              const inspectionSurface = readString(item.details, "inspection_surface");
              const projectName = readString(item.details, "project_name");
              const manifestPath = readString(item.details, "project_manifest_path");
              const fallbackReason = readString(item.details, "fallback_reason");
              const realPathAvailable = readBoolean(item.details, "real_path_available");
              const provenanceLabel = item.execution_mode === "real"
                ? "Real read-only project inspection"
                : inspectionSurface === "project_manifest"
                  ? "Real project manifest provenance recorded"
                  : "Simulated execution record";

              return (
                <li key={item.id} style={{ marginBottom: 12 }}>
                  <strong>{item.tool}</strong>
                  <div>Agent: {item.agent}</div>
                  <div>Status: {item.status}</div>
                  <div>Execution mode: {item.execution_mode}</div>
                  <div>Run ID: {item.run_id}</div>
                  <div>Provenance: {provenanceLabel}</div>
                  {projectName ? <div>Project name: {projectName}</div> : null}
                  {manifestPath ? <div>Manifest path: {manifestPath}</div> : null}
                  {realPathAvailable === false ? (
                    <div>Real path available: false</div>
                  ) : null}
                  {fallbackReason ? <div>Fallback: {fallbackReason}</div> : null}
                  {item.result_summary ? <div>Summary: {item.result_summary}</div> : null}
                  {item.warnings.length > 0 ? (
                    <div>Warnings: {item.warnings.join(", ")}</div>
                  ) : null}
                  <div>Artifacts: {item.artifact_ids.length}</div>
                </li>
              );
            })()
          ))}
        </ul>
      )}
    </section>
  );
}
