import type { ExecutionListItem } from "../types/contracts";

type ExecutionsPanelProps = {
  items: ExecutionListItem[];
  loading: boolean;
  error: string | null;
};

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
          {items.map((item) => {
            const provenanceLabel = getExecutionProvenanceLabel(item);
            return (
              <li key={item.id} style={{ marginBottom: 12 }}>
                <strong>{item.tool}</strong>
                <div>Agent: {item.agent}</div>
                <div>Status: {item.status}</div>
                <div>Execution mode: {item.execution_mode}</div>
                <div>Run ID: {item.run_id}</div>
                <div>Started: {item.started_at}</div>
                {item.finished_at ? <div>Finished: {item.finished_at}</div> : null}
                <div>Provenance: {provenanceLabel}</div>
                {item.mutation_audit_summary ? (
                  <div>Mutation audit: {item.mutation_audit_summary}</div>
                ) : null}
                {item.mutation_audit_status ? (
                  <div>Mutation audit status: {item.mutation_audit_status}</div>
                ) : null}
                {item.result_summary ? <div>Summary: {item.result_summary}</div> : null}
                <div>Warnings: {item.warning_count}</div>
                <div>Artifacts: {item.artifact_count}</div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function getExecutionProvenanceLabel(item: ExecutionListItem): string {
  if (item.execution_mode === "real") {
    if (item.inspection_surface === "build_configure_preflight") {
      return "Real plan-only build.configure preflight";
    }
    if (item.inspection_surface === "settings_patch_mutation") {
      return "Real settings.patch mutation";
    }
    if (item.inspection_surface === "settings_patch_preflight") {
      return "Real dry-run-only settings.patch preflight";
    }
    return "Real read-only project inspection";
  }
  if (item.inspection_surface === "project_manifest") {
    return "Real project manifest provenance recorded";
  }
  if (item.inspection_surface === "build_configure_preflight") {
    return "Real build.configure preflight provenance recorded";
  }
  if (item.inspection_surface === "settings_patch_mutation") {
    return "Real settings.patch mutation provenance recorded";
  }
  if (item.inspection_surface === "settings_patch_preflight") {
    return "Real settings.patch preflight provenance recorded";
  }
  return "Simulated execution record";
}
