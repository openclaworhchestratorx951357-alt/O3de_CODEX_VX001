import { describe, expect, it } from "vitest";

import {
  getAllCockpitLayoutDefaults,
  getCockpitLayoutDefaults,
} from "./cockpitLayoutDefaults";
import { getCockpitLayoutVersion } from "./cockpitLayoutTypes";

describe("cockpitLayoutDefaults", () => {
  it("provides default layout config for every first-class cockpit", () => {
    const defaults = getAllCockpitLayoutDefaults();
    const cockpitIds = [
      "home",
      "create-game",
      "create-movie",
      "load-project",
      "asset-forge",
      "prompt",
      "builder",
      "operations",
      "runtime",
      "records",
    ];

    for (const cockpitId of cockpitIds) {
      expect(defaults[cockpitId]).toBeDefined();
      expect(defaults[cockpitId].splitConstraints.centerMinWidth).toBeGreaterThan(500);
      expect(defaults[cockpitId].splitConstraints.centerMinWidth).toBeGreaterThan(defaults[cockpitId].splitConstraints.leftMinWidth);
      expect(defaults[cockpitId].splitConstraints.centerMinWidth).toBeGreaterThan(defaults[cockpitId].splitConstraints.rightMinWidth);
      const desktopMinWidth = defaults[cockpitId].splitConstraints.leftMinWidth
        + defaults[cockpitId].splitConstraints.centerMinWidth
        + defaults[cockpitId].splitConstraints.rightMinWidth;
      expect(desktopMinWidth).toBeLessThanOrEqual(1220);
      expect(defaults[cockpitId].splitConstraints.mainMinHeight).toBeGreaterThanOrEqual(320);
      expect(defaults[cockpitId].splitConstraints.bottomMinHeight).toBeGreaterThanOrEqual(180);
    }
  });

  it("uses Asset Forge studio preset for asset-forge", () => {
    const defaults = getCockpitLayoutDefaults("asset-forge");
    expect(defaults.presetId).toBe("asset-forge-studio");
  });

  it("uses cockpit-specific presets for major cockpit apps", () => {
    expect(getCockpitLayoutDefaults("home").presetId).toBe("home-launcher");
    expect(getCockpitLayoutDefaults("create-game").presetId).toBe("create-game-cockpit");
    expect(getCockpitLayoutDefaults("create-movie").presetId).toBe("create-movie-cockpit");
    expect(getCockpitLayoutDefaults("load-project").presetId).toBe("load-project-cockpit");
    expect(getCockpitLayoutDefaults("prompt").presetId).toBe("prompt-studio-cockpit");
    expect(getCockpitLayoutDefaults("builder").presetId).toBe("builder-cockpit");
    expect(getCockpitLayoutDefaults("operations").presetId).toBe("operations-cockpit");
    expect(getCockpitLayoutDefaults("runtime").presetId).toBe("runtime-cockpit");
    expect(getCockpitLayoutDefaults("records").presetId).toBe("records-cockpit");
  });

  it("keeps center-first split constraints for major cockpit apps", () => {
    const defaults = getCockpitLayoutDefaults("create-game");
    expect(defaults.splitConstraints.centerMinWidth).toBeGreaterThan(defaults.splitConstraints.leftMinWidth);
    expect(defaults.splitConstraints.centerMinWidth).toBeGreaterThan(defaults.splitConstraints.rightMinWidth);
  });

  it("bumps first-class cockpit layout versions so stale saved layouts normalize to the refreshed defaults", () => {
    const cockpitIds = [
      "home",
      "create-game",
      "create-movie",
      "load-project",
      "asset-forge",
      "prompt",
      "builder",
      "operations",
      "runtime",
      "records",
    ];

    for (const cockpitId of cockpitIds) {
      expect(getCockpitLayoutVersion(cockpitId)).toBe(8);
    }
  });

  it("falls back safely for unknown cockpit ids", () => {
    const defaults = getCockpitLayoutDefaults("future-cockpit");
    expect(defaults.presetId).toBe("app-os-cockpit");
    expect(defaults.splitConstraints.leftMinWidth).toBeGreaterThan(0);
  });
});
