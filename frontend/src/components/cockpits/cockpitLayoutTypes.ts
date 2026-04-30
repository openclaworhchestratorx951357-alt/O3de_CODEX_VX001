import type { ReactNode } from "react";

export type CockpitLayoutZone = "top" | "left" | "center" | "right" | "bottom";

export type CockpitLayoutPresetId =
  | "app-os-cockpit"
  | "balanced"
  | "focus"
  | "review"
  | "compact"
  | "wide-screen"
  | "asset-forge-studio";

export type CockpitPanelPriority = "primary" | "secondary" | "evidence" | "tools" | "status";

export type CockpitPanelDefinition = {
  id: string;
  title: string;
  subtitle?: string;
  truthState?: string;
  defaultZone: CockpitLayoutZone;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  collapsible?: boolean;
  draggable?: boolean;
  allowedZones?: CockpitLayoutZone[];
  locked?: boolean;
  scrollMode?: "panel" | "content" | "none";
  priority?: CockpitPanelPriority;
  render: () => ReactNode;
};

export type CockpitLayoutZones = Record<CockpitLayoutZone, string[]>;

export type CockpitLayoutSizes = {
  leftPrimaryRatio: number;
  centerPrimaryRatio: number;
  topPrimaryRatio: number;
};

export type CockpitLayoutState = {
  cockpitId: string;
  version: number;
  zones: CockpitLayoutZones;
  sizes: CockpitLayoutSizes;
  collapsedPanelIds: string[];
  updatedAt: string;
};

export type CockpitDragState = {
  panelId: string;
  sourceZoneId: CockpitLayoutZone;
  overZoneId: CockpitLayoutZone | null;
  overPanelId: string | null;
  insertPosition: "before" | "after" | "inside" | null;
  targetIndex: number | null;
};

export const COCKPIT_LAYOUT_ZONES: readonly CockpitLayoutZone[] = [
  "top",
  "left",
  "center",
  "right",
  "bottom",
];

export const DEFAULT_COCKPIT_LAYOUT_SIZES: CockpitLayoutSizes = {
  leftPrimaryRatio: 0.3,
  centerPrimaryRatio: 0.62,
  topPrimaryRatio: 0.74,
};

export const COCKPIT_LAYOUT_VERSION = 1;

const COCKPIT_LAYOUT_VERSION_OVERRIDES: Record<string, number> = {
  "create-game": 2,
  "create-movie": 2,
  "load-project": 2,
  "asset-forge": 2,
  "prompt": 2,
  "builder": 2,
  "operations": 2,
  "runtime": 2,
  "records": 2,
};

export function getCockpitLayoutVersion(cockpitId: string): number {
  return COCKPIT_LAYOUT_VERSION_OVERRIDES[cockpitId] ?? COCKPIT_LAYOUT_VERSION;
}
