import type { DesktopShellTone } from "../../desktopShell/types";

export type CockpitId =
  | "home"
  | "create-game"
  | "create-movie"
  | "load-project"
  | "asset-forge"
  | "prompt"
  | "builder"
  | "operations"
  | "runtime"
  | "records";

export type CockpitCategory =
  | "start"
  | "create"
  | "build"
  | "operate"
  | "inspect"
  | "system";

export type CockpitUiActionId =
  | "open-prompt-studio"
  | "launch-inspect-template"
  | "launch-create-entity-template"
  | "launch-add-mesh-template"
  | "launch-camera-template"
  | "launch-placement-proof-template"
  | "open-asset-forge"
  | "open-runtime"
  | "open-records"
  | "open-settings"
  | "refresh-target-status";

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

export type CockpitCommand = {
  id: string;
  label: string;
  actionId?: CockpitUiActionId;
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

export type CockpitPromptDraftId =
  | "inspect-project"
  | "create-game-entity"
  | "add-allowlisted-mesh"
  | "inspect-cinematic-target"
  | "create-cinematic-camera-placeholder"
  | "cinematic-placement-proof-only"
  | "inspect-load-project"
  | "placement-proof-only";

export type CockpitPromptTemplate = {
  id: string;
  label: string;
  description: string;
  text: string;
  truthState: CockpitTruthState;
  safetyLabels: string[];
  autoExecute: false;
  draftId?: CockpitPromptDraftId;
  sourceSurfaceLabel?: string;
};

export type CockpitPanelDefinition = {
  id: string;
  title: string;
  zone: "top" | "left" | "center" | "right" | "bottom";
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

export type CockpitToolActionBinding = {
  cardId: string;
  actionId: CockpitUiActionId;
};

export type CockpitHomeCard = {
  title: string;
  description: string;
  truthState: CockpitTruthState;
  primaryActionLabel: string;
  safetyNote: string;
};

export type CockpitDefinition = {
  id: CockpitId;
  routeKey: CockpitId;
  category: CockpitCategory;
  title: string;
  navLabel: string;
  navSubtitle: string;
  workspaceSubtitle: string;
  description: string;
  truthState: CockpitTruthState;
  navTone: DesktopShellTone;
  navTooltip: string;
  showInHomeLauncher: boolean;
  homeCard: CockpitHomeCard;
  commandBar: CockpitCommand[];
  toolActionBindings: CockpitToolActionBinding[];
  pipeline: CockpitPipelineStage[];
  panels: CockpitPanelDefinition[];
  promptTemplates: CockpitPromptTemplate[];
  blockedCapabilities: CockpitBlockedCapability[];
};

export type CockpitNavSectionDefinition = {
  id: CockpitCategory;
  label: string;
  detail: string;
};
