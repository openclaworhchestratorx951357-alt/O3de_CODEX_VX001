import type { CSSProperties } from "react";

import type { ReadinessStatus } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  getExecutionModeTone,
  getSchemaModeTone,
} from "./statusChipTones";
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
            <SummaryFacts>
              <SummaryFact label="Ready">
                <StatusChip label={readinessData.ok ? "yes" : "no"} tone={readinessData.ok ? "success" : "danger"} />
              </SummaryFact>
              <SummaryFact label="Execution mode">
                <StatusChip label={readinessData.execution_mode} tone={getExecutionModeTone(readinessData.execution_mode)} />
              </SummaryFact>
              <SummaryFact label="Adapter contract">
                {readinessData.adapter_mode.contract_version}
              </SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Persistence</h3>
            <SummaryFacts>
              <SummaryFact label="Ready">
                <StatusChip label={readinessData.persistence_ready ? "yes" : "no"} tone={readinessData.persistence_ready ? "success" : "danger"} />
              </SummaryFact>
              <SummaryFact label="Strategy">{readinessData.database_strategy}</SummaryFact>
              <SummaryFact label="Path">{readinessData.database_path}</SummaryFact>
              <SummaryFact label="Warning">{readinessData.persistence_warning ?? "none"}</SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Schema Validation</h3>
            <SummaryFacts>
              <SummaryFact label="Mode">
                <StatusChip label={readinessData.schema_validation.mode} tone={getSchemaModeTone(readinessData.schema_validation.mode)} />
              </SummaryFact>
              <SummaryFact label="Scope">{readinessData.schema_validation.schema_scope}</SummaryFact>
              <SummaryFact label="Persisted details">
                <StatusChip
                  label={readinessData.schema_validation.supports_persisted_execution_details ? "yes" : "no"}
                  tone={readinessData.schema_validation.supports_persisted_execution_details ? "success" : "warning"}
                />
              </SummaryFact>
              <SummaryFact label="Persisted metadata">
                <StatusChip
                  label={readinessData.schema_validation.supports_persisted_artifact_metadata ? "yes" : "no"}
                  tone={readinessData.schema_validation.supports_persisted_artifact_metadata ? "success" : "warning"}
                />
              </SummaryFact>
              <SummaryFact label="Active unsupported">
                {readinessData.schema_validation.active_unsupported_keywords.length}
              </SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Persisted Coverage</h3>
            <SummaryFacts>
              <SummaryFact label="Execution details tools">
                {readinessData.schema_validation.persisted_execution_details_tool_count}
              </SummaryFact>
              <SummaryFact label="Artifact metadata tools">
                {readinessData.schema_validation.persisted_artifact_metadata_tool_count}
              </SummaryFact>
              <SummaryFact label="Families with coverage">
                {readinessData.schema_validation.persisted_family_coverage
                  .filter((family) => family.execution_details_tools > 0)
                  .map((family) => family.family)
                  .join(", ")}
              </SummaryFact>
              <SummaryFact label="Fully covered families">
                {readinessData.schema_validation.persisted_family_coverage
                  .filter((family) => (
                    family.execution_details_tools === family.total_tools
                    && family.artifact_metadata_tools === family.total_tools
                  ))
                  .map((family) => family.family)
                  .join(", ")}
              </SummaryFact>
            </SummaryFacts>
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
            <SummaryFacts>
              <SummaryFact label="Configured mode">
                <StatusChip label={readinessData.adapter_mode.configured_mode} tone={getExecutionModeTone(readinessData.adapter_mode.configured_mode)} />
              </SummaryFact>
              <SummaryFact label="Supported modes">
                {readinessData.adapter_mode.supported_modes.join(", ")}
              </SummaryFact>
              <SummaryFact label="Real tool paths">
                {readinessData.adapter_mode.real_tool_paths.join(", ") || "none"}
              </SummaryFact>
              <SummaryFact label="Plan-only tool paths">
                {readinessData.adapter_mode.plan_only_tool_paths.join(", ") || "none"}
              </SummaryFact>
              <SummaryFact label="Boundary">{readinessData.adapter_mode.execution_boundary}</SummaryFact>
            </SummaryFacts>
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
