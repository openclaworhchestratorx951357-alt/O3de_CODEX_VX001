export type CockpitWorkspaceId =
  | "create-game"
  | "create-movie"
  | "load-project"
  | "asset-forge";

export type CockpitShellMode =
  | "dockable-cockpit"
  | "full-screen-editor";

export type CockpitAppTone =
  | "neutral"
  | "info"
  | "success"
  | "warning";

export type CockpitAppRegistration = {
  workspaceId: CockpitWorkspaceId;
  navLabel: string;
  navSubtitle: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  launchTitle: string;
  detail: string;
  truthState: string;
  blocked: string;
  nextSafeAction: string;
  actionLabel: string;
  shellMode: CockpitShellMode;
  tone: CockpitAppTone;
  helpTooltip: string;
  executionAdmitted: false;
  mutationAdmitted: false;
  providerGenerationAdmitted: false;
  blenderExecutionAdmitted: false;
  assetProcessorExecutionAdmitted: false;
  placementWriteAdmitted: false;
};

export const cockpitAppRegistry = [
  {
    workspaceId: "create-game",
    navLabel: "Create Game",
    navSubtitle: "Open the Create Game cockpit environment",
    workspaceTitle: "Create Game",
    workspaceSubtitle:
      "Create Game Cockpit with staged mission workflow, bounded editor actions, and evidence review.",
    launchTitle: "Create Game Cockpit",
    detail: "Build a game through staged concept, level, entity, component, and review steps.",
    truthState: "mission cockpit / narrow admitted editor actions + read-only support",
    blocked: "Full game generation and broad mutation remain blocked.",
    nextSafeAction: "Open cockpit and start with inspect or a narrow admitted editor plan.",
    actionLabel: "Open Create Game",
    shellMode: "dockable-cockpit",
    tone: "success",
    helpTooltip:
      "Open the first-class Create Game cockpit with mission pipeline, tools, and blocked-capability guidance.",
    executionAdmitted: false,
    mutationAdmitted: false,
    providerGenerationAdmitted: false,
    blenderExecutionAdmitted: false,
    assetProcessorExecutionAdmitted: false,
    placementWriteAdmitted: false,
  },
  {
    workspaceId: "create-movie",
    navLabel: "Create Movie",
    navSubtitle: "Open the Create Movie cockpit environment",
    workspaceTitle: "Create Movie",
    workspaceSubtitle:
      "Create Movie Cockpit with cinematic planning, proof-only placement review, and explicit blockers.",
    launchTitle: "Create Movie Cockpit",
    detail: "Plan cinematic shots, camera placeholders, and proof-only prop placement review.",
    truthState: "planning + narrow editor actions + proof-only placement",
    blocked: "Render/export automation and placement writes remain blocked.",
    nextSafeAction: "Open cockpit and use proof-only templates before any future admission packet.",
    actionLabel: "Open Create Movie",
    shellMode: "dockable-cockpit",
    tone: "info",
    helpTooltip:
      "Open the first-class Create Movie cockpit for cinematic pipeline, proof-only placement, and review guidance.",
    executionAdmitted: false,
    mutationAdmitted: false,
    providerGenerationAdmitted: false,
    blenderExecutionAdmitted: false,
    assetProcessorExecutionAdmitted: false,
    placementWriteAdmitted: false,
  },
  {
    workspaceId: "load-project",
    navLabel: "Load Project",
    navSubtitle: "Open the Load Project cockpit environment",
    workspaceTitle: "Load Project",
    workspaceSubtitle: "Load Project Cockpit for read-only target verification and preflight readiness checks.",
    launchTitle: "Load Project Cockpit",
    detail: "Verify active target, bridge status, and readiness before authoring prompts.",
    truthState: "read-only / configuration preflight",
    blocked: "Project registration and project file writes are not admitted in this packet.",
    nextSafeAction: "Open cockpit and verify target checklist before continuing.",
    actionLabel: "Open Load Project",
    shellMode: "dockable-cockpit",
    tone: "neutral",
    helpTooltip: "Open the first-class Load Project cockpit for target verification and configuration preflight.",
    executionAdmitted: false,
    mutationAdmitted: false,
    providerGenerationAdmitted: false,
    blenderExecutionAdmitted: false,
    assetProcessorExecutionAdmitted: false,
    placementWriteAdmitted: false,
  },
  {
    workspaceId: "asset-forge",
    navLabel: "Asset Forge",
    navSubtitle: "Open the full-screen Blender-style Asset Forge editor",
    workspaceTitle: "Asset Forge",
    workspaceSubtitle:
      "Full-screen Blender-style Asset Forge editor with backend model data, read-only evidence, and gated proof workflows.",
    launchTitle: "Asset Forge",
    detail: "Inspect and plan production asset candidates in a full-screen Blender-style cockpit/editor surface.",
    truthState: "read-only / preflight-only / proof-only editor model",
    blocked: "Provider generation, Blender execution, Asset Processor execution, placement writes, and material mutation remain blocked.",
    nextSafeAction: "Open the editor, select tools or objects locally, and use prompt templates without auto-execution.",
    actionLabel: "Open Asset Forge",
    shellMode: "full-screen-editor",
    tone: "info",
    helpTooltip:
      "Open Asset Forge as its own full-screen production editor for backend-supported tool state, safety truth, and proof-only workflows.",
    executionAdmitted: false,
    mutationAdmitted: false,
    providerGenerationAdmitted: false,
    blenderExecutionAdmitted: false,
    assetProcessorExecutionAdmitted: false,
    placementWriteAdmitted: false,
  },
] as const satisfies readonly CockpitAppRegistration[];

export const cockpitWorkspaceIds = cockpitAppRegistry.map(
  (registration) => registration.workspaceId,
) as readonly CockpitWorkspaceId[];

export const cockpitAppRegistryByWorkspaceId = Object.fromEntries(
  cockpitAppRegistry.map((registration) => [registration.workspaceId, registration]),
) as Record<CockpitWorkspaceId, CockpitAppRegistration>;

export function isCockpitWorkspaceId(value: unknown): value is CockpitWorkspaceId {
  return typeof value === "string" && cockpitWorkspaceIds.includes(value as CockpitWorkspaceId);
}

export function getCockpitAppRegistration(workspaceId: CockpitWorkspaceId): CockpitAppRegistration {
  return cockpitAppRegistryByWorkspaceId[workspaceId];
}
