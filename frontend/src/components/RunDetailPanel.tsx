import type {
  ProjectInspectEvidenceDetails,
  RunRecord,
  SettingsPatchMutationAudit,
} from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import {
  formatSummaryLabeledText,
  formatSummaryTimestamp,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryCalloutStyle,
  summaryTimestampNoteStyle,
} from "./summaryPrimitives";

type RunDetailPanelProps = {
  item: RunRecord | null;
  loading: boolean;
  error: string | null;
  executionDetails?: Record<string, unknown> | null;
  refreshHint?: string | null;
  lastRefreshedAt?: string | null;
};

function readMutationAudit(
  details: Record<string, unknown> | null | undefined,
): SettingsPatchMutationAudit | null {
  const value = details?.mutation_audit;
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as SettingsPatchMutationAudit)
    : null;
}

function describeRunTruth(item: RunRecord): string {
  if (item.execution_mode === "real" && item.tool === "project.inspect") {
    return "This run used the real read-only project.inspect path and may include explicit manifest-backed config, Gem, settings, origin, presentation, identity, and tag evidence.";
  }
  if (item.execution_mode === "real" && item.tool === "build.configure") {
    return "This run used the real plan-only build.configure preflight path.";
  }
  if (item.execution_mode === "real" && item.tool === "settings.patch") {
    if (item.result_summary?.includes("mutation completed")) {
      return "This run used the first real settings.patch mutation path.";
    }
    if (item.result_summary?.includes("mutation-ready")) {
      return "This run validated a mutation-ready settings.patch plan, but writes remained intentionally disabled.";
    }
    return "This run used the real dry-run-only settings.patch preflight path; no settings were written.";
  }
  if (item.execution_mode === "simulated" && item.tool === "build.configure") {
    return "This build.configure run remained on a simulated fallback path.";
  }
  if (item.execution_mode === "simulated" && item.tool === "settings.patch") {
    return "This settings.patch run remained on a simulated path.";
  }
  return "This run remained on a simulated execution path.";
}

function readProjectInspectDetails(
  details: Record<string, unknown> | null | undefined,
): ProjectInspectEvidenceDetails | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  return details as ProjectInspectEvidenceDetails;
}

function renderJoinedValue(values: string[] | undefined, emptyLabel = "none"): string {
  return values && values.length > 0 ? values.join(", ") : emptyLabel;
}

export default function RunDetailPanel({
  item,
  loading,
  error,
  executionDetails,
  refreshHint,
  lastRefreshedAt,
}: RunDetailPanelProps) {
  const mutationAudit = readMutationAudit(executionDetails);
  const projectInspectDetails = readProjectInspectDetails(executionDetails);
  const isProjectInspectDetail = item?.tool === "project.inspect" && projectInspectDetails;
  const availableProjectConfigKeys = Array.isArray(projectInspectDetails?.available_project_config_keys)
    ? projectInspectDetails.available_project_config_keys
    : [];
  const availableGemNames = Array.isArray(projectInspectDetails?.available_gem_names)
    ? projectInspectDetails.available_gem_names
    : [];
  const availableUserTags = Array.isArray(projectInspectDetails?.available_user_tags)
    ? projectInspectDetails.available_user_tags
    : [];
  const availableCompatibleEngines = Array.isArray(projectInspectDetails?.available_compatible_engines)
    ? projectInspectDetails.available_compatible_engines
    : [];
  const availableEngineApiDependencyKeys = Array.isArray(
    projectInspectDetails?.available_engine_api_dependency_keys,
  )
    ? projectInspectDetails.available_engine_api_dependency_keys
    : [];
  const requestedSettingsKeys = Array.isArray(projectInspectDetails?.requested_settings_keys)
    ? projectInspectDetails.requested_settings_keys
    : [];
  const matchedRequestedSettingsKeys = Array.isArray(
    projectInspectDetails?.matched_requested_settings_keys,
  )
    ? projectInspectDetails.matched_requested_settings_keys
    : [];
  const missingRequestedSettingsKeys = Array.isArray(
    projectInspectDetails?.missing_requested_settings_keys,
  )
    ? projectInspectDetails.missing_requested_settings_keys
    : [];
  const requestedGemNames = Array.isArray(projectInspectDetails?.requested_gem_names)
    ? projectInspectDetails.requested_gem_names
    : [];
  const matchedRequestedGemNames = Array.isArray(
    projectInspectDetails?.matched_requested_gem_names,
  )
    ? projectInspectDetails.matched_requested_gem_names
    : [];
  const missingRequestedGemNames = Array.isArray(
    projectInspectDetails?.missing_requested_gem_names,
  )
    ? projectInspectDetails.missing_requested_gem_names
    : [];
  const requestedProjectConfigKeys = Array.isArray(
    projectInspectDetails?.requested_project_config_keys,
  )
    ? projectInspectDetails.requested_project_config_keys
    : [];
  const matchedRequestedProjectConfigKeys = Array.isArray(
    projectInspectDetails?.matched_requested_project_config_keys,
  )
    ? projectInspectDetails.matched_requested_project_config_keys
    : [];
  const missingRequestedProjectConfigKeys = Array.isArray(
    projectInspectDetails?.missing_requested_project_config_keys,
  )
    ? projectInspectDetails.missing_requested_project_config_keys
    : [];
  return (
    <SummarySection
      title="Run Detail"
      description="This view shows one persisted run record with explicit execution truth, including simulated runs."
      loading={loading}
      error={error}
      emptyMessage="Select a run to inspect its detail."
      hasItems={Boolean(item)}
    >
      {refreshHint ? (
        <div style={summaryCalloutStyle}>{refreshHint}</div>
      ) : null}
      {lastRefreshedAt ? (
        <div style={summaryTimestampNoteStyle}>
          Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
        </div>
      ) : null}
      <div style={summaryCardGridStyle}>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Identity</h4>
          <SummaryFacts>
            <SummaryFact label="Run ID" copyValue={item?.id ?? undefined}>{item?.id}</SummaryFact>
            <SummaryFact label="Request ID" copyValue={item?.request_id ?? undefined}>{item?.request_id}</SummaryFact>
            <SummaryFact label="Agent">{item?.agent}</SummaryFact>
            <SummaryFact label="Tool">{item?.tool}</SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Execution</h4>
          <SummaryFacts>
            <SummaryFact label="Status">{item?.status}</SummaryFact>
            <SummaryFact label="Execution mode">{item?.execution_mode}</SummaryFact>
            <SummaryFact label="Dry run">{String(item?.dry_run)}</SummaryFact>
            <SummaryFact label="Created">
              {item ? formatSummaryTimestamp(item.created_at) : ""}
            </SummaryFact>
            <SummaryFact label="Updated">
              {item ? formatSummaryTimestamp(item.updated_at) : ""}
            </SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Truth Boundary</h4>
          <div style={summaryCalloutStyle}>
            {item ? formatSummaryLabeledText("Execution truth", describeRunTruth(item)) : null}
          </div>
          {item?.result_summary ? (
            <div style={{ marginTop: 8 }}>
              <strong>Summary:</strong> {item.result_summary}
            </div>
          ) : null}
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Locks And Warnings</h4>
          <SummaryFacts>
            <SummaryFact label="Requested locks">
              {item?.requested_locks.join(", ") || "none"}
            </SummaryFact>
            <SummaryFact label="Granted locks">
              {item?.granted_locks.join(", ") || "none"}
            </SummaryFact>
            <SummaryFact label="Warnings">
              {item?.warnings.join(", ") || "none"}
            </SummaryFact>
          </SummaryFacts>
        </article>
        {item?.tool === "settings.patch" && mutationAudit ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Mutation Audit</h4>
            <SummaryFacts>
              <SummaryFact label="Audit summary">{mutationAudit.summary ?? "available"}</SummaryFact>
              <SummaryFact label="Audit phase">{mutationAudit.phase ?? "unknown"}</SummaryFact>
              <SummaryFact label="Audit status">{mutationAudit.status ?? "unknown"}</SummaryFact>
              {typeof mutationAudit.backup_created === "boolean" ? (
                <SummaryFact label="Backup created">{String(mutationAudit.backup_created)}</SummaryFact>
              ) : null}
              {typeof mutationAudit.post_write_verification_succeeded === "boolean" ? (
                <SummaryFact label="Verification succeeded">
                  {String(mutationAudit.post_write_verification_succeeded)}
                </SummaryFact>
              ) : null}
              {mutationAudit.rollback_outcome ? (
                <SummaryFact label="Rollback outcome">{mutationAudit.rollback_outcome}</SummaryFact>
              ) : null}
            </SummaryFacts>
          </article>
        ) : null}
      </div>
      {isProjectInspectDetail ? (
        <div style={{ ...summaryCardGridStyle, marginTop: 16 }}>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Manifest Surface</h4>
            <SummaryFacts>
              <SummaryFact label="Inspection surface">
                {projectInspectDetails.inspection_surface ?? "unknown"}
              </SummaryFact>
              <SummaryFact label="Manifest path" copyValue={projectInspectDetails.project_manifest_path ?? undefined}>
                {projectInspectDetails.project_manifest_path ?? "not recorded"}
              </SummaryFact>
              <SummaryFact label="Evidence markers">
                {renderJoinedValue(projectInspectDetails.inspection_evidence)}
              </SummaryFact>
              <SummaryFact label="Discovered config keys">
                {renderJoinedValue(availableProjectConfigKeys)}
              </SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Config Evidence</h4>
            <SummaryFacts>
              <SummaryFact label="Selection mode">
                {projectInspectDetails.project_config_selection_mode ?? "not recorded"}
              </SummaryFact>
              <SummaryFact label="Requested config keys">
                {renderJoinedValue(requestedProjectConfigKeys)}
              </SummaryFact>
              <SummaryFact label="Matched config keys">
                {renderJoinedValue(matchedRequestedProjectConfigKeys)}
              </SummaryFact>
              <SummaryFact label="Missing config keys">
                {renderJoinedValue(missingRequestedProjectConfigKeys)}
              </SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Gem Evidence</h4>
            <SummaryFacts>
              <SummaryFact label="Discovered Gems">
                {renderJoinedValue(availableGemNames)}
              </SummaryFact>
              <SummaryFact label="Requested Gem names">
                {renderJoinedValue(requestedGemNames)}
              </SummaryFact>
              <SummaryFact label="Matched Gem names">
                {renderJoinedValue(matchedRequestedGemNames)}
              </SummaryFact>
              <SummaryFact label="Missing Gem names">
                {renderJoinedValue(missingRequestedGemNames)}
              </SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Settings Evidence</h4>
            <SummaryFacts>
              <SummaryFact label="Settings source">
                {projectInspectDetails.settings_evidence_source ?? "not recorded"}
              </SummaryFact>
              <SummaryFact label="Requested settings keys">
                {renderJoinedValue(requestedSettingsKeys)}
              </SummaryFact>
              <SummaryFact label="Matched settings keys">
                {renderJoinedValue(matchedRequestedSettingsKeys)}
              </SummaryFact>
              <SummaryFact label="Missing settings keys">
                {renderJoinedValue(missingRequestedSettingsKeys)}
              </SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Project Metadata</h4>
            <SummaryFacts>
              <SummaryFact label="Project origin type">
                {projectInspectDetails.available_project_origin_type ?? "null"}
              </SummaryFact>
              <SummaryFact label="Project ID">
                {projectInspectDetails.available_project_id ?? "not recorded"}
              </SummaryFact>
              <SummaryFact label="Display name">
                {projectInspectDetails.available_display_name ?? "not recorded"}
              </SummaryFact>
              <SummaryFact label="Restricted platform">
                {projectInspectDetails.available_restricted_platform_name ?? "not recorded"}
              </SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Compatibility And Tags</h4>
            <SummaryFacts>
              <SummaryFact label="Compatible engines">
                {renderJoinedValue(availableCompatibleEngines)}
              </SummaryFact>
              <SummaryFact label="Engine API dependency keys">
                {renderJoinedValue(availableEngineApiDependencyKeys)}
              </SummaryFact>
              <SummaryFact label="User tags">
                {renderJoinedValue(availableUserTags)}
              </SummaryFact>
              <SummaryFact label="Icon path">
                {projectInspectDetails.available_icon_path ?? "not recorded"}
              </SummaryFact>
            </SummaryFacts>
          </article>
        </div>
      ) : null}
    </SummarySection>
  );
}
