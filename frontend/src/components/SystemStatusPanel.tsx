import type { CSSProperties } from "react";

import type { O3DEBridgeStatus, ReadinessStatus } from "../types/contracts";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import {
  getAdapterAttentionLabel,
  getCoverageAttentionLabel,
  getPersistenceAttentionLabel,
  getSchemaAttentionLabel,
} from "../lib/operatorStatus";
import CopyTextButton from "./CopyTextButton";
import ExpandablePanelSection from "./ExpandablePanelSection";
import OperatorStatusRail from "./OperatorStatusRail";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  getExecutionModeTone,
  getSchemaModeTone,
} from "./statusChipTones";
import {
  summaryActionButtonStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
} from "./summaryPrimitives";

const systemStatusGuide = getPanelGuide("system-status");
const systemStatusCleanupControlGuide = getPanelControlGuide("system-status", "cleanup-results");
const systemStatusCopyDeadlettersControlGuide = getPanelControlGuide("system-status", "copy-deadletters");

type SystemStatusPanelProps = {
  readiness: ReadinessStatus | null;
  bridgeStatus: O3DEBridgeStatus | null;
  loading: boolean;
  error: string | null;
  bridgeError?: string | null;
  bridgeCleanupBusy?: boolean;
  bridgeCleanupStatus?: string | null;
  onCleanupBridgeResults?: (() => void) | null;
};

export default function SystemStatusPanel(
  {
    readiness,
    bridgeStatus,
    loading,
    error,
    bridgeError,
    bridgeCleanupBusy = false,
    bridgeCleanupStatus,
    onCleanupBridgeResults,
  }: SystemStatusPanelProps,
) {
  const readinessData = readiness;
  const bridgeData = bridgeStatus;
  const heartbeatAt = bridgeData?.heartbeat?.heartbeat_at;
  const heartbeatProjectRoot = bridgeData?.heartbeat?.project_root;
  const heartbeatRunning = bridgeData?.heartbeat?.running;
  const activeLevelPath = bridgeData?.heartbeat?.active_level_path;
  const lastCleanup = bridgeData?.last_results_cleanup;
  const deadletterClusterSummary = summarizeBridgeDeadletterCluster(bridgeData);
  const heartbeatLagNote = buildBridgeHeartbeatLagNote(bridgeData);
  const recentDeadletterExportText = buildBridgeDeadletterExport(bridgeData);

  return (
    <SummarySection
      title="System Status"
      description="Operator summary of backend readiness, persistence, adapter contract, schema-validation state, and live editor bridge health. Persisted coverage and bridge telemetry are control-plane diagnostics only, not broader real-execution claims. Simulated execution remains explicitly labeled and real O3DE adapters remain limited to the currently admitted surfaces."
      guideTooltip={systemStatusGuide.tooltip}
      guideChecklist={systemStatusGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage="No readiness data available."
      hasItems={Boolean(readinessData || bridgeData)}
      marginTop={0}
    >
      {readinessData || bridgeData ? (
        <div style={runtimeStatusGridStyle}>
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Editor Bridge</h3>
            <SummaryFacts>
              <SummaryFact label="Configured">
                <StatusChip
                  label={bridgeData?.configured ? "yes" : "no"}
                  tone={bridgeData?.configured ? "success" : "warning"}
                />
              </SummaryFact>
              <SummaryFact label="Heartbeat fresh">
                <StatusChip
                  label={bridgeData?.heartbeat_fresh ? "yes" : "no"}
                  tone={bridgeData?.heartbeat_fresh ? "success" : "warning"}
                />
              </SummaryFact>
              <SummaryFact label="Bridge running">
                <StatusChip
                  label={heartbeatRunning === true ? "yes" : heartbeatRunning === false ? "no" : "unknown"}
                  tone={heartbeatRunning === true ? "success" : heartbeatRunning === false ? "danger" : "neutral"}
                />
              </SummaryFact>
              <SummaryFact label="Editor process active">
                <StatusChip
                  label={bridgeData?.runner_process_active ? "yes" : "no"}
                  tone={bridgeData?.runner_process_active ? "success" : "warning"}
                />
              </SummaryFact>
              <SummaryFact label="Results queue">
                {bridgeData?.queue_counts.results ?? 0}
              </SummaryFact>
              <SummaryFact label="Deadletters">
                <StatusChip
                  label={String(bridgeData?.queue_counts.deadletter ?? 0)}
                  tone={(bridgeData?.queue_counts.deadletter ?? 0) > 0 ? "warning" : "success"}
                />
              </SummaryFact>
              <SummaryFact label="Last heartbeat">
                {formatBridgeValue(formatIsoLabel(heartbeatAt))}
              </SummaryFact>
              <SummaryFact label="Heartbeat age">
                {formatHeartbeatAge(bridgeData?.heartbeat_age_s)}
              </SummaryFact>
              <SummaryFact label="Project root">
                {formatBridgeValue(heartbeatProjectRoot, "not reported")}
              </SummaryFact>
              <SummaryFact label="Active level">
                {formatBridgeValue(activeLevelPath, "not reported")}
              </SummaryFact>
              <SummaryFact label="Last cleanup">
                {formatBridgeValue(formatIsoLabel(lastCleanup?.attempted_at))}
              </SummaryFact>
              <SummaryFact label="Cleanup outcome">
                {formatBridgeCleanupOutcome(lastCleanup)}
              </SummaryFact>
              <SummaryFact
                label="Deadletter path"
                copyValue={bridgeData?.deadletter_path ?? undefined}
              >
                {formatBridgeValue(bridgeData?.deadletter_path, "not reported")}
              </SummaryFact>
              <SummaryFact
                label="Bridge log path"
                copyValue={bridgeData?.log_path ?? undefined}
              >
                {formatBridgeValue(bridgeData?.log_path, "not reported")}
              </SummaryFact>
            </SummaryFacts>
            <p style={subtleTextStyle}>
              Bridge telemetry reflects the persistent Gem-backed editor host only. It helps operators distinguish live bridge observation from simulated fallback and does not widen the admitted real editor set.
            </p>
            {onCleanupBridgeResults ? (
              <div style={bridgeActionRowStyle}>
                <button
                  type="button"
                  onClick={onCleanupBridgeResults}
                  title={systemStatusCleanupControlGuide.tooltip}
                  disabled={bridgeCleanupBusy || !bridgeData?.configured}
                  style={summaryActionButtonStyle}
                >
                  {bridgeCleanupBusy ? "Cleaning stale results..." : "Clear stale success results"}
                </button>
                <span style={subtleTextStyle}>
                  Removes stale successful `results/*.json.resp` transport artifacts only. Deadletters remain preserved by default.
                </span>
              </div>
            ) : null}
            {bridgeCleanupStatus ? (
              <p style={bridgeStatusNoteStyle}>{bridgeCleanupStatus}</p>
            ) : null}
            {lastCleanup ? (
              <p style={subtleTextStyle}>
                Last cleanup removed {lastCleanup.deleted_response_count} stale successful
                response{lastCleanup.deleted_response_count === 1 ? "" : "s"}, retained{" "}
                {lastCleanup.retained_response_count}, and preserved{" "}
                {lastCleanup.deadletter_preserved_count} deadletter
                {lastCleanup.deadletter_preserved_count === 1 ? "" : "s"}.
              </p>
            ) : null}
            {bridgeError ? (
              <p style={bridgeWarningStyle}>Bridge status fetch error: {bridgeError}</p>
            ) : null}
            {heartbeatLagNote ? (
              <p style={bridgeStatusNoteStyle}>{heartbeatLagNote}</p>
            ) : null}
            {bridgeData?.recent_deadletters && bridgeData.recent_deadletters.length > 0 ? (
              <>
                {deadletterClusterSummary ? (
                  <p style={bridgeWarningStyle}>
                    Repeated deadletter pattern: {deadletterClusterSummary}
                  </p>
                ) : null}
                {recentDeadletterExportText ? (
                  <div style={bridgeActionRowStyle}>
                    <span style={subtleTextStyle}>
                      Copy recent deadletter follow-up draft:
                    </span>
                    <CopyTextButton
                      value={recentDeadletterExportText}
                      label="Bridge deadletter follow-up draft (browser-local clipboard only)"
                      title={systemStatusCopyDeadlettersControlGuide.tooltip}
                    />
                    <span style={subtleTextStyle}>
                      Browser-local clipboard only. No backend export or persistence is performed.
                    </span>
                  </div>
                ) : null}
                <ExpandablePanelSection
                  title="Recent deadletters"
                  preview={`${bridgeData.recent_deadletters.length} preserved bridge failure${bridgeData.recent_deadletters.length === 1 ? "" : "s"}`}
                >
                  <ul style={listStyle}>
                    {bridgeData.recent_deadletters.map((deadletter) => (
                      <li key={deadletter.bridge_command_id} style={{ marginBottom: 10 }}>
                        <strong>{deadletter.operation ?? "unknown operation"}</strong>:{" "}
                        {deadletter.error_code ?? "no error code"}
                        <div style={subtleTextStyle}>
                          {deadletter.result_summary ?? "No summary recorded."}
                        </div>
                        <div style={subtleTextStyle}>
                          Finished: {formatIsoLabel(deadletter.finished_at)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </ExpandablePanelSection>
              </>
            ) : null}
          </article>
          {readinessData ? (
          <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Backend</h3>
            <SummaryFacts>
              <SummaryFact label="Ready">
                <StatusChip label={readinessData.ok ? "yes" : "no"} tone={readinessData.ok ? "success" : "danger"} />
              </SummaryFact>
              <SummaryFact label="Operator status">
                <OperatorStatusRail
                  executionMode={readinessData.execution_mode}
                  attentionLabel={readinessData.ok ? "Routine follow-up" : "Audit review needed"}
                />
              </SummaryFact>
              <SummaryFact label="Execution mode">
                <StatusChip label={readinessData.execution_mode} tone={getExecutionModeTone(readinessData.execution_mode)} />
              </SummaryFact>
              <SummaryFact label="Adapter contract">
                {readinessData.adapter_mode.contract_version}
              </SummaryFact>
            </SummaryFacts>
          </article>
          ) : null}
          {readinessData ? (
            <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Persistence</h3>
            <SummaryFacts>
              <SummaryFact label="Ready">
                <StatusChip label={readinessData.persistence_ready ? "yes" : "no"} tone={readinessData.persistence_ready ? "success" : "danger"} />
              </SummaryFact>
              <SummaryFact label="Operator status">
                <OperatorStatusRail
                  attentionLabel={getPersistenceAttentionLabel(readinessData)}
                />
              </SummaryFact>
              <SummaryFact label="Strategy">{readinessData.database_strategy}</SummaryFact>
              <SummaryFact label="Path">{readinessData.database_path}</SummaryFact>
              <SummaryFact label="Warning">{readinessData.persistence_warning ?? "none"}</SummaryFact>
            </SummaryFacts>
          </article>
          ) : null}
          {readinessData ? (
            <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Schema Validation</h3>
            <SummaryFacts>
              <SummaryFact label="Operator status">
                <OperatorStatusRail
                  attentionLabel={getSchemaAttentionLabel(readinessData)}
                />
              </SummaryFact>
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
          ) : null}
          {readinessData ? (
            <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Persisted Coverage</h3>
            <SummaryFacts>
              <SummaryFact label="Operator status">
                <OperatorStatusRail
                  attentionLabel={getCoverageAttentionLabel(readinessData)}
                />
              </SummaryFact>
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
          ) : null}
          {readinessData ? (
            <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Family Rollout</h3>
            <div style={{ marginBottom: 12 }}>
              <SummaryFacts>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    attentionLabel={getCoverageAttentionLabel(readinessData)}
                  />
                </SummaryFact>
              </SummaryFacts>
            </div>
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
          ) : null}
          {readinessData ? (
            <article style={summaryCardStyle}>
            <h3 style={summaryCardHeadingStyle}>Adapter Boundary</h3>
            <SummaryFacts>
              <SummaryFact label="Operator status">
                <OperatorStatusRail
                  executionMode={readinessData.adapter_mode.configured_mode}
                  attentionLabel={getAdapterAttentionLabel(readinessData)}
                />
              </SummaryFact>
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
          ) : null}
        </div>
      ) : null}
    </SummarySection>
  );
}

function formatBridgeValue(value: unknown, fallback = "none") {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function formatIsoLabel(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "not reported";
  }

  const parsedValue = Date.parse(value);
  if (Number.isNaN(parsedValue)) {
    return value;
  }

  return new Date(parsedValue).toLocaleString();
}

function formatBridgeCleanupOutcome(
  cleanupStatus: O3DEBridgeStatus["last_results_cleanup"] | null | undefined,
) {
  if (!cleanupStatus) {
    return "not yet run";
  }

  if (cleanupStatus.outcome === "stale-results-removed") {
    return "stale results removed";
  }

  if (cleanupStatus.outcome === "no-stale-results-removed") {
    return "no stale results removed";
  }

  return cleanupStatus.outcome;
}

function formatHeartbeatAge(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    return "not reported";
  }

  return `${Math.round(value)}s`;
}

function buildBridgeDeadletterExport(bridgeData: O3DEBridgeStatus | null): string | null {
  if (!bridgeData || !bridgeData.recent_deadletters || bridgeData.recent_deadletters.length === 0) {
    return null;
  }

  return [
    "Bridge deadletter follow-up draft (browser-local clipboard only)",
    "This draft summarizes preserved bridge deadletters for operator follow-up and does not create backend persistence or orchestration-owned state.",
    `Deadletter path: ${bridgeData.deadletter_path ?? "not reported"}`,
    `Bridge log path: ${bridgeData.log_path ?? "not reported"}`,
    `Project root: ${bridgeData.project_root ?? "not reported"}`,
    `Heartbeat fresh: ${bridgeData.heartbeat_fresh ? "yes" : "no"}`,
    "",
    "Recent deadletters:",
    ...bridgeData.recent_deadletters.map((deadletter) => (
      `- ${deadletter.operation ?? "unknown operation"} | ${deadletter.error_code ?? "no error code"} | ${deadletter.result_summary ?? "No summary recorded."} | finished: ${formatIsoLabel(deadletter.finished_at)} | result path: ${deadletter.result_path ?? "not recorded"}`
    )),
  ].join("\n");
}

function summarizeBridgeDeadletterCluster(
  bridgeData: O3DEBridgeStatus | null,
): string | null {
  if (!bridgeData?.recent_deadletters || bridgeData.recent_deadletters.length < 2) {
    return null;
  }

  const clusteredDeadletters = new Map<string, number>();
  for (const deadletter of bridgeData.recent_deadletters) {
    const key = `${deadletter.operation ?? "unknown operation"}|${deadletter.error_code ?? "no error code"}`;
    clusteredDeadletters.set(key, (clusteredDeadletters.get(key) ?? 0) + 1);
  }

  let topClusterKey: string | null = null;
  let topClusterCount = 0;
  for (const [clusterKey, clusterCount] of clusteredDeadletters.entries()) {
    if (clusterCount > topClusterCount) {
      topClusterKey = clusterKey;
      topClusterCount = clusterCount;
    }
  }

  if (!topClusterKey || topClusterCount < 2) {
    return null;
  }

  const [operation, errorCode] = topClusterKey.split("|");
  return `${topClusterCount} recent deadletters for ${operation} with ${errorCode}. This is bridge diagnostics only and does not expand the admitted real editor set.`;
}

function buildBridgeHeartbeatLagNote(
  bridgeData: O3DEBridgeStatus | null,
): string | null {
  if (
    bridgeData
    && !bridgeData.heartbeat_fresh
    && bridgeData.runner_process_active
    && bridgeData.heartbeat
    && bridgeData.heartbeat.running === true
  ) {
    return "Bridge heartbeat is stale even though the editor process is still active. This usually means the persistent bridge loop is no longer advancing, so backend bridge checks may retry or time out until heartbeat pulses resume or the host is restarted.";
  }

  if (!bridgeData?.heartbeat_fresh) {
    return null;
  }

  const heartbeat = bridgeData.heartbeat;
  if (!heartbeat || heartbeat.running !== true) {
    return null;
  }

  const activeLevelPath = heartbeat.active_level_path;
  const inboxCount = bridgeData.queue_counts.inbox ?? 0;
  if (typeof activeLevelPath === "string" && activeLevelPath.trim().length > 0) {
    return null;
  }

  if (inboxCount <= 0) {
    return null;
  }

  return "Bridge heartbeat is healthy, but the editor context snapshot may still be catching up after a real editor action. Refresh after the next pulse if active level remains unreported.";
}

const listLabelStyle: CSSProperties = {
  marginBottom: 8,
};

const runtimeStatusGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  alignItems: "start",
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  overflowWrap: "anywhere",
};

const subtleTextStyle: CSSProperties = {
  color: "var(--app-muted-color)",
  marginTop: 4,
  overflowWrap: "anywhere",
};

const bridgeWarningStyle: CSSProperties = {
  color: "var(--app-warning-text)",
  marginTop: 12,
  overflowWrap: "anywhere",
};

const bridgeStatusNoteStyle: CSSProperties = {
  color: "var(--app-info-text)",
  marginTop: 8,
  marginBottom: 0,
  overflowWrap: "anywhere",
};

const bridgeActionRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: 8,
};
