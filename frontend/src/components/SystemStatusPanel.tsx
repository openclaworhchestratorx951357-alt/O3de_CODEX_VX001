import type { CSSProperties } from "react";

import type { ReadinessStatus } from "../types/contracts";

type SystemStatusPanelProps = {
  readiness: ReadinessStatus | null;
  loading: boolean;
  error: string | null;
};

export default function SystemStatusPanel(
  { readiness, loading, error }: SystemStatusPanelProps,
) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2>System Status</h2>
      <p style={{ marginTop: 0, color: "#555" }}>
        Operator summary of backend readiness, persistence, adapter contract,
        and schema-validation state. Simulated execution remains explicitly
        labeled and real O3DE adapters are still not implemented.
      </p>
      {loading ? <p>Loading system status...</p> : null}
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {!loading && !error && !readiness ? <p>No readiness data available.</p> : null}
      {readiness ? (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <article style={cardStyle}>
            <h3 style={headingStyle}>Backend</h3>
            <p><strong>Ready:</strong> {readiness.ok ? "yes" : "no"}</p>
            <p><strong>Execution mode:</strong> {readiness.execution_mode}</p>
            <p><strong>Adapter contract:</strong> {readiness.adapter_mode.contract_version}</p>
          </article>
          <article style={cardStyle}>
            <h3 style={headingStyle}>Persistence</h3>
            <p><strong>Ready:</strong> {readiness.persistence_ready ? "yes" : "no"}</p>
            <p><strong>Strategy:</strong> {readiness.database_strategy}</p>
            <p><strong>Path:</strong> {readiness.database_path}</p>
            <p><strong>Warning:</strong> {readiness.persistence_warning ?? "none"}</p>
          </article>
          <article style={cardStyle}>
            <h3 style={headingStyle}>Schema Validation</h3>
            <p><strong>Mode:</strong> {readiness.schema_validation.mode}</p>
            <p><strong>Scope:</strong> {readiness.schema_validation.schema_scope}</p>
            <p>
              <strong>Active unsupported:</strong>{" "}
              {readiness.schema_validation.active_unsupported_keywords.length}
            </p>
          </article>
          <article style={cardStyle}>
            <h3 style={headingStyle}>Adapter Boundary</h3>
            <p><strong>Configured mode:</strong> {readiness.adapter_mode.configured_mode}</p>
            <p><strong>Supported modes:</strong> {readiness.adapter_mode.supported_modes.join(", ")}</p>
            <p><strong>Boundary:</strong> {readiness.adapter_mode.execution_boundary}</p>
          </article>
        </div>
      ) : null}
    </section>
  );
}

const cardStyle: CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 16,
  background: "#fafafa",
};

const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
};
