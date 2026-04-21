import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { SETTINGS_PROFILE_STORAGE_KEY } from "../../types/settings";
import type { AppSettings, SettingsProfile } from "../../types/settings";
import { createSettingsProfile } from "./defaults";
import { normalizeSettings } from "./migrations";
import { SettingsContext, type SettingsContextValue } from "./settingsContext";
import { loadSettingsProfile, resetSettingsProfile, saveSettingsProfile } from "./storage";
import { buildThemeTokens } from "./theme";

function getSystemDarkPreference(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

type SettingsProviderProps = {
  children: ReactNode;
};

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [profile, setProfile] = useState<SettingsProfile>(() => loadSettingsProfile());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => getSystemDarkPreference());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const themeTokens = useMemo(
    () => buildThemeTokens(profile.settings, systemPrefersDark),
    [profile.settings, systemPrefersDark],
  );

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.style.colorScheme = themeTokens.resolvedThemeMode;
  }, [themeTokens.resolvedThemeMode]);

  const contextValue = useMemo<SettingsContextValue>(() => ({
    profile,
    settings: profile.settings,
    themeTokens,
    storageKey: SETTINGS_PROFILE_STORAGE_KEY,
    saveSettings: (settings: AppSettings) => {
      const nextProfile = saveSettingsProfile(createSettingsProfile(normalizeSettings(settings)));
      setProfile(nextProfile);
      return nextProfile;
    },
    resetSettings: () => {
      const nextProfile = resetSettingsProfile();
      setProfile(nextProfile);
      return nextProfile;
    },
  }), [profile, themeTokens]);

  const providerStyle: CSSProperties = {
    minHeight: "100vh",
    color: "var(--app-text-color)",
    background: "var(--app-page-bg)",
    fontSize: "calc(16px * var(--app-font-scale))",
    transition: "var(--app-transition)",
    ...themeTokens.cssVariables,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      <div data-app-theme-root="true" style={providerStyle}>
        {children}
      </div>
    </SettingsContext.Provider>
  );
}
