import { useCallback, useEffect, useRef, useState } from "react";

const SAVE_FEEDBACK_TIMEOUT_MS = 2500;

export type TaskTimelineEventTypeFilter = "all" | "app_control" | "app_control_applied" | "app_control_reverted";
export type TaskTimelineVerificationFilter = "all" | "verified_only" | "assumed_present" | "not_recorded";

export type TaskTimelineSavedView = {
  id: string;
  label: string;
  eventTypeFilter: TaskTimelineEventTypeFilter;
  verificationFilter: TaskTimelineVerificationFilter;
  searchValue: string;
  createdAt: string;
  lastUsedAt?: string | null;
};

export type TaskTimelineActiveState = {
  eventTypeFilter: TaskTimelineEventTypeFilter;
  verificationFilter: TaskTimelineVerificationFilter;
  searchValue: string;
};

export type TaskTimelineSaveFeedback = {
  label: string;
  detail: string;
};

export type TaskTimelineRecoveryAction = {
  label: string;
  title: string;
  provenanceLabel: string;
  provenanceDetail: string;
  onSelect: () => void;
};

type UseEventTimelineViewsOptions = {
  eventTypePreset: TaskTimelineEventTypeFilter;
  verificationPreset: TaskTimelineVerificationFilter;
  searchPreset: string | null | undefined;
  savedViewsStorageKey: string | null;
  clearFiltersSignal: number;
};

export function useEventTimelineViews({
  eventTypePreset,
  verificationPreset,
  searchPreset,
  savedViewsStorageKey,
  clearFiltersSignal,
}: UseEventTimelineViewsOptions) {
  const activeStateStorageKey = getActiveTimelineStateStorageKey(savedViewsStorageKey);
  const lastNonEmptyStateStorageKey = getLastNonEmptyTimelineStateStorageKey(savedViewsStorageKey);
  const initialActiveState = loadActiveTimelineState(activeStateStorageKey);
  const [lastNonEmptyState, setLastNonEmptyState] = useState<TaskTimelineActiveState | null>(
    () => loadActiveTimelineState(lastNonEmptyStateStorageKey),
  );
  const [searchValue, setSearchValue] = useState(() => initialActiveState?.searchValue ?? (searchPreset ?? ""));
  const [eventTypeFilter, setEventTypeFilter] = useState<TaskTimelineEventTypeFilter>(
    () => initialActiveState?.eventTypeFilter ?? eventTypePreset,
  );
  const [verificationFilter, setVerificationFilter] = useState<TaskTimelineVerificationFilter>(
    () => initialActiveState?.verificationFilter ?? verificationPreset,
  );
  const [savedViews, setSavedViews] = useState<TaskTimelineSavedView[]>(() => (
    loadSavedViews(savedViewsStorageKey)
  ));
  const [saveFeedback, setSaveFeedback] = useState<TaskTimelineSaveFeedback | null>(null);
  const previousSearchPresetRef = useRef(searchPreset);
  const previousEventTypePresetRef = useRef(eventTypePreset);
  const previousVerificationPresetRef = useRef(verificationPreset);

  useEffect(() => {
    if (previousSearchPresetRef.current === searchPreset) {
      return;
    }
    previousSearchPresetRef.current = searchPreset;
    setSearchValue(searchPreset ?? "");
  }, [searchPreset]);

  useEffect(() => {
    if (previousEventTypePresetRef.current === eventTypePreset) {
      return;
    }
    previousEventTypePresetRef.current = eventTypePreset;
    setEventTypeFilter(eventTypePreset);
  }, [eventTypePreset]);

  useEffect(() => {
    if (previousVerificationPresetRef.current === verificationPreset) {
      return;
    }
    previousVerificationPresetRef.current = verificationPreset;
    setVerificationFilter(verificationPreset);
  }, [verificationPreset]);

  useEffect(() => {
    setSavedViews(loadSavedViews(savedViewsStorageKey));
  }, [savedViewsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !savedViewsStorageKey) {
      return;
    }

    if (savedViews.length === 0) {
      window.sessionStorage.removeItem(savedViewsStorageKey);
      return;
    }

    window.sessionStorage.setItem(savedViewsStorageKey, JSON.stringify(savedViews));
  }, [savedViews, savedViewsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeStateStorageKey) {
      return;
    }

    if (
      eventTypeFilter === "all"
      && verificationFilter === "all"
      && searchValue.trim().length === 0
    ) {
      window.sessionStorage.removeItem(activeStateStorageKey);
      return;
    }

    const nextState: TaskTimelineActiveState = {
      eventTypeFilter,
      verificationFilter,
      searchValue,
    };
    window.sessionStorage.setItem(activeStateStorageKey, JSON.stringify(nextState));
  }, [activeStateStorageKey, eventTypeFilter, searchValue, verificationFilter]);

  useEffect(() => {
    if (!saveFeedback || typeof window === "undefined") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveFeedback(null);
    }, SAVE_FEEDBACK_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [saveFeedback]);

  const updateLastNonEmptyState = useCallback((filteredItemsLength: number) => {
    if (filteredItemsLength === 0) {
      return;
    }
    const nextState: TaskTimelineActiveState = {
      eventTypeFilter,
      verificationFilter,
      searchValue,
    };
    setLastNonEmptyState(nextState);

    if (typeof window === "undefined" || !lastNonEmptyStateStorageKey) {
      return;
    }

    window.sessionStorage.setItem(lastNonEmptyStateStorageKey, JSON.stringify(nextState));
  }, [
    eventTypeFilter,
    lastNonEmptyStateStorageKey,
    searchValue,
    verificationFilter,
  ]);

  useEffect(() => {
    if (clearFiltersSignal <= 0) {
      return;
    }
    setEventTypeFilter("all");
    setVerificationFilter("all");
    setSearchValue("");
  }, [clearFiltersSignal]);

  const applyActiveState = (nextState: TaskTimelineActiveState) => {
    setEventTypeFilter(nextState.eventTypeFilter);
    setVerificationFilter(nextState.verificationFilter);
    setSearchValue(nextState.searchValue);
  };

  const applySavedView = (savedView: TaskTimelineSavedView) => {
    applyActiveState({
      eventTypeFilter: savedView.eventTypeFilter,
      verificationFilter: savedView.verificationFilter,
      searchValue: savedView.searchValue,
    });
    setSavedViews((current) => current.map((entry) => (
      entry.id === savedView.id
        ? {
            ...entry,
            lastUsedAt: new Date().toISOString(),
          }
        : entry
    )));
  };

  const saveCurrentView = () => {
    setSavedViews((current) => {
      const result = upsertSavedView(
        current,
        eventTypeFilter,
        verificationFilter,
        searchValue,
      );
      setSaveFeedback(result.feedback);
      return result.views;
    });
  };

  const overwriteSavedView = (savedViewId: string) => {
    setSavedViews((current) => current.map((entry) => (
      entry.id === savedViewId
        ? {
            ...entry,
            eventTypeFilter,
            verificationFilter,
            searchValue,
            createdAt: new Date().toISOString(),
            lastUsedAt: null,
          }
        : entry
    )));
  };

  const renameSavedView = (savedViewId: string, nextLabel: string) => {
    const trimmedLabel = nextLabel.trim();
    if (!trimmedLabel) {
      return;
    }
    setSavedViews((current) => current.map((entry) => (
      entry.id === savedViewId
        ? {
            ...entry,
            label: trimmedLabel,
          }
        : entry
    )));
  };

  const moveSavedViewFirst = (savedViewId: string) => {
    setSavedViews((current) => {
      const selectedView = current.find((entry) => entry.id === savedViewId);
      if (!selectedView) {
        return current;
      }
      return [
        selectedView,
        ...current.filter((entry) => entry.id !== savedViewId),
      ];
    });
  };

  const removeSavedView = (savedViewId: string) => {
    setSavedViews((current) => current.filter((entry) => entry.id !== savedViewId));
  };

  const clearAllFilters = () => {
    setEventTypeFilter("all");
    setVerificationFilter("all");
    setSearchValue("");
  };

  const dismissSaveFeedback = () => setSaveFeedback(null);

  return {
    eventTypeFilter,
    setEventTypeFilter,
    verificationFilter,
    setVerificationFilter,
    searchValue,
    setSearchValue,
    savedViews,
    saveFeedback,
    lastNonEmptyState,
    applyActiveState,
    applySavedView,
    saveCurrentView,
    overwriteSavedView,
    renameSavedView,
    moveSavedViewFirst,
    removeSavedView,
    clearAllFilters,
    dismissSaveFeedback,
    updateLastNonEmptyState,
  };
}

function buildSavedViewLabel(
  eventTypeFilter: TaskTimelineEventTypeFilter,
  verificationFilter: TaskTimelineVerificationFilter,
  searchValue: string,
): string {
  const parts = [
    eventTypeFilter !== "all" ? formatEventTypeLabel(eventTypeFilter) : null,
    verificationFilter !== "all" ? formatVerificationOptionLabel(verificationFilter) : null,
    searchValue.trim() ? `Search ${searchValue.trim()}` : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : "Saved event view";
}

function formatEventTypeLabel(value: TaskTimelineEventTypeFilter): string {
  switch (value) {
    case "app_control":
      return "App OS receipts";
    case "app_control_applied":
      return "Applied";
    case "app_control_reverted":
      return "Reverted";
    default:
      return "All events";
  }
}

function formatVerificationOptionLabel(value: TaskTimelineVerificationFilter): string {
  switch (value) {
    case "verified_only":
      return "Verified only";
    case "assumed_present":
      return "Has assumed";
    case "not_recorded":
      return "Not recorded";
    default:
      return "All posture";
  }
}

function createSavedView(
  eventTypeFilter: TaskTimelineEventTypeFilter,
  verificationFilter: TaskTimelineVerificationFilter,
  searchValue: string,
): TaskTimelineSavedView {
  return {
    id: `saved-view-${Date.now()}`,
    label: buildSavedViewLabel(eventTypeFilter, verificationFilter, searchValue),
    eventTypeFilter,
    verificationFilter,
    searchValue,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };
}

function upsertSavedView(
  current: TaskTimelineSavedView[],
  eventTypeFilter: TaskTimelineEventTypeFilter,
  verificationFilter: TaskTimelineVerificationFilter,
  searchValue: string,
): { views: TaskTimelineSavedView[]; feedback: TaskTimelineSaveFeedback } {
  const matchingView = current.find((entry) => (
    entry.eventTypeFilter === eventTypeFilter
    && entry.verificationFilter === verificationFilter
    && entry.searchValue === searchValue
  ));

  if (!matchingView) {
    const nextView = createSavedView(eventTypeFilter, verificationFilter, searchValue);
    return {
      views: [nextView, ...current].slice(0, 6),
      feedback: {
        label: "Saved new view",
        detail: `Saved ${nextView.label} for this browser session.`,
      },
    };
  }

  const refreshedView = {
    ...matchingView,
    createdAt: new Date().toISOString(),
  };

  return {
    views: [refreshedView, ...current.filter((entry) => entry.id !== matchingView.id)],
    feedback: {
      label: "Updated saved view",
      detail: `Refreshed ${matchingView.label} instead of creating a duplicate saved view.`,
    },
  };
}

function loadSavedViews(storageKey: string | null): TaskTimelineSavedView[] {
  if (typeof window === "undefined" || !storageKey) {
    return [];
  }

  const rawValue = window.sessionStorage.getItem(storageKey);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isTaskTimelineSavedView).slice(0, 6);
  } catch {
    return [];
  }
}

function isTaskTimelineSavedView(value: unknown): value is TaskTimelineSavedView {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<TaskTimelineSavedView>;
  return typeof candidate.id === "string"
    && typeof candidate.label === "string"
    && typeof candidate.createdAt === "string"
    && (candidate.lastUsedAt === undefined || candidate.lastUsedAt === null || typeof candidate.lastUsedAt === "string")
    && isTaskTimelineEventTypeFilter(candidate.eventTypeFilter)
    && isTaskTimelineVerificationFilter(candidate.verificationFilter)
    && typeof candidate.searchValue === "string";
}

function getActiveTimelineStateStorageKey(savedViewsStorageKey: string | null): string | null {
  return savedViewsStorageKey ? `${savedViewsStorageKey}-active-state` : null;
}

function getLastNonEmptyTimelineStateStorageKey(savedViewsStorageKey: string | null): string | null {
  return savedViewsStorageKey ? `${savedViewsStorageKey}-last-non-empty-state` : null;
}

function loadActiveTimelineState(storageKey: string | null): TaskTimelineActiveState | null {
  if (typeof window === "undefined" || !storageKey) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(storageKey);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return isTaskTimelineActiveState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isTaskTimelineActiveState(value: unknown): value is TaskTimelineActiveState {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<TaskTimelineActiveState>;
  return isTaskTimelineEventTypeFilter(candidate.eventTypeFilter)
    && isTaskTimelineVerificationFilter(candidate.verificationFilter)
    && typeof candidate.searchValue === "string";
}

function isTaskTimelineEventTypeFilter(value: unknown): value is TaskTimelineEventTypeFilter {
  return value === "all"
    || value === "app_control"
    || value === "app_control_applied"
    || value === "app_control_reverted";
}

function isTaskTimelineVerificationFilter(value: unknown): value is TaskTimelineVerificationFilter {
  return value === "all"
    || value === "verified_only"
    || value === "assumed_present"
    || value === "not_recorded";
}
