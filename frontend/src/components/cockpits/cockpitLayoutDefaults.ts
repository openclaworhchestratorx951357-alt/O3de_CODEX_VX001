import type { CockpitLayoutPresetId } from "./cockpitLayoutTypes";

export type CockpitLayoutSplitConstraints = {
  leftMinWidth: number;
  centerMinWidth: number;
  rightMinWidth: number;
  mainMinHeight: number;
  bottomMinHeight: number;
};

export type CockpitLayoutDefaults = {
  presetId: CockpitLayoutPresetId;
  splitConstraints: CockpitLayoutSplitConstraints;
};

const FALLBACK_LAYOUT_DEFAULTS: CockpitLayoutDefaults = {
  presetId: "app-os-cockpit",
  splitConstraints: {
    leftMinWidth: 240,
    centerMinWidth: 620,
    rightMinWidth: 250,
    mainMinHeight: 300,
    bottomMinHeight: 170,
  },
};

const COCKPIT_LAYOUT_DEFAULTS: Record<string, CockpitLayoutDefaults> = {
  home: {
    presetId: "home-launcher",
    splitConstraints: {
      leftMinWidth: 240,
      centerMinWidth: 600,
      rightMinWidth: 240,
      mainMinHeight: 300,
      bottomMinHeight: 170,
    },
  },
  "create-game": {
    presetId: "create-game-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 620,
      rightMinWidth: 260,
      mainMinHeight: 300,
      bottomMinHeight: 170,
    },
  },
  "create-movie": {
    presetId: "create-movie-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 620,
      rightMinWidth: 260,
      mainMinHeight: 300,
      bottomMinHeight: 170,
    },
  },
  "load-project": {
    presetId: "load-project-cockpit",
    splitConstraints: {
      leftMinWidth: 240,
      centerMinWidth: 610,
      rightMinWidth: 250,
      mainMinHeight: 300,
      bottomMinHeight: 170,
    },
  },
  "asset-forge": {
    presetId: "asset-forge-studio",
    splitConstraints: {
      leftMinWidth: 270,
      centerMinWidth: 620,
      rightMinWidth: 280,
      mainMinHeight: 300,
      bottomMinHeight: 170,
    },
  },
  prompt: {
    presetId: "prompt-studio-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 620,
      rightMinWidth: 260,
      mainMinHeight: 300,
      bottomMinHeight: 170,
    },
  },
  builder: {
    presetId: "builder-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 620,
      rightMinWidth: 260,
      mainMinHeight: 300,
      bottomMinHeight: 170,
    },
  },
  operations: {
    presetId: "operations-cockpit",
    splitConstraints: {
      leftMinWidth: 240,
      centerMinWidth: 620,
      rightMinWidth: 250,
      mainMinHeight: 300,
      bottomMinHeight: 170,
    },
  },
  runtime: {
    presetId: "runtime-cockpit",
    splitConstraints: {
      leftMinWidth: 240,
      centerMinWidth: 620,
      rightMinWidth: 250,
      mainMinHeight: 300,
      bottomMinHeight: 170,
    },
  },
  records: {
    presetId: "records-cockpit",
    splitConstraints: {
      leftMinWidth: 240,
      centerMinWidth: 620,
      rightMinWidth: 250,
      mainMinHeight: 300,
      bottomMinHeight: 170,
    },
  },
};

export function getCockpitLayoutDefaults(cockpitId: string): CockpitLayoutDefaults {
  return COCKPIT_LAYOUT_DEFAULTS[cockpitId] ?? FALLBACK_LAYOUT_DEFAULTS;
}

export function getAllCockpitLayoutDefaults(): Record<string, CockpitLayoutDefaults> {
  return COCKPIT_LAYOUT_DEFAULTS;
}
