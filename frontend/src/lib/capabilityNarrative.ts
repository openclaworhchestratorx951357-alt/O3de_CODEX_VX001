export function describeCatalogCapability(
  toolName: string,
  capabilityStatus?: string,
): string {
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

  return null;
}
