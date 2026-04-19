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
        and schema-validation state. Persisted coverage is a contract signal,
        not a real-execution claim. Simulated execution remains explicitly
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
              <strong>Persisted details:</strong>{" "}
              {readiness.schema_validation.supports_persisted_execution_details ? "yes" : "no"}
            </p>
            <p>
              <strong>Persisted metadata:</strong>{" "}
              {readiness.schema_validation.supports_persisted_artifact_metadata ? "yes" : "no"}
            </p>
            <p>
              <strong>Active unsupported:</strong>{" "}
              {readiness.schema_validation.active_unsupported_keywords.length}
            </p>
          </article>
          <article style={cardStyle}>
            <h3 style={headingStyle}>Persisted Coverage</h3>
            <p>
              <strong>Execution details tools:</strong>{" "}
              {readiness.schema_validation.persisted_execution_details_tool_count}
            </p>
            <p>
              <strong>Artifact metadata tools:</strong>{" "}
              {readiness.schema_validation.persisted_artifact_metadata_tool_count}
            </p>
            <p>
              <strong>Families with coverage:</strong>{" "}
              {readiness.schema_validation.persisted_family_coverage
                .filter((family) => family.execution_details_tools > 0)
                .map((family) => family.family)
                .join(", ")}
            </p>
            <p>
              <strong>Fully covered families:</strong>{" "}
              {readiness.schema_validation.persisted_family_coverage
                .filter((family) => (
                  family.execution_details_tools === family.total_tools
                  && family.artifact_metadata_tools === family.total_tools
                ))
                .map((family) => family.family)
                .join(", ")}
            </p>
            <p style={listLabelStyle}><strong>Covered tools</strong></p>
            <ul style={listStyle}>
              {readiness.schema_validation.persisted_execution_details_tools.map((toolName) => (
                <li key={toolName}>{toolName}</li>
              ))}
            </ul>
          </article>
          <article style={cardStyle}>
            <h3 style={headingStyle}>Family Rollout</h3>
            <ul style={listStyle}>
              {readiness.schema_validation.persisted_family_coverage.map((family) => (
                <li key={family.family} style={{ marginBottom: 10 }}>
                  <strong>{family.family}</strong>: {family.execution_details_tools}/
                  {family.total_tools} execution-details, {family.artifact_metadata_tools}/
                  {family.total_tools} artifact-metadata
                  <div style={subtleTextStyle}>
                    Covered: {family.covered_tools.length > 0
                      ? family.covered_tools.join(", ")
                      : "none"}
                  </div>
                  <div style={subtleTextStyle}>
                    Remaining: {family.uncovered_tools.length > 0
                      ? family.uncovered_tools.join(", ")
                      : "none"}
                  </div>
                </li>
              ))}
            </ul>
          </article>
          <article style={cardStyle}>
            <h3 style={headingStyle}>Adapter Boundary</h3>
            <p><strong>Configured mode:</strong> {readiness.adapter_mode.configured_mode}</p>
            <p><strong>Supported modes:</strong> {readiness.adapter_mode.supported_modes.join(", ")}</p>
            <p><strong>Real tool paths:</strong> {readiness.adapter_mode.real_tool_paths.join(", ") || "none"}</p>
            <p><strong>Plan-only tool paths:</strong> {readiness.adapter_mode.plan_only_tool_paths.join(", ") || "none"}</p>
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

const listLabelStyle: CSSProperties = {
  marginBottom: 8,
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
};

const subtleTextStyle: CSSProperties = {
  color: "#555",
  marginTop: 4,
}
