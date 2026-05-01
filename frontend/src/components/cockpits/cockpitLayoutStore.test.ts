import { beforeEach, describe, expect, it } from "vitest";

import {
  clearCockpitLayoutState,
  createCockpitLayoutStateFromPreset,
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
});
