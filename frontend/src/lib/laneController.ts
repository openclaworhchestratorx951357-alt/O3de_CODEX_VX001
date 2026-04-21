import type { ArtifactListItem, ExecutionListItem, RunListItem } from "../types/contracts";

export type TruthFilterState = {
  inspectionSurface: string | null;
  fallbackCategory: string | null;
  manifestSourceOfTruth: string | null;
};

export type FocusedSection =
  | "approvals"
  | "artifacts"
  | "events"
  | "executions"
  | "executors"
  | "runs"
  | "workspaces";

export function createNeutralTruthFilter(): TruthFilterState {
  return {
    inspectionSurface: null,
    fallbackCategory: null,
    manifestSourceOfTruth: null,
  };
}

export function createInspectionSurfaceTruthFilter(value: string): TruthFilterState {
  return {
    inspectionSurface: value,
    fallbackCategory: null,
    manifestSourceOfTruth: null,
  };
}

export function createFallbackCategoryTruthFilter(value: string): TruthFilterState {
  return {
    inspectionSurface: null,
    fallbackCategory: value,
    manifestSourceOfTruth: null,
  };
}

export function createManifestSourceTruthFilter(value: string): TruthFilterState {
  return {
    inspectionSurface: null,
    fallbackCategory: null,
    manifestSourceOfTruth: value,
  };
}

export function createTruthFilterForDimension(
  filter: "inspection_surface" | "fallback_category" | "manifest_source_of_truth",
  value: string,
): TruthFilterState {
  if (filter === "inspection_surface") {
    return createInspectionSurfaceTruthFilter(value);
  }
  if (filter === "fallback_category") {
    return createFallbackCategoryTruthFilter(value);
  }
  return createManifestSourceTruthFilter(value);
}

export function formatOverviewFocusLabel(label: string, value: string): string {
  return `${label} = ${value}`;
}

export function formatTruthFilterFocusLabel(
  filter: "inspection_surface" | "fallback_category" | "manifest_source_of_truth",
  value: string,
): string {
  if (filter === "inspection_surface") {
    return formatOverviewFocusLabel("inspection surface", value);
  }
  if (filter === "fallback_category") {
    return formatOverviewFocusLabel("fallback category", value);
  }
  return formatOverviewFocusLabel("manifest source of truth", value);
}

export function buildOverviewAutoOpenHint(
  focusLabel: string | null | undefined,
  selectionReason?: string | null,
): string {
  const normalizedFocusLabel = focusLabel?.trim() || "the current overview filter";
  const normalizedSelectionReason = selectionReason?.trim();
  if (!normalizedSelectionReason) {
    return `Auto-opened from overview drilldown for ${normalizedFocusLabel}.`;
  }
  return `Auto-opened from overview drilldown for ${normalizedFocusLabel}. ${normalizedSelectionReason}`;
}

type ClearFocusedSectionOptions = {
  activeFocusedSection: FocusedSection | null;
  section: FocusedSection;
  setActiveFocusedSection: (section: FocusedSection | null) => void;
  setUpdatedFocusedSection: (section: FocusedSection | null) => void;
};

export function clearFocusedSection(options: ClearFocusedSectionOptions): void {
  options.setUpdatedFocusedSection(null);
  if (options.activeFocusedSection === options.section) {
    options.setActiveFocusedSection(null);
  }
}

type ActivateRunsLaneFromOverviewOptions = {
  focusLabel: string;
  searchPreset: string;
  truthFilter?: TruthFilterState;
  runFilter?: (item: RunListItem) => boolean;
  setSelectedToolFilter: (value: "all" | "settings.patch") => void;
  setSelectedAuditFilter: (
    value: "all" | "preflight" | "blocked" | "succeeded" | "rolled_back" | "other",
  ) => void;
  setRunTruthFilter: (value: TruthFilterState) => void;
  setRunsSearchPreset: (value: string | null) => void;
  setRunsFocusLabel: (value: string | null) => void;
  setActiveFocusedSection: (section: FocusedSection | null) => void;
  setUpdatedFocusedSection: (section: FocusedSection | null) => void;
  setRunsSearchVersion: (updater: (value: number) => number) => void;
  loadRuns: (
    toolFilter: "all" | "settings.patch",
    auditFilter: "all" | "preflight" | "blocked" | "succeeded" | "rolled_back" | "other",
    truthFilter: TruthFilterState,
  ) => Promise<RunListItem[]>;
  setRunDetailRefreshHint: (value: string | null) => void;
  openFirstRunLaneMatch: (items: RunListItem[]) => void;
  scrollToSection: () => void;
};

export async function activateRunsLaneFromOverview(
  options: ActivateRunsLaneFromOverviewOptions,
): Promise<void> {
  const nextTruthFilter = options.truthFilter ?? createNeutralTruthFilter();
  options.setSelectedToolFilter("all");
  options.setSelectedAuditFilter("all");
  options.setRunTruthFilter(nextTruthFilter);
  options.setRunsSearchPreset(options.searchPreset);
  options.setRunsFocusLabel(options.focusLabel);
  options.setActiveFocusedSection("runs");
  options.setUpdatedFocusedSection(null);
  options.setRunsSearchVersion((value) => value + 1);
  const nextRuns = await options.loadRuns("all", "all", nextTruthFilter);
  options.setRunDetailRefreshHint(null);
  options.openFirstRunLaneMatch(
    options.runFilter ? nextRuns.filter(options.runFilter) : nextRuns,
  );
  options.scrollToSection();
}

type ActivateExecutionLaneFromOverviewOptions = {
  focusLabel: string;
  searchPreset: string;
  truthFilter?: TruthFilterState;
  executionFilter?: (item: ExecutionListItem) => boolean;
  setExecutionTruthFilter: (value: TruthFilterState) => void;
  setExecutionsSearchPreset: (value: string | null) => void;
  setExecutionsFocusLabel: (value: string | null) => void;
  setActiveFocusedSection: (section: FocusedSection | null) => void;
  setUpdatedFocusedSection: (section: FocusedSection | null) => void;
  setExecutionsSearchVersion: (updater: (value: number) => number) => void;
  loadExecutions: (truthFilter: TruthFilterState) => Promise<ExecutionListItem[]>;
  openFirstExecutionLaneMatch: (items: ExecutionListItem[]) => void;
  scrollToSection: () => void;
};

export function activateExecutionLaneFromOverview(
  options: ActivateExecutionLaneFromOverviewOptions,
): void {
  const nextTruthFilter = options.truthFilter ?? createNeutralTruthFilter();
  options.setExecutionTruthFilter(nextTruthFilter);
  options.setExecutionsSearchPreset(options.searchPreset);
  options.setExecutionsFocusLabel(options.focusLabel);
  options.setActiveFocusedSection("executions");
  options.setUpdatedFocusedSection(null);
  options.setExecutionsSearchVersion((value) => value + 1);
  void options.loadExecutions(nextTruthFilter).then((items) => {
    options.openFirstExecutionLaneMatch(
      options.executionFilter ? items.filter(options.executionFilter) : items,
    );
  });
  options.scrollToSection();
}

type ActivateArtifactLaneFromOverviewOptions = {
  focusLabel: string;
  searchPreset: string;
  truthFilter?: TruthFilterState;
  artifactFilter?: (item: ArtifactListItem) => boolean;
  setArtifactTruthFilter: (value: TruthFilterState) => void;
  setArtifactsSearchPreset: (value: string | null) => void;
  setArtifactsFocusLabel: (value: string | null) => void;
  setActiveFocusedSection: (section: FocusedSection | null) => void;
  setUpdatedFocusedSection: (section: FocusedSection | null) => void;
  setArtifactsSearchVersion: (updater: (value: number) => number) => void;
  loadArtifacts: (truthFilter: TruthFilterState) => Promise<ArtifactListItem[]>;
  openFirstArtifactLaneMatch: (items: ArtifactListItem[]) => void;
  scrollToSection: () => void;
};

export function activateArtifactLaneFromOverview(
  options: ActivateArtifactLaneFromOverviewOptions,
): void {
  const nextTruthFilter = options.truthFilter ?? createNeutralTruthFilter();
  options.setArtifactTruthFilter(nextTruthFilter);
  options.setArtifactsSearchPreset(options.searchPreset);
  options.setArtifactsFocusLabel(options.focusLabel);
  options.setActiveFocusedSection("artifacts");
  options.setUpdatedFocusedSection(null);
  options.setArtifactsSearchVersion((value) => value + 1);
  void options.loadArtifacts(nextTruthFilter).then((items) => {
    options.openFirstArtifactLaneMatch(
      options.artifactFilter ? items.filter(options.artifactFilter) : items,
    );
  });
  options.scrollToSection();
}

type ResetLaneFocusOptions = {
  activeFocusedSection: FocusedSection | null;
  section: FocusedSection;
  truthFilter?: TruthFilterState;
  setTruthFilter: (value: TruthFilterState) => void;
  setSearchPreset: (value: string | null) => void;
  setFocusLabel: (value: string | null) => void;
  setActiveFocusedSection: (section: FocusedSection | null) => void;
  setUpdatedFocusedSection: (section: FocusedSection | null) => void;
  setSearchVersion: (updater: (value: number) => number) => void;
  reloadLane: (truthFilter: TruthFilterState) => void;
};

export function resetLaneFocus(options: ResetLaneFocusOptions): void {
  const normalizedTruthFilter = options.truthFilter ?? createNeutralTruthFilter();
  options.setTruthFilter(normalizedTruthFilter);
  options.setSearchPreset(null);
  options.setFocusLabel(null);
  clearFocusedSection({
    activeFocusedSection: options.activeFocusedSection,
    section: options.section,
    setActiveFocusedSection: options.setActiveFocusedSection,
    setUpdatedFocusedSection: options.setUpdatedFocusedSection,
  });
  options.setSearchVersion((value) => value + 1);
  options.reloadLane(normalizedTruthFilter);
}

type ResetPresetLaneFocusOptions = {
  activeFocusedSection: FocusedSection | null;
  section: FocusedSection;
  setSearchPreset: (value: string | null) => void;
  setFocusLabel: (value: string | null) => void;
  setActiveFocusedSection: (section: FocusedSection | null) => void;
  setUpdatedFocusedSection: (section: FocusedSection | null) => void;
  setSearchVersion: (updater: (value: number) => number) => void;
};

export function resetPresetLaneFocus(options: ResetPresetLaneFocusOptions): void {
  options.setSearchPreset(null);
  options.setFocusLabel(null);
  clearFocusedSection({
    activeFocusedSection: options.activeFocusedSection,
    section: options.section,
    setActiveFocusedSection: options.setActiveFocusedSection,
    setUpdatedFocusedSection: options.setUpdatedFocusedSection,
  });
  options.setSearchVersion((value) => value + 1);
}
