import type { CSSProperties } from "react";

import type { ReadinessStatus } from "../types/contracts";
import SummarySection from "./SummarySection";
import {
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
} from "./summaryPrimitives";

type SystemStatusPanelProps = {
  readiness: ReadinessStatus | null;
  loading: boolean;
  error: string | null;
};

export default function SystemStatusPanel(
  { readiness, loading, error }: SystemStatusPanelProps,
) {
  const readinessData = readiness;

  return (
    <SummarySection
      title="System Status"
      description="Operator summary of backend readiness, persistence, adapter contract, and schema-validation state. Persisted coverage is a contract signal, not a real-execution claim. Simulated execution remains explicitly labeled and real O3DE adapters are still not implemented."
      loading={loading}
      error={error}
      emptyMessage="No readiness data available."
      hasItems={Boolean(readinessData)}
      marginTop={0}
    >
      {readinessData ? (
        <div style={summaryCardGridStyle}>
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Backend</h3>
            <p><strong>Ready:</strong> {readinessData.ok ? "yes" : "no"}</p>
            <p><strong>Execution mode:</strong> {readinessData.execution_mode}</p>
            <p><strong>Adapter contract:</strong> {readinessData.adapter_mode.contract_version}</p>
          </article>
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Persistence</h3>
            <p><strong>Ready:</strong> {readinessData.persistence_ready ? "yes" : "no"}</p>
            <p><strong>Strategy:</strong> {readinessData.database_strategy}</p>
            <p><strong>Path:</strong> {readinessData.database_path}</p>
            <p><strong>Warning:</strong> {readinessData.persistence_warning ?? "none"}</p>
          </article>
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Schema Validation</h3>
            <p><strong>Mode:</strong> {readinessData.schema_validation.mode}</p>
            <p><strong>Scope:</strong> {readinessData.schema_validation.schema_scope}</p>
            <p>
              <strong>Persisted details:</strong>{" "}
              {readinessData.schema_validation.supports_persisted_execution_details ? "yes" : "no"}
            </p>
            <p>
              <strong>Persisted metadata:</strong>{" "}
              {readinessData.schema_validation.supports_persisted_artifact_metadata ? "yes" : "no"}
            </p>
            <p>
              <strong>Active unsupported:</strong>{" "}
              {readinessData.schema_validation.active_unsupported_keywords.length}
            </p>
          </article>
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Persisted Coverage</h3>
            <p>
              <strong>Execution details tools:</strong>{" "}
              {readinessData.schema_validation.persisted_execution_details_tool_count}
            </p>
            <p>
              <strong>Artifact metadata tools:</strong>{" "}
              {readinessData.schema_validation.persisted_artifact_metadata_tool_count}
            </p>
            <p>
              <strong>Families with coverage:</strong>{" "}
              {readinessData.schema_validation.persisted_family_coverage
                .filter((family) => family.execution_details_tools > 0)
                .map((family) => family.family)
                .join(", ")}
            </p>
            <p>
              <strong>Fully covered families:</strong>{" "}
              {readinessData.schema_validation.persisted_family_coverage
                .filter((family) => (
                  family.execution_details_tools === family.total_tools
                  && family.artifact_metadata_tools === family.total_tools
                ))
                .map((family) => family.family)
                .join(", ")}
            </p>
            <p style={listLabelStyle}><strong>Covered tools</strong></p>
            <ul style={listStyle}>
              {readinessData.schema_validation.persisted_execution_details_tools.map((toolName) => (
                <li key={toolName}>{toolName}</li>
              ))}
            </ul>
          </article>
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Family Rollout</h3>
            <ul style={listStyle}>
              {readinessData.schema_validation.persisted_family_coverage.map((family) => (
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
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Adapter Boundary</h3>
            <p><strong>Configured mode:</strong> {readinessData.adapter_mode.configured_mode}</p>
            <p><strong>Supported modes:</strong> {readinessData.adapter_mode.supported_modes.join(", ")}</p>
            <p><strong>Real tool paths:</strong> {readinessData.adapter_mode.real_tool_paths.join(", ") || "none"}</p>
            <p><strong>Plan-only tool paths:</strong> {readinessData.adapter_mode.plan_only_tool_paths.join(", ") || "none"}</p>
            <p><strong>Boundary:</strong> {readinessData.adapter_mode.execution_boundary}</p>
          </article>
        </div>
      ) : null}
    </SummarySection>
  );
}

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
};
