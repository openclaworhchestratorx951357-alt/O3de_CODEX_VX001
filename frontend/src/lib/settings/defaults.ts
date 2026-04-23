import type { AppSettings, SettingsProfile } from "../../types/settings";
import { SETTINGS_PROFILE_VERSION } from "../../types/settings";

export const DEFAULT_ACCENT_COLOR = "#2f6fed";

export function createDefaultSettings(): AppSettings {
  return {
    appearance: {
      themeMode: "system",
      accentColor: DEFAULT_ACCENT_COLOR,
      density: "comfortable",
      contentMaxWidth: "wide",
      cardRadius: "rounded",
      reducedMotion: false,
      fontScale: 1,
    },
    layout: {
      preferredLandingSection: "home",
      showDesktopTelemetry: true,
      guidedMode: true,
    },
    operatorDefaults: {
      projectRoot: "",
      engineRoot: "",
      dryRun: true,
      timeoutSeconds: 30,
      locks: ["project_config"],
    },
  };
}

export function createSettingsProfile(
  settings: AppSettings = createDefaultSettings(),
  updatedAt = new Date().toISOString(),
): SettingsProfile {
  return {
    version: SETTINGS_PROFILE_VERSION,
    updatedAt,
    settings,
  };
}
