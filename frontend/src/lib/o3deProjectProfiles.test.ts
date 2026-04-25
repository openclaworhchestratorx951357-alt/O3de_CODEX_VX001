import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createO3DEProjectProfile,
  getActiveO3DEProjectProfile,
  loadActiveO3DEProjectProfile,
  loadO3DEProjectProfilesStore,
  saveO3DEProjectProfilesStore,
  selectO3DEProjectProfile,
  upsertO3DEProjectProfile,
} from "./o3deProjectProfiles";
import { O3DE_PROJECT_PROFILES_STORAGE_KEY } from "../types/o3deProjectProfiles";

describe("O3DE project profile storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads the canonical McpSandbox target by default", () => {
    const store = loadO3DEProjectProfilesStore(window.localStorage);
    const activeProfile = getActiveO3DEProjectProfile(store);

    expect(store.version).toBe(1);
    expect(activeProfile.name).toBe("McpSandbox canonical target");
    expect(activeProfile.projectRoot).toBe("C:\\Users\\topgu\\O3DE\\Projects\\McpSandbox");
    expect(activeProfile.engineRoot).toBe("C:\\src\\o3de");
  });

  it("saves and reselects an operator project profile", () => {
    const initialStore = loadO3DEProjectProfilesStore(window.localStorage);
    const savedProfile = createO3DEProjectProfile({
      id: "profile-custom-game",
      name: "Custom Game",
      projectRoot: "D:\\O3DE\\Projects\\CustomGame",
      engineRoot: "D:\\o3de",
      editorRunner: "D:\\O3DE\\Projects\\CustomGame\\build\\windows\\bin\\profile\\Editor.exe",
    });

    const nextStore = saveO3DEProjectProfilesStore(
      selectO3DEProjectProfile(upsertO3DEProjectProfile(initialStore, savedProfile), savedProfile.id),
      window.localStorage,
    );
    const reloadedStore = loadO3DEProjectProfilesStore(window.localStorage);

    expect(getActiveO3DEProjectProfile(nextStore).name).toBe("Custom Game");
    expect(getActiveO3DEProjectProfile(reloadedStore).projectRoot).toBe("D:\\O3DE\\Projects\\CustomGame");
    expect(reloadedStore.profiles.some((profile) => profile.name === "McpSandbox canonical target")).toBe(true);
    expect(loadActiveO3DEProjectProfile(window.localStorage).name).toBe("Custom Game");
  });

  it("falls back to defaults when project profile storage is corrupted", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    window.localStorage.setItem(O3DE_PROJECT_PROFILES_STORAGE_KEY, "{not-json");

    const store = loadO3DEProjectProfilesStore(window.localStorage);

    expect(getActiveO3DEProjectProfile(store).id).toBe("mcp-sandbox-canonical");
  });
});
