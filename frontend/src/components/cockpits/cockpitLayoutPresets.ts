import type {
  CockpitLayoutPresetId,
  CockpitLayoutSizes,
  CockpitLayoutZones,
  CockpitPanelDefinition,
} from "./cockpitLayoutTypes";
import { COCKPIT_LAYOUT_ZONES, DEFAULT_COCKPIT_LAYOUT_SIZES } from "./cockpitLayoutTypes";

type CockpitLayoutPresetDefinition = {
  id: CockpitLayoutPresetId;
  label: string;
  description: string;
  sizes: CockpitLayoutSizes;
  placePanel: (panel: CockpitPanelDefinition) => keyof CockpitLayoutZones;
};

const presetDefinitions: Record<CockpitLayoutPresetId, CockpitLayoutPresetDefinition> = {
  "app-os-cockpit": {
    id: "app-os-cockpit",
    label: "App OS Cockpit",
    description: "Blender/Unreal-style cockpit default with dominant center work area, useful side rails, and compact bottom drawer.",
    sizes: {
      leftPrimaryRatio: 0.26,
      centerPrimaryRatio: 0.66,
      topPrimaryRatio: 0.79,
    },
    placePanel: (panel) => panel.defaultZone,
  },
  balanced: {
    id: "balanced",
    label: "Balanced",
    description: "Balanced multi-zone cockpit with tools left, workspace center, status right, and evidence bottom.",
    sizes: DEFAULT_COCKPIT_LAYOUT_SIZES,
    placePanel: (panel) => panel.defaultZone,
  },
  focus: {
    id: "focus",
    label: "Focus",
    description: "Focus on primary workspace content in center with supporting cards moved to side zones.",
    sizes: {
      leftPrimaryRatio: 0.2,
      centerPrimaryRatio: 0.75,
      topPrimaryRatio: 0.86,
    },
    placePanel: (panel) => {
      if (panel.priority === "primary") {
        return "center";
      }
      if (panel.priority === "status") {
        return "right";
      }
      if (panel.priority === "evidence") {
        return "bottom";
      }
      if (panel.priority === "tools") {
        return "left";
      }
      return panel.defaultZone;
    },
  },
  review: {
    id: "review",
    label: "Review",
    description: "Evidence-first review posture with bottom evidence emphasis and status in center.",
    sizes: {
      leftPrimaryRatio: 0.24,
      centerPrimaryRatio: 0.56,
      topPrimaryRatio: 0.62,
    },
    placePanel: (panel) => {
      if (panel.priority === "evidence") {
        return "bottom";
      }
      if (panel.priority === "status") {
        return "center";
      }
      return panel.defaultZone;
    },
  },
  compact: {
    id: "compact",
    label: "Compact",
    description: "Compact stack emphasizing fewer columns and more vertical flow.",
    sizes: {
      leftPrimaryRatio: 0.24,
      centerPrimaryRatio: 0.52,
      topPrimaryRatio: 0.68,
    },
    placePanel: (panel) => {
      if (panel.priority === "status") {
        return "right";
      }
      if (panel.priority === "evidence") {
        return "bottom";
      }
      return panel.defaultZone;
    },
  },
  "wide-screen": {
    id: "wide-screen",
    label: "Wide Screen",
    description: "Wider three-column cockpit for large desktop surfaces.",
    sizes: {
      leftPrimaryRatio: 0.28,
      centerPrimaryRatio: 0.68,
      topPrimaryRatio: 0.78,
    },
    placePanel: (panel) => panel.defaultZone,
  },
  "asset-forge-studio": {
    id: "asset-forge-studio",
    label: "Asset Forge Studio",
    description: "Blender/Unreal-style creator cockpit with dominant center workspace and compact evidence drawer.",
    sizes: {
      leftPrimaryRatio: 0.26,
      centerPrimaryRatio: 0.66,
      topPrimaryRatio: 0.79,
    },
    placePanel: (panel) => panel.defaultZone,
  },
};

function createEmptyZones(): CockpitLayoutZones {
  return {
    top: [],
    left: [],
    center: [],
    right: [],
    bottom: [],
  };
}

export function buildZonesForPreset(
  panels: CockpitPanelDefinition[],
  presetId: CockpitLayoutPresetId,
): CockpitLayoutZones {
  const preset = presetDefinitions[presetId];
  const zones = createEmptyZones();
  for (const panel of panels) {
    const zone = preset.placePanel(panel);
    zones[zone].push(panel.id);
  }
  return zones;
}

export function getPresetSizes(presetId: CockpitLayoutPresetId): CockpitLayoutSizes {
  return presetDefinitions[presetId].sizes;
}

export function getCockpitLayoutPresetChoices(): Array<{
  id: CockpitLayoutPresetId;
  label: string;
  description: string;
}> {
  return Object.values(presetDefinitions).map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
  }));
}

export function createZonesFromPanelDefaults(panels: CockpitPanelDefinition[]): CockpitLayoutZones {
  const zones = createEmptyZones();
  for (const panel of panels) {
    if (!COCKPIT_LAYOUT_ZONES.includes(panel.defaultZone)) {
      zones.center.push(panel.id);
      continue;
    }
    zones[panel.defaultZone].push(panel.id);
  }
  return zones;
}
