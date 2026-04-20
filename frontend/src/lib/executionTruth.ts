import type {
  ArtifactListItem,
  ExecutionListItem,
  RunListItem,
  RunRecord,
} from "../types/contracts";

type RunTruthSource = Pick<RunRecord, "execution_mode" | "tool" | "result_summary">
  | Pick<RunListItem, "execution_mode" | "tool">;

function readRunResultSummary(item: RunTruthSource): string {
  return "result_summary" in item && typeof item.result_summary === "string"
    ? item.result_summary
    : "";
}

export function getRunExecutionTruthLabel(item: RunTruthSource): string {
  if (item.tool === "build.configure") {
    return item.execution_mode === "real"
      ? "Real plan-only preflight path."
      : "Simulated path or hybrid fallback.";
  }
  if (item.tool === "project.inspect") {
    return item.execution_mode === "real"
      ? "Real read-only inspection path."
      : "Simulated path or hybrid fallback.";
  }
  return item.execution_mode === "real"
    ? "Narrow real adapter path."
    : "Simulated path.";
}

export function getRunTruthBoundaryDescription(item: RunTruthSource): string {
  const resultSummary = readRunResultSummary(item);

  if (item.execution_mode === "real" && item.tool === "project.inspect") {
    return "This run used the real read-only project.inspect path and may include explicit manifest-backed config, Gem, settings, origin, presentation, identity, and tag evidence.";
  }
  if (item.execution_mode === "real" && item.tool === "build.configure") {
    return "This run used the real plan-only build.configure preflight path.";
  }
  if (item.execution_mode === "real" && item.tool === "settings.patch") {
    if (resultSummary.includes("mutation completed")) {
      return "This run used the first real settings.patch mutation path.";
    }
    if (resultSummary.includes("mutation-ready")) {
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

export function getExecutionProvenanceLabel(item: ExecutionListItem): string {
  if (item.execution_mode === "real") {
    if (item.inspection_surface === "build_configure_preflight") {
      return "Real plan-only build.configure preflight";
    }
    if (item.inspection_surface === "settings_patch_mutation") {
      return "Real settings.patch mutation";
    }
    if (item.inspection_surface === "settings_patch_preflight") {
      return "Real dry-run-only settings.patch preflight";
    }
    return "Real read-only project inspection";
  }
  if (item.inspection_surface === "project_manifest") {
    return "Real project manifest provenance recorded";
  }
  if (item.inspection_surface === "build_configure_preflight") {
    return "Real build.configure preflight provenance recorded";
  }
  if (item.inspection_surface === "settings_patch_mutation") {
    return "Real settings.patch mutation provenance recorded";
  }
  if (item.inspection_surface === "settings_patch_preflight") {
    return "Real settings.patch preflight provenance recorded";
  }
  return "Simulated execution record";
}

export function getArtifactProvenanceLabel(item: ArtifactListItem): string {
  if (item.simulated) {
    return "Simulated artifact";
  }
  if (item.inspection_surface === "build_configure_preflight") {
    return "Real build.configure preflight evidence";
  }
  if (item.inspection_surface === "settings_patch_mutation") {
    return "Real settings.patch mutation evidence";
  }
  if (item.inspection_surface === "settings_patch_preflight") {
    return "Real settings.patch preflight evidence";
  }
  if (item.inspection_surface === "project_manifest") {
    return "Real project manifest evidence";
  }
  return "Real artifact";
}
