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
export const COCKPIT_LAYOUT_RESET_EVENT = "o3de.appos.cockpit-layout-reset";

type PersistedLayouts = Record<string, CockpitLayoutState>;
export type CockpitLayoutResetRequest =
  | { scope: "cockpit"; cockpitId: string }
  | { scope: "all" };

function isCockpitLayoutResetRequest(value: unknown): value is CockpitLayoutResetRequest {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<CockpitLayoutResetRequest>;
  if (candidate.scope === "all") {
    return true;
  }
  return candidate.scope === "cockpit" && typeof candidate.cockpitId === "string";
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

export function readCockpitLayoutState(
  cockpitId: string,
  panels: CockpitPanelDefinition[],
  defaultPresetId: CockpitLayoutPresetId = "balanced",
): CockpitLayoutState {
  const snapshot = readStorageSnapshot();
  const persisted = snapshot[cockpitId];
  return normalizeCockpitLayout(persisted, panels, cockpitId, defaultPresetId);
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

export function clearAllCockpitLayoutState(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function dispatchCockpitLayoutReset(request: CockpitLayoutResetRequest): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent<CockpitLayoutResetRequest>(COCKPIT_LAYOUT_RESET_EVENT, {
    detail: request,
  }));
}

export function subscribeCockpitLayoutReset(
  listener: (request: CockpitLayoutResetRequest) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleReset = (event: Event) => {
    const request = (event as CustomEvent<CockpitLayoutResetRequest>).detail;
    if (!isCockpitLayoutResetRequest(request)) {
      return;
    }
    listener(request);
  };

  window.addEventListener(COCKPIT_LAYOUT_RESET_EVENT, handleReset);
  return () => {
    window.removeEventListener(COCKPIT_LAYOUT_RESET_EVENT, handleReset);
  };
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
