import { useContext } from "react";

import { SettingsContext } from "./settingsContext";
import type { ThemeTokens } from "./theme";

export function useSettings() {
  return useContext(SettingsContext);
}

export function useThemeTokens(): ThemeTokens {
  return useContext(SettingsContext).themeTokens;
}
