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
    leftMinWidth: 250,
    centerMinWidth: 660,
    rightMinWidth: 260,
    mainMinHeight: 320,
    bottomMinHeight: 180,
  },
};

const COCKPIT_LAYOUT_DEFAULTS: Record<string, CockpitLayoutDefaults> = {
  home: {
    presetId: "home-launcher",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 650,
      rightMinWidth: 260,
      mainMinHeight: 320,
      bottomMinHeight: 180,
    },
  },
  "create-game": {
    presetId: "create-game-cockpit",
    splitConstraints: {
      leftMinWidth: 260,
      centerMinWidth: 660,
      rightMinWidth: 270,
      mainMinHeight: 320,
      bottomMinHeight: 180,
    },
  },
  "create-movie": {
    presetId: "create-movie-cockpit",
    splitConstraints: {
      leftMinWidth: 260,
      centerMinWidth: 660,
      rightMinWidth: 270,
      mainMinHeight: 320,
      bottomMinHeight: 180,
    },
  },
  "load-project": {
    presetId: "load-project-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 650,
      rightMinWidth: 270,
      mainMinHeight: 320,
      bottomMinHeight: 180,
    },
  },
  "asset-forge": {
    presetId: "asset-forge-studio",
    splitConstraints: {
      leftMinWidth: 280,
      centerMinWidth: 660,
      rightMinWidth: 280,
      mainMinHeight: 320,
      bottomMinHeight: 190,
    },
  },
  prompt: {
    presetId: "prompt-studio-cockpit",
    splitConstraints: {
      leftMinWidth: 260,
      centerMinWidth: 660,
      rightMinWidth: 270,
      mainMinHeight: 320,
      bottomMinHeight: 180,
    },
  },
  builder: {
    presetId: "builder-cockpit",
    splitConstraints: {
      leftMinWidth: 260,
      centerMinWidth: 660,
      rightMinWidth: 270,
      mainMinHeight: 320,
      bottomMinHeight: 180,
    },
  },
  operations: {
    presetId: "operations-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 650,
      rightMinWidth: 270,
      mainMinHeight: 320,
      bottomMinHeight: 180,
    },
  },
  runtime: {
    presetId: "runtime-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 650,
      rightMinWidth: 270,
      mainMinHeight: 320,
      bottomMinHeight: 180,
    },
  },
  records: {
    presetId: "records-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 670,
      rightMinWidth: 260,
      mainMinHeight: 320,
      bottomMinHeight: 180,
    },
  },
};

export function getCockpitLayoutDefaults(cockpitId: string): CockpitLayoutDefaults {
  return COCKPIT_LAYOUT_DEFAULTS[cockpitId] ?? FALLBACK_LAYOUT_DEFAULTS;
}

export function getAllCockpitLayoutDefaults(): Record<string, CockpitLayoutDefaults> {
  return COCKPIT_LAYOUT_DEFAULTS;
}
