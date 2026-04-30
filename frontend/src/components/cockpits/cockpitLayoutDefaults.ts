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
    centerMinWidth: 600,
    rightMinWidth: 240,
    mainMinHeight: 280,
    bottomMinHeight: 160,
  },
};

const COCKPIT_LAYOUT_DEFAULTS: Record<string, CockpitLayoutDefaults> = {
  home: {
    presetId: "home-launcher",
    splitConstraints: {
      leftMinWidth: 230,
      centerMinWidth: 560,
      rightMinWidth: 230,
      mainMinHeight: 280,
      bottomMinHeight: 160,
    },
  },
  "create-game": {
    presetId: "create-game-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 600,
      rightMinWidth: 240,
      mainMinHeight: 300,
      bottomMinHeight: 160,
    },
  },
  "create-movie": {
    presetId: "create-movie-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 600,
      rightMinWidth: 240,
      mainMinHeight: 300,
      bottomMinHeight: 160,
    },
  },
  "load-project": {
    presetId: "load-project-cockpit",
    splitConstraints: {
      leftMinWidth: 240,
      centerMinWidth: 580,
      rightMinWidth: 250,
      mainMinHeight: 300,
      bottomMinHeight: 160,
    },
  },
  "asset-forge": {
    presetId: "asset-forge-studio",
    splitConstraints: {
      leftMinWidth: 260,
      centerMinWidth: 600,
      rightMinWidth: 240,
      mainMinHeight: 300,
      bottomMinHeight: 160,
    },
  },
  prompt: {
    presetId: "prompt-studio-cockpit",
    splitConstraints: {
      leftMinWidth: 240,
      centerMinWidth: 600,
      rightMinWidth: 240,
      mainMinHeight: 300,
      bottomMinHeight: 160,
    },
  },
  builder: {
    presetId: "builder-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 620,
      rightMinWidth: 240,
      mainMinHeight: 300,
      bottomMinHeight: 160,
    },
  },
  operations: {
    presetId: "operations-cockpit",
    splitConstraints: {
      leftMinWidth: 240,
      centerMinWidth: 600,
      rightMinWidth: 240,
      mainMinHeight: 280,
      bottomMinHeight: 160,
    },
  },
  runtime: {
    presetId: "runtime-cockpit",
    splitConstraints: {
      leftMinWidth: 240,
      centerMinWidth: 600,
      rightMinWidth: 240,
      mainMinHeight: 280,
      bottomMinHeight: 160,
    },
  },
  records: {
    presetId: "records-cockpit",
    splitConstraints: {
      leftMinWidth: 240,
      centerMinWidth: 600,
      rightMinWidth: 240,
      mainMinHeight: 280,
      bottomMinHeight: 160,
    },
  },
};

export function getCockpitLayoutDefaults(cockpitId: string): CockpitLayoutDefaults {
  return COCKPIT_LAYOUT_DEFAULTS[cockpitId] ?? FALLBACK_LAYOUT_DEFAULTS;
}

export function getAllCockpitLayoutDefaults(): Record<string, CockpitLayoutDefaults> {
  return COCKPIT_LAYOUT_DEFAULTS;
}
