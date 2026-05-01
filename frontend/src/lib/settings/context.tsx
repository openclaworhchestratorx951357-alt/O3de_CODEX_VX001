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
        <style>{globalControlStyles}</style>
        {children}
      </div>
    </SettingsContext.Provider>
  );
}

const globalControlStyles = `
[data-app-theme-root="true"] input:not([type="checkbox"]):not([type="radio"]):not([type="color"]),
[data-app-theme-root="true"] select,
[data-app-theme-root="true"] textarea {
  color-scheme: var(--app-color-scheme);
  transition: var(--app-transition);
}

[data-app-theme-root="true"] input::placeholder,
[data-app-theme-root="true"] textarea::placeholder {
  color: var(--app-input-placeholder);
  opacity: 1;
}

[data-app-theme-root="true"] input:focus-visible:not([type="checkbox"]):not([type="radio"]):not([type="color"]),
[data-app-theme-root="true"] select:focus-visible,
[data-app-theme-root="true"] textarea:focus-visible {
  border-color: var(--app-accent) !important;
  box-shadow: var(--app-input-focus-ring) !important;
  outline: 2px solid transparent !important;
}

[data-app-theme-root="true"] input:disabled:not([type="checkbox"]):not([type="radio"]):not([type="color"]),
[data-app-theme-root="true"] select:disabled,
[data-app-theme-root="true"] textarea:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

[data-app-theme-root="true"] * {
  scrollbar-color: var(--app-scrollbar-thumb) var(--app-scrollbar-track);
  scrollbar-width: thin;
}

[data-app-theme-root="true"] ::-webkit-scrollbar {
  width: var(--app-scrollbar-size);
  height: var(--app-scrollbar-size);
}

[data-app-theme-root="true"] ::-webkit-scrollbar-track {
  background: var(--app-scrollbar-track);
  border-radius: 999px;
}

[data-app-theme-root="true"] ::-webkit-scrollbar-thumb {
  background: var(--app-scrollbar-thumb);
  border-radius: 999px;
  border: 2px solid var(--app-scrollbar-track);
}

[data-app-theme-root="true"] ::-webkit-scrollbar-thumb:hover {
  background: var(--app-scrollbar-thumb-hover);
}
`;
