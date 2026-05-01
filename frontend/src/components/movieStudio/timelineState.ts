export type TrackState = {
  mute: boolean;
  solo: boolean;
  lock: boolean;
};

export type TimelineRangePreset = "scene" | "sequence" | "full";
export type TimelineZoomLevel = 1 | 2 | 3;

export const INITIAL_PLAYHEAD = "00:00:08:12";
export const INITIAL_MARKERS = ["00:00:03:00", "00:00:12:12"];

export const INITIAL_TRACK_STATE: Record<string, TrackState> = {
  v1: { mute: false, solo: false, lock: false },
  v2: { mute: false, solo: false, lock: false },
  a1: { mute: false, solo: false, lock: false },
  a2: { mute: false, solo: false, lock: false },
};

export function clipWidthForZoom(zoom: TimelineZoomLevel): number {
  if (zoom === 1) return 140;
  if (zoom === 2) return 190;
  return 250;
}

export function rangePresetLabel(preset: TimelineRangePreset): string {
  if (preset === "scene") return "Scene focus";
  if (preset === "sequence") return "Sequence focus";
  return "Full timeline";
}
