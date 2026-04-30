import type { LockName } from "../../types/contracts";
import type {
  AppSettings,
  AppearanceSettings,
  CardRadiusMode,
  ContentMaxWidth,
  DensityMode,
  LandingSection,
  LayoutSettings,
  OperatorDefaultsSettings,
  SettingsProfile,
  ThemeMode,
  WorkspaceTreeDefaultMode,
} from "../../types/settings";
import {
  CARD_RADIUS_VALUES,
  CONTENT_MAX_WIDTH_VALUES,
  DENSITY_VALUES,
  LANDING_SECTION_VALUES,
  LOCK_NAME_VALUES,
  SETTINGS_PROFILE_VERSION,
  THEME_MODE_VALUES,
  WORKSPACE_TREE_DEFAULT_MODE_VALUES,
} from "../../types/settings";
import { createDefaultSettings, createSettingsProfile } from "./defaults";

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOneOf<T extends string>(value: unknown, allowedValues: readonly T[]): value is T {
  return typeof value === "string" && allowedValues.includes(value as T);
}

function sanitizeThemeMode(value: unknown): ThemeMode {
  return isOneOf(value, THEME_MODE_VALUES) ? value : createDefaultSettings().appearance.themeMode;
}

function sanitizeDensity(value: unknown): DensityMode {
  return isOneOf(value, DENSITY_VALUES) ? value : createDefaultSettings().appearance.density;
}

function sanitizeContentMaxWidth(value: unknown): ContentMaxWidth {
  return isOneOf(value, CONTENT_MAX_WIDTH_VALUES)
    ? value
    : createDefaultSettings().appearance.contentMaxWidth;
}

function sanitizeCardRadius(value: unknown): CardRadiusMode {
  return isOneOf(value, CARD_RADIUS_VALUES) ? value : createDefaultSettings().appearance.cardRadius;
}

function sanitizeLandingSection(value: unknown): LandingSection {
  return isOneOf(value, LANDING_SECTION_VALUES)
    ? value
    : createDefaultSettings().layout.preferredLandingSection;
}

function sanitizeWorkspaceTreeDefaultMode(value: unknown): WorkspaceTreeDefaultMode {
  return isOneOf(value, WORKSPACE_TREE_DEFAULT_MODE_VALUES)
    ? value
    : createDefaultSettings().layout.workspaceTreeDefaultMode;
}

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function sanitizeIsoTimestamp(value: unknown): string {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return value;
  }

  return new Date().toISOString();
}

function sanitizeFontScale(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return createDefaultSettings().appearance.fontScale;
  }

  return Math.min(1.2, Math.max(0.9, Math.round(value * 100) / 100));
}

function sanitizeTimeoutSeconds(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return createDefaultSettings().operatorDefaults.timeoutSeconds;
  }

  return Math.min(600, Math.max(1, Math.round(value)));
}

function sanitizeAccentColor(value: unknown): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : createDefaultSettings().appearance.accentColor;
}

function sanitizeLocks(value: unknown): LockName[] {
  if (!Array.isArray(value)) {
    return [...createDefaultSettings().operatorDefaults.locks];
  }

  const lockSet = new Set<LockName>();
  value.forEach((item) => {
    if (isOneOf(item, LOCK_NAME_VALUES)) {
      lockSet.add(item);
    }
  });

  return lockSet.size > 0
    ? [...lockSet]
    : [...createDefaultSettings().operatorDefaults.locks];
}

export function normalizeSettings(input?: DeepPartial<AppSettings> | null): AppSettings {
  const defaults = createDefaultSettings();
  const appearanceInput = isRecord(input?.appearance) ? input.appearance : {};
  const layoutInput = isRecord(input?.layout) ? input.layout : {};
  const operatorDefaultsInput = isRecord(input?.operatorDefaults) ? input.operatorDefaults : {};

  const appearance: AppearanceSettings = {
    themeMode: sanitizeThemeMode(appearanceInput.themeMode),
    accentColor: sanitizeAccentColor(appearanceInput.accentColor),
    density: sanitizeDensity(appearanceInput.density),
    contentMaxWidth: sanitizeContentMaxWidth(appearanceInput.contentMaxWidth),
    cardRadius: sanitizeCardRadius(appearanceInput.cardRadius),
    reducedMotion: sanitizeBoolean(appearanceInput.reducedMotion, defaults.appearance.reducedMotion),
    fontScale: sanitizeFontScale(appearanceInput.fontScale),
  };

  const layout: LayoutSettings = {
    preferredLandingSection: sanitizeLandingSection(layoutInput.preferredLandingSection),
    workspaceTreeDefaultMode: sanitizeWorkspaceTreeDefaultMode(layoutInput.workspaceTreeDefaultMode),
    showDesktopTelemetry: sanitizeBoolean(
      layoutInput.showDesktopTelemetry,
      defaults.layout.showDesktopTelemetry,
    ),
    guidedMode: sanitizeBoolean(layoutInput.guidedMode, defaults.layout.guidedMode),
    guidedTourCompleted: sanitizeBoolean(
      layoutInput.guidedTourCompleted,
      defaults.layout.guidedTourCompleted,
    ),
  };

  const operatorDefaults: OperatorDefaultsSettings = {
    projectRoot: sanitizeString(operatorDefaultsInput.projectRoot),
    engineRoot: sanitizeString(operatorDefaultsInput.engineRoot),
    dryRun: sanitizeBoolean(operatorDefaultsInput.dryRun, defaults.operatorDefaults.dryRun),
    timeoutSeconds: sanitizeTimeoutSeconds(operatorDefaultsInput.timeoutSeconds),
    locks: sanitizeLocks(operatorDefaultsInput.locks),
  };

  return {
    appearance,
    layout,
    operatorDefaults,
  };
}

export function areSettingsEqual(left: AppSettings, right: AppSettings): boolean {
  return JSON.stringify(normalizeSettings(left)) === JSON.stringify(normalizeSettings(right));
}

export function migrateSettingsProfile(rawProfile: unknown): SettingsProfile {
  if (!isRecord(rawProfile)) {
    return createSettingsProfile(createDefaultSettings());
  }

  const version = typeof rawProfile.version === "number" ? rawProfile.version : 0;
  const updatedAt = sanitizeIsoTimestamp(rawProfile.updatedAt);

  if (version >= SETTINGS_PROFILE_VERSION) {
    const settings = normalizeSettings(isRecord(rawProfile.settings) ? rawProfile.settings : undefined);
    return createSettingsProfile(settings, updatedAt);
  }

  if (version === 0) {
    const settingsSource = isRecord(rawProfile.settings) ? rawProfile.settings : rawProfile;
    const settings = normalizeSettings(settingsSource as DeepPartial<AppSettings>);
    return createSettingsProfile(settings, updatedAt);
  }

  return createSettingsProfile(createDefaultSettings(), updatedAt);
}
