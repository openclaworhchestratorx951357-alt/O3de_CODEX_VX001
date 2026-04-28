export type AssetForgeTruthState =
  | "demo"
  | "plan-only"
  | "preflight-only"
  | "gated-real"
  | "blocked";

export type AssetForgeHeaderLane =
  | "Provider"
  | "Blender"
  | "O3DE ingest"
  | "Placement"
  | "Review";

export interface AssetForgeStatusLane {
  lane: AssetForgeHeaderLane;
  truth: AssetForgeTruthState;
  detail: string;
}

export interface AssetForgeGenerationAction {
  id: string;
  label: string;
  truth: AssetForgeTruthState;
  blockedReason: string;
}

export interface AssetForgeGenerationWorkspace {
  prompt: string;
  references: string[];
  stylePreset: string;
  polyBudget: string;
  materialPlan: string;
  actions: AssetForgeGenerationAction[];
}

export interface AssetForgeCandidateCard {
  id: string;
  name: string;
  status: AssetForgeTruthState;
  previewNotes: string;
  readinessPlaceholder: string;
  trisEstimate: string;
}

export interface AssetForgeBlenderPrepState {
  blenderStatus: AssetForgeTruthState;
  executable: string;
  version: string;
  checks: string[];
}

export interface AssetForgeO3DEIngestState {
  ingestStatus: AssetForgeTruthState;
  stagePlan: string[];
  reviewWarnings: string[];
}

export interface AssetForgeTimelineEvent {
  id: string;
  timeLabel: string;
  title: string;
  truth: AssetForgeTruthState;
  detail: string;
}

export interface AssetForgeSettingsStatusState {
  providerConfig: string;
  defaultOutputWorkspace: string;
  allowedFormats: string[];
  safetyGuards: string[];
}

export interface AssetForgeStudioDemoState {
  title: string;
  subtitle: string;
  lanes: AssetForgeStatusLane[];
  generationWorkspace: AssetForgeGenerationWorkspace;
  candidates: AssetForgeCandidateCard[];
  blenderPrep: AssetForgeBlenderPrepState;
  o3deIngest: AssetForgeO3DEIngestState;
  evidenceTimeline: AssetForgeTimelineEvent[];
  settingsStatus: AssetForgeSettingsStatusState;
}
