import { describe, expect, it } from "vitest";

import {
  getAllCockpitDefinitions,
  getCockpitDefinition,
  getCockpitNavSections,
  getCockpitPromptTemplates,
  getCockpitRegistryValidationIssues,
  getCockpitsByCategory,
  getHomeLaunchCockpits,
} from "./cockpitRegistry";

describe("cockpitRegistry", () => {
  it("registers unique cockpit ids", () => {
    const ids = getAllCockpitDefinitions().map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
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
    expect(getCockpitPromptTemplates("create-game")).toEqual([]);
    expect(getCockpitPromptTemplates("prompt")).toEqual([]);
  });
});
