import {
  buildZonesForPreset,
  createZonesFromPanelDefaults,
  getPresetSizes,
} from "./cockpitLayoutPresets";
import type {
  CockpitLayoutPresetId,
  CockpitLayoutState,
  CockpitLayoutZone,
  CockpitLayoutZones,
  CockpitPanelDefinition,
} from "./cockpitLayoutTypes";
import {
  COCKPIT_LAYOUT_VERSION,
  COCKPIT_LAYOUT_ZONES,
  DEFAULT_COCKPIT_LAYOUT_SIZES,
} from "./cockpitLayoutTypes";

const STORAGE_KEY = "o3de.appos.cockpit-layouts.v1";

type PersistedLayouts = Record<string, CockpitLayoutState>;

function createEmptyZones(): CockpitLayoutZones {
  return {
    top: [],
    left: [],
    center: [],
    right: [],
    bottom: [],
  };
}

function getIsoNow(): string {
  return new Date().toISOString();
}

function clampRatio(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (value < 0.12) {
    return 0.12;
  }
  if (value > 0.88) {
    return 0.88;
  }
  return value;
}

function getPanelIds(panels: CockpitPanelDefinition[]): Set<string> {
  return new Set(panels.map((panel) => panel.id));
}

function sanitizeZones(
  zones: CockpitLayoutZones | undefined,
  panelIds: Set<string>,
  defaultZones: CockpitLayoutZones,
): CockpitLayoutZones {
  if (!zones) {
    return defaultZones;
  }
  const sanitized = createEmptyZones();
  const placed = new Set<string>();
  for (const zoneName of COCKPIT_LAYOUT_ZONES) {
    const rawZone = zones[zoneName];
    for (const panelId of rawZone ?? []) {
      if (!panelIds.has(panelId) || placed.has(panelId)) {
        continue;
      }
      sanitized[zoneName].push(panelId);
      placed.add(panelId);
    }
  }
  for (const zoneName of COCKPIT_LAYOUT_ZONES) {
    for (const panelId of defaultZones[zoneName]) {
      if (!placed.has(panelId)) {
        sanitized[zoneName].push(panelId);
        placed.add(panelId);
      }
    }
  }
  for (const panelId of panelIds) {
    if (!placed.has(panelId)) {
      sanitized.center.push(panelId);
    }
  }
  return sanitized;
}

function sanitizeCollapsedIds(
  collapsedPanelIds: string[] | undefined,
  panelsById: Map<string, CockpitPanelDefinition>,
): string[] {
  if (!collapsedPanelIds || collapsedPanelIds.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const panelId of collapsedPanelIds) {
    if (seen.has(panelId)) {
      continue;
    }
    const panel = panelsById.get(panelId);
    if (!panel || panel.collapsible === false) {
      continue;
    }
    seen.add(panelId);
    result.push(panelId);
  }
  return result;
}

function readStorageSnapshot(): PersistedLayouts {
  if (typeof window === "undefined") {
    return {};
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as PersistedLayouts;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorageSnapshot(snapshot: PersistedLayouts): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function createDefaultLayoutState(
  cockpitId: string,
  panels: CockpitPanelDefinition[],
  presetId: CockpitLayoutPresetId = "balanced",
): CockpitLayoutState {
  const zones = presetId === "balanced"
    ? createZonesFromPanelDefaults(panels)
    : buildZonesForPreset(panels, presetId);
  const sizes = presetId === "balanced"
    ? DEFAULT_COCKPIT_LAYOUT_SIZES
    : getPresetSizes(presetId);
  return {
    cockpitId,
    version: COCKPIT_LAYOUT_VERSION,
    zones,
    sizes,
    collapsedPanelIds: [],
    updatedAt: getIsoNow(),
  };
}

export function readCockpitLayoutState(
  cockpitId: string,
  panels: CockpitPanelDefinition[],
): CockpitLayoutState {
  const defaults = createDefaultLayoutState(cockpitId, panels);
  const snapshot = readStorageSnapshot();
  const persisted = snapshot[cockpitId];
  if (!persisted) {
    return defaults;
  }
  const panelIds = getPanelIds(panels);
  const panelsById = new Map(panels.map((panel) => [panel.id, panel]));
  const zones = sanitizeZones(persisted.zones, panelIds, defaults.zones);
  const collapsedPanelIds = sanitizeCollapsedIds(persisted.collapsedPanelIds, panelsById);
  return {
    cockpitId,
    version: COCKPIT_LAYOUT_VERSION,
    zones,
    sizes: {
      leftPrimaryRatio: clampRatio(
        persisted.sizes?.leftPrimaryRatio ?? defaults.sizes.leftPrimaryRatio,
        defaults.sizes.leftPrimaryRatio,
      ),
      centerPrimaryRatio: clampRatio(
        persisted.sizes?.centerPrimaryRatio ?? defaults.sizes.centerPrimaryRatio,
        defaults.sizes.centerPrimaryRatio,
      ),
      topPrimaryRatio: clampRatio(
        persisted.sizes?.topPrimaryRatio ?? defaults.sizes.topPrimaryRatio,
        defaults.sizes.topPrimaryRatio,
      ),
    },
    collapsedPanelIds,
    updatedAt: persisted.updatedAt || defaults.updatedAt,
  };
}

export function writeCockpitLayoutState(layout: CockpitLayoutState): void {
  const snapshot = readStorageSnapshot();
  snapshot[layout.cockpitId] = layout;
  writeStorageSnapshot(snapshot);
}

export function clearCockpitLayoutState(cockpitId: string): void {
  const snapshot = readStorageSnapshot();
  if (!(cockpitId in snapshot)) {
    return;
  }
  delete snapshot[cockpitId];
  writeStorageSnapshot(snapshot);
}

export function createCockpitLayoutStateFromPreset(
  cockpitId: string,
  panels: CockpitPanelDefinition[],
  presetId: CockpitLayoutPresetId,
): CockpitLayoutState {
  return createDefaultLayoutState(cockpitId, panels, presetId);
}

export function moveCockpitPanelToZone(
  layout: CockpitLayoutState,
  panelId: string,
  targetZone: CockpitLayoutZone,
): CockpitLayoutState {
  const zones = createEmptyZones();
  for (const zone of COCKPIT_LAYOUT_ZONES) {
    zones[zone] = layout.zones[zone].filter((id) => id !== panelId);
  }
  zones[targetZone].push(panelId);
  return {
    ...layout,
    zones,
    updatedAt: getIsoNow(),
  };
}
