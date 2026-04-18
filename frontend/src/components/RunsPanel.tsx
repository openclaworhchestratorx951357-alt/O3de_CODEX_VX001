import type { RunRecord } from "../types/contracts";

type RunsPanelProps = {
  items: RunRecord[];
  loading: boolean;
  error: string | null;
  selectedRunId: string | null;
  onSelectRun: (runId: string) => void;
};

export default function RunsPanel({
  items,
  loading,
  error,
  selectedRunId,
  onSelectRun,
}: RunsPanelProps) {
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
          {items.map((item) => {
            const capability = getRunCapabilityLabel(item);
            const executionTruth = getRunExecutionTruth(item);

            return (
              <li key={item.id} style={{ marginBottom: 12 }}>
                <strong>{item.tool}</strong>
                <div>Agent: {item.agent}</div>
                <div>Status: {item.status}</div>
                <div>Execution mode: {item.execution_mode}</div>
                <div>Capability: {capability}</div>
                <div>Execution truth: {executionTruth}</div>
                <div>Dry run: {String(item.dry_run)}</div>
                <div>Run ID: {item.id}</div>
                {item.result_summary ? <div>Summary: {item.result_summary}</div> : null}
                <button
                  type="button"
                  style={{ marginTop: 8 }}
                  disabled={selectedRunId === item.id}
                  onClick={() => onSelectRun(item.id)}
                >
                  {selectedRunId === item.id ? "Selected" : "View detail"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function getRunCapabilityLabel(item: RunRecord): string {
  if (item.tool === "project.inspect") {
    return "hybrid-read-only";
  }
  if (item.tool === "build.configure") {
    return "plan-only";
  }
  if (item.tool === "settings.patch" || item.tool === "gem.enable" || item.tool === "build.compile") {
    return "mutation-gated";
  }
  return "simulated-only";
}

function getRunExecutionTruth(item: RunRecord): string {
  if (item.tool === "build.configure") {
    return item.execution_mode === "real"
      ? "Real plan-only preflight path."
      : "Simulated path or hybrid fallback.";
  }
  if (item.tool === "project.inspect") {
    return item.execution_mode === "real"
      ? "Real read-only inspection path."
      : "Simulated path or hybrid fallback.";
  }
  return item.execution_mode === "real"
    ? "Narrow real adapter path."
    : "Simulated path.";
}
