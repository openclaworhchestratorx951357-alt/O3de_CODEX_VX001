import { beforeEach, describe, expect, it, vi } from "vitest";

import { SETTINGS_PROFILE_STORAGE_KEY } from "../../types/settings";
import { createSettingsProfile } from "./defaults";
import {
  exportSettingsProfile,
  importSettingsProfile,
  loadSettingsProfile,
  resetSettingsProfile,
  saveSettingsProfile,
} from "./storage";

describe("settings storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads defaults when no saved profile exists", () => {
    const profile = loadSettingsProfile(window.localStorage);

    expect(profile.version).toBe(1);
    expect(profile.settings.appearance.themeMode).toBe("system");
    expect(profile.settings.layout.preferredLandingSection).toBe("home");
    expect(profile.settings.layout.workspaceTreeDefaultMode).toBe("auto");
    expect(profile.settings.layout.guidedMode).toBe(true);
    expect(profile.settings.layout.guidedTourCompleted).toBe(false);
  });

  it("loads a saved profile from localStorage", () => {
    const savedProfile = createSettingsProfile({
      appearance: {
        themeMode: "dark",
        accentColor: "#1144aa",
        density: "compact",
        contentMaxWidth: "focused",
        cardRadius: "pillowed",
        reducedMotion: true,
        fontScale: 1.1,
      },
      layout: {
        preferredLandingSection: "runtime",
        workspaceTreeDefaultMode: "auto",
        showDesktopTelemetry: false,
        guidedMode: false,
        guidedTourCompleted: true,
      },
      operatorDefaults: {
        projectRoot: "C:/Users/topgu/O3DE/Projects/McpSandbox",
        engineRoot: "C:/src/o3de",
        dryRun: false,
        timeoutSeconds: 90,
        locks: ["editor_session", "project_config"],
      },
    }, "2026-04-21T12:00:00.000Z");

    window.localStorage.setItem(SETTINGS_PROFILE_STORAGE_KEY, JSON.stringify(savedProfile));

    const profile = loadSettingsProfile(window.localStorage);

    expect(profile.settings.appearance.themeMode).toBe("dark");
    expect(profile.settings.layout.preferredLandingSection).toBe("runtime");
    expect(profile.settings.layout.workspaceTreeDefaultMode).toBe("auto");
    expect(profile.settings.layout.guidedMode).toBe(false);
    expect(profile.settings.layout.guidedTourCompleted).toBe(true);
    expect(profile.settings.operatorDefaults.timeoutSeconds).toBe(90);
  });

  it("migrates older profile versions into the current schema", () => {
    window.localStorage.setItem(SETTINGS_PROFILE_STORAGE_KEY, JSON.stringify({
      version: 0,
      updatedAt: "2026-04-20T12:00:00.000Z",
      settings: {
        appearance: {
          themeMode: "dark",
        },
        layout: {
          preferredLandingSection: "records",
        },
      },
    }));

    const profile = loadSettingsProfile(window.localStorage);

    expect(profile.version).toBe(1);
    expect(profile.settings.appearance.themeMode).toBe("dark");
    expect(profile.settings.appearance.density).toBe("comfortable");
    expect(profile.settings.layout.preferredLandingSection).toBe("records");
    expect(profile.settings.layout.workspaceTreeDefaultMode).toBe("auto");
    expect(profile.settings.layout.guidedMode).toBe(true);
    expect(profile.settings.layout.guidedTourCompleted).toBe(false);
  });

  it("resets the saved profile to defaults", () => {
    saveSettingsProfile(createSettingsProfile({
      appearance: {
        themeMode: "dark",
        accentColor: "#1144aa",
        density: "compact",
        contentMaxWidth: "focused",
        cardRadius: "pillowed",
        reducedMotion: true,
        fontScale: 1.1,
      },
      layout: {
        preferredLandingSection: "runtime",
        workspaceTreeDefaultMode: "auto",
        showDesktopTelemetry: false,
        guidedMode: false,
        guidedTourCompleted: true,
      },
      operatorDefaults: {
        projectRoot: "custom-project",
        engineRoot: "custom-engine",
        dryRun: false,
        timeoutSeconds: 45,
        locks: ["editor_session"],
      },
    }), window.localStorage);

    const resetProfile = resetSettingsProfile(window.localStorage);

    expect(resetProfile.settings.appearance.themeMode).toBe("system");
    expect(loadSettingsProfile(window.localStorage).settings.operatorDefaults.projectRoot).toBe("");
  });

  it("falls back to defaults when localStorage is corrupted", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem(SETTINGS_PROFILE_STORAGE_KEY, "{not-json");

    const profile = loadSettingsProfile(window.localStorage);

    expect(profile.settings.appearance.themeMode).toBe("system");
    expect(profile.settings.operatorDefaults.locks).toEqual(["project_config"]);
  });

  it("exports and imports a validated settings profile", () => {
    const savedProfile = createSettingsProfile({
      appearance: {
        themeMode: "light",
        accentColor: "#8844ff",
        density: "comfortable",
        contentMaxWidth: "wide",
        cardRadius: "rounded",
        reducedMotion: false,
        fontScale: 1.05,
      },
      layout: {
        preferredLandingSection: "operations",
        workspaceTreeDefaultMode: "auto",
        showDesktopTelemetry: true,
        guidedMode: false,
        guidedTourCompleted: true,
      },
      operatorDefaults: {
        projectRoot: "C:/project",
        engineRoot: "C:/engine",
        dryRun: false,
        timeoutSeconds: 75,
        locks: ["project_config", "build_tree"],
      },
    });

    const exported = exportSettingsProfile(savedProfile);
    const imported = importSettingsProfile(exported);

    expect(imported.settings.appearance.accentColor).toBe("#8844ff");
    expect(imported.settings.layout.guidedMode).toBe(false);
    expect(imported.settings.layout.guidedTourCompleted).toBe(true);
    expect(imported.settings.operatorDefaults.locks).toEqual(["project_config", "build_tree"]);
  });
});
