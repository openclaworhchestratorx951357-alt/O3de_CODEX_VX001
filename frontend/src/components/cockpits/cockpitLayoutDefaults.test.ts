import { describe, expect, it } from "vitest";

import {
  getAllCockpitLayoutDefaults,
  getCockpitLayoutDefaults,
} from "./cockpitLayoutDefaults";

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
    }
  });

  it("uses Asset Forge studio preset for asset-forge", () => {
    const defaults = getCockpitLayoutDefaults("asset-forge");
    expect(defaults.presetId).toBe("asset-forge-studio");
  });

  it("uses App OS cockpit preset for create-game", () => {
    const defaults = getCockpitLayoutDefaults("create-game");
    expect(defaults.presetId).toBe("app-os-cockpit");
  });

  it("falls back safely for unknown cockpit ids", () => {
    const defaults = getCockpitLayoutDefaults("future-cockpit");
    expect(defaults.presetId).toBe("app-os-cockpit");
    expect(defaults.splitConstraints.leftMinWidth).toBeGreaterThan(0);
  });
});
