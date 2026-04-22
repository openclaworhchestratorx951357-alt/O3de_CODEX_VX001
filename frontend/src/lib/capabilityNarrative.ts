export function describeCatalogCapability(
  toolName: string,
  capabilityStatus?: string,
): string {
  if (capabilityStatus === "real-authoring") {
    if (toolName === "editor.session.open") {
      return "Live-validated real authoring in hybrid mode through the admitted editor session runtime path on McpSandbox, with explicit preflight rejection if the editor runtime or PythonEditorBindings prerequisites are missing.";
    }
    if (toolName === "editor.level.open") {
      return "Live-validated real authoring in hybrid mode through the admitted level open/create runtime path on McpSandbox, with explicit preflight rejection if editor session or level prerequisites are missing.";
    }
    if (toolName === "editor.entity.create") {
      return "Live-validated real authoring in hybrid mode through the admitted bridge-backed root-level named entity creation path on McpSandbox, with explicit rejection of parent, prefab, and transform mutation fields.";
    }
  }
  if (capabilityStatus === "runtime-reaching" && toolName === "editor.entity.create") {
    return "Runtime-reaching in hybrid mode through the typed entity creation path, but not yet live-admitted on McpSandbox until the real editor/prefab behavior is stable.";
  }
  if (capabilityStatus === "hybrid-read-only" && toolName === "project.inspect") {
    return "Real read-only in hybrid mode when manifest preconditions are satisfied, with explicit manifest-backed config, Gem, settings, origin, presentation, identity, and tag evidence plus simulated fallback when the real path is unavailable.";
  }
  if (capabilityStatus === "plan-only" && toolName === "build.configure") {
    return "Real only as a plan-only preflight in hybrid mode when dry_run=true; no real configure mutation runs.";
  }
  if (capabilityStatus === "mutation-gated") {
    return "Still blocked from real mutation in the current phase.";
  }
  return "Still simulated in the current phase.";
}

export function describeBuildConfigureMeaning(): string {
  return "In hybrid mode, this surface may allow the real plan-only build.configure preflight path when dry_run=true. It does not imply a real configure mutation.";
}

export function describeSettingsPatchPolicyMeaning(): string {
  return "This surface stays tightly mutation-gated in the catalog, but the admitted hybrid boundary now includes a real preflight path and the first manifest-backed set-only mutation case with backup, rollback, and post-write verification evidence.";
}

export function describeTimelineMeaning(
  capabilityStatus: string | null,
  adapterMode: string | null,
  message: string,
): string | null {
  const normalizedMessage = message.toLowerCase();

  if (capabilityStatus === "plan-only") {
    if (adapterMode === "real" || normalizedMessage.includes("plan-only build.configure preflight")) {
      return "This event reflects the real plan-only build.configure preflight path, not a real configure mutation.";
    }
    return "This event reflects plan-only build.configure behavior; simulated fallback still remains possible in this phase.";
  }

  if (capabilityStatus === "hybrid-read-only") {
    return "This event reflects the first real read-only project.inspect path or its simulated fallback.";
  }
  if (capabilityStatus === "real-authoring") {
    return "This event reflects a live-validated admitted real editor path or a preflight-visible rejection.";
  }
  if (capabilityStatus === "runtime-reaching") {
    return "This event reflects an editor runtime path that reaches the live boundary but remains narrowed until stable on the target editor build.";
  }

  return null;
}
