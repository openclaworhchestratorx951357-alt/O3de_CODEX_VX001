import { describe, expect, it } from "vitest";

import {
  getAllCockpitDefinitions,
  getCockpitDefinition,
  getCockpitNavSections,
  getCockpitPromptTemplates,
  getCockpitRegistryValidationIssues,
  getCockpitsByCategory,
  getHomeLaunchCockpits,
  getRegisteredCockpitIds,
  isRegisteredCockpitId,
} from "./cockpitRegistry";

describe("cockpitRegistry", () => {
  it("registers unique cockpit ids", () => {
    const ids = getAllCockpitDefinitions().map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(getRegisteredCockpitIds()).size).toBe(ids.length);
  });

  it("reports registered cockpit ids for routing guards", () => {
    expect(isRegisteredCockpitId("home")).toBe(true);
    expect(isRegisteredCockpitId("asset-forge")).toBe(true);
    expect(isRegisteredCockpitId("not-a-real-cockpit")).toBe(false);
  });

  it("ensures required cockpit metadata fields exist", () => {
    for (const definition of getAllCockpitDefinitions()) {
      expect(definition.title.length).toBeGreaterThan(0);
      expect(definition.navLabel.length).toBeGreaterThan(0);
      expect(definition.routeKey.length).toBeGreaterThan(0);
      expect(definition.homeCard).toBeDefined();
    }
  });

  it("keeps all prompt templates non-auto-executing", () => {
    for (const definition of getAllCockpitDefinitions()) {
      for (const template of definition.promptTemplates) {
        expect(template.autoExecute).toBe(false);
      }
    }
  });

  it("keeps blocked capability entries explicit", () => {
    for (const definition of getAllCockpitDefinitions()) {
      for (const blocked of definition.blockedCapabilities) {
        expect(blocked.reason.length).toBeGreaterThan(0);
        expect(blocked.nextUnlock.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns create-game definition", () => {
    expect(getCockpitDefinition("create-game")?.title).toBe("Create Game");
  });

  it("declares command and tool action bindings for creator cockpit apps", () => {
    const createGame = getCockpitDefinition("create-game");
    const createMovie = getCockpitDefinition("create-movie");
    const loadProject = getCockpitDefinition("load-project");

    expect(createGame?.commandBar.map((command) => command.label)).toEqual(expect.arrayContaining([
      "Inspect Project",
      "Open Prompt Studio",
      "Open Asset Forge",
      "Open Runtime",
      "Open Records",
    ]));
    expect(createMovie?.commandBar.map((command) => command.label)).toEqual(expect.arrayContaining([
      "Inspect Cinematic Target",
      "Open Prompt Studio",
      "Open Asset Forge",
      "Open Runtime",
      "Open Records",
    ]));
    expect(loadProject?.commandBar.map((command) => command.label)).toEqual(expect.arrayContaining([
      "Inspect Project",
      "Refresh Target Status",
      "Open Prompt Studio",
      "Open Runtime",
      "Open Records",
      "Open Settings",
    ]));

    expect(createGame?.toolActionBindings.map((binding) => binding.cardId)).toEqual(expect.arrayContaining([
      "inspect-project",
      "create-safe-entity",
      "add-component",
    ]));
    expect(createMovie?.toolActionBindings.map((binding) => binding.cardId)).toEqual(expect.arrayContaining([
      "inspect-cinematic-target",
      "camera-placeholder",
      "placement-proof-only",
    ]));
    expect(loadProject?.toolActionBindings.map((binding) => binding.cardId)).toEqual(expect.arrayContaining([
      "inspect-project",
      "refresh-target",
      "open-settings",
    ]));
  });

  it("returns create category cockpits for the create section", () => {
    const ids = getCockpitsByCategory("create").map((cockpit) => cockpit.id);
    expect(ids).toEqual(expect.arrayContaining([
      "create-game",
      "create-movie",
      "load-project",
      "asset-forge",
    ]));
  });

  it("exposes all expected launcher cockpits on Home", () => {
    const launcherIds = getHomeLaunchCockpits().map((cockpit) => cockpit.id);
    expect(launcherIds).toEqual(expect.arrayContaining([
      "create-game",
      "create-movie",
      "load-project",
      "asset-forge",
      "prompt",
      "builder",
      "operations",
      "runtime",
      "records",
    ]));
  });

  it("provides nav sections with categorized items", () => {
    const sections = getCockpitNavSections();
    const sectionIds = sections.map((section) => section.id);
    expect(sectionIds).toEqual(expect.arrayContaining([
      "start",
      "create",
      "build",
      "operate",
      "inspect",
    ]));
    expect(sections.find((section) => section.id === "build")?.items.map((item) => item.id))
      .toEqual(expect.arrayContaining(["builder", "prompt"]));
  });

  it("passes registry validation checks", () => {
    expect(getCockpitRegistryValidationIssues()).toEqual([]);
  });

  it("returns prompt templates for known and unknown cockpit ids", () => {
    expect(getCockpitPromptTemplates("create-game").map((template) => template.id))
      .toEqual(expect.arrayContaining([
        "inspect-project",
        "create-safe-entity",
        "add-allowlisted-mesh",
      ]));
    expect(getCockpitPromptTemplates("create-movie").map((template) => template.id))
      .toEqual(expect.arrayContaining([
        "inspect-cinematic-target",
        "create-cinematic-camera-placeholder",
        "cinematic-placement-proof-only",
      ]));
    expect(getCockpitPromptTemplates("load-project").map((template) => template.id))
      .toEqual(expect.arrayContaining(["inspect-project-target"]));
    expect(getCockpitPromptTemplates("asset-forge").map((template) => template.id))
      .toEqual(expect.arrayContaining([
        "inspect-project",
        "placement-proof-only",
      ]));
    expect(getCockpitPromptTemplates("prompt")).toEqual([]);
  });
});
