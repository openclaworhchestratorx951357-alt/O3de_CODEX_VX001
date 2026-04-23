import type { LockName } from "./contracts";

export const SETTINGS_PROFILE_VERSION = 1 as const;
export const SETTINGS_PROFILE_STORAGE_KEY = "o3de_codex_vx001_settings_profile_v1";

export const THEME_MODE_VALUES = ["light", "dark", "system"] as const;
export const DENSITY_VALUES = ["comfortable", "compact"] as const;
export const CONTENT_MAX_WIDTH_VALUES = ["focused", "wide", "full"] as const;
export const CARD_RADIUS_VALUES = ["soft", "rounded", "pillowed"] as const;
export const LANDING_SECTION_VALUES = [
  "home",
  "prompt",
  "builder",
  "operations",
  "runtime",
  "records",
] as const;
export const LOCK_NAME_VALUES = [
  "editor_session",
  "project_config",
  "asset_pipeline",
  "render_pipeline",
  "build_tree",
  "engine_source",
  "test_runtime",
] as const satisfies readonly LockName[];

export type ThemeMode = (typeof THEME_MODE_VALUES)[number];
export type DensityMode = (typeof DENSITY_VALUES)[number];
export type ContentMaxWidth = (typeof CONTENT_MAX_WIDTH_VALUES)[number];
export type CardRadiusMode = (typeof CARD_RADIUS_VALUES)[number];
export type LandingSection = (typeof LANDING_SECTION_VALUES)[number];

export type AppearanceSettings = {
  themeMode: ThemeMode;
  accentColor: string;
  density: DensityMode;
  contentMaxWidth: ContentMaxWidth;
  cardRadius: CardRadiusMode;
  reducedMotion: boolean;
  fontScale: number;
};

export type LayoutSettings = {
  preferredLandingSection: LandingSection;
  showDesktopTelemetry: boolean;
  guidedMode: boolean;
  guidedTourCompleted: boolean;
};

export type OperatorDefaultsSettings = {
  projectRoot: string;
  engineRoot: string;
  dryRun: boolean;
  timeoutSeconds: number;
  locks: LockName[];
};

export type AppSettings = {
  appearance: AppearanceSettings;
  layout: LayoutSettings;
  operatorDefaults: OperatorDefaultsSettings;
};

export type SettingsProfile = {
  version: typeof SETTINGS_PROFILE_VERSION;
  updatedAt: string;
  settings: AppSettings;
};
