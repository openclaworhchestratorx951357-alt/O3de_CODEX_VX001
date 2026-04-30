import {
  buildZonesForPreset,
  createZonesFromPanelDefaults,
  getPresetSizes,
} from "./cockpitLayoutPresets";
import type {
  CockpitLayoutPresetId,
  CockpitLayoutSizes,
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

function createEmptyZones(): CockpitLayoutZones {
  return {
    top: [],
    left: [],
    center: [],
    right: [],
    bottom: [],
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function clampRatio(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return clamp(value, 0.12, 0.88);
}

function getIsoNow(): string {
  return new Date().toISOString();
}

function buildPanelLookup(panels: CockpitPanelDefinition[]): Map<string, CockpitPanelDefinition> {
  return new Map(panels.map((panel) => [panel.id, panel]));
}

function sanitizeSizes(sizes: Partial<CockpitLayoutSizes> | undefined): CockpitLayoutSizes {
  return {
    leftPrimaryRatio: clampRatio(
      sizes?.leftPrimaryRatio ?? DEFAULT_COCKPIT_LAYOUT_SIZES.leftPrimaryRatio,
      DEFAULT_COCKPIT_LAYOUT_SIZES.leftPrimaryRatio,
    ),
    centerPrimaryRatio: clampRatio(
      sizes?.centerPrimaryRatio ?? DEFAULT_COCKPIT_LAYOUT_SIZES.centerPrimaryRatio,
      DEFAULT_COCKPIT_LAYOUT_SIZES.centerPrimaryRatio,
    ),
    topPrimaryRatio: clampRatio(
      sizes?.topPrimaryRatio ?? DEFAULT_COCKPIT_LAYOUT_SIZES.topPrimaryRatio,
      DEFAULT_COCKPIT_LAYOUT_SIZES.topPrimaryRatio,
    ),
  };
}

function sanitizeZones(
  zones: CockpitLayoutZones | undefined,
  panels: CockpitPanelDefinition[],
): CockpitLayoutZones {
  const defaults = createZonesFromPanelDefaults(panels);
  if (!zones) {
    return defaults;
  }
  const panelIdSet = new Set(panels.map((panel) => panel.id));
  const placed = new Set<string>();
  const sanitized = createEmptyZones();
  for (const zone of COCKPIT_LAYOUT_ZONES) {
    for (const panelId of zones[zone] ?? []) {
      if (!panelIdSet.has(panelId) || placed.has(panelId)) {
        continue;
      }
      sanitized[zone].push(panelId);
      placed.add(panelId);
    }
  }
  for (const zone of COCKPIT_LAYOUT_ZONES) {
    for (const panelId of defaults[zone]) {
      if (placed.has(panelId)) {
        continue;
      }
      sanitized[zone].push(panelId);
      placed.add(panelId);
    }
  }
  for (const panel of panels) {
    if (!placed.has(panel.id)) {
      sanitized[panel.defaultZone].push(panel.id);
      placed.add(panel.id);
    }
  }
  return sanitized;
}

function sanitizeCollapsedPanelIds(
  collapsedPanelIds: string[] | undefined,
  panels: CockpitPanelDefinition[],
): string[] {
  if (!collapsedPanelIds?.length) {
    return [];
  }
  const panelLookup = buildPanelLookup(panels);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const panelId of collapsedPanelIds) {
    if (seen.has(panelId)) {
      continue;
    }
    const panel = panelLookup.get(panelId);
    if (!panel || panel.collapsible === false) {
      continue;
    }
    seen.add(panelId);
    result.push(panelId);
  }
  return result;
}

export function createDefaultCockpitLayout(
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

export function normalizeCockpitLayout(
  savedLayout: Partial<CockpitLayoutState> | null | undefined,
  panels: CockpitPanelDefinition[],
  cockpitId: string,
): CockpitLayoutState {
  const defaults = createDefaultCockpitLayout(cockpitId, panels);
  if (!savedLayout) {
    return defaults;
  }
  return {
    cockpitId,
    version: COCKPIT_LAYOUT_VERSION,
    zones: sanitizeZones(savedLayout.zones, panels),
    sizes: sanitizeSizes(savedLayout.sizes),
    collapsedPanelIds: sanitizeCollapsedPanelIds(savedLayout.collapsedPanelIds, panels),
    updatedAt: savedLayout.updatedAt?.trim() || defaults.updatedAt,
  };
}

function canMovePanel(
  panelLookup: Map<string, CockpitPanelDefinition>,
  panelId: string,
  targetZoneId: CockpitLayoutZone,
): boolean {
  const panel = panelLookup.get(panelId);
  if (!panel) {
    return false;
  }
  if (panel.locked || panel.draggable === false) {
    return false;
  }
  if (panel.allowedZones && !panel.allowedZones.includes(targetZoneId)) {
    return false;
  }
  return true;
}

function removePanelFromAllZones(
  zones: CockpitLayoutZones,
  panelId: string,
): CockpitLayoutZones {
  const next = createEmptyZones();
  for (const zone of COCKPIT_LAYOUT_ZONES) {
    next[zone] = zones[zone].filter((id) => id !== panelId);
  }
  return next;
}

function insertPanelAtIndex(
  panelIds: string[],
  panelId: string,
  targetIndex?: number,
): string[] {
  const next = [...panelIds];
  const safeIndex = targetIndex === undefined || targetIndex === null
    ? next.length
    : clamp(targetIndex, 0, next.length);
  next.splice(safeIndex, 0, panelId);
  return next;
}

function findPanelLocation(
  zones: CockpitLayoutZones,
  panelId: string,
): { zone: CockpitLayoutZone; index: number } | null {
  for (const zone of COCKPIT_LAYOUT_ZONES) {
    const index = zones[zone].indexOf(panelId);
    if (index >= 0) {
      return { zone, index };
    }
  }
  return null;
}

function applyPanelMove(
  layout: CockpitLayoutState,
  panelId: string,
  targetZoneId: CockpitLayoutZone,
  targetIndex: number | undefined,
  panels: CockpitPanelDefinition[],
): CockpitLayoutState {
  const panelLookup = buildPanelLookup(panels);
  if (!canMovePanel(panelLookup, panelId, targetZoneId)) {
    return layout;
  }
  const source = findPanelLocation(layout.zones, panelId);
  let nextTargetIndex = targetIndex;
  if (
    source
    && source.zone === targetZoneId
    && nextTargetIndex !== undefined
    && source.index < nextTargetIndex
  ) {
    // When moving within the same zone, removing the source panel shifts later insertion slots.
    nextTargetIndex -= 1;
  }
  const zones = removePanelFromAllZones(layout.zones, panelId);
  zones[targetZoneId] = insertPanelAtIndex(zones[targetZoneId], panelId, nextTargetIndex);
  return {
    ...layout,
    zones,
    updatedAt: getIsoNow(),
  };
}

export function movePanelToZone(
  layout: CockpitLayoutState,
  panelId: string,
  targetZoneId: CockpitLayoutZone,
  targetIndex: number | undefined,
  panels: CockpitPanelDefinition[],
): CockpitLayoutState {
  return applyPanelMove(layout, panelId, targetZoneId, targetIndex, panels);
}

export function reorderPanel(
  layout: CockpitLayoutState,
  panelId: string,
  targetZoneId: CockpitLayoutZone,
  targetIndex: number | undefined,
  panels: CockpitPanelDefinition[],
): CockpitLayoutState {
  return applyPanelMove(layout, panelId, targetZoneId, targetIndex, panels);
}

export function collapsePanel(
  layout: CockpitLayoutState,
  panelId: string,
  panels: CockpitPanelDefinition[],
): CockpitLayoutState {
  const panelLookup = buildPanelLookup(panels);
  const panel = panelLookup.get(panelId);
  if (!panel || panel.collapsible === false) {
    return layout;
  }
  if (layout.collapsedPanelIds.includes(panelId)) {
    return layout;
  }
  return {
    ...layout,
    collapsedPanelIds: [...layout.collapsedPanelIds, panelId],
    updatedAt: getIsoNow(),
  };
}

export function expandPanel(
  layout: CockpitLayoutState,
  panelId: string,
): CockpitLayoutState {
  if (!layout.collapsedPanelIds.includes(panelId)) {
    return layout;
  }
  return {
    ...layout,
    collapsedPanelIds: layout.collapsedPanelIds.filter((id) => id !== panelId),
    updatedAt: getIsoNow(),
  };
}
