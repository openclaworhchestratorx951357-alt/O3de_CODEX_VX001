import type {
  ArtifactListItem,
  ProjectInspectResult,
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

export function getHybridDispatchNote(
  hybridModeActive: boolean,
  toolName: string,
  mayUseRealPath: boolean,
  mayUseRealPlanOnlyPath: boolean,
): string | null {
  if (!hybridModeActive) {
    return null;
  }
  if (toolName === "project.inspect" && mayUseRealPath) {
    return "Hybrid mode is active. This tool may use the real read-only project inspection path when its manifest preconditions are satisfied, including explicit manifest-backed config, Gem, settings, origin, presentation, identity, and tag evidence; otherwise it will fall back to simulation.";
  }
  if (toolName === "build.configure" && mayUseRealPlanOnlyPath) {
    return "Hybrid mode is active. This tool may use the real plan-only build.configure preflight path when dry_run=true and manifest preconditions are satisfied; otherwise it will fall back to simulation.";
  }
  return "Hybrid mode is active, but this selected tool will still remain simulated in this phase.";
}

export function getDispatchExpectedExecutionTruth(
  capabilityStatus: string,
  mayUseRealPath: boolean,
  mayUseRealPlanOnlyPath: boolean,
): string {
  if (capabilityStatus === "hybrid-read-only" && mayUseRealPath) {
    return "Possible real read-only project inspection in hybrid mode, including explicit manifest-backed config, Gem, settings, origin, presentation, identity, and tag evidence; simulated fallback remains explicit.";
  }
  if (capabilityStatus === "plan-only" && mayUseRealPlanOnlyPath) {
    return "Possible real plan-only build.configure preflight in hybrid mode when dry_run=true; actual configure mutation is still not real.";
  }
  if (capabilityStatus === "plan-only") {
    return "This tool remains planning/preflight-only in the current phase; simulated fallback remains explicit.";
  }
  if (capabilityStatus === "mutation-gated") {
    return "This tool remains gated and non-real in the current phase.";
  }
  return "Simulated in the current phase.";
}

export function describeExecutionResult(
  result: Record<string, unknown>,
): string {
  const projectInspectResult = result as Partial<ProjectInspectResult>;
  const executionMode = typeof result.execution_mode === "string"
    ? result.execution_mode
    : "unknown";
  const simulated = typeof result.simulated === "boolean" ? result.simulated : null;
  const projectInspectTool = projectInspectResult.tool ?? null;
  const tool = typeof result.tool === "string" ? result.tool : null;

  if (executionMode === "real" && simulated === false && projectInspectTool === "project.inspect") {
    return "Real read-only project inspection path ran for project.inspect, and it may include explicit manifest-backed config, Gem, settings, origin, presentation, identity, and tag evidence.";
  }
  if (executionMode === "real" && simulated === false && tool === "build.configure") {
    return "Real plan-only build.configure preflight ran; no configure command was executed.";
  }
  if (executionMode === "real" && simulated === false && tool === "settings.patch") {
    const message = typeof result.message === "string" ? result.message : "";
    if (message.startsWith("Real settings.patch mutation completed")) {
      return "Real settings.patch mutation ran and wrote settings on the fully admitted path.";
    }
    if (message.includes("ready for mutation")) {
      return "Real settings.patch preflight validated a mutation-ready plan, but writes remained intentionally disabled.";
    }
    return "Real dry-run-only settings.patch preflight ran; no settings were written.";
  }
  if (executionMode === "simulated" && simulated === true && tool === "project.inspect") {
    return "project.inspect remained simulated for this run, including hybrid fallback cases.";
  }
  if (executionMode === "simulated" && simulated === true && tool === "build.configure") {
    return "build.configure remained on a simulated path for this run, including hybrid fallback from the plan-only preflight path.";
  }
  if (executionMode === "simulated" && simulated === true && tool === "settings.patch") {
    return "settings.patch remained on a simulated path for this run, including hybrid fallback from the dry-run-only preflight path.";
  }
  if (executionMode === "simulated" && simulated === true) {
    return "This dispatch remained on the simulated execution path.";
  }
  return `Execution mode reported as ${executionMode}.`;
}
