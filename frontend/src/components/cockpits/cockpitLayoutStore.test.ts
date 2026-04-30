import { beforeEach, describe, expect, it } from "vitest";

import {
  clearCockpitLayoutState,
  createCockpitLayoutStateFromPreset,
  moveCockpitPanelToZone,
  readCockpitLayoutState,
  writeCockpitLayoutState,
} from "./cockpitLayoutStore";
import type { CockpitPanelDefinition } from "./cockpitLayoutTypes";

const STORAGE_KEY = "o3de.appos.cockpit-layouts.v1";

const panels: CockpitPanelDefinition[] = [
  {
    id: "panel-a",
    title: "Panel A",
    defaultZone: "left",
    priority: "tools",
    render: () => null,
  },
  {
    id: "panel-b",
    title: "Panel B",
    defaultZone: "center",
    priority: "primary",
    render: () => null,
  },
  {
    id: "panel-c",
    title: "Panel C",
    defaultZone: "right",
    priority: "status",
    render: () => null,
  },
];

const assetForgePanels: CockpitPanelDefinition[] = [
  {
    id: "asset-forge-command-strip",
    title: "Command strip",
    defaultZone: "top",
    render: () => null,
  },
  {
    id: "asset-forge-tools",
    title: "Tools",
    defaultZone: "left",
    render: () => null,
  },
  {
    id: "asset-forge-studio",
    title: "Studio",
    defaultZone: "center",
    render: () => null,
  },
  {
    id: "asset-forge-truth",
    title: "Truth",
    defaultZone: "right",
    render: () => null,
  },
  {
    id: "asset-forge-evidence",
    title: "Evidence",
    defaultZone: "bottom",
    render: () => null,
  },
];

describe("cockpitLayoutStore", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("scopes saved layout state per cockpit id", () => {
    const createGameLayout = createCockpitLayoutStateFromPreset("create-game", panels, "balanced");
    const createMovieLayout = createCockpitLayoutStateFromPreset("create-movie", panels, "focus");

    createGameLayout.collapsedPanelIds = ["panel-a"];
    createMovieLayout.collapsedPanelIds = ["panel-c"];
    createGameLayout.sizes.leftPrimaryRatio = 0.44;
    createMovieLayout.sizes.leftPrimaryRatio = 0.2;

    writeCockpitLayoutState(createGameLayout);
    writeCockpitLayoutState(createMovieLayout);

    const loadedCreateGame = readCockpitLayoutState("create-game", panels);
    const loadedCreateMovie = readCockpitLayoutState("create-movie", panels);

    expect(loadedCreateGame.collapsedPanelIds).toContain("panel-a");
    expect(loadedCreateGame.collapsedPanelIds).not.toContain("panel-c");
    expect(loadedCreateMovie.collapsedPanelIds).toContain("panel-c");
    expect(loadedCreateMovie.collapsedPanelIds).not.toContain("panel-a");
    expect(loadedCreateGame.sizes.leftPrimaryRatio).toBeCloseTo(0.44);
    expect(loadedCreateMovie.sizes.leftPrimaryRatio).toBeCloseTo(0.2);
  });

  it("clears one cockpit layout state without deleting other cockpits", () => {
    const createGameLayout = createCockpitLayoutStateFromPreset("create-game", panels, "balanced");
    const loadProjectLayout = createCockpitLayoutStateFromPreset("load-project", panels, "review");
    writeCockpitLayoutState(createGameLayout);
    writeCockpitLayoutState(loadProjectLayout);

    clearCockpitLayoutState("create-game");

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw ?? "{}") as Record<string, unknown>;
    expect(parsed["create-game"]).toBeUndefined();
    expect(parsed["load-project"]).toBeDefined();
  });

  it("reset path clears persisted moved layout for a cockpit", () => {
    const defaultLayout = createCockpitLayoutStateFromPreset("create-game", panels, "balanced");
    const movedLayout = moveCockpitPanelToZone(
      defaultLayout,
      "panel-a",
      "right",
      0,
      panels,
    );

    writeCockpitLayoutState(movedLayout);
    clearCockpitLayoutState("create-game");

    const reloaded = readCockpitLayoutState("create-game", panels);
    const freshDefault = createCockpitLayoutStateFromPreset("create-game", panels, "balanced");

    expect(reloaded.zones).toEqual(freshDefault.zones);
    expect(reloaded.collapsedPanelIds).toEqual([]);
  });

  it("uses the provided default preset when no saved layout exists", () => {
    const loaded = readCockpitLayoutState("asset-forge", assetForgePanels, "asset-forge-studio");

    expect(loaded.zones.top).toEqual(["asset-forge-command-strip"]);
    expect(loaded.zones.left).toEqual(["asset-forge-tools"]);
    expect(loaded.zones.center).toEqual(["asset-forge-studio"]);
    expect(loaded.zones.right).toEqual(["asset-forge-truth"]);
    expect(loaded.zones.bottom).toEqual(["asset-forge-evidence"]);
    expect(loaded.sizes.leftPrimaryRatio).toBeCloseTo(0.26);
    expect(loaded.sizes.centerPrimaryRatio).toBeCloseTo(0.79);
    expect(loaded.sizes.topPrimaryRatio).toBeCloseTo(0.84);
  });

  it("normalizes old asset-forge saved layout versions to the new default preset", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      "asset-forge": {
        cockpitId: "asset-forge",
        version: 1,
        zones: {
          top: [],
          left: ["asset-forge-studio"],
          center: ["asset-forge-tools"],
          right: ["asset-forge-truth"],
          bottom: ["asset-forge-command-strip", "asset-forge-evidence"],
        },
        sizes: {
          leftPrimaryRatio: 0.4,
          centerPrimaryRatio: 0.5,
          topPrimaryRatio: 0.5,
        },
        collapsedPanelIds: [],
        updatedAt: "2026-04-30T00:00:00.000Z",
      },
    }));

    const loaded = readCockpitLayoutState("asset-forge", assetForgePanels, "asset-forge-studio");

    expect(loaded.version).toBe(5);
    expect(loaded.zones.top).toEqual(["asset-forge-command-strip"]);
    expect(loaded.zones.left).toEqual(["asset-forge-tools"]);
    expect(loaded.zones.center).toEqual(["asset-forge-studio"]);
    expect(loaded.zones.right).toEqual(["asset-forge-truth"]);
    expect(loaded.zones.bottom).toEqual(["asset-forge-evidence"]);
  });

  it("normalizes old create-game saved layout versions back to the current default", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      "create-game": {
        cockpitId: "create-game",
        version: 1,
        zones: {
          top: [],
          left: ["panel-b"],
          center: ["panel-a"],
          right: ["panel-c"],
          bottom: [],
        },
        sizes: {
          leftPrimaryRatio: 0.45,
          centerPrimaryRatio: 0.55,
          topPrimaryRatio: 0.55,
        },
        collapsedPanelIds: [],
        updatedAt: "2026-04-30T00:00:00.000Z",
      },
    }));

    const loaded = readCockpitLayoutState("create-game", panels, "create-game-cockpit");

    expect(loaded.version).toBe(5);
    expect(loaded.zones.left).toContain("panel-a");
    expect(loaded.zones.center).toContain("panel-b");
    expect(loaded.zones.right).toContain("panel-c");
  });

  it("normalizes old runtime saved layout versions to the App OS cockpit default", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      "runtime": {
        cockpitId: "runtime",
        version: 1,
        zones: {
          top: [],
          left: ["panel-b"],
          center: ["panel-a"],
          right: ["panel-c"],
          bottom: [],
        },
        sizes: {
          leftPrimaryRatio: 0.45,
          centerPrimaryRatio: 0.55,
          topPrimaryRatio: 0.55,
        },
        collapsedPanelIds: [],
        updatedAt: "2026-04-30T00:00:00.000Z",
      },
    }));

    const loaded = readCockpitLayoutState("runtime", panels, "runtime-cockpit");

    expect(loaded.version).toBe(5);
    expect(loaded.zones.left).toContain("panel-a");
    expect(loaded.zones.center).toContain("panel-b");
    expect(loaded.zones.right).toContain("panel-c");
  });
});
