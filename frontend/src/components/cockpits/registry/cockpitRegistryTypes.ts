export const KNOWN_COCKPIT_IDS = [
  "home",
  "create-game",
  "create-movie",
  "load-project",
  "asset-forge",
  "prompt",
  "builder",
  "operations",
  "runtime",
  "records",
] as const;

export type KnownCockpitId = typeof KNOWN_COCKPIT_IDS[number];
export type CockpitId = KnownCockpitId | (string & {});

export type CockpitZoneId = "top" | "left" | "center" | "right" | "bottom";

export type CockpitTruthState =
  | "read-only"
  | "plan-only"
  | "preflight-only"
  | "proof-only"
  | "fail-closed"
  | "admitted-real"
  | "gated-real"
  | "blocked"
  | "unknown"
  | "demo";

export type CockpitCategory = "start" | "create" | "operate" | "inspect" | "build" | "system";

export type CockpitCommand = {
  id: string;
  label: string;
  description?: string;
  targetWorkspaceId?: CockpitId;
  truthState: CockpitTruthState;
  disabled?: boolean;
  blockedReason?: string;
  nextUnlock?: string;
  promptTemplateId?: string;
};

export type CockpitPipelineStage = {
  id: string;
  label: string;
  description: string;
  truthState: CockpitTruthState;
  blocker?: string;
  nextAction?: string;
};

export type CockpitPromptTemplate = {
  id: string;
  label: string;
  description: string;
  text: string;
  truthState: CockpitTruthState;
  safetyLabels: string[];
  autoExecute: false;
};

export type CockpitPanelBlueprint = {
  id: string;
  title: string;
  subtitle?: string;
  zone: CockpitZoneId;
  truthState?: CockpitTruthState;
  priority?: "primary" | "secondary" | "tools" | "inspector" | "evidence" | "status";
  collapsible?: boolean;
  draggable?: boolean;
  locked?: boolean;
  allowedZones?: CockpitZoneId[];
  minWidth?: number;
  minHeight?: number;
  scrollMode?: "panel" | "content" | "none";
  contentType:
    | "pipeline"
    | "tool-cards"
    | "viewport"
    | "inspector"
    | "truth-rail"
    | "prompt-templates"
    | "evidence"
    | "blocked-capabilities"
    | "custom";
};

export type CockpitBlockedCapability = {
  id: string;
  label: string;
  reason: string;
  nextUnlock: string;
};

export type CockpitDefinition = {
  id: CockpitId;
  title: string;
  navLabel: string;
  navSubtitle: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  subtitle: string;
  category: CockpitCategory;
  description: string;
  truthState: CockpitTruthState;
  icon?: string;
  routeKey: string;
  homeCard: {
    title: string;
    description: string;
    truthState: CockpitTruthState;
    primaryActionLabel: string;
    safetyNote: string;
  };
  commandBar: CockpitCommand[];
  pipeline: CockpitPipelineStage[];
  panels: CockpitPanelBlueprint[];
  promptTemplates: CockpitPromptTemplate[];
  blockedCapabilities: CockpitBlockedCapability[];
};

export type CockpitNavSection = {
  id: CockpitCategory;
  label: string;
  detail: string;
  cockpitIds: CockpitId[];
};

export type CockpitDefinitionValidation = {
  valid: boolean;
  errors: string[];
};
