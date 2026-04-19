import type {
  ExecutionRecord,
  ProjectInspectEvidenceDetails,
} from "../types/contracts";

type ExecutionsPanelProps = {
  items: ExecutionRecord[];
  loading: boolean;
  error: string | null;
};

function readString(details: Record<string, unknown>, key: string): string | null {
  const value = details[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readBoolean(details: Record<string, unknown>, key: string): boolean | null {
  const value = details[key];
  return typeof value === "boolean" ? value : null;
}

function readNumber(details: Record<string, unknown>, key: string): number | null {
  const value = details[key];
  return typeof value === "number" ? value : null;
}

function readRecord(
  details: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = details[key];
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readStringArray(details: Record<string, unknown>, key: string): string[] {
  const value = details[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

export default function ExecutionsPanel({
  items,
  loading,
  error,
}: ExecutionsPanelProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Executions</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        These are persisted execution records. Execution mode remains explicit,
        including simulated control-plane runs.
      </p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading executions...</p>
      ) : items.length === 0 ? (
        <p>No executions recorded yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            (() => {
              const details = item.details as ProjectInspectEvidenceDetails & Record<string, unknown>;
              const inspectionSurface = readString(details, "inspection_surface");
              const projectName = readString(details, "project_name");
              const manifestPath = readString(details, "project_manifest_path");
              const fallbackReason = readString(details, "fallback_reason");
              const realPathAvailable = readBoolean(details, "real_path_available");
              const planDetails = readRecord(details, "plan_details");
              const projectConfig = readRecord(details, "project_config");
              const requestedProjectConfigEvidence = readStringArray(
                details,
                "requested_project_config_evidence",
              );
              const projectConfigSelectionMode = readString(
                details,
                "project_config_selection_mode",
              );
              const manifestSettings = readRecord(details, "manifest_settings");
              const inspectionEvidence = readStringArray(details, "inspection_evidence");
              const gemNames = readStringArray(details, "gem_names");
              const requestedSettingsEvidence = readStringArray(
                details,
                "requested_settings_evidence",
              );
              const settingsEvidenceSource = readString(details, "settings_evidence_source");
              const requestedSettingsKeys = readStringArray(
                details,
                "requested_settings_keys",
              );
              const matchedRequestedSettingsKeys = readStringArray(
                details,
                "matched_requested_settings_keys",
              );
              const missingRequestedSettingsKeys = readStringArray(
                details,
                "missing_requested_settings_keys",
              );
              const matchedRequestedSettingsCount = readNumber(
                details,
                "matched_requested_settings_count",
              );
              const missingRequestedSettingsCount = readNumber(
                details,
                "missing_requested_settings_count",
              );
              const settingsSelectionMode = readString(details, "settings_selection_mode");
              const requestedGemEvidence = readStringArray(details, "requested_gem_evidence");
              const gemEvidenceSource = readString(details, "gem_evidence_source");
              const requestedGemNames = readStringArray(details, "requested_gem_names");
              const matchedRequestedGemNames = readStringArray(
                details,
                "matched_requested_gem_names",
              );
              const missingRequestedGemNames = readStringArray(
                details,
                "missing_requested_gem_names",
              );
              const matchedRequestedGemCount = readNumber(
                details,
                "matched_requested_gem_count",
              );
              const missingRequestedGemCount = readNumber(
                details,
                "missing_requested_gem_count",
              );
              const gemSelectionMode = readString(details, "gem_selection_mode");
              const projectConfigKeys = readStringArray(details, "project_config_keys");
              const requestedProjectConfigKeys = readStringArray(
                details,
                "requested_project_config_keys",
              );
              const matchedRequestedProjectConfigKeys = readStringArray(
                details,
                "matched_requested_project_config_keys",
              );
              const missingRequestedProjectConfigKeys = readStringArray(
                details,
                "missing_requested_project_config_keys",
              );
              const settingsKeys = readStringArray(details, "manifest_settings_keys");
              const requestedProjectConfigSubsetPresent = readBoolean(
                details,
                "requested_project_config_subset_present",
              );
              const requestedSettingsSubsetPresent = readBoolean(
                details,
                "requested_settings_subset_present",
              );
              const gemEntriesPresent = readBoolean(details, "gem_entries_present");
              const requestedGemSubsetPresent = readBoolean(
                details,
                "requested_gem_subset_present",
              );
              const preset = planDetails && typeof planDetails.preset === "string"
                ? planDetails.preset
                : null;
              const generator = planDetails && typeof planDetails.generator === "string"
                ? planDetails.generator
                : null;
              const buildDirectory = planDetails && typeof planDetails.build_directory === "string"
                ? planDetails.build_directory
                : null;
              const registryPath = planDetails && typeof planDetails.registry_path === "string"
                ? planDetails.registry_path
                : null;
              const backupTarget = planDetails && typeof planDetails.backup_target === "string"
                ? planDetails.backup_target
                : null;
              const supportedOperationCount = planDetails && typeof planDetails.supported_operation_count === "number"
                ? planDetails.supported_operation_count
                : null;
              const unsupportedOperationCount = planDetails && typeof planDetails.unsupported_operation_count === "number"
                ? planDetails.unsupported_operation_count
                : null;
              const supportedOperationPaths = planDetails
                ? readStringArray(planDetails, "supported_operation_paths")
                : [];
              const unsupportedOperationPaths = planDetails
                ? readStringArray(planDetails, "unsupported_operation_paths")
                : [];
              const backupCreated = planDetails && typeof planDetails.backup_created === "boolean"
                ? planDetails.backup_created
                : readBoolean(details, "backup_created");
              const rollbackStrategy = planDetails && typeof planDetails.rollback_strategy === "string"
                ? planDetails.rollback_strategy
                : readString(details, "rollback_strategy");
              const rollbackReady = planDetails && typeof planDetails.rollback_ready === "boolean"
                ? planDetails.rollback_ready
                : readBoolean(details, "rollback_ready");
              const patchPlanValid = planDetails && typeof planDetails.patch_plan_valid === "boolean"
                ? planDetails.patch_plan_valid
                : readBoolean(details, "patch_plan_valid");
              const postWriteVerificationAttempted = planDetails && typeof planDetails.post_write_verification_attempted === "boolean"
                ? planDetails.post_write_verification_attempted
                : readBoolean(details, "post_write_verification_attempted");
              const postWriteVerificationSucceeded = planDetails && typeof planDetails.post_write_verification_succeeded === "boolean"
                ? planDetails.post_write_verification_succeeded
                : readBoolean(details, "post_write_verification_succeeded");
              const verifiedOperationPaths = planDetails
                ? readStringArray(planDetails, "verified_operation_paths")
                : [];
              const verificationMismatchedPaths = planDetails
                ? readStringArray(planDetails, "verification_mismatched_paths")
                : [];
              const provenanceLabel = item.execution_mode === "real"
                ? inspectionSurface === "build_configure_preflight"
                  ? "Real plan-only build.configure preflight"
                  : inspectionSurface === "settings_patch_mutation"
                    ? "Real settings.patch mutation"
                  : inspectionSurface === "settings_patch_preflight"
                    ? "Real dry-run-only settings.patch preflight"
                  : "Real read-only project inspection"
                : inspectionSurface === "project_manifest"
                  ? "Real project manifest provenance recorded"
                  : inspectionSurface === "build_configure_preflight"
                    ? "Real build.configure preflight provenance recorded"
                    : inspectionSurface === "settings_patch_mutation"
                      ? "Real settings.patch mutation provenance recorded"
                    : inspectionSurface === "settings_patch_preflight"
                      ? "Real settings.patch preflight provenance recorded"
                    : "Simulated execution record";

              return (
                <li key={item.id} style={{ marginBottom: 12 }}>
                  <strong>{item.tool}</strong>
                  <div>Agent: {item.agent}</div>
                  <div>Status: {item.status}</div>
                  <div>Execution mode: {item.execution_mode}</div>
                  <div>Run ID: {item.run_id}</div>
                  <div>Provenance: {provenanceLabel}</div>
                  {projectName ? <div>Project name: {projectName}</div> : null}
                  {manifestPath ? <div>Manifest path: {manifestPath}</div> : null}
                  {inspectionEvidence.length > 0 ? (
                    <div>Inspection evidence: {inspectionEvidence.join(", ")}</div>
                  ) : null}
                  {projectConfigKeys.length > 0 ? (
                    <div>Project config keys: {projectConfigKeys.join(", ")}</div>
                  ) : null}
                  {requestedProjectConfigEvidence.length > 0 ? (
                    <div>
                      Requested project config evidence: {requestedProjectConfigEvidence.join(", ")}
                    </div>
                  ) : null}
                  {projectConfigSelectionMode ? (
                    <div>Project config selection mode: {projectConfigSelectionMode}</div>
                  ) : null}
                  {requestedProjectConfigKeys.length > 0 ? (
                    <div>
                      Requested project config keys: {requestedProjectConfigKeys.join(", ")}
                    </div>
                  ) : null}
                  {matchedRequestedProjectConfigKeys.length > 0 ? (
                    <div>
                      Matched requested project config keys: {matchedRequestedProjectConfigKeys.join(", ")}
                    </div>
                  ) : null}
                  {missingRequestedProjectConfigKeys.length > 0 ? (
                    <div>
                      Missing requested project config keys: {missingRequestedProjectConfigKeys.join(", ")}
                    </div>
                  ) : null}
                  {requestedProjectConfigSubsetPresent !== null ? (
                    <div>
                      Requested project config subset present: {String(requestedProjectConfigSubsetPresent)}
                    </div>
                  ) : null}
                  {projectConfig ? (
                    <div>Project config snapshot: {JSON.stringify(projectConfig)}</div>
                  ) : null}
                  {requestedSettingsEvidence.length > 0 ? (
                    <div>Requested settings evidence: {requestedSettingsEvidence.join(", ")}</div>
                  ) : null}
                  {settingsEvidenceSource ? (
                    <div>Settings evidence source: {settingsEvidenceSource}</div>
                  ) : null}
                  {settingsSelectionMode ? (
                    <div>Settings selection mode: {settingsSelectionMode}</div>
                  ) : null}
                  {requestedSettingsKeys.length > 0 ? (
                    <div>Requested settings keys: {requestedSettingsKeys.join(", ")}</div>
                  ) : null}
                  {matchedRequestedSettingsKeys.length > 0 ? (
                    <div>
                      Matched requested settings keys: {matchedRequestedSettingsKeys.join(", ")}
                    </div>
                  ) : null}
                  {missingRequestedSettingsKeys.length > 0 ? (
                    <div>
                      Missing requested settings keys: {missingRequestedSettingsKeys.join(", ")}
                    </div>
                  ) : null}
                  {matchedRequestedSettingsCount !== null ? (
                    <div>Matched requested settings count: {matchedRequestedSettingsCount}</div>
                  ) : null}
                  {missingRequestedSettingsCount !== null ? (
                    <div>Missing requested settings count: {missingRequestedSettingsCount}</div>
                  ) : null}
                  {requestedGemEvidence.length > 0 ? (
                    <div>Requested Gem evidence: {requestedGemEvidence.join(", ")}</div>
                  ) : null}
                  {gemEvidenceSource ? (
                    <div>Gem evidence source: {gemEvidenceSource}</div>
                  ) : null}
                  {gemSelectionMode ? <div>Gem selection mode: {gemSelectionMode}</div> : null}
                  {requestedGemNames.length > 0 ? (
                    <div>Requested Gem names: {requestedGemNames.join(", ")}</div>
                  ) : null}
                  {matchedRequestedGemNames.length > 0 ? (
                    <div>
                      Matched requested Gem names: {matchedRequestedGemNames.join(", ")}
                    </div>
                  ) : null}
                  {missingRequestedGemNames.length > 0 ? (
                    <div>
                      Missing requested Gem names: {missingRequestedGemNames.join(", ")}
                    </div>
                  ) : null}
                  {matchedRequestedGemCount !== null ? (
                    <div>Matched requested Gem count: {matchedRequestedGemCount}</div>
                  ) : null}
                  {missingRequestedGemCount !== null ? (
                    <div>Missing requested Gem count: {missingRequestedGemCount}</div>
                  ) : null}
                  {gemNames.length > 0 ? <div>Gem names: {gemNames.join(", ")}</div> : null}
                  {gemEntriesPresent !== null ? (
                    <div>Gem entries present: {String(gemEntriesPresent)}</div>
                  ) : null}
                  {requestedGemSubsetPresent !== null ? (
                    <div>
                      Requested Gem subset present: {String(requestedGemSubsetPresent)}
                    </div>
                  ) : null}
                  {settingsKeys.length > 0 ? (
                    <div>Manifest settings keys: {settingsKeys.join(", ")}</div>
                  ) : null}
                  {requestedSettingsSubsetPresent !== null ? (
                    <div>
                      Requested settings subset present: {String(requestedSettingsSubsetPresent)}
                    </div>
                  ) : null}
                  {manifestSettings ? (
                    <div>
                      Manifest settings snapshot: {JSON.stringify(manifestSettings)}
                    </div>
                  ) : null}
                  {preset ? <div>Preset: {preset}</div> : null}
                  {generator ? <div>Generator: {generator}</div> : null}
                  {buildDirectory ? <div>Build directory: {buildDirectory}</div> : null}
                  {registryPath ? <div>Registry path: {registryPath}</div> : null}
                  {backupTarget ? <div>Backup target: {backupTarget}</div> : null}
                  {backupCreated !== null ? (
                    <div>Backup created: {String(backupCreated)}</div>
                  ) : null}
                  {supportedOperationCount !== null ? (
                    <div>Supported operations: {supportedOperationCount}</div>
                  ) : null}
                  {unsupportedOperationCount !== null ? (
                    <div>Unsupported operations: {unsupportedOperationCount}</div>
                  ) : null}
                  {supportedOperationPaths.length > 0 ? (
                    <div>Supported operation paths: {supportedOperationPaths.join(", ")}</div>
                  ) : null}
                  {unsupportedOperationPaths.length > 0 ? (
                    <div>Unsupported operation paths: {unsupportedOperationPaths.join(", ")}</div>
                  ) : null}
                  {rollbackStrategy ? <div>Rollback strategy: {rollbackStrategy}</div> : null}
                  {rollbackReady !== null ? (
                    <div>Rollback ready: {String(rollbackReady)}</div>
                  ) : null}
                  {patchPlanValid !== null ? (
                    <div>Patch plan valid: {String(patchPlanValid)}</div>
                  ) : null}
                  {postWriteVerificationAttempted !== null ? (
                    <div>Post-write verification attempted: {String(postWriteVerificationAttempted)}</div>
                  ) : null}
                  {postWriteVerificationSucceeded !== null ? (
                    <div>Post-write verification succeeded: {String(postWriteVerificationSucceeded)}</div>
                  ) : null}
                  {verifiedOperationPaths.length > 0 ? (
                    <div>Verified operation paths: {verifiedOperationPaths.join(", ")}</div>
                  ) : null}
                  {verificationMismatchedPaths.length > 0 ? (
                    <div>Verification mismatched paths: {verificationMismatchedPaths.join(", ")}</div>
                  ) : null}
                  {realPathAvailable === false ? (
                    <div>Real path available: false</div>
                  ) : null}
                  {fallbackReason ? <div>Fallback: {fallbackReason}</div> : null}
                  {item.result_summary ? <div>Summary: {item.result_summary}</div> : null}
                  {item.warnings.length > 0 ? (
                    <div>Warnings: {item.warnings.join(", ")}</div>
                  ) : null}
                  <div>Artifacts: {item.artifact_ids.length}</div>
                </li>
              );
            })()
          ))}
        </ul>
      )}
    </section>
  );
}
