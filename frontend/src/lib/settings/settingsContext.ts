import { createContext } from "react";

import { SETTINGS_PROFILE_STORAGE_KEY } from "../../types/settings";
import type { AppSettings, SettingsProfile } from "../../types/settings";
import { createDefaultSettings, createSettingsProfile } from "./defaults";
import { buildThemeTokens, type ThemeTokens } from "./theme";

export type SettingsContextValue = {
  profile: SettingsProfile;
  settings: AppSettings;
  themeTokens: ThemeTokens;
  storageKey: string;
  saveSettings: (settings: AppSettings) => SettingsProfile;
  resetSettings: () => SettingsProfile;
};

const defaultProfile = createSettingsProfile(createDefaultSettings());
const defaultThemeTokens = buildThemeTokens(defaultProfile.settings, false);

const defaultContextValue: SettingsContextValue = {
  profile: defaultProfile,
  settings: defaultProfile.settings,
  themeTokens: defaultThemeTokens,
  storageKey: SETTINGS_PROFILE_STORAGE_KEY,
  saveSettings: () => defaultProfile,
  resetSettings: () => defaultProfile,
};

export const SettingsContext = createContext<SettingsContextValue>(defaultContextValue);
