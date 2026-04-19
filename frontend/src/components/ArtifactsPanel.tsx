import type {
  ArtifactRecord,
  ProjectInspectEvidenceDetails,
} from "../types/contracts";

type ArtifactsPanelProps = {
  items: ArtifactRecord[];
  loading: boolean;
  error: string | null;
};

function readString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readRecord(
  metadata: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = metadata[key];
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readBoolean(metadata: Record<string, unknown>, key: string): boolean | null {
  const value = metadata[key];
  return typeof value === "boolean" ? value : null;
}

function readStringArray(metadata: Record<string, unknown>, key: string): string[] {
  const value = metadata[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

export default function ArtifactsPanel({
  items,
  loading,
  error,
}: ArtifactsPanelProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Artifacts</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>
        These are persisted artifact records. Simulated artifacts stay explicitly
        labeled as simulated.
      </p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading artifacts...</p>
      ) : items.length === 0 ? (
        <p>No artifacts recorded yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            (() => {
              const metadata = item.metadata as ProjectInspectEvidenceDetails & Record<string, unknown>;
              const projectName = readString(metadata, "project_name");
              const manifestPath = readString(metadata, "project_manifest_path");
              const inspectionSurface = readString(metadata, "inspection_surface");
              const executionMode = readString(metadata, "execution_mode");
              const planDetails = readRecord(metadata, "plan_details");
              const projectConfig = readRecord(metadata, "project_config");
              const manifestSettings = readRecord(metadata, "manifest_settings");
              const inspectionEvidence = readStringArray(metadata, "inspection_evidence");
              const gemNames = readStringArray(metadata, "gem_names");
              const requestedSettingsEvidence = readStringArray(
                metadata,
                "requested_settings_evidence",
              );
              const requestedSettingsKeys = readStringArray(
                metadata,
                "requested_settings_keys",
              );
              const matchedRequestedSettingsKeys = readStringArray(
                metadata,
                "matched_requested_settings_keys",
              );
              const missingRequestedSettingsKeys = readStringArray(
                metadata,
                "missing_requested_settings_keys",
              );
              const settingsSelectionMode = readString(metadata, "settings_selection_mode");
              const requestedGemEvidence = readStringArray(metadata, "requested_gem_evidence");
              const requestedGemNames = readStringArray(metadata, "requested_gem_names");
              const matchedRequestedGemNames = readStringArray(
                metadata,
                "matched_requested_gem_names",
              );
              const missingRequestedGemNames = readStringArray(
                metadata,
                "missing_requested_gem_names",
              );
              const gemSelectionMode = readString(metadata, "gem_selection_mode");
              const projectConfigKeys = readStringArray(metadata, "project_config_keys");
              const requestedProjectConfigKeys = readStringArray(
                metadata,
                "requested_project_config_keys",
              );
              const settingsKeys = readStringArray(metadata, "manifest_settings_keys");
              const requestedSettingsSubsetPresent = metadata.requested_settings_subset_present;
              const gemEntriesPresent = metadata.gem_entries_present;
              const requestedGemSubsetPresent = metadata.requested_gem_subset_present;
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
              const backupCreated = planDetails && typeof planDetails.backup_created === "boolean"
                ? planDetails.backup_created
                : readBoolean(metadata, "backup_created");
              const provenanceLabel = item.simulated
                ? "Simulated artifact"
                : inspectionSurface === "build_configure_preflight"
                  ? "Real build.configure preflight evidence"
                : inspectionSurface === "settings_patch_preflight"
                  ? "Real settings.patch preflight evidence"
                : inspectionSurface === "project_manifest"
                  ? "Real project manifest evidence"
                  : "Real artifact";

              return (
                <li key={item.id} style={{ marginBottom: 12 }}>
                  <strong>{item.label}</strong>
                  <div>Kind: {item.kind}</div>
                  <div>Run ID: {item.run_id}</div>
                  <div>Execution ID: {item.execution_id}</div>
                  <div>URI: {item.uri}</div>
                  {item.path ? <div>Path: {item.path}</div> : null}
                  <div>Simulated: {String(item.simulated)}</div>
                  {executionMode ? <div>Execution mode: {executionMode}</div> : null}
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
                  {typeof gemEntriesPresent === "boolean" ? (
                    <div>Gem entries present: {String(gemEntriesPresent)}</div>
                  ) : null}
                  {typeof requestedGemSubsetPresent === "boolean" ? (
                    <div>
                      Requested Gem subset present: {String(requestedGemSubsetPresent)}
                    </div>
                  ) : null}
                  {settingsKeys.length > 0 ? (
                    <div>Manifest settings keys: {settingsKeys.join(", ")}</div>
                  ) : null}
                  {typeof requestedSettingsSubsetPresent === "boolean" ? (
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
                </li>
              );
            })()
          ))}
        </ul>
      )}
    </section>
  );
}
