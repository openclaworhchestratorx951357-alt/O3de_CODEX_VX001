import { describeExecutionResult } from "../lib/executionTruth";
import type { ResponseEnvelope } from "../types/contracts";

type ResponseEnvelopeViewProps = {
  response: ResponseEnvelope | null;
};

export default function ResponseEnvelopeView({
  response,
}: ResponseEnvelopeViewProps) {
  const statusLabel = response ? (response.ok ? "success" : "failure") : "idle";
  const statusColor =
    statusLabel === "success"
      ? "#1a7f37"
      : statusLabel === "failure"
        ? "#cf222e"
        : "#6e7781";

  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Last Dispatch Response</h3>
        <span
          style={{
            background: statusColor,
            color: "white",
            borderRadius: 999,
            padding: "4px 10px",
            fontSize: 12,
            textTransform: "uppercase",
          }}
        >
          {statusLabel}
        </span>
      </div>

      {!response ? (
        <p>No response received yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <section>
            <strong>Request</strong>
            <div>Request ID: {response.request_id}</div>
            <div>Timing: {response.timing_ms ?? 0} ms</div>
            {response.result && typeof response.result.execution_mode === "string" ? (
              <div>Execution interpretation: {describeExecutionResult(response.result)}</div>
            ) : null}
          </section>

          {response.result ? (
            <section>
              <strong>Result</strong>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                {JSON.stringify(response.result, null, 2)}
              </pre>
            </section>
          ) : null}

          {response.error ? (
            <section>
              <strong>Error</strong>
              <div>Code: {response.error.code}</div>
              <div>Message: {response.error.message}</div>
              <div>Retryable: {String(response.error.retryable)}</div>
              {response.error.details ? (
                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                  {JSON.stringify(response.error.details, null, 2)}
                </pre>
              ) : null}
            </section>
          ) : null}

          {response.state ? (
            <section>
              <strong>State</strong>
              <ul>
                <li>dirty: {String(response.state.dirty)}</li>
                <li>requires_save: {String(response.state.requires_save)}</li>
                <li>requires_reconfigure: {String(response.state.requires_reconfigure)}</li>
                <li>requires_rebuild: {String(response.state.requires_rebuild)}</li>
                <li>requires_asset_reprocess: {String(response.state.requires_asset_reprocess)}</li>
              </ul>
            </section>
          ) : null}

          {response.warnings && response.warnings.length > 0 ? (
            <section>
              <strong>Warnings</strong>
              <ul>
                {response.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {response.logs && response.logs.length > 0 ? (
            <section>
              <strong>Logs</strong>
              <ul>
                {response.logs.map((log) => (
                  <li key={log}>{log}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {response.artifacts && response.artifacts.length > 0 ? (
            <section>
              <strong>Artifacts</strong>
              <ul>
                {response.artifacts.map((artifact) => (
                  <li key={artifact}>{artifact}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}
