import type { RunRecord } from "../types/contracts";

type RunDetailPanelProps = {
  item: RunRecord | null;
  loading: boolean;
  error: string | null;
};

function describeRunTruth(item: RunRecord): string {
  if (item.execution_mode === "real" && item.tool === "project.inspect") {
    return "This run used the real read-only project.inspect path and may include manifest-backed project-config, Gem, and top-level settings evidence.";
  }
  if (item.execution_mode === "real" && item.tool === "build.configure") {
    return "This run used the real plan-only build.configure preflight path.";
  }
  if (item.execution_mode === "simulated" && item.tool === "build.configure") {
    return "This build.configure run remained on a simulated fallback path.";
  }
  return "This run remained on a simulated execution path.";
}

export default function RunDetailPanel({
  item,
  loading,
  error,
}: RunDetailPanelProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Run Detail</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        This view shows a single persisted run record. Execution mode remains
        explicit, including simulated runs.
      </p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading run detail...</p>
      ) : !item ? (
        <p>Select a run to inspect its detail.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          <div><strong>Run ID:</strong> {item.id}</div>
          <div><strong>Request ID:</strong> {item.request_id}</div>
          <div><strong>Agent:</strong> {item.agent}</div>
          <div><strong>Tool:</strong> {item.tool}</div>
          <div><strong>Status:</strong> {item.status}</div>
          <div><strong>Execution mode:</strong> {item.execution_mode}</div>
          <div>
            <strong>Execution truth:</strong>{" "}
            {describeRunTruth(item)}
          </div>
          <div><strong>Dry run:</strong> {String(item.dry_run)}</div>
          <div><strong>Requested locks:</strong> {item.requested_locks.join(", ") || "none"}</div>
          <div><strong>Granted locks:</strong> {item.granted_locks.join(", ") || "none"}</div>
          <div><strong>Warnings:</strong> {item.warnings.join(", ") || "none"}</div>
          {item.result_summary ? (
            <div><strong>Summary:</strong> {item.result_summary}</div>
          ) : null}
        </div>
      )}
    </section>
  );
}
