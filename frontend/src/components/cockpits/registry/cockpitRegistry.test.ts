import { describe, expect, it } from "vitest";

import {
  getAllCockpitDefinitions,
  getCockpitDefinition,
  getCockpitPromptTemplates,
  getCockpitsByCategory,
  getHomeLaunchCockpits,
  validateCockpitRegistry,
} from "./cockpitRegistry";

describe("cockpit registry", () => {
  it("keeps registered cockpit ids unique", () => {
    const definitions = getAllCockpitDefinitions();
    const ids = definitions.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires title/navLabel/routeKey/homeCard on all definitions", () => {
    for (const definition of getAllCockpitDefinitions()) {
      expect(definition.title).toBeTruthy();
      expect(definition.navLabel).toBeTruthy();
      expect(definition.routeKey).toBeTruthy();
      expect(definition.homeCard).toBeTruthy();
    }
  });

  it("keeps prompt templates non-autonomous", () => {
    const templates = getAllCockpitDefinitions().flatMap((definition) => definition.promptTemplates);
    expect(templates.length).toBeGreaterThan(0);
    templates.forEach((template) => {
      expect(template.autoExecute).toBe(false);
    });
  });

  it("requires blocked capabilities to include reason and next unlock", () => {
    const blockedCapabilities = getAllCockpitDefinitions().flatMap((definition) => definition.blockedCapabilities);
    expect(blockedCapabilities.length).toBeGreaterThan(0);
    blockedCapabilities.forEach((blocked) => {
      expect(blocked.reason).toBeTruthy();
      expect(blocked.nextUnlock).toBeTruthy();
    });
  });

  it("returns Create Game cockpit by id", () => {
    const createGame = getCockpitDefinition("create-game");
    expect(createGame?.title).toBe("Create Game");
  });

  it("returns create category cockpits including Create Game/Movie/Load Project/Asset Forge", () => {
    const createCockpitIds = getCockpitsByCategory("create").map((definition) => definition.id);
    expect(createCockpitIds).toEqual(expect.arrayContaining([
      "create-game",
      "create-movie",
      "load-project",
      "asset-forge",
    ]));
  });

  it("exposes home launch cockpits from registry", () => {
    const launchIds = getHomeLaunchCockpits().map((definition) => definition.id);
    expect(launchIds).toEqual(expect.arrayContaining([
      "create-game",
      "create-movie",
      "load-project",
      "asset-forge",
      "prompt",
      "builder",
      "runtime",
      "records",
      "operations",
    ]));
  });

  it("keeps Asset Forge layout mapped to left/center/right/bottom zones", () => {
    const assetForge = getCockpitDefinition("asset-forge");
    expect(assetForge).toBeDefined();
    const zones = new Set(assetForge?.panels.map((panel) => panel.zone));
    expect(zones.has("left")).toBe(true);
    expect(zones.has("center")).toBe(true);
    expect(zones.has("right")).toBe(true);
    expect(zones.has("bottom")).toBe(true);
  });

  it("keeps Asset Forge safety copy explicit and non-mutating", () => {
    const assetForge = getCockpitDefinition("asset-forge");
    const safetyText = [
      assetForge?.homeCard.safetyNote,
      ...(assetForge?.blockedCapabilities.map((item) => item.label) ?? []),
      ...(assetForge?.blockedCapabilities.map((item) => item.reason) ?? []),
    ].join(" ").toLowerCase();
    expect(safetyText).toContain("provider");
    expect(safetyText).toContain("blender");
    expect(safetyText).toContain("blocked");
    expect(safetyText).not.toContain("executed placement");
  });

  it("validates the full registry", () => {
    const validation = validateCockpitRegistry();
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("returns prompt templates by cockpit id", () => {
    const templates = getCockpitPromptTemplates("create-game");
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((template) => template.autoExecute === false)).toBe(true);
  });
});
