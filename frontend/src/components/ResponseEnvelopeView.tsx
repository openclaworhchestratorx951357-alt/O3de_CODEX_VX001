import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import { describeExecutionResult } from "../lib/executionTruth";
import type { ResponseEnvelope } from "../types/contracts";
import PanelGuideDetails from "./PanelGuideDetails";

const responseEnvelopeGuide = getPanelGuide("response-envelope");
const responseEnvelopeStatusBadgeGuide = getPanelControlGuide("response-envelope", "status-badge");
const responseEnvelopeRequestSummaryGuide = getPanelControlGuide("response-envelope", "request-summary");
const responseEnvelopeResultPayloadGuide = getPanelControlGuide("response-envelope", "result-payload");
const responseEnvelopeErrorPayloadGuide = getPanelControlGuide("response-envelope", "error-payload");
const responseEnvelopeStateFlagsGuide = getPanelControlGuide("response-envelope", "state-flags");
const responseEnvelopeEvidenceListsGuide = getPanelControlGuide("response-envelope", "evidence-lists");

type ResponseEnvelopeViewProps = {
  response: ResponseEnvelope | null;
};

export default function ResponseEnvelopeView({
  response,
}: ResponseEnvelopeViewProps) {
  const statusLabel = response ? (response.ok ? "success" : "failure") : "idle";
  const statusBadgeStyle = statusLabel === "success"
    ? successStatusBadgeStyle
    : statusLabel === "failure"
      ? failureStatusBadgeStyle
      : idleStatusBadgeStyle;

  return (
    <section
      style={{
        border: "1px solid var(--app-panel-border)",
        borderRadius: "var(--app-panel-radius)",
        padding: "var(--app-panel-padding)",
        background: "var(--app-panel-bg-muted)",
        boxShadow: "var(--app-shadow-soft)",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Last Dispatch Response</h3>
        <span
          title={responseEnvelopeStatusBadgeGuide.tooltip}
          style={{
            ...statusBadgeBaseStyle,
            ...statusBadgeStyle,
            borderRadius: "var(--app-pill-radius)",
            padding: "4px 10px",
            fontSize: 12,
            textTransform: "uppercase",
          }}
        >
          {statusLabel}
        </span>
      </div>
      <PanelGuideDetails
        tooltip={responseEnvelopeGuide.tooltip}
        checklist={responseEnvelopeGuide.checklist}
      />

      {!response ? (
        <p>No response received yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <section title={responseEnvelopeRequestSummaryGuide.tooltip}>
            <strong>Request</strong>
            <div>Request ID: {response.request_id}</div>
            <div>Timing: {response.timing_ms ?? 0} ms</div>
            {response.result && typeof response.result.execution_mode === "string" ? (
              <div>Execution interpretation: {describeExecutionResult(response.result)}</div>
            ) : null}
          </section>

          {response.result ? (
            <section title={responseEnvelopeResultPayloadGuide.tooltip}>
              <strong>Result</strong>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
                {JSON.stringify(response.result, null, 2)}
              </pre>
            </section>
          ) : null}

          {response.error ? (
            <section title={responseEnvelopeErrorPayloadGuide.tooltip}>
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
            <section title={responseEnvelopeStateFlagsGuide.tooltip}>
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
            <section title={responseEnvelopeEvidenceListsGuide.tooltip}>
              <strong>Warnings</strong>
              <ul>
                {response.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {response.logs && response.logs.length > 0 ? (
            <section title={responseEnvelopeEvidenceListsGuide.tooltip}>
              <strong>Logs</strong>
              <ul>
                {response.logs.map((log) => (
                  <li key={log}>{log}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {response.artifacts && response.artifacts.length > 0 ? (
            <section title={responseEnvelopeEvidenceListsGuide.tooltip}>
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

const statusBadgeBaseStyle = {
  border: "1px solid transparent",
} as const;

const idleStatusBadgeStyle = {
  background: "var(--app-panel-bg-alt)",
  borderColor: "var(--app-panel-border)",
  color: "var(--app-muted-color)",
} as const;

const successStatusBadgeStyle = {
  background: "var(--app-success-bg)",
  borderColor: "var(--app-success-border)",
  color: "var(--app-success-text)",
} as const;

const failureStatusBadgeStyle = {
  background: "var(--app-danger-bg)",
  borderColor: "var(--app-danger-border)",
  color: "var(--app-danger-text)",
} as const;
