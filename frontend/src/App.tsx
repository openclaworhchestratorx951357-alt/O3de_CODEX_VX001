import { Suspense, lazy, useEffect, useRef, useState, type CSSProperties } from "react";

import DesktopShell from "./components/DesktopShell";
import FirstRunTour from "./components/FirstRunTour";
import LayoutHeader from "./components/LayoutHeader";
import WorkspaceNextStepsPanel, {
  type WorkspaceNextStepEntry,
  type WorkspaceNextStepRecentAction,
} from "./components/WorkspaceNextStepsPanel";
import RecommendedActionsPanel from "./components/RecommendedActionsPanel";
import AppControlCommandCenter from "./components/AppControlCommandCenter";
import HomeWorkspaceView from "./components/workspaces/HomeWorkspaceView";
import SettingsPanel from "./components/SettingsPanel";
import type { HomeOverviewPanelDeckProps } from "./components/HomeOverviewPanelDeck";
import {
  getShellQuickStatGuide,
  getShellWorkspaceGuide,
  getShellWorkspaceSurfaceGuide,
  operatorGuideShellApp,
} from "./content/operatorGuideShell";
import {
  approveApproval,
  fetchAdapters,
  fetchApprovalCards,
  fetchArtifact,
  fetchArtifactCardsForTruthFilter,
  cleanupO3deBridgeResults,
  fetchControlPlaneSummary,
  fetchCockpitAppRegistry,
  fetchO3deBridge,
  fetchExecutor,
  fetchExecutors,
  fetchExecution,
  fetchExecutionCardsForTruthFilter,
  fetchEvents,
  fetchEventCards,
  fetchEventDetail,
  fetchEventSummary,
  fetchLockCards,
  fetchRun,
  fetchRunCards,
  fetchRunsSummaryForFilter,
  fetchPolicies,
  fetchReadiness,
  fetchToolsCatalog,
  fetchWorkspace,
  fetchWorkspaces,
  rejectApproval,
} from "./lib/api";
import {
  describeArtifactPriority,
  describeExecutionAttention,
  describeExecutionPriority,
  getPreferredArtifact,
  getPreferredExecution,
  recommendExecutionAction,
} from "./lib/recordPriority";
import {
  activateArtifactLaneFromOverview,
  activateExecutionLaneFromOverview,
  activateRunsLaneFromOverview,
  buildOverviewAutoOpenHint,
  createNeutralTruthFilter,
  createFallbackCategoryTruthFilter,
  createInspectionSurfaceTruthFilter,
  createManifestSourceTruthFilter,
  createTruthFilterForDimension,
  formatOverviewFocusLabel,
  formatTruthFilterFocusLabel,
  resetLaneFocus,
  resetPresetLaneFocus,
} from "./lib/laneController";
import { buildHomeRecommendationDescriptors, type HomeRecommendationActionId } from "./lib/recommendations";
import {
  buildCockpitAppRegistryByWorkspaceId,
  cockpitAppRegistry,
  resolveCockpitAppRegistry,
  type CockpitAppRegistration,
  type CockpitWorkspaceId,
} from "./lib/cockpitAppRegistry";
import {
  addAllowlistedMeshMissionPromptDraft,
  cinematicPlacementProofOnlyMissionPromptDraft,
  createCinematicCameraPlaceholderMissionPromptDraft,
  createGameEntityMissionPromptDraft,
  inspectCinematicTargetMissionPromptDraft,
  inspectLoadProjectMissionPromptDraft,
  inspectProjectMissionPromptDraft,
  placementProofOnlyMissionPromptDraft,
  type MissionPromptDraft,
} from "./lib/missionPromptTemplates";
import type { PlacementProofOnlyReviewSnapshot } from "./lib/promptPlacementProofOnlyReview";
import { useSettings } from "./lib/settings/hooks";
import type { FocusedSection, TruthFilterState } from "./lib/laneController";
import type {
  ArtifactListItem,
  ArtifactRecord,
  AdaptersResponse,
  ApprovalListItem,
  AssetForgePromptTemplateRecord,
  CatalogAgent,
  ControlPlaneSummaryResponse,
  ExecutorRecord,
  ExecutionRecord,
  ExecutionListItem,
  EventListItem,
  EventDetailResponse,
  EventRecord,
  EventSummaryResponse,
  LockListItem,
  O3DEBridgeStatus,
  ReadinessStatus,
  RunAuditRecord,
  RunListItem,
  ResponseEnvelope,
  RunRecord,
  SettingsPatchAuditSummary,
  ToolPolicy,
  WorkspaceRecord,
} from "./types/contracts";

const OperationsWorkspaceDesktop = lazy(() => import("./components/workspaces/OperationsWorkspaceDesktop"));
const AIAssetForgePanel = lazy(() => import("./components/AIAssetForgePanel"));
const HomeOverviewPanelDeck = lazy(() => import("./components/HomeOverviewPanelDeck"));
const AppCapabilityDashboardShell = lazy(() => import("./components/AppCapabilityDashboardShell"));
const AppAuditReviewDashboardShell = lazy(() => import("./components/AppAuditReviewDashboardShell"));
const AppEvidenceTimelineShell = lazy(() => import("./components/AppEvidenceTimelineShell"));
const AppApprovalSessionDashboardShell = lazy(() => import("./components/AppApprovalSessionDashboardShell"));
const AppWorkspaceStatusChipsShell = lazy(() => import("./components/AppWorkspaceStatusChipsShell"));
const OperatorGuidePanel = lazy(() => import("./components/OperatorGuidePanel"));
const BuilderWorkspaceDesktop = lazy(() => import("./components/workspaces/BuilderWorkspaceDesktop"));
const PromptWorkspaceDesktop = lazy(() => import("./components/workspaces/PromptWorkspaceDesktop"));
const RecordsWorkspaceDesktop = lazy(() => import("./components/workspaces/RecordsWorkspaceDesktop"));
const RuntimeWorkspaceDesktop = lazy(() => import("./components/workspaces/RuntimeWorkspaceDesktop"));
const CreateGameWorkspaceView = lazy(() => import("./components/workspaces/CreateGameWorkspaceView"));
const CreateMovieWorkspaceView = lazy(() => import("./components/workspaces/CreateMovieWorkspaceView"));
const LoadProjectWorkspaceView = lazy(() => import("./components/workspaces/LoadProjectWorkspaceView"));

type ToolsCatalog = {
  agents: CatalogAgent[];
};

type DetailBreadcrumb = {
  kind: "run" | "execution" | "artifact";
  id: string;
  label: string;
};

type PinnedRecord = {
  kind: "run" | "execution" | "artifact";
  id: string;
  label: string;
  summary?: string | null;
};

type PinnedRecordStatus = {
  label: string;
  detail: string;
};

type LaneProgression = {
  label: string;
  detail: string;
  actionLabel: string;
  kind: "run" | "execution" | "artifact";
  id: string;
};

type LaneCompletionState = {
  label: string;
  detail: string;
};

type LaneMetrics = {
  label: string;
  detail: string;
  driverLabel: string;
  driverDetail: string;
  remainingCount: number;
  traversedCount: number;
  totalCount: number;
};

type LaneFilterMode = "all" | "warnings" | "audit_risk" | "simulated_only";

type LaneMemory = {
  pinnedKind: "run" | "execution" | "artifact";
  pinnedId: string;
  pinnedLabel: string;
  filterLabel: string;
  currentSelectionLabel: string;
  detail: string;
};

type LaneHistoryEntry = {
  kind: "run" | "execution" | "artifact";
  id: string;
  label: string;
  detail: string;
};

type LaneReadiness = {
  label: string;
  detail: string;
};

type LaneRecoveryAction = {
  label: string;
  mode: LaneFilterMode;
};

type LaneHandoffSummary = {
  label: string;
  detail: string;
};

type LaneOperatorNoteEntry = {
  text: string;
  updatedAt: string;
  pinnedLabel: string;
};

type LaneOperatorNote = {
  label: string;
  detail: string;
  text: string;
};

type LaneExportStatus = {
  label: string;
  detail: string;
};

type LanePreset = {
  id: "execution_warnings" | "artifact_audit_risk" | "simulated_review";
  label: string;
  detail: string;
  available: boolean;
  availabilityDetail: string;
};

type LanePresetStatus = {
  activeLabel: string;
  activeDetail: string;
  restoredLabel: string | null;
  restoredDetail: string | null;
  driftLabel: string | null;
  driftDetail: string | null;
};

type LanePresetSource = "manual" | "session";

type DesktopWorkspaceId =
  | "home"
  | CockpitWorkspaceId
  | "prompt"
  | "builder"
  | "operations"
  | "runtime"
  | "records";

type DesktopNavItemId = DesktopWorkspaceId;

function resolveInitialDesktopWorkspaceId(preferredWorkspaceId: string): DesktopWorkspaceId {
  if (preferredWorkspaceId === "home") {
    return "asset-forge";
  }

  if (
    preferredWorkspaceId === "create-game"
    || preferredWorkspaceId === "create-movie"
    || preferredWorkspaceId === "load-project"
    || preferredWorkspaceId === "asset-forge"
    || preferredWorkspaceId === "prompt"
    || preferredWorkspaceId === "builder"
    || preferredWorkspaceId === "operations"
    || preferredWorkspaceId === "runtime"
    || preferredWorkspaceId === "records"
  ) {
    return preferredWorkspaceId;
  }

  return "asset-forge";
}

function getInitialDesktopWorkspaceId(preferredWorkspaceId: string): DesktopWorkspaceId {
  if (typeof window !== "undefined") {
    const storedWorkspace = window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY);
    if (
      storedWorkspace === "home"
      || storedWorkspace === "create-game"
      || storedWorkspace === "create-movie"
      || storedWorkspace === "load-project"
      || storedWorkspace === "asset-forge"
      || storedWorkspace === "prompt"
      || storedWorkspace === "builder"
      || storedWorkspace === "operations"
      || storedWorkspace === "runtime"
      || storedWorkspace === "records"
    ) {
      return storedWorkspace;
    }
  }

  return resolveInitialDesktopWorkspaceId(preferredWorkspaceId);
}

type PromptLaunchDraftRequest = {
  requestId: string;
  draft: MissionPromptDraft;
  sourceSurfaceLabel?: string | null;
  launchedAtIso?: string | null;
  sourceWorkspaceId?: DesktopWorkspaceId | null;
};

type PromptSessionFocusRequest = {
  requestId: string;
  promptId: string;
  sourceSurfaceLabel?: string | null;
};

type PromptEvidenceContext = {
  id: string;
  promptSessionId: string;
  sourceWorkspaceId: DesktopWorkspaceId;
  sourceSurfaceLabel: string;
  openedAtIso: string;
};

type RecordsEvidenceContext = {
  id: string;
  targetKind: "run" | "execution" | "artifact";
  targetId: string;
  sourceWorkspaceId: DesktopWorkspaceId;
  sourceSurfaceLabel: string;
  openedAtIso: string;
  relatedPromptSessionId?: string;
};

type PromptTemplateChooserEntry = {
  id: string;
  label: string;
  detail: string;
  truthState: string;
  draft: MissionPromptDraft;
  sourceSurfaceLabel: string;
};

type PromptTemplateChooserContext = {
  id: string;
  sourceWorkspaceId: DesktopWorkspaceId;
  sourceSurfaceLabel: string;
  title: string;
  subtitle: string;
  openedAtIso: string;
  templates: PromptTemplateChooserEntry[];
  nextSafeAction: string;
};

type PromptReturnResumeChecklist = {
  id: string;
  sourceWorkspaceId: DesktopWorkspaceId;
  sourceSurfaceLabel: string;
  draftLabel: string;
  launchedAtIso: string | null;
  returnedAtIso: string;
  nextSafeAction: string;
};

type CockpitStageFocusHighlight = {
  id: string;
  workspaceId: DesktopWorkspaceId;
  stageLabel: string;
  stageDetail: string;
  sourceDraftLabel: string;
  sourceSurfaceLabel: string;
  setAtIso: string;
};

type OperationsSurfaceId =
  | "dispatch"
  | "agents"
  | "approvals"
  | "timeline";

type RuntimeSurfaceId =
  | "overview"
  | "executors"
  | "workspaces"
  | "governance";

type RecordsSurfaceId =
  | "runs"
  | "executions"
  | "artifacts"
  | "events";

type AuditFilter =
  | "all"
  | "preflight"
  | "blocked"
  | "succeeded"
  | "rolled_back"
  | "other";

type ToolFilter = "all" | "settings.patch";
type RefreshScope = "full" | "overview" | "records";
type RefreshTarget =
  | "catalog"
  | "adapters"
  | "system status"
  | "operator overview"
  | "policies"
  | "approvals"
  | "events"
  | "executors"
  | "locks"
  | "runs"
  | "executions"
  | "artifacts"
  | "workspaces"
  | "selected executor detail"
  | "selected execution detail"
  | "selected artifact detail"
  | "selected workspace detail";

type RunsOverviewContextKind =
  | "status"
  | "inspection_surface"
  | "fallback_category"
  | "manifest_source_of_truth";

type ExecutionsOverviewContextKind =
  | "execution_mode"
  | "inspection_surface"
  | "fallback_category"
  | "manifest_source_of_truth";

type ArtifactsOverviewContextKind =
  | "artifact_mode"
  | "inspection_surface"
  | "fallback_category"
  | "manifest_source_of_truth";

type ExecutorsOverviewContextKind = "availability_state";

type WorkspacesOverviewContextKind = "workspace_state";

type OverviewContextHistoryEntry<TKind extends string> = {
  id: string;
  focusLabel: string;
  originLabel: string;
  value: string;
  kind: TKind;
};

type OverviewContextPresetEntry<TKind extends string> = {
  id: string;
  focusLabel: string;
  originLabel: string;
  value: string;
  kind: TKind;
  savedAt: string;
};

type OverviewReviewDisposition = "in_queue" | "reviewed" | "snoozed";

type OverviewReviewState = {
  disposition: OverviewReviewDisposition;
  updatedAt: string;
};

type OverviewContextNote = {
  text: string;
  updatedAt: string;
};

type OverviewSessionSnapshotBaseline = {
  copiedAt: string;
  contexts: Partial<Record<OverviewContextId, {
    reviewDisposition: OverviewReviewDisposition;
    noteUpdatedAt: string | null;
    hasDrift: boolean;
  }>>;
};

type OverviewContextId =
  | "runs"
  | "executions"
  | "artifacts"
  | "executors"
  | "workspaces";

type OverviewContextMemoryEntry = {
  id: OverviewContextId;
  laneLabel: string;
  focusLabel: string;
  originLabel: string;
  savedAt: string;
  triageLabel: string | null;
  reviewDisposition: OverviewReviewDisposition;
  noteText: string;
  lastReviewedLabel: string | null;
  lastReviewedDetail: string | null;
  nextSuggestedCheck: string | null;
};

type OverviewReviewDiagnosticEntry = {
  id: OverviewContextId;
  label: string;
  savedAt: string;
  reviewState: OverviewReviewState | null;
  hasDrift: boolean;
};

type ReadinessDiagnosticEntry = {
  id: OverviewContextId;
  laneLabel: string;
  focusLabel: string;
  ready: boolean;
  summaryLabel: string;
  detail: string;
};

const OVERVIEW_CONTEXT_IDS: OverviewContextId[] = [
  "runs",
  "executions",
  "artifacts",
  "executors",
  "workspaces",
];

const ACTIVE_LANE_PRESET_SESSION_KEY = "o3de-control-app-active-lane-preset";
const LANE_OPERATOR_NOTES_SESSION_KEY = "o3de-control-app-lane-operator-notes";
const OVERVIEW_CONTEXT_PRESETS_SESSION_KEY = "o3de-control-app-overview-context-presets";
const OVERVIEW_REVIEW_STATE_SESSION_KEY = "o3de-control-app-overview-review-state";
const OVERVIEW_CONTEXT_NOTES_SESSION_KEY = "o3de-control-app-overview-context-notes";
const OVERVIEW_SESSION_SNAPSHOT_BASELINE_SESSION_KEY = "o3de-control-app-overview-session-snapshot-baseline";
const ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY = "o3de-control-app-active-desktop-workspace";
const ACTIVE_OPERATIONS_SURFACE_SESSION_KEY = "o3de-control-app-active-operations-surface";
const ACTIVE_RUNTIME_SURFACE_SESSION_KEY = "o3de-control-app-active-runtime-surface";
const ACTIVE_RECORDS_SURFACE_SESSION_KEY = "o3de-control-app-active-records-surface";
const EVENTS_TIMELINE_SAVED_VIEWS_SESSION_KEY = "o3de-control-app-events-timeline-saved-views";
const WORKSPACE_NEXT_STEP_RECENT_ACTIONS_SESSION_KEY = "o3de-control-app-workspace-next-step-recent-actions";
const WORKSPACE_NEXT_STEPS_COLLAPSED_SESSION_KEY = "o3de-control-app-workspace-next-steps-collapsed";
const MAX_WORKSPACE_NEXT_STEP_RECENT_ACTIONS = 4;
const MAX_EVENTS_TIMELINE_SAVED_VIEWS = 6;

function isWorkspaceNextStepRecentAction(value: unknown): value is WorkspaceNextStepRecentAction {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<WorkspaceNextStepRecentAction>;
  return typeof candidate.id === "string"
    && typeof candidate.stepId === "string"
    && typeof candidate.label === "string"
    && typeof candidate.actionLabel === "string"
    && (candidate.opensLabel === undefined || typeof candidate.opensLabel === "string")
    && typeof candidate.workspaceId === "string"
    && typeof candidate.workspaceLabel === "string"
    && typeof candidate.usedAt === "string";
}

function loadWorkspaceNextStepRecentActions(): WorkspaceNextStepRecentAction[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.sessionStorage.getItem(WORKSPACE_NEXT_STEP_RECENT_ACTIONS_SESSION_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter(isWorkspaceNextStepRecentAction).slice(0, MAX_WORKSPACE_NEXT_STEP_RECENT_ACTIONS)
      : [];
  } catch {
    return [];
  }
}

function loadWorkspaceNextStepsCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(WORKSPACE_NEXT_STEPS_COLLAPSED_SESSION_KEY) === "true";
}

type EventsTimelineSavedView = {
  id: string;
  label: string;
  eventTypeFilter: "all" | "app_control" | "app_control_applied" | "app_control_reverted";
  verificationFilter: "all" | "verified_only" | "assumed_present" | "not_recorded";
  searchValue: string;
  createdAt: string;
};

type EventsTimelineSavedViewFeedback = {
  label: string;
  detail: string;
  view: EventsTimelineSavedView;
};

function loadEventsTimelineSavedViews(): EventsTimelineSavedView[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.sessionStorage.getItem(EVENTS_TIMELINE_SAVED_VIEWS_SESSION_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.filter(isEventsTimelineSavedView).slice(0, MAX_EVENTS_TIMELINE_SAVED_VIEWS)
      : [];
  } catch {
    return [];
  }
}

function isEventsTimelineSavedView(value: unknown): value is EventsTimelineSavedView {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<EventsTimelineSavedView>;
  return typeof candidate.id === "string"
    && typeof candidate.label === "string"
    && typeof candidate.createdAt === "string"
    && typeof candidate.searchValue === "string"
    && (
      candidate.eventTypeFilter === "all"
      || candidate.eventTypeFilter === "app_control"
      || candidate.eventTypeFilter === "app_control_applied"
      || candidate.eventTypeFilter === "app_control_reverted"
    )
    && (
      candidate.verificationFilter === "all"
      || candidate.verificationFilter === "verified_only"
      || candidate.verificationFilter === "assumed_present"
      || candidate.verificationFilter === "not_recorded"
    );
}

export default function App() {
  const { settings, saveSettings } = useSettings();
  const [lastResponse, setLastResponse] = useState<ResponseEnvelope | null>(null);
  const [catalogAgents, setCatalogAgents] = useState<CatalogAgent[]>([]);
  const [cockpitRegistrations, setCockpitRegistrations] = useState<readonly CockpitAppRegistration[]>(
    cockpitAppRegistry,
  );
  const [approvals, setApprovals] = useState<ApprovalListItem[]>([]);
  const [adapters, setAdapters] = useState<AdaptersResponse | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactListItem[]>([]);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [eventRecords, setEventRecords] = useState<EventRecord[]>([]);
  const [eventSummary, setEventSummary] = useState<EventSummaryResponse>({
    app_control: {
      total_events: 0,
      applied_events: 0,
      reverted_events: 0,
      verified_only_events: 0,
      assumed_present_events: 0,
      verification_not_recorded_events: 0,
    },
  });
  const [executors, setExecutors] = useState<ExecutorRecord[]>([]);
  const [executions, setExecutions] = useState<ExecutionListItem[]>([]);
  const [locks, setLocks] = useState<LockListItem[]>([]);
  const [policies, setPolicies] = useState<ToolPolicy[]>([]);
  const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
  const [o3deBridgeStatus, setO3deBridgeStatus] = useState<O3DEBridgeStatus | null>(null);
  const [o3deBridgeCleanupBusy, setO3deBridgeCleanupBusy] = useState(false);
  const [o3deBridgeCleanupStatus, setO3deBridgeCleanupStatus] = useState<string | null>(null);
  const [controlPlaneSummary, setControlPlaneSummary] =
    useState<ControlPlaneSummaryResponse | null>(null);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [runAudits, setRunAudits] = useState<RunAuditRecord[]>([]);
  const [settingsPatchAuditSummary, setSettingsPatchAuditSummary] =
    useState<SettingsPatchAuditSummary | null>(null);
  const [selectedExecutorId, setSelectedExecutorId] = useState<string | null>(null);
  const [selectedExecutor, setSelectedExecutor] = useState<ExecutorRecord | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceRecord | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [selectedExecutionDetails, setSelectedExecutionDetails] =
    useState<Record<string, unknown> | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactRecord | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventDetail, setSelectedEventDetail] = useState<EventDetailResponse | null>(null);
  const [runDetailRefreshHint, setRunDetailRefreshHint] = useState<string | null>(null);
  const [executionDetailRefreshHint, setExecutionDetailRefreshHint] = useState<string | null>(null);
  const [artifactDetailRefreshHint, setArtifactDetailRefreshHint] = useState<string | null>(null);
  const [operatorOverviewRefreshedAt, setOperatorOverviewRefreshedAt] = useState<string | null>(null);
  const [dashboardRefreshedAt, setDashboardRefreshedAt] = useState<string | null>(null);
  const [dashboardRefreshStatus, setDashboardRefreshStatus] = useState<string | null>(null);
  const [dashboardRefreshDetail, setDashboardRefreshDetail] = useState<string | null>(null);
  const [overviewRefreshing, setOverviewRefreshing] = useState(false);
  const [recordsRefreshing, setRecordsRefreshing] = useState(false);
  const [approvalsRefreshing, setApprovalsRefreshing] = useState(false);
  const [eventsRefreshing, setEventsRefreshing] = useState(false);
  const [executorDetailRefreshing, setExecutorDetailRefreshing] = useState(false);
  const [workspaceDetailRefreshing, setWorkspaceDetailRefreshing] = useState(false);
  const [runDetailRefreshing, setRunDetailRefreshing] = useState(false);
  const [executionDetailRefreshing, setExecutionDetailRefreshing] = useState(false);
  const [artifactDetailRefreshing, setArtifactDetailRefreshing] = useState(false);
  const [eventDetailRefreshing, setEventDetailRefreshing] = useState(false);
  const [executorsRefreshedAt, setExecutorsRefreshedAt] = useState<string | null>(null);
  const [workspacesRefreshedAt, setWorkspacesRefreshedAt] = useState<string | null>(null);
  const [executorDetailRefreshedAt, setExecutorDetailRefreshedAt] = useState<string | null>(null);
  const [workspaceDetailRefreshedAt, setWorkspaceDetailRefreshedAt] = useState<string | null>(null);
  const [runDetailRefreshedAt, setRunDetailRefreshedAt] = useState<string | null>(null);
  const [executionDetailRefreshedAt, setExecutionDetailRefreshedAt] = useState<string | null>(null);
  const [artifactDetailRefreshedAt, setArtifactDetailRefreshedAt] = useState<string | null>(null);
  const [eventDetailRefreshedAt, setEventDetailRefreshedAt] = useState<string | null>(null);
  const [runDetailBreadcrumbs, setRunDetailBreadcrumbs] = useState<DetailBreadcrumb[]>([]);
  const [executionDetailBreadcrumbs, setExecutionDetailBreadcrumbs] = useState<DetailBreadcrumb[]>([]);
  const [artifactDetailBreadcrumbs, setArtifactDetailBreadcrumbs] = useState<DetailBreadcrumb[]>([]);
  const [pinnedRecord, setPinnedRecord] = useState<PinnedRecord | null>(null);
  const [laneFilterMode, setLaneFilterMode] = useState<LaneFilterMode>("all");
  const [laneMemory, setLaneMemory] = useState<LaneMemory | null>(null);
  const [laneHistory, setLaneHistory] = useState<LaneHistoryEntry[]>([]);
  const [activeLanePresetId, setActiveLanePresetId] = useState<LanePreset["id"] | null>(null);
  const [activeLanePresetSource, setActiveLanePresetSource] = useState<LanePresetSource>("manual");
  const [lanePresetRestoredAt, setLanePresetRestoredAt] = useState<string | null>(null);
  const [pendingLanePresetRestoreId, setPendingLanePresetRestoreId] =
    useState<LanePreset["id"] | null>(null);
  const [laneHandoffSummary, setLaneHandoffSummary] = useState<LaneHandoffSummary | null>(null);
  const [laneOperatorNotes, setLaneOperatorNotes] = useState<Record<string, LaneOperatorNoteEntry>>({});
  const [laneOperatorNoteDraft, setLaneOperatorNoteDraft] = useState("");
  const [laneExportStatus, setLaneExportStatus] = useState<LaneExportStatus | null>(null);
  const initialWorkspaceId = getInitialDesktopWorkspaceId(settings.layout.preferredLandingSection);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<DesktopWorkspaceId>(initialWorkspaceId);
  const [visitedWorkspaceIds, setVisitedWorkspaceIds] = useState<DesktopWorkspaceId[]>([
    initialWorkspaceId,
  ]);
  const [promptLaunchDraftRequest, setPromptLaunchDraftRequest] =
    useState<PromptLaunchDraftRequest | null>(null);
  const [promptSessionFocusRequest, setPromptSessionFocusRequest] =
    useState<PromptSessionFocusRequest | null>(null);
  const [promptEvidenceContext, setPromptEvidenceContext] =
    useState<PromptEvidenceContext | null>(null);
  const [recordsEvidenceContext, setRecordsEvidenceContext] =
    useState<RecordsEvidenceContext | null>(null);
  const [promptTemplateChooserContext, setPromptTemplateChooserContext] =
    useState<PromptTemplateChooserContext | null>(null);
  const [latestPlacementProofOnlyReview, setLatestPlacementProofOnlyReview] =
    useState<PlacementProofOnlyReviewSnapshot | null>(null);
  const [promptReturnResumeChecklist, setPromptReturnResumeChecklist] =
    useState<PromptReturnResumeChecklist | null>(null);
  const [cockpitStageFocusHighlight, setCockpitStageFocusHighlight] =
    useState<CockpitStageFocusHighlight | null>(null);
  const [activeOperationsSurface, setActiveOperationsSurface] =
    useState<OperationsSurfaceId>("dispatch");
  const [activeRuntimeSurface, setActiveRuntimeSurface] =
    useState<RuntimeSurfaceId>("overview");
  const [activeRecordsSurface, setActiveRecordsSurface] =
    useState<RecordsSurfaceId>("runs");
  const [workspaceNextStepRecentActions, setWorkspaceNextStepRecentActions] =
    useState<WorkspaceNextStepRecentAction[]>(() => loadWorkspaceNextStepRecentActions());
  const [workspaceNextStepsCollapsed, setWorkspaceNextStepsCollapsed] =
    useState(() => loadWorkspaceNextStepsCollapsed());
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [adaptersError, setAdaptersError] = useState<string | null>(null);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [executorsError, setExecutorsError] = useState<string | null>(null);
  const [executionsError, setExecutionsError] = useState<string | null>(null);
  const [locksError, setLocksError] = useState<string | null>(null);
  const [policiesError, setPoliciesError] = useState<string | null>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [o3deBridgeError, setO3deBridgeError] = useState<string | null>(null);
  const [controlPlaneSummaryError, setControlPlaneSummaryError] = useState<string | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [workspacesError, setWorkspacesError] = useState<string | null>(null);
  const [selectedRunError, setSelectedRunError] = useState<string | null>(null);
  const [selectedExecutorError, setSelectedExecutorError] = useState<string | null>(null);
  const [selectedWorkspaceError, setSelectedWorkspaceError] = useState<string | null>(null);
  const [selectedEventError, setSelectedEventError] = useState<string | null>(null);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [adaptersLoading, setAdaptersLoading] = useState(true);
  const [artifactsLoading, setArtifactsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [executorsLoading, setExecutorsLoading] = useState(true);
  const [executionsLoading, setExecutionsLoading] = useState(true);
  const [locksLoading, setLocksLoading] = useState(true);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [o3deBridgeLoading, setO3deBridgeLoading] = useState(true);
  const [controlPlaneSummaryLoading, setControlPlaneSummaryLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [selectedRunLoading, setSelectedRunLoading] = useState(false);
  const [selectedExecutorLoading, setSelectedExecutorLoading] = useState(false);
  const [selectedExecutionLoading, setSelectedExecutionLoading] = useState(false);
  const [selectedArtifactLoading, setSelectedArtifactLoading] = useState(false);
  const [selectedWorkspaceLoading, setSelectedWorkspaceLoading] = useState(false);
  const [selectedEventLoading, setSelectedEventLoading] = useState(false);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
  const [assetForgeHeaderHeight, setAssetForgeHeaderHeight] = useState(0);
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);
  const [selectedExecutionError, setSelectedExecutionError] = useState<string | null>(null);
  const [selectedArtifactError, setSelectedArtifactError] = useState<string | null>(null);
  const [selectedToolFilter, setSelectedToolFilter] =
    useState<ToolFilter>("all");
  const [selectedAuditFilter, setSelectedAuditFilter] =
    useState<AuditFilter>("all");
  const [runsRefreshedAt, setRunsRefreshedAt] = useState<string | null>(null);
  const [approvalsRefreshedAt, setApprovalsRefreshedAt] = useState<string | null>(null);
  const [artifactsRefreshedAt, setArtifactsRefreshedAt] = useState<string | null>(null);
  const [executionsRefreshedAt, setExecutionsRefreshedAt] = useState<string | null>(null);
  const [eventsRefreshedAt, setEventsRefreshedAt] = useState<string | null>(null);
  const [runsSearchPreset, setRunsSearchPreset] = useState<string | null>(null);
  const [approvalsSearchPreset, setApprovalsSearchPreset] = useState<string | null>(null);
  const [artifactsSearchPreset, setArtifactsSearchPreset] = useState<string | null>(null);
  const [executorsSearchPreset, setExecutorsSearchPreset] = useState<string | null>(null);
  const [executionsSearchPreset, setExecutionsSearchPreset] = useState<string | null>(null);
  const [eventsSearchPreset, setEventsSearchPreset] = useState<string | null>(null);
  const [eventsEventTypePreset, setEventsEventTypePreset] =
    useState<"all" | "app_control" | "app_control_applied" | "app_control_reverted">("all");
  const [eventsVerificationPreset, setEventsVerificationPreset] =
    useState<"all" | "verified_only" | "assumed_present" | "not_recorded">("all");
  const [workspacesSearchPreset, setWorkspacesSearchPreset] = useState<string | null>(null);
  const [artifactTruthFilter, setArtifactTruthFilter] = useState<TruthFilterState>(
    createNeutralTruthFilter(),
  );
  const [executionTruthFilter, setExecutionTruthFilter] = useState<TruthFilterState>(
    createNeutralTruthFilter(),
  );
  const [runTruthFilter, setRunTruthFilter] = useState<TruthFilterState>(
    createNeutralTruthFilter(),
  );
  const [runsFocusLabel, setRunsFocusLabel] = useState<string | null>(null);
  const [approvalsFocusLabel, setApprovalsFocusLabel] = useState<string | null>(null);
  const [artifactsFocusLabel, setArtifactsFocusLabel] = useState<string | null>(null);
  const [executorsFocusLabel, setExecutorsFocusLabel] = useState<string | null>(null);
  const [executionsFocusLabel, setExecutionsFocusLabel] = useState<string | null>(null);
  const [eventsFocusLabel, setEventsFocusLabel] = useState<string | null>(null);
  const [eventsSavedViewFeedback, setEventsSavedViewFeedback] =
    useState<EventsTimelineSavedViewFeedback | null>(null);
  const [workspacesFocusLabel, setWorkspacesFocusLabel] = useState<string | null>(null);
  const [runsOverviewContextHistory, setRunsOverviewContextHistory] = useState<
    OverviewContextHistoryEntry<RunsOverviewContextKind>[]
  >([]);
  const [executionsOverviewContextHistory, setExecutionsOverviewContextHistory] = useState<
    OverviewContextHistoryEntry<ExecutionsOverviewContextKind>[]
  >([]);
  const [artifactsOverviewContextHistory, setArtifactsOverviewContextHistory] = useState<
    OverviewContextHistoryEntry<ArtifactsOverviewContextKind>[]
  >([]);
  const [executorsOverviewContextHistory, setExecutorsOverviewContextHistory] = useState<
    OverviewContextHistoryEntry<ExecutorsOverviewContextKind>[]
  >([]);
  const [workspacesOverviewContextHistory, setWorkspacesOverviewContextHistory] = useState<
    OverviewContextHistoryEntry<WorkspacesOverviewContextKind>[]
  >([]);
  const [runsOverviewContextPreset, setRunsOverviewContextPreset] = useState<
    OverviewContextPresetEntry<RunsOverviewContextKind> | null
  >(null);
  const [executionsOverviewContextPreset, setExecutionsOverviewContextPreset] = useState<
    OverviewContextPresetEntry<ExecutionsOverviewContextKind> | null
  >(null);
  const [artifactsOverviewContextPreset, setArtifactsOverviewContextPreset] = useState<
    OverviewContextPresetEntry<ArtifactsOverviewContextKind> | null
  >(null);
  const [executorsOverviewContextPreset, setExecutorsOverviewContextPreset] = useState<
    OverviewContextPresetEntry<ExecutorsOverviewContextKind> | null
  >(null);
  const [workspacesOverviewContextPreset, setWorkspacesOverviewContextPreset] = useState<
    OverviewContextPresetEntry<WorkspacesOverviewContextKind> | null
  >(null);
  const [overviewReviewState, setOverviewReviewState] = useState<
    Partial<Record<OverviewContextId, OverviewReviewState>>
  >({});
  const [overviewContextNotes, setOverviewContextNotes] = useState<
    Partial<Record<OverviewContextId, OverviewContextNote>>
  >({});
  const [overviewSessionSnapshotBaseline, setOverviewSessionSnapshotBaseline] = useState<
    OverviewSessionSnapshotBaseline | null
  >(null);
  const [activeFocusedSection, setActiveFocusedSection] = useState<FocusedSection | null>(null);
  const [updatedFocusedSection, setUpdatedFocusedSection] = useState<FocusedSection | null>(null);
  const [runsSearchVersion, setRunsSearchVersion] = useState(0);
  const [approvalsSearchVersion, setApprovalsSearchVersion] = useState(0);
  const [artifactsSearchVersion, setArtifactsSearchVersion] = useState(0);
  const [executorsSearchVersion, setExecutorsSearchVersion] = useState(0);
  const [executionsSearchVersion, setExecutionsSearchVersion] = useState(0);
  const [eventsSearchVersion, setEventsSearchVersion] = useState(0);
  const [workspacesSearchVersion, setWorkspacesSearchVersion] = useState(0);
  const approvalsSectionRef = useRef<HTMLElement | null>(null);
  const artifactsSectionRef = useRef<HTMLDivElement | null>(null);
  const executorsSectionRef = useRef<HTMLDivElement | null>(null);
  const executionsSectionRef = useRef<HTMLDivElement | null>(null);
  const eventsSectionRef = useRef<HTMLDivElement | null>(null);
  const runsSectionRef = useRef<HTMLDivElement | null>(null);
  const workspacesSectionRef = useRef<HTMLDivElement | null>(null);
  const executorDetailSectionRef = useRef<HTMLDivElement | null>(null);
  const runDetailSectionRef = useRef<HTMLDivElement | null>(null);
  const executionDetailSectionRef = useRef<HTMLDivElement | null>(null);
  const artifactDetailSectionRef = useRef<HTMLDivElement | null>(null);
  const eventDetailSectionRef = useRef<HTMLDivElement | null>(null);
  const workspaceDetailSectionRef = useRef<HTMLDivElement | null>(null);
  const assetForgeHeaderRef = useRef<HTMLElement | null>(null);
  const announceRunDetailRefreshRef = useRef(false);
  const bridgeFollowupRefreshTimeoutRef = useRef<number | null>(null);
  const relatedExecutionPriority = selectedRunId
    ? getPreferredExecutionReasonForRun(selectedRunId)
    : null;
  const relatedExecutionAction = selectedRunId
    ? getPreferredExecutionActionForRun(selectedRunId)
    : null;
  const relatedExecutionAttention = selectedRunId
    ? getPreferredExecutionAttentionForRun(selectedRunId)
    : null;
  const relatedArtifactExecution = selectedArtifact
    ? executions.find((execution) => execution.id === selectedArtifact.execution_id) ?? null
    : null;
  const relatedArtifactRun = selectedArtifact
    ? runs.find((run) => run.id === selectedArtifact.run_id) ?? null
    : null;
  const runOriginArtifact = selectedRunId && selectedArtifact?.run_id === selectedRunId
    ? selectedArtifact
    : null;
  const executionOriginArtifact = selectedExecutionId && selectedArtifact?.execution_id === selectedExecutionId
    ? selectedArtifact
    : null;
  const selectedRunPreferredExecution = selectedRunId
    ? getPreferredExecutionForRun(selectedRunId)
    : null;
  const selectedRunWarningExecution = selectedRunId
    ? getWarningBearingExecutionForRun(selectedRunId)
    : null;
  const selectedExecutionPreferredArtifact = selectedExecution
    ? getPreferredArtifact(
        artifacts.filter((artifact) => artifact.execution_id === selectedExecution.id),
      )
    : null;
  const selectedExecutionHighestRiskArtifact = selectedExecution
    ? getHighestRiskArtifact(
        artifacts.filter((artifact) => artifact.execution_id === selectedExecution.id),
      )
    : null;
  const selectedArtifactSiblingPriority = selectedArtifact
    ? getPreferredArtifact(
        artifacts.filter(
          (artifact) => artifact.execution_id === selectedArtifact.execution_id && artifact.id !== selectedArtifact.id,
        ),
      )
    : null;
  const selectedArtifactHighestRiskSibling = selectedArtifact
    ? getHighestRiskArtifact(
        artifacts.filter(
          (artifact) => artifact.execution_id === selectedArtifact.execution_id && artifact.id !== selectedArtifact.id,
        ),
      )
    : null;
  const selectedExecutorPreferredExecution = selectedExecutor
    ? getPreferredExecution(
        executions.filter((execution) => execution.executor_id === selectedExecutor.id),
      )
    : null;
  const selectedExecutorPreferredArtifact = selectedExecutor
    ? getPreferredArtifact(
        artifacts.filter((artifact) => artifact.executor_id === selectedExecutor.id),
      )
    : null;
  const selectedWorkspacePreferredExecution = selectedWorkspace
    ? getPreferredExecution(
        executions.filter((execution) => execution.workspace_id === selectedWorkspace.id),
      )
    : null;
  const selectedWorkspacePreferredArtifact = selectedWorkspace
    ? getPreferredArtifact(
        artifacts.filter((artifact) => artifact.workspace_id === selectedWorkspace.id),
      )
    : null;
  const selectedEvent = selectedEventDetail?.event
    ?? (selectedEventId
      ? eventRecords.find((event) => event.id === selectedEventId) ?? null
      : null);
  const nextPinnedLaneRecord = getNextPinnedLaneRecord(
    pinnedRecord,
    runs,
    executions,
    artifacts,
    selectedRunId,
    selectedExecutionId,
    selectedArtifactId,
    laneFilterMode,
  );
  const pinnedLaneCompletionState = getPinnedLaneCompletionState(
    pinnedRecord,
    nextPinnedLaneRecord,
    runs,
    executions,
    artifacts,
    laneFilterMode,
  );
  const pinnedLaneRolloverRecord = getPinnedLaneRolloverRecord(
    pinnedRecord,
    runs,
    executions,
    artifacts,
    laneFilterMode,
  );
  const pinnedLaneMetrics = getPinnedLaneMetrics(
    pinnedRecord,
    runs,
    executions,
    artifacts,
    selectedRunId,
    selectedExecutionId,
    selectedArtifactId,
    laneFilterMode,
  );
  const laneMemorySnapshot = getLaneMemorySnapshot(
    pinnedRecord,
    laneFilterMode,
    selectedRun,
    selectedExecution,
    selectedArtifact,
  );
  const pinnedRecordStatus = getPinnedRecordStatus(
    pinnedRecord,
    runs,
    executions,
    artifacts,
    runDetailRefreshedAt,
    executionDetailRefreshedAt,
    artifactDetailRefreshedAt,
    dashboardRefreshedAt,
  );
  const laneReadiness = getLaneReadiness(
    pinnedRecord,
    laneFilterMode,
    nextPinnedLaneRecord,
    pinnedLaneCompletionState,
    runs,
    executions,
    artifacts,
  );
  const laneHistoryAvailability = getLaneHistoryAvailability(laneHistory, runs, executions, artifacts);
  const laneRecoveryAction = getLaneRecoveryAction(pinnedRecord, laneFilterMode, laneReadiness);
  const lanePresets = getLanePresets();
  const activeLanePreset = activeLanePresetId
    ? lanePresets.find((preset) => preset.id === activeLanePresetId) ?? null
    : null;
  const lanePresetStatus = getLanePresetStatus(
    activeLanePreset,
    activeLanePresetSource,
    lanePresetRestoredAt,
    laneFilterMode,
    pinnedRecord,
    executions,
    artifacts,
  );
  const activeLaneOperatorNote = getActiveLaneOperatorNote(pinnedRecord, laneOperatorNotes);
  function getLocalReviewCue(
    entryId: OverviewContextId,
    noteText: string,
    reviewState: OverviewReviewState | null | undefined,
  ): {
    lastReviewedLabel: string | null;
    lastReviewedDetail: string | null;
    nextSuggestedCheck: string | null;
  } {
    const updatedAt = reviewState?.updatedAt ?? null;
    const normalizedNote = noteText.trim();
    const disposition = reviewState?.disposition ?? "in_queue";

    const lastReviewedLabel = updatedAt
      ? `Last reviewed: ${new Date(updatedAt).toLocaleTimeString()}`
      : null;
    const lastReviewedDetail = updatedAt
      ? `Local ${disposition.replace("_", " ")} state was last updated in this browser session at ${new Date(updatedAt).toLocaleTimeString()}.`
      : "This saved context has not been explicitly reviewed yet in this browser session.";

    if (normalizedNote) {
      return {
        lastReviewedLabel,
        lastReviewedDetail,
        nextSuggestedCheck: normalizedNote,
      };
    }

    if (entryId === "executions") {
      return {
        lastReviewedLabel,
        lastReviewedDetail,
        nextSuggestedCheck: disposition === "snoozed"
          ? "Recheck the highest-priority execution in this slice before returning it to active queue work."
          : "Verify warnings, audit state, and linked artifacts in the current execution slice.",
      };
    }
    if (entryId === "artifacts") {
      return {
        lastReviewedLabel,
        lastReviewedDetail,
        nextSuggestedCheck: disposition === "snoozed"
          ? "Recheck the strongest risk-bearing artifact in this slice before keeping it snoozed."
          : "Verify simulation markers, mutation-audit state, and provenance on the current artifact slice.",
      };
    }
    if (entryId === "executors") {
      return {
        lastReviewedLabel,
        lastReviewedDetail,
        nextSuggestedCheck: disposition === "snoozed"
          ? "Recheck whether this executor availability slice still needs to stay out of the active local review queue."
          : "Verify executor availability, workspace ownership, and linked execution load in the current substrate bookkeeping slice.",
      };
    }
    if (entryId === "workspaces") {
      return {
        lastReviewedLabel,
        lastReviewedDetail,
        nextSuggestedCheck: disposition === "snoozed"
          ? "Recheck whether this workspace-state slice still needs to stay out of the active local review queue."
          : "Verify workspace state, owning executor linkage, and attached execution or artifact activity in the current substrate bookkeeping slice.",
      };
    }
    return {
      lastReviewedLabel,
      lastReviewedDetail,
      nextSuggestedCheck: disposition === "snoozed"
        ? "Recheck whether this run slice still needs to stay out of the active queue."
        : "Verify the current run slice still matches the intended operator follow-up.",
    };
  }
  function buildOverviewContextMemoryEntry(
    id: OverviewContextId,
    preset: OverviewContextPresetEntry<string> | null,
    laneLabel: string,
    triageLabel: string | null,
  ): OverviewContextMemoryEntry | null {
    if (!preset) {
      return null;
    }
    const noteText = overviewContextNotes[id]?.text ?? "";
    return {
      id,
      laneLabel,
      focusLabel: preset.focusLabel,
      originLabel: preset.originLabel,
      savedAt: preset.savedAt,
      triageLabel,
      reviewDisposition: overviewReviewState[id]?.disposition ?? "in_queue",
      noteText,
      ...getLocalReviewCue(id, noteText, overviewReviewState[id]),
    };
  }
  const overviewContextMemoryEntries = [
    buildOverviewContextMemoryEntry("runs", runsOverviewContextPreset, "Runs", null),
    buildOverviewContextMemoryEntry(
      "executions",
      executionsOverviewContextPreset,
      "Executions",
      "Triage next execution",
    ),
    buildOverviewContextMemoryEntry(
      "artifacts",
      artifactsOverviewContextPreset,
      "Artifacts",
      "Triage next artifact",
    ),
    buildOverviewContextMemoryEntry(
      "executors",
      executorsOverviewContextPreset,
      "Executors",
      "Triage next executor",
    ),
    buildOverviewContextMemoryEntry(
      "workspaces",
      workspacesOverviewContextPreset,
      "Workspaces",
      "Triage next workspace",
    ),
  ].filter((entry): entry is OverviewContextMemoryEntry => entry !== null);
  const overviewContextMemoryById = overviewContextMemoryEntries.reduce(
    (result, entry) => {
      result[entry.id] = entry;
      return result;
    },
    {} as Partial<Record<OverviewContextId, OverviewContextMemoryEntry>>,
  );
  const savedExecutionContextItems = executionsOverviewContextPreset
    ? getExecutionItemsForSavedContext(executionsOverviewContextPreset)
    : [];
  const savedExecutionPriority = executionsOverviewContextPreset
    ? getPreferredExecution(savedExecutionContextItems)
    : null;
  const savedArtifactContextItems = artifactsOverviewContextPreset
    ? getArtifactItemsForSavedContext(artifactsOverviewContextPreset)
    : [];
  const savedArtifactPriority = artifactsOverviewContextPreset
    ? getPreferredArtifact(savedArtifactContextItems)
    : null;
  const savedExecutorContextItems = executorsOverviewContextPreset
    ? executors.filter((executor) => executor.availability_state === executorsOverviewContextPreset.value)
    : [];
  const savedWorkspaceContextItems = workspacesOverviewContextPreset
    ? workspaces.filter((workspace) => workspace.workspace_state === workspacesOverviewContextPreset.value)
    : [];
  const overviewReviewQueueEntries = [
    executionsOverviewContextPreset && savedExecutionPriority
      && (overviewReviewState.executions?.disposition ?? "in_queue") !== "reviewed"
      ? {
          id: "executions",
          laneLabel: "Executions",
          focusLabel: executionsOverviewContextPreset.focusLabel,
          priorityLabel: describeExecutionPriority(
            savedExecutionPriority,
            savedExecutionContextItems,
            selectedExecutionId,
          ).label,
          priorityDetail: describeExecutionPriority(
            savedExecutionPriority,
            savedExecutionContextItems,
            selectedExecutionId,
          ).description,
          savedAt: executionsOverviewContextPreset.savedAt,
          triageLabel: "Triage next execution",
          reviewDisposition: overviewReviewState.executions?.disposition ?? "in_queue",
          noteText: overviewContextNotes.executions?.text ?? "",
          ...getLocalReviewCue(
            "executions",
            overviewContextNotes.executions?.text ?? "",
            overviewReviewState.executions,
          ),
        }
      : null,
    artifactsOverviewContextPreset && savedArtifactPriority
      && (overviewReviewState.artifacts?.disposition ?? "in_queue") !== "reviewed"
      ? {
          id: "artifacts",
          laneLabel: "Artifacts",
          focusLabel: artifactsOverviewContextPreset.focusLabel,
          priorityLabel: describeArtifactPriority(
            savedArtifactPriority,
            savedArtifactContextItems,
            selectedArtifactId,
          ).label,
          priorityDetail: describeArtifactPriority(
            savedArtifactPriority,
            savedArtifactContextItems,
            selectedArtifactId,
          ).description,
          savedAt: artifactsOverviewContextPreset.savedAt,
          triageLabel: "Triage next artifact",
          reviewDisposition: overviewReviewState.artifacts?.disposition ?? "in_queue",
          noteText: overviewContextNotes.artifacts?.text ?? "",
          ...getLocalReviewCue(
            "artifacts",
            overviewContextNotes.artifacts?.text ?? "",
            overviewReviewState.artifacts,
          ),
        }
      : null,
    executorsOverviewContextPreset && savedExecutorContextItems.length > 0
      && (overviewReviewState.executors?.disposition ?? "in_queue") !== "reviewed"
      ? {
          id: "executors",
          laneLabel: "Executors",
          focusLabel: executorsOverviewContextPreset.focusLabel,
          priorityLabel: `${savedExecutorContextItems.length} executor${savedExecutorContextItems.length === 1 ? "" : "s"} in slice`,
          priorityDetail: `${savedExecutorContextItems.filter((executor) => workspaces.some((workspace) => workspace.owner_executor_id === executor.id)).length} ${savedExecutorContextItems.filter((executor) => workspaces.some((workspace) => workspace.owner_executor_id === executor.id)).length === 1 ? "executor currently owns" : "executors currently own"} one or more persisted workspaces in this bookkeeping slice.`,
          savedAt: executorsOverviewContextPreset.savedAt,
          triageLabel: "Triage next executor",
          reviewDisposition: overviewReviewState.executors?.disposition ?? "in_queue",
          noteText: overviewContextNotes.executors?.text ?? "",
          ...getLocalReviewCue(
            "executors",
            overviewContextNotes.executors?.text ?? "",
            overviewReviewState.executors,
          ),
        }
      : null,
    workspacesOverviewContextPreset && savedWorkspaceContextItems.length > 0
      && (overviewReviewState.workspaces?.disposition ?? "in_queue") !== "reviewed"
      ? {
          id: "workspaces",
          laneLabel: "Workspaces",
          focusLabel: workspacesOverviewContextPreset.focusLabel,
          priorityLabel: `${savedWorkspaceContextItems.length} workspace${savedWorkspaceContextItems.length === 1 ? "" : "s"} in slice`,
          priorityDetail: `${savedWorkspaceContextItems.filter((workspace) => Boolean(workspace.owner_executor_id)).length} ${savedWorkspaceContextItems.filter((workspace) => Boolean(workspace.owner_executor_id)).length === 1 ? "workspace is" : "workspaces are"} currently linked to an owning executor in this bookkeeping slice.`,
          savedAt: workspacesOverviewContextPreset.savedAt,
          triageLabel: "Triage next workspace",
          reviewDisposition: overviewReviewState.workspaces?.disposition ?? "in_queue",
          noteText: overviewContextNotes.workspaces?.text ?? "",
          ...getLocalReviewCue(
            "workspaces",
            overviewContextNotes.workspaces?.text ?? "",
            overviewReviewState.workspaces,
          ),
        }
      : null,
  ].filter((entry): entry is {
    id: "executions" | "artifacts" | "executors" | "workspaces";
    laneLabel: string;
    focusLabel: string;
    priorityLabel: string;
    priorityDetail: string;
    savedAt: string;
    triageLabel: string;
    reviewDisposition: OverviewReviewDisposition;
    noteText: string;
    lastReviewedLabel: string | null;
    lastReviewedDetail: string | null;
    nextSuggestedCheck: string | null;
  } => entry !== null);
  const savedRunContextItems = runsOverviewContextPreset
    ? getRunItemsForSavedContext(runsOverviewContextPreset)
    : [];
  function buildOverviewReviewDiagnostic(
    id: OverviewContextId,
    preset: OverviewContextPresetEntry<string> | null,
    hasDrift: boolean,
  ): OverviewReviewDiagnosticEntry | null {
    if (!preset) {
      return null;
    }
    return {
      id,
      label: `${overviewContextMemoryById[id]?.laneLabel ?? id}: ${preset.focusLabel}`,
      savedAt: preset.savedAt,
      reviewState: overviewReviewState[id] ?? null,
      hasDrift,
    };
  }
  const overviewReviewDiagnostics = [
    buildOverviewReviewDiagnostic("runs", runsOverviewContextPreset, savedRunContextItems.length === 0),
    buildOverviewReviewDiagnostic(
      "executions",
      executionsOverviewContextPreset,
      savedExecutionContextItems.length === 0 || !savedExecutionPriority,
    ),
    buildOverviewReviewDiagnostic(
      "artifacts",
      artifactsOverviewContextPreset,
      savedArtifactContextItems.length === 0 || !savedArtifactPriority,
    ),
    buildOverviewReviewDiagnostic(
      "executors",
      executorsOverviewContextPreset,
      savedExecutorContextItems.length === 0,
    ),
    buildOverviewReviewDiagnostic(
      "workspaces",
      workspacesOverviewContextPreset,
      savedWorkspaceContextItems.length === 0,
    ),
  ].filter((entry): entry is OverviewReviewDiagnosticEntry => entry !== null);
  const overviewReviewDiagnosticsById = overviewReviewDiagnostics.reduce(
    (result, entry) => {
      result[entry.id] = entry;
      return result;
    },
    {} as Partial<Record<OverviewContextId, OverviewReviewDiagnosticEntry>>,
  );
  const staleThresholdMs = 1000 * 60 * 30;
  const staleDiagnostics = overviewReviewDiagnostics.filter(
    (entry) => Date.now() - Date.parse(entry.savedAt) > staleThresholdMs,
  );
  const snoozedDiagnostics = overviewReviewDiagnostics
    .filter((entry) => entry.reviewState?.disposition === "snoozed")
    .sort((left, right) => Date.parse(left.reviewState?.updatedAt ?? left.savedAt) - Date.parse(right.reviewState?.updatedAt ?? right.savedAt));
  const longestSnoozedEntry = snoozedDiagnostics[0] ?? null;
  const currentSnapshotBaseline: OverviewSessionSnapshotBaseline = {
    copiedAt: new Date().toISOString(),
    contexts: {
      ...(runsOverviewContextPreset ? {
        runs: {
          reviewDisposition: overviewReviewState.runs?.disposition ?? "in_queue",
          noteUpdatedAt: overviewContextNotes.runs?.updatedAt ?? null,
          hasDrift: savedRunContextItems.length === 0,
        },
      } : {}),
      ...(executionsOverviewContextPreset ? {
        executions: {
          reviewDisposition: overviewReviewState.executions?.disposition ?? "in_queue",
          noteUpdatedAt: overviewContextNotes.executions?.updatedAt ?? null,
          hasDrift: savedExecutionContextItems.length === 0 || !savedExecutionPriority,
        },
      } : {}),
      ...(artifactsOverviewContextPreset ? {
        artifacts: {
          reviewDisposition: overviewReviewState.artifacts?.disposition ?? "in_queue",
          noteUpdatedAt: overviewContextNotes.artifacts?.updatedAt ?? null,
          hasDrift: savedArtifactContextItems.length === 0 || !savedArtifactPriority,
        },
      } : {}),
      ...(executorsOverviewContextPreset ? {
        executors: {
          reviewDisposition: overviewReviewState.executors?.disposition ?? "in_queue",
          noteUpdatedAt: overviewContextNotes.executors?.updatedAt ?? null,
          hasDrift: savedExecutorContextItems.length === 0,
        },
      } : {}),
      ...(workspacesOverviewContextPreset ? {
        workspaces: {
          reviewDisposition: overviewReviewState.workspaces?.disposition ?? "in_queue",
          noteUpdatedAt: overviewContextNotes.workspaces?.updatedAt ?? null,
          hasDrift: savedWorkspaceContextItems.length === 0,
        },
      } : {}),
    },
  };
  const compareDelta = overviewSessionSnapshotBaseline
    ? OVERVIEW_CONTEXT_IDS.reduce(
        (summary, id) => {
          const previous = overviewSessionSnapshotBaseline.contexts[id];
          const current = currentSnapshotBaseline.contexts[id];
          if (!previous || !current) {
            return summary;
          }
          if (previous.reviewDisposition !== "reviewed" && current.reviewDisposition === "reviewed") {
            summary.newlyReviewed += 1;
          }
          if (current.noteUpdatedAt && current.noteUpdatedAt !== previous.noteUpdatedAt) {
            summary.notesUpdated += 1;
          }
          if (!previous.hasDrift && current.hasDrift) {
            summary.newlyDrifted += 1;
          }
          return summary;
        },
        { newlyReviewed: 0, notesUpdated: 0, newlyDrifted: 0 },
      )
    : null;
  const readinessDiagnostics = overviewContextMemoryEntries.map((entry) => {
    const matchingDiagnostic = overviewReviewDiagnosticsById[entry.id];
    const missingSignals: string[] = [];
    if (!entry.noteText.trim()) {
      missingSignals.push("missing local note");
    }
    if (entry.reviewDisposition !== "reviewed") {
      missingSignals.push("not marked reviewed");
    }
    if (matchingDiagnostic?.hasDrift) {
      missingSignals.push("context drifted from current persisted records");
    }
    if (Date.now() - Date.parse(entry.savedAt) > staleThresholdMs) {
      missingSignals.push("saved context is stale");
    }
    return {
      id: entry.id,
      laneLabel: entry.laneLabel,
      focusLabel: entry.focusLabel,
      ready: missingSignals.length === 0,
      summaryLabel: missingSignals.length === 0 ? "ready for local handoff" : "needs follow-up",
      detail: missingSignals.length === 0
        ? "This saved context has a local note, a reviewed state, and no current drift or staleness flags in this browser session."
        : `Still missing: ${missingSignals.join(", ")}.`,
    };
  });
  const readinessDiagnosticsById = readinessDiagnostics.reduce(
    (result, entry) => {
      result[entry.id] = entry;
      return result;
    },
    {} as Partial<Record<OverviewContextId, ReadinessDiagnosticEntry>>,
  );
  const handoffPackageEntries = readinessDiagnostics.map((entry) => {
    const matchingMemoryEntry = overviewContextMemoryById[entry.id];
    const previousSnapshotContext = overviewSessionSnapshotBaseline?.contexts[entry.id] ?? null;
    const currentSnapshotContext = currentSnapshotBaseline.contexts[entry.id] ?? null;
    const isStale = matchingMemoryEntry
      ? Date.now() - Date.parse(matchingMemoryEntry.savedAt) > staleThresholdMs
      : false;
    const changedSinceSnapshot = previousSnapshotContext && currentSnapshotContext
      ? previousSnapshotContext.reviewDisposition !== currentSnapshotContext.reviewDisposition
        || previousSnapshotContext.noteUpdatedAt !== currentSnapshotContext.noteUpdatedAt
        || previousSnapshotContext.hasDrift !== currentSnapshotContext.hasDrift
      : false;
    const savedAtLabel = matchingMemoryEntry
      ? new Date(matchingMemoryEntry.savedAt).toLocaleTimeString()
      : "unknown";
    return {
      id: entry.id,
      laneLabel: entry.laneLabel,
      focusLabel: entry.focusLabel,
      detail: entry.ready
        ? "Included because the local note, reviewed state, and drift/staleness checks are all satisfied in this browser session."
        : entry.detail,
      provenanceLabel: previousSnapshotContext
        ? changedSinceSnapshot
          ? "changed since last snapshot"
          : isStale
            ? "stale but unchanged since snapshot"
            : "unchanged since last snapshot"
        : isStale
          ? "stale local context"
          : "recent local context",
      provenanceDetail: matchingMemoryEntry
        ? [
            `Saved locally at ${savedAtLabel} from ${matchingMemoryEntry.originLabel}.`,
            previousSnapshotContext
              ? changedSinceSnapshot
                ? "Tracked review, note, or drift state changed after the last copied session snapshot."
                : "No tracked review, note, or drift changes were detected since the last copied session snapshot."
              : "No copied session snapshot baseline exists yet for this saved context.",
          ].join(" ")
        : "Derived from current browser-session state only.",
    };
  });
  const changedSinceSnapshotCount = handoffPackageEntries.filter(
    (entry) => entry.provenanceLabel === "changed since last snapshot",
  ).length;
  const handoffPackageIncludedEntries = handoffPackageEntries.filter(
    (entry) => readinessDiagnosticsById[entry.id]?.ready === true,
  );
  const handoffPackageExcludedEntries = handoffPackageEntries.filter(
    (entry) => readinessDiagnosticsById[entry.id]?.ready !== true,
  );
  const handoffConfidence = (() => {
    const excludedCount = handoffPackageExcludedEntries.length;
    const driftedCount = overviewReviewDiagnostics.filter((entry) => entry.hasDrift).length;
    const staleCount = staleDiagnostics.length;
    if (excludedCount > 0 || driftedCount > 0) {
      return {
        tone: "risk" as const,
        label: "risk: follow-up still required",
        detail: "One or more saved contexts are excluded or drifted, so this local handoff draft should be treated as incomplete until those items are rechecked.",
      };
    }
    if (staleCount > 0 || changedSinceSnapshotCount > 0) {
      return {
        tone: "caution" as const,
        label: "caution: recheck before handoff",
        detail: "All current items may be includable, but stale or changed-since-snapshot signals suggest a quick local verification pass before relying on this draft.",
      };
    }
    return {
      tone: "high" as const,
      label: "high confidence: locally aligned",
      detail: "Current saved contexts are locally included with no drift, no exclusions, and no stale or changed-since-snapshot warnings in this browser session.",
    };
  })();
  const overviewReviewSessionSummary = {
    inQueueCount: Object.values(overviewReviewState).filter(
      (entry) => entry?.disposition === "in_queue",
    ).length,
    snoozedCount: Object.values(overviewReviewState).filter(
      (entry) => entry?.disposition === "snoozed",
    ).length,
    reviewedCount: Object.values(overviewReviewState).filter(
      (entry) => entry?.disposition === "reviewed",
    ).length,
    staleCount: staleDiagnostics.length,
    driftedCount: overviewReviewDiagnostics.filter((entry) => entry.hasDrift).length,
    longestSnoozedLabel: longestSnoozedEntry
      ? `Longest snoozed: ${longestSnoozedEntry.label}`
      : null,
    longestSnoozedDetail: longestSnoozedEntry
      ? `Snoozed since ${new Date(longestSnoozedEntry.reviewState?.updatedAt ?? longestSnoozedEntry.savedAt).toLocaleTimeString()} in this browser session.`
      : null,
    lastSnapshotLabel: overviewSessionSnapshotBaseline
      ? `Last snapshot: ${new Date(overviewSessionSnapshotBaseline.copiedAt).toLocaleTimeString()}`
      : null,
    compareSummaryLabel: compareDelta
      ? `Since last snapshot: ${compareDelta.newlyReviewed} newly reviewed, ${compareDelta.notesUpdated} notes updated, ${compareDelta.newlyDrifted} newly drifted.`
      : null,
    readyCount: readinessDiagnostics.filter((entry) => entry.ready).length,
    pendingCount: readinessDiagnostics.filter((entry) => !entry.ready).length,
  };
  const handoffExportGeneratedAt = new Date().toLocaleTimeString();
  const overviewHandoffExportLines = [
    "Overview local handoff draft (browser-session only)",
    "This draft is generated from frontend-local review state and current persisted records visible in the UI.",
    "It does not create backend persistence, operator storage, or orchestration-owned handoff state.",
    `Generated at: ${handoffExportGeneratedAt}`,
    `Included contexts: ${handoffPackageIncludedEntries.length}`,
    `Excluded contexts: ${handoffPackageExcludedEntries.length}`,
    "",
    "Included now:",
    ...(handoffPackageIncludedEntries.length > 0
      ? handoffPackageIncludedEntries.map(
          (entry) => `- ${entry.laneLabel}: ${entry.focusLabel} | ${entry.detail} | ${entry.provenanceLabel}: ${entry.provenanceDetail}`,
        )
      : ["- none"]),
    "",
    "Excluded for follow-up:",
    ...(handoffPackageExcludedEntries.length > 0
      ? handoffPackageExcludedEntries.map(
          (entry) => `- ${entry.laneLabel}: ${entry.focusLabel} | ${entry.detail} | ${entry.provenanceLabel}: ${entry.provenanceDetail}`,
        )
      : ["- none"]),
    "",
    "Snapshot summary:",
    `- In queue: ${overviewReviewSessionSummary.inQueueCount}`,
    `- Snoozed: ${overviewReviewSessionSummary.snoozedCount}`,
    `- Reviewed: ${overviewReviewSessionSummary.reviewedCount}`,
    `- Stale: ${overviewReviewSessionSummary.staleCount}`,
    `- Drifted: ${overviewReviewSessionSummary.driftedCount}`,
    `- Ready for local handoff: ${overviewReviewSessionSummary.readyCount}`,
    `- Needs follow-up: ${overviewReviewSessionSummary.pendingCount}`,
  ];
  const overviewHandoffExportDraft = overviewHandoffExportLines.join("\n");
  const attentionRecommendations = [
    staleDiagnostics[0]
      ? {
          id: `stale:${staleDiagnostics[0].id}`,
          label: "Revisit stale saved context",
          detail: `${staleDiagnostics[0].label} has been sitting for more than 30 minutes in this browser session and may need a fresh review pass.`,
          primaryActionLabel: "Open stale context",
          secondaryActionLabel: staleDiagnostics[0].id === "executions" || staleDiagnostics[0].id === "artifacts"
            ? "Triage stale context"
            : null,
        }
      : null,
    overviewReviewDiagnostics.find((entry) => entry.hasDrift)
      ? {
          id: `drift:${overviewReviewDiagnostics.find((entry) => entry.hasDrift)!.id}`,
          label: "Reopen drifted context",
          detail: `${overviewReviewDiagnostics.find((entry) => entry.hasDrift)!.label} no longer lines up cleanly with the latest persisted records and should be rechecked.`,
          primaryActionLabel: "Open drifted context",
          secondaryActionLabel: null,
        }
      : null,
    longestSnoozedEntry
      ? {
          id: `snoozed:${longestSnoozedEntry.id}`,
          label: "Triage longest snoozed context",
          detail: `${longestSnoozedEntry.label} has been snoozed the longest in this browser session and may be ready to return to active review.`,
          primaryActionLabel: longestSnoozedEntry.id === "executions" || longestSnoozedEntry.id === "artifacts"
            ? "Triage longest snoozed"
            : "Open longest snoozed",
          secondaryActionLabel: "Keep in queue",
        }
      : null,
  ].filter((entry): entry is {
    id: string;
    label: string;
    detail: string;
    primaryActionLabel: string;
    secondaryActionLabel: string | null;
  } => entry !== null);

  function dedupeBreadcrumbs(items: DetailBreadcrumb[]): DetailBreadcrumb[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.kind}:${item.id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function buildRunDetailBreadcrumbs(runId: string): DetailBreadcrumb[] {
    const items: DetailBreadcrumb[] = [];
    if (selectedArtifact && selectedArtifact.run_id === runId) {
      items.push({
        kind: "artifact",
        id: selectedArtifact.id,
        label: selectedArtifact.label || `Artifact ${selectedArtifact.id}`,
      });
    }
    if (selectedExecution && selectedExecution.run_id === runId) {
      items.push({
        kind: "execution",
        id: selectedExecution.id,
        label: selectedExecution.result_summary || `Execution ${selectedExecution.id}`,
      });
    }
    return dedupeBreadcrumbs(items);
  }

  function buildExecutionDetailBreadcrumbs(executionId: string): DetailBreadcrumb[] {
    const items: DetailBreadcrumb[] = [];
    const executionListItem = executions.find((execution) => execution.id === executionId) ?? null;
    if (selectedRun && executionListItem && selectedRun.id === executionListItem.run_id) {
      items.push({
        kind: "run",
        id: selectedRun.id,
        label: selectedRun.result_summary || `Run ${selectedRun.id}`,
      });
    }
    if (selectedArtifact && selectedArtifact.execution_id === executionId) {
      items.push({
        kind: "artifact",
        id: selectedArtifact.id,
        label: selectedArtifact.label || `Artifact ${selectedArtifact.id}`,
      });
    }
    return dedupeBreadcrumbs(items);
  }

  function buildArtifactDetailBreadcrumbs(artifactId: string): DetailBreadcrumb[] {
    const artifactListItem = artifacts.find((artifact) => artifact.id === artifactId) ?? null;
    if (!artifactListItem) {
      return [];
    }
    const items: DetailBreadcrumb[] = [];
    if (selectedRun && selectedRun.id === artifactListItem.run_id) {
      items.push({
        kind: "run",
        id: selectedRun.id,
        label: selectedRun.result_summary || `Run ${selectedRun.id}`,
      });
    }
    if (selectedExecution && selectedExecution.id === artifactListItem.execution_id) {
      items.push({
        kind: "execution",
        id: selectedExecution.id,
        label: selectedExecution.result_summary || `Execution ${selectedExecution.id}`,
      });
    }
    return dedupeBreadcrumbs(items);
  }

  function pinRunRecord(run: RunRecord | null) {
    if (!run) {
      return;
    }
    const nextPinnedRecord: PinnedRecord = {
      kind: "run",
      id: run.id,
      label: `Run ${run.id}`,
      summary: run.result_summary ?? null,
    };
    setPinnedRecord(nextPinnedRecord);
    setLaneMemory(
      getLaneMemorySnapshot(
        nextPinnedRecord,
        laneFilterMode,
        run,
        selectedExecution,
        selectedArtifact,
      ),
    );
  }

  function pinExecutionRecord(execution: ExecutionRecord | null) {
    if (!execution) {
      return;
    }
    const nextPinnedRecord: PinnedRecord = {
      kind: "execution",
      id: execution.id,
      label: `Execution ${execution.id}`,
      summary: execution.result_summary ?? null,
    };
    setPinnedRecord(nextPinnedRecord);
    setLaneMemory(
      getLaneMemorySnapshot(
        nextPinnedRecord,
        laneFilterMode,
        selectedRun,
        execution,
        selectedArtifact,
      ),
    );
  }

  function pinArtifactRecord(artifact: ArtifactRecord | null) {
    if (!artifact) {
      return;
    }
    const nextPinnedRecord: PinnedRecord = {
      kind: "artifact",
      id: artifact.id,
      label: artifact.label || `Artifact ${artifact.id}`,
      summary: artifact.kind,
    };
    setPinnedRecord(nextPinnedRecord);
    setLaneMemory(
      getLaneMemorySnapshot(
        nextPinnedRecord,
        laneFilterMode,
        selectedRun,
        selectedExecution,
        artifact,
      ),
    );
  }

  function openPinnedRecord() {
    if (!pinnedRecord) {
      return;
    }
    if (pinnedRecord.kind === "run") {
      openRunDetail(pinnedRecord.id);
      return;
    }
    if (pinnedRecord.kind === "execution") {
      openExecutionDetail(pinnedRecord.id);
      return;
    }
    openArtifactDetail(pinnedRecord.id);
  }

  function restoreLaneMemory() {
    if (pinnedRecord) {
      setLaneHandoffSummary({
        label: "handoff: restored pinned lane",
        detail: `Returned to ${pinnedRecord.label} using the current ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")} lane context.`,
      });
      openPinnedRecord();
      return;
    }
    if (!laneMemory) {
      return;
    }
    setLaneHandoffSummary({
      label: "handoff: restored lane memory",
      detail: `Restored ${laneMemory.pinnedLabel} from saved ${laneMemory.filterLabel.replace("lane filter: ", "")} lane memory.`,
    });
    if (laneMemory.pinnedKind === "run") {
      openRunDetail(laneMemory.pinnedId);
      return;
    }
    if (laneMemory.pinnedKind === "execution") {
      openExecutionDetail(laneMemory.pinnedId);
      return;
    }
    openArtifactDetail(laneMemory.pinnedId);
  }

  function openLaneHistoryEntry(entry: LaneHistoryEntry) {
    setLaneHandoffSummary({
      label: "handoff: recent return",
      detail: `Returned to ${entry.label} from recent lane history without discarding current lane context.`,
    });
    if (entry.kind === "run") {
      openRunDetail(entry.id);
      return;
    }
    if (entry.kind === "execution") {
      openExecutionDetail(entry.id);
      return;
    }
    openArtifactDetail(entry.id);
  }

  function rememberLaneExit(entry: LaneHistoryEntry) {
    if (!pinnedRecord || entry.kind === pinnedRecord.kind && entry.id === pinnedRecord.id) {
      return;
    }
    setLaneHistory((current) => {
      const next = [
        entry,
        ...current.filter((candidate) => !(candidate.kind === entry.kind && candidate.id === entry.id)),
      ];
      return next.slice(0, 3);
    });
  }

  function getPinnedRecordStorageKey(record: PinnedRecord | null): string | null {
    if (!record) {
      return null;
    }
    return `${record.kind}:${record.id}`;
  }

  function applyLanePreset(
    presetId: LanePreset["id"],
    options?: {
      source?: LanePresetSource;
      restoredAt?: string | null;
    },
  ) {
    const source = options?.source ?? "manual";
    const restoredAt = options?.restoredAt ?? null;

    if (presetId === "execution_warnings") {
      const warningExecution = executions
        .filter((execution) => execution.warning_count > 0)
        .sort((left, right) => right.warning_count - left.warning_count)[0] ?? null;
      if (!warningExecution) {
        return;
      }
      setActiveLanePresetId(presetId);
      setActiveLanePresetSource(source);
      setLanePresetRestoredAt(restoredAt);
      setLaneHandoffSummary({
        label: source === "session" ? "handoff: preset restored" : "handoff: preset applied",
        detail: source === "session"
          ? "Restored the execution warnings preset from browser session state."
          : "Applied the execution warnings preset and pivoted the lane into warnings-only review.",
      });
      setLaneFilterMode("warnings");
      void loadExecutionDetail(warningExecution.id).then(() => {
        setPinnedRecord({
          kind: "execution",
          id: warningExecution.id,
          label: `Execution ${warningExecution.id}`,
          summary: warningExecution.result_summary ?? null,
        });
        setLaneMemory(
          getLaneMemorySnapshot(
            {
              kind: "execution",
              id: warningExecution.id,
              label: `Execution ${warningExecution.id}`,
              summary: warningExecution.result_summary ?? null,
            },
            "warnings",
            selectedRun,
            selectedExecution,
            selectedArtifact,
          ),
        );
        setExecutionDetailBreadcrumbs(buildExecutionDetailBreadcrumbs(warningExecution.id));
        scrollToSection(executionDetailSectionRef.current);
      });
      return;
    }

    if (presetId === "artifact_audit_risk") {
      const auditArtifact = artifacts.find((artifact) =>
        artifact.mutation_audit_status === "preflight"
        || artifact.mutation_audit_status === "failed"
        || artifact.mutation_audit_status === "rolled_back") ?? null;
      if (!auditArtifact) {
        return;
      }
      setActiveLanePresetId(presetId);
      setActiveLanePresetSource(source);
      setLanePresetRestoredAt(restoredAt);
      setLaneHandoffSummary({
        label: source === "session" ? "handoff: preset restored" : "handoff: preset applied",
        detail: source === "session"
          ? "Restored the artifact audit risk preset from browser session state."
          : "Applied the artifact audit risk preset and pivoted the lane into audit-risk review.",
      });
      setLaneFilterMode("audit_risk");
      void loadArtifactDetail(auditArtifact.id).then(() => {
        setPinnedRecord({
          kind: "artifact",
          id: auditArtifact.id,
          label: auditArtifact.label || `Artifact ${auditArtifact.id}`,
          summary: auditArtifact.kind,
        });
        setLaneMemory(
          getLaneMemorySnapshot(
            {
              kind: "artifact",
              id: auditArtifact.id,
              label: auditArtifact.label || `Artifact ${auditArtifact.id}`,
              summary: auditArtifact.kind,
            },
            "audit_risk",
            selectedRun,
            selectedExecution,
            selectedArtifact,
          ),
        );
        setArtifactDetailBreadcrumbs(buildArtifactDetailBreadcrumbs(auditArtifact.id));
        scrollToSection(artifactDetailSectionRef.current);
      });
      return;
    }

    const simulatedArtifact = artifacts.find((artifact) =>
      artifact.simulated || artifact.execution_mode === "simulated") ?? null;
    if (!simulatedArtifact) {
      return;
    }
    setActiveLanePresetId(presetId);
    setActiveLanePresetSource(source);
    setLanePresetRestoredAt(restoredAt);
    setLaneHandoffSummary({
      label: source === "session" ? "handoff: preset restored" : "handoff: preset applied",
      detail: source === "session"
        ? "Restored the simulated review preset from browser session state."
        : "Applied the simulated review preset and pivoted the lane into simulated-only review.",
    });
    setLaneFilterMode("simulated_only");
    void loadArtifactDetail(simulatedArtifact.id).then(() => {
      setPinnedRecord({
        kind: "artifact",
        id: simulatedArtifact.id,
        label: simulatedArtifact.label || `Artifact ${simulatedArtifact.id}`,
        summary: simulatedArtifact.kind,
      });
      setLaneMemory(
        getLaneMemorySnapshot(
          {
            kind: "artifact",
            id: simulatedArtifact.id,
            label: simulatedArtifact.label || `Artifact ${simulatedArtifact.id}`,
            summary: simulatedArtifact.kind,
          },
          "simulated_only",
          selectedRun,
          selectedExecution,
          selectedArtifact,
        ),
      );
      setArtifactDetailBreadcrumbs(buildArtifactDetailBreadcrumbs(simulatedArtifact.id));
      scrollToSection(artifactDetailSectionRef.current);
    });
  }

  function getLanePresets(): LanePreset[] {
    const hasWarningExecutions = executions.some((execution) => execution.warning_count > 0);
    const hasAuditRiskArtifacts = artifacts.some((artifact) =>
      artifact.mutation_audit_status === "preflight"
      || artifact.mutation_audit_status === "failed"
      || artifact.mutation_audit_status === "rolled_back");
    const hasSimulatedArtifacts = artifacts.some(
      (artifact) => artifact.simulated || artifact.execution_mode === "simulated",
    );

    return [
      {
        id: "execution_warnings",
        label: "Execution warnings",
        detail: "Pin the lane to warning-bearing executions and switch to warnings-only review.",
        available: hasWarningExecutions,
        availabilityDetail: hasWarningExecutions
          ? "Available because persisted executions with warning counts are present."
          : "Unavailable because no currently persisted executions carry warning counts.",
      },
      {
        id: "artifact_audit_risk",
        label: "Artifact audit risk",
        detail: "Pin the lane to artifact audit-risk records and switch to audit-risk review.",
        available: hasAuditRiskArtifacts,
        availabilityDetail: hasAuditRiskArtifacts
          ? "Available because persisted artifacts show preflight, failed, or rolled-back audit states."
          : "Unavailable because no currently persisted artifacts show audit-risk states.",
      },
      {
        id: "simulated_review",
        label: "Simulated review",
        detail: "Pin the lane to simulated artifacts and switch to simulated-only review.",
        available: hasSimulatedArtifacts,
        availabilityDetail: hasSimulatedArtifacts
          ? "Available because persisted artifacts are explicitly marked simulated."
          : "Unavailable because no currently persisted artifacts are marked simulated.",
      },
    ];
  }

  function handleLaneFilterModeChange(mode: LaneFilterMode) {
    setLaneFilterMode(mode);
    setLanePresetRestoredAt(null);
  }

  function handleLaneRecovery() {
    if (!laneRecoveryAction) {
      return;
    }
    setLaneFilterMode(laneRecoveryAction.mode);
    setLanePresetRestoredAt(null);
    setLaneHandoffSummary({
      label: "handoff: lane recovery",
      detail: `Applied ${laneRecoveryAction.label.toLowerCase()} to bring the pinned lane back into a matching filter view.`,
    });
  }

  function handleLaneOperatorNoteSave() {
    if (!pinnedRecord) {
      return;
    }

    const trimmedDraft = laneOperatorNoteDraft.trim();
    const storageKey = getPinnedRecordStorageKey(pinnedRecord);
    if (!storageKey) {
      return;
    }

    if (!trimmedDraft) {
      setLaneOperatorNotes((current) => {
        const next = { ...current };
        delete next[storageKey];
        return next;
      });
      setLaneHandoffSummary({
        label: "handoff: note cleared",
        detail: `Cleared the local operator note for ${pinnedRecord.label}.`,
      });
      return;
    }

    setLaneOperatorNotes((current) => ({
      ...current,
      [storageKey]: {
        text: trimmedDraft,
        updatedAt: new Date().toISOString(),
        pinnedLabel: pinnedRecord.label,
      },
    }));
    setLaneHandoffSummary({
      label: "handoff: note saved",
      detail: `Saved a local operator note for ${pinnedRecord.label}. This note remains browser-session only unless backend persistence is implemented later.`,
    });
  }

  function handleLaneOperatorNoteClear() {
    if (!pinnedRecord) {
      setLaneOperatorNoteDraft("");
      return;
    }

    const storageKey = getPinnedRecordStorageKey(pinnedRecord);
    if (!storageKey) {
      return;
    }

    setLaneOperatorNoteDraft("");
    setLaneOperatorNotes((current) => {
      const next = { ...current };
      delete next[storageKey];
      return next;
    });
    setLaneHandoffSummary({
      label: "handoff: note cleared",
      detail: `Cleared the local operator note for ${pinnedRecord.label}.`,
    });
  }

  async function handleCopyLaneContext() {
    if (!pinnedRecord) {
      return;
    }

    const lines = [
      `Pinned lane: ${pinnedRecord.label}${pinnedRecord.summary ? ` | ${pinnedRecord.summary}` : ""}`,
      `Filter: ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")}`,
      `Pinned status: ${pinnedRecordStatus?.label ?? "not available"}`,
      `Pinned detail: ${pinnedRecordStatus?.detail ?? "not available"}`,
      `Handoff: ${laneHandoffSummary?.label ?? "none"}`,
      `Handoff detail: ${laneHandoffSummary?.detail ?? "No recent handoff summary recorded."}`,
      `Preset: ${lanePresetStatus?.activeLabel ?? "none"}`,
      `Preset detail: ${lanePresetStatus?.activeDetail ?? "No active preset detail."}`,
      `Preset restore: ${lanePresetStatus?.restoredLabel ?? "none"}`,
      `Preset drift: ${lanePresetStatus?.driftLabel ?? "none"}`,
      `Operator note (local browser session only): ${activeLaneOperatorNote?.text ?? "none"}`,
      "Truth labels:",
      "- simulated execution must remain explicitly labeled",
      "- real O3DE adapters are still not broadly implemented",
      "- operator-configured persistence remains the truthful baseline for local non-container runs",
      "- this copied summary is local clipboard output only and does not imply backend export persistence",
    ];

    const summary = lines.join("\n");

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setLaneExportStatus({
        label: "lane context copy unavailable",
        detail: "Clipboard copy is not available in this browser context. No backend export was attempted.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(summary);
      setLaneExportStatus({
        label: "lane context copied",
        detail: `Copied a local clipboard summary for ${pinnedRecord.label}. This action does not persist or transmit the summary anywhere else.`,
      });
    } catch {
      setLaneExportStatus({
        label: "lane context copy failed",
        detail: "Clipboard access was blocked by the browser. No backend export was attempted.",
      });
    }
  }

  function handleClearLocalLaneContext() {
    setActiveLanePresetId(null);
    setActiveLanePresetSource("manual");
    setLanePresetRestoredAt(null);
    setPendingLanePresetRestoreId(null);
    setRunsOverviewContextPreset(null);
    setExecutionsOverviewContextPreset(null);
    setArtifactsOverviewContextPreset(null);
    setLaneHandoffSummary(null);
    setLaneExportStatus(null);
    setLaneOperatorNoteDraft("");
    setLaneOperatorNotes((current) => {
      if (!pinnedRecord) {
        return {};
      }
      const storageKey = getPinnedRecordStorageKey(pinnedRecord);
      if (!storageKey) {
        return current;
      }
      const next = { ...current };
      delete next[storageKey];
      return next;
    });

    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ACTIVE_LANE_PRESET_SESSION_KEY);
      window.sessionStorage.removeItem(OVERVIEW_CONTEXT_PRESETS_SESSION_KEY);
      if (!pinnedRecord) {
        window.sessionStorage.removeItem(LANE_OPERATOR_NOTES_SESSION_KEY);
      }
    }

    setDashboardRefreshStatus("local lane context cleared");
    setDashboardRefreshDetail(
      pinnedRecord
        ? `Cleared browser-session preset, note, handoff, and export state for ${pinnedRecord.label}. Persisted backend records were not changed.`
        : "Cleared browser-session lane preset, notes, handoff, and export state. Persisted backend records were not changed.",
    );
  }

  function dropStaleLaneHistory() {
    setLaneHistory((current) => current.filter((entry) => {
      if (entry.kind === "run") {
        return runs.some((run) => run.id === entry.id);
      }
      if (entry.kind === "execution") {
        return executions.some((execution) => execution.id === entry.id);
      }
      return artifacts.some((artifact) => artifact.id === entry.id);
    }));
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedPresetId = window.sessionStorage.getItem(ACTIVE_LANE_PRESET_SESSION_KEY);
    if (
      storedPresetId === "execution_warnings"
      || storedPresetId === "artifact_audit_risk"
      || storedPresetId === "simulated_review"
    ) {
      setPendingLanePresetRestoreId(storedPresetId);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (activeLanePresetId) {
      window.sessionStorage.setItem(ACTIVE_LANE_PRESET_SESSION_KEY, activeLanePresetId);
      return;
    }

    window.sessionStorage.removeItem(ACTIVE_LANE_PRESET_SESSION_KEY);
  }, [activeLanePresetId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedValue = window.sessionStorage.getItem(OVERVIEW_CONTEXT_PRESETS_SESSION_KEY);
    if (!storedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as {
        runs?: OverviewContextPresetEntry<RunsOverviewContextKind> | null;
        executions?: OverviewContextPresetEntry<ExecutionsOverviewContextKind> | null;
        artifacts?: OverviewContextPresetEntry<ArtifactsOverviewContextKind> | null;
        executors?: OverviewContextPresetEntry<ExecutorsOverviewContextKind> | null;
        workspaces?: OverviewContextPresetEntry<WorkspacesOverviewContextKind> | null;
      };
      setRunsOverviewContextPreset(parsed.runs ?? null);
      setExecutionsOverviewContextPreset(parsed.executions ?? null);
      setArtifactsOverviewContextPreset(parsed.artifacts ?? null);
      setExecutorsOverviewContextPreset(parsed.executors ?? null);
      setWorkspacesOverviewContextPreset(parsed.workspaces ?? null);
    } catch {
      window.sessionStorage.removeItem(OVERVIEW_CONTEXT_PRESETS_SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasPreset =
      runsOverviewContextPreset
      || executionsOverviewContextPreset
      || artifactsOverviewContextPreset
      || executorsOverviewContextPreset
      || workspacesOverviewContextPreset;
    if (!hasPreset) {
      window.sessionStorage.removeItem(OVERVIEW_CONTEXT_PRESETS_SESSION_KEY);
      return;
    }

    window.sessionStorage.setItem(
      OVERVIEW_CONTEXT_PRESETS_SESSION_KEY,
      JSON.stringify({
        runs: runsOverviewContextPreset,
        executions: executionsOverviewContextPreset,
        artifacts: artifactsOverviewContextPreset,
        executors: executorsOverviewContextPreset,
        workspaces: workspacesOverviewContextPreset,
      }),
    );
  }, [
    runsOverviewContextPreset,
    executionsOverviewContextPreset,
    artifactsOverviewContextPreset,
    executorsOverviewContextPreset,
    workspacesOverviewContextPreset,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedValue = window.sessionStorage.getItem(OVERVIEW_REVIEW_STATE_SESSION_KEY);
    if (!storedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as Partial<
        Record<OverviewContextId, OverviewReviewState>
      >;
      setOverviewReviewState(parsed);
    } catch {
      window.sessionStorage.removeItem(OVERVIEW_REVIEW_STATE_SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasEntries = Object.keys(overviewReviewState).length > 0;
    if (!hasEntries) {
      window.sessionStorage.removeItem(OVERVIEW_REVIEW_STATE_SESSION_KEY);
      return;
    }

    window.sessionStorage.setItem(
      OVERVIEW_REVIEW_STATE_SESSION_KEY,
      JSON.stringify(overviewReviewState),
    );
  }, [overviewReviewState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedValue = window.sessionStorage.getItem(OVERVIEW_CONTEXT_NOTES_SESSION_KEY);
    if (!storedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as Partial<
        Record<OverviewContextId, OverviewContextNote>
      >;
      setOverviewContextNotes(parsed);
    } catch {
      window.sessionStorage.removeItem(OVERVIEW_CONTEXT_NOTES_SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasEntries = Object.keys(overviewContextNotes).length > 0;
    if (!hasEntries) {
      window.sessionStorage.removeItem(OVERVIEW_CONTEXT_NOTES_SESSION_KEY);
      return;
    }

    window.sessionStorage.setItem(
      OVERVIEW_CONTEXT_NOTES_SESSION_KEY,
      JSON.stringify(overviewContextNotes),
    );
  }, [overviewContextNotes]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedValue = window.sessionStorage.getItem(OVERVIEW_SESSION_SNAPSHOT_BASELINE_SESSION_KEY);
    if (!storedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as OverviewSessionSnapshotBaseline;
      setOverviewSessionSnapshotBaseline(parsed);
    } catch {
      window.sessionStorage.removeItem(OVERVIEW_SESSION_SNAPSHOT_BASELINE_SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!overviewSessionSnapshotBaseline) {
      window.sessionStorage.removeItem(OVERVIEW_SESSION_SNAPSHOT_BASELINE_SESSION_KEY);
      return;
    }

    window.sessionStorage.setItem(
      OVERVIEW_SESSION_SNAPSHOT_BASELINE_SESSION_KEY,
      JSON.stringify(overviewSessionSnapshotBaseline),
    );
  }, [overviewSessionSnapshotBaseline]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedNotes = window.sessionStorage.getItem(LANE_OPERATOR_NOTES_SESSION_KEY);
    if (!storedNotes) {
      return;
    }

    try {
      const parsedNotes = JSON.parse(storedNotes) as Record<string, LaneOperatorNoteEntry>;
      setLaneOperatorNotes(parsedNotes);
    } catch {
      window.sessionStorage.removeItem(LANE_OPERATOR_NOTES_SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      LANE_OPERATOR_NOTES_SESSION_KEY,
      JSON.stringify(laneOperatorNotes),
    );
  }, [laneOperatorNotes]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedWorkspace = window.sessionStorage.getItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY);
    if (
      storedWorkspace === "home"
      || storedWorkspace === "create-game"
      || storedWorkspace === "create-movie"
      || storedWorkspace === "load-project"
      || storedWorkspace === "asset-forge"
      || storedWorkspace === "prompt"
      || storedWorkspace === "builder"
      || storedWorkspace === "operations"
      || storedWorkspace === "runtime"
      || storedWorkspace === "records"
    ) {
      setActiveWorkspaceId(storedWorkspace);
    }

    const storedOperationsSurface = window.sessionStorage.getItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY);
    if (
      storedOperationsSurface === "dispatch"
      || storedOperationsSurface === "agents"
      || storedOperationsSurface === "approvals"
      || storedOperationsSurface === "timeline"
    ) {
      setActiveOperationsSurface(storedOperationsSurface);
    }

    const storedRuntimeSurface = window.sessionStorage.getItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY);
    if (
      storedRuntimeSurface === "overview"
      || storedRuntimeSurface === "executors"
      || storedRuntimeSurface === "workspaces"
      || storedRuntimeSurface === "governance"
    ) {
      setActiveRuntimeSurface(storedRuntimeSurface);
    }

    const storedRecordsSurface = window.sessionStorage.getItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY);
    if (
      storedRecordsSurface === "runs"
      || storedRecordsSurface === "executions"
      || storedRecordsSurface === "artifacts"
      || storedRecordsSurface === "events"
    ) {
      setActiveRecordsSurface(storedRecordsSurface);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(ACTIVE_DESKTOP_WORKSPACE_SESSION_KEY, activeWorkspaceId);
  }, [activeWorkspaceId]);

  function selectDesktopNavigation(navItemId: string): void {
    switch (navItemId as DesktopNavItemId) {
      case "home":
        setActiveWorkspaceId("home");
        return;
      case "create-game":
      case "create-movie":
      case "load-project":
      case "asset-forge":
      case "prompt":
      case "builder":
      case "operations":
      case "runtime":
      case "records":
        setActiveWorkspaceId(navItemId as DesktopWorkspaceId);
        return;
      default:
        setActiveWorkspaceId("home");
    }
  }

  useEffect(() => {
    setVisitedWorkspaceIds((currentWorkspaceIds) => (
      currentWorkspaceIds.includes(activeWorkspaceId)
        ? currentWorkspaceIds
        : [...currentWorkspaceIds, activeWorkspaceId]
    ));
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (activeWorkspaceId !== "asset-forge") {
      return;
    }

    const headerElement = assetForgeHeaderRef.current;
    if (!headerElement) {
      return;
    }

    const updateHeaderHeight = () => {
      const nextHeight = Math.ceil(headerElement.getBoundingClientRect().height);
      setAssetForgeHeaderHeight((currentHeight) => (
        currentHeight === nextHeight ? currentHeight : nextHeight
      ));
    };

    updateHeaderHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateHeaderHeight();
    });
    observer.observe(headerElement);

    return () => {
      observer.disconnect();
    };
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(ACTIVE_OPERATIONS_SURFACE_SESSION_KEY, activeOperationsSurface);
  }, [activeOperationsSurface]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(ACTIVE_RUNTIME_SURFACE_SESSION_KEY, activeRuntimeSurface);
  }, [activeRuntimeSurface]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(ACTIVE_RECORDS_SURFACE_SESSION_KEY, activeRecordsSurface);
  }, [activeRecordsSurface]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      WORKSPACE_NEXT_STEP_RECENT_ACTIONS_SESSION_KEY,
      JSON.stringify(workspaceNextStepRecentActions),
    );
  }, [workspaceNextStepRecentActions]);

  useEffect(() => {
    if (!selectedRunId) {
      return;
    }

    setActiveWorkspaceId("records");
    setActiveRecordsSurface("runs");
  }, [selectedRunId]);

  useEffect(() => {
    if (!selectedExecutionId) {
      return;
    }

    setActiveWorkspaceId("records");
    setActiveRecordsSurface("executions");
  }, [selectedExecutionId]);

  useEffect(() => {
    if (!selectedArtifactId) {
      return;
    }

    setActiveWorkspaceId("records");
    setActiveRecordsSurface("artifacts");
  }, [selectedArtifactId]);

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }

    setActiveWorkspaceId("records");
    setActiveRecordsSurface("events");
  }, [selectedEventId]);

  useEffect(() => {
    if (!selectedExecutorId) {
      return;
    }

    setActiveWorkspaceId("runtime");
    setActiveRuntimeSurface("executors");
  }, [selectedExecutorId]);

  useEffect(() => {
    if (!selectedWorkspaceId) {
      return;
    }

    setActiveWorkspaceId("runtime");
    setActiveRuntimeSurface("workspaces");
  }, [selectedWorkspaceId]);

  useEffect(() => {
    if (!pendingLanePresetRestoreId || activeLanePresetId) {
      return;
    }

    const matchingPreset = lanePresets.find((preset) => preset.id === pendingLanePresetRestoreId) ?? null;
    if (!matchingPreset) {
      return;
    }

    const restoredAt = new Date().toISOString();
    if (matchingPreset.available) {
      applyLanePreset(matchingPreset.id, { source: "session", restoredAt });
    } else {
      setActiveLanePresetId(matchingPreset.id);
      setActiveLanePresetSource("session");
      setLanePresetRestoredAt(restoredAt);
    }
    setPendingLanePresetRestoreId(null);
  }, [activeLanePresetId, lanePresets, pendingLanePresetRestoreId]);

  useEffect(() => {
    const storageKey = getPinnedRecordStorageKey(pinnedRecord);
    if (!storageKey) {
      setLaneOperatorNoteDraft("");
      return;
    }

    setLaneOperatorNoteDraft(laneOperatorNotes[storageKey]?.text ?? "");
  }, [laneOperatorNotes, pinnedRecord]);

  useEffect(() => {
    function handleLaneKeyboardShortcuts(event: KeyboardEvent) {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        const isTypingSurface = tagName === "input"
          || tagName === "textarea"
          || tagName === "select"
          || target.isContentEditable;
        if (isTypingSurface) {
          return;
        }
      }

      if (event.key === "]" && nextPinnedLaneRecord) {
        event.preventDefault();
        openPinnedLaneQueueRecord();
        return;
      }

      if (event.key === "[" && laneMemory) {
        event.preventDefault();
        restoreLaneMemory();
      }
    }

    window.addEventListener("keydown", handleLaneKeyboardShortcuts);
    return () => {
      window.removeEventListener("keydown", handleLaneKeyboardShortcuts);
    };
  }, [laneMemory, nextPinnedLaneRecord]);

  async function loadCatalog() {
    try {
      const catalog = (await fetchToolsCatalog()) as ToolsCatalog;
      setCatalogAgents(catalog.agents ?? []);
      setCatalogError(null);
    } catch (error) {
      setCatalogError(
        error instanceof Error ? error.message : "Failed to load tools catalog",
      );
    }
  }

  async function loadCockpitRegistry() {
    try {
      const registryRecord = await fetchCockpitAppRegistry();
      setCockpitRegistrations(resolveCockpitAppRegistry(registryRecord));
    } catch {
      setCockpitRegistrations(cockpitAppRegistry);
    }
  }

  function getPreferredExecutionForRun(
    runId: string,
    executionItems: ExecutionListItem[] = executions,
  ): ExecutionListItem | null {
    const matchingExecutions = executionItems.filter((execution) => execution.run_id === runId);
    if (selectedExecutionId) {
      const selectedExecutionMatch = matchingExecutions.find(
        (execution) => execution.id === selectedExecutionId,
      );
      if (selectedExecutionMatch) {
        return selectedExecutionMatch;
      }
    }
    return getPreferredExecution(matchingExecutions);
  }

  function getPreferredExecutionReasonForRun(
    runId: string,
    executionItems: ExecutionListItem[] = executions,
  ) {
    const matchingExecutions = executionItems.filter((execution) => execution.run_id === runId);
    const preferredExecution = getPreferredExecutionForRun(runId, executionItems);
    if (!preferredExecution) {
      return null;
    }
    return describeExecutionPriority(
      preferredExecution,
      matchingExecutions,
      selectedExecutionId,
    );
  }

  function getPreferredExecutionActionForRun(
    runId: string,
    executionItems: ExecutionListItem[] = executions,
  ) {
    const preferredExecution = getPreferredExecutionForRun(runId, executionItems);
    if (!preferredExecution) {
      return null;
    }
    return recommendExecutionAction(preferredExecution, selectedExecutionId);
  }

  function getPreferredExecutionAttentionForRun(
    runId: string,
    executionItems: ExecutionListItem[] = executions,
  ) {
    const preferredExecution = getPreferredExecutionForRun(runId, executionItems);
    if (!preferredExecution) {
      return null;
    }
    return describeExecutionAttention(preferredExecution, selectedExecutionId);
  }

  function getWarningBearingExecutionForRun(
    runId: string,
    executionItems: ExecutionListItem[] = executions,
  ): ExecutionListItem | null {
    const warningExecutions = executionItems.filter(
      (execution) => execution.run_id === runId && execution.warning_count > 0,
    );
    if (warningExecutions.length === 0) {
      return null;
    }
    return [...warningExecutions].sort((left, right) => {
      const warningComparison = right.warning_count - left.warning_count;
      if (warningComparison !== 0) {
        return warningComparison;
      }
      return left.id.localeCompare(right.id);
    })[0] ?? null;
  }

  function isHighRiskArtifact(artifact: ArtifactListItem): boolean {
    return artifact.simulated
      || artifact.execution_mode === "simulated"
      || artifact.mutation_audit_status === "failed"
      || artifact.mutation_audit_status === "rolled_back"
      || artifact.mutation_audit_status === "preflight";
  }

  function getHighestRiskArtifact(artifactItems: ArtifactListItem[]): ArtifactListItem | null {
    const highRiskArtifacts = artifactItems.filter(isHighRiskArtifact);
    if (highRiskArtifacts.length === 0) {
      return null;
    }
    return getPreferredArtifact(highRiskArtifacts);
  }

  function openPinnedLaneQueueRecord() {
    if (!nextPinnedLaneRecord) {
      return;
    }
    setLaneHandoffSummary({
      label: "handoff: advanced lane",
      detail: `Advanced from ${pinnedRecord?.label ?? "the current lane"} to ${nextPinnedLaneRecord.label} under ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")} review.`,
    });
    if (nextPinnedLaneRecord.kind === "run") {
      openRunDetail(nextPinnedLaneRecord.id);
      return;
    }
    if (nextPinnedLaneRecord.kind === "execution") {
      openExecutionDetail(nextPinnedLaneRecord.id);
      return;
    }
    openArtifactDetail(nextPinnedLaneRecord.id);
  }

  function openPinnedLaneRolloverRecord() {
    if (!pinnedLaneRolloverRecord) {
      return;
    }
    setLaneHandoffSummary({
      label: "handoff: rolled over lane",
      detail: `Rolled the lane from ${pinnedRecord?.label ?? "the current record"} to ${pinnedLaneRolloverRecord.label} after the current queue reached completion.`,
    });
    if (pinnedLaneRolloverRecord.kind === "run") {
      openRunDetail(pinnedLaneRolloverRecord.id);
      return;
    }
    if (pinnedLaneRolloverRecord.kind === "execution") {
      openExecutionDetail(pinnedLaneRolloverRecord.id);
      return;
    }
    openArtifactDetail(pinnedLaneRolloverRecord.id);
  }

  async function loadApprovals() {
    setApprovalsLoading(true);
    try {
      const nextApprovals = await fetchApprovalCards();
      setApprovals(nextApprovals);
      setApprovalsRefreshedAt(new Date().toISOString());
      setApprovalsError(null);
    } catch (error) {
      setApprovalsError(
        error instanceof Error ? error.message : "Failed to load approvals",
      );
    } finally {
      setApprovalsLoading(false);
    }
  }

  async function loadAdapters() {
    setAdaptersLoading(true);
    try {
      const nextAdapters = await fetchAdapters();
      setAdapters(nextAdapters);
      setAdaptersError(null);
    } catch (error) {
      setAdaptersError(
        error instanceof Error ? error.message : "Failed to load adapters",
      );
    } finally {
      setAdaptersLoading(false);
    }
  }

  async function loadEvents() {
    setEventsLoading(true);
    try {
      const [nextEvents, nextEventRecords, nextEventSummary] = await Promise.all([
        fetchEventCards(),
        fetchEvents(),
        fetchEventSummary(),
      ]);
      setEvents(nextEvents);
      setEventRecords(nextEventRecords);
      setEventSummary(nextEventSummary);
      setEventsRefreshedAt(new Date().toISOString());
      setEventsError(null);
    } catch (error) {
      setEventsError(
        error instanceof Error ? error.message : "Failed to load events",
      );
    } finally {
      setEventsLoading(false);
    }
  }

  async function loadExecutors() {
    setExecutorsLoading(true);
    try {
      const nextExecutors = await fetchExecutors();
      setExecutors(nextExecutors);
      setExecutorsRefreshedAt(new Date().toISOString());
      setExecutorsError(null);
      return nextExecutors;
    } catch (error) {
      setExecutorsError(
        error instanceof Error ? error.message : "Failed to load executors",
      );
      return [];
    } finally {
      setExecutorsLoading(false);
    }
  }

  async function loadArtifacts(
    truthFilter: TruthFilterState = artifactTruthFilter,
  ) {
    setArtifactsLoading(true);
    try {
      const nextArtifacts = await fetchArtifactCardsForTruthFilter(truthFilter);
      setArtifacts(nextArtifacts);
      setArtifactsRefreshedAt(new Date().toISOString());
      setArtifactsError(null);
      return nextArtifacts;
    } catch (error) {
      setArtifactsError(
        error instanceof Error ? error.message : "Failed to load artifacts",
      );
      return [];
    } finally {
      setArtifactsLoading(false);
    }
  }

  async function loadRuns(
    toolFilter: ToolFilter = selectedToolFilter,
    auditFilter: AuditFilter = selectedAuditFilter,
    truthFilter: TruthFilterState = runTruthFilter,
    options?: {
      executionItems?: ExecutionListItem[];
      announceSelectionRefresh?: boolean;
    },
  ) {
    setRunsLoading(true);
    try {
      const [nextRuns, nextRunsSummary] = await Promise.all([
        fetchRunCards(toolFilter, auditFilter, truthFilter),
        fetchRunsSummaryForFilter(toolFilter, auditFilter),
      ]);
      setRuns(nextRuns);
      setRunAudits(nextRunsSummary.runAudits);
      setSettingsPatchAuditSummary(nextRunsSummary.settingsPatchAuditSummary);
      setRunsRefreshedAt(new Date().toISOString());
      setRunsError(null);
      if (selectedRunId && nextRuns.some((item) => item.id === selectedRunId)) {
        await loadRunDetail(selectedRunId, options?.executionItems);
        if (options?.announceSelectionRefresh) {
          setRunDetailRefreshHint("Refresh preserved the selected run detail.");
        }
      } else if (selectedRunId) {
        setSelectedRunId(null);
        setSelectedRun(null);
        setSelectedExecutionDetails(null);
        if (options?.announceSelectionRefresh) {
          setRunDetailRefreshHint("Selected run is no longer present after refresh.");
        }
      } else if (options?.announceSelectionRefresh) {
        setRunDetailRefreshHint(null);
      }
      return nextRuns;
    } catch (error) {
      setRunsError(
        error instanceof Error ? error.message : "Failed to load runs",
      );
      return [];
    } finally {
      setRunsLoading(false);
    }
  }

  async function loadRunDetail(
    runId: string,
    executionItems: ExecutionListItem[] = executions,
  ) {
    setSelectedRunId(runId);
    setSelectedRunLoading(true);
    setSelectedExecutionDetails(null);
    try {
      const nextRun = await fetchRun(runId);
      setSelectedRun(nextRun);
      const matchingExecution = getPreferredExecutionForRun(runId, executionItems);
      if (matchingExecution) {
        const nextExecution = await fetchExecution(matchingExecution.id);
        setSelectedExecutionDetails(
          (nextExecution.details as Record<string, unknown> | null | undefined) ?? null,
        );
      }
      setRunDetailRefreshedAt(new Date().toISOString());
      setSelectedRunError(null);
    } catch (error) {
      setSelectedRunError(
        error instanceof Error ? error.message : "Failed to load run detail",
      );
    } finally {
      setSelectedRunLoading(false);
    }
  }

  async function loadExecutionDetail(executionId: string) {
    setSelectedExecutionId(executionId);
    setSelectedExecutionLoading(true);
    try {
      const nextExecution = await fetchExecution(executionId);
      setSelectedExecution(nextExecution);
      setExecutionDetailRefreshedAt(new Date().toISOString());
      setSelectedExecutionError(null);
    } catch (error) {
      setSelectedExecutionError(
        error instanceof Error ? error.message : "Failed to load execution detail",
      );
    } finally {
      setSelectedExecutionLoading(false);
    }
  }

  async function loadArtifactDetail(artifactId: string) {
    setSelectedArtifactId(artifactId);
    setSelectedArtifactLoading(true);
    try {
      const nextArtifact = await fetchArtifact(artifactId);
      setSelectedArtifact(nextArtifact);
      setArtifactDetailRefreshedAt(new Date().toISOString());
      setSelectedArtifactError(null);
    } catch (error) {
      setSelectedArtifactError(
        error instanceof Error ? error.message : "Failed to load artifact detail",
      );
    } finally {
      setSelectedArtifactLoading(false);
    }
  }

  async function loadEventDetail(eventId: string) {
    setSelectedEventId(eventId);
    setSelectedEventLoading(true);
    setSelectedEventError(null);
    setSelectedEventDetail(null);
    try {
      const nextEventDetail = await fetchEventDetail(eventId);
      setSelectedEventDetail(nextEventDetail);
      setEventDetailRefreshedAt(new Date().toISOString());
    } catch (error) {
      setSelectedEventError(
        error instanceof Error ? error.message : "Failed to load event detail",
      );
    } finally {
      setSelectedEventLoading(false);
    }
  }

  async function loadExecutions(
    truthFilter: TruthFilterState = executionTruthFilter,
  ) {
    setExecutionsLoading(true);
    try {
      const nextExecutions = await fetchExecutionCardsForTruthFilter(truthFilter);
      setExecutions(nextExecutions);
      setExecutionsRefreshedAt(new Date().toISOString());
      setExecutionsError(null);
      return nextExecutions;
    } catch (error) {
      setExecutionsError(
        error instanceof Error ? error.message : "Failed to load executions",
      );
      return [];
    } finally {
      setExecutionsLoading(false);
    }
  }

  async function loadWorkspaces() {
    setWorkspacesLoading(true);
    try {
      const nextWorkspaces = await fetchWorkspaces();
      setWorkspaces(nextWorkspaces);
      setWorkspacesRefreshedAt(new Date().toISOString());
      setWorkspacesError(null);
      return nextWorkspaces;
    } catch (error) {
      setWorkspacesError(
        error instanceof Error ? error.message : "Failed to load workspaces",
      );
      return [];
    } finally {
      setWorkspacesLoading(false);
    }
  }

  async function loadExecutorDetail(executorId: string) {
    setSelectedExecutorId(executorId);
    setSelectedExecutorLoading(true);
    try {
      const nextExecutor = await fetchExecutor(executorId);
      setSelectedExecutor(nextExecutor);
      setExecutorDetailRefreshedAt(new Date().toISOString());
      setSelectedExecutorError(null);
    } catch (error) {
      setSelectedExecutorError(
        error instanceof Error ? error.message : "Failed to load executor detail",
      );
    } finally {
      setSelectedExecutorLoading(false);
    }
  }

  async function loadWorkspaceDetail(workspaceId: string) {
    setSelectedWorkspaceId(workspaceId);
    setSelectedWorkspaceLoading(true);
    try {
      const nextWorkspace = await fetchWorkspace(workspaceId);
      setSelectedWorkspace(nextWorkspace);
      setWorkspaceDetailRefreshedAt(new Date().toISOString());
      setSelectedWorkspaceError(null);
    } catch (error) {
      setSelectedWorkspaceError(
        error instanceof Error ? error.message : "Failed to load workspace detail",
      );
    } finally {
      setSelectedWorkspaceLoading(false);
    }
  }

  async function loadLocks() {
    setLocksLoading(true);
    try {
      const nextLocks = await fetchLockCards();
      setLocks(nextLocks);
      setLocksError(null);
    } catch (error) {
      setLocksError(
        error instanceof Error ? error.message : "Failed to load locks",
      );
    } finally {
      setLocksLoading(false);
    }
  }

  async function loadPolicies() {
    setPoliciesLoading(true);
    try {
      const nextPolicies = await fetchPolicies();
      setPolicies(nextPolicies);
      setPoliciesError(null);
    } catch (error) {
      setPoliciesError(
        error instanceof Error ? error.message : "Failed to load policies",
      );
    } finally {
      setPoliciesLoading(false);
    }
  }

  async function loadReadiness() {
    setReadinessLoading(true);
    try {
      const nextReadiness = await fetchReadiness();
      setReadiness(nextReadiness);
      setReadinessError(null);
    } catch (error) {
      setReadinessError(
        error instanceof Error ? error.message : "Failed to load system status",
      );
    } finally {
      setReadinessLoading(false);
    }
  }

  async function loadO3deBridgeStatus() {
    setO3deBridgeLoading(true);
    try {
      const nextBridgeStatus = await fetchO3deBridge();
      setO3deBridgeStatus(nextBridgeStatus);
      setO3deBridgeError(null);
    } catch (error) {
      setO3deBridgeError(
        error instanceof Error ? error.message : "Failed to load O3DE bridge status",
      );
    } finally {
      setO3deBridgeLoading(false);
    }
  }

  async function handleCleanupO3deBridgeResults() {
    setO3deBridgeCleanupBusy(true);
    setO3deBridgeCleanupStatus(null);
    setDashboardRefreshStatus("cleaning bridge result artifacts");
    setDashboardRefreshDetail(
      "Removing stale successful bridge transport responses while preserving deadletters.",
    );
    try {
      const cleanupResult = await cleanupO3deBridgeResults();
      await loadO3deBridgeStatus();
      const deletedCount = cleanupResult.deleted_response_count;
      const retainedCount = cleanupResult.retained_response_count;
      const deadletterCount = cleanupResult.deadletter_preserved_count;
      const cleanupStatus = deletedCount > 0
        ? `Removed ${deletedCount} stale successful bridge response${deletedCount === 1 ? "" : "s"}; retained ${retainedCount}; preserved ${deadletterCount} deadletter command${deadletterCount === 1 ? "" : "s"}.`
        : `No stale successful bridge responses were removed; retained ${retainedCount}; preserved ${deadletterCount} deadletter command${deadletterCount === 1 ? "" : "s"}.`;
      setO3deBridgeCleanupStatus(cleanupStatus);
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus("bridge cleanup complete");
      setDashboardRefreshDetail(cleanupStatus);
    } catch (error) {
      const cleanupError = error instanceof Error
        ? error.message
        : "Failed to clean O3DE bridge result artifacts";
      setO3deBridgeCleanupStatus(`Bridge cleanup failed: ${cleanupError}`);
      setDashboardRefreshStatus("bridge cleanup failed");
      setDashboardRefreshDetail(cleanupError);
    } finally {
      setO3deBridgeCleanupBusy(false);
    }
  }

  function scheduleBridgeFollowupRefresh(response: ResponseEnvelope) {
    const result = response.result;
    if (!result) {
      return;
    }

    const tool = typeof result.tool === "string" ? result.tool : null;
    const executionMode = typeof result.execution_mode === "string"
      ? result.execution_mode
      : null;
    const simulated = result.simulated === true;

    if (
      simulated
      || executionMode !== "real"
      || (tool !== "editor.session.open" && tool !== "editor.level.open")
    ) {
      return;
    }

    if (bridgeFollowupRefreshTimeoutRef.current !== null) {
      window.clearTimeout(bridgeFollowupRefreshTimeoutRef.current);
    }

    bridgeFollowupRefreshTimeoutRef.current = window.setTimeout(() => {
      void loadO3deBridgeStatus();
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus("bridge context refresh complete");
      setDashboardRefreshDetail(
        "Refreshed bridge heartbeat after the admitted real editor action so the operator card can catch the next context pulse.",
      );
      bridgeFollowupRefreshTimeoutRef.current = null;
    }, 2500);
  }

  async function loadControlPlaneSummary() {
    setControlPlaneSummaryLoading(true);
    try {
      const nextSummary = await fetchControlPlaneSummary();
      setControlPlaneSummary(nextSummary);
      setOperatorOverviewRefreshedAt(new Date().toISOString());
      setControlPlaneSummaryError(null);
    } catch (error) {
      setControlPlaneSummaryError(
        error instanceof Error ? error.message : "Failed to load operator overview",
      );
    } finally {
      setControlPlaneSummaryLoading(false);
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      await loadCockpitRegistry();
      await loadCatalog();

      await loadApprovals();
      await loadAdapters();
      await loadArtifacts();
      await loadEvents();
      await loadExecutors();
      await loadExecutions();
      await loadLocks();
      await loadPolicies();
      await loadReadiness();
      await loadO3deBridgeStatus();
      await loadControlPlaneSummary();
      await loadWorkspaces();
      try {
        const [nextRuns, nextRunsSummary] = await Promise.all([
          fetchRunCards("all", "all", runTruthFilter),
          fetchRunsSummaryForFilter("all", "all"),
        ]);
        setRuns(nextRuns);
        setRunAudits(nextRunsSummary.runAudits);
        setSettingsPatchAuditSummary(nextRunsSummary.settingsPatchAuditSummary);
        setRunsError(null);
      } catch (error) {
        setRunsError(
          error instanceof Error ? error.message : "Failed to load runs",
        );
      } finally {
        setRunsLoading(false);
        setDashboardRefreshedAt(new Date().toISOString());
        setDashboardRefreshStatus("initial load complete");
      }
    }

    void loadInitialData();
  }, []);

  async function handleApprovalDecision(
    approvalId: string,
    action: "approve" | "reject",
  ) {
    setBusyApprovalId(approvalId);
    try {
      if (action === "approve") {
        await approveApproval(approvalId);
      } else {
        await rejectApproval(approvalId);
      }
      announceRunDetailRefreshRef.current = true;
      await refreshDashboardState();
    } catch (error) {
      setApprovalsError(
        error instanceof Error ? error.message : "Failed to update approval",
      );
    } finally {
      setBusyApprovalId(null);
    }
  }

  function handleDispatchResponse(response: ResponseEnvelope) {
    setLastResponse(response);
    announceRunDetailRefreshRef.current = true;
    scheduleBridgeFollowupRefresh(response);
    void refreshDashboardState();
  }

  useEffect(() => {
    return () => {
      if (bridgeFollowupRefreshTimeoutRef.current !== null) {
        window.clearTimeout(bridgeFollowupRefreshTimeoutRef.current);
      }
    };
  }, []);

  function openFirstRunLaneMatch(runItems: RunListItem[]): void {
    const preferredRun = runItems[0] ?? null;
    if (!preferredRun) {
      return;
    }
    openRunDetail(preferredRun.id, {
      autoOpenedFromOverview: buildOverviewAutoOpenHint(
        runsFocusLabel,
        "Chosen as the first matching run in the filtered overview results.",
      ),
    });
  }

  function openFirstExecutionLaneMatch(executionItems: ExecutionListItem[]): void {
    const preferredExecution = getPreferredExecution(executionItems);
    if (!preferredExecution) {
      return;
    }
    const selectionReason = describeExecutionPriority(
      preferredExecution,
      executionItems,
      null,
    );
    openExecutionDetail(preferredExecution.id, {
      autoOpenedFromOverview: buildOverviewAutoOpenHint(
        executionsFocusLabel,
        selectionReason.description,
      ),
    });
  }

  function openFirstArtifactLaneMatch(artifactItems: ArtifactListItem[]): void {
    const preferredArtifact = getPreferredArtifact(artifactItems);
    if (!preferredArtifact) {
      return;
    }
    const selectionReason = describeArtifactPriority(
      preferredArtifact,
      artifactItems,
      null,
    );
    openArtifactDetail(preferredArtifact.id, {
      autoOpenedFromOverview: buildOverviewAutoOpenHint(
        artifactsFocusLabel,
        selectionReason.description,
      ),
    });
  }

  function openFirstExecutorLaneMatch(executorItems: ExecutorRecord[]): void {
    const preferredExecutor = executorItems[0] ?? null;
    if (!preferredExecutor) {
      return;
    }
    openExecutorDetail(preferredExecutor.id);
  }

  function openFirstWorkspaceLaneMatch(workspaceItems: WorkspaceRecord[]): void {
    const preferredWorkspace = workspaceItems[0] ?? null;
    if (!preferredWorkspace) {
      return;
    }
    openWorkspaceDetail(preferredWorkspace.id);
  }

  function handleAuditFilterChange(filter: AuditFilter) {
    setSelectedAuditFilter(filter);
    void loadRuns(selectedToolFilter, filter);
  }

  function handleToolFilterChange(filter: ToolFilter) {
    setSelectedToolFilter(filter);
    void loadRuns(filter, selectedAuditFilter);
  }

  function scrollToSection(target: HTMLElement | null) {
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildRunsLaneOverviewOptions(options: {
    focusLabel: string;
    searchPreset: string;
    truthFilter?: TruthFilterState;
    runFilter?: (item: RunListItem) => boolean;
  }) {
    return {
      ...options,
      setSelectedToolFilter,
      setSelectedAuditFilter,
      setRunTruthFilter,
      setRunsSearchPreset,
      setRunsFocusLabel,
      setActiveFocusedSection,
      setUpdatedFocusedSection,
      setRunsSearchVersion,
      loadRuns,
      setRunDetailRefreshHint,
      openFirstRunLaneMatch,
      scrollToSection: () => scrollToSection(runsSectionRef.current),
    };
  }

  function buildExecutionLaneOverviewOptions(options: {
    focusLabel: string;
    searchPreset: string;
    truthFilter?: TruthFilterState;
    executionFilter?: (item: ExecutionListItem) => boolean;
  }) {
    return {
      ...options,
      setExecutionTruthFilter,
      setExecutionsSearchPreset,
      setExecutionsFocusLabel,
      setActiveFocusedSection,
      setUpdatedFocusedSection,
      setExecutionsSearchVersion,
      loadExecutions,
      openFirstExecutionLaneMatch,
      scrollToSection: () => scrollToSection(executionsSectionRef.current),
    };
  }

  function buildArtifactLaneOverviewOptions(options: {
    focusLabel: string;
    searchPreset: string;
    truthFilter?: TruthFilterState;
    artifactFilter?: (item: ArtifactListItem) => boolean;
  }) {
    return {
      ...options,
      setArtifactTruthFilter,
      setArtifactsSearchPreset,
      setArtifactsFocusLabel,
      setActiveFocusedSection,
      setUpdatedFocusedSection,
      setArtifactsSearchVersion,
      loadArtifacts,
      openFirstArtifactLaneMatch,
      scrollToSection: () => scrollToSection(artifactsSectionRef.current),
    };
  }

  function describeOverviewFocusOrigin(focusLabel: string | null): string | null {
    const normalizedLabel = focusLabel?.trim().toLowerCase();
    if (!normalizedLabel) {
      return null;
    }
    if (normalizedLabel.startsWith("status = ")) {
      return "status drilldown";
    }
    if (normalizedLabel.startsWith("execution mode = ")) {
      return "execution-mode drilldown";
    }
    if (normalizedLabel.startsWith("artifact mode = ")) {
      return "artifact-mode drilldown";
    }
    if (normalizedLabel.startsWith("severity = ")) {
      return "event-severity drilldown";
    }
    if (normalizedLabel.startsWith("inspection surface = ")) {
      return "inspection-surface drilldown";
    }
    if (normalizedLabel.startsWith("fallback category = ")) {
      return "fallback-category drilldown";
    }
    if (normalizedLabel.startsWith("manifest source of truth = ")) {
      return "manifest-source-of-truth drilldown";
    }
    if (normalizedLabel.startsWith("executor availability = ")) {
      return "executor-availability drilldown";
    }
    if (normalizedLabel.startsWith("workspace state = ")) {
      return "workspace-state drilldown";
    }
    return "overview drilldown";
  }

  function describeOverviewAutoOpenOutcome(refreshHint: string | null): string | null {
    const normalizedHint = refreshHint?.trim();
    if (!normalizedHint || !normalizedHint.startsWith("Auto-opened from overview drilldown")) {
      return null;
    }

    const firstSentenceBreak = normalizedHint.indexOf(". ");
    if (firstSentenceBreak === -1) {
      return "Preferred detail record was opened automatically.";
    }

    return normalizedHint.slice(firstSentenceBreak + 2).trim();
  }

  function pushOverviewContextHistory<TKind extends string>(
    history: OverviewContextHistoryEntry<TKind>[],
    entry: OverviewContextHistoryEntry<TKind>,
  ): OverviewContextHistoryEntry<TKind>[] {
    return [
      entry,
      ...history.filter((item) => item.id !== entry.id),
    ].slice(0, 2);
  }

  function promoteOverviewContextPreset<TKind extends string>(
    entry: OverviewContextHistoryEntry<TKind>,
  ): OverviewContextPresetEntry<TKind> {
    return {
      ...entry,
      savedAt: new Date().toISOString(),
    };
  }

  function replayRunsOverviewContext(
    entry: OverviewContextHistoryEntry<RunsOverviewContextKind>,
  ): Promise<void> {
    if (entry.kind === "status") {
      return activateRunsLaneFromOverview(buildRunsLaneOverviewOptions({
        focusLabel: entry.focusLabel,
        searchPreset: entry.value,
        runFilter: (item) => item.status === entry.value,
      }));
    }

    return activateRunsLaneFromOverview(buildRunsLaneOverviewOptions({
      focusLabel: entry.focusLabel,
      searchPreset: entry.value,
      truthFilter: createTruthFilterForDimension(entry.kind, entry.value),
    }));
  }

  function replayExecutionsOverviewContext(
    entry: OverviewContextHistoryEntry<ExecutionsOverviewContextKind>,
  ): void {
    if (entry.kind === "execution_mode") {
      activateExecutionLaneFromOverview(buildExecutionLaneOverviewOptions({
        focusLabel: entry.focusLabel,
        searchPreset: entry.value,
        executionFilter: (item) => item.execution_mode === entry.value,
      }));
      return;
    }

    activateExecutionLaneFromOverview(buildExecutionLaneOverviewOptions({
      focusLabel: entry.focusLabel,
      searchPreset: entry.value,
      truthFilter: createTruthFilterForDimension(entry.kind, entry.value),
    }));
  }

  function replayArtifactsOverviewContext(
    entry: OverviewContextHistoryEntry<ArtifactsOverviewContextKind>,
  ): void {
    if (entry.kind === "artifact_mode") {
      activateArtifactLaneFromOverview(buildArtifactLaneOverviewOptions({
        focusLabel: entry.focusLabel,
        searchPreset: entry.value,
        artifactFilter: (item) => {
          if (entry.value === "simulated") {
            return item.simulated || item.execution_mode === "simulated";
          }
          return item.execution_mode === entry.value;
        },
      }));
      return;
    }

    activateArtifactLaneFromOverview(buildArtifactLaneOverviewOptions({
      focusLabel: entry.focusLabel,
      searchPreset: entry.value,
      truthFilter: createTruthFilterForDimension(entry.kind, entry.value),
    }));
  }

  function replayExecutorsOverviewContext(
    entry: OverviewContextHistoryEntry<ExecutorsOverviewContextKind>,
  ): void {
    setExecutorsSearchPreset(entry.value);
    setExecutorsFocusLabel(entry.focusLabel);
    setActiveFocusedSection("executors");
    setUpdatedFocusedSection(null);
    setExecutorsSearchVersion((value) => value + 1);
    void loadExecutors().then((items) => {
      openFirstExecutorLaneMatch(
        items.filter((executor) => executor.availability_state === entry.value),
      );
    });
    scrollToSection(executorsSectionRef.current);
  }

  function replayWorkspacesOverviewContext(
    entry: OverviewContextHistoryEntry<WorkspacesOverviewContextKind>,
  ): void {
    setWorkspacesSearchPreset(entry.value);
    setWorkspacesFocusLabel(entry.focusLabel);
    setActiveFocusedSection("workspaces");
    setUpdatedFocusedSection(null);
    setWorkspacesSearchVersion((value) => value + 1);
    void loadWorkspaces().then((items) => {
      openFirstWorkspaceLaneMatch(
        items.filter((workspace) => workspace.workspace_state === entry.value),
      );
    });
    scrollToSection(workspacesSectionRef.current);
  }

  function getCurrentRunsOverviewContextEntry():
    | OverviewContextHistoryEntry<RunsOverviewContextKind>
    | null {
    if (!runsFocusLabel) {
      return null;
    }
    return runsOverviewContextHistory.find((entry) => entry.focusLabel === runsFocusLabel) ?? null;
  }

  function getCurrentExecutionsOverviewContextEntry():
    | OverviewContextHistoryEntry<ExecutionsOverviewContextKind>
    | null {
    if (!executionsFocusLabel) {
      return null;
    }
    return executionsOverviewContextHistory.find(
      (entry) => entry.focusLabel === executionsFocusLabel,
    ) ?? null;
  }

  function getCurrentArtifactsOverviewContextEntry():
    | OverviewContextHistoryEntry<ArtifactsOverviewContextKind>
    | null {
    if (!artifactsFocusLabel) {
      return null;
    }
    return artifactsOverviewContextHistory.find(
      (entry) => entry.focusLabel === artifactsFocusLabel,
    ) ?? null;
  }

  function getCurrentExecutorsOverviewContextEntry():
    | OverviewContextHistoryEntry<ExecutorsOverviewContextKind>
    | null {
    if (!executorsFocusLabel) {
      return null;
    }
    return executorsOverviewContextHistory.find(
      (entry) => entry.focusLabel === executorsFocusLabel,
    ) ?? null;
  }

  function getCurrentWorkspacesOverviewContextEntry():
    | OverviewContextHistoryEntry<WorkspacesOverviewContextKind>
    | null {
    if (!workspacesFocusLabel) {
      return null;
    }
    return workspacesOverviewContextHistory.find(
      (entry) => entry.focusLabel === workspacesFocusLabel,
    ) ?? null;
  }

  function getRunsOverviewImpactSummary(): { label: string; detail: string | null } | null {
    const activeEntry = getCurrentRunsOverviewContextEntry();
    if (!activeEntry) {
      return null;
    }

    const matchingRuns = runs.filter((run) => {
      if (activeEntry.kind === "status") {
        return run.status === activeEntry.value;
      }
      if (activeEntry.kind === "inspection_surface") {
        return run.inspection_surface === activeEntry.value;
      }
      if (activeEntry.kind === "fallback_category") {
        return run.fallback_category === activeEntry.value;
      }
      return run.project_manifest_source_of_truth === activeEntry.value;
    });
    const simulatedCount = matchingRuns.filter(
      (run) => run.execution_mode === "simulated" || run.dry_run,
    ).length;

    return {
      label: `${matchingRuns.length} run${matchingRuns.length === 1 ? "" : "s"} currently match this context.`,
      detail: simulatedCount > 0
        ? `${simulatedCount} ${simulatedCount === 1 ? "record remains" : "records remain"} explicitly simulated or dry-run.`
        : "No matching runs in this slice are currently marked simulated or dry-run.",
    };
  }

  function getExecutionsOverviewImpactSummary(): { label: string; detail: string | null } | null {
    const activeEntry = getCurrentExecutionsOverviewContextEntry();
    if (!activeEntry) {
      return null;
    }

    const matchingExecutions = executions.filter((execution) => {
      if (activeEntry.kind === "execution_mode") {
        return execution.execution_mode === activeEntry.value;
      }
      if (activeEntry.kind === "inspection_surface") {
        return execution.inspection_surface === activeEntry.value;
      }
      if (activeEntry.kind === "fallback_category") {
        return execution.fallback_category === activeEntry.value;
      }
      return execution.project_manifest_source_of_truth === activeEntry.value;
    });
    const warningBearingCount = matchingExecutions.filter(
      (execution) => execution.warning_count > 0,
    ).length;

    return {
      label: `${matchingExecutions.length} execution${matchingExecutions.length === 1 ? "" : "s"} currently match this context.`,
      detail: warningBearingCount > 0
        ? `${warningBearingCount} ${warningBearingCount === 1 ? "execution carries" : "executions carry"} persisted warnings inside this slice.`
        : "No matching executions in this slice currently carry persisted warnings.",
    };
  }

  function getArtifactsOverviewImpactSummary(): { label: string; detail: string | null } | null {
    const activeEntry = getCurrentArtifactsOverviewContextEntry();
    if (!activeEntry) {
      return null;
    }

    const matchingArtifacts = artifacts.filter((artifact) => {
      if (activeEntry.kind === "artifact_mode") {
        if (activeEntry.value === "simulated") {
          return artifact.simulated || artifact.execution_mode === "simulated";
        }
        return artifact.execution_mode === activeEntry.value;
      }
      if (activeEntry.kind === "inspection_surface") {
        return artifact.inspection_surface === activeEntry.value;
      }
      if (activeEntry.kind === "fallback_category") {
        return artifact.fallback_category === activeEntry.value;
      }
      return artifact.project_manifest_source_of_truth === activeEntry.value;
    });
    const simulatedCount = matchingArtifacts.filter(
      (artifact) => artifact.simulated || artifact.execution_mode === "simulated",
    ).length;

    return {
      label: `${matchingArtifacts.length} artifact${matchingArtifacts.length === 1 ? "" : "s"} currently match this context.`,
      detail: simulatedCount > 0
        ? `${simulatedCount} ${simulatedCount === 1 ? "artifact remains" : "artifacts remain"} explicitly simulated inside this slice.`
        : "No matching artifacts in this slice are currently marked simulated.",
    };
  }

  function getExecutorsOverviewImpactSummary(): { label: string; detail: string | null } | null {
    const activeEntry = getCurrentExecutorsOverviewContextEntry();
    if (!activeEntry) {
      return null;
    }

    const matchingExecutors = executors.filter(
      (executor) => executor.availability_state === activeEntry.value,
    );
    const activeCount = matchingExecutors.filter(
      (executor) => executor.availability_state === "active",
    ).length;

    return {
      label: `${matchingExecutors.length} executor${matchingExecutors.length === 1 ? "" : "s"} currently match this context.`,
      detail: activeCount > 0
        ? `${activeCount} ${activeCount === 1 ? "executor remains" : "executors remain"} in the active availability state inside this bookkeeping slice.`
        : "No matching executors in this slice currently report active availability.",
    };
  }

  function getWorkspacesOverviewImpactSummary(): { label: string; detail: string | null } | null {
    const activeEntry = getCurrentWorkspacesOverviewContextEntry();
    if (!activeEntry) {
      return null;
    }

    const matchingWorkspaces = workspaces.filter(
      (workspace) => workspace.workspace_state === activeEntry.value,
    );
    const attachedCount = matchingWorkspaces.filter(
      (workspace) => Boolean(workspace.owner_executor_id),
    ).length;

    return {
      label: `${matchingWorkspaces.length} workspace${matchingWorkspaces.length === 1 ? "" : "s"} currently match this context.`,
      detail: attachedCount > 0
        ? `${attachedCount} ${attachedCount === 1 ? "workspace remains" : "workspaces remain"} assigned to an executor inside this bookkeeping slice.`
        : "No matching workspaces in this slice currently report an owning executor.",
    };
  }

  function handlePromoteRunsOverviewContextPreset() {
    const activeEntry = getCurrentRunsOverviewContextEntry();
    if (!activeEntry) {
      return;
    }
    setRunsOverviewContextPreset(promoteOverviewContextPreset(activeEntry));
    setLaneHandoffSummary({
      label: "handoff: local run context preset saved",
      detail: `Saved ${activeEntry.focusLabel} as a browser-session run context preset. This does not create or persist a backend preset.`,
    });
  }

  function handlePromoteExecutionsOverviewContextPreset() {
    const activeEntry = getCurrentExecutionsOverviewContextEntry();
    if (!activeEntry) {
      return;
    }
    setExecutionsOverviewContextPreset(promoteOverviewContextPreset(activeEntry));
    setLaneHandoffSummary({
      label: "handoff: local execution context preset saved",
      detail: `Saved ${activeEntry.focusLabel} as a browser-session execution context preset. This does not create or persist a backend preset.`,
    });
  }

  function handlePromoteArtifactsOverviewContextPreset() {
    const activeEntry = getCurrentArtifactsOverviewContextEntry();
    if (!activeEntry) {
      return;
    }
    setArtifactsOverviewContextPreset(promoteOverviewContextPreset(activeEntry));
    setLaneHandoffSummary({
      label: "handoff: local artifact context preset saved",
      detail: `Saved ${activeEntry.focusLabel} as a browser-session artifact context preset. This does not create or persist a backend preset.`,
    });
  }

  function handlePromoteExecutorsOverviewContextPreset() {
    const activeEntry = getCurrentExecutorsOverviewContextEntry();
    if (!activeEntry) {
      return;
    }
    setExecutorsOverviewContextPreset(promoteOverviewContextPreset(activeEntry));
    setLaneHandoffSummary({
      label: "handoff: local executor context preset saved",
      detail: `Saved ${activeEntry.focusLabel} as a browser-session executor context preset. This does not create or persist a backend preset.`,
    });
  }

  function handlePromoteWorkspacesOverviewContextPreset() {
    const activeEntry = getCurrentWorkspacesOverviewContextEntry();
    if (!activeEntry) {
      return;
    }
    setWorkspacesOverviewContextPreset(promoteOverviewContextPreset(activeEntry));
    setLaneHandoffSummary({
      label: "handoff: local workspace context preset saved",
      detail: `Saved ${activeEntry.focusLabel} as a browser-session workspace context preset. This does not create or persist a backend preset.`,
    });
  }

  function getExecutionItemsForSavedContext(
    entry: OverviewContextPresetEntry<ExecutionsOverviewContextKind>,
  ): ExecutionListItem[] {
    return executions.filter((execution) => {
      if (entry.kind === "execution_mode") {
        return execution.execution_mode === entry.value;
      }
      if (entry.kind === "inspection_surface") {
        return execution.inspection_surface === entry.value;
      }
      if (entry.kind === "fallback_category") {
        return execution.fallback_category === entry.value;
      }
      return execution.project_manifest_source_of_truth === entry.value;
    });
  }

  function getRunItemsForSavedContext(
    entry: OverviewContextPresetEntry<RunsOverviewContextKind>,
  ): RunListItem[] {
    return runs.filter((run) => {
      if (entry.kind === "status") {
        return run.status === entry.value;
      }
      if (entry.kind === "inspection_surface") {
        return run.inspection_surface === entry.value;
      }
      if (entry.kind === "fallback_category") {
        return run.fallback_category === entry.value;
      }
      return run.project_manifest_source_of_truth === entry.value;
    });
  }

  function getArtifactItemsForSavedContext(
    entry: OverviewContextPresetEntry<ArtifactsOverviewContextKind>,
  ): ArtifactListItem[] {
    return artifacts.filter((artifact) => {
      if (entry.kind === "artifact_mode") {
        if (entry.value === "simulated") {
          return artifact.simulated || artifact.execution_mode === "simulated";
        }
        return artifact.execution_mode === entry.value;
      }
      if (entry.kind === "inspection_surface") {
        return artifact.inspection_surface === entry.value;
      }
      if (entry.kind === "fallback_category") {
        return artifact.fallback_category === entry.value;
      }
      return artifact.project_manifest_source_of_truth === entry.value;
    });
  }

  function handleTriageSavedExecutionContext() {
    if (!executionsOverviewContextPreset) {
      return;
    }
    replayExecutionsOverviewContext(executionsOverviewContextPreset);
    const matchingExecutions = getExecutionItemsForSavedContext(executionsOverviewContextPreset);
    const preferredExecution = getPreferredExecution(matchingExecutions);
    if (!preferredExecution) {
      return;
    }
    openExecutionDetail(preferredExecution.id, {
      autoOpenedFromOverview: `Auto-opened from saved local execution context for ${executionsOverviewContextPreset.focusLabel}. ${describeExecutionPriority(preferredExecution, matchingExecutions, selectedExecutionId).description}`,
    });
    setLaneHandoffSummary({
      label: "handoff: triage saved execution context",
      detail: `Reopened the saved local execution context for ${executionsOverviewContextPreset.focusLabel} and jumped to the highest-priority persisted execution in that slice.`,
    });
  }

  function handleTriageSavedArtifactContext() {
    if (!artifactsOverviewContextPreset) {
      return;
    }
    replayArtifactsOverviewContext(artifactsOverviewContextPreset);
    const matchingArtifacts = getArtifactItemsForSavedContext(artifactsOverviewContextPreset);
    const preferredArtifact = getPreferredArtifact(matchingArtifacts);
    if (!preferredArtifact) {
      return;
    }
    openArtifactDetail(preferredArtifact.id, {
      autoOpenedFromOverview: `Auto-opened from saved local artifact context for ${artifactsOverviewContextPreset.focusLabel}. ${describeArtifactPriority(preferredArtifact, matchingArtifacts, selectedArtifactId).description}`,
    });
    setLaneHandoffSummary({
      label: "handoff: triage saved artifact context",
      detail: `Reopened the saved local artifact context for ${artifactsOverviewContextPreset.focusLabel} and jumped to the highest-priority persisted artifact in that slice.`,
    });
  }

  function handleTriageSavedExecutorContext() {
    if (!executorsOverviewContextPreset) {
      return;
    }
    replayExecutorsOverviewContext(executorsOverviewContextPreset);
    const matchingExecutors = executors.filter(
      (executor) => executor.availability_state === executorsOverviewContextPreset.value,
    );
    const preferredExecutor = matchingExecutors[0] ?? null;
    if (!preferredExecutor) {
      return;
    }
    openExecutorDetail(preferredExecutor.id);
    setLaneHandoffSummary({
      label: "handoff: triage saved executor context",
      detail: `Reopened the saved local executor context for ${executorsOverviewContextPreset.focusLabel} and opened the first matching persisted executor in that bookkeeping slice.`,
    });
  }

  function handleTriageSavedWorkspaceContext() {
    if (!workspacesOverviewContextPreset) {
      return;
    }
    replayWorkspacesOverviewContext(workspacesOverviewContextPreset);
    const matchingWorkspaces = workspaces.filter(
      (workspace) => workspace.workspace_state === workspacesOverviewContextPreset.value,
    );
    const preferredWorkspace = matchingWorkspaces[0] ?? null;
    if (!preferredWorkspace) {
      return;
    }
    openWorkspaceDetail(preferredWorkspace.id);
    setLaneHandoffSummary({
      label: "handoff: triage saved workspace context",
      detail: `Reopened the saved local workspace context for ${workspacesOverviewContextPreset.focusLabel} and opened the first matching persisted workspace in that bookkeeping slice.`,
    });
  }

  function setOverviewReviewDisposition(
    entryId: OverviewContextId,
    disposition: OverviewReviewDisposition,
  ) {
    setOverviewReviewState((current) => ({
      ...current,
      [entryId]: {
        disposition,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function handleMarkOverviewEntryReviewed(entryId: OverviewContextId) {
    setOverviewReviewDisposition(entryId, "reviewed");
    setLaneHandoffSummary({
      label: "handoff: local review marked reviewed",
      detail: `Marked the ${entryId} saved context as reviewed in this browser session. No backend review state was changed.`,
    });
  }

  function handleSnoozeOverviewEntry(entryId: OverviewContextId) {
    setOverviewReviewDisposition(entryId, "snoozed");
    setLaneHandoffSummary({
      label: "handoff: local review snoozed",
      detail: `Snoozed the ${entryId} saved context in this browser session. It remains local workspace memory only and was not persisted to the backend.`,
    });
  }

  function handleKeepOverviewEntryInQueue(entryId: OverviewContextId) {
    setOverviewReviewDisposition(entryId, "in_queue");
    setLaneHandoffSummary({
      label: "handoff: local review returned to queue",
      detail: `Returned the ${entryId} saved context to the local review queue for this browser session. No backend queue state was changed.`,
    });
  }

  function handleSaveOverviewContextNote(
    entryId: OverviewContextId,
    text: string,
  ) {
    const trimmedText = text.trim();
    if (!trimmedText) {
      setOverviewContextNotes((current) => {
        const next = { ...current };
        delete next[entryId];
        return next;
      });
      setLaneHandoffSummary({
        label: "handoff: local context note cleared",
        detail: `Cleared the browser-session note for the ${entryId} saved context. No backend note persistence was changed.`,
      });
      return;
    }

    setOverviewContextNotes((current) => ({
      ...current,
      [entryId]: {
        text: trimmedText,
        updatedAt: new Date().toISOString(),
      },
    }));
    setLaneHandoffSummary({
      label: "handoff: local context note saved",
      detail: `Saved a browser-session note for the ${entryId} saved context. This note remains frontend-local and does not persist to the backend.`,
    });
  }

  async function handleCopyOverviewReviewSessionSnapshot() {
    const lines = [
      "Overview review session snapshot (browser-session only)",
      `In queue: ${overviewReviewSessionSummary.inQueueCount}`,
      `Snoozed: ${overviewReviewSessionSummary.snoozedCount}`,
      `Reviewed: ${overviewReviewSessionSummary.reviewedCount}`,
      `Stale: ${overviewReviewSessionSummary.staleCount}`,
      `Drifted: ${overviewReviewSessionSummary.driftedCount}`,
      `Longest snoozed: ${overviewReviewSessionSummary.longestSnoozedLabel ?? "none"}`,
      `Longest snoozed detail: ${overviewReviewSessionSummary.longestSnoozedDetail ?? "none"}`,
      "",
      "Attention recommendations:",
      ...(attentionRecommendations.length > 0
        ? attentionRecommendations.map(
            (entry) => `- ${entry.label}: ${entry.detail}`,
          )
        : ["- none"]),
      "",
      "Saved local contexts:",
      ...(overviewContextMemoryEntries.length > 0
        ? overviewContextMemoryEntries.map((entry) => [
            `- ${entry.laneLabel}: ${entry.focusLabel}`,
            `  origin: ${entry.originLabel}`,
            `  review: ${entry.reviewDisposition}`,
            `  saved at: ${new Date(entry.savedAt).toLocaleTimeString()}`,
            `  last reviewed: ${entry.lastReviewedLabel ?? "not reviewed yet"}`,
            `  next suggested check: ${entry.nextSuggestedCheck ?? "none"}`,
            `  note: ${entry.noteText || "none"}`,
          ].join("\n"))
        : ["- none"]),
      "",
      "Truth labels:",
      "- simulated execution must remain explicitly labeled",
      "- real O3DE adapters are still not broadly implemented",
      "- executor and workspace review memory reflects persisted bookkeeping only, not broader real remote substrate admission",
      "- operator-configured persistence remains the truthful baseline for local non-container runs",
      "- this snapshot reflects browser-session frontend state only and does not imply backend persistence",
    ];
    const summary = lines.join("\n");

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setLaneHandoffSummary({
        label: "handoff: session snapshot copy unavailable",
        detail: "Clipboard copy is not available in this browser context. No backend export was attempted.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(summary);
      setOverviewSessionSnapshotBaseline(currentSnapshotBaseline);
      setLaneHandoffSummary({
        label: "handoff: session snapshot copied",
        detail: "Copied a browser-session overview review snapshot to the local clipboard. No backend export or persistence was performed.",
      });
    } catch {
      setLaneHandoffSummary({
        label: "handoff: session snapshot copy failed",
        detail: "Clipboard access was blocked by the browser. No backend export was attempted.",
      });
    }
  }

  async function handleCopyOverviewHandoffExportDraft() {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setLaneHandoffSummary({
        label: "handoff: export draft copy unavailable",
        detail: "Clipboard copy is not available in this browser context. No backend export was attempted.",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(overviewHandoffExportDraft);
      setOverviewSessionSnapshotBaseline(currentSnapshotBaseline);
      setLaneHandoffSummary({
        label: "handoff: export draft copied",
        detail: "Copied the local browser-session handoff draft to the clipboard. No backend export or persistence was performed.",
      });
    } catch {
      setLaneHandoffSummary({
        label: "handoff: export draft copy failed",
        detail: "Clipboard access was blocked by the browser. No backend export was attempted.",
      });
    }
  }

  function restoreFocusedSection() {
    if (activeFocusedSection === "approvals") {
      scrollToSection(approvalsSectionRef.current);
      return;
    }
    if (activeFocusedSection === "artifacts") {
      scrollToSection(artifactsSectionRef.current);
      return;
    }
    if (activeFocusedSection === "events") {
      scrollToSection(eventsSectionRef.current);
      return;
    }
    if (activeFocusedSection === "executors") {
      scrollToSection(executorsSectionRef.current);
      return;
    }
    if (activeFocusedSection === "executions") {
      scrollToSection(executionsSectionRef.current);
      return;
    }
    if (activeFocusedSection === "runs") {
      scrollToSection(runsSectionRef.current);
      return;
    }
    if (activeFocusedSection === "workspaces") {
      scrollToSection(workspacesSectionRef.current);
    }
  }

  function getFocusedSectionUpdateLabel(section: FocusedSection): string | null {
    return updatedFocusedSection === section ? "data updated after refresh" : null;
  }

  function openRunDetail(
    runId: string,
    options?: { autoOpenedFromOverview?: string | null },
  ) {
    setRunDetailRefreshHint(options?.autoOpenedFromOverview ?? null);
    setRunDetailBreadcrumbs(buildRunDetailBreadcrumbs(runId));
    if (laneMemorySnapshot) {
      setLaneMemory(laneMemorySnapshot);
    }
    rememberLaneExit({
      kind: "run",
      id: runId,
      label: `Run ${runId}`,
      detail: `Revisit run ${runId} while keeping ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")} lane context available.`,
    });
    void loadRunDetail(runId).then(() => {
      scrollToSection(runDetailSectionRef.current);
    });
  }

  function openExecutionDetail(
    executionId: string,
    options?: { autoOpenedFromOverview?: string | null },
  ) {
    setExecutionDetailRefreshHint(options?.autoOpenedFromOverview ?? null);
    setExecutionDetailBreadcrumbs(buildExecutionDetailBreadcrumbs(executionId));
    if (laneMemorySnapshot) {
      setLaneMemory(laneMemorySnapshot);
    }
    rememberLaneExit({
      kind: "execution",
      id: executionId,
      label: `Execution ${executionId}`,
      detail: `Revisit execution ${executionId} while keeping ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")} lane context available.`,
    });
    void loadExecutionDetail(executionId).then(() => {
      scrollToSection(executionDetailSectionRef.current);
    });
  }

  function openArtifactDetail(
    artifactId: string,
    options?: { autoOpenedFromOverview?: string | null },
  ) {
    setArtifactDetailRefreshHint(options?.autoOpenedFromOverview ?? null);
    setArtifactDetailBreadcrumbs(buildArtifactDetailBreadcrumbs(artifactId));
    if (laneMemorySnapshot) {
      setLaneMemory(laneMemorySnapshot);
    }
    rememberLaneExit({
      kind: "artifact",
      id: artifactId,
      label: `Artifact ${artifactId}`,
      detail: `Revisit artifact ${artifactId} while keeping ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")} lane context available.`,
    });
    void loadArtifactDetail(artifactId).then(() => {
      scrollToSection(artifactDetailSectionRef.current);
    });
  }

  function openEventDetail(eventId: string) {
    void loadEventDetail(eventId).then(() => {
      scrollToSection(eventDetailSectionRef.current);
    });
  }

  function openExecutorDetail(executorId: string) {
    void loadExecutorDetail(executorId).then(() => {
      scrollToSection(executorDetailSectionRef.current);
    });
  }

  function openWorkspaceDetail(workspaceId: string) {
    void loadWorkspaceDetail(workspaceId).then(() => {
      scrollToSection(workspaceDetailSectionRef.current);
    });
  }

  async function refreshDashboardState() {
    await refreshDashboardStateForScope("full");
  }

  async function refreshApprovalsSection() {
    setApprovalsRefreshing(true);
    setDashboardRefreshStatus("refreshing approvals section");
    setDashboardRefreshDetail("Refreshing the approval decision queue.");
    try {
      await loadApprovals();
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus("approvals refresh complete");
      setDashboardRefreshDetail("Updated approvals.");
      if (activeFocusedSection === "approvals") {
        setUpdatedFocusedSection("approvals");
      }
    } finally {
      setApprovalsRefreshing(false);
    }
  }

  async function refreshEventsSection() {
    setEventsRefreshing(true);
    setDashboardRefreshStatus("refreshing events section");
    setDashboardRefreshDetail("Refreshing persisted timeline events.");
    try {
      await loadEvents();
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus("events refresh complete");
      setDashboardRefreshDetail("Updated events.");
      if (activeFocusedSection === "events") {
        setUpdatedFocusedSection("events");
      }
    } finally {
      setEventsRefreshing(false);
    }
  }

  async function refreshEventDetailSection() {
    if (!selectedEventId) {
      return;
    }
    setEventDetailRefreshing(true);
    setDashboardRefreshStatus("refreshing event detail");
    setDashboardRefreshDetail("Refreshing the selected event detail record.");
    try {
      await loadEventDetail(selectedEventId);
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus("event detail refresh complete");
      setDashboardRefreshDetail("Updated selected event detail.");
      if (activeFocusedSection === "events") {
        setUpdatedFocusedSection("events");
      }
    } finally {
      setEventDetailRefreshing(false);
    }
  }

  async function refreshRunDetailSection() {
    if (!selectedRunId) {
      return;
    }
    setRunDetailRefreshing(true);
    setDashboardRefreshStatus("refreshing run detail");
    setDashboardRefreshDetail("Refreshing the selected run detail record.");
    try {
      await loadRunDetail(selectedRunId);
      setRunDetailRefreshHint("Run detail refreshed.");
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus("run detail refresh complete");
      setDashboardRefreshDetail("Updated selected run detail.");
    } finally {
      setRunDetailRefreshing(false);
    }
  }

  async function refreshExecutionDetailSection() {
    if (!selectedExecutionId) {
      return;
    }
    setExecutionDetailRefreshing(true);
    setDashboardRefreshStatus("refreshing execution detail");
    setDashboardRefreshDetail("Refreshing the selected execution detail and related artifact records.");
    try {
      const nextArtifacts = await loadArtifacts();
      await loadExecutionDetail(selectedExecutionId);
      if (nextArtifacts.some((artifact) => artifact.id === selectedArtifactId)) {
        setArtifactDetailRefreshHint("Artifact detail remains available after execution refresh.");
      }
      setExecutionDetailRefreshHint("Execution detail refreshed.");
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus("execution detail refresh complete");
      setDashboardRefreshDetail("Updated selected execution detail.");
    } finally {
      setExecutionDetailRefreshing(false);
    }
  }

  async function refreshArtifactDetailSection() {
    if (!selectedArtifactId) {
      return;
    }
    setArtifactDetailRefreshing(true);
    setDashboardRefreshStatus("refreshing artifact detail");
    setDashboardRefreshDetail("Refreshing the selected artifact detail record.");
    try {
      await loadArtifactDetail(selectedArtifactId);
      setArtifactDetailRefreshHint("Artifact detail refreshed.");
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus("artifact detail refresh complete");
      setDashboardRefreshDetail("Updated selected artifact detail.");
    } finally {
      setArtifactDetailRefreshing(false);
    }
  }

  async function refreshExecutorDetailSection() {
    if (!selectedExecutorId) {
      return;
    }
    setExecutorDetailRefreshing(true);
    setDashboardRefreshStatus("refreshing executor detail");
    setDashboardRefreshDetail("Refreshing the selected executor substrate record.");
    try {
      await loadExecutorDetail(selectedExecutorId);
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus("executor detail refresh complete");
      setDashboardRefreshDetail("Updated selected executor detail.");
    } finally {
      setExecutorDetailRefreshing(false);
    }
  }

  async function refreshWorkspaceDetailSection() {
    if (!selectedWorkspaceId) {
      return;
    }
    setWorkspaceDetailRefreshing(true);
    setDashboardRefreshStatus("refreshing workspace detail");
    setDashboardRefreshDetail("Refreshing the selected workspace substrate record.");
    try {
      await loadWorkspaceDetail(selectedWorkspaceId);
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus("workspace detail refresh complete");
      setDashboardRefreshDetail("Updated selected workspace detail.");
    } finally {
      setWorkspaceDetailRefreshing(false);
    }
  }

  async function refreshDashboardStateForScope(scope: RefreshScope) {
    setDashboardRefreshing(true);
    setOverviewRefreshing(scope === "full" || scope === "overview");
    setRecordsRefreshing(scope === "full" || scope === "records");
    setDashboardRefreshStatus(`refreshing ${scope} surfaces`);
    setDashboardRefreshDetail(getRefreshScopePendingDetail(scope));
    try {
      const refreshedTargets = new Set<RefreshTarget>();

      if (scope === "full" || scope === "overview") {
        await Promise.all([
          loadCatalog(),
          loadAdapters(),
          loadReadiness(),
          loadO3deBridgeStatus(),
          loadControlPlaneSummary(),
          loadPolicies(),
        ]);
        refreshedTargets.add("catalog");
        refreshedTargets.add("adapters");
        refreshedTargets.add("system status");
        refreshedTargets.add("operator overview");
        refreshedTargets.add("policies");
      }

      if (scope === "full") {
        await Promise.all([
          loadApprovals(),
          loadEvents(),
          loadLocks(),
        ]);
        refreshedTargets.add("approvals");
        refreshedTargets.add("events");
        refreshedTargets.add("locks");
      }

      if (scope === "full" || scope === "records") {
        const nextExecutionsPromise = loadExecutions();
        const nextArtifactsPromise = loadArtifacts();
        const nextExecutorsPromise = loadExecutors();
        const nextWorkspacesPromise = loadWorkspaces();
        await Promise.all([
          nextExecutionsPromise,
          nextArtifactsPromise,
          nextExecutorsPromise,
          nextWorkspacesPromise,
        ]);
        const nextExecutors = await nextExecutorsPromise;
        const nextExecutions = await nextExecutionsPromise;
        const nextArtifacts = await nextArtifactsPromise;
        const nextWorkspaces = await nextWorkspacesPromise;

        await loadRuns(selectedToolFilter, selectedAuditFilter, runTruthFilter, {
          executionItems: nextExecutions,
          announceSelectionRefresh: announceRunDetailRefreshRef.current,
        });
        refreshedTargets.add("runs");
        refreshedTargets.add("executors");
        refreshedTargets.add("executions");
        refreshedTargets.add("artifacts");
        refreshedTargets.add("workspaces");
        if (selectedExecutorId && nextExecutors.some((item) => item.id === selectedExecutorId)) {
          await loadExecutorDetail(selectedExecutorId);
          refreshedTargets.add("selected executor detail");
        } else if (selectedExecutorId) {
          setSelectedExecutorId(null);
          setSelectedExecutor(null);
        }
        if (selectedExecutionId && nextExecutions.some((item) => item.id === selectedExecutionId)) {
          await loadExecutionDetail(selectedExecutionId);
          setExecutionDetailRefreshHint("Refresh preserved the selected execution detail.");
          refreshedTargets.add("selected execution detail");
        } else if (selectedExecutionId) {
          setSelectedExecutionId(null);
          setSelectedExecution(null);
          setExecutionDetailRefreshHint("Selected execution is no longer present after refresh.");
        } else {
          setExecutionDetailRefreshHint(null);
        }
        if (selectedArtifactId && nextArtifacts.some((item) => item.id === selectedArtifactId)) {
          await loadArtifactDetail(selectedArtifactId);
          setArtifactDetailRefreshHint("Refresh preserved the selected artifact detail.");
          refreshedTargets.add("selected artifact detail");
        } else if (selectedArtifactId) {
          setSelectedArtifactId(null);
          setSelectedArtifact(null);
          setArtifactDetailRefreshHint("Selected artifact is no longer present after refresh.");
        } else {
          setArtifactDetailRefreshHint(null);
        }
        if (selectedWorkspaceId && nextWorkspaces.some((item) => item.id === selectedWorkspaceId)) {
          await loadWorkspaceDetail(selectedWorkspaceId);
          refreshedTargets.add("selected workspace detail");
        } else if (selectedWorkspaceId) {
          setSelectedWorkspaceId(null);
          setSelectedWorkspace(null);
        }
      }

      setUpdatedFocusedSection(activeFocusedSection);
      setDashboardRefreshedAt(new Date().toISOString());
      setDashboardRefreshStatus(`${scope} refresh complete`);
      setDashboardRefreshDetail(describeRefreshTargets(scope, [...refreshedTargets]));
      restoreFocusedSection();
    } finally {
      announceRunDetailRefreshRef.current = false;
      setDashboardRefreshing(false);
      setOverviewRefreshing(false);
      setRecordsRefreshing(false);
    }
  }

  async function handleRunStatusDrilldown(status: string) {
    const focusLabel = formatOverviewFocusLabel("status", status);
    setRunsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `status:${status}`,
      focusLabel,
      originLabel: "status drilldown",
      value: status,
      kind: "status",
    }));
    await activateRunsLaneFromOverview(buildRunsLaneOverviewOptions({
      focusLabel,
      searchPreset: status,
      runFilter: (item) => item.status === status,
    }));
  }

  function handlePendingApprovalsDrilldown() {
    setApprovalsSearchPreset("pending");
    setApprovalsFocusLabel(formatOverviewFocusLabel("status", "pending"));
    setActiveFocusedSection("approvals");
    setUpdatedFocusedSection(null);
    setApprovalsSearchVersion((value) => value + 1);
    scrollToSection(approvalsSectionRef.current);
  }

  function handleExecutionModeDrilldown(mode: string) {
    const focusLabel = formatOverviewFocusLabel("execution mode", mode);
    setExecutionsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `execution_mode:${mode}`,
      focusLabel,
      originLabel: "execution-mode drilldown",
      value: mode,
      kind: "execution_mode",
    }));
    activateExecutionLaneFromOverview(buildExecutionLaneOverviewOptions({
      focusLabel,
      searchPreset: mode,
      executionFilter: (item) => item.execution_mode === mode,
    }));
  }

  function handleRunTruthDrilldown(
    filter: "inspection_surface" | "fallback_category" | "manifest_source_of_truth",
    value: string,
  ) {
    const nextFilter: TruthFilterState = createTruthFilterForDimension(filter, value);
    const focusLabel = formatTruthFilterFocusLabel(filter, value);
    setRunsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `${filter}:${value}`,
      focusLabel,
      originLabel: describeOverviewFocusOrigin(focusLabel) ?? "overview drilldown",
      value,
      kind: filter,
    }));
    void activateRunsLaneFromOverview(buildRunsLaneOverviewOptions({
      focusLabel,
      searchPreset: value,
      truthFilter: nextFilter,
    }));
  }

  function handleExecutionInspectionSurfaceDrilldown(value: string) {
    const focusLabel = formatTruthFilterFocusLabel("inspection_surface", value);
    setExecutionsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `inspection_surface:${value}`,
      focusLabel,
      originLabel: "inspection-surface drilldown",
      value,
      kind: "inspection_surface",
    }));
    activateExecutionLaneFromOverview(buildExecutionLaneOverviewOptions({
      focusLabel,
      searchPreset: value,
      truthFilter: createInspectionSurfaceTruthFilter(value),
    }));
  }

  function handleExecutionFallbackCategoryDrilldown(value: string) {
    const focusLabel = formatTruthFilterFocusLabel("fallback_category", value);
    setExecutionsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `fallback_category:${value}`,
      focusLabel,
      originLabel: "fallback-category drilldown",
      value,
      kind: "fallback_category",
    }));
    activateExecutionLaneFromOverview(buildExecutionLaneOverviewOptions({
      focusLabel,
      searchPreset: value,
      truthFilter: createFallbackCategoryTruthFilter(value),
    }));
  }

  function handleExecutionManifestSourceDrilldown(value: string) {
    const focusLabel = formatTruthFilterFocusLabel("manifest_source_of_truth", value);
    setExecutionsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `manifest_source_of_truth:${value}`,
      focusLabel,
      originLabel: "manifest-source-of-truth drilldown",
      value,
      kind: "manifest_source_of_truth",
    }));
    activateExecutionLaneFromOverview(buildExecutionLaneOverviewOptions({
      focusLabel,
      searchPreset: value,
      truthFilter: createManifestSourceTruthFilter(value),
    }));
  }

  function handleArtifactModeDrilldown(mode: string) {
    const focusLabel = formatOverviewFocusLabel("artifact mode", mode);
    setArtifactsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `artifact_mode:${mode}`,
      focusLabel,
      originLabel: "artifact-mode drilldown",
      value: mode,
      kind: "artifact_mode",
    }));
    activateArtifactLaneFromOverview(buildArtifactLaneOverviewOptions({
      focusLabel,
      searchPreset: mode,
      artifactFilter: (item) => {
        if (mode === "simulated") {
          return item.simulated || item.execution_mode === "simulated";
        }
        return item.execution_mode === mode;
      },
    }));
  }

  function handleArtifactInspectionSurfaceDrilldown(value: string) {
    const focusLabel = formatTruthFilterFocusLabel("inspection_surface", value);
    setArtifactsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `inspection_surface:${value}`,
      focusLabel,
      originLabel: "inspection-surface drilldown",
      value,
      kind: "inspection_surface",
    }));
    activateArtifactLaneFromOverview(buildArtifactLaneOverviewOptions({
      focusLabel,
      searchPreset: value,
      truthFilter: createInspectionSurfaceTruthFilter(value),
    }));
  }

  function handleArtifactFallbackCategoryDrilldown(value: string) {
    const focusLabel = formatTruthFilterFocusLabel("fallback_category", value);
    setArtifactsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `fallback_category:${value}`,
      focusLabel,
      originLabel: "fallback-category drilldown",
      value,
      kind: "fallback_category",
    }));
    activateArtifactLaneFromOverview(buildArtifactLaneOverviewOptions({
      focusLabel,
      searchPreset: value,
      truthFilter: createFallbackCategoryTruthFilter(value),
    }));
  }

  function handleArtifactManifestSourceDrilldown(value: string) {
    const focusLabel = formatTruthFilterFocusLabel("manifest_source_of_truth", value);
    setArtifactsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `manifest_source_of_truth:${value}`,
      focusLabel,
      originLabel: "manifest-source-of-truth drilldown",
      value,
      kind: "manifest_source_of_truth",
    }));
    activateArtifactLaneFromOverview(buildArtifactLaneOverviewOptions({
      focusLabel,
      searchPreset: value,
      truthFilter: createManifestSourceTruthFilter(value),
    }));
  }

  function handleEventSeverityDrilldown(severity: string) {
    setEventsEventTypePreset("all");
    setEventsVerificationPreset("all");
    setEventsSearchPreset(severity);
    setEventsFocusLabel(formatOverviewFocusLabel("severity", severity));
    setActiveFocusedSection("events");
    setUpdatedFocusedSection(null);
    setEventsSearchVersion((value) => value + 1);
    scrollToSection(eventsSectionRef.current);
  }

  async function handleExecutorAvailabilityDrilldown(availability: string) {
    const focusLabel = formatOverviewFocusLabel("executor availability", availability);
    setExecutorsOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `executors-availability-${availability}`,
      focusLabel,
      originLabel: "executor-availability drilldown",
      value: availability,
      kind: "availability_state",
    }));
    setExecutorsSearchPreset(availability);
    setExecutorsFocusLabel(focusLabel);
    setActiveFocusedSection("executors");
    setUpdatedFocusedSection(null);
    setExecutorsSearchVersion((value) => value + 1);
    const nextExecutors = await loadExecutors();
    openFirstExecutorLaneMatch(
      nextExecutors.filter((executor) => executor.availability_state === availability),
    );
    scrollToSection(executorsSectionRef.current);
  }

  async function handleWorkspaceStateDrilldown(workspaceState: string) {
    const focusLabel = formatOverviewFocusLabel("workspace state", workspaceState);
    setWorkspacesOverviewContextHistory((history) => pushOverviewContextHistory(history, {
      id: `workspaces-state-${workspaceState}`,
      focusLabel,
      originLabel: "workspace-state drilldown",
      value: workspaceState,
      kind: "workspace_state",
    }));
    setWorkspacesSearchPreset(workspaceState);
    setWorkspacesFocusLabel(focusLabel);
    setActiveFocusedSection("workspaces");
    setUpdatedFocusedSection(null);
    setWorkspacesSearchVersion((value) => value + 1);
    const nextWorkspaces = await loadWorkspaces();
    openFirstWorkspaceLaneMatch(
      nextWorkspaces.filter((workspace) => workspace.workspace_state === workspaceState),
    );
    scrollToSection(workspacesSectionRef.current);
  }

  function clearRunsFocus() {
    resetLaneFocus({
      activeFocusedSection,
      section: "runs",
      setTruthFilter: setRunTruthFilter,
      setSearchPreset: setRunsSearchPreset,
      setFocusLabel: setRunsFocusLabel,
      setActiveFocusedSection,
      setUpdatedFocusedSection,
      setSearchVersion: setRunsSearchVersion,
      reloadLane: (truthFilter) => {
        void loadRuns(selectedToolFilter, selectedAuditFilter, truthFilter);
      },
    });
  }

  function clearApprovalsFocus() {
    resetPresetLaneFocus({
      activeFocusedSection,
      section: "approvals",
      setSearchPreset: setApprovalsSearchPreset,
      setFocusLabel: setApprovalsFocusLabel,
      setActiveFocusedSection,
      setUpdatedFocusedSection,
      setSearchVersion: setApprovalsSearchVersion,
    });
  }

  function clearArtifactsFocus() {
    resetLaneFocus({
      activeFocusedSection,
      section: "artifacts",
      setTruthFilter: setArtifactTruthFilter,
      setSearchPreset: setArtifactsSearchPreset,
      setFocusLabel: setArtifactsFocusLabel,
      setActiveFocusedSection,
      setUpdatedFocusedSection,
      setSearchVersion: setArtifactsSearchVersion,
      reloadLane: (truthFilter) => {
        void loadArtifacts(truthFilter);
      },
    });
  }

  function clearExecutionsFocus() {
    resetLaneFocus({
      activeFocusedSection,
      section: "executions",
      setTruthFilter: setExecutionTruthFilter,
      setSearchPreset: setExecutionsSearchPreset,
      setFocusLabel: setExecutionsFocusLabel,
      setActiveFocusedSection,
      setUpdatedFocusedSection,
      setSearchVersion: setExecutionsSearchVersion,
      reloadLane: (truthFilter) => {
        void loadExecutions(truthFilter);
      },
    });
  }

  function clearExecutorsFocus() {
    resetPresetLaneFocus({
      activeFocusedSection,
      section: "executors",
      setSearchPreset: setExecutorsSearchPreset,
      setFocusLabel: setExecutorsFocusLabel,
      setActiveFocusedSection,
      setUpdatedFocusedSection,
      setSearchVersion: setExecutorsSearchVersion,
    });
  }

  function clearWorkspacesFocus() {
    resetPresetLaneFocus({
      activeFocusedSection,
      section: "workspaces",
      setSearchPreset: setWorkspacesSearchPreset,
      setFocusLabel: setWorkspacesFocusLabel,
      setActiveFocusedSection,
      setUpdatedFocusedSection,
      setSearchVersion: setWorkspacesSearchVersion,
    });
  }

  function clearEventsFocus() {
    setEventsEventTypePreset("all");
    setEventsVerificationPreset("all");
    resetPresetLaneFocus({
      activeFocusedSection,
      section: "events",
      setSearchPreset: setEventsSearchPreset,
      setFocusLabel: setEventsFocusLabel,
      setActiveFocusedSection,
      setUpdatedFocusedSection,
      setSearchVersion: setEventsSearchVersion,
    });
  }

  const agentsForDisplay = catalogAgents.length > 0
    ? catalogAgents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        locks: agent.tools[0]?.default_locks.length
          ? [...agent.tools[0].default_locks]
          : ["project_config"],
        owned_tools: agent.tools.map((tool) => tool.name),
      }))
    : [];
  const pendingApprovalCount = approvals.length;
  const warningExecutionCount = executions.filter((execution) => execution.warning_count > 0).length;
  const unresolvedRunCount = runs.filter(isUnresolvedRun).length;
  const bridgeStatusLabel = o3deBridgeStatus?.heartbeat_fresh ? "fresh" : "check";
  const cockpitRegistryByWorkspaceId = buildCockpitAppRegistryByWorkspaceId(cockpitRegistrations);
  const homeWorkspaceGuide = getShellWorkspaceGuide("home");
  const promptWorkspaceGuide = getShellWorkspaceGuide("prompt");
  const builderWorkspaceGuide = getShellWorkspaceGuide("builder");
  const operationsWorkspaceGuide = getShellWorkspaceGuide("operations");
  const runtimeWorkspaceGuide = getShellWorkspaceGuide("runtime");
  const recordsWorkspaceGuide = getShellWorkspaceGuide("records");
  const approvalsQuickStatGuide = getShellQuickStatGuide("approvals");
  const bridgeQuickStatGuide = getShellQuickStatGuide("bridge");
  const warningsQuickStatGuide = getShellQuickStatGuide("warnings");
  const runsQuickStatGuide = getShellQuickStatGuide("runs");
  const workspaceMeta: Record<DesktopWorkspaceId, { title: string; subtitle: string }> = {
    home: {
      title: homeWorkspaceGuide.workspaceTitle,
      subtitle: homeWorkspaceGuide.workspaceSubtitle,
    },
    "create-game": {
      title: cockpitRegistryByWorkspaceId["create-game"].workspaceTitle,
      subtitle: cockpitRegistryByWorkspaceId["create-game"].workspaceSubtitle,
    },
    "create-movie": {
      title: cockpitRegistryByWorkspaceId["create-movie"].workspaceTitle,
      subtitle: cockpitRegistryByWorkspaceId["create-movie"].workspaceSubtitle,
    },
    "load-project": {
      title: cockpitRegistryByWorkspaceId["load-project"].workspaceTitle,
      subtitle: cockpitRegistryByWorkspaceId["load-project"].workspaceSubtitle,
    },
    "asset-forge": {
      title: cockpitRegistryByWorkspaceId["asset-forge"].workspaceTitle,
      subtitle: cockpitRegistryByWorkspaceId["asset-forge"].workspaceSubtitle,
    },
    prompt: {
      title: promptWorkspaceGuide.workspaceTitle,
      subtitle: promptWorkspaceGuide.workspaceSubtitle,
    },
    builder: {
      title: builderWorkspaceGuide.workspaceTitle,
      subtitle: builderWorkspaceGuide.workspaceSubtitle,
    },
    operations: {
      title: operationsWorkspaceGuide.workspaceTitle,
      subtitle: operationsWorkspaceGuide.workspaceSubtitle,
    },
    runtime: {
      title: runtimeWorkspaceGuide.workspaceTitle,
      subtitle: runtimeWorkspaceGuide.workspaceSubtitle,
    },
    records: {
      title: recordsWorkspaceGuide.workspaceTitle,
      subtitle: recordsWorkspaceGuide.workspaceSubtitle,
    },
  };
  const activeWorkspaceMeta = workspaceMeta[activeWorkspaceId];
  const activePromptReturnResumeChecklist = promptReturnResumeChecklist
    && promptReturnResumeChecklist.sourceWorkspaceId === activeWorkspaceId
    ? promptReturnResumeChecklist
    : null;
  const activeCockpitStageFocusHighlight = cockpitStageFocusHighlight
    && cockpitStageFocusHighlight.workspaceId === activeWorkspaceId
    ? cockpitStageFocusHighlight
    : null;
  const activePromptEvidenceContext = activeWorkspaceId === "prompt"
    ? promptEvidenceContext
    : null;
  const activeRecordsEvidenceContext = activeWorkspaceId === "records"
    ? recordsEvidenceContext
    : null;
  const activePromptTemplateChooserContext = activeWorkspaceId === "prompt"
    ? promptTemplateChooserContext
    : null;
  const activeDesktopNavItemId: DesktopNavItemId = activeWorkspaceId;
  const desktopNavSections = [
    {
      id: "start",
      label: "Start",
      detail: "Orient yourself first and keep the first decision surface calm.",
      items: [
        {
          id: "home",
          label: homeWorkspaceGuide.navLabel,
          subtitle: homeWorkspaceGuide.navSubtitle,
          badge: attentionRecommendations.length > 0 ? String(attentionRecommendations.length) : null,
          tone: attentionRecommendations.length > 0 ? "warning" : "info",
          helpTooltip: homeWorkspaceGuide.tooltip,
        },
      ],
    },
    {
      id: "create",
      label: "Create",
      detail: "Use natural-language or mission-control surfaces to start and shape work.",
      items: [
        ...cockpitRegistrations.map((registration) => ({
          id: registration.workspaceId,
          label: registration.navLabel,
          subtitle: registration.navSubtitle,
          badge: registration.shellMode === "full-screen-editor" ? "full" : null,
          tone: registration.tone,
          helpTooltip: registration.helpTooltip,
        })),
        {
          id: "prompt",
          label: promptWorkspaceGuide.navLabel,
          subtitle: promptWorkspaceGuide.navSubtitle,
          badge: null,
          tone: "info",
          helpTooltip: promptWorkspaceGuide.tooltip,
        },
        {
          id: "builder",
          label: builderWorkspaceGuide.navLabel,
          subtitle: builderWorkspaceGuide.navSubtitle,
          badge: null,
          tone: "info",
          helpTooltip: builderWorkspaceGuide.tooltip,
        },
      ],
    },
    {
      id: "operate",
      label: "Operate",
      detail: "Coordinate approvals, live runtime status, and editor health without leaving the shell.",
      items: [
        {
          id: "operations",
          label: operationsWorkspaceGuide.navLabel,
          subtitle: operationsWorkspaceGuide.navSubtitle,
          badge: pendingApprovalCount > 0 ? String(pendingApprovalCount) : null,
          tone: pendingApprovalCount > 0 ? "warning" : "neutral",
          helpTooltip: operationsWorkspaceGuide.tooltip,
        },
        {
          id: "runtime",
          label: runtimeWorkspaceGuide.navLabel,
          subtitle: runtimeWorkspaceGuide.navSubtitle,
          badge: bridgeStatusLabel,
          tone: o3deBridgeStatus?.heartbeat_fresh ? "success" : "warning",
          helpTooltip: runtimeWorkspaceGuide.tooltip,
        },
      ],
    },
    {
      id: "inspect",
      label: "Inspect",
      detail: "Review persisted runs, executions, and artifacts once work has moved or completed.",
      items: [
        {
          id: "records",
          label: recordsWorkspaceGuide.navLabel,
          subtitle: recordsWorkspaceGuide.navSubtitle,
          badge: unresolvedRunCount + warningExecutionCount > 0
            ? String(unresolvedRunCount + warningExecutionCount)
            : null,
          tone: unresolvedRunCount + warningExecutionCount > 0 ? "warning" : "neutral",
          helpTooltip: recordsWorkspaceGuide.tooltip,
        },
      ],
    },
  ] as const;
  const desktopQuickStats = [
    {
      label: approvalsQuickStatGuide.label,
      value: pendingApprovalCount === 0 ? "clear" : String(pendingApprovalCount),
      tone: pendingApprovalCount === 0 ? "success" : "warning",
      helpTooltip: approvalsQuickStatGuide.tooltip,
    },
    {
      label: bridgeQuickStatGuide.label,
      value: bridgeStatusLabel,
      tone: o3deBridgeStatus?.heartbeat_fresh ? "success" : "warning",
      helpTooltip: bridgeQuickStatGuide.tooltip,
    },
    {
      label: warningsQuickStatGuide.label,
      value: warningExecutionCount === 0 ? "0" : String(warningExecutionCount),
      tone: warningExecutionCount === 0 ? "neutral" : "warning",
      helpTooltip: warningsQuickStatGuide.tooltip,
    },
    {
      label: runsQuickStatGuide.label,
      value: unresolvedRunCount === 0 ? "clear" : String(unresolvedRunCount),
      tone: unresolvedRunCount === 0 ? "success" : "warning",
      helpTooltip: runsQuickStatGuide.tooltip,
    },
  ] as const;
  const homeRecommendationEntries = buildHomeRecommendationDescriptors({
    pendingApprovalCount,
    warningExecutionCount,
    unresolvedRunCount,
    persistenceReady: readiness?.persistence_ready ?? false,
    bridgeConfigured: o3deBridgeStatus?.configured ?? false,
    bridgeHeartbeatFresh: o3deBridgeStatus?.heartbeat_fresh ?? false,
    supportsRealExecution: adapters?.supports_real_execution ?? false,
  }).map((entry) => ({
    ...entry,
    suggestedBecause: entry.detail,
    opensLabel: getHomeRecommendationOpensLabel(entry.actionId),
    onAction: () => {
      handleHomeRecommendationAction(entry.actionId);
    },
  }));
  const workspaceNextStepEntries = settings.layout.guidedMode && activeWorkspaceId !== "home"
    ? buildWorkspaceNextStepEntries()
    : [];

  function handleHomeRecommendationAction(actionId: HomeRecommendationActionId) {
    switch (actionId) {
      case "open_prompt":
        setActiveWorkspaceId("prompt");
        return;
      case "open_builder":
        setActiveWorkspaceId("builder");
        return;
      case "open_runtime_overview":
        setActiveWorkspaceId("runtime");
        setActiveRuntimeSurface("overview");
        return;
      case "open_records_runs":
        setActiveWorkspaceId("records");
        setActiveRecordsSurface("runs");
        return;
      case "open_operations_approvals":
        setActiveWorkspaceId("operations");
        setActiveOperationsSurface("approvals");
        return;
    }
  }

  function getHomeRecommendationOpensLabel(actionId: HomeRecommendationActionId): string {
    switch (actionId) {
      case "open_prompt":
        return "Prompt Studio workspace";
      case "open_builder":
        return "Builder workspace";
      case "open_runtime_overview":
        return "Runtime > Overview window";
      case "open_records_runs":
        return "Records > Runs window";
      case "open_operations_approvals":
        return "Operations > Approvals window";
    }
  }

  function openOperationsApprovals(): void {
    setActiveWorkspaceId("operations");
    setActiveOperationsSurface("approvals");
  }

  function openOperationsDispatch(): void {
    setActiveWorkspaceId("operations");
    setActiveOperationsSurface("dispatch");
  }

  function openRuntimeOverview(): void {
    setActiveWorkspaceId("runtime");
    setActiveRuntimeSurface("overview");
  }

  function openRuntimeGovernance(): void {
    setActiveWorkspaceId("runtime");
    setActiveRuntimeSurface("governance");
  }

  function openRuntimeExecutors(): void {
    setActiveWorkspaceId("runtime");
    setActiveRuntimeSurface("executors");
  }

  function openRuntimeWorkspaces(): void {
    setActiveWorkspaceId("runtime");
    setActiveRuntimeSurface("workspaces");
  }

  function openPromptSessionFromTruthRail(promptId: string): void {
    const trimmedPromptId = promptId.trim();
    if (!trimmedPromptId) {
      return;
    }
    const sourceWorkspaceId = activeWorkspaceId;
    const sourceSurfaceLabel = `${workspaceMeta[sourceWorkspaceId].title} mission truth rail`;
    setPromptSessionFocusRequest({
      requestId: crypto.randomUUID(),
      promptId: trimmedPromptId,
      sourceSurfaceLabel,
    });
    setPromptEvidenceContext({
      id: crypto.randomUUID(),
      promptSessionId: trimmedPromptId,
      sourceWorkspaceId,
      sourceSurfaceLabel,
      openedAtIso: new Date().toISOString(),
    });
    setPromptTemplateChooserContext(null);
    setActiveWorkspaceId("prompt");
  }

  function openPromptStudioWithMissionDraft(
    draft: MissionPromptDraft,
    sourceSurfaceLabel: string,
    sourceWorkspaceId: DesktopWorkspaceId,
  ): void {
    setPromptEvidenceContext(null);
    setPromptTemplateChooserContext(null);
    setPromptLaunchDraftRequest({
      requestId: crypto.randomUUID(),
      draft,
      sourceSurfaceLabel,
      launchedAtIso: new Date().toISOString(),
      sourceWorkspaceId,
    });
    setActiveWorkspaceId("prompt");
  }

  function openPromptStudioWithTemplateChooserContext(
    sourceWorkspaceId: DesktopWorkspaceId,
    sourceSurfaceLabel: string,
    title: string,
    subtitle: string,
    templates: Array<Omit<PromptTemplateChooserEntry, "id">>,
    nextSafeAction: string,
  ): void {
    setPromptEvidenceContext(null);
    setPromptTemplateChooserContext({
      id: crypto.randomUUID(),
      sourceWorkspaceId,
      sourceSurfaceLabel,
      title,
      subtitle,
      openedAtIso: new Date().toISOString(),
      templates: templates.map((template) => ({
        ...template,
        id: crypto.randomUUID(),
      })),
      nextSafeAction,
    });
    setActiveWorkspaceId("prompt");
  }

  function openPromptStudioFromCreateGameCockpit(): void {
    openPromptStudioWithTemplateChooserContext(
      "create-game",
      "Create Game cockpit command bar / open prompt studio",
      "Create Game template quick-load",
      "Pick a safe game-authoring template to prefill Prompt Studio. This does not execute any prompt.",
      [
        {
          label: "Inspect project evidence prompt",
          detail: "Read-only project orientation before content mutation.",
          truthState: "read-only / non-mutating",
          draft: inspectProjectMissionPromptDraft,
          sourceSurfaceLabel: "Create Game cockpit / inspect project template",
        },
        {
          label: "Create safe game entity prompt",
          detail: "Admitted-real narrow editor corridor for one root-level entity.",
          truthState: "admitted-real narrow",
          draft: createGameEntityMissionPromptDraft,
          sourceSurfaceLabel: "Create Game cockpit / create entity template",
        },
        {
          label: "Add allowlisted Mesh component prompt",
          detail: "Allowlisted component lane with readback evidence expectation.",
          truthState: "admitted-real allowlisted",
          draft: addAllowlistedMeshMissionPromptDraft,
          sourceSurfaceLabel: "Create Game cockpit / add allowlisted component template",
        },
      ],
      "Choose one template, preview the plan, and keep operations inside admitted lanes.",
    );
  }

  function openPromptStudioFromCreateMovieCockpit(): void {
    openPromptStudioWithTemplateChooserContext(
      "create-movie",
      "Create Movie cockpit command bar / open prompt studio",
      "Create Movie template quick-load",
      "Pick a cinematic-safe template to prefill Prompt Studio. No prompt runs automatically.",
      [
        {
          label: "Inspect cinematic target prompt",
          detail: "Read-only cinematic readiness check.",
          truthState: "read-only / cinematic planning",
          draft: inspectCinematicTargetMissionPromptDraft,
          sourceSurfaceLabel: "Create Movie cockpit / inspect cinematic target template",
        },
        {
          label: "Create cinematic camera placeholder prompt",
          detail: "Narrow admitted-real camera placeholder entity request.",
          truthState: "admitted-real narrow",
          draft: createCinematicCameraPlaceholderMissionPromptDraft,
          sourceSurfaceLabel: "Create Movie cockpit / camera placeholder template",
        },
        {
          label: "Cinematic placement proof-only candidate prompt",
          detail: "Fail-closed placement proof candidate capture with non-admitted execution/write flags.",
          truthState: "proof-only / fail-closed / non-mutating",
          draft: cinematicPlacementProofOnlyMissionPromptDraft,
          sourceSurfaceLabel: "Create Movie cockpit / placement proof-only template",
        },
      ],
      "Use proof-only templates for placement review; real placement remains blocked by separate admission gates.",
    );
  }

  function openPromptStudioFromLoadProjectCockpit(): void {
    openPromptStudioWithTemplateChooserContext(
      "load-project",
      "Load Project cockpit command bar / open prompt studio",
      "Load Project template quick-load",
      "Prefill a target-readiness prompt without mutating project files.",
      [
        {
          label: "Load project inspection prompt",
          detail: "Read-only project/engine/target assumptions summary.",
          truthState: "read-only / no project file writes",
          draft: inspectLoadProjectMissionPromptDraft,
          sourceSurfaceLabel: "Load Project cockpit / inspect target template",
        },
      ],
      "Run read-only inspection first, then decide the next admitted authoring step.",
    );
  }

  function openPromptStudioFromAssetForgeCockpit(): void {
    openPromptStudioWithTemplateChooserContext(
      "asset-forge",
      "Asset Forge cockpit command bar / open prompt studio",
      "Asset Forge template quick-load",
      "Select an Asset Forge prompt template for review-first execution planning.",
      [
        {
          label: "Inspect project evidence prompt",
          detail: "Read-only orientation before candidate staging/proof review.",
          truthState: "read-only / non-mutating",
          draft: inspectProjectMissionPromptDraft,
          sourceSurfaceLabel: "Asset Forge workflow / inspect project template",
        },
        {
          label: "Placement proof-only candidate prompt",
          detail: "Fail-closed placement proof-only candidate with bounded evidence references.",
          truthState: "proof-only / fail-closed / non-mutating",
          draft: placementProofOnlyMissionPromptDraft,
          sourceSurfaceLabel: "Asset Forge workflow / placement proof-only template",
        },
      ],
      "Use proof-only review paths for placement; execution and placement writes remain non-admitted.",
    );
  }

  function openPromptStudioFromHomeCockpit(): void {
    openPromptStudioWithTemplateChooserContext(
      "home",
      "Home cockpit start-here rail / open prompt studio",
      "Home template quick-load",
      "Choose a mission-first template to prefill Prompt Studio. This stays prefill-only and does not auto-execute.",
      [
        {
          label: "Inspect project evidence prompt",
          detail: "Read-only orientation before admitted or proof-only steps.",
          truthState: "read-only / non-mutating",
          draft: inspectProjectMissionPromptDraft,
          sourceSurfaceLabel: "Home mission workflow / inspect project template",
        },
        {
          label: "Create safe game entity prompt",
          detail: "Narrow admitted-real root-level entity request.",
          truthState: "admitted-real narrow",
          draft: createGameEntityMissionPromptDraft,
          sourceSurfaceLabel: "Home mission workflow / create entity template",
        },
        {
          label: "Add allowlisted Mesh component prompt",
          detail: "Allowlisted component lane with readback evidence expectation.",
          truthState: "admitted-real allowlisted",
          draft: addAllowlistedMeshMissionPromptDraft,
          sourceSurfaceLabel: "Home mission workflow / add allowlisted component template",
        },
        {
          label: "Placement proof-only candidate prompt",
          detail: "Fail-closed placement proof candidate with non-admitted execution/write flags.",
          truthState: "proof-only / fail-closed / non-mutating",
          draft: placementProofOnlyMissionPromptDraft,
          sourceSurfaceLabel: "Home mission workflow / placement proof-only template",
        },
      ],
      "Pick one template, preview the plan, then execute only inside admitted or proof-only boundaries.",
    );
  }

  function openPromptTemplateChooserLane(
    sourceWorkspaceId: "home" | "create-game" | "create-movie" | "load-project" | "asset-forge",
  ): void {
    if (sourceWorkspaceId === "home") {
      openPromptStudioFromHomeCockpit();
      return;
    }
    if (sourceWorkspaceId === "create-game") {
      openPromptStudioFromCreateGameCockpit();
      return;
    }
    if (sourceWorkspaceId === "create-movie") {
      openPromptStudioFromCreateMovieCockpit();
      return;
    }
    if (sourceWorkspaceId === "load-project") {
      openPromptStudioFromLoadProjectCockpit();
      return;
    }
    openPromptStudioFromAssetForgeCockpit();
  }

  function openPromptStudioWithPlacementProofTemplateFromHome(): void {
    openPromptStudioWithMissionDraft(
      placementProofOnlyMissionPromptDraft,
      "Home mission workflow / placement proof-only template",
      "home",
    );
  }

  function openPromptStudioWithPlacementProofTemplateFromAssetForge(): void {
    openPromptStudioWithMissionDraft(
      placementProofOnlyMissionPromptDraft,
      "Asset Forge workflow / placement proof-only template",
      "asset-forge",
    );
  }

  function openPromptStudioWithCinematicPlacementProofTemplate(): void {
    openPromptStudioWithMissionDraft(
      cinematicPlacementProofOnlyMissionPromptDraft,
      "Create Movie cockpit / placement proof-only template",
      "create-movie",
    );
  }

  function openPromptStudioWithInspectProjectTemplateFromHome(): void {
    openPromptStudioWithMissionDraft(
      inspectProjectMissionPromptDraft,
      "Home mission workflow / inspect project template",
      "home",
    );
  }

  function openPromptStudioWithInspectProjectTemplateFromAssetForge(): void {
    openPromptStudioWithMissionDraft(
      inspectProjectMissionPromptDraft,
      "Asset Forge workflow / inspect project template",
      "asset-forge",
    );
  }

  function openPromptStudioWithAssetForgeEditorTemplate(
    template: AssetForgePromptTemplateRecord,
  ): void {
    const truthLabel = template.truth_state;
    const safetyLabels = Array.from(new Set([
      truthLabel,
      ...template.safety_labels,
      "preview-first",
      "autoExecute=false",
      "non-mutating",
    ]));
    const draft: MissionPromptDraft = {
      id: `asset-forge-editor-model-${template.template_id}`,
      label: template.label,
      promptText: template.text,
      preferredDomainsText: truthLabel === "proof-only" ? "editor-control" : "project-build",
      operatorNote: [
        `Asset Forge editor model handoff: ${template.description}`,
        "autoExecute=false.",
        "No provider generation, Blender execution, Asset Processor execution, placement write, or mutation is admitted by this handoff.",
      ].join(" "),
      dryRun: true,
      truthLabels: safetyLabels,
      guidance: "Preview and edit this backend-supplied Asset Forge template in Prompt Studio. Do not execute mutation; use admitted review/preflight/proof-only gates only.",
    };

    openPromptStudioWithMissionDraft(
      draft,
      `Asset Forge editor model / ${template.label}`,
      "asset-forge",
    );
  }

  function openPromptStudioWithInspectProjectTemplateFromCreateGame(): void {
    openPromptStudioWithMissionDraft(
      inspectProjectMissionPromptDraft,
      "Create Game cockpit / inspect project template",
      "create-game",
    );
  }

  function openPromptStudioWithCreateGameEntityTemplate(): void {
    openPromptStudioWithMissionDraft(
      createGameEntityMissionPromptDraft,
      "Create Game cockpit / create entity template",
      "create-game",
    );
  }

  function openPromptStudioWithAddAllowlistedMeshTemplate(): void {
    openPromptStudioWithMissionDraft(
      addAllowlistedMeshMissionPromptDraft,
      "Create Game cockpit / add allowlisted component template",
      "create-game",
    );
  }

  function openPromptStudioWithInspectCinematicTargetTemplate(): void {
    openPromptStudioWithMissionDraft(
      inspectCinematicTargetMissionPromptDraft,
      "Create Movie cockpit / inspect cinematic target template",
      "create-movie",
    );
  }

  function openPromptStudioWithCreateCinematicCameraTemplate(): void {
    openPromptStudioWithMissionDraft(
      createCinematicCameraPlaceholderMissionPromptDraft,
      "Create Movie cockpit / camera placeholder template",
      "create-movie",
    );
  }

  function openPromptStudioWithInspectLoadProjectTemplate(): void {
    openPromptStudioWithMissionDraft(
      inspectLoadProjectMissionPromptDraft,
      "Load Project cockpit / inspect target template",
      "load-project",
    );
  }

  function getPromptReturnNextSafeAction(workspaceId: DesktopWorkspaceId): string {
    switch (workspaceId) {
      case "home":
        return "Resume from Home mission cards, then preview the loaded prompt plan before any execution.";
      case "create-game":
        return "Continue the Create Game pipeline stage you launched from, then preview the loaded prompt plan.";
      case "create-movie":
        return "Continue the Create Movie cinematic pipeline stage you launched from, then preview the loaded prompt plan.";
      case "load-project":
        return "Continue the Load Project checklist and run the read-only inspect prompt preview.";
      case "asset-forge":
        return "Continue the Asset Forge pipeline, then review proof-only placement evidence and blockers.";
      case "prompt":
        return "Review the loaded prompt and preview the plan before any execution request.";
      case "builder":
        return "Review Builder handoff context and keep runtime actions in admitted or proof-only corridors.";
      case "operations":
        return "Review pending approvals and execute only admitted typed control-plane actions.";
      case "runtime":
        return "Review runtime bridge and adapter truth before attempting the next guided action.";
      case "records":
        return "Review latest run, execution, and artifact evidence before choosing the next mission action.";
      default:
        return "Review the active workspace truth rail and continue with the next safe, non-mutating step.";
    }
  }

  function returnToSourceWorkspaceFromPrompt(sourceWorkspaceId: string): void {
    const allowedWorkspaceIds: DesktopWorkspaceId[] = [
      "home",
      "create-game",
      "create-movie",
      "load-project",
      "asset-forge",
      "prompt",
      "builder",
      "operations",
      "runtime",
      "records",
    ];
    const resolvedWorkspaceId = allowedWorkspaceIds.includes(sourceWorkspaceId as DesktopWorkspaceId)
      ? sourceWorkspaceId as DesktopWorkspaceId
      : "home";
    const sourceSurfaceLabel = promptLaunchDraftRequest?.sourceSurfaceLabel?.trim()
      || `${workspaceMeta[resolvedWorkspaceId].title} mission handoff`;
    const draftLabel = promptLaunchDraftRequest?.draft?.label?.trim() || "Mission template";
    const launchedAtIso = promptLaunchDraftRequest?.launchedAtIso?.trim() || null;

    setPromptReturnResumeChecklist({
      id: crypto.randomUUID(),
      sourceWorkspaceId: resolvedWorkspaceId,
      sourceSurfaceLabel,
      draftLabel,
      launchedAtIso,
      returnedAtIso: new Date().toISOString(),
      nextSafeAction: getPromptReturnNextSafeAction(resolvedWorkspaceId),
    });
    setActiveWorkspaceId(resolvedWorkspaceId);
  }

  function openRecordsRuns(options?: { preserveEvidenceContext?: boolean }): void {
    if (!options?.preserveEvidenceContext) {
      setRecordsEvidenceContext(null);
    }
    setActiveWorkspaceId("records");
    setActiveRecordsSurface("runs");
  }

  function openRecordsExecutions(options?: { preserveEvidenceContext?: boolean }): void {
    if (!options?.preserveEvidenceContext) {
      setRecordsEvidenceContext(null);
    }
    setActiveWorkspaceId("records");
    setActiveRecordsSurface("executions");
  }

  function openRecordsArtifacts(options?: { preserveEvidenceContext?: boolean }): void {
    if (!options?.preserveEvidenceContext) {
      setRecordsEvidenceContext(null);
    }
    setActiveWorkspaceId("records");
    setActiveRecordsSurface("artifacts");
  }

  async function openLatestRunEvidence(): Promise<void> {
    openRecordsRuns();
    let runId = latestRunId;
    if (!runId) {
      const loadedRuns = await loadRuns();
      runId = loadedRuns[0]?.id ?? null;
    }
    if (runId) {
      await openRunDetail(runId);
    }
  }

  async function openLatestExecutionEvidence(): Promise<void> {
    openRecordsExecutions();
    let executionId = latestExecutionId;
    if (!executionId) {
      const loadedExecutions = await loadExecutions();
      executionId = loadedExecutions[0]?.id ?? null;
    }
    if (executionId) {
      await openExecutionDetail(executionId);
    }
  }

  async function openLatestArtifactEvidence(): Promise<void> {
    openRecordsArtifacts();
    let artifactId = latestArtifactId;
    if (!artifactId) {
      const loadedArtifacts = await loadArtifacts();
      artifactId = loadedArtifacts[0]?.id ?? null;
    }
    if (artifactId) {
      await openArtifactDetail(artifactId);
    }
  }

  function openRecordsEvents(): void {
    setActiveWorkspaceId("records");
    setActiveRecordsSurface("events");
  }

  async function openRunEvidenceById(runId: string): Promise<void> {
    const trimmedRunId = runId.trim();
    if (!trimmedRunId) {
      return;
    }
    const sourceWorkspaceId = activeWorkspaceId;
    const sourceSurfaceLabel = `${workspaceMeta[sourceWorkspaceId].title} mission truth rail`;
    setRecordsEvidenceContext({
      id: crypto.randomUUID(),
      targetKind: "run",
      targetId: trimmedRunId,
      sourceWorkspaceId,
      sourceSurfaceLabel,
      openedAtIso: new Date().toISOString(),
      relatedPromptSessionId: latestPlacementProofOnlyReview?.promptSessionId,
    });
    openRecordsRuns({ preserveEvidenceContext: true });
    await openRunDetail(trimmedRunId);
  }

  async function openExecutionEvidenceById(executionId: string): Promise<void> {
    const trimmedExecutionId = executionId.trim();
    if (!trimmedExecutionId) {
      return;
    }
    const sourceWorkspaceId = activeWorkspaceId;
    const sourceSurfaceLabel = `${workspaceMeta[sourceWorkspaceId].title} mission truth rail`;
    setRecordsEvidenceContext({
      id: crypto.randomUUID(),
      targetKind: "execution",
      targetId: trimmedExecutionId,
      sourceWorkspaceId,
      sourceSurfaceLabel,
      openedAtIso: new Date().toISOString(),
      relatedPromptSessionId: latestPlacementProofOnlyReview?.promptSessionId,
    });
    openRecordsExecutions({ preserveEvidenceContext: true });
    await openExecutionDetail(trimmedExecutionId);
  }

  async function openArtifactEvidenceById(artifactId: string): Promise<void> {
    const trimmedArtifactId = artifactId.trim();
    if (!trimmedArtifactId) {
      return;
    }
    const sourceWorkspaceId = activeWorkspaceId;
    const sourceSurfaceLabel = `${workspaceMeta[sourceWorkspaceId].title} mission truth rail`;
    setRecordsEvidenceContext({
      id: crypto.randomUUID(),
      targetKind: "artifact",
      targetId: trimmedArtifactId,
      sourceWorkspaceId,
      sourceSurfaceLabel,
      openedAtIso: new Date().toISOString(),
      relatedPromptSessionId: latestPlacementProofOnlyReview?.promptSessionId,
    });
    openRecordsArtifacts({ preserveEvidenceContext: true });
    await openArtifactDetail(trimmedArtifactId);
  }

  function focusAppControlEvents(): void {
    setEventsSearchPreset(null);
    setEventsEventTypePreset("app_control");
    setEventsVerificationPreset("all");
    setEventsFocusLabel(formatOverviewFocusLabel("event type", "app_control"));
    setActiveFocusedSection("events");
    setUpdatedFocusedSection(null);
    setEventsSearchVersion((value) => value + 1);
    openRecordsEvents();
  }

  function focusAppliedAppControlEvents(): void {
    setEventsSearchPreset(null);
    setEventsEventTypePreset("app_control_applied");
    setEventsVerificationPreset("all");
    setEventsFocusLabel(formatOverviewFocusLabel("event type", "app_control_applied"));
    setActiveFocusedSection("events");
    setUpdatedFocusedSection(null);
    setEventsSearchVersion((value) => value + 1);
    openRecordsEvents();
  }

  function focusRevertedAppControlEvents(): void {
    setEventsSearchPreset(null);
    setEventsEventTypePreset("app_control_reverted");
    setEventsVerificationPreset("all");
    setEventsFocusLabel(formatOverviewFocusLabel("event type", "app_control_reverted"));
    setActiveFocusedSection("events");
    setUpdatedFocusedSection(null);
    setEventsSearchVersion((value) => value + 1);
    openRecordsEvents();
  }

  function focusVerifiedOnlyAppControlEvents(): void {
    setEventsSearchPreset(null);
    setEventsEventTypePreset("app_control");
    setEventsVerificationPreset("verified_only");
    setEventsFocusLabel(formatOverviewFocusLabel("verification", "verified_only"));
    setActiveFocusedSection("events");
    setUpdatedFocusedSection(null);
    setEventsSearchVersion((value) => value + 1);
    openRecordsEvents();
  }

  function focusAssumedPresentAppControlEvents(): void {
    setEventsSearchPreset(null);
    setEventsEventTypePreset("app_control");
    setEventsVerificationPreset("assumed_present");
    setEventsFocusLabel(formatOverviewFocusLabel("verification", "assumed_present"));
    setActiveFocusedSection("events");
    setUpdatedFocusedSection(null);
    setEventsSearchVersion((value) => value + 1);
    openRecordsEvents();
  }

  function saveEventsTimelineView(
    label: string,
    eventTypeFilter: EventsTimelineSavedView["eventTypeFilter"],
    verificationFilter: EventsTimelineSavedView["verificationFilter"],
    searchValue = "",
  ): void {
    if (typeof window === "undefined") {
      return;
    }

    const nextView: EventsTimelineSavedView = {
      id: `saved-view-${Date.now()}`,
      label,
      eventTypeFilter,
      verificationFilter,
      searchValue,
      createdAt: new Date().toISOString(),
    };

    const nextSavedViews = [nextView, ...loadEventsTimelineSavedViews()]
      .slice(0, MAX_EVENTS_TIMELINE_SAVED_VIEWS);
    window.sessionStorage.setItem(
      EVENTS_TIMELINE_SAVED_VIEWS_SESSION_KEY,
      JSON.stringify(nextSavedViews),
    );
    setEventsSavedViewFeedback({
      label: "Saved to views",
      detail: `${label} is now available in browser-session saved views for the Events lane.`,
      view: nextView,
    });
    setEventsSearchVersion((value) => value + 1);
  }

  function openEventsTimelineSavedView(view: EventsTimelineSavedView): void {
    setEventsSearchPreset(view.searchValue || null);
    setEventsEventTypePreset(view.eventTypeFilter);
    setEventsVerificationPreset(view.verificationFilter);
    setEventsFocusLabel(formatOverviewFocusLabel("saved view", view.label));
    setActiveFocusedSection("events");
    setUpdatedFocusedSection(null);
    setEventsSearchVersion((value) => value + 1);
    openRecordsEvents();
  }

  function focusReviewableLocalEvents(): void {
    setEventsSearchPreset("reviewable_local");
    setEventsEventTypePreset("app_control");
    setEventsVerificationPreset("all");
    setEventsFocusLabel(formatOverviewFocusLabel("capability", "reviewable_local"));
    setActiveFocusedSection("events");
    setUpdatedFocusedSection(null);
    setEventsSearchVersion((value) => value + 1);
    openRecordsEvents();
  }

  function recordWorkspaceNextStepAction(entry: WorkspaceNextStepEntry): void {
    const recentAction: WorkspaceNextStepRecentAction = {
      id: `${Date.now()}-${entry.id}`,
      stepId: entry.id,
      label: entry.label,
      actionLabel: entry.actionLabel,
      opensLabel: entry.opensLabel ?? getWorkspaceNextStepOpensLabel(entry.id, entry.actionLabel),
      workspaceId: activeWorkspaceId,
      workspaceLabel: activeWorkspaceMeta.title,
      usedAt: new Date().toISOString(),
    };

    setWorkspaceNextStepRecentActions((previousActions) => [
      recentAction,
      ...previousActions.filter((action) => action.stepId !== entry.id),
    ].slice(0, MAX_WORKSPACE_NEXT_STEP_RECENT_ACTIONS));
  }

  function clearWorkspaceNextStepRecentActions(): void {
    setWorkspaceNextStepRecentActions([]);
  }

  function collapseWorkspaceNextSteps(): void {
    setWorkspaceNextStepsCollapsed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(WORKSPACE_NEXT_STEPS_COLLAPSED_SESSION_KEY, "true");
    }
  }

  function expandWorkspaceNextSteps(): void {
    setWorkspaceNextStepsCollapsed(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(WORKSPACE_NEXT_STEPS_COLLAPSED_SESSION_KEY);
    }
  }

  function replayWorkspaceNextStepAction(entry: WorkspaceNextStepRecentAction): void {
    if (!runWorkspaceNextStepActionById(entry.stepId)) {
      return;
    }

    const replayedAction: WorkspaceNextStepRecentAction = {
      ...entry,
      id: `${Date.now()}-${entry.stepId}`,
      opensLabel: entry.opensLabel ?? getWorkspaceNextStepOpensLabel(entry.stepId, entry.actionLabel),
      workspaceId: activeWorkspaceId,
      workspaceLabel: activeWorkspaceMeta.title,
      usedAt: new Date().toISOString(),
    };

    setWorkspaceNextStepRecentActions((previousActions) => [
      replayedAction,
      ...previousActions.filter((action) => action.stepId !== entry.stepId),
    ].slice(0, MAX_WORKSPACE_NEXT_STEP_RECENT_ACTIONS));
  }

  function runWorkspaceNextStepActionById(stepId: string): boolean {
    switch (stepId) {
      case "approvals-waiting":
        openOperationsApprovals();
        return true;
      case "runtime-health":
      case "runtime-overview":
        openRuntimeOverview();
        return true;
      case "warning-executions":
      case "records-executions":
        openRecordsExecutions();
        return true;
      case "unresolved-runs":
      case "operations-to-records":
      case "records-runs":
        openRecordsRuns();
        return true;
      case "prompt-to-builder":
        setActiveWorkspaceId("builder");
        return true;
      case "prompt-to-dispatch":
      case "operations-catalog-empty":
        openOperationsDispatch();
        return true;
      case "builder-to-prompt":
      case "fallback-prompt":
        setActiveWorkspaceId("prompt");
        return true;
      case "builder-to-runtime":
      case "runtime-governance":
        openRuntimeGovernance();
        return true;
      case "runtime-executors":
        openRuntimeExecutors();
        return true;
      case "runtime-workspaces":
        openRuntimeWorkspaces();
        return true;
      case "records-artifacts":
        openRecordsArtifacts();
        return true;
      default:
        return false;
    }
  }

  function buildWorkspaceNextStepEntries(): WorkspaceNextStepEntry[] {
    const runtimeHealthy = readiness?.persistence_ready === true
      && o3deBridgeStatus?.configured === true
      && o3deBridgeStatus?.heartbeat_fresh === true
      && adapters?.supports_real_execution === true;
    const entries: WorkspaceNextStepEntry[] = [];
    const addEntry = (entry: WorkspaceNextStepEntry): void => {
      if (entries.length >= 3 || entries.some((existing) => existing.id === entry.id)) {
        return;
      }
      entries.push({
        ...entry,
        opensLabel: entry.opensLabel ?? getWorkspaceNextStepOpensLabel(entry.id, entry.actionLabel),
        onAction: () => {
          recordWorkspaceNextStepAction(entry);
          entry.onAction();
        },
      });
    };

    if (pendingApprovalCount > 0) {
      addEntry({
        id: "approvals-waiting",
        label: "Approve or reject waiting work",
        detail: `${pendingApprovalCount} approval${pendingApprovalCount === 1 ? "" : "s"} are waiting before related work can continue.`,
        reason: "Approval-gated work cannot safely continue until an operator approves or rejects the pending request.",
        signals: [
          `pending approvals = ${pendingApprovalCount}`,
          "approval queue has priority over starting new work",
        ],
        actionLabel: "Open approvals",
        tone: "warning",
        onAction: openOperationsApprovals,
      });
    }

    if (!runtimeHealthy && activeWorkspaceId !== "runtime") {
      addEntry({
        id: "runtime-health",
        label: "Verify runtime health",
        detail: "Bridge, persistence, or real-execution readiness needs a check before trusting live O3DE work.",
        reason: "Live O3DE actions depend on persistence, bridge configuration, heartbeat freshness, and real-execution adapter posture.",
        signals: [
          `persistence_ready = ${readiness?.persistence_ready === true}`,
          `bridge_configured = ${o3deBridgeStatus?.configured === true}`,
          `heartbeat_fresh = ${o3deBridgeStatus?.heartbeat_fresh === true}`,
          `supports_real_execution = ${adapters?.supports_real_execution === true}`,
        ],
        actionLabel: "Open runtime",
        tone: "warning",
        onAction: openRuntimeOverview,
      });
    }

    if (warningExecutionCount > 0 && activeWorkspaceId !== "records") {
      addEntry({
        id: "warning-executions",
        label: "Review warning executions",
        detail: `${warningExecutionCount} execution${warningExecutionCount === 1 ? "" : "s"} have warnings that may need evidence review.`,
        reason: "Warning-bearing executions usually explain why work needs review before the operator starts another slice.",
        signals: [
          `warning executions = ${warningExecutionCount}`,
          "records workspace is the evidence review lane",
        ],
        actionLabel: "Open executions",
        tone: "warning",
        onAction: openRecordsExecutions,
      });
    }

    if (unresolvedRunCount > 0 && activeWorkspaceId !== "records") {
      addEntry({
        id: "unresolved-runs",
        label: "Review unresolved runs",
        detail: `${unresolvedRunCount} run${unresolvedRunCount === 1 ? "" : "s"} still need closeout review.`,
        reason: "Unresolved runs are the broadest open evidence wrappers, so they can hide incomplete or failed work.",
        signals: [
          `unresolved runs = ${unresolvedRunCount}`,
          "run review helps confirm closeout before more work starts",
        ],
        actionLabel: "Open runs",
        tone: "warning",
        onAction: openRecordsRuns,
      });
    }

    if (activeWorkspaceId === "prompt") {
      addEntry({
        id: "prompt-to-builder",
        label: "Coordinate follow-up work",
        detail: "After a prompt creates a plan or live result, use Builder to split follow-up tasks into safe worktree lanes.",
        reason: "Prompt Studio is good for intent; Builder is better when that intent needs coordinated threads, worktrees, or managed terminals.",
        signals: [
          "current workspace = Prompt Studio",
          "follow-up work benefits from mission-control ownership",
        ],
        actionLabel: "Open Builder",
        tone: "info",
        onAction: () => setActiveWorkspaceId("builder"),
      });
      addEntry({
        id: "prompt-to-dispatch",
        label: "Use typed dispatch when needed",
        detail: "If the natural-language plan is not the right fit, dispatch a specific tool request from Command Center.",
        reason: "Typed dispatch is the direct path when you already know the exact tool and arguments you want to run.",
        signals: [
          "current workspace = Prompt Studio",
          `catalog agents loaded = ${catalogAgents.length}`,
        ],
        actionLabel: "Open dispatch",
        tone: "info",
        onAction: openOperationsDispatch,
      });
    }

    if (activeWorkspaceId === "builder") {
      addEntry({
        id: "builder-to-prompt",
        label: "Describe the next build step",
        detail: "Use Prompt Studio when you want Codex to turn a natural-language O3DE request into a governed plan.",
        reason: "Builder coordinates execution lanes, but Prompt Studio is the safer starting point for turning an idea into an admitted plan.",
        signals: [
          "current workspace = Builder",
          "natural-language planning keeps capability boundaries visible",
        ],
        actionLabel: "Open Prompt Studio",
        tone: "info",
        onAction: () => setActiveWorkspaceId("prompt"),
      });
      addEntry({
        id: "builder-to-runtime",
        label: "Check live readiness",
        detail: "Before assigning real O3DE work to a lane, confirm runtime bridge and policy posture.",
        reason: "Parallel Builder lanes should not assume live O3DE readiness without checking bridge, adapter, and policy truth first.",
        signals: [
          `runtime healthy = ${runtimeHealthy}`,
          "governance shows admitted-real versus simulated boundaries",
        ],
        actionLabel: "Open governance",
        tone: runtimeHealthy ? "success" : "warning",
        onAction: openRuntimeGovernance,
      });
    }

    if (activeWorkspaceId === "operations") {
      if (catalogAgents.length === 0) {
        addEntry({
          id: "operations-catalog-empty",
          label: "Wait for live catalog",
          detail: "The dispatch form needs a live catalog before tool requests can be submitted safely.",
          reason: "Dispatch should not use fallback or invented tool data; the live catalog must be visible before users submit tool requests.",
          signals: [
            `catalog agents loaded = ${catalogAgents.length}`,
            "dispatch is safest after catalog hydration",
          ],
          actionLabel: "Open dispatch",
          tone: "warning",
          onAction: openOperationsDispatch,
        });
      }
      addEntry({
        id: "operations-to-records",
        label: "Inspect persisted evidence",
        detail: "After dispatch or approval work moves, review Records to confirm the run, execution, and artifact trail.",
        reason: "Operations moves work forward; Records verifies what actually happened afterward.",
        signals: [
          "current workspace = Command Center",
          `runs visible = ${runs.length}`,
          `executions visible = ${executions.length}`,
        ],
        actionLabel: "Open records",
        tone: "info",
        onAction: openRecordsRuns,
      });
    }

    if (activeWorkspaceId === "runtime") {
      if (!runtimeHealthy) {
        addEntry({
          id: "runtime-overview",
          label: "Start with system status",
          detail: "Use Runtime Overview first when persistence, bridge, heartbeat, or real-execution posture is uncertain.",
          reason: "Runtime Overview is the safest first stop when any live-readiness signal is missing or stale.",
          signals: [
            `persistence_ready = ${readiness?.persistence_ready === true}`,
            `bridge_configured = ${o3deBridgeStatus?.configured === true}`,
            `heartbeat_fresh = ${o3deBridgeStatus?.heartbeat_fresh === true}`,
            `supports_real_execution = ${adapters?.supports_real_execution === true}`,
          ],
          actionLabel: "Open overview",
          tone: "warning",
          onAction: openRuntimeOverview,
        });
      }
      if (executors.length === 0) {
        addEntry({
          id: "runtime-executors",
          label: "Confirm executors",
          detail: "No executor records are visible yet, so check runner inventory before assigning work.",
          reason: "Executor records explain which runner lanes exist and whether work has a clear owner.",
          signals: [
            `executors visible = ${executors.length}`,
            "executor inventory supports safe assignment",
          ],
          actionLabel: "Open executors",
          tone: "info",
          onAction: openRuntimeExecutors,
        });
      }
      if (workspaces.length === 0) {
        addEntry({
          id: "runtime-workspaces",
          label: "Confirm workspaces",
          detail: "No workspace records are visible yet, so check substrate ownership before treating lanes as ready.",
          reason: "Workspace records show substrate ownership and help avoid assuming a lane exists when it has not been persisted.",
          signals: [
            `workspaces visible = ${workspaces.length}`,
            "workspace inventory supports safe coordination",
          ],
          actionLabel: "Open workspaces",
          tone: "info",
          onAction: openRuntimeWorkspaces,
        });
      }
      addEntry({
        id: "runtime-governance",
        label: "Review capability boundaries",
        detail: "Use Governance before widening any claim about admitted-real, plan-only, or simulated capability.",
        reason: "Governance is the truth surface for capability boundaries, so it should be checked before expanding live O3DE claims.",
        signals: [
          `runtime healthy = ${runtimeHealthy}`,
          `policies visible = ${policies.length}`,
        ],
        actionLabel: "Open governance",
        tone: runtimeHealthy ? "success" : "info",
        onAction: openRuntimeGovernance,
      });
    }

    if (activeWorkspaceId === "records") {
      if (warningExecutionCount > 0) {
        addEntry({
          id: "records-executions",
          label: "Start with warning executions",
          detail: "Warning-bearing executions usually explain what needs operator attention first.",
          reason: "Executions are close enough to the tool call to explain warnings without losing the broader run context.",
          signals: [
            `warning executions = ${warningExecutionCount}`,
            "execution detail can show adapter mode and truth boundary",
          ],
          actionLabel: "Open executions",
          tone: "warning",
          onAction: openRecordsExecutions,
        });
      }
      if (unresolvedRunCount > 0) {
        addEntry({
          id: "records-runs",
          label: "Close out unresolved runs",
          detail: "Runs are the broadest evidence wrapper, so review unresolved runs before assuming work is complete.",
          reason: "Run records collect the broader outcome and are the right place to close the loop on incomplete work.",
          signals: [
            `unresolved runs = ${unresolvedRunCount}`,
            "run review supports operator closeout",
          ],
          actionLabel: "Open runs",
          tone: "warning",
          onAction: openRecordsRuns,
        });
      }
      addEntry({
        id: "records-artifacts",
        label: "Inspect artifacts",
        detail: "Artifacts carry the saved payloads and metadata you can use to verify what actually happened.",
        reason: "Artifacts are the durable evidence objects to inspect when a result or payload needs verification.",
        signals: [
          `artifacts visible = ${artifacts.length}`,
          "artifact metadata can confirm lineage",
        ],
        actionLabel: "Open artifacts",
        tone: "info",
        onAction: openRecordsArtifacts,
      });
    }

    addEntry({
      id: "fallback-prompt",
      label: "Start a natural-language request",
      detail: "If you are unsure, describe the next O3DE or control-plane change in Prompt Studio and preview the plan.",
      reason: "When no stronger warning is present, Prompt Studio is the safest beginner path because it previews a governed plan before execution.",
      signals: [
        "fallback guidance used after higher-priority recommendations",
        "preview-first workflow reduces accidental changes",
      ],
      actionLabel: "Open Prompt Studio",
      tone: "success",
      onAction: () => setActiveWorkspaceId("prompt"),
    });

    return entries;
  }

  function getWorkspaceNextStepOpensLabel(stepId: string, fallbackLabel: string): string {
    switch (stepId) {
      case "approvals-waiting":
        return "Operations > Approvals window";
      case "runtime-health":
      case "runtime-overview":
        return "Runtime > Overview window";
      case "warning-executions":
      case "records-executions":
        return "Records > Executions window";
      case "unresolved-runs":
      case "operations-to-records":
      case "records-runs":
        return "Records > Runs window";
      case "prompt-to-builder":
        return "Builder workspace";
      case "prompt-to-dispatch":
      case "operations-catalog-empty":
        return "Operations > Dispatch window";
      case "builder-to-prompt":
      case "fallback-prompt":
        return "Prompt Studio workspace";
      case "builder-to-runtime":
      case "runtime-governance":
        return "Runtime > Governance window";
      case "runtime-executors":
        return "Runtime > Executors window";
      case "runtime-workspaces":
        return "Runtime > Workspaces window";
      case "records-artifacts":
        return "Records > Artifacts window";
      default:
        return fallbackLabel;
    }
  }

  function completeFirstRunTour(): void {
    saveSettings({
      ...settings,
      layout: {
        ...settings.layout,
        guidedTourCompleted: true,
      },
    });
  }

  const operationsSurfaceItems = [
    {
      ...getShellWorkspaceSurfaceGuide("operations", "dispatch"),
      helpTooltip: getShellWorkspaceSurfaceGuide("operations", "dispatch").tooltip,
    },
    {
      ...getShellWorkspaceSurfaceGuide("operations", "agents"),
      helpTooltip: getShellWorkspaceSurfaceGuide("operations", "agents").tooltip,
    },
    {
      ...getShellWorkspaceSurfaceGuide("operations", "approvals"),
      badge: pendingApprovalCount > 0 ? String(pendingApprovalCount) : null,
      helpTooltip: getShellWorkspaceSurfaceGuide("operations", "approvals").tooltip,
    },
    {
      ...getShellWorkspaceSurfaceGuide("operations", "timeline"),
      helpTooltip: getShellWorkspaceSurfaceGuide("operations", "timeline").tooltip,
    },
  ] as const;
  const runtimeSurfaceItems = [
    {
      ...getShellWorkspaceSurfaceGuide("runtime", "overview"),
      badge: bridgeStatusLabel,
      helpTooltip: getShellWorkspaceSurfaceGuide("runtime", "overview").tooltip,
    },
    {
      ...getShellWorkspaceSurfaceGuide("runtime", "executors"),
      badge: executors.length > 0 ? String(executors.length) : null,
      helpTooltip: getShellWorkspaceSurfaceGuide("runtime", "executors").tooltip,
    },
    {
      ...getShellWorkspaceSurfaceGuide("runtime", "workspaces"),
      badge: workspaces.length > 0 ? String(workspaces.length) : null,
      helpTooltip: getShellWorkspaceSurfaceGuide("runtime", "workspaces").tooltip,
    },
    {
      ...getShellWorkspaceSurfaceGuide("runtime", "governance"),
      helpTooltip: getShellWorkspaceSurfaceGuide("runtime", "governance").tooltip,
    },
  ] as const;
  const recordsSurfaceItems = [
    {
      ...getShellWorkspaceSurfaceGuide("records", "runs"),
      badge: runs.length > 0 ? String(runs.length) : null,
      helpTooltip: getShellWorkspaceSurfaceGuide("records", "runs").tooltip,
    },
    {
      ...getShellWorkspaceSurfaceGuide("records", "executions"),
      badge: warningExecutionCount > 0 ? String(warningExecutionCount) : null,
      helpTooltip: getShellWorkspaceSurfaceGuide("records", "executions").tooltip,
    },
    {
      ...getShellWorkspaceSurfaceGuide("records", "artifacts"),
      badge: artifacts.length > 0 ? String(artifacts.length) : null,
      helpTooltip: getShellWorkspaceSurfaceGuide("records", "artifacts").tooltip,
    },
    {
      ...getShellWorkspaceSurfaceGuide("records", "events"),
      badge: events.length > 0 ? String(events.length) : null,
      helpTooltip: getShellWorkspaceSurfaceGuide("records", "events").tooltip,
    },
  ] as const;
  const latestRunId = selectedRunId ?? runs[0]?.id ?? null;
  const latestExecutionId = selectedExecutionId ?? executions[0]?.id ?? null;
  const latestArtifactId = selectedArtifactId ?? artifacts[0]?.id ?? null;
  const homeMissionControlContent = (
    <LayoutHeader
      title={operatorGuideShellApp.title}
      subtitle="Desktop operator shell for orchestrating O3DE-focused agents, approvals, logs, artifacts, and tool-driven workflows."
      refreshing={dashboardRefreshing}
      lastRefreshedAt={dashboardRefreshedAt}
      refreshStatusLabel={dashboardRefreshStatus}
      refreshStatusDetail={dashboardRefreshDetail}
      pinnedRecordLabel={pinnedRecord?.label ?? null}
      pinnedRecordSummary={pinnedRecord?.summary ?? null}
      pinnedRecordStatusLabel={pinnedRecordStatus?.label ?? null}
      pinnedRecordStatusDetail={pinnedRecordStatus?.detail ?? null}
      onOpenPinnedRecord={pinnedRecord ? openPinnedRecord : null}
      onRefocusPinnedRecord={pinnedRecord ? openPinnedRecord : null}
      onClearPinnedRecord={pinnedRecord ? (() => setPinnedRecord(null)) : null}
      onClearLocalLaneContext={handleClearLocalLaneContext}
      nextPinnedLaneLabel={nextPinnedLaneRecord?.label ?? null}
      nextPinnedLaneDetail={nextPinnedLaneRecord?.detail ?? null}
      onOpenNextPinnedLaneRecord={nextPinnedLaneRecord ? openPinnedLaneQueueRecord : null}
      laneCompletionLabel={pinnedLaneCompletionState?.label ?? null}
      laneCompletionDetail={pinnedLaneCompletionState?.detail ?? null}
      laneRolloverLabel={pinnedLaneRolloverRecord?.label ?? null}
      laneRolloverDetail={pinnedLaneRolloverRecord?.detail ?? null}
      laneMetricsLabel={pinnedLaneMetrics?.label ?? null}
      laneMetricsDetail={pinnedLaneMetrics?.detail ?? null}
      laneDriverLabel={pinnedLaneMetrics?.driverLabel ?? null}
      laneDriverDetail={pinnedLaneMetrics?.driverDetail ?? null}
      laneFilterLabel={getLaneFilterLabel(laneFilterMode)}
      laneMemoryLabel={laneMemory?.pinnedLabel ?? null}
      laneMemoryDetail={laneMemory?.detail ?? null}
      laneHistoryEntries={laneHistory}
      laneReadinessLabel={laneReadiness?.label ?? null}
      laneReadinessDetail={laneReadiness?.detail ?? null}
      laneHistoryStatusLabel={laneHistoryAvailability?.label ?? null}
      laneHistoryStatusDetail={laneHistoryAvailability?.detail ?? null}
      laneRecoveryLabel={laneRecoveryAction?.label ?? null}
      laneHandoffLabel={laneHandoffSummary?.label ?? null}
      laneHandoffDetail={laneHandoffSummary?.detail ?? null}
      laneExportLabel={laneExportStatus?.label ?? null}
      laneExportDetail={laneExportStatus?.detail ?? null}
      laneOperatorNoteLabel={activeLaneOperatorNote?.label ?? null}
      laneOperatorNoteDetail={activeLaneOperatorNote?.detail ?? null}
      laneOperatorNoteDraft={laneOperatorNoteDraft}
      onLaneOperatorNoteDraftChange={setLaneOperatorNoteDraft}
      onSaveLaneOperatorNote={pinnedRecord ? handleLaneOperatorNoteSave : null}
      onClearLaneOperatorNote={pinnedRecord ? handleLaneOperatorNoteClear : null}
      onCopyLaneContext={pinnedRecord ? (() => { void handleCopyLaneContext(); }) : null}
      activeLanePresetLabel={lanePresetStatus?.activeLabel ?? null}
      activeLanePresetDetail={lanePresetStatus?.activeDetail ?? null}
      lanePresetRestoredLabel={lanePresetStatus?.restoredLabel ?? null}
      lanePresetRestoredDetail={lanePresetStatus?.restoredDetail ?? null}
      lanePresetDriftLabel={lanePresetStatus?.driftLabel ?? null}
      lanePresetDriftDetail={lanePresetStatus?.driftDetail ?? null}
      lanePresetEntries={lanePresets}
      onSetLaneFilterMode={pinnedRecord ? handleLaneFilterModeChange : null}
      onOpenLaneRolloverRecord={pinnedLaneRolloverRecord ? openPinnedLaneRolloverRecord : null}
      onReturnToLane={laneMemory ? restoreLaneMemory : null}
      onOpenLaneHistoryEntry={openLaneHistoryEntry}
      onApplyLaneRecovery={laneRecoveryAction ? handleLaneRecovery : null}
      onDropStaleLaneHistory={laneHistoryAvailability?.label === "recent returns stale" ? dropStaleLaneHistory : null}
      onApplyLanePreset={applyLanePreset}
      refreshActions={[
        {
          label: "Refresh dashboard",
          onClick: () => {
            void refreshDashboardStateForScope("full");
          },
        },
        {
          label: "Refresh overview",
          onClick: () => {
            void refreshDashboardStateForScope("overview");
          },
        },
        {
          label: "Refresh records",
          onClick: () => {
            void refreshDashboardStateForScope("records");
          },
        },
      ]}
    />
  );
  const promptLaunchpad = promptWorkspaceGuide.launchpad!;
  const builderLaunchpad = builderWorkspaceGuide.launchpad!;
  const operationsLaunchpad = operationsWorkspaceGuide.launchpad!;
  const runtimeLaunchpad = runtimeWorkspaceGuide.launchpad!;
  const recordsLaunchpad = recordsWorkspaceGuide.launchpad!;
  const homeLaunchpadContent = (
    <>
      <RecommendedActionsPanel entries={homeRecommendationEntries} />
      <div style={desktopLaunchpadGridStyle}>
        <button
          type="button"
          onClick={() => setActiveWorkspaceId("prompt")}
          title={promptLaunchpad.tooltip}
          style={desktopShortcutCardStyle}
        >
          <strong>{promptLaunchpad.label}</strong>
          <span style={desktopShortcutMetaStyle}>
            {promptLaunchpad.description}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveWorkspaceId("builder")}
          title={builderLaunchpad.tooltip}
          style={desktopShortcutCardStyle}
        >
          <strong>{builderLaunchpad.label}</strong>
          <span style={desktopShortcutMetaStyle}>
            {builderLaunchpad.description}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveWorkspaceId("operations");
            setActiveOperationsSurface("dispatch");
          }}
          title={operationsLaunchpad.tooltip}
          style={desktopShortcutCardStyle}
        >
          <strong>{operationsLaunchpad.label}</strong>
          <span style={desktopShortcutMetaStyle}>
            {operationsLaunchpad.description}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveWorkspaceId("runtime");
            setActiveRuntimeSurface("overview");
          }}
          title={runtimeLaunchpad.tooltip}
          style={desktopShortcutCardStyle}
        >
          <strong>{runtimeLaunchpad.label}</strong>
          <span style={desktopShortcutMetaStyle}>
            {runtimeLaunchpad.description}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveWorkspaceId("records");
            setActiveRecordsSurface("runs");
          }}
          title={recordsLaunchpad.tooltip}
          style={desktopShortcutCardStyle}
        >
          <strong>{recordsLaunchpad.label}</strong>
          <span style={desktopShortcutMetaStyle}>
            {recordsLaunchpad.description}
          </span>
        </button>
      </div>
      <div style={desktopSummaryStripStyle}>
        <div style={desktopMiniStatStyle} title={approvalsQuickStatGuide.tooltip}>
          <span style={desktopMiniStatLabelStyle}>Approvals waiting</span>
          <strong>{pendingApprovalCount}</strong>
        </div>
        <div style={desktopMiniStatStyle} title={warningsQuickStatGuide.tooltip}>
          <span style={desktopMiniStatLabelStyle}>Execution warnings</span>
          <strong>{warningExecutionCount}</strong>
        </div>
        <div style={desktopMiniStatStyle} title={bridgeQuickStatGuide.tooltip}>
          <span style={desktopMiniStatLabelStyle}>Bridge heartbeat</span>
          <strong>{bridgeStatusLabel}</strong>
        </div>
        <div style={desktopMiniStatStyle} title={runsQuickStatGuide.tooltip}>
          <span style={desktopMiniStatLabelStyle}>Unresolved runs</span>
          <strong>{unresolvedRunCount}</strong>
        </div>
      </div>
    </>
  );
  const homeGuideContent = (
    <Suspense
      fallback={renderWorkspaceLoadingFallback(
        "Operator guide",
        "Loading the in-app operating instructions and capability posture notes.",
      )}
    >
      <OperatorGuidePanel />
    </Suspense>
  );
  const homeOverviewPanelDeckProps: HomeOverviewPanelDeckProps = {
    attention: {
      entries: attentionRecommendations,
      onPrimaryAction: (entryId) => {
        const [, targetId] = entryId.split(":");
        if (targetId === "runs" && runsOverviewContextPreset) {
          void replayRunsOverviewContext(runsOverviewContextPreset);
          return;
        }
        if (targetId === "executions") {
          if (entryId.startsWith("snoozed:") && executionsOverviewContextPreset) {
            handleTriageSavedExecutionContext();
            return;
          }
          if (executionsOverviewContextPreset) {
            replayExecutionsOverviewContext(executionsOverviewContextPreset);
            return;
          }
        }
        if (targetId === "artifacts") {
          if (entryId.startsWith("snoozed:") && artifactsOverviewContextPreset) {
            handleTriageSavedArtifactContext();
            return;
          }
          if (artifactsOverviewContextPreset) {
            replayArtifactsOverviewContext(artifactsOverviewContextPreset);
          }
        }
      },
      onSecondaryAction: (entryId) => {
        const [, targetId] = entryId.split(":");
        if (targetId === "runs" || targetId === "executions" || targetId === "artifacts") {
          handleKeepOverviewEntryInQueue(targetId);
        }
      },
    },
    closeoutReadiness: {
      readyCount: overviewReviewSessionSummary.readyCount,
      pendingCount: overviewReviewSessionSummary.pendingCount,
      entries: readinessDiagnostics,
    },
    handoffConfidence: {
      confidenceLabel: handoffConfidence.label,
      confidenceDetail: handoffConfidence.detail,
      tone: handoffConfidence.tone,
      staleCount: overviewReviewSessionSummary.staleCount,
      driftedCount: overviewReviewSessionSummary.driftedCount,
      excludedCount: handoffPackageExcludedEntries.length,
      changedSinceSnapshotCount,
    },
    handoffPackage: {
      includedEntries: handoffPackageIncludedEntries,
      excludedEntries: handoffPackageExcludedEntries,
    },
    handoffExport: {
      generatedAtLabel: `Generated: ${handoffExportGeneratedAt}`,
      includedEntries: handoffPackageIncludedEntries,
      excludedEntries: handoffPackageExcludedEntries,
      draftText: overviewHandoffExportDraft,
      statusLabel: laneHandoffSummary?.label ?? null,
      statusDetail: laneHandoffSummary?.detail ?? null,
      onCopyDraft: handoffPackageIncludedEntries.length > 0 || handoffPackageExcludedEntries.length > 0
        ? (() => { void handleCopyOverviewHandoffExportDraft(); })
        : null,
    },
    reviewSession: {
      inQueueCount: overviewReviewSessionSummary.inQueueCount,
      snoozedCount: overviewReviewSessionSummary.snoozedCount,
      reviewedCount: overviewReviewSessionSummary.reviewedCount,
      staleCount: overviewReviewSessionSummary.staleCount,
      driftedCount: overviewReviewSessionSummary.driftedCount,
      longestSnoozedLabel: overviewReviewSessionSummary.longestSnoozedLabel,
      longestSnoozedDetail: overviewReviewSessionSummary.longestSnoozedDetail,
      lastSnapshotLabel: overviewReviewSessionSummary.lastSnapshotLabel,
      compareSummaryLabel: overviewReviewSessionSummary.compareSummaryLabel,
      onCopySessionSnapshot: overviewContextMemoryEntries.length > 0 || attentionRecommendations.length > 0
        ? (() => { void handleCopyOverviewReviewSessionSnapshot(); })
        : null,
      onReturnAllToQueue: Object.keys(overviewReviewState).length > 0
        ? (() => {
            setOverviewReviewState((current) => {
              const next = { ...current };
              for (const key of Object.keys(next) as OverviewContextId[]) {
                next[key] = {
                  disposition: "in_queue",
                  updatedAt: new Date().toISOString(),
                };
              }
              return next;
            });
            setLaneHandoffSummary({
              label: "handoff: local review queue reset",
              detail: "Returned all saved local overview contexts to the in-queue state for this browser session. No backend review state was changed.",
            });
          })
        : null,
      onResetReviewState: Object.keys(overviewReviewState).length > 0
        ? (() => {
            setOverviewReviewState({});
            setLaneHandoffSummary({
              label: "handoff: local review state cleared",
              detail: "Cleared all browser-session review outcomes for saved overview contexts. No backend queue or task state was changed.",
            });
          })
        : null,
    },
    reviewQueue: {
      entries: overviewReviewQueueEntries,
      onOpenEntry: (entryId) => {
        if (entryId === "executions" && executionsOverviewContextPreset) {
          replayExecutionsOverviewContext(executionsOverviewContextPreset);
          return;
        }
        if (entryId === "artifacts" && artifactsOverviewContextPreset) {
          replayArtifactsOverviewContext(artifactsOverviewContextPreset);
          return;
        }
        if (entryId === "executors" && executorsOverviewContextPreset) {
          replayExecutorsOverviewContext(executorsOverviewContextPreset);
          return;
        }
        if (entryId === "workspaces" && workspacesOverviewContextPreset) {
          replayWorkspacesOverviewContext(workspacesOverviewContextPreset);
        }
      },
      onTriageEntry: (entryId) => {
        if (entryId === "executions") {
          handleTriageSavedExecutionContext();
          return;
        }
        if (entryId === "artifacts") {
          handleTriageSavedArtifactContext();
          return;
        }
        if (entryId === "executors") {
          handleTriageSavedExecutorContext();
          return;
        }
        if (entryId === "workspaces") {
          handleTriageSavedWorkspaceContext();
        }
      },
      onMarkReviewed: (entryId) => {
        if (
          entryId === "executions"
          || entryId === "artifacts"
          || entryId === "executors"
          || entryId === "workspaces"
        ) {
          handleMarkOverviewEntryReviewed(entryId);
        }
      },
      onSnoozeEntry: (entryId) => {
        if (
          entryId === "executions"
          || entryId === "artifacts"
          || entryId === "executors"
          || entryId === "workspaces"
        ) {
          handleSnoozeOverviewEntry(entryId);
        }
      },
      onKeepInQueue: (entryId) => {
        if (
          entryId === "executions"
          || entryId === "artifacts"
          || entryId === "executors"
          || entryId === "workspaces"
        ) {
          handleKeepOverviewEntryInQueue(entryId);
        }
      },
    },
    contextMemory: {
      entries: overviewContextMemoryEntries,
      onOpenEntry: (entryId) => {
        if (entryId === "runs" && runsOverviewContextPreset) {
          void replayRunsOverviewContext(runsOverviewContextPreset);
          return;
        }
        if (entryId === "executions" && executionsOverviewContextPreset) {
          replayExecutionsOverviewContext(executionsOverviewContextPreset);
          return;
        }
        if (entryId === "artifacts" && artifactsOverviewContextPreset) {
          replayArtifactsOverviewContext(artifactsOverviewContextPreset);
          return;
        }
        if (entryId === "executors" && executorsOverviewContextPreset) {
          replayExecutorsOverviewContext(executorsOverviewContextPreset);
          return;
        }
        if (entryId === "workspaces" && workspacesOverviewContextPreset) {
          replayWorkspacesOverviewContext(workspacesOverviewContextPreset);
        }
      },
      onTriageEntry: (entryId) => {
        if (entryId === "executions") {
          handleTriageSavedExecutionContext();
          return;
        }
        if (entryId === "artifacts") {
          handleTriageSavedArtifactContext();
          return;
        }
        if (entryId === "executors") {
          handleTriageSavedExecutorContext();
          return;
        }
        if (entryId === "workspaces") {
          handleTriageSavedWorkspaceContext();
        }
      },
      onSaveNote: (entryId, text) => {
        if (
          entryId === "runs"
          || entryId === "executions"
          || entryId === "artifacts"
          || entryId === "executors"
          || entryId === "workspaces"
        ) {
          handleSaveOverviewContextNote(entryId, text);
        }
      },
      onMarkReviewed: (entryId) => {
        if (
          entryId === "runs"
          || entryId === "executions"
          || entryId === "artifacts"
          || entryId === "executors"
          || entryId === "workspaces"
        ) {
          handleMarkOverviewEntryReviewed(entryId);
        }
      },
      onSnoozeEntry: (entryId) => {
        if (
          entryId === "runs"
          || entryId === "executions"
          || entryId === "artifacts"
          || entryId === "executors"
          || entryId === "workspaces"
        ) {
          handleSnoozeOverviewEntry(entryId);
        }
      },
      onKeepInQueue: (entryId) => {
        if (
          entryId === "runs"
          || entryId === "executions"
          || entryId === "artifacts"
          || entryId === "executors"
          || entryId === "workspaces"
        ) {
          handleKeepOverviewEntryInQueue(entryId);
        }
      },
      onClearEntry: (entryId) => {
        if (entryId === "runs") {
          setRunsOverviewContextPreset(null);
          setOverviewReviewState((current) => {
            const next = { ...current };
            delete next.runs;
            return next;
          });
          setOverviewContextNotes((current) => {
            const next = { ...current };
            delete next.runs;
            return next;
          });
          return;
        }
        if (entryId === "executions") {
          setExecutionsOverviewContextPreset(null);
          setOverviewReviewState((current) => {
            const next = { ...current };
            delete next.executions;
            return next;
          });
          setOverviewContextNotes((current) => {
            const next = { ...current };
            delete next.executions;
            return next;
          });
          return;
        }
        if (entryId === "artifacts") {
          setArtifactsOverviewContextPreset(null);
          setOverviewReviewState((current) => {
            const next = { ...current };
            delete next.artifacts;
            return next;
          });
          setOverviewContextNotes((current) => {
            const next = { ...current };
            delete next.artifacts;
            return next;
          });
          return;
        }
        if (entryId === "executors") {
          setExecutorsOverviewContextPreset(null);
          setOverviewReviewState((current) => {
            const next = { ...current };
            delete next.executors;
            return next;
          });
          setOverviewContextNotes((current) => {
            const next = { ...current };
            delete next.executors;
            return next;
          });
          return;
        }
        if (entryId === "workspaces") {
          setWorkspacesOverviewContextPreset(null);
          setOverviewReviewState((current) => {
            const next = { ...current };
            delete next.workspaces;
            return next;
          });
          setOverviewContextNotes((current) => {
            const next = { ...current };
            delete next.workspaces;
            return next;
          });
        }
      },
      onClearAll: overviewContextMemoryEntries.length > 0
        ? (() => {
            setRunsOverviewContextPreset(null);
            setExecutionsOverviewContextPreset(null);
            setArtifactsOverviewContextPreset(null);
            setExecutorsOverviewContextPreset(null);
            setWorkspacesOverviewContextPreset(null);
            setOverviewReviewState({});
            setOverviewContextNotes({});
            setLaneHandoffSummary({
              label: "handoff: local context memory cleared",
              detail: "Cleared browser-session overview context presets from workspace memory. No backend preset or server persistence was affected.",
            });
          })
        : null,
    },
  };
  const homeOverviewContent = (
    <Suspense
      fallback={renderWorkspaceLoadingFallback(
        "Operator overview",
        "Loading the Home overview deck and local review memory surfaces.",
      )}
    >
      <div style={homeOverviewStackStyle}>
        <AppCapabilityDashboardShell />
        <AppAuditReviewDashboardShell />
        <AppEvidenceTimelineShell />
        <AppApprovalSessionDashboardShell />
        <AppWorkspaceStatusChipsShell />
        <HomeOverviewPanelDeck {...homeOverviewPanelDeckProps} />
      </div>
    </Suspense>
  );
  const runtimeOverviewProps = {
    adapters: {
      adapters,
      loading: adaptersLoading,
      error: adaptersError,
    },
    systemStatus: {
      readiness,
      bridgeStatus: o3deBridgeStatus,
      loading: readinessLoading || o3deBridgeLoading,
      error: readinessError,
      bridgeError: o3deBridgeError,
      bridgeCleanupBusy: o3deBridgeCleanupBusy,
      bridgeCleanupStatus: o3deBridgeCleanupStatus,
      onCleanupBridgeResults: () => {
        void handleCleanupO3deBridgeResults();
      },
    },
    operatorOverview: {
      summary: controlPlaneSummary,
      loading: controlPlaneSummaryLoading,
      error: controlPlaneSummaryError,
      lastRefreshedAt: operatorOverviewRefreshedAt,
      pinnedRecordLabel: pinnedRecord?.label ?? null,
      pinnedRecordSummary: pinnedRecord?.summary ?? null,
      pinnedRecordStatusLabel: pinnedRecordStatus?.label ?? null,
      pinnedRecordStatusDetail: pinnedRecordStatus?.detail ?? null,
      onOpenPinnedRecord: pinnedRecord ? openPinnedRecord : null,
      onRefocusPinnedRecord: pinnedRecord ? openPinnedRecord : null,
      onClearPinnedRecord: pinnedRecord ? (() => setPinnedRecord(null)) : null,
      onClearLocalLaneContext: handleClearLocalLaneContext,
      nextPinnedLaneLabel: nextPinnedLaneRecord?.label ?? null,
      nextPinnedLaneDetail: nextPinnedLaneRecord?.detail ?? null,
      onOpenNextPinnedLaneRecord: nextPinnedLaneRecord ? openPinnedLaneQueueRecord : null,
      laneCompletionLabel: pinnedLaneCompletionState?.label ?? null,
      laneCompletionDetail: pinnedLaneCompletionState?.detail ?? null,
      laneRolloverLabel: pinnedLaneRolloverRecord?.label ?? null,
      laneRolloverDetail: pinnedLaneRolloverRecord?.detail ?? null,
      laneMetricsLabel: pinnedLaneMetrics?.label ?? null,
      laneMetricsDetail: pinnedLaneMetrics?.detail ?? null,
      laneDriverLabel: pinnedLaneMetrics?.driverLabel ?? null,
      laneDriverDetail: pinnedLaneMetrics?.driverDetail ?? null,
      laneFilterLabel: getLaneFilterLabel(laneFilterMode),
      laneReadinessLabel: laneReadiness?.label ?? null,
      laneReadinessDetail: laneReadiness?.detail ?? null,
      laneHistoryStatusLabel: laneHistoryAvailability?.label ?? null,
      laneHistoryStatusDetail: laneHistoryAvailability?.detail ?? null,
      laneRecoveryLabel: laneRecoveryAction?.label ?? null,
      laneHandoffLabel: laneHandoffSummary?.label ?? null,
      laneHandoffDetail: laneHandoffSummary?.detail ?? null,
      laneExportLabel: laneExportStatus?.label ?? null,
      laneExportDetail: laneExportStatus?.detail ?? null,
      laneOperatorNoteLabel: activeLaneOperatorNote?.label ?? null,
      laneOperatorNoteDetail: activeLaneOperatorNote?.detail ?? null,
      laneOperatorNoteDraft,
      onLaneOperatorNoteDraftChange: setLaneOperatorNoteDraft,
      onSaveLaneOperatorNote: pinnedRecord ? handleLaneOperatorNoteSave : null,
      onClearLaneOperatorNote: pinnedRecord ? handleLaneOperatorNoteClear : null,
      onCopyLaneContext: pinnedRecord ? (() => { void handleCopyLaneContext(); }) : null,
      activeLanePresetLabel: lanePresetStatus?.activeLabel ?? null,
      activeLanePresetDetail: lanePresetStatus?.activeDetail ?? null,
      lanePresetRestoredLabel: lanePresetStatus?.restoredLabel ?? null,
      lanePresetRestoredDetail: lanePresetStatus?.restoredDetail ?? null,
      lanePresetDriftLabel: lanePresetStatus?.driftLabel ?? null,
      lanePresetDriftDetail: lanePresetStatus?.driftDetail ?? null,
      lanePresetEntries: lanePresets,
      onSetLaneFilterMode: pinnedRecord ? handleLaneFilterModeChange : null,
      onApplyLaneRecovery: laneRecoveryAction ? handleLaneRecovery : null,
      onDropStaleLaneHistory: laneHistoryAvailability?.label === "recent returns stale" ? dropStaleLaneHistory : null,
      onApplyLanePreset: applyLanePreset,
      onOpenLaneRolloverRecord: pinnedLaneRolloverRecord ? openPinnedLaneRolloverRecord : null,
      onRunStatusSelect: handleRunStatusDrilldown,
      onRunInspectionSurfaceSelect: (value: string) => {
        handleRunTruthDrilldown("inspection_surface", value);
      },
      onRunFallbackCategorySelect: (value: string) => {
        handleRunTruthDrilldown("fallback_category", value);
      },
      onRunManifestSourceSelect: (value: string) => {
        handleRunTruthDrilldown("manifest_source_of_truth", value);
      },
      onPendingApprovalsSelect: handlePendingApprovalsDrilldown,
      onExecutionModeSelect: handleExecutionModeDrilldown,
      onArtifactModeSelect: handleArtifactModeDrilldown,
      onEventSeveritySelect: handleEventSeverityDrilldown,
      onExecutorAvailabilitySelect: handleExecutorAvailabilityDrilldown,
      onWorkspaceStateSelect: handleWorkspaceStateDrilldown,
      onExecutionInspectionSurfaceSelect: handleExecutionInspectionSurfaceDrilldown,
      onExecutionFallbackCategorySelect: handleExecutionFallbackCategoryDrilldown,
      onExecutionManifestSourceSelect: handleExecutionManifestSourceDrilldown,
      onArtifactInspectionSurfaceSelect: handleArtifactInspectionSurfaceDrilldown,
      onArtifactFallbackCategorySelect: handleArtifactFallbackCategoryDrilldown,
      onArtifactManifestSourceSelect: handleArtifactManifestSourceDrilldown,
      onRefresh: () => {
        void refreshDashboardStateForScope("overview");
      },
      refreshing: overviewRefreshing,
    },
  };
  const runtimeExecutorsProps = {
    panelKey: `executors-search-${executorsSearchVersion}`,
    sectionRef: executorsSectionRef,
    detailSectionRef: executorDetailSectionRef,
    contextStrip: {
      laneLabel: "Executors",
      focusLabel: executorsFocusLabel,
      originLabel: describeOverviewFocusOrigin(executorsFocusLabel),
      impactLabel: getExecutorsOverviewImpactSummary()?.label ?? null,
      impactDetail: getExecutorsOverviewImpactSummary()?.detail ?? null,
      promotedPresetLabel: executorsOverviewContextPreset?.focusLabel ?? null,
      promotedPresetDetail: executorsOverviewContextPreset
        ? `Saved from ${executorsOverviewContextPreset.originLabel} at ${new Date(executorsOverviewContextPreset.savedAt).toLocaleTimeString()}. Browser-session only.`
        : null,
      historyEntries: executorsOverviewContextHistory.map((entry) => ({
        id: entry.id,
        focusLabel: entry.focusLabel,
        originLabel: entry.originLabel,
      })),
      onSelectHistoryEntry: (entryId: string) => {
        const entry = executorsOverviewContextHistory.find((item) => item.id === entryId);
        if (entry) {
          replayExecutorsOverviewContext(entry);
        }
      },
      onClearHistory: executorsOverviewContextHistory.length > 0
        ? (() => setExecutorsOverviewContextHistory([]))
        : null,
      onPromoteCurrentContext: executorsFocusLabel ? handlePromoteExecutorsOverviewContextPreset : null,
      onApplyPromotedPreset: executorsOverviewContextPreset
        ? (() => replayExecutorsOverviewContext(executorsOverviewContextPreset))
        : null,
      onClearPromotedPreset: executorsOverviewContextPreset
        ? (() => setExecutorsOverviewContextPreset(null))
        : null,
      onClearFocus: executorsFocusLabel ? clearExecutorsFocus : null,
    },
    executorsPanel: {
      items: executors,
      loading: executorsLoading,
      error: executorsError,
      selectedExecutorId,
      onSelectExecutor: openExecutorDetail,
      searchPreset: executorsSearchPreset,
      focusLabel: executorsFocusLabel,
      onClearFocus: clearExecutorsFocus,
      lastRefreshedAt: executorsRefreshedAt,
      updateBadgeLabel: null,
      onRefresh: () => {
        void refreshDashboardStateForScope("records");
      },
      refreshing: recordsRefreshing,
    },
    executorDetailPanel: {
      item: selectedExecutor,
      loading: selectedExecutorLoading,
      error: selectedExecutorError,
      localReviewDisposition: overviewReviewState.executors?.disposition ?? null,
      localReviewUpdatedAt: overviewReviewState.executors?.updatedAt ?? null,
      localContextFocusLabel: executorsOverviewContextPreset?.focusLabel ?? null,
      localContextSavedAt: executorsOverviewContextPreset?.savedAt ?? null,
      localContextNote: overviewContextNotes.executors?.text ?? null,
      localReadinessLabel: readinessDiagnosticsById.executors?.summaryLabel ?? null,
      localReadinessDetail: readinessDiagnosticsById.executors?.detail ?? null,
      localHasDrift: overviewReviewDiagnosticsById.executors?.hasDrift ?? false,
      onOpenSavedContext: executorsOverviewContextPreset ? handleTriageSavedExecutorContext : null,
      onMarkLocalReviewed: executorsOverviewContextPreset ? (() => handleMarkOverviewEntryReviewed("executors")) : null,
      onSnoozeLocalReview: executorsOverviewContextPreset ? (() => handleSnoozeOverviewEntry("executors")) : null,
      onKeepLocalInQueue: executorsOverviewContextPreset ? (() => handleKeepOverviewEntryInQueue("executors")) : null,
      attentionExecutionLabel: selectedExecutorPreferredExecution
        ? describeExecutionAttention(selectedExecutorPreferredExecution, selectedExecutionId).label
        : null,
      attentionExecutionDetail: selectedExecutorPreferredExecution
        ? `${describeExecutionAttention(selectedExecutorPreferredExecution, selectedExecutionId).description} ${recommendExecutionAction(selectedExecutorPreferredExecution, selectedExecutionId).description}`
        : null,
      attentionArtifactLabel: selectedExecutorPreferredArtifact
        ? describeArtifactPriority(
          selectedExecutorPreferredArtifact,
          artifacts.filter((artifact) => artifact.executor_id === selectedExecutorPreferredArtifact.executor_id),
          selectedArtifactId,
        ).label
        : null,
      attentionArtifactDetail: selectedExecutorPreferredArtifact
        ? describeArtifactPriority(
          selectedExecutorPreferredArtifact,
          artifacts.filter((artifact) => artifact.executor_id === selectedExecutorPreferredArtifact.executor_id),
          selectedArtifactId,
        ).description
        : null,
      attentionRunLabel: selectedExecutor
        ? `${runs.filter((run) => run.executor_id === selectedExecutor.id).length} linked run${runs.filter((run) => run.executor_id === selectedExecutor.id).length === 1 ? "" : "s"}`
        : null,
      attentionRunDetail: selectedExecutor
        ? (() => {
          const linkedRuns = runs.filter((run) => run.executor_id === selectedExecutor.id);
          const unresolvedRuns = linkedRuns.filter((run) =>
            run.status === "running"
            || run.status === "waiting_approval"
            || run.status === "blocked"
            || run.status === "failed",
          );
          if (unresolvedRuns.length > 0) {
            return `${unresolvedRuns.length} linked run${unresolvedRuns.length === 1 ? " remains" : "s remain"} in an unresolved persisted status for this executor bookkeeping slice.`;
          }
          return linkedRuns.length > 0
            ? "Linked runs exist, but none currently stand out as unresolved persisted follow-up."
            : "No linked runs are currently attached to this executor.";
        })()
        : null,
      relatedWorkspaces: selectedExecutor
        ? workspaces.filter((workspace) => workspace.owner_executor_id === selectedExecutor.id)
        : [],
      relatedExecutions: selectedExecutor
        ? executions.filter((execution) => execution.executor_id === selectedExecutor.id)
        : [],
      relatedRuns: selectedExecutor
        ? runs.filter((run) => run.executor_id === selectedExecutor.id)
        : [],
      relatedArtifacts: selectedExecutor
        ? artifacts.filter((artifact) => artifact.executor_id === selectedExecutor.id)
        : [],
      relatedEvents: selectedExecutor
        ? events.filter((event) => event.executor_id === selectedExecutor.id)
        : [],
      onOpenWorkspace: openWorkspaceDetail,
      onOpenExecution: openExecutionDetail,
      onOpenRun: openRunDetail,
      onOpenArtifact: openArtifactDetail,
      lastRefreshedAt: executorDetailRefreshedAt,
      onRefresh: () => {
        void refreshExecutorDetailSection();
      },
      refreshing: executorDetailRefreshing || selectedExecutorLoading,
    },
  };
  const runtimeWorkspacesProps = {
    panelKey: `workspaces-search-${workspacesSearchVersion}`,
    sectionRef: workspacesSectionRef,
    detailSectionRef: workspaceDetailSectionRef,
    contextStrip: {
      laneLabel: "Workspaces",
      focusLabel: workspacesFocusLabel,
      originLabel: describeOverviewFocusOrigin(workspacesFocusLabel),
      impactLabel: getWorkspacesOverviewImpactSummary()?.label ?? null,
      impactDetail: getWorkspacesOverviewImpactSummary()?.detail ?? null,
      promotedPresetLabel: workspacesOverviewContextPreset?.focusLabel ?? null,
      promotedPresetDetail: workspacesOverviewContextPreset
        ? `Saved from ${workspacesOverviewContextPreset.originLabel} at ${new Date(workspacesOverviewContextPreset.savedAt).toLocaleTimeString()}. Browser-session only.`
        : null,
      historyEntries: workspacesOverviewContextHistory.map((entry) => ({
        id: entry.id,
        focusLabel: entry.focusLabel,
        originLabel: entry.originLabel,
      })),
      onSelectHistoryEntry: (entryId: string) => {
        const entry = workspacesOverviewContextHistory.find((item) => item.id === entryId);
        if (entry) {
          replayWorkspacesOverviewContext(entry);
        }
      },
      onClearHistory: workspacesOverviewContextHistory.length > 0
        ? (() => setWorkspacesOverviewContextHistory([]))
        : null,
      onPromoteCurrentContext: workspacesFocusLabel ? handlePromoteWorkspacesOverviewContextPreset : null,
      onApplyPromotedPreset: workspacesOverviewContextPreset
        ? (() => replayWorkspacesOverviewContext(workspacesOverviewContextPreset))
        : null,
      onClearPromotedPreset: workspacesOverviewContextPreset
        ? (() => setWorkspacesOverviewContextPreset(null))
        : null,
      onClearFocus: workspacesFocusLabel ? clearWorkspacesFocus : null,
    },
    workspacesPanel: {
      items: workspaces,
      loading: workspacesLoading,
      error: workspacesError,
      selectedWorkspaceId,
      onSelectWorkspace: openWorkspaceDetail,
      searchPreset: workspacesSearchPreset,
      focusLabel: workspacesFocusLabel,
      onClearFocus: clearWorkspacesFocus,
      lastRefreshedAt: workspacesRefreshedAt,
      updateBadgeLabel: null,
      onRefresh: () => {
        void refreshDashboardStateForScope("records");
      },
      refreshing: recordsRefreshing,
    },
    workspaceDetailPanel: {
      item: selectedWorkspace,
      loading: selectedWorkspaceLoading,
      error: selectedWorkspaceError,
      localReviewDisposition: overviewReviewState.workspaces?.disposition ?? null,
      localReviewUpdatedAt: overviewReviewState.workspaces?.updatedAt ?? null,
      localContextFocusLabel: workspacesOverviewContextPreset?.focusLabel ?? null,
      localContextSavedAt: workspacesOverviewContextPreset?.savedAt ?? null,
      localContextNote: overviewContextNotes.workspaces?.text ?? null,
      localReadinessLabel: readinessDiagnosticsById.workspaces?.summaryLabel ?? null,
      localReadinessDetail: readinessDiagnosticsById.workspaces?.detail ?? null,
      localHasDrift: overviewReviewDiagnosticsById.workspaces?.hasDrift ?? false,
      onOpenSavedContext: workspacesOverviewContextPreset ? handleTriageSavedWorkspaceContext : null,
      onMarkLocalReviewed: workspacesOverviewContextPreset ? (() => handleMarkOverviewEntryReviewed("workspaces")) : null,
      onSnoozeLocalReview: workspacesOverviewContextPreset ? (() => handleSnoozeOverviewEntry("workspaces")) : null,
      onKeepLocalInQueue: workspacesOverviewContextPreset ? (() => handleKeepOverviewEntryInQueue("workspaces")) : null,
      attentionExecutionLabel: selectedWorkspacePreferredExecution
        ? describeExecutionAttention(selectedWorkspacePreferredExecution, selectedExecutionId).label
        : null,
      attentionExecutionDetail: selectedWorkspacePreferredExecution
        ? `${describeExecutionAttention(selectedWorkspacePreferredExecution, selectedExecutionId).description} ${recommendExecutionAction(selectedWorkspacePreferredExecution, selectedExecutionId).description}`
        : null,
      attentionArtifactLabel: selectedWorkspacePreferredArtifact
        ? describeArtifactPriority(
          selectedWorkspacePreferredArtifact,
          artifacts.filter((artifact) => artifact.workspace_id === selectedWorkspacePreferredArtifact.workspace_id),
          selectedArtifactId,
        ).label
        : null,
      attentionArtifactDetail: selectedWorkspacePreferredArtifact
        ? describeArtifactPriority(
          selectedWorkspacePreferredArtifact,
          artifacts.filter((artifact) => artifact.workspace_id === selectedWorkspacePreferredArtifact.workspace_id),
          selectedArtifactId,
        ).description
        : null,
      attentionRunLabel: selectedWorkspace
        ? `${runs.filter((run) => run.workspace_id === selectedWorkspace.id).length} linked run${runs.filter((run) => run.workspace_id === selectedWorkspace.id).length === 1 ? "" : "s"}`
        : null,
      attentionRunDetail: selectedWorkspace
        ? (() => {
          const linkedRuns = runs.filter((run) => run.workspace_id === selectedWorkspace.id);
          const unresolvedRuns = linkedRuns.filter((run) =>
            run.status === "running"
            || run.status === "waiting_approval"
            || run.status === "blocked"
            || run.status === "failed",
          );
          if (unresolvedRuns.length > 0) {
            return `${unresolvedRuns.length} linked run${unresolvedRuns.length === 1 ? " remains" : "s remain"} in an unresolved persisted status for this workspace bookkeeping slice.`;
          }
          return linkedRuns.length > 0
            ? "Linked runs exist, but none currently stand out as unresolved persisted follow-up."
            : "No linked runs are currently attached to this workspace.";
        })()
        : null,
      relatedExecutions: selectedWorkspace
        ? executions.filter((execution) => execution.workspace_id === selectedWorkspace.id)
        : [],
      relatedRuns: selectedWorkspace
        ? runs.filter((run) => run.workspace_id === selectedWorkspace.id)
        : [],
      relatedArtifacts: selectedWorkspace
        ? artifacts.filter((artifact) => artifact.workspace_id === selectedWorkspace.id)
        : [],
      relatedEvents: selectedWorkspace
        ? events.filter((event) => event.workspace_id === selectedWorkspace.id)
        : [],
      onOpenExecution: openExecutionDetail,
      onOpenRun: openRunDetail,
      onOpenArtifact: openArtifactDetail,
      lastRefreshedAt: workspaceDetailRefreshedAt,
      onRefresh: () => {
        void refreshWorkspaceDetailSection();
      },
      refreshing: workspaceDetailRefreshing || selectedWorkspaceLoading,
    },
  };

  const runtimeGovernanceProps = {
    phase7: {
      items: policies,
      loading: policiesLoading,
      error: policiesError,
    },
    locks: {
      items: locks,
      loading: locksLoading,
      error: locksError,
    },
    policies: {
      items: policies,
      loading: policiesLoading,
      error: policiesError,
    },
  };

  const renderRuntimeWorkspace = () => (
    <Suspense
      fallback={renderWorkspaceLoadingFallback(
        "Runtime Console",
        "Loading bridge status, executor lanes, workspace lanes, and governance evidence.",
      )}
    >
      <RuntimeWorkspaceDesktop
        activeSurfaceId={activeRuntimeSurface}
        items={runtimeSurfaceItems}
        onSelectSurface={(surfaceId) => setActiveRuntimeSurface(surfaceId)}
        overview={runtimeOverviewProps}
        executors={runtimeExecutorsProps}
        workspaces={runtimeWorkspacesProps}
        governance={runtimeGovernanceProps}
        guidedMode={settings.layout.guidedMode}
      />
    </Suspense>
  );
  const recordsArtifactsProps = {
    panelKey: `artifacts-search-${artifactsSearchVersion}`,
    sectionRef: artifactsSectionRef,
    detailSectionRef: artifactDetailSectionRef,
    contextStrip: {
      laneLabel: "Artifacts",
      focusLabel: artifactsFocusLabel,
      originLabel: describeOverviewFocusOrigin(artifactsFocusLabel),
      autoOpenLabel: describeOverviewAutoOpenOutcome(artifactDetailRefreshHint),
      impactLabel: getArtifactsOverviewImpactSummary()?.label ?? null,
      impactDetail: getArtifactsOverviewImpactSummary()?.detail ?? null,
      promotedPresetLabel: artifactsOverviewContextPreset?.focusLabel ?? null,
      promotedPresetDetail: artifactsOverviewContextPreset
        ? `Saved from ${artifactsOverviewContextPreset.originLabel} at ${new Date(artifactsOverviewContextPreset.savedAt).toLocaleTimeString()}. Browser-session only.`
        : null,
      historyEntries: artifactsOverviewContextHistory.map((entry) => ({
        id: entry.id,
        focusLabel: entry.focusLabel,
        originLabel: entry.originLabel,
      })),
      onSelectHistoryEntry: (entryId: string) => {
        const entry = artifactsOverviewContextHistory.find((item) => item.id === entryId);
        if (entry) {
          replayArtifactsOverviewContext(entry);
        }
      },
      onClearHistory: artifactsOverviewContextHistory.length > 0
        ? (() => setArtifactsOverviewContextHistory([]))
        : null,
      onPromoteCurrentContext: artifactsFocusLabel ? handlePromoteArtifactsOverviewContextPreset : null,
      onApplyPromotedPreset: artifactsOverviewContextPreset
        ? (() => replayArtifactsOverviewContext(artifactsOverviewContextPreset))
        : null,
      onClearPromotedPreset: artifactsOverviewContextPreset
        ? (() => setArtifactsOverviewContextPreset(null))
        : null,
      onClearFocus: artifactsFocusLabel ? clearArtifactsFocus : null,
    },
    artifactsPanel: {
      items: artifacts,
      loading: artifactsLoading,
      error: artifactsError,
      selectedArtifactId,
      onSelectArtifact: openArtifactDetail,
      searchPreset: artifactsSearchPreset,
      focusLabel: artifactsFocusLabel,
      onClearFocus: clearArtifactsFocus,
      lastRefreshedAt: artifactsRefreshedAt,
      updateBadgeLabel: getFocusedSectionUpdateLabel("artifacts"),
      onRefresh: () => {
        void refreshDashboardStateForScope("records");
      },
      refreshing: recordsRefreshing,
    },
    artifactDetailPanel: {
      item: selectedArtifact,
      loading: selectedArtifactLoading,
      error: selectedArtifactError,
      breadcrumbs: artifactDetailBreadcrumbs,
      selectedRunId,
      selectedExecutionId,
      selectedArtifactId,
      pinnedRecordId: pinnedRecord?.kind === "artifact" ? pinnedRecord.id : null,
      pinnedRecordStatusLabel: pinnedRecord?.kind === "artifact" ? pinnedRecordStatus?.label ?? null : null,
      pinnedRecordStatusDetail: pinnedRecord?.kind === "artifact" ? pinnedRecordStatus?.detail ?? null : null,
      laneQueueLabel: pinnedRecord?.kind === "artifact" ? nextPinnedLaneRecord?.label ?? null : null,
      laneQueueDetail: pinnedRecord?.kind === "artifact" ? nextPinnedLaneRecord?.detail ?? null : null,
      laneCompletionLabel: pinnedRecord?.kind === "artifact" ? pinnedLaneCompletionState?.label ?? null : null,
      laneCompletionDetail: pinnedRecord?.kind === "artifact" ? pinnedLaneCompletionState?.detail ?? null : null,
      laneRolloverLabel: pinnedRecord?.kind === "artifact" ? pinnedLaneRolloverRecord?.label ?? null : null,
      laneRolloverDetail: pinnedRecord?.kind === "artifact" ? pinnedLaneRolloverRecord?.detail ?? null : null,
      laneMetricsLabel: pinnedRecord?.kind === "artifact" ? pinnedLaneMetrics?.label ?? null : null,
      laneMetricsDetail: pinnedRecord?.kind === "artifact" ? pinnedLaneMetrics?.detail ?? null : null,
      laneDriverLabel: pinnedRecord?.kind === "artifact" ? pinnedLaneMetrics?.driverLabel ?? null : null,
      laneDriverDetail: pinnedRecord?.kind === "artifact" ? pinnedLaneMetrics?.driverDetail ?? null : null,
      laneMemoryLabel: pinnedRecord?.kind !== "artifact" ? laneMemory?.pinnedLabel ?? null : null,
      laneMemoryDetail: pinnedRecord?.kind !== "artifact" ? laneMemory?.detail ?? null : null,
      laneHistoryEntries: pinnedRecord?.kind !== "artifact" ? laneHistory : [],
      laneHandoffLabel: laneHandoffSummary?.label ?? null,
      laneHandoffDetail: laneHandoffSummary?.detail ?? null,
      laneExportLabel: laneExportStatus?.label ?? null,
      laneExportDetail: laneExportStatus?.detail ?? null,
      laneOperatorNoteLabel: activeLaneOperatorNote?.label ?? null,
      laneOperatorNoteDetail: activeLaneOperatorNote?.detail ?? null,
      activeLanePresetLabel: lanePresetStatus?.activeLabel ?? null,
      activeLanePresetDetail: lanePresetStatus?.activeDetail ?? null,
      lanePresetRestoredLabel: lanePresetStatus?.restoredLabel ?? null,
      lanePresetRestoredDetail: lanePresetStatus?.restoredDetail ?? null,
      lanePresetDriftLabel: lanePresetStatus?.driftLabel ?? null,
      lanePresetDriftDetail: lanePresetStatus?.driftDetail ?? null,
      priorityShortcutLabel: selectedArtifactSiblingPriority ? "Open highest-priority sibling artifact" : null,
      priorityShortcutDescription: selectedArtifactSiblingPriority
        ? `Jump directly to ${describeArtifactPriority(
          selectedArtifactSiblingPriority,
          artifacts.filter((artifact) => artifact.execution_id === selectedArtifactSiblingPriority.execution_id),
          selectedArtifactId,
        ).description}`
        : null,
      warningShortcutLabel: selectedArtifactHighestRiskSibling ? "Open highest-risk sibling artifact" : null,
      warningShortcutDescription: selectedArtifactHighestRiskSibling
        ? "Jump directly to the sibling artifact with the strongest persisted risk markers, such as simulated output or mutation-audit rollback or failure state."
        : null,
      relatedArtifacts: selectedArtifact
        ? artifacts.filter((artifact) => artifact.execution_id === selectedArtifact.execution_id)
        : [],
      relatedRunStatus: relatedArtifactRun?.status ?? null,
      relatedRunSummary: relatedArtifactRun?.result_summary ?? null,
      relatedExecutionStatus: relatedArtifactExecution?.status ?? null,
      relatedExecutionSummary: relatedArtifactExecution?.result_summary ?? null,
      relatedExecutionMode: relatedArtifactExecution?.execution_mode ?? null,
      relatedExecutionStartedAt: relatedArtifactExecution?.started_at ?? null,
      relatedExecutionWarningCount: relatedArtifactExecution?.warning_count ?? null,
      onOpenRun: openRunDetail,
      onOpenExecution: openExecutionDetail,
      onOpenArtifact: openArtifactDetail,
      onOpenPriorityRecord: selectedArtifactSiblingPriority
        ? () => openArtifactDetail(selectedArtifactSiblingPriority.id)
        : null,
      onOpenWarningRecord: selectedArtifactHighestRiskSibling
        ? () => openArtifactDetail(selectedArtifactHighestRiskSibling.id)
        : null,
      onPinRecord: () => pinArtifactRecord(selectedArtifact),
      onUnpinRecord: pinnedRecord?.kind === "artifact" && selectedArtifact?.id === pinnedRecord.id
        ? () => setPinnedRecord(null)
        : null,
      onRefocusPinnedRecord: pinnedRecord?.kind === "artifact" ? openPinnedRecord : null,
      onOpenNextLaneRecord: pinnedRecord?.kind === "artifact" && nextPinnedLaneRecord ? openPinnedLaneQueueRecord : null,
      onOpenLaneRolloverRecord: pinnedRecord?.kind === "artifact" && pinnedLaneRolloverRecord ? openPinnedLaneRolloverRecord : null,
      onReturnToLane: pinnedRecord?.kind !== "artifact" && laneMemory ? restoreLaneMemory : null,
      onOpenLaneHistoryEntry: pinnedRecord?.kind !== "artifact" ? openLaneHistoryEntry : null,
      refreshHint: artifactDetailRefreshHint,
      lastRefreshedAt: artifactDetailRefreshedAt,
      onRefresh: () => {
        void refreshArtifactDetailSection();
      },
      refreshing: artifactDetailRefreshing || selectedArtifactLoading,
    },
  };
  const recordsExecutionsProps = {
    panelKey: `executions-search-${executionsSearchVersion}`,
    sectionRef: executionsSectionRef,
    detailSectionRef: executionDetailSectionRef,
    contextStrip: {
      laneLabel: "Executions",
      focusLabel: executionsFocusLabel,
      originLabel: describeOverviewFocusOrigin(executionsFocusLabel),
      autoOpenLabel: describeOverviewAutoOpenOutcome(executionDetailRefreshHint),
      impactLabel: getExecutionsOverviewImpactSummary()?.label ?? null,
      impactDetail: getExecutionsOverviewImpactSummary()?.detail ?? null,
      promotedPresetLabel: executionsOverviewContextPreset?.focusLabel ?? null,
      promotedPresetDetail: executionsOverviewContextPreset
        ? `Saved from ${executionsOverviewContextPreset.originLabel} at ${new Date(executionsOverviewContextPreset.savedAt).toLocaleTimeString()}. Browser-session only.`
        : null,
      historyEntries: executionsOverviewContextHistory.map((entry) => ({
        id: entry.id,
        focusLabel: entry.focusLabel,
        originLabel: entry.originLabel,
      })),
      onSelectHistoryEntry: (entryId: string) => {
        const entry = executionsOverviewContextHistory.find((item) => item.id === entryId);
        if (entry) {
          replayExecutionsOverviewContext(entry);
        }
      },
      onClearHistory: executionsOverviewContextHistory.length > 0
        ? (() => setExecutionsOverviewContextHistory([]))
        : null,
      onPromoteCurrentContext: executionsFocusLabel ? handlePromoteExecutionsOverviewContextPreset : null,
      onApplyPromotedPreset: executionsOverviewContextPreset
        ? (() => replayExecutionsOverviewContext(executionsOverviewContextPreset))
        : null,
      onClearPromotedPreset: executionsOverviewContextPreset
        ? (() => setExecutionsOverviewContextPreset(null))
        : null,
      onClearFocus: executionsFocusLabel ? clearExecutionsFocus : null,
    },
    executionsPanel: {
      items: executions,
      loading: executionsLoading,
      error: executionsError,
      selectedExecutionId,
      onSelectExecution: openExecutionDetail,
      searchPreset: executionsSearchPreset,
      focusLabel: executionsFocusLabel,
      onClearFocus: clearExecutionsFocus,
      lastRefreshedAt: executionsRefreshedAt,
      updateBadgeLabel: getFocusedSectionUpdateLabel("executions"),
      onRefresh: () => {
        void refreshDashboardStateForScope("records");
      },
      refreshing: recordsRefreshing,
    },
    executionDetailPanel: {
      item: selectedExecution,
      loading: selectedExecutionLoading,
      error: selectedExecutionError,
      breadcrumbs: executionDetailBreadcrumbs,
      selectedRunId,
      selectedExecutionId,
      selectedArtifactId,
      pinnedRecordId: pinnedRecord?.kind === "execution" ? pinnedRecord.id : null,
      pinnedRecordStatusLabel: pinnedRecord?.kind === "execution" ? pinnedRecordStatus?.label ?? null : null,
      pinnedRecordStatusDetail: pinnedRecord?.kind === "execution" ? pinnedRecordStatus?.detail ?? null : null,
      laneQueueLabel: pinnedRecord?.kind === "execution" ? nextPinnedLaneRecord?.label ?? null : null,
      laneQueueDetail: pinnedRecord?.kind === "execution" ? nextPinnedLaneRecord?.detail ?? null : null,
      laneCompletionLabel: pinnedRecord?.kind === "execution" ? pinnedLaneCompletionState?.label ?? null : null,
      laneCompletionDetail: pinnedRecord?.kind === "execution" ? pinnedLaneCompletionState?.detail ?? null : null,
      laneRolloverLabel: pinnedRecord?.kind === "execution" ? pinnedLaneRolloverRecord?.label ?? null : null,
      laneRolloverDetail: pinnedRecord?.kind === "execution" ? pinnedLaneRolloverRecord?.detail ?? null : null,
      laneMetricsLabel: pinnedRecord?.kind === "execution" ? pinnedLaneMetrics?.label ?? null : null,
      laneMetricsDetail: pinnedRecord?.kind === "execution" ? pinnedLaneMetrics?.detail ?? null : null,
      laneDriverLabel: pinnedRecord?.kind === "execution" ? pinnedLaneMetrics?.driverLabel ?? null : null,
      laneDriverDetail: pinnedRecord?.kind === "execution" ? pinnedLaneMetrics?.driverDetail ?? null : null,
      laneMemoryLabel: pinnedRecord?.kind !== "execution" ? laneMemory?.pinnedLabel ?? null : null,
      laneMemoryDetail: pinnedRecord?.kind !== "execution" ? laneMemory?.detail ?? null : null,
      laneHistoryEntries: pinnedRecord?.kind !== "execution" ? laneHistory : [],
      laneHandoffLabel: laneHandoffSummary?.label ?? null,
      laneHandoffDetail: laneHandoffSummary?.detail ?? null,
      laneExportLabel: laneExportStatus?.label ?? null,
      laneExportDetail: laneExportStatus?.detail ?? null,
      laneOperatorNoteLabel: activeLaneOperatorNote?.label ?? null,
      laneOperatorNoteDetail: activeLaneOperatorNote?.detail ?? null,
      activeLanePresetLabel: lanePresetStatus?.activeLabel ?? null,
      activeLanePresetDetail: lanePresetStatus?.activeDetail ?? null,
      lanePresetRestoredLabel: lanePresetStatus?.restoredLabel ?? null,
      lanePresetRestoredDetail: lanePresetStatus?.restoredDetail ?? null,
      lanePresetDriftLabel: lanePresetStatus?.driftLabel ?? null,
      lanePresetDriftDetail: lanePresetStatus?.driftDetail ?? null,
      priorityShortcutLabel: selectedExecutionPreferredArtifact ? "Open highest-priority artifact" : null,
      priorityShortcutDescription: selectedExecutionPreferredArtifact
        ? `Jump directly to ${describeArtifactPriority(
          selectedExecutionPreferredArtifact,
          artifacts.filter((artifact) => artifact.execution_id === selectedExecutionPreferredArtifact.execution_id),
          selectedArtifactId,
        ).description}`
        : null,
      warningShortcutLabel: selectedExecutionHighestRiskArtifact ? "Open highest-risk related artifact" : null,
      warningShortcutDescription: selectedExecutionHighestRiskArtifact
        ? "Jump directly to the related artifact with the strongest persisted risk markers, such as simulated output or mutation-audit failure state."
        : null,
      relatedArtifacts: selectedExecution
        ? artifacts.filter((artifact) => artifact.execution_id === selectedExecution.id)
        : [],
      originatingArtifactLabel: executionOriginArtifact?.label ?? null,
      originatingArtifactKind: executionOriginArtifact?.kind ?? null,
      onOpenRun: openRunDetail,
      onOpenArtifact: openArtifactDetail,
      onOpenPriorityRecord: selectedExecutionPreferredArtifact
        ? () => openArtifactDetail(selectedExecutionPreferredArtifact.id)
        : null,
      onOpenWarningRecord: selectedExecutionHighestRiskArtifact
        ? () => openArtifactDetail(selectedExecutionHighestRiskArtifact.id)
        : null,
      onPinRecord: () => pinExecutionRecord(selectedExecution),
      onUnpinRecord: pinnedRecord?.kind === "execution" && selectedExecution?.id === pinnedRecord.id
        ? () => setPinnedRecord(null)
        : null,
      onRefocusPinnedRecord: pinnedRecord?.kind === "execution" ? openPinnedRecord : null,
      onOpenNextLaneRecord: pinnedRecord?.kind === "execution" && nextPinnedLaneRecord ? openPinnedLaneQueueRecord : null,
      onOpenLaneRolloverRecord: pinnedRecord?.kind === "execution" && pinnedLaneRolloverRecord ? openPinnedLaneRolloverRecord : null,
      onReturnToLane: pinnedRecord?.kind !== "execution" && laneMemory ? restoreLaneMemory : null,
      onOpenLaneHistoryEntry: pinnedRecord?.kind !== "execution" ? openLaneHistoryEntry : null,
      refreshHint: executionDetailRefreshHint,
      lastRefreshedAt: executionDetailRefreshedAt,
      onRefresh: () => {
        void refreshExecutionDetailSection();
      },
      refreshing: executionDetailRefreshing || selectedExecutionLoading,
    },
  };
  const recordsRunsProps = {
    panelKey: `runs-search-${runsSearchVersion}`,
    sectionRef: runsSectionRef,
    detailSectionRef: runDetailSectionRef,
    contextStrip: {
      laneLabel: "Runs",
      focusLabel: runsFocusLabel,
      originLabel: describeOverviewFocusOrigin(runsFocusLabel),
      autoOpenLabel: describeOverviewAutoOpenOutcome(runDetailRefreshHint),
      impactLabel: getRunsOverviewImpactSummary()?.label ?? null,
      impactDetail: getRunsOverviewImpactSummary()?.detail ?? null,
      promotedPresetLabel: runsOverviewContextPreset?.focusLabel ?? null,
      promotedPresetDetail: runsOverviewContextPreset
        ? `Saved from ${runsOverviewContextPreset.originLabel} at ${new Date(runsOverviewContextPreset.savedAt).toLocaleTimeString()}. Browser-session only.`
        : null,
      historyEntries: runsOverviewContextHistory.map((entry) => ({
        id: entry.id,
        focusLabel: entry.focusLabel,
        originLabel: entry.originLabel,
      })),
      onSelectHistoryEntry: (entryId: string) => {
        const entry = runsOverviewContextHistory.find((item) => item.id === entryId);
        if (entry) {
          void replayRunsOverviewContext(entry);
        }
      },
      onClearHistory: runsOverviewContextHistory.length > 0
        ? (() => setRunsOverviewContextHistory([]))
        : null,
      onPromoteCurrentContext: runsFocusLabel ? handlePromoteRunsOverviewContextPreset : null,
      onApplyPromotedPreset: runsOverviewContextPreset
        ? (() => { void replayRunsOverviewContext(runsOverviewContextPreset); })
        : null,
      onClearPromotedPreset: runsOverviewContextPreset
        ? (() => setRunsOverviewContextPreset(null))
        : null,
      onClearFocus: runsFocusLabel ? clearRunsFocus : null,
    },
    runsPanel: {
      items: runs,
      runAudits,
      settingsPatchAuditSummary,
      selectedToolFilter,
      onToolFilterChange: handleToolFilterChange,
      selectedAuditFilter,
      onAuditFilterChange: handleAuditFilterChange,
      loading: runsLoading,
      error: runsError,
      selectedRunId,
      onSelectRun: openRunDetail,
      onTruthFilterSelect: handleRunTruthDrilldown,
      searchPreset: runsSearchPreset,
      focusLabel: runsFocusLabel,
      onClearFocus: clearRunsFocus,
      lastRefreshedAt: runsRefreshedAt,
      updateBadgeLabel: getFocusedSectionUpdateLabel("runs"),
      onRefresh: () => {
        void refreshDashboardStateForScope("records");
      },
      refreshing: recordsRefreshing,
    },
    runDetailPanel: {
      item: selectedRun,
      loading: selectedRunLoading,
      error: selectedRunError,
      breadcrumbs: runDetailBreadcrumbs,
      executionDetails: selectedExecutionDetails,
      relatedExecutionId: selectedRunPreferredExecution?.id ?? null,
      relatedExecutionPriorityLabel: relatedExecutionPriority?.label ?? null,
      relatedExecutionPriorityDescription: relatedExecutionPriority?.description ?? null,
      relatedExecutionActionLabel: relatedExecutionAction?.label ?? null,
      relatedExecutionActionDescription: relatedExecutionAction?.description ?? null,
      relatedExecutionAttentionLabel: relatedExecutionAttention?.label ?? null,
      relatedExecutionAttentionDescription: relatedExecutionAttention?.description ?? null,
      priorityShortcutLabel: selectedRunPreferredExecution ? "Open highest-priority execution" : null,
      priorityShortcutDescription: selectedRunPreferredExecution
        ? `Jump directly to ${describeExecutionPriority(
          selectedRunPreferredExecution,
          executions.filter((execution) => execution.run_id === selectedRunPreferredExecution.run_id),
          selectedExecutionId,
        ).description}`
        : null,
      warningShortcutLabel: selectedRunWarningExecution ? "Open next warning-bearing execution" : null,
      warningShortcutDescription: selectedRunWarningExecution
        ? `Jump directly to the related execution carrying ${selectedRunWarningExecution.warning_count} persisted warning${selectedRunWarningExecution.warning_count === 1 ? "" : "s"}.`
        : null,
      originatingArtifactId: runOriginArtifact?.id ?? null,
      originatingArtifactLabel: runOriginArtifact?.label ?? null,
      originatingArtifactKind: runOriginArtifact?.kind ?? null,
      selectedRunId,
      selectedExecutionId,
      selectedArtifactId,
      pinnedRecordId: pinnedRecord?.kind === "run" ? pinnedRecord.id : null,
      pinnedRecordStatusLabel: pinnedRecord?.kind === "run" ? pinnedRecordStatus?.label ?? null : null,
      pinnedRecordStatusDetail: pinnedRecord?.kind === "run" ? pinnedRecordStatus?.detail ?? null : null,
      laneQueueLabel: pinnedRecord?.kind === "run" ? nextPinnedLaneRecord?.label ?? null : null,
      laneQueueDetail: pinnedRecord?.kind === "run" ? nextPinnedLaneRecord?.detail ?? null : null,
      laneCompletionLabel: pinnedRecord?.kind === "run" ? pinnedLaneCompletionState?.label ?? null : null,
      laneCompletionDetail: pinnedRecord?.kind === "run" ? pinnedLaneCompletionState?.detail ?? null : null,
      laneRolloverLabel: pinnedRecord?.kind === "run" ? pinnedLaneRolloverRecord?.label ?? null : null,
      laneRolloverDetail: pinnedRecord?.kind === "run" ? pinnedLaneRolloverRecord?.detail ?? null : null,
      laneMetricsLabel: pinnedRecord?.kind === "run" ? pinnedLaneMetrics?.label ?? null : null,
      laneMetricsDetail: pinnedRecord?.kind === "run" ? pinnedLaneMetrics?.detail ?? null : null,
      laneDriverLabel: pinnedRecord?.kind === "run" ? pinnedLaneMetrics?.driverLabel ?? null : null,
      laneDriverDetail: pinnedRecord?.kind === "run" ? pinnedLaneMetrics?.driverDetail ?? null : null,
      laneMemoryLabel: pinnedRecord?.kind !== "run" ? laneMemory?.pinnedLabel ?? null : null,
      laneMemoryDetail: pinnedRecord?.kind !== "run" ? laneMemory?.detail ?? null : null,
      laneHistoryEntries: pinnedRecord?.kind !== "run" ? laneHistory : [],
      laneHandoffLabel: laneHandoffSummary?.label ?? null,
      laneHandoffDetail: laneHandoffSummary?.detail ?? null,
      laneExportLabel: laneExportStatus?.label ?? null,
      laneExportDetail: laneExportStatus?.detail ?? null,
      laneOperatorNoteLabel: activeLaneOperatorNote?.label ?? null,
      laneOperatorNoteDetail: activeLaneOperatorNote?.detail ?? null,
      activeLanePresetLabel: lanePresetStatus?.activeLabel ?? null,
      activeLanePresetDetail: lanePresetStatus?.activeDetail ?? null,
      lanePresetRestoredLabel: lanePresetStatus?.restoredLabel ?? null,
      lanePresetRestoredDetail: lanePresetStatus?.restoredDetail ?? null,
      lanePresetDriftLabel: lanePresetStatus?.driftLabel ?? null,
      lanePresetDriftDetail: lanePresetStatus?.driftDetail ?? null,
      onOpenExecution: openExecutionDetail,
      onOpenArtifact: openArtifactDetail,
      onOpenPriorityRecord: selectedRunPreferredExecution
        ? () => openExecutionDetail(selectedRunPreferredExecution.id)
        : null,
      onOpenWarningRecord: selectedRunWarningExecution
        ? () => openExecutionDetail(selectedRunWarningExecution.id)
        : null,
      onPinRecord: () => pinRunRecord(selectedRun),
      onUnpinRecord: pinnedRecord?.kind === "run" && selectedRun?.id === pinnedRecord.id
        ? () => setPinnedRecord(null)
        : null,
      onRefocusPinnedRecord: pinnedRecord?.kind === "run" ? openPinnedRecord : null,
      onOpenNextLaneRecord: pinnedRecord?.kind === "run" && nextPinnedLaneRecord ? openPinnedLaneQueueRecord : null,
      onOpenLaneRolloverRecord: pinnedRecord?.kind === "run" && pinnedLaneRolloverRecord ? openPinnedLaneRolloverRecord : null,
      onReturnToLane: pinnedRecord?.kind !== "run" && laneMemory ? restoreLaneMemory : null,
      onOpenLaneHistoryEntry: pinnedRecord?.kind !== "run" ? openLaneHistoryEntry : null,
      refreshHint: runDetailRefreshHint,
      lastRefreshedAt: runDetailRefreshedAt,
      onRefresh: () => {
        void refreshRunDetailSection();
      },
      refreshing: runDetailRefreshing || selectedRunLoading,
    },
  };
  const recordsEventsProps = {
    panelKey: `records-events-search-${eventsSearchVersion}`,
    sectionRef: eventsSectionRef,
    detailSectionRef: eventDetailSectionRef,
    contextStrip: {
      laneLabel: "Events",
      focusLabel: eventsFocusLabel,
      originLabel: describeOverviewFocusOrigin(eventsFocusLabel),
      autoOpenLabel: selectedEventId ? `detail selected: ${selectedEventId}` : null,
      impactLabel: selectedEvent?.event_type ?? null,
      impactDetail: selectedEvent?.message ?? null,
      promotedPresetLabel: null,
      promotedPresetDetail: null,
      historyEntries: [],
      onSelectHistoryEntry: undefined,
      onClearHistory: null,
      onPromoteCurrentContext: null,
      onApplyPromotedPreset: null,
      onClearPromotedPreset: null,
      onClearFocus: eventsFocusLabel ? clearEventsFocus : null,
    },
    auditSummaryPanel: {
      summary: eventSummary.app_control,
      onOpenLatest: eventSummary.app_control.latest_event_id
        ? () => openEventDetail(
          eventSummary.app_control.latest_event_id!,
        )
        : null,
      onOpenApplied: eventSummary.app_control.applied_events > 0
        ? focusAppliedAppControlEvents
        : null,
      onOpenReverted: eventSummary.app_control.reverted_events > 0
        ? focusRevertedAppControlEvents
        : null,
      onOpenVerifiedOnly: eventSummary.app_control.verified_only_events > 0
        ? focusVerifiedOnlyAppControlEvents
        : null,
      onOpenAssumedPresent: eventSummary.app_control.assumed_present_events > 0
        ? focusAssumedPresentAppControlEvents
        : null,
      onSaveAppliedView: eventSummary.app_control.applied_events > 0
        ? () => saveEventsTimelineView("Applied App OS receipts", "app_control_applied", "all")
        : null,
      onSaveRevertedView: eventSummary.app_control.reverted_events > 0
        ? () => saveEventsTimelineView("Reverted App OS receipts", "app_control_reverted", "all")
        : null,
      onSaveVerifiedOnlyView: eventSummary.app_control.verified_only_events > 0
        ? () => saveEventsTimelineView("Verified-only App OS receipts", "app_control", "verified_only")
        : null,
      onSaveAssumedPresentView: eventSummary.app_control.assumed_present_events > 0
        ? () => saveEventsTimelineView("App OS receipts with assumed results", "app_control", "assumed_present")
        : null,
      savedViewFeedback: eventsSavedViewFeedback
        ? {
          label: eventsSavedViewFeedback.label,
          detail: eventsSavedViewFeedback.detail,
          onOpenSavedView: () => openEventsTimelineSavedView(eventsSavedViewFeedback.view),
        }
        : null,
    },
    timelinePanel: {
      items: events,
      loading: eventsLoading,
      error: eventsError,
      presetActions: [
        {
          id: "app-os-receipts",
          label: "App OS receipts",
          title: "Filter the event lane to persisted App OS apply and revert receipts.",
          onSelect: focusAppControlEvents,
        },
        {
          id: "reviewable-local",
          label: "Reviewable local",
          title: "Filter the event lane to reviewable local capability receipts and timeline records.",
          onSelect: focusReviewableLocalEvents,
        },
      ],
      onOpenEvent: openEventDetail,
      onOpenRun: openRunDetail,
      onOpenExecution: openExecutionDetail,
      onOpenExecutor: openExecutorDetail,
      onOpenWorkspace: openWorkspaceDetail,
      eventTypePreset: eventsEventTypePreset,
      verificationPreset: eventsVerificationPreset,
      searchPreset: eventsSearchPreset,
      savedViewsStorageKey: EVENTS_TIMELINE_SAVED_VIEWS_SESSION_KEY,
      focusLabel: eventsFocusLabel,
      onClearFocus: clearEventsFocus,
      lastRefreshedAt: eventsRefreshedAt,
      updateBadgeLabel: getFocusedSectionUpdateLabel("events"),
      onRefresh: () => {
        void refreshEventsSection();
      },
      refreshing: eventsRefreshing,
    },
    eventDetailPanel: {
      item: selectedEventDetail,
      loading: selectedEventLoading,
      error: selectedEventError,
      lastRefreshedAt: eventDetailRefreshedAt,
      onRefresh: () => {
        void refreshEventDetailSection();
      },
      refreshing: eventDetailRefreshing,
    },
  };

  const renderRecordsWorkspace = () => (
    <Suspense
      fallback={renderWorkspaceLoadingFallback(
        "Records Explorer",
        "Loading run, execution, and artifact evidence lanes.",
      )}
    >
      <RecordsWorkspaceDesktop
        activeSurfaceId={activeRecordsSurface}
        items={recordsSurfaceItems}
        onSelectSurface={(surfaceId) => setActiveRecordsSurface(surfaceId)}
        artifacts={recordsArtifactsProps}
        events={recordsEventsProps}
        executions={recordsExecutionsProps}
        runs={recordsRunsProps}
      />
    </Suspense>
  );
  function renderWorkspaceLoadingFallback(title: string, detail: string) {
    return (
      <section aria-busy="true" aria-live="polite" style={desktopWorkspaceLoadingCardStyle}>
        <span style={desktopWorkspaceLoadingEyebrowStyle}>Loading workspace</span>
        <strong style={desktopWorkspaceLoadingTitleStyle}>{title}</strong>
        <p style={desktopWorkspaceLoadingDetailStyle}>{detail}</p>
      </section>
    );
  }

  function renderPromptEvidenceContextBanner(
    context: PromptEvidenceContext,
  ): JSX.Element {
    return (
      <section
        aria-label="Prompt focused evidence context"
        style={{
          marginBottom: 14,
          border: "1px solid rgba(96, 165, 250, 0.55)",
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(17, 35, 58, 0.96), rgba(16, 28, 41, 0.96))",
          boxShadow: "0 10px 24px rgba(8, 13, 19, 0.35)",
          padding: "12px 14px",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ display: "grid", gap: 3 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "rgba(167, 212, 255, 0.95)",
              fontWeight: 700,
            }}
          >
            Focused evidence context
          </span>
          <strong style={{ color: "var(--app-text-color)" }}>
            Prompt session: {context.promptSessionId}
          </strong>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
            color: "var(--app-subtle-color)",
            fontSize: 13,
          }}
        >
          <span>
            Source workspace: <strong>{workspaceMeta[context.sourceWorkspaceId].title}</strong>
          </span>
          <span>
            Source surface: <strong>{context.sourceSurfaceLabel}</strong>
          </span>
          <span>
            Opened (ISO): <strong>{context.openedAtIso}</strong>
          </span>
        </div>
        <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
          Safety: navigation only. No prompt preview, execute, or mutation is triggered automatically.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveWorkspaceId(context.sourceWorkspaceId)}
          >
            Return to source cockpit
          </button>
          <button type="button" onClick={() => openRecordsRuns()}>
            Open Records
          </button>
          <button type="button" onClick={() => setPromptEvidenceContext(null)}>
            Dismiss evidence context
          </button>
        </div>
      </section>
    );
  }

  function renderRecordsEvidenceContextBanner(
    context: RecordsEvidenceContext,
  ): JSX.Element {
    const targetLabel = context.targetKind === "run"
      ? "Run"
      : context.targetKind === "execution"
        ? "Execution"
        : "Artifact";

    return (
      <section
        aria-label="Records focused evidence context"
        style={{
          marginBottom: 14,
          border: "1px solid rgba(100, 215, 170, 0.52)",
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(21, 48, 40, 0.95), rgba(16, 30, 43, 0.95))",
          boxShadow: "0 10px 24px rgba(8, 14, 20, 0.35)",
          padding: "12px 14px",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ display: "grid", gap: 3 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "rgba(176, 239, 214, 0.95)",
              fontWeight: 700,
            }}
          >
            Focused evidence context
          </span>
          <strong style={{ color: "var(--app-text-color)" }}>
            {targetLabel} target: {context.targetId}
          </strong>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
            color: "var(--app-subtle-color)",
            fontSize: 13,
          }}
        >
          <span>
            Source workspace: <strong>{workspaceMeta[context.sourceWorkspaceId].title}</strong>
          </span>
          <span>
            Source surface: <strong>{context.sourceSurfaceLabel}</strong>
          </span>
          <span>
            Opened (ISO): <strong>{context.openedAtIso}</strong>
          </span>
          <span>
            Related prompt session: <strong>{context.relatedPromptSessionId ?? "not captured"}</strong>
          </span>
        </div>
        <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
          Safety: evidence drill-in only. No runtime execution, placement write, or mutation is admitted from this banner.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveWorkspaceId(context.sourceWorkspaceId)}
          >
            Return to source cockpit
          </button>
          <button
            type="button"
            onClick={() => {
              if (context.targetKind === "run") {
                openRecordsRuns({ preserveEvidenceContext: true });
                openRunDetail(context.targetId);
                return;
              }
              if (context.targetKind === "execution") {
                openRecordsExecutions({ preserveEvidenceContext: true });
                openExecutionDetail(context.targetId);
                return;
              }
              openRecordsArtifacts({ preserveEvidenceContext: true });
              openArtifactDetail(context.targetId);
            }}
          >
            Re-open focused evidence
          </button>
          {context.relatedPromptSessionId ? (
            <button
              type="button"
              onClick={() => openPromptSessionFromTruthRail(context.relatedPromptSessionId ?? "")}
            >
              Open related prompt session
            </button>
          ) : null}
          <button type="button" onClick={() => setRecordsEvidenceContext(null)}>
            Dismiss evidence context
          </button>
        </div>
      </section>
    );
  }

  function renderPromptTemplateChooserContextCard(
    context: PromptTemplateChooserContext,
  ): JSX.Element {
    return (
      <section
        aria-label="Prompt template chooser context"
        style={{
          marginBottom: 14,
          border: "1px solid rgba(250, 204, 21, 0.45)",
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(52, 40, 16, 0.95), rgba(18, 30, 42, 0.95))",
          boxShadow: "0 10px 24px rgba(10, 14, 20, 0.35)",
          padding: "12px 14px",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "grid", gap: 3 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "rgba(255, 232, 161, 0.95)",
              fontWeight: 700,
            }}
          >
            Cockpit template chooser
          </span>
          <strong style={{ color: "var(--app-text-color)" }}>{context.title}</strong>
          <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
            {context.subtitle}
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
            color: "var(--app-subtle-color)",
            fontSize: 13,
          }}
        >
          <span>
            Source workspace: <strong>{workspaceMeta[context.sourceWorkspaceId].title}</strong>
          </span>
          <span>
            Source surface: <strong>{context.sourceSurfaceLabel}</strong>
          </span>
          <span>
            Opened (ISO): <strong>{context.openedAtIso}</strong>
          </span>
        </div>
        <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
          Safety: selecting a template only prefills Prompt Studio fields. No preview, execute, placement, or mutation runs automatically.
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          {context.templates.map((template) => (
            <article
              key={template.id}
              style={{
                border: "1px solid rgba(248, 222, 145, 0.38)",
                borderRadius: 10,
                background: "rgba(17, 26, 36, 0.62)",
                padding: "10px 11px",
                display: "grid",
                gap: 7,
              }}
            >
              <div style={{ display: "grid", gap: 4 }}>
                <strong style={{ color: "var(--app-text-color)" }}>{template.label}</strong>
                <span style={{ color: "var(--app-subtle-color)", fontSize: 13 }}>{template.detail}</span>
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignSelf: "start",
                  border: "1px solid rgba(248, 222, 145, 0.55)",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontSize: 12,
                  color: "rgba(255, 232, 161, 0.95)",
                }}
              >
                {template.truthState}
              </span>
              <button
                type="button"
                onClick={() => openPromptStudioWithMissionDraft(
                  template.draft,
                  template.sourceSurfaceLabel,
                  context.sourceWorkspaceId,
                )}
              >
                {`Load template: ${template.label}`}
              </button>
            </article>
          ))}
        </div>
        <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
          Next safe action: <strong>{context.nextSafeAction}</strong>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" onClick={() => setActiveWorkspaceId(context.sourceWorkspaceId)}>
            Return to source cockpit
          </button>
          <button type="button" onClick={() => setPromptTemplateChooserContext(null)}>
            Dismiss template chooser
          </button>
        </div>
      </section>
    );
  }

  function formatPromptBooleanFlagValue(value: boolean | undefined): string {
    if (value === true) {
      return "true";
    }
    if (value === false) {
      return "false";
    }
    return "unknown";
  }

  function renderPromptPlacementProofOnlyReviewCard(
    review: PlacementProofOnlyReviewSnapshot,
  ): JSX.Element {
    const executionAdmittedValue = formatPromptBooleanFlagValue(review.executionAdmitted);
    const placementWriteAdmittedValue = formatPromptBooleanFlagValue(review.placementWriteAdmitted);
    const mutationOccurredValue = formatPromptBooleanFlagValue(review.mutationOccurred);
    const failClosedReasons = review.failClosedReasons.length > 0
      ? review.failClosedReasons.join(", ")
      : "not reported";
    const guidance = review.serverRemediation
      ?? "Prepare a server-owned approval session for this exact bounded request, then rerun this same proof-only prompt.";

    return (
      <section
        aria-label="Prompt placement proof-only review context"
        style={{
          border: "1px solid rgba(252, 165, 165, 0.5)",
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(60, 26, 28, 0.96), rgba(24, 32, 45, 0.95))",
          boxShadow: "0 10px 24px rgba(10, 13, 19, 0.36)",
          padding: "12px 14px",
          display: "grid",
          gap: 9,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "rgba(254, 202, 202, 0.95)",
              fontWeight: 700,
            }}
          >
            Placement proof-only review snapshot
          </span>
          <strong style={{ color: "var(--app-text-color)" }}>
            Capability: {review.capabilityName}
          </strong>
          <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
            Candidate: <strong>{review.candidateId ?? "not reported"}</strong>
            {" / "}
            <strong>{review.candidateLabel ?? "not reported"}</strong>
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
            color: "var(--app-subtle-color)",
            fontSize: 13,
          }}
        >
          <span>
            Prompt session: <strong>{review.promptSessionId}</strong>
          </span>
          <span>
            Staged source: <strong>{review.stagedSourceRelativePath ?? "not reported"}</strong>
          </span>
          <span>
            Target level: <strong>{review.targetLevelRelativePath ?? "not reported"}</strong>
          </span>
          <span>
            Target entity/component:{" "}
            <strong>{`${review.targetEntityName ?? "not reported"} / ${review.targetComponent ?? "not reported"}`}</strong>
          </span>
          <span>
            Stage-write evidence ref: <strong>{review.stageWriteEvidenceReference ?? "not reported"}</strong>
          </span>
          <span>
            Stage-write readback ref: <strong>{review.stageWriteReadbackReference ?? "not reported"}</strong>
          </span>
          <span>
            Stage-write readback status: <strong>{review.stageWriteReadbackStatus ?? "not reported"}</strong>
          </span>
          <span>
            Inspection surface: <strong>{review.inspectionSurface ?? "not reported"}</strong>
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span
            style={{
              border: "1px solid rgba(252, 165, 165, 0.6)",
              borderRadius: 999,
              padding: "2px 9px",
              fontSize: 12,
              color: "rgba(254, 202, 202, 0.95)",
            }}
          >
            {`execution_admitted=${executionAdmittedValue}`}
          </span>
          <span
            style={{
              border: "1px solid rgba(252, 165, 165, 0.6)",
              borderRadius: 999,
              padding: "2px 9px",
              fontSize: 12,
              color: "rgba(254, 202, 202, 0.95)",
            }}
          >
            {`placement_write_admitted=${placementWriteAdmittedValue}`}
          </span>
          <span
            style={{
              border: "1px solid rgba(252, 165, 165, 0.6)",
              borderRadius: 999,
              padding: "2px 9px",
              fontSize: 12,
              color: "rgba(254, 202, 202, 0.95)",
            }}
          >
            {`mutation_occurred=${mutationOccurredValue}`}
          </span>
          <span
            style={{
              border: "1px solid rgba(252, 165, 165, 0.6)",
              borderRadius: 999,
              padding: "2px 9px",
              fontSize: 12,
              color: "rgba(254, 202, 202, 0.95)",
            }}
          >
            {`read_only=${formatPromptBooleanFlagValue(review.readOnly)}`}
          </span>
        </div>
        <div style={{ color: "var(--app-subtle-color)", fontSize: 13, display: "grid", gap: 4 }}>
          <span>
            Fail-closed reasons: <strong>{failClosedReasons}</strong>
          </span>
          <span>
            Server decision:{" "}
            <strong>{`${review.serverDecisionCode ?? "not reported"} / ${review.serverDecisionState ?? "not reported"}`}</strong>
          </span>
          {review.serverReason ? (
            <span>
              Server reason: <strong>{review.serverReason}</strong>
            </span>
          ) : null}
        </div>
        <p style={{ margin: 0, color: "var(--app-text-color)", fontSize: 13 }}>
          Placement proof-only remains fail-closed and non-mutating: placement execution is non-admitted,
          placement write is non-admitted, and no mutation occurred. Real placement requires a separate
          exact admission corridor with readback and revert/restore proof.
        </p>
        <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
          Server blocker remediation: <strong>{guidance}</strong>
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {review.promptSessionId ? (
            <button
              type="button"
              onClick={() => openPromptSessionFromTruthRail(review.promptSessionId)}
            >
              Open proof prompt session
            </button>
          ) : null}
          {review.childRunId ? (
            <button type="button" onClick={() => { void openRunEvidenceById(review.childRunId ?? ""); }}>
              Open proof run
            </button>
          ) : null}
          {review.childExecutionId ? (
            <button type="button" onClick={() => { void openExecutionEvidenceById(review.childExecutionId ?? ""); }}>
              Open proof execution
            </button>
          ) : null}
          {review.childArtifactId ? (
            <button type="button" onClick={() => { void openArtifactEvidenceById(review.childArtifactId ?? ""); }}>
              Open proof artifact
            </button>
          ) : null}
          <button type="button" onClick={openOperationsApprovals}>
            Open Operations approvals
          </button>
          <button type="button" onClick={() => openRecordsRuns()}>
            Open Records
          </button>
        </div>
      </section>
    );
  }

  function renderPromptTemplateLaneSwitcherCard(): JSX.Element {
    const templateLaneEntries: Array<{
      workspaceId: "home" | "create-game" | "create-movie" | "load-project" | "asset-forge";
      label: string;
      detail: string;
      truthState: string;
    }> = [
      {
        workspaceId: "home",
        label: "Home",
        detail: "Inspect, safe entity, allowlisted component, and placement proof-only templates.",
        truthState: "mission-first prefill-only",
      },
      {
        workspaceId: "create-game",
        label: "Create Game",
        detail: "Game-authoring templates for narrow admitted entity/component lanes.",
        truthState: "admitted-real narrow + prefill-only",
      },
      {
        workspaceId: "create-movie",
        label: "Create Movie",
        detail: "Cinematic planning and proof-only placement candidate templates.",
        truthState: "plan/proof-only + prefill-only",
      },
      {
        workspaceId: "load-project",
        label: "Load Project",
        detail: "Read-only project/target readiness templates.",
        truthState: "read-only + prefill-only",
      },
      {
        workspaceId: "asset-forge",
        label: "Asset Forge",
        detail: "Asset Forge review and placement proof-only candidate templates.",
        truthState: "proof-only/fail-closed + prefill-only",
      },
    ];

    return (
      <section
        aria-label="Prompt template lane switcher"
        style={{
          border: "1px solid rgba(148, 163, 184, 0.35)",
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(16, 30, 45, 0.93), rgba(14, 25, 37, 0.93))",
          boxShadow: "0 10px 22px rgba(6, 12, 20, 0.28)",
          padding: "11px 12px",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ display: "grid", gap: 3 }}>
          <strong style={{ color: "var(--app-text-color)" }}>
            Prompt template lane switcher
          </strong>
          <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
            Stay in Prompt Studio and switch to another cockpit template lane without auto-running any prompt.
          </p>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {templateLaneEntries.map((lane) => (
            <article
              key={lane.workspaceId}
              style={{
                border: "1px solid rgba(147, 197, 253, 0.24)",
                borderRadius: 10,
                padding: "8px 9px",
                background: "rgba(10, 18, 29, 0.62)",
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <strong style={{ color: "var(--app-text-color)" }}>{lane.label}</strong>
                <span
                  style={{
                    border: "1px solid rgba(147, 197, 253, 0.5)",
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontSize: 12,
                    color: "rgba(191, 219, 254, 0.95)",
                  }}
                >
                  {lane.truthState}
                </span>
              </div>
              <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
                {lane.detail}
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => openPromptTemplateChooserLane(lane.workspaceId)}
                >
                  {`Open template lane: ${lane.label}`}
                </button>
              </div>
            </article>
          ))}
        </div>
        <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
          Safety: lane switching is prefill-only; no preview, execute, placement command, or mutation is triggered.
        </p>
      </section>
    );
  }

  function renderPromptIntakeContextPanel(): JSX.Element | null {
    if (
      !promptLaunchDraftRequest
      && !activePromptEvidenceContext
      && !activePromptTemplateChooserContext
      && !latestPlacementProofOnlyReview
    ) {
      return null;
    }

    const contextCount = [
      promptLaunchDraftRequest,
      activePromptEvidenceContext,
      activePromptTemplateChooserContext,
      latestPlacementProofOnlyReview,
    ].filter((entry) => Boolean(entry)).length;

    const nextSafeAction = latestPlacementProofOnlyReview?.serverRemediation
      ?? activePromptTemplateChooserContext?.nextSafeAction
      ?? promptLaunchDraftRequest?.draft?.guidance
      ?? "Preview the loaded prompt plan and stay inside admitted or proof-only corridors.";

    return (
      <section
        aria-label="Prompt intake context panel"
        style={{
          marginBottom: 14,
          border: "1px solid rgba(148, 163, 184, 0.42)",
          borderRadius: 14,
          background:
            "linear-gradient(135deg, rgba(20, 31, 44, 0.96), rgba(17, 28, 41, 0.95))",
          boxShadow: "0 12px 28px rgba(7, 12, 20, 0.36)",
          padding: "12px 14px",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "rgba(189, 220, 255, 0.95)",
              fontWeight: 700,
            }}
          >
            Prompt intake context
          </span>
          <strong style={{ color: "var(--app-text-color)" }}>
            Mission-first prompt context lanes: {contextCount}
          </strong>
          <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
            Safety: prefill-only and review-only context. No prompt auto-execution, no runtime placement
            command admission, and no mutation is triggered from this panel.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span
            style={{
              border: "1px solid rgba(147, 197, 253, 0.65)",
              borderRadius: 999,
              padding: "2px 9px",
              fontSize: 12,
              color: "rgba(191, 219, 254, 0.96)",
            }}
          >
            prefill-only
          </span>
          <span
            style={{
              border: "1px solid rgba(147, 197, 253, 0.65)",
              borderRadius: 999,
              padding: "2px 9px",
              fontSize: 12,
              color: "rgba(191, 219, 254, 0.96)",
            }}
          >
            fail-closed truth preserved
          </span>
          {latestPlacementProofOnlyReview ? (
            <>
              <span
                style={{
                  border: "1px solid rgba(252, 165, 165, 0.65)",
                  borderRadius: 999,
                  padding: "2px 9px",
                  fontSize: 12,
                  color: "rgba(254, 202, 202, 0.96)",
                }}
              >
                {`execution_admitted=${formatPromptBooleanFlagValue(latestPlacementProofOnlyReview.executionAdmitted)}`}
              </span>
              <span
                style={{
                  border: "1px solid rgba(252, 165, 165, 0.65)",
                  borderRadius: 999,
                  padding: "2px 9px",
                  fontSize: 12,
                  color: "rgba(254, 202, 202, 0.96)",
                }}
              >
                {`placement_write_admitted=${formatPromptBooleanFlagValue(latestPlacementProofOnlyReview.placementWriteAdmitted)}`}
              </span>
            </>
          ) : null}
        </div>
        <p style={{ margin: 0, color: "var(--app-text-color)", fontSize: 13 }}>
          Next safe action: <strong>{nextSafeAction}</strong>
        </p>
        {renderPromptTemplateLaneSwitcherCard()}
        {promptLaunchDraftRequest ? renderPromptHandoffContextCard(promptLaunchDraftRequest) : null}
        {activePromptEvidenceContext ? renderPromptEvidenceContextBanner(activePromptEvidenceContext) : null}
        {activePromptTemplateChooserContext ? (
          renderPromptTemplateChooserContextCard(activePromptTemplateChooserContext)
        ) : null}
        {latestPlacementProofOnlyReview ? (
          renderPromptPlacementProofOnlyReviewCard(latestPlacementProofOnlyReview)
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" onClick={openRuntimeOverview}>
            Open Runtime overview
          </button>
          <button type="button" onClick={() => openRecordsRuns()}>
            Open Records
          </button>
          <button
            type="button"
            onClick={() => {
              setPromptLaunchDraftRequest(null);
              setPromptEvidenceContext(null);
              setPromptTemplateChooserContext(null);
            }}
          >
            Clear prompt intake context
          </button>
        </div>
      </section>
    );
  }

  function renderPromptReturnResumeChecklist(
    checklist: PromptReturnResumeChecklist,
  ): JSX.Element {
    return (
      <section
        aria-label="Mission handoff resume checklist"
        style={{
          marginBottom: 14,
          border: "1px solid rgba(97, 173, 255, 0.55)",
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(30, 40, 57, 0.95), rgba(16, 27, 41, 0.95))",
          boxShadow: "0 10px 26px rgba(7, 12, 20, 0.35)",
          padding: "12px 14px",
          display: "grid",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <span
              style={{
                fontSize: 12,
                letterSpacing: 0.3,
                textTransform: "uppercase",
                color: "rgba(162, 201, 255, 0.95)",
                fontWeight: 700,
              }}
            >
              Mission handoff resume checklist
            </span>
            <strong style={{ color: "var(--app-text-color)" }}>
              Loaded draft: {checklist.draftLabel}
            </strong>
          </div>
          <button
            type="button"
            onClick={() => setPromptReturnResumeChecklist(null)}
            style={{
              minHeight: 30,
              border: "1px solid rgba(140, 170, 205, 0.55)",
              borderRadius: 8,
              padding: "0 10px",
              background: "rgba(20, 30, 44, 0.9)",
              color: "var(--app-text-color)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Dismiss
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 8,
            color: "var(--app-subtle-color)",
            fontSize: 13,
          }}
        >
          <span>
            Source handoff: <strong>{checklist.sourceSurfaceLabel}</strong>
          </span>
          <span>
            Launched (ISO): <strong>{checklist.launchedAtIso ?? "unknown"}</strong>
          </span>
          <span>
            Returned (ISO): <strong>{checklist.returnedAtIso}</strong>
          </span>
          <span>
            Workspace: <strong>{workspaceMeta[checklist.sourceWorkspaceId].title}</strong>
          </span>
        </div>
        <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
          Truth state: <strong>prefill-only</strong>, <strong>fail-closed where blocked</strong>, and{" "}
          <strong>non-mutating</strong>. Returning from Prompt Studio does not execute prompts.
        </p>
        <p style={{ margin: 0, color: "var(--app-text-color)", fontSize: 13 }}>
          Next safe action: <strong>{checklist.nextSafeAction}</strong>
        </p>
      </section>
    );
  }

  function getPromptHandoffSourceQuickAction(
    draftRequest: PromptLaunchDraftRequest,
  ): { label: string; detail: string; run: () => void } | null {
    const sourceWorkspaceId = draftRequest.sourceWorkspaceId ?? null;
    if (!sourceWorkspaceId) {
      return null;
    }
    const draftId = draftRequest.draft.id;
    const sourceSurfaceLabel = draftRequest.sourceSurfaceLabel?.trim() || "unknown source surface";

    function createStageFocusAction(
      workspaceId: DesktopWorkspaceId,
      stageLabel: string,
      stageDetail: string,
      actionLabel: string,
      actionDetail: string,
    ): { label: string; detail: string; run: () => void } {
      return {
        label: actionLabel,
        detail: actionDetail,
        run: () => {
          setCockpitStageFocusHighlight({
            id: crypto.randomUUID(),
            workspaceId,
            stageLabel,
            stageDetail,
            sourceDraftLabel: draftRequest.draft.label,
            sourceSurfaceLabel,
            setAtIso: new Date().toISOString(),
          });
          setActiveWorkspaceId(workspaceId);
        },
      };
    }

    if (sourceWorkspaceId === "create-game" && draftId === "create-game-safe-entity") {
      return createStageFocusAction(
        "create-game",
        "Gameplay Entities",
        "Continue safe root-level entity authoring context only.",
        "Open Create Game cockpit (Gameplay Entities stage)",
        "Returns to Create Game so you can continue the Gameplay Entities stage context safely.",
      );
    }
    if (sourceWorkspaceId === "create-game" && draftId === "add-allowlisted-mesh-component") {
      return createStageFocusAction(
        "create-game",
        "Components",
        "Continue allowlisted component context only; arbitrary property writes remain blocked.",
        "Open Create Game cockpit (Components stage)",
        "Returns to Create Game so you can continue the allowlisted Components stage context safely.",
      );
    }
    if (sourceWorkspaceId === "create-movie" && draftId === "create-cinematic-camera-placeholder") {
      return createStageFocusAction(
        "create-movie",
        "Camera",
        "Continue cinematic camera placeholder planning without broad scene mutation.",
        "Open Create Movie cockpit (Camera stage)",
        "Returns to Create Movie so you can continue camera placeholder planning without broad scene mutation.",
      );
    }
    if (sourceWorkspaceId === "create-movie" && draftId === "cinematic-placement-proof-only-candidate") {
      return createStageFocusAction(
        "create-movie",
        "Characters / Props",
        "Continue proof-only cinematic prop review. Placement execution/write remain non-admitted.",
        "Open Create Movie cockpit (Characters / Props stage)",
        "Returns to Create Movie so you can continue proof-only cinematic prop review with blocked-placement truth.",
      );
    }
    if (sourceWorkspaceId === "load-project" && draftId === "inspect-load-project-target") {
      return createStageFocusAction(
        "load-project",
        "Project connection checklist",
        "Continue read-only target verification before any authoring action.",
        "Open Load Project cockpit (Target checklist stage)",
        "Returns to Load Project so you can continue read-only target verification before authoring.",
      );
    }
    if (sourceWorkspaceId === "asset-forge" && draftId === "placement-proof-only-candidate") {
      return createStageFocusAction(
        "asset-forge",
        "Placement Proof",
        "Continue proof-only placement review and evidence checks only.",
        "Open Asset Forge cockpit (Placement Proof stage)",
        "Returns to Asset Forge so you can continue placement proof-only review and evidence checks.",
      );
    }
    if (sourceWorkspaceId === "home" && draftId === "inspect-project-read-only") {
      return createStageFocusAction(
        "home",
        "Inspect mission",
        "Continue read-only mission orientation and choose the next safe step.",
        "Open Home cockpit (Inspect mission stage)",
        "Returns to Home so you can continue read-only mission orientation and choose the next safe step.",
      );
    }

    return createStageFocusAction(
      sourceWorkspaceId,
      "Source cockpit context",
      "Continue the source cockpit context only. No prompt execution is triggered.",
      `Open ${workspaceMeta[sourceWorkspaceId].title} cockpit`,
      "Returns to the source cockpit context only. No prompt execution is triggered.",
    );
  }

  function renderCockpitStageFocusHighlight(
    highlight: CockpitStageFocusHighlight,
  ): JSX.Element {
    return (
      <section
        aria-label="Cockpit stage focus"
        style={{
          marginBottom: 14,
          border: "1px solid rgba(255, 203, 118, 0.62)",
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(51, 39, 20, 0.96), rgba(20, 31, 45, 0.96))",
          boxShadow: "0 10px 24px rgba(8, 12, 18, 0.35)",
          padding: "12px 14px",
          display: "grid",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "grid", gap: 3 }}>
            <span
              style={{
                fontSize: 12,
                letterSpacing: 0.3,
                textTransform: "uppercase",
                color: "rgba(255, 221, 160, 0.95)",
                fontWeight: 700,
              }}
            >
              Cockpit stage focus
            </span>
            <strong style={{ color: "var(--app-text-color)" }}>
              Focused stage: {highlight.stageLabel}
            </strong>
          </div>
          <button type="button" onClick={() => setCockpitStageFocusHighlight(null)}>
            Dismiss focus
          </button>
        </div>
        <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
          {highlight.stageDetail}
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
            color: "var(--app-subtle-color)",
            fontSize: 13,
          }}
        >
          <span>
            Source draft: <strong>{highlight.sourceDraftLabel}</strong>
          </span>
          <span>
            Source handoff: <strong>{highlight.sourceSurfaceLabel}</strong>
          </span>
          <span>
            Focus set (ISO): <strong>{highlight.setAtIso}</strong>
          </span>
        </div>
        <p style={{ margin: 0, color: "var(--app-text-color)", fontSize: 13 }}>
          Safety: UI focus only. No prompt execution, no runtime command, and no mutation occurs from this highlight.
        </p>
      </section>
    );
  }

  function renderPromptHandoffContextCard(
    draftRequest: PromptLaunchDraftRequest,
  ): JSX.Element {
    const sourceWorkspaceId = draftRequest.sourceWorkspaceId ?? null;
    const sourceWorkspaceLabel = sourceWorkspaceId
      ? workspaceMeta[sourceWorkspaceId].title
      : "Unknown source workspace";
    const launchedAtIso = draftRequest.launchedAtIso?.trim() || "unknown";
    const sourceSurfaceLabel = draftRequest.sourceSurfaceLabel?.trim() || "unknown source surface";
    const truthLabels = draftRequest.draft.truthLabels.length > 0
      ? draftRequest.draft.truthLabels.join(", ")
      : "unknown";
    const sourceQuickAction = getPromptHandoffSourceQuickAction(draftRequest);

    return (
      <section
        aria-label="Prompt handoff context card"
        style={{
          marginBottom: 14,
          border: "1px solid rgba(84, 177, 122, 0.55)",
          borderRadius: 12,
          background:
            "linear-gradient(135deg, rgba(22, 47, 35, 0.95), rgba(18, 32, 44, 0.95))",
          boxShadow: "0 10px 26px rgba(6, 15, 23, 0.32)",
          padding: "12px 14px",
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              color: "rgba(159, 226, 191, 0.95)",
              fontWeight: 700,
            }}
          >
            Prompt handoff context
          </span>
          <strong style={{ color: "var(--app-text-color)" }}>
            Loaded mission draft: {draftRequest.draft.label}
          </strong>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
            color: "var(--app-subtle-color)",
            fontSize: 13,
          }}
        >
          <span>
            Source workspace: <strong>{sourceWorkspaceLabel}</strong>
          </span>
          <span>
            Source handoff: <strong>{sourceSurfaceLabel}</strong>
          </span>
          <span>
            Truth labels: <strong>{truthLabels}</strong>
          </span>
          <span>
            Prefill launched (ISO): <strong>{launchedAtIso}</strong>
          </span>
        </div>
        <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
          Safety: this handoff only prefills Prompt Studio. No preview or execution is automatic, and blocked corridors remain blocked.
        </p>
        <p style={{ margin: 0, color: "var(--app-text-color)", fontSize: 13 }}>
          Guidance: {draftRequest.draft.guidance}
        </p>
        {sourceQuickAction ? (
          <div
            style={{
              border: "1px solid rgba(131, 197, 162, 0.45)",
              borderRadius: 10,
              padding: "10px 12px",
              background: "rgba(12, 26, 34, 0.72)",
              display: "grid",
              gap: 6,
            }}
          >
            <strong style={{ color: "var(--app-text-color)", fontSize: 13 }}>
              Source-aware next action
            </strong>
            <p style={{ margin: 0, color: "var(--app-subtle-color)", fontSize: 13 }}>
              {sourceQuickAction.detail}
            </p>
            <div>
              <button type="button" onClick={sourceQuickAction.run}>
                {sourceQuickAction.label}
              </button>
            </div>
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (sourceWorkspaceId) {
                returnToSourceWorkspaceFromPrompt(sourceWorkspaceId);
              }
            }}
            disabled={!sourceWorkspaceId}
          >
            Return to source cockpit
          </button>
          <button type="button" onClick={() => openRecordsRuns()}>
            Open Records
          </button>
          <button type="button" onClick={openRuntimeOverview}>
            Open Runtime Overview
          </button>
          <button type="button" onClick={() => setPromptLaunchDraftRequest(null)}>
            Clear handoff context
          </button>
        </div>
      </section>
    );
  }

  const renderOperationsWorkspace = () => (
    <Suspense
      fallback={renderWorkspaceLoadingFallback(
        "Command Center",
        "Loading catalog, approvals, and timeline control surfaces.",
      )}
    >
      <OperationsWorkspaceDesktop
        activeSurfaceId={activeOperationsSurface}
        items={operationsSurfaceItems}
        onSelectSurface={(surfaceId) => setActiveOperationsSurface(surfaceId)}
        dispatch={{
          catalogError,
          catalogAgents,
          adapters,
          readiness,
          onResponse: handleDispatchResponse,
          lastResponse,
        }}
        agents={{
          items: agentsForDisplay,
        }}
        approvals={{
          panelKey: `approvals-search-${approvalsSearchVersion}`,
          items: approvals,
          loading: approvalsLoading,
          error: approvalsError,
          busyApprovalId,
          onApprove: (approvalId) => handleApprovalDecision(approvalId, "approve"),
          onReject: (approvalId) => handleApprovalDecision(approvalId, "reject"),
          searchPreset: approvalsSearchPreset,
          focusLabel: approvalsFocusLabel,
          onClearFocus: clearApprovalsFocus,
          lastRefreshedAt: approvalsRefreshedAt,
          updateBadgeLabel: getFocusedSectionUpdateLabel("approvals"),
          onRefresh: () => {
            void refreshApprovalsSection();
          },
          refreshing: approvalsRefreshing,
        }}
          timeline={{
            panelKey: `events-search-${eventsSearchVersion}`,
            items: events,
            loading: eventsLoading,
            error: eventsError,
            presetActions: [
              {
                id: "app-os-receipts",
                label: "App OS receipts",
                title: "Filter the timeline to persisted App OS apply and revert receipts.",
                onSelect: focusAppControlEvents,
              },
              {
                id: "reviewable-local",
                label: "Reviewable local",
                title: "Filter the timeline to reviewable local capability receipts and timeline records.",
                onSelect: focusReviewableLocalEvents,
              },
            ],
            onOpenEvent: openEventDetail,
            onOpenRun: openRunDetail,
            onOpenExecution: openExecutionDetail,
            onOpenExecutor: openExecutorDetail,
            onOpenWorkspace: openWorkspaceDetail,
            eventTypePreset: eventsEventTypePreset,
            verificationPreset: eventsVerificationPreset,
            searchPreset: eventsSearchPreset,
            savedViewsStorageKey: EVENTS_TIMELINE_SAVED_VIEWS_SESSION_KEY,
            focusLabel: eventsFocusLabel,
            onClearFocus: clearEventsFocus,
            lastRefreshedAt: eventsRefreshedAt,
            updateBadgeLabel: getFocusedSectionUpdateLabel("events"),
            onRefresh: () => {
              void refreshEventsSection();
            },
            refreshing: eventsRefreshing,
          }}
        approvalsSectionRef={approvalsSectionRef}
        timelineSectionRef={eventsSectionRef}
      />
    </Suspense>
  );

  if (activeWorkspaceId === "asset-forge") {
    const assetForgeWorkspacePageHeight = assetForgeHeaderHeight > 0
      ? `calc(100vh - ${assetForgeHeaderHeight}px)`
      : "calc(100vh - 88px)";

    return (
      <section
        aria-label="Asset Forge full workspace"
        style={{
          height: "100vh",
          minHeight: "100vh",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          background: "var(--app-shell-bg)",
          color: "var(--app-text-color)",
          fontFamily: '"Segoe UI Variable", "Segoe UI", "Trebuchet MS", sans-serif',
          overflow: "hidden",
        }}
      >
        <header
          aria-label="AppHeader"
          ref={assetForgeHeaderRef}
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--app-panel-border)",
            background: "var(--app-panel-bg)",
            boxShadow: "var(--app-shadow-soft)",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div>
              <strong style={{ fontSize: 20, color: "var(--app-text-color)" }}>
                {operatorGuideShellApp.title}
              </strong>
              <p style={{ margin: "6px 0 0 0", color: "var(--app-subtle-color)" }}>
                {operatorGuideShellApp.subtitle}
              </p>
            </div>
            <button
              type="button"
              aria-label="Back to Home"
              onClick={() => setActiveWorkspaceId("home")}
              style={{
                minHeight: 32,
                border: "1px solid #61adff",
                borderRadius: 8,
                padding: "0 12px",
                background: "var(--app-panel-elevated)",
                color: "var(--app-text-color)",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 0 0 1px rgba(97, 173, 255, 0.45), 0 0 14px rgba(44, 138, 255, 0.35)",
              }}
            >
              Back to Home
            </button>
          </div>
        </header>
        <main
          aria-label="AssetForgeWorkspacePage"
          style={{
            minHeight: 0,
            height: assetForgeWorkspacePageHeight,
            overflow: "hidden",
            padding: 0,
            boxSizing: "border-box",
          }}
        >
          <div style={{ height: "100%", minHeight: 0 }}>
            {activePromptReturnResumeChecklist ? (
              renderPromptReturnResumeChecklist(activePromptReturnResumeChecklist)
            ) : null}
            {activeCockpitStageFocusHighlight ? (
              renderCockpitStageFocusHighlight(activeCockpitStageFocusHighlight)
            ) : null}
            <Suspense
              fallback={renderWorkspaceLoadingFallback(
                "Asset Forge",
                "Loading the O3DE-native asset studio workspace.",
              )}
            >
              <AIAssetForgePanel
                onOpenHome={() => setActiveWorkspaceId("home")}
                onOpenCreateGame={() => setActiveWorkspaceId("create-game")}
                onOpenCreateMovie={() => setActiveWorkspaceId("create-movie")}
                onOpenLoadProject={() => setActiveWorkspaceId("load-project")}
                onOpenPromptStudio={openPromptStudioFromAssetForgeCockpit}
                onLaunchInspectTemplate={openPromptStudioWithInspectProjectTemplateFromAssetForge}
                onLaunchPlacementProofTemplate={openPromptStudioWithPlacementProofTemplateFromAssetForge}
                onLaunchPromptTemplate={openPromptStudioWithAssetForgeEditorTemplate}
                onOpenRuntimeOverview={openRuntimeOverview}
                onOpenBuilder={() => setActiveWorkspaceId("builder")}
                onOpenOperations={() => setActiveWorkspaceId("operations")}
                onOpenRecords={openRecordsRuns}
                onViewLatestRun={openLatestRunEvidence}
                onViewExecution={openLatestExecutionEvidence}
                onViewArtifact={openLatestArtifactEvidence}
                onViewEvidence={openRecordsEvents}
                onOpenPromptSessionDetail={openPromptSessionFromTruthRail}
                onOpenRunDetail={openRunEvidenceById}
                onOpenExecutionDetail={openExecutionEvidenceById}
                onOpenArtifactDetail={openArtifactEvidenceById}
                bridgeStatus={o3deBridgeStatus}
                policies={policies}
                policiesLoading={policiesLoading}
                policiesError={policiesError}
                readiness={readiness}
                readinessLoading={readinessLoading}
                readinessError={readinessError}
                adapters={adapters}
                adaptersLoading={adaptersLoading}
                adaptersError={adaptersError}
                latestRunId={latestRunId}
                latestExecutionId={latestExecutionId}
                latestArtifactId={latestArtifactId}
                latestPlacementProofOnlyReview={latestPlacementProofOnlyReview}
              />
            </Suspense>
          </div>
        </main>
      </section>
    );
  }

  return (
    <>
      <DesktopShell
        appTitle={operatorGuideShellApp.title}
        appSubtitle={operatorGuideShellApp.subtitle}
        workspaceTitle={activeWorkspaceMeta.title}
        workspaceSubtitle={activeWorkspaceMeta.subtitle}
        activeWorkspaceId={activeWorkspaceId}
        activeNavItemId={activeDesktopNavItemId}
        navSections={desktopNavSections}
        quickStats={settings.layout.showDesktopTelemetry ? desktopQuickStats : []}
        agentCallItems={agentsForDisplay.slice(0, 5).map((agent) => ({
          id: agent.id,
          label: agent.name,
          detail: `${agent.role} agent with ${agent.owned_tools.length} tool lanes available.`,
          status: agent.locks.length > 0 ? `locks: ${agent.locks.join(", ")}` : "ready",
        }))}
        utilityLabel={dashboardRefreshStatus ?? "desktop shell live"}
        utilityDetail={dashboardRefreshDetail}
        utilityActions={(
          <>
            <AppControlCommandCenter
              activeWorkspaceId={activeWorkspaceId}
              onSelectWorkspace={selectDesktopNavigation}
            />
            <SettingsPanel compactLauncher />
          </>
        )}
        onSelectWorkspace={selectDesktopNavigation}
      >
        {workspaceNextStepEntries.length > 0 ? (
          <WorkspaceNextStepsPanel
            entries={workspaceNextStepEntries}
            recentActions={workspaceNextStepRecentActions}
            collapsed={workspaceNextStepsCollapsed}
            onClearRecentActions={clearWorkspaceNextStepRecentActions}
            onCollapse={collapseWorkspaceNextSteps}
            onExpand={expandWorkspaceNextSteps}
            onReplayRecentAction={replayWorkspaceNextStepAction}
          />
        ) : null}
        {activePromptReturnResumeChecklist ? (
          renderPromptReturnResumeChecklist(activePromptReturnResumeChecklist)
        ) : null}
        {activeCockpitStageFocusHighlight ? (
          renderCockpitStageFocusHighlight(activeCockpitStageFocusHighlight)
        ) : null}
        {activeWorkspaceId === "prompt" ? renderPromptIntakeContextPanel() : null}
        {activeRecordsEvidenceContext ? (
          renderRecordsEvidenceContextBanner(activeRecordsEvidenceContext)
        ) : null}

        {activeWorkspaceId === "home" ? (
          <div
            aria-hidden={false}
            style={activeWorkspacePaneStyle}
          >
            <HomeWorkspaceView
              missionControlContent={homeMissionControlContent}
              launchpadContent={homeLaunchpadContent}
              overviewContent={homeOverviewContent}
              guideContent={homeGuideContent}
              cockpitRegistry={cockpitRegistrations}
              onOpenPromptStudio={openPromptStudioFromHomeCockpit}
              onOpenRuntimeOverview={openRuntimeOverview}
              onOpenAssetForge={() => setActiveWorkspaceId("asset-forge")}
              onOpenRecords={openRecordsRuns}
              onOpenCreateGame={() => setActiveWorkspaceId("create-game")}
              onOpenCreateMovie={() => setActiveWorkspaceId("create-movie")}
              onOpenLoadProject={() => setActiveWorkspaceId("load-project")}
              onLaunchInspectTemplate={openPromptStudioWithInspectProjectTemplateFromHome}
              onLaunchCreateEntityTemplate={openPromptStudioWithCreateGameEntityTemplate}
              onLaunchAddMeshTemplate={openPromptStudioWithAddAllowlistedMeshTemplate}
              onLaunchPlacementProofTemplate={openPromptStudioWithPlacementProofTemplateFromHome}
              onViewLatestRun={openLatestRunEvidence}
              onViewExecution={openLatestExecutionEvidence}
              onViewArtifact={openLatestArtifactEvidence}
              onViewEvidence={openRecordsEvents}
              onOpenPromptSessionDetail={openPromptSessionFromTruthRail}
              onOpenRunDetail={openRunEvidenceById}
              onOpenExecutionDetail={openExecutionEvidenceById}
              onOpenArtifactDetail={openArtifactEvidenceById}
              bridgeStatus={o3deBridgeStatus}
              adapters={adapters}
              readiness={readiness}
              latestRunId={latestRunId}
              latestExecutionId={latestExecutionId}
              latestArtifactId={latestArtifactId}
              latestPlacementProofOnlyReview={latestPlacementProofOnlyReview}
            />
          </div>
        ) : null}

        {visitedWorkspaceIds.includes("create-game") ? (
          <div
            aria-hidden={activeWorkspaceId !== "create-game"}
            style={activeWorkspaceId === "create-game" ? activeWorkspacePaneStyle : hiddenWorkspacePaneStyle}
          >
            <Suspense
              fallback={renderWorkspaceLoadingFallback(
                "Create Game",
                "Loading Create Game cockpit mission pipeline and tool cards.",
              )}
            >
              <CreateGameWorkspaceView
                onOpenPromptStudio={openPromptStudioFromCreateGameCockpit}
                onOpenAssetForge={() => setActiveWorkspaceId("asset-forge")}
                onOpenRuntimeOverview={openRuntimeOverview}
                onOpenRecords={openRecordsRuns}
                onLaunchInspectTemplate={openPromptStudioWithInspectProjectTemplateFromCreateGame}
                onLaunchCreateEntityTemplate={openPromptStudioWithCreateGameEntityTemplate}
                onLaunchAddMeshTemplate={openPromptStudioWithAddAllowlistedMeshTemplate}
                onViewLatestRun={openLatestRunEvidence}
                onViewExecution={openLatestExecutionEvidence}
                onViewArtifact={openLatestArtifactEvidence}
                onViewEvidence={openRecordsEvents}
                onOpenPromptSessionDetail={openPromptSessionFromTruthRail}
                onOpenRunDetail={openRunEvidenceById}
                onOpenExecutionDetail={openExecutionEvidenceById}
                onOpenArtifactDetail={openArtifactEvidenceById}
                bridgeStatus={o3deBridgeStatus}
                adapters={adapters}
                readiness={readiness}
                latestRunId={latestRunId}
                latestExecutionId={latestExecutionId}
                latestArtifactId={latestArtifactId}
                latestPlacementProofOnlyReview={latestPlacementProofOnlyReview}
              />
            </Suspense>
          </div>
        ) : null}

        {visitedWorkspaceIds.includes("create-movie") ? (
          <div
            aria-hidden={activeWorkspaceId !== "create-movie"}
            style={activeWorkspaceId === "create-movie" ? activeWorkspacePaneStyle : hiddenWorkspacePaneStyle}
          >
            <Suspense
              fallback={renderWorkspaceLoadingFallback(
                "Create Movie",
                "Loading Create Movie cockpit cinematic pipeline and proof-only placement guidance.",
              )}
            >
              <CreateMovieWorkspaceView
                onOpenPromptStudio={openPromptStudioFromCreateMovieCockpit}
                onOpenAssetForge={() => setActiveWorkspaceId("asset-forge")}
                onOpenRuntimeOverview={openRuntimeOverview}
                onOpenRecords={openRecordsRuns}
                onLaunchInspectTemplate={openPromptStudioWithInspectCinematicTargetTemplate}
                onLaunchCameraTemplate={openPromptStudioWithCreateCinematicCameraTemplate}
                onLaunchPlacementProofTemplate={openPromptStudioWithCinematicPlacementProofTemplate}
                onViewLatestRun={openLatestRunEvidence}
                onViewExecution={openLatestExecutionEvidence}
                onViewArtifact={openLatestArtifactEvidence}
                onViewEvidence={openRecordsEvents}
                onOpenPromptSessionDetail={openPromptSessionFromTruthRail}
                onOpenRunDetail={openRunEvidenceById}
                onOpenExecutionDetail={openExecutionEvidenceById}
                onOpenArtifactDetail={openArtifactEvidenceById}
                bridgeStatus={o3deBridgeStatus}
                adapters={adapters}
                readiness={readiness}
                latestRunId={latestRunId}
                latestExecutionId={latestExecutionId}
                latestArtifactId={latestArtifactId}
                latestPlacementProofOnlyReview={latestPlacementProofOnlyReview}
              />
            </Suspense>
          </div>
        ) : null}

        {visitedWorkspaceIds.includes("load-project") ? (
          <div
            aria-hidden={activeWorkspaceId !== "load-project"}
            style={activeWorkspaceId === "load-project" ? activeWorkspacePaneStyle : hiddenWorkspacePaneStyle}
          >
            <Suspense
              fallback={renderWorkspaceLoadingFallback(
                "Load Project",
                "Loading Load Project cockpit target summary and checklist.",
              )}
            >
              <LoadProjectWorkspaceView
                onOpenPromptStudio={openPromptStudioFromLoadProjectCockpit}
                onOpenRuntimeOverview={openRuntimeOverview}
                onOpenRecords={openRecordsRuns}
                onLaunchInspectTemplate={openPromptStudioWithInspectLoadProjectTemplate}
                onViewLatestRun={openLatestRunEvidence}
                onViewExecution={openLatestExecutionEvidence}
                onViewArtifact={openLatestArtifactEvidence}
                onViewEvidence={openRecordsEvents}
                onOpenPromptSessionDetail={openPromptSessionFromTruthRail}
                onOpenRunDetail={openRunEvidenceById}
                onOpenExecutionDetail={openExecutionEvidenceById}
                onOpenArtifactDetail={openArtifactEvidenceById}
                bridgeStatus={o3deBridgeStatus}
                adapters={adapters}
                readiness={readiness}
                latestRunId={latestRunId}
                latestExecutionId={latestExecutionId}
                latestArtifactId={latestArtifactId}
                latestPlacementProofOnlyReview={latestPlacementProofOnlyReview}
              />
            </Suspense>
          </div>
        ) : null}

        {visitedWorkspaceIds.includes("prompt") ? (
          <div
            aria-hidden={activeWorkspaceId !== "prompt"}
            style={activeWorkspaceId === "prompt" ? activeWorkspacePaneStyle : hiddenWorkspacePaneStyle}
          >
            <Suspense
              fallback={renderWorkspaceLoadingFallback(
                "Prompt Studio",
                "Loading natural-language planning and admitted execution controls.",
              )}
            >
              <PromptWorkspaceDesktop
                selectedWorkspaceId={selectedWorkspaceId}
                selectedExecutorId={selectedExecutorId}
                promptLaunchDraftRequest={promptLaunchDraftRequest}
                onReturnToSourceWorkspace={returnToSourceWorkspaceFromPrompt}
                onPlacementProofOnlyReviewChange={setLatestPlacementProofOnlyReview}
                focusPromptIdRequest={promptSessionFocusRequest}
              />
            </Suspense>
          </div>
        ) : null}

        {visitedWorkspaceIds.includes("builder") ? (
          <div
            aria-hidden={activeWorkspaceId !== "builder"}
            style={activeWorkspaceId === "builder" ? activeWorkspacePaneStyle : hiddenWorkspacePaneStyle}
          >
            <Suspense
              fallback={renderWorkspaceLoadingFallback(
                "Builder",
                "Loading worktree lanes, mission-control visibility, and Codex handoff scaffolding.",
              )}
            >
              <BuilderWorkspaceDesktop />
            </Suspense>
          </div>
        ) : null}

        {visitedWorkspaceIds.includes("operations") ? (
          <div
            aria-hidden={activeWorkspaceId !== "operations"}
            style={activeWorkspaceId === "operations" ? activeWorkspacePaneStyle : hiddenWorkspacePaneStyle}
          >
            {renderOperationsWorkspace()}
          </div>
        ) : null}

        {visitedWorkspaceIds.includes("runtime") ? (
          <div
            aria-hidden={activeWorkspaceId !== "runtime"}
            style={activeWorkspaceId === "runtime" ? activeWorkspacePaneStyle : hiddenWorkspacePaneStyle}
          >
            {renderRuntimeWorkspace()}
          </div>
        ) : null}

        {visitedWorkspaceIds.includes("records") ? (
          <div
            aria-hidden={activeWorkspaceId !== "records"}
            style={activeWorkspaceId === "records" ? activeWorkspacePaneStyle : hiddenWorkspacePaneStyle}
          >
            {renderRecordsWorkspace()}
          </div>
        ) : null}
      </DesktopShell>

      {settings.layout.guidedMode && !settings.layout.guidedTourCompleted ? (
        <FirstRunTour
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={selectDesktopNavigation}
          onComplete={completeFirstRunTour}
        />
      ) : null}
    </>
  );
}

const activeWorkspacePaneStyle = {
  display: "grid",
  minWidth: 0,
} satisfies CSSProperties;

const hiddenWorkspacePaneStyle = {
  display: "none",
} satisfies CSSProperties;

const desktopLaunchpadGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
} satisfies CSSProperties;

const desktopShortcutCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "16px 18px",
  background: "linear-gradient(145deg, var(--app-accent-soft) 0%, var(--app-panel-bg-alt) 100%)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 8,
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const desktopShortcutMetaStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
  lineHeight: 1.45,
} satisfies CSSProperties;

const homeOverviewStackStyle = {
  display: "grid",
  gap: 16,
} satisfies CSSProperties;

const desktopSummaryStripStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
} satisfies CSSProperties;

const desktopMiniStatStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "12px 14px",
  background: "var(--app-panel-bg)",
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const desktopMiniStatLabelStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
} satisfies CSSProperties;

const desktopWorkspaceLoadingCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-window-radius)",
  padding: "24px 26px",
  background: "linear-gradient(155deg, var(--app-accent-soft) 0%, var(--app-panel-bg-alt) 100%)",
  display: "grid",
  gap: 8,
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const desktopWorkspaceLoadingEyebrowStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const desktopWorkspaceLoadingTitleStyle = {
  color: "var(--app-text-color)",
  fontSize: 18,
  fontWeight: 700,
} satisfies CSSProperties;

const desktopWorkspaceLoadingDetailStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  fontSize: 14,
  lineHeight: 1.5,
} satisfies CSSProperties;

function getRefreshScopePendingDetail(scope: RefreshScope): string {
  if (scope === "overview") {
    return "Refreshing catalog, adapter, system status, overview, and policy surfaces.";
  }
  if (scope === "records") {
    return "Refreshing executor, workspace, run, execution, and artifact records plus any selected detail records.";
  }
  return "Refreshing overview, records, approvals, events, locks, and supporting surfaces.";
}

function describeRefreshTargets(scope: RefreshScope, targets: RefreshTarget[]): string {
  const orderedTargets = [...targets].sort((left, right) => left.localeCompare(right));
  if (orderedTargets.length === 0) {
    return `No ${scope} surfaces were refreshed.`;
  }
  return `Updated ${orderedTargets.join(", ")}.`;
}

function parseRefreshTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isUnresolvedRun(run: RunListItem): boolean {
  return run.status === "blocked"
    || run.status === "waiting_approval"
    || run.status === "pending"
    || run.status === "running"
    || run.status === "failed"
    || run.status === "rejected"
    || run.audit_status === "preflight"
    || run.audit_status === "blocked"
    || run.audit_status === "failed"
    || run.audit_status === "rolled_back";
}

function isUnresolvedExecution(execution: ExecutionListItem): boolean {
  return execution.warning_count > 0
    || execution.status === "blocked"
    || execution.status === "waiting_approval"
    || execution.status === "pending"
    || execution.status === "running"
    || execution.status === "failed"
    || execution.status === "rejected"
    || execution.mutation_audit_status === "preflight"
    || execution.mutation_audit_status === "failed"
    || execution.mutation_audit_status === "rolled_back";
}

function isUnresolvedArtifact(artifact: ArtifactListItem): boolean {
  return artifact.simulated
    || artifact.execution_mode === "simulated"
    || artifact.mutation_audit_status === "preflight"
    || artifact.mutation_audit_status === "failed"
    || artifact.mutation_audit_status === "rolled_back";
}

function matchesLaneFilterForRun(run: RunListItem, laneFilterMode: LaneFilterMode): boolean {
  if (laneFilterMode === "warnings") {
    return false;
  }
  if (laneFilterMode === "audit_risk") {
    return run.audit_status === "preflight"
      || run.audit_status === "blocked"
      || run.audit_status === "failed"
      || run.audit_status === "rolled_back";
  }
  if (laneFilterMode === "simulated_only") {
    return run.execution_mode === "simulated" || run.dry_run;
  }
  return true;
}

function matchesLaneFilterForExecution(
  execution: ExecutionListItem,
  laneFilterMode: LaneFilterMode,
): boolean {
  if (laneFilterMode === "warnings") {
    return execution.warning_count > 0;
  }
  if (laneFilterMode === "audit_risk") {
    return execution.mutation_audit_status === "preflight"
      || execution.mutation_audit_status === "failed"
      || execution.mutation_audit_status === "rolled_back";
  }
  if (laneFilterMode === "simulated_only") {
    return execution.execution_mode === "simulated";
  }
  return true;
}

function matchesLaneFilterForArtifact(
  artifact: ArtifactListItem,
  laneFilterMode: LaneFilterMode,
): boolean {
  if (laneFilterMode === "warnings") {
    return false;
  }
  if (laneFilterMode === "audit_risk") {
    return artifact.mutation_audit_status === "preflight"
      || artifact.mutation_audit_status === "failed"
      || artifact.mutation_audit_status === "rolled_back";
  }
  if (laneFilterMode === "simulated_only") {
    return artifact.simulated || artifact.execution_mode === "simulated";
  }
  return true;
}

function getLaneFilterLabel(laneFilterMode: LaneFilterMode): string {
  switch (laneFilterMode) {
    case "warnings":
      return "lane filter: warnings only";
    case "audit_risk":
      return "lane filter: audit risk";
    case "simulated_only":
      return "lane filter: simulated only";
    default:
      return "lane filter: all signals";
  }
}

function isLaneFilterSupported(
  pinnedRecord: PinnedRecord | null,
  laneFilterMode: LaneFilterMode,
): boolean {
  if (!pinnedRecord) {
    return true;
  }
  if (laneFilterMode === "all") {
    return true;
  }
  if (laneFilterMode === "warnings") {
    return pinnedRecord.kind === "execution";
  }
  if (laneFilterMode === "simulated_only") {
    return pinnedRecord.kind !== "execution" || true;
  }
  return true;
}

function getLaneReadiness(
  pinnedRecord: PinnedRecord | null,
  laneFilterMode: LaneFilterMode,
  nextPinnedLaneRecord: LaneProgression | null,
  pinnedLaneCompletionState: LaneCompletionState | null,
  runs: RunListItem[],
  executions: ExecutionListItem[],
  artifacts: ArtifactListItem[],
): LaneReadiness | null {
  if (!pinnedRecord) {
    return null;
  }

  if (!isLaneFilterSupported(pinnedRecord, laneFilterMode)) {
    return {
      label: "lane filter unsupported",
      detail: `${getLaneFilterLabel(laneFilterMode)} is not supported for pinned ${pinnedRecord.kind} records. Warnings-only triage remains execution-only because runs and artifacts do not expose a literal persisted warning count.`,
    };
  }

  if (nextPinnedLaneRecord) {
    return {
      label: "lane ready",
      detail: "Filtered lane is ready for operator progression.",
    };
  }

  if (pinnedLaneCompletionState) {
    return {
      label: "lane filtered empty",
      detail: pinnedLaneCompletionState.detail,
    };
  }

  const remainingCount = pinnedRecord.kind === "run"
    ? runs.filter((run) => matchesLaneFilterForRun(run, laneFilterMode)).filter(isUnresolvedRun).length
    : pinnedRecord.kind === "execution"
      ? executions.filter((execution) => matchesLaneFilterForExecution(execution, laneFilterMode)).filter(isUnresolvedExecution).length
      : artifacts.filter((artifact) => matchesLaneFilterForArtifact(artifact, laneFilterMode)).filter(isUnresolvedArtifact).length;

  return {
    label: remainingCount === 0 ? "lane filtered empty" : "lane ready",
    detail: remainingCount === 0
      ? `No unresolved ${pinnedRecord.kind} records are currently available for ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")}.`
      : "Filtered lane is ready for operator progression.",
  };
}

function getLaneHistoryAvailability(
  laneHistory: LaneHistoryEntry[],
  runs: RunListItem[],
  executions: ExecutionListItem[],
  artifacts: ArtifactListItem[],
): LaneReadiness | null {
  if (laneHistory.length === 0) {
    return null;
  }

  const missingCount = laneHistory.filter((entry) => {
    if (entry.kind === "run") {
      return !runs.some((run) => run.id === entry.id);
    }
    if (entry.kind === "execution") {
      return !executions.some((execution) => execution.id === entry.id);
    }
    return !artifacts.some((artifact) => artifact.id === entry.id);
  }).length;

  if (missingCount === 0) {
    return {
      label: "recent returns current",
      detail: "Recent return targets are still present in the current persisted records lane.",
    };
  }

  return {
    label: "recent returns stale",
    detail: `${missingCount} recent return target${missingCount === 1 ? "" : "s"} no longer appear in the current persisted records lane after refresh.`,
  };
}

function getLaneRecoveryAction(
  pinnedRecord: PinnedRecord | null,
  laneFilterMode: LaneFilterMode,
  laneReadiness: LaneReadiness | null,
): LaneRecoveryAction | null {
  if (!pinnedRecord || !laneReadiness) {
    return null;
  }

  if (laneReadiness.label === "lane filter unsupported") {
    return {
      label: "Switch to all signals",
      mode: "all",
    };
  }

  if (laneReadiness.label === "lane filtered empty" && laneFilterMode !== "all") {
    return {
      label: "Reset to all signals",
      mode: "all",
    };
  }

  return null;
}

function getLanePresetStatus(
  activePreset: LanePreset | null,
  activePresetSource: LanePresetSource,
  lanePresetRestoredAt: string | null,
  laneFilterMode: LaneFilterMode,
  pinnedRecord: PinnedRecord | null,
  executions: ExecutionListItem[],
  artifacts: ArtifactListItem[],
): LanePresetStatus | null {
  if (!activePreset) {
    return null;
  }

  const hasMatchingPin = (() => {
    if (!pinnedRecord) {
      return false;
    }

    if (activePreset.id === "execution_warnings") {
      if (pinnedRecord.kind !== "execution") {
        return false;
      }
      return executions.some(
        (execution) => execution.id === pinnedRecord.id && execution.warning_count > 0,
      );
    }

    if (activePreset.id === "artifact_audit_risk") {
      if (pinnedRecord.kind !== "artifact") {
        return false;
      }
      return artifacts.some(
        (artifact) =>
          artifact.id === pinnedRecord.id
          && (
            artifact.mutation_audit_status === "preflight"
            || artifact.mutation_audit_status === "failed"
            || artifact.mutation_audit_status === "rolled_back"
          ),
      );
    }

    if (pinnedRecord.kind !== "artifact") {
      return false;
    }
    return artifacts.some(
      (artifact) =>
        artifact.id === pinnedRecord.id
        && (artifact.simulated || artifact.execution_mode === "simulated"),
    );
  })();

  const hasMatchingFilter = (
    (activePreset.id === "execution_warnings" && laneFilterMode === "warnings")
    || (activePreset.id === "artifact_audit_risk" && laneFilterMode === "audit_risk")
    || (activePreset.id === "simulated_review" && laneFilterMode === "simulated_only")
  );

  if (!activePreset.available) {
    return {
      activeLabel: `preset unavailable: ${activePreset.label}`,
      activeDetail: activePreset.availabilityDetail,
      restoredLabel: activePresetSource === "session" ? "restored from session" : null,
      restoredDetail: lanePresetRestoredAt
        ? `Session recall restored this preset selection at ${new Date(lanePresetRestoredAt).toLocaleTimeString()}.`
        : null,
      driftLabel: "preset drifted",
      driftDetail: "The last selected preset no longer matches currently persisted records.",
    };
  }

  if (hasMatchingFilter && hasMatchingPin) {
    return {
      activeLabel: `active preset: ${activePreset.label}`,
      activeDetail: `${activePreset.detail} ${activePreset.availabilityDetail}`,
      restoredLabel: activePresetSource === "session" ? "restored from session" : null,
      restoredDetail: lanePresetRestoredAt
        ? `Session recall restored this preset selection at ${new Date(lanePresetRestoredAt).toLocaleTimeString()}.`
        : null,
      driftLabel: null,
      driftDetail: null,
    };
  }

  const driftReasons: string[] = [];
  if (!hasMatchingFilter) {
    driftReasons.push("the lane filter was manually changed");
  }
  if (!hasMatchingPin) {
    driftReasons.push("the pinned record no longer matches the preset target");
  }

  return {
    activeLabel: `last preset: ${activePreset.label}`,
    activeDetail: `${activePreset.detail} ${activePreset.availabilityDetail}`,
    restoredLabel: activePresetSource === "session" ? "restored from session" : null,
    restoredDetail: lanePresetRestoredAt
      ? `Session recall restored this preset selection at ${new Date(lanePresetRestoredAt).toLocaleTimeString()}.`
      : null,
    driftLabel: "preset drifted",
    driftDetail: `This preset is still available, but ${driftReasons.join(" and ")}.`,
  };
}

function getActiveLaneOperatorNote(
  pinnedRecord: PinnedRecord | null,
  laneOperatorNotes: Record<string, LaneOperatorNoteEntry>,
): LaneOperatorNote | null {
  if (!pinnedRecord) {
    return null;
  }

  const storageKey = `${pinnedRecord.kind}:${pinnedRecord.id}`;
  const noteEntry = laneOperatorNotes[storageKey];
  if (!noteEntry) {
    return null;
  }

  return {
    label: "operator note: local",
    detail: `Local browser-session note for ${noteEntry.pinnedLabel}, saved ${new Date(noteEntry.updatedAt).toLocaleTimeString()}: ${noteEntry.text}`,
    text: noteEntry.text,
  };
}

function getLaneMemorySnapshot(
  pinnedRecord: PinnedRecord | null,
  laneFilterMode: LaneFilterMode,
  selectedRun: RunRecord | null,
  selectedExecution: ExecutionRecord | null,
  selectedArtifact: ArtifactRecord | null,
): LaneMemory | null {
  if (!pinnedRecord) {
    return null;
  }

  const currentSelectionLabel = selectedArtifact
    ? `artifact ${selectedArtifact.id}`
    : selectedExecution
      ? `execution ${selectedExecution.id}`
      : selectedRun
        ? `run ${selectedRun.id}`
        : pinnedRecord.label;

  return {
    pinnedKind: pinnedRecord.kind,
    pinnedId: pinnedRecord.id,
    pinnedLabel: pinnedRecord.label,
    filterLabel: getLaneFilterLabel(laneFilterMode),
    currentSelectionLabel,
    detail: `Return to ${pinnedRecord.label} with ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")} active after inspecting ${currentSelectionLabel}.`,
  };
}

function getNextUnresolvedItem<T extends { id: string }>(
  items: T[],
  currentId: string | null,
  isUnresolved: (item: T) => boolean,
): T | null {
  const unresolvedItems = items.filter(isUnresolved);
  if (unresolvedItems.length === 0) {
    return null;
  }
  if (!currentId) {
    return unresolvedItems[0] ?? null;
  }
  const currentIndex = unresolvedItems.findIndex((item) => item.id === currentId);
  if (currentIndex === -1) {
    return unresolvedItems[0] ?? null;
  }
  if (unresolvedItems.length === 1) {
    return null;
  }
  return unresolvedItems[(currentIndex + 1) % unresolvedItems.length] ?? null;
}

function getNextPinnedLaneRecord(
  pinnedRecord: PinnedRecord | null,
  runs: RunListItem[],
  executions: ExecutionListItem[],
  artifacts: ArtifactListItem[],
  selectedRunId: string | null,
  selectedExecutionId: string | null,
  selectedArtifactId: string | null,
  laneFilterMode: LaneFilterMode,
): LaneProgression | null {
  if (!pinnedRecord) {
    return null;
  }

  if (pinnedRecord.kind === "run") {
    const nextRun = getNextUnresolvedItem(
      runs.filter((run) => matchesLaneFilterForRun(run, laneFilterMode)),
      selectedRunId ?? pinnedRecord.id,
      isUnresolvedRun,
    );
    if (!nextRun) {
      return null;
    }
    return {
      kind: "run",
      id: nextRun.id,
      label: `Next unresolved run: ${nextRun.id}`,
      detail: `Advance the pinned run lane to ${nextRun.status} work that still needs operator review.`,
      actionLabel: "Open next unresolved run",
    };
  }

  if (pinnedRecord.kind === "execution") {
    const nextExecution = getNextUnresolvedItem(
      executions.filter((execution) => matchesLaneFilterForExecution(execution, laneFilterMode)),
      selectedExecutionId ?? pinnedRecord.id,
      isUnresolvedExecution,
    );
    if (!nextExecution) {
      return null;
    }
    return {
      kind: "execution",
      id: nextExecution.id,
      label: `Next unresolved execution: ${nextExecution.id}`,
      detail: nextExecution.warning_count > 0
        ? `Advance the pinned execution lane to the next execution carrying ${nextExecution.warning_count} persisted warning${nextExecution.warning_count === 1 ? "" : "s"}.`
        : `Advance the pinned execution lane to ${nextExecution.status} work that still needs operator review.`,
      actionLabel: "Open next unresolved execution",
    };
  }

  const nextArtifact = getNextUnresolvedItem(
    artifacts.filter((artifact) => matchesLaneFilterForArtifact(artifact, laneFilterMode)),
    selectedArtifactId ?? pinnedRecord.id,
    isUnresolvedArtifact,
  );
  if (!nextArtifact) {
    return null;
  }
  return {
    kind: "artifact",
    id: nextArtifact.id,
    label: `Next unresolved artifact: ${nextArtifact.id}`,
    detail: "Advance the pinned artifact lane to the next record carrying simulated or mutation-audit risk markers.",
    actionLabel: "Open next unresolved artifact",
  };
}

function getPinnedLaneCompletionState(
  pinnedRecord: PinnedRecord | null,
  nextPinnedLaneRecord: LaneProgression | null,
  runs: RunListItem[],
  executions: ExecutionListItem[],
  artifacts: ArtifactListItem[],
  laneFilterMode: LaneFilterMode,
): LaneCompletionState | null {
  if (!pinnedRecord || nextPinnedLaneRecord) {
    return null;
  }

  if (pinnedRecord.kind === "run") {
    const unresolvedCount = runs
      .filter((run) => matchesLaneFilterForRun(run, laneFilterMode))
      .filter(isUnresolvedRun).length;
    return {
      label: "Run lane complete",
      detail: unresolvedCount === 0
        ? `No unresolved runs remain for the ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")} filter in the current persisted records lane.`
        : "The pinned run lane has no further unresolved run to advance to from the current filtered selection.",
    };
  }

  if (pinnedRecord.kind === "execution") {
    const unresolvedCount = executions
      .filter((execution) => matchesLaneFilterForExecution(execution, laneFilterMode))
      .filter(isUnresolvedExecution).length;
    return {
      label: "Execution lane complete",
      detail: unresolvedCount === 0
        ? `No unresolved executions remain for the ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")} filter in the current persisted records lane.`
        : "The pinned execution lane has no further unresolved execution to advance to from the current filtered selection.",
    };
  }

  const unresolvedCount = artifacts
    .filter((artifact) => matchesLaneFilterForArtifact(artifact, laneFilterMode))
    .filter(isUnresolvedArtifact).length;
  return {
    label: "Artifact lane complete",
    detail: unresolvedCount === 0
      ? `No unresolved artifacts remain for the ${getLaneFilterLabel(laneFilterMode).replace("lane filter: ", "")} filter in the current persisted records lane.`
      : "The pinned artifact lane has no further unresolved artifact to advance to from the current filtered selection.",
  };
}

function getPinnedLaneRolloverRecord(
  pinnedRecord: PinnedRecord | null,
  runs: RunListItem[],
  executions: ExecutionListItem[],
  artifacts: ArtifactListItem[],
  laneFilterMode: LaneFilterMode,
): LaneProgression | null {
  if (!pinnedRecord) {
    return null;
  }

  if (pinnedRecord.kind !== "run") {
    const nextRun = runs
      .filter((run) => matchesLaneFilterForRun(run, laneFilterMode))
      .find(isUnresolvedRun);
    if (nextRun) {
      return {
        kind: "run",
        id: nextRun.id,
        label: `Roll over to run ${nextRun.id}`,
        detail: `Move to the next unresolved run lane with ${nextRun.status} persisted operator work.`,
        actionLabel: "Open rollover run lane",
      };
    }
  }

  if (pinnedRecord.kind !== "execution") {
    const nextExecution = executions
      .filter((execution) => matchesLaneFilterForExecution(execution, laneFilterMode))
      .find(isUnresolvedExecution);
    if (nextExecution) {
      return {
        kind: "execution",
        id: nextExecution.id,
        label: `Roll over to execution ${nextExecution.id}`,
        detail: nextExecution.warning_count > 0
          ? `Move to the next unresolved execution lane carrying ${nextExecution.warning_count} persisted warning${nextExecution.warning_count === 1 ? "" : "s"}.`
          : `Move to the next unresolved execution lane with ${nextExecution.status} persisted operator work.`,
        actionLabel: "Open rollover execution lane",
      };
    }
  }

  if (pinnedRecord.kind !== "artifact") {
    const nextArtifact = artifacts
      .filter((artifact) => matchesLaneFilterForArtifact(artifact, laneFilterMode))
      .find(isUnresolvedArtifact);
    if (nextArtifact) {
      return {
        kind: "artifact",
        id: nextArtifact.id,
        label: `Roll over to artifact ${nextArtifact.id}`,
        detail: "Move to the next unresolved artifact lane carrying simulated or mutation-audit risk markers.",
        actionLabel: "Open rollover artifact lane",
      };
    }
  }

  return null;
}

function getPinnedLaneMetrics(
  pinnedRecord: PinnedRecord | null,
  runs: RunListItem[],
  executions: ExecutionListItem[],
  artifacts: ArtifactListItem[],
  selectedRunId: string | null,
  selectedExecutionId: string | null,
  selectedArtifactId: string | null,
  laneFilterMode: LaneFilterMode,
): LaneMetrics | null {
  if (!pinnedRecord) {
    return null;
  }

  if (pinnedRecord.kind === "run") {
    const unresolvedRuns = runs
      .filter((run) => matchesLaneFilterForRun(run, laneFilterMode))
      .filter(isUnresolvedRun);
    const currentIndex = unresolvedRuns.findIndex((run) => run.id === (selectedRunId ?? pinnedRecord.id));
    const traversedCount = currentIndex >= 0 ? currentIndex + 1 : 0;
    const remainingCount = currentIndex >= 0
      ? Math.max(unresolvedRuns.length - traversedCount, 0)
      : unresolvedRuns.length;
    const auditDrivenCount = unresolvedRuns.filter((run) =>
      run.audit_status === "preflight"
      || run.audit_status === "blocked"
      || run.audit_status === "failed"
      || run.audit_status === "rolled_back").length;
    const statusDrivenCount = unresolvedRuns.length - auditDrivenCount;
    return {
      label: `Lane progress: ${traversedCount}/${unresolvedRuns.length || 0}`,
      detail: `${remainingCount} unresolved run${remainingCount === 1 ? "" : "s"} remain in the pinned lane.`,
      driverLabel: laneFilterMode === "simulated_only"
        ? "Driven by simulated runs"
        : auditDrivenCount > statusDrivenCount ? "Driven by audit state" : "Driven by run state",
      driverDetail: laneFilterMode === "simulated_only"
        ? "This run lane is explicitly scoped to simulated or dry-run persisted records."
        : auditDrivenCount > statusDrivenCount
        ? "Most remaining run-lane items are being surfaced by persisted audit states such as preflight, blocked, failed, or rolled back."
        : "Most remaining run-lane items are being surfaced by unresolved run statuses such as waiting approval, running, blocked, or failed.",
      remainingCount,
      traversedCount,
      totalCount: unresolvedRuns.length,
    };
  }

  if (pinnedRecord.kind === "execution") {
    const unresolvedExecutions = executions
      .filter((execution) => matchesLaneFilterForExecution(execution, laneFilterMode))
      .filter(isUnresolvedExecution);
    const currentIndex = unresolvedExecutions.findIndex(
      (execution) => execution.id === (selectedExecutionId ?? pinnedRecord.id),
    );
    const traversedCount = currentIndex >= 0 ? currentIndex + 1 : 0;
    const remainingCount = currentIndex >= 0
      ? Math.max(unresolvedExecutions.length - traversedCount, 0)
      : unresolvedExecutions.length;
    const warningDrivenCount = unresolvedExecutions.filter((execution) => execution.warning_count > 0).length;
    const auditOrStateCount = unresolvedExecutions.length - warningDrivenCount;
    return {
      label: `Lane progress: ${traversedCount}/${unresolvedExecutions.length || 0}`,
      detail: `${remainingCount} unresolved execution${remainingCount === 1 ? "" : "s"} remain in the pinned lane.`,
      driverLabel: laneFilterMode === "warnings"
        ? "Driven by warnings"
        : laneFilterMode === "simulated_only"
          ? "Driven by simulated executions"
          : warningDrivenCount >= auditOrStateCount ? "Driven by warnings" : "Driven by audit or state",
      driverDetail: laneFilterMode === "warnings"
        ? "This execution lane is explicitly scoped to persisted warning-bearing executions."
        : laneFilterMode === "simulated_only"
          ? "This execution lane is explicitly scoped to simulated persisted executions."
          : warningDrivenCount >= auditOrStateCount
        ? "Most remaining execution-lane items are being surfaced because they carry persisted warning counts."
        : "Most remaining execution-lane items are being surfaced by unresolved execution status or mutation-audit state.",
      remainingCount,
      traversedCount,
      totalCount: unresolvedExecutions.length,
    };
  }

  const unresolvedArtifacts = artifacts
    .filter((artifact) => matchesLaneFilterForArtifact(artifact, laneFilterMode))
    .filter(isUnresolvedArtifact);
  const currentIndex = unresolvedArtifacts.findIndex(
    (artifact) => artifact.id === (selectedArtifactId ?? pinnedRecord.id),
  );
  const traversedCount = currentIndex >= 0 ? currentIndex + 1 : 0;
  const remainingCount = currentIndex >= 0
    ? Math.max(unresolvedArtifacts.length - traversedCount, 0)
    : unresolvedArtifacts.length;
  const simulatedDrivenCount = unresolvedArtifacts.filter((artifact) =>
    artifact.simulated || artifact.execution_mode === "simulated").length;
  const auditDrivenCount = unresolvedArtifacts.length - simulatedDrivenCount;
  return {
    label: `Lane progress: ${traversedCount}/${unresolvedArtifacts.length || 0}`,
    detail: `${remainingCount} unresolved artifact${remainingCount === 1 ? "" : "s"} remain in the pinned lane.`,
    driverLabel: laneFilterMode === "simulated_only"
      ? "Driven by simulation markers"
      : laneFilterMode === "audit_risk"
        ? "Driven by audit risk"
        : simulatedDrivenCount >= auditDrivenCount ? "Driven by simulation markers" : "Driven by audit risk",
    driverDetail: laneFilterMode === "simulated_only"
      ? "This artifact lane is explicitly scoped to artifacts that remain simulated."
      : laneFilterMode === "audit_risk"
        ? "This artifact lane is explicitly scoped to persisted mutation-audit risk markers."
        : simulatedDrivenCount >= auditDrivenCount
      ? "Most remaining artifact-lane items are being surfaced because they remain explicitly simulated."
      : "Most remaining artifact-lane items are being surfaced by persisted mutation-audit risk markers.",
    remainingCount,
    traversedCount,
    totalCount: unresolvedArtifacts.length,
  };
}

function getPinnedRecordStatus(
  pinnedRecord: PinnedRecord | null,
  runs: RunListItem[],
  executions: ExecutionListItem[],
  artifacts: ArtifactListItem[],
  runDetailRefreshedAt: string | null,
  executionDetailRefreshedAt: string | null,
  artifactDetailRefreshedAt: string | null,
  dashboardRefreshedAt: string | null,
): PinnedRecordStatus | null {
  if (!pinnedRecord) {
    return null;
  }

  if (pinnedRecord.kind === "run") {
    const present = runs.some((run) => run.id === pinnedRecord.id);
    if (!present) {
      return {
        label: "pinned lane missing",
        detail: "Pinned run is not present in the current persisted records lane.",
      };
    }
    const detailRefresh = parseRefreshTimestamp(runDetailRefreshedAt);
    const dashboardRefresh = parseRefreshTimestamp(dashboardRefreshedAt);
    return detailRefresh >= dashboardRefresh && detailRefresh > 0
      ? {
          label: "pinned lane current",
          detail: "Pinned run detail is current with the latest detail refresh.",
        }
      : {
          label: "pinned lane needs refocus",
          detail: "Pinned run is available, but reopening it is the fastest way to re-center the active decision lane.",
        };
  }

  if (pinnedRecord.kind === "execution") {
    const present = executions.some((execution) => execution.id === pinnedRecord.id);
    if (!present) {
      return {
        label: "pinned lane missing",
        detail: "Pinned execution is not present in the current persisted records lane.",
      };
    }
    const detailRefresh = parseRefreshTimestamp(executionDetailRefreshedAt);
    const dashboardRefresh = parseRefreshTimestamp(dashboardRefreshedAt);
    return detailRefresh >= dashboardRefresh && detailRefresh > 0
      ? {
          label: "pinned lane current",
          detail: "Pinned execution detail is current with the latest detail refresh.",
        }
      : {
          label: "pinned lane needs refocus",
          detail: "Pinned execution is available, but reopening it is the fastest way to re-center the active decision lane.",
        };
  }

  const present = artifacts.some((artifact) => artifact.id === pinnedRecord.id);
  if (!present) {
    return {
      label: "pinned lane missing",
      detail: "Pinned artifact is not present in the current persisted records lane.",
    };
  }
  const detailRefresh = parseRefreshTimestamp(artifactDetailRefreshedAt);
  const dashboardRefresh = parseRefreshTimestamp(dashboardRefreshedAt);
  return detailRefresh >= dashboardRefresh && detailRefresh > 0
    ? {
        label: "pinned lane current",
        detail: "Pinned artifact detail is current with the latest detail refresh.",
      }
    : {
        label: "pinned lane needs refocus",
        detail: "Pinned artifact is available, but reopening it is the fastest way to re-center the active decision lane.",
      };
}
