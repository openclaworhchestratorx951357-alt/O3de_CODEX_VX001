import type { ArtifactRecord } from "../types/contracts";

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
              const projectName = readString(item.metadata, "project_name");
              const manifestPath = readString(item.metadata, "project_manifest_path");
              const inspectionSurface = readString(item.metadata, "inspection_surface");
              const executionMode = readString(item.metadata, "execution_mode");
              const planDetails = readRecord(item.metadata, "plan_details");
              const projectConfig = readRecord(item.metadata, "project_config");
              const manifestSettings = readRecord(item.metadata, "manifest_settings");
              const inspectionEvidence = readStringArray(item.metadata, "inspection_evidence");
              const gemNames = readStringArray(item.metadata, "gem_names");
              const requestedGemEvidence = readStringArray(item.metadata, "requested_gem_evidence");
              const projectConfigKeys = readStringArray(item.metadata, "project_config_keys");
              const requestedProjectConfigKeys = readStringArray(
                item.metadata,
                "requested_project_config_keys",
              );
              const settingsKeys = readStringArray(item.metadata, "manifest_settings_keys");
              const gemEntriesPresent = item.metadata.gem_entries_present;
              const preset = planDetails && typeof planDetails.preset === "string"
                ? planDetails.preset
                : null;
              const generator = planDetails && typeof planDetails.generator === "string"
                ? planDetails.generator
                : null;
              const buildDirectory = planDetails && typeof planDetails.build_directory === "string"
                ? planDetails.build_directory
                : null;
              const provenanceLabel = item.simulated
                ? "Simulated artifact"
                : inspectionSurface === "build_configure_preflight"
                  ? "Real build.configure preflight evidence"
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
                  {requestedGemEvidence.length > 0 ? (
                    <div>Requested Gem evidence: {requestedGemEvidence.join(", ")}</div>
                  ) : null}
                  {gemNames.length > 0 ? <div>Gem names: {gemNames.join(", ")}</div> : null}
                  {typeof gemEntriesPresent === "boolean" ? (
                    <div>Gem entries present: {String(gemEntriesPresent)}</div>
                  ) : null}
                  {settingsKeys.length > 0 ? (
                    <div>Manifest settings keys: {settingsKeys.join(", ")}</div>
                  ) : null}
                  {manifestSettings ? (
                    <div>
                      Manifest settings snapshot: {JSON.stringify(manifestSettings)}
                    </div>
                  ) : null}
                  {preset ? <div>Preset: {preset}</div> : null}
                  {generator ? <div>Generator: {generator}</div> : null}
                  {buildDirectory ? <div>Build directory: {buildDirectory}</div> : null}
                </li>
              );
            })()
          ))}
        </ul>
      )}
    </section>
  );
}
