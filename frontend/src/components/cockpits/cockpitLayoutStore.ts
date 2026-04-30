import type {
  CockpitLayoutPresetId,
  CockpitLayoutState,
  CockpitLayoutZone,
  CockpitPanelDefinition,
} from "./cockpitLayoutTypes";
import {
  createDefaultCockpitLayout,
  normalizeCockpitLayout,
  movePanelToZone,
  reorderPanel,
} from "./cockpitLayoutReducer";

const STORAGE_KEY = "o3de.appos.cockpit-layouts.v1";

type PersistedLayouts = Record<string, CockpitLayoutState>;

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

export function readCockpitLayoutState(
  cockpitId: string,
  panels: CockpitPanelDefinition[],
): CockpitLayoutState {
  const snapshot = readStorageSnapshot();
  const persisted = snapshot[cockpitId];
  return normalizeCockpitLayout(persisted, panels, cockpitId);
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
  return createDefaultCockpitLayout(cockpitId, panels, presetId);
}

export function moveCockpitPanelToZone(
  layout: CockpitLayoutState,
  panelId: string,
  targetZone: CockpitLayoutZone,
  targetIndex: number | undefined,
  panels: CockpitPanelDefinition[],
): CockpitLayoutState {
  return movePanelToZone(layout, panelId, targetZone, targetIndex, panels);
}

export function reorderCockpitPanelInZone(
  layout: CockpitLayoutState,
  panelId: string,
  targetZone: CockpitLayoutZone,
  targetIndex: number | undefined,
  panels: CockpitPanelDefinition[],
): CockpitLayoutState {
  return reorderPanel(layout, panelId, targetZone, targetIndex, panels);
}
