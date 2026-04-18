import type { ExecutionRecord } from "../types/contracts";

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
              const inspectionSurface = readString(item.details, "inspection_surface");
              const projectName = readString(item.details, "project_name");
              const manifestPath = readString(item.details, "project_manifest_path");
              const fallbackReason = readString(item.details, "fallback_reason");
              const realPathAvailable = readBoolean(item.details, "real_path_available");
              const planDetails = readRecord(item.details, "plan_details");
              const projectConfig = readRecord(item.details, "project_config");
              const manifestSettings = readRecord(item.details, "manifest_settings");
              const inspectionEvidence = readStringArray(item.details, "inspection_evidence");
              const gemNames = readStringArray(item.details, "gem_names");
              const requestedSettingsEvidence = readStringArray(
                item.details,
                "requested_settings_evidence",
              );
              const requestedSettingsKeys = readStringArray(
                item.details,
                "requested_settings_keys",
              );
              const matchedRequestedSettingsKeys = readStringArray(
                item.details,
                "matched_requested_settings_keys",
              );
              const missingRequestedSettingsKeys = readStringArray(
                item.details,
                "missing_requested_settings_keys",
              );
              const settingsSelectionMode = readString(item.details, "settings_selection_mode");
              const requestedGemEvidence = readStringArray(item.details, "requested_gem_evidence");
              const requestedGemNames = readStringArray(item.details, "requested_gem_names");
              const matchedRequestedGemNames = readStringArray(
                item.details,
                "matched_requested_gem_names",
              );
              const missingRequestedGemNames = readStringArray(
                item.details,
                "missing_requested_gem_names",
              );
              const gemSelectionMode = readString(item.details, "gem_selection_mode");
              const projectConfigKeys = readStringArray(item.details, "project_config_keys");
              const requestedProjectConfigKeys = readStringArray(
                item.details,
                "requested_project_config_keys",
              );
              const settingsKeys = readStringArray(item.details, "manifest_settings_keys");
              const requestedSettingsSubsetPresent = readBoolean(
                item.details,
                "requested_settings_subset_present",
              );
              const gemEntriesPresent = readBoolean(item.details, "gem_entries_present");
              const requestedGemSubsetPresent = readBoolean(
                item.details,
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
              const provenanceLabel = item.execution_mode === "real"
                ? inspectionSurface === "build_configure_preflight"
                  ? "Real plan-only build.configure preflight"
                  : "Real read-only project inspection"
                : inspectionSurface === "project_manifest"
                  ? "Real project manifest provenance recorded"
                  : inspectionSurface === "build_configure_preflight"
                    ? "Real build.configure preflight provenance recorded"
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
                  {requestedProjectConfigKeys.length > 0 ? (
                    <div>
                      Requested project config keys: {requestedProjectConfigKeys.join(", ")}
                    </div>
                  ) : null}
                  {projectConfig ? (
                    <div>Project config snapshot: {JSON.stringify(projectConfig)}</div>
                  ) : null}
                  {requestedSettingsEvidence.length > 0 ? (
                    <div>Requested settings evidence: {requestedSettingsEvidence.join(", ")}</div>
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
                  {requestedGemEvidence.length > 0 ? (
                    <div>Requested Gem evidence: {requestedGemEvidence.join(", ")}</div>
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
