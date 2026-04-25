import type { AppSettings, SettingsProfile } from "../../types/settings";
import { SETTINGS_PROFILE_STORAGE_KEY } from "../../types/settings";
import { createDefaultSettings, createSettingsProfile } from "./defaults";
import { migrateSettingsProfile, normalizeSettings } from "./migrations";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn("Settings profile storage is unavailable.", error);
    return null;
  }
}

export function loadSettingsProfile(storage: StorageLike | null = getStorage()): SettingsProfile {
  if (!storage) {
    return createSettingsProfile(createDefaultSettings());
  }

  try {
    const rawValue = storage.getItem(SETTINGS_PROFILE_STORAGE_KEY);
    if (!rawValue) {
      return createSettingsProfile(createDefaultSettings());
    }

    return migrateSettingsProfile(JSON.parse(rawValue));
  } catch (error) {
    console.warn("Failed to load settings profile. Falling back to defaults.", error);
    return createSettingsProfile(createDefaultSettings());
  }
}

export function saveSettingsProfile(
  profile: SettingsProfile | AppSettings,
  storage: StorageLike | null = getStorage(),
): SettingsProfile {
  const nextProfile = "settings" in profile
    ? migrateSettingsProfile(profile)
    : createSettingsProfile(normalizeSettings(profile));

  if (!storage) {
    return nextProfile;
  }

  try {
    storage.setItem(SETTINGS_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
  } catch (error) {
    console.warn("Failed to save settings profile.", error);
  }

  return nextProfile;
}

export function resetSettingsProfile(storage: StorageLike | null = getStorage()): SettingsProfile {
  const defaultProfile = createSettingsProfile(createDefaultSettings());
  if (!storage) {
    return defaultProfile;
  }

  try {
    storage.setItem(SETTINGS_PROFILE_STORAGE_KEY, JSON.stringify(defaultProfile));
  } catch (error) {
    console.warn("Failed to reset settings profile.", error);
  }

  return defaultProfile;
}

export function exportSettingsProfile(profile: SettingsProfile): string {
  return JSON.stringify(migrateSettingsProfile(profile), null, 2);
}

export function importSettingsProfile(rawProfile: string): SettingsProfile {
  return migrateSettingsProfile(JSON.parse(rawProfile));
}

export { migrateSettingsProfile } from "./migrations";
