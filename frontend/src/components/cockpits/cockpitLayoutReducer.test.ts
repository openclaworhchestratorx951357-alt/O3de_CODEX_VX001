import { describe, expect, it } from "vitest";

import {
  createDefaultCockpitLayout,
  movePanelToZone,
  normalizeCockpitLayout,
  reorderPanel,
} from "./cockpitLayoutReducer";
import type { CockpitLayoutState, CockpitPanelDefinition } from "./cockpitLayoutTypes";

const panels: CockpitPanelDefinition[] = [
  {
    id: "panel-a",
    title: "Panel A",
    defaultZone: "left",
    render: () => null,
  },
  {
    id: "panel-b",
    title: "Panel B",
    defaultZone: "left",
    render: () => null,
  },
  {
    id: "panel-c",
    title: "Panel C",
    defaultZone: "center",
    render: () => null,
  },
  {
    id: "panel-d",
    title: "Panel D",
    defaultZone: "right",
    render: () => null,
  },
];

function createLayout(cockpitId = "create-game"): CockpitLayoutState {
  return createDefaultCockpitLayout(cockpitId, panels, "balanced");
}

describe("cockpitLayoutReducer", () => {
  it("movePanelToZone moves a panel from one zone to another", () => {
    const layout = createLayout();

    const moved = movePanelToZone(layout, "panel-a", "right", undefined, panels);

    expect(moved.zones.left).toEqual(["panel-b"]);
    expect(moved.zones.right).toEqual(["panel-d", "panel-a"]);
  });

  it("reorderPanel reorders a panel within the same zone", () => {
    const layout = createLayout();

    const reordered = reorderPanel(layout, "panel-b", "left", 0, panels);

    expect(reordered.zones.left).toEqual(["panel-b", "panel-a"]);
  });

  it("movePanelToZone can move a panel into an empty zone", () => {
    const layout = createLayout();

    const moved = movePanelToZone(layout, "panel-a", "top", 0, panels);

    expect(moved.zones.top).toEqual(["panel-a"]);
    expect(moved.zones.left).toEqual(["panel-b"]);
  });

  it("normalizeCockpitLayout removes unknown panel ids safely", () => {
    const savedLayout = {
      cockpitId: "create-game",
      version: 99,
      zones: {
        top: ["ghost-top"],
        left: ["panel-a", "ghost-left", "panel-a"],
        center: [],
        right: ["panel-d", "ghost-right"],
        bottom: ["ghost-bottom"],
      },
      sizes: {
        leftPrimaryRatio: 0.4,
        centerPrimaryRatio: 0.6,
        topPrimaryRatio: 0.8,
      },
      collapsedPanelIds: [],
      updatedAt: "2026-04-30T00:00:00.000Z",
    };

    const normalized = normalizeCockpitLayout(savedLayout, panels, "create-game");
    const allIds = Object.values(normalized.zones).flat();

    expect(allIds).toContain("panel-a");
    expect(allIds).toContain("panel-b");
    expect(allIds).toContain("panel-c");
    expect(allIds).toContain("panel-d");
    expect(allIds).not.toContain("ghost-top");
    expect(allIds).not.toContain("ghost-left");
    expect(allIds).not.toContain("ghost-right");
    expect(allIds).not.toContain("ghost-bottom");
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("normalizeCockpitLayout adds missing new panels back to their default zones", () => {
    const savedLayout = {
      cockpitId: "create-game",
      version: 1,
      zones: {
        top: [],
        left: ["panel-a"],
        center: [],
        right: [],
        bottom: [],
      },
      sizes: {
        leftPrimaryRatio: 0.4,
        centerPrimaryRatio: 0.6,
        topPrimaryRatio: 0.8,
      },
      collapsedPanelIds: [],
      updatedAt: "2026-04-30T00:00:00.000Z",
    };

    const normalized = normalizeCockpitLayout(savedLayout, panels, "create-game");

    expect(normalized.zones.left).toContain("panel-a");
    expect(normalized.zones.left).toContain("panel-b");
    expect(normalized.zones.center).toContain("panel-c");
    expect(normalized.zones.right).toContain("panel-d");
  });

  it("keeps collapsed panel ids after moving a collapsed panel", () => {
    const base = createLayout();
    const layout: CockpitLayoutState = {
      ...base,
      collapsedPanelIds: ["panel-a"],
    };

    const moved = movePanelToZone(layout, "panel-a", "bottom", 0, panels);

    expect(moved.zones.bottom).toContain("panel-a");
    expect(moved.collapsedPanelIds).toContain("panel-a");
  });
});
