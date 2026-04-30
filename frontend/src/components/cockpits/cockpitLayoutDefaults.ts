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
    leftMinWidth: 260,
    centerMinWidth: 560,
    rightMinWidth: 320,
    mainMinHeight: 280,
    bottomMinHeight: 170,
  },
};

const COCKPIT_LAYOUT_DEFAULTS: Record<string, CockpitLayoutDefaults> = {
  home: FALLBACK_LAYOUT_DEFAULTS,
  "create-game": {
    presetId: "app-os-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 560,
      rightMinWidth: 300,
      mainMinHeight: 260,
      bottomMinHeight: 170,
    },
  },
  "create-movie": {
    presetId: "app-os-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 560,
      rightMinWidth: 300,
      mainMinHeight: 260,
      bottomMinHeight: 170,
    },
  },
  "load-project": {
    presetId: "app-os-cockpit",
    splitConstraints: {
      leftMinWidth: 250,
      centerMinWidth: 560,
      rightMinWidth: 300,
      mainMinHeight: 260,
      bottomMinHeight: 170,
    },
  },
  "asset-forge": {
    presetId: "asset-forge-studio",
    splitConstraints: {
      leftMinWidth: 260,
      centerMinWidth: 560,
      rightMinWidth: 320,
      mainMinHeight: 260,
      bottomMinHeight: 170,
    },
  },
  prompt: {
    presetId: "app-os-cockpit",
    splitConstraints: {
      leftMinWidth: 260,
      centerMinWidth: 560,
      rightMinWidth: 300,
      mainMinHeight: 280,
      bottomMinHeight: 170,
    },
  },
  builder: {
    presetId: "app-os-cockpit",
    splitConstraints: {
      leftMinWidth: 280,
      centerMinWidth: 600,
      rightMinWidth: 320,
      mainMinHeight: 300,
      bottomMinHeight: 180,
    },
  },
  operations: {
    presetId: "app-os-cockpit",
    splitConstraints: {
      leftMinWidth: 260,
      centerMinWidth: 560,
      rightMinWidth: 320,
      mainMinHeight: 280,
      bottomMinHeight: 170,
    },
  },
  runtime: {
    presetId: "app-os-cockpit",
    splitConstraints: {
      leftMinWidth: 260,
      centerMinWidth: 560,
      rightMinWidth: 320,
      mainMinHeight: 280,
      bottomMinHeight: 170,
    },
  },
  records: {
    presetId: "app-os-cockpit",
    splitConstraints: {
      leftMinWidth: 260,
      centerMinWidth: 560,
      rightMinWidth: 320,
      mainMinHeight: 280,
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
