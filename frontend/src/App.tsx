import { useEffect, useRef, useState } from "react";

import AgentPanel from "./components/AgentPanel";
import AdaptersPanel from "./components/AdaptersPanel";
import ArtifactDetailPanel from "./components/ArtifactDetailPanel";
import ArtifactsPanel from "./components/ArtifactsPanel";
import ApprovalQueue from "./components/ApprovalQueue";
import CatalogPanel from "./components/CatalogPanel";
import DispatchForm from "./components/DispatchForm";
import ExecutionDetailPanel from "./components/ExecutionDetailPanel";
import ExecutionsPanel from "./components/ExecutionsPanel";
import LayoutHeader from "./components/LayoutHeader";
import LocksPanel from "./components/LocksPanel";
import OperatorOverviewPanel from "./components/OperatorOverviewPanel";
import Phase7CapabilitySummaryPanel from "./components/Phase7CapabilitySummaryPanel";
import PoliciesPanel from "./components/PoliciesPanel";
import ResponseEnvelopeView from "./components/ResponseEnvelopeView";
import RunDetailPanel from "./components/RunDetailPanel";
import RunsPanel from "./components/RunsPanel";
import SystemStatusPanel from "./components/SystemStatusPanel";
import TaskTimeline from "./components/TaskTimeline";
import { mockAgents } from "./data/mockAgents";
import {
  approveApproval,
  fetchAdapters,
  fetchApprovalCards,
  fetchArtifact,
  fetchArtifactCards,
  fetchControlPlaneSummary,
  fetchExecution,
  fetchExecutionCards,
  fetchEventCards,
  fetchLockCards,
  fetchRun,
  fetchRunCards,
  fetchRunsSummaryForFilter,
  fetchPolicies,
  fetchReadiness,
  fetchToolsCatalog,
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
import type {
  ArtifactListItem,
  ArtifactRecord,
  AdaptersResponse,
  ApprovalListItem,
  CatalogAgent,
  ControlPlaneSummaryResponse,
  ExecutionRecord,
  ExecutionListItem,
  EventListItem,
  LockListItem,
  ReadinessStatus,
  RunAuditRecord,
  RunListItem,
  ResponseEnvelope,
  RunRecord,
  SettingsPatchAuditSummary,
  ToolPolicy,
} from "./types/contracts";

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

type AuditFilter =
  | "all"
  | "preflight"
  | "blocked"
  | "succeeded"
  | "rolled_back"
  | "other";

type ToolFilter = "all" | "settings.patch";
type FocusedSection = "approvals" | "artifacts" | "events" | "executions" | "runs";
type RefreshScope = "full" | "overview" | "records";
type RefreshTarget =
  | "catalog"
  | "adapters"
  | "system status"
  | "operator overview"
  | "policies"
  | "approvals"
  | "events"
  | "locks"
  | "runs"
  | "executions"
  | "artifacts"
  | "selected execution detail"
  | "selected artifact detail";

const ACTIVE_LANE_PRESET_SESSION_KEY = "o3de-control-app-active-lane-preset";
const LANE_OPERATOR_NOTES_SESSION_KEY = "o3de-control-app-lane-operator-notes";

export default function App() {
  const [lastResponse, setLastResponse] = useState<ResponseEnvelope | null>(null);
  const [catalogAgents, setCatalogAgents] = useState<CatalogAgent[]>([]);
  const [approvals, setApprovals] = useState<ApprovalListItem[]>([]);
  const [adapters, setAdapters] = useState<AdaptersResponse | null>(null);
  const [artifacts, setArtifacts] = useState<ArtifactListItem[]>([]);
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [executions, setExecutions] = useState<ExecutionListItem[]>([]);
  const [locks, setLocks] = useState<LockListItem[]>([]);
  const [policies, setPolicies] = useState<ToolPolicy[]>([]);
  const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
  const [controlPlaneSummary, setControlPlaneSummary] =
    useState<ControlPlaneSummaryResponse | null>(null);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [runAudits, setRunAudits] = useState<RunAuditRecord[]>([]);
  const [settingsPatchAuditSummary, setSettingsPatchAuditSummary] =
    useState<SettingsPatchAuditSummary | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [selectedExecutionDetails, setSelectedExecutionDetails] =
    useState<Record<string, unknown> | null>(null);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactRecord | null>(null);
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
  const [runDetailRefreshing, setRunDetailRefreshing] = useState(false);
  const [executionDetailRefreshing, setExecutionDetailRefreshing] = useState(false);
  const [artifactDetailRefreshing, setArtifactDetailRefreshing] = useState(false);
  const [runDetailRefreshedAt, setRunDetailRefreshedAt] = useState<string | null>(null);
  const [executionDetailRefreshedAt, setExecutionDetailRefreshedAt] = useState<string | null>(null);
  const [artifactDetailRefreshedAt, setArtifactDetailRefreshedAt] = useState<string | null>(null);
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
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [adaptersError, setAdaptersError] = useState<string | null>(null);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [executionsError, setExecutionsError] = useState<string | null>(null);
  const [locksError, setLocksError] = useState<string | null>(null);
  const [policiesError, setPoliciesError] = useState<string | null>(null);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const [controlPlaneSummaryError, setControlPlaneSummaryError] = useState<string | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [selectedRunError, setSelectedRunError] = useState<string | null>(null);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [adaptersLoading, setAdaptersLoading] = useState(true);
  const [artifactsLoading, setArtifactsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [executionsLoading, setExecutionsLoading] = useState(true);
  const [locksLoading, setLocksLoading] = useState(true);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [readinessLoading, setReadinessLoading] = useState(true);
  const [controlPlaneSummaryLoading, setControlPlaneSummaryLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);
  const [selectedRunLoading, setSelectedRunLoading] = useState(false);
  const [selectedExecutionLoading, setSelectedExecutionLoading] = useState(false);
  const [selectedArtifactLoading, setSelectedArtifactLoading] = useState(false);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
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
  const [executionsSearchPreset, setExecutionsSearchPreset] = useState<string | null>(null);
  const [eventsSearchPreset, setEventsSearchPreset] = useState<string | null>(null);
  const [runsFocusLabel, setRunsFocusLabel] = useState<string | null>(null);
  const [approvalsFocusLabel, setApprovalsFocusLabel] = useState<string | null>(null);
  const [artifactsFocusLabel, setArtifactsFocusLabel] = useState<string | null>(null);
  const [executionsFocusLabel, setExecutionsFocusLabel] = useState<string | null>(null);
  const [eventsFocusLabel, setEventsFocusLabel] = useState<string | null>(null);
  const [activeFocusedSection, setActiveFocusedSection] = useState<FocusedSection | null>(null);
  const [updatedFocusedSection, setUpdatedFocusedSection] = useState<FocusedSection | null>(null);
  const [runsSearchVersion, setRunsSearchVersion] = useState(0);
  const [approvalsSearchVersion, setApprovalsSearchVersion] = useState(0);
  const [artifactsSearchVersion, setArtifactsSearchVersion] = useState(0);
  const [executionsSearchVersion, setExecutionsSearchVersion] = useState(0);
  const [eventsSearchVersion, setEventsSearchVersion] = useState(0);
  const approvalsSectionRef = useRef<HTMLElement | null>(null);
  const artifactsSectionRef = useRef<HTMLDivElement | null>(null);
  const executionsSectionRef = useRef<HTMLDivElement | null>(null);
  const eventsSectionRef = useRef<HTMLDivElement | null>(null);
  const runsSectionRef = useRef<HTMLDivElement | null>(null);
  const runDetailSectionRef = useRef<HTMLDivElement | null>(null);
  const executionDetailSectionRef = useRef<HTMLDivElement | null>(null);
  const artifactDetailSectionRef = useRef<HTMLDivElement | null>(null);
  const announceRunDetailRefreshRef = useRef(false);
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
      const nextEvents = await fetchEventCards();
      setEvents(nextEvents);
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

  async function loadArtifacts() {
    setArtifactsLoading(true);
    try {
      const nextArtifacts = await fetchArtifactCards();
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
    options?: {
      executionItems?: ExecutionListItem[];
      announceSelectionRefresh?: boolean;
    },
  ) {
    setRunsLoading(true);
    try {
      const [nextRuns, nextRunsSummary] = await Promise.all([
        fetchRunCards(toolFilter, auditFilter),
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
    } catch (error) {
      setRunsError(
        error instanceof Error ? error.message : "Failed to load runs",
      );
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

  async function loadExecutions() {
    setExecutionsLoading(true);
    try {
      const nextExecutions = await fetchExecutionCards();
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
      await loadCatalog();

      await loadApprovals();
      await loadAdapters();
      await loadArtifacts();
      await loadEvents();
      await loadExecutions();
      await loadLocks();
      await loadPolicies();
      await loadReadiness();
      await loadControlPlaneSummary();
      try {
        const [nextRuns, nextRunsSummary] = await Promise.all([
          fetchRunCards("all", "all"),
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
    void refreshDashboardState();
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
    if (activeFocusedSection === "executions") {
      scrollToSection(executionsSectionRef.current);
      return;
    }
    if (activeFocusedSection === "runs") {
      scrollToSection(runsSectionRef.current);
    }
  }

  function getFocusedSectionUpdateLabel(section: FocusedSection): string | null {
    return updatedFocusedSection === section ? "data updated after refresh" : null;
  }

  function openRunDetail(runId: string) {
    setRunDetailRefreshHint(null);
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

  function openExecutionDetail(executionId: string) {
    setExecutionDetailRefreshHint(null);
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

  function openArtifactDetail(artifactId: string) {
    setArtifactDetailRefreshHint(null);
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
        await Promise.all([nextExecutionsPromise, nextArtifactsPromise]);
        const nextExecutions = await nextExecutionsPromise;
        const nextArtifacts = await nextArtifactsPromise;

        await loadRuns(selectedToolFilter, selectedAuditFilter, {
          executionItems: nextExecutions,
          announceSelectionRefresh: announceRunDetailRefreshRef.current,
        });
        refreshedTargets.add("runs");
        refreshedTargets.add("executions");
        refreshedTargets.add("artifacts");
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
    setSelectedToolFilter("all");
    setSelectedAuditFilter("all");
    setRunsSearchPreset(status);
    setRunsFocusLabel(`status = ${status}`);
    setActiveFocusedSection("runs");
    setUpdatedFocusedSection(null);
    setRunsSearchVersion((value) => value + 1);
    setRunsLoading(true);
    try {
      const [nextRuns, nextRunsSummary] = await Promise.all([
        fetchRunCards("all", "all"),
        fetchRunsSummaryForFilter("all", "all"),
      ]);
      setRuns(nextRuns);
      setRunAudits(nextRunsSummary.runAudits);
      setSettingsPatchAuditSummary(nextRunsSummary.settingsPatchAuditSummary);
      setRunsError(null);
      setRunDetailRefreshHint(null);
      const firstMatchingRun = nextRuns.find((item) => item.status === status);
      if (firstMatchingRun) {
        await loadRunDetail(firstMatchingRun.id);
      }
    } catch (error) {
      setRunsError(
        error instanceof Error ? error.message : "Failed to load runs",
      );
    } finally {
      setRunsLoading(false);
    }
    scrollToSection(runsSectionRef.current);
  }

  function handlePendingApprovalsDrilldown() {
    setApprovalsSearchPreset("pending");
    setApprovalsFocusLabel("status = pending");
    setActiveFocusedSection("approvals");
    setUpdatedFocusedSection(null);
    setApprovalsSearchVersion((value) => value + 1);
    scrollToSection(approvalsSectionRef.current);
  }

  function handleExecutionModeDrilldown(mode: string) {
    setExecutionsSearchPreset(mode);
    setExecutionsFocusLabel(`execution mode = ${mode}`);
    setActiveFocusedSection("executions");
    setUpdatedFocusedSection(null);
    setExecutionsSearchVersion((value) => value + 1);
    scrollToSection(executionsSectionRef.current);
  }

  function handleArtifactModeDrilldown(mode: string) {
    setArtifactsSearchPreset(mode);
    setArtifactsFocusLabel(`artifact mode = ${mode}`);
    setActiveFocusedSection("artifacts");
    setUpdatedFocusedSection(null);
    setArtifactsSearchVersion((value) => value + 1);
    scrollToSection(artifactsSectionRef.current);
  }

  function handleEventSeverityDrilldown(severity: string) {
    setEventsSearchPreset(severity);
    setEventsFocusLabel(`severity = ${severity}`);
    setActiveFocusedSection("events");
    setUpdatedFocusedSection(null);
    setEventsSearchVersion((value) => value + 1);
    scrollToSection(eventsSectionRef.current);
  }

  function clearRunsFocus() {
    setRunsSearchPreset(null);
    setRunsFocusLabel(null);
    setUpdatedFocusedSection(null);
    if (activeFocusedSection === "runs") {
      setActiveFocusedSection(null);
    }
    setRunsSearchVersion((value) => value + 1);
  }

  function clearApprovalsFocus() {
    setApprovalsSearchPreset(null);
    setApprovalsFocusLabel(null);
    setUpdatedFocusedSection(null);
    if (activeFocusedSection === "approvals") {
      setActiveFocusedSection(null);
    }
    setApprovalsSearchVersion((value) => value + 1);
  }

  function clearArtifactsFocus() {
    setArtifactsSearchPreset(null);
    setArtifactsFocusLabel(null);
    setUpdatedFocusedSection(null);
    if (activeFocusedSection === "artifacts") {
      setActiveFocusedSection(null);
    }
    setArtifactsSearchVersion((value) => value + 1);
  }

  function clearExecutionsFocus() {
    setExecutionsSearchPreset(null);
    setExecutionsFocusLabel(null);
    setUpdatedFocusedSection(null);
    if (activeFocusedSection === "executions") {
      setActiveFocusedSection(null);
    }
    setExecutionsSearchVersion((value) => value + 1);
  }

  function clearEventsFocus() {
    setEventsSearchPreset(null);
    setEventsFocusLabel(null);
    setUpdatedFocusedSection(null);
    if (activeFocusedSection === "events") {
      setActiveFocusedSection(null);
    }
    setEventsSearchVersion((value) => value + 1);
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
    : mockAgents;
  return (
    <main
      style={{
        fontFamily: "sans-serif",
        padding: 24,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <LayoutHeader
        title="O3DE Agent Control App"
        subtitle="Early operator shell for orchestrating O3DE-focused agents, approvals, logs, artifacts, and tool-driven workflows."
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

      {catalogError ? <p style={{ color: "crimson" }}>{catalogError}</p> : null}

      <CatalogPanel agents={catalogAgents} />
      <DispatchForm
        agents={catalogAgents.length > 0 ? catalogAgents : [{
          id: "project-build",
          name: "Project / Build Agent",
          role: "Fallback catalog entry",
          summary: "Fallback catalog entry",
          tools: [{
            name: "project.inspect",
            description: "Inspect project manifest and override state.",
            approval_class: "read_only",
            default_locks: ["project_config"],
            default_timeout_s: 30,
            risk: "low",
            tags: ["project", "inspect"],
          }],
        }]}
        adapters={adapters}
        readiness={readiness}
        onResponse={handleDispatchResponse}
      />
      <ResponseEnvelopeView response={lastResponse} />

      <section style={{ marginBottom: 32 }}>
        <h2>Agent Control</h2>
        {agentsForDisplay.map((agent) => (
          <AgentPanel
            key={agent.id}
            name={agent.name}
            role={agent.role}
            lockLabel={agent.locks.join(", ")}
            tools={agent.owned_tools}
          />
        ))}
      </section>

      <AdaptersPanel
        adapters={adapters}
        loading={adaptersLoading}
        error={adaptersError}
      />

      <SystemStatusPanel
        readiness={readiness}
        loading={readinessLoading}
        error={readinessError}
      />

      <OperatorOverviewPanel
        summary={controlPlaneSummary}
        loading={controlPlaneSummaryLoading}
        error={controlPlaneSummaryError}
        lastRefreshedAt={operatorOverviewRefreshedAt}
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
        onApplyLaneRecovery={laneRecoveryAction ? handleLaneRecovery : null}
        onDropStaleLaneHistory={laneHistoryAvailability?.label === "recent returns stale" ? dropStaleLaneHistory : null}
        onApplyLanePreset={applyLanePreset}
        onOpenLaneRolloverRecord={pinnedLaneRolloverRecord ? openPinnedLaneRolloverRecord : null}
        onRunStatusSelect={handleRunStatusDrilldown}
        onPendingApprovalsSelect={handlePendingApprovalsDrilldown}
        onExecutionModeSelect={handleExecutionModeDrilldown}
        onArtifactModeSelect={handleArtifactModeDrilldown}
        onEventSeveritySelect={handleEventSeverityDrilldown}
        onRefresh={() => {
          void refreshDashboardStateForScope("overview");
        }}
        refreshing={overviewRefreshing}
      />

      <Phase7CapabilitySummaryPanel agents={catalogAgents} />

      <section ref={approvalsSectionRef}>
        <ApprovalQueue
          key={`approvals-search-${approvalsSearchVersion}`}
          items={approvals}
          loading={approvalsLoading}
          error={approvalsError}
          busyApprovalId={busyApprovalId}
          onApprove={(approvalId) => handleApprovalDecision(approvalId, "approve")}
          onReject={(approvalId) => handleApprovalDecision(approvalId, "reject")}
          searchPreset={approvalsSearchPreset}
          focusLabel={approvalsFocusLabel}
          onClearFocus={clearApprovalsFocus}
          lastRefreshedAt={approvalsRefreshedAt}
          updateBadgeLabel={getFocusedSectionUpdateLabel("approvals")}
          onRefresh={() => {
            void refreshApprovalsSection();
          }}
          refreshing={approvalsRefreshing}
        />
      </section>

      <div ref={eventsSectionRef}>
        <TaskTimeline
          key={`events-search-${eventsSearchVersion}`}
          items={events}
          loading={eventsLoading}
          error={eventsError}
          searchPreset={eventsSearchPreset}
          focusLabel={eventsFocusLabel}
          onClearFocus={clearEventsFocus}
          lastRefreshedAt={eventsRefreshedAt}
          updateBadgeLabel={getFocusedSectionUpdateLabel("events")}
          onRefresh={() => {
            void refreshEventsSection();
          }}
          refreshing={eventsRefreshing}
        />
      </div>
      <div ref={artifactsSectionRef}>
        <ArtifactsPanel
          key={`artifacts-search-${artifactsSearchVersion}`}
          items={artifacts}
          loading={artifactsLoading}
          error={artifactsError}
          selectedArtifactId={selectedArtifactId}
          onSelectArtifact={openArtifactDetail}
          searchPreset={artifactsSearchPreset}
          focusLabel={artifactsFocusLabel}
          onClearFocus={clearArtifactsFocus}
          lastRefreshedAt={artifactsRefreshedAt}
          updateBadgeLabel={getFocusedSectionUpdateLabel("artifacts")}
          onRefresh={() => {
            void refreshDashboardStateForScope("records");
          }}
          refreshing={recordsRefreshing}
        />
      </div>
      <div ref={executionsSectionRef}>
        <ExecutionsPanel
          key={`executions-search-${executionsSearchVersion}`}
          items={executions}
          loading={executionsLoading}
          error={executionsError}
          selectedExecutionId={selectedExecutionId}
          onSelectExecution={openExecutionDetail}
          searchPreset={executionsSearchPreset}
          focusLabel={executionsFocusLabel}
          onClearFocus={clearExecutionsFocus}
          lastRefreshedAt={executionsRefreshedAt}
          updateBadgeLabel={getFocusedSectionUpdateLabel("executions")}
          onRefresh={() => {
            void refreshDashboardStateForScope("records");
          }}
          refreshing={recordsRefreshing}
        />
      </div>
      <div ref={runsSectionRef}>
        <RunsPanel
          key={`runs-search-${runsSearchVersion}`}
          items={runs}
          runAudits={runAudits}
          settingsPatchAuditSummary={settingsPatchAuditSummary}
          selectedToolFilter={selectedToolFilter}
          onToolFilterChange={handleToolFilterChange}
          selectedAuditFilter={selectedAuditFilter}
          onAuditFilterChange={handleAuditFilterChange}
          loading={runsLoading}
          error={runsError}
          selectedRunId={selectedRunId}
          onSelectRun={openRunDetail}
          searchPreset={runsSearchPreset}
          focusLabel={runsFocusLabel}
          onClearFocus={clearRunsFocus}
          lastRefreshedAt={runsRefreshedAt}
          updateBadgeLabel={getFocusedSectionUpdateLabel("runs")}
          onRefresh={() => {
            void refreshDashboardStateForScope("records");
          }}
          refreshing={recordsRefreshing}
        />
      </div>
      <div ref={runDetailSectionRef}>
        <RunDetailPanel
          item={selectedRun}
          loading={selectedRunLoading}
          error={selectedRunError}
          breadcrumbs={runDetailBreadcrumbs}
          executionDetails={selectedExecutionDetails}
          relatedExecutionId={
            selectedRunPreferredExecution?.id ?? null
          }
          relatedExecutionPriorityLabel={
            relatedExecutionPriority?.label ?? null
          }
          relatedExecutionPriorityDescription={
            relatedExecutionPriority?.description ?? null
          }
          relatedExecutionActionLabel={
            relatedExecutionAction?.label ?? null
          }
          relatedExecutionActionDescription={
            relatedExecutionAction?.description ?? null
          }
          relatedExecutionAttentionLabel={
            relatedExecutionAttention?.label ?? null
          }
          relatedExecutionAttentionDescription={
            relatedExecutionAttention?.description ?? null
          }
          priorityShortcutLabel={selectedRunPreferredExecution ? "Open highest-priority execution" : null}
          priorityShortcutDescription={selectedRunPreferredExecution
            ? `Jump directly to ${describeExecutionPriority(
              selectedRunPreferredExecution,
              executions.filter((execution) => execution.run_id === selectedRunPreferredExecution.run_id),
              selectedExecutionId,
            ).description}`
            : null}
          warningShortcutLabel={selectedRunWarningExecution ? "Open next warning-bearing execution" : null}
          warningShortcutDescription={selectedRunWarningExecution
            ? `Jump directly to the related execution carrying ${selectedRunWarningExecution.warning_count} persisted warning${selectedRunWarningExecution.warning_count === 1 ? "" : "s"}.`
            : null}
          originatingArtifactId={runOriginArtifact?.id ?? null}
          originatingArtifactLabel={runOriginArtifact?.label ?? null}
          originatingArtifactKind={runOriginArtifact?.kind ?? null}
          selectedRunId={selectedRunId}
          selectedExecutionId={selectedExecutionId}
          selectedArtifactId={selectedArtifactId}
          pinnedRecordId={pinnedRecord?.kind === "run" ? pinnedRecord.id : null}
          pinnedRecordStatusLabel={pinnedRecord?.kind === "run" ? pinnedRecordStatus?.label ?? null : null}
          pinnedRecordStatusDetail={pinnedRecord?.kind === "run" ? pinnedRecordStatus?.detail ?? null : null}
          laneQueueLabel={pinnedRecord?.kind === "run" ? nextPinnedLaneRecord?.label ?? null : null}
          laneQueueDetail={pinnedRecord?.kind === "run" ? nextPinnedLaneRecord?.detail ?? null : null}
          laneCompletionLabel={pinnedRecord?.kind === "run" ? pinnedLaneCompletionState?.label ?? null : null}
          laneCompletionDetail={pinnedRecord?.kind === "run" ? pinnedLaneCompletionState?.detail ?? null : null}
          laneRolloverLabel={pinnedRecord?.kind === "run" ? pinnedLaneRolloverRecord?.label ?? null : null}
          laneRolloverDetail={pinnedRecord?.kind === "run" ? pinnedLaneRolloverRecord?.detail ?? null : null}
          laneMetricsLabel={pinnedRecord?.kind === "run" ? pinnedLaneMetrics?.label ?? null : null}
          laneMetricsDetail={pinnedRecord?.kind === "run" ? pinnedLaneMetrics?.detail ?? null : null}
          laneDriverLabel={pinnedRecord?.kind === "run" ? pinnedLaneMetrics?.driverLabel ?? null : null}
          laneDriverDetail={pinnedRecord?.kind === "run" ? pinnedLaneMetrics?.driverDetail ?? null : null}
          laneMemoryLabel={pinnedRecord?.kind !== "run" ? laneMemory?.pinnedLabel ?? null : null}
          laneMemoryDetail={pinnedRecord?.kind !== "run" ? laneMemory?.detail ?? null : null}
          laneHistoryEntries={pinnedRecord?.kind !== "run" ? laneHistory : []}
          laneHandoffLabel={laneHandoffSummary?.label ?? null}
          laneHandoffDetail={laneHandoffSummary?.detail ?? null}
          laneExportLabel={laneExportStatus?.label ?? null}
          laneExportDetail={laneExportStatus?.detail ?? null}
          laneOperatorNoteLabel={activeLaneOperatorNote?.label ?? null}
          laneOperatorNoteDetail={activeLaneOperatorNote?.detail ?? null}
          activeLanePresetLabel={lanePresetStatus?.activeLabel ?? null}
          activeLanePresetDetail={lanePresetStatus?.activeDetail ?? null}
          lanePresetRestoredLabel={lanePresetStatus?.restoredLabel ?? null}
          lanePresetRestoredDetail={lanePresetStatus?.restoredDetail ?? null}
          lanePresetDriftLabel={lanePresetStatus?.driftLabel ?? null}
          lanePresetDriftDetail={lanePresetStatus?.driftDetail ?? null}
          onOpenExecution={openExecutionDetail}
          onOpenArtifact={openArtifactDetail}
          onOpenPriorityRecord={selectedRunPreferredExecution
            ? () => openExecutionDetail(selectedRunPreferredExecution.id)
            : null}
          onOpenWarningRecord={selectedRunWarningExecution
            ? () => openExecutionDetail(selectedRunWarningExecution.id)
            : null}
          onPinRecord={() => pinRunRecord(selectedRun)}
          onUnpinRecord={pinnedRecord?.kind === "run" && selectedRun?.id === pinnedRecord.id
            ? () => setPinnedRecord(null)
            : null}
          onRefocusPinnedRecord={pinnedRecord?.kind === "run" ? openPinnedRecord : null}
          onOpenNextLaneRecord={pinnedRecord?.kind === "run" && nextPinnedLaneRecord ? openPinnedLaneQueueRecord : null}
          onOpenLaneRolloverRecord={pinnedRecord?.kind === "run" && pinnedLaneRolloverRecord ? openPinnedLaneRolloverRecord : null}
          onReturnToLane={pinnedRecord?.kind !== "run" && laneMemory ? restoreLaneMemory : null}
          onOpenLaneHistoryEntry={pinnedRecord?.kind !== "run" ? openLaneHistoryEntry : null}
          refreshHint={runDetailRefreshHint}
          lastRefreshedAt={runDetailRefreshedAt}
          onRefresh={() => {
            void refreshRunDetailSection();
          }}
          refreshing={runDetailRefreshing || selectedRunLoading}
        />
      </div>
      <div ref={executionDetailSectionRef}>
        <ExecutionDetailPanel
          item={selectedExecution}
          loading={selectedExecutionLoading}
          error={selectedExecutionError}
          breadcrumbs={executionDetailBreadcrumbs}
          selectedRunId={selectedRunId}
          selectedExecutionId={selectedExecutionId}
          selectedArtifactId={selectedArtifactId}
          pinnedRecordId={pinnedRecord?.kind === "execution" ? pinnedRecord.id : null}
          pinnedRecordStatusLabel={pinnedRecord?.kind === "execution" ? pinnedRecordStatus?.label ?? null : null}
          pinnedRecordStatusDetail={pinnedRecord?.kind === "execution" ? pinnedRecordStatus?.detail ?? null : null}
          laneQueueLabel={pinnedRecord?.kind === "execution" ? nextPinnedLaneRecord?.label ?? null : null}
          laneQueueDetail={pinnedRecord?.kind === "execution" ? nextPinnedLaneRecord?.detail ?? null : null}
          laneCompletionLabel={pinnedRecord?.kind === "execution" ? pinnedLaneCompletionState?.label ?? null : null}
          laneCompletionDetail={pinnedRecord?.kind === "execution" ? pinnedLaneCompletionState?.detail ?? null : null}
          laneRolloverLabel={pinnedRecord?.kind === "execution" ? pinnedLaneRolloverRecord?.label ?? null : null}
          laneRolloverDetail={pinnedRecord?.kind === "execution" ? pinnedLaneRolloverRecord?.detail ?? null : null}
          laneMetricsLabel={pinnedRecord?.kind === "execution" ? pinnedLaneMetrics?.label ?? null : null}
          laneMetricsDetail={pinnedRecord?.kind === "execution" ? pinnedLaneMetrics?.detail ?? null : null}
          laneDriverLabel={pinnedRecord?.kind === "execution" ? pinnedLaneMetrics?.driverLabel ?? null : null}
          laneDriverDetail={pinnedRecord?.kind === "execution" ? pinnedLaneMetrics?.driverDetail ?? null : null}
          laneMemoryLabel={pinnedRecord?.kind !== "execution" ? laneMemory?.pinnedLabel ?? null : null}
          laneMemoryDetail={pinnedRecord?.kind !== "execution" ? laneMemory?.detail ?? null : null}
          laneHistoryEntries={pinnedRecord?.kind !== "execution" ? laneHistory : []}
          laneHandoffLabel={laneHandoffSummary?.label ?? null}
          laneHandoffDetail={laneHandoffSummary?.detail ?? null}
          laneExportLabel={laneExportStatus?.label ?? null}
          laneExportDetail={laneExportStatus?.detail ?? null}
          laneOperatorNoteLabel={activeLaneOperatorNote?.label ?? null}
          laneOperatorNoteDetail={activeLaneOperatorNote?.detail ?? null}
          activeLanePresetLabel={lanePresetStatus?.activeLabel ?? null}
          activeLanePresetDetail={lanePresetStatus?.activeDetail ?? null}
          lanePresetRestoredLabel={lanePresetStatus?.restoredLabel ?? null}
          lanePresetRestoredDetail={lanePresetStatus?.restoredDetail ?? null}
          lanePresetDriftLabel={lanePresetStatus?.driftLabel ?? null}
          lanePresetDriftDetail={lanePresetStatus?.driftDetail ?? null}
          priorityShortcutLabel={selectedExecutionPreferredArtifact ? "Open highest-priority artifact" : null}
          priorityShortcutDescription={selectedExecutionPreferredArtifact
            ? `Jump directly to ${describeArtifactPriority(
              selectedExecutionPreferredArtifact,
              artifacts.filter((artifact) => artifact.execution_id === selectedExecutionPreferredArtifact.execution_id),
              selectedArtifactId,
            ).description}`
            : null}
          warningShortcutLabel={selectedExecutionHighestRiskArtifact ? "Open highest-risk related artifact" : null}
          warningShortcutDescription={selectedExecutionHighestRiskArtifact
            ? "Jump directly to the related artifact with the strongest persisted risk markers, such as simulated output or mutation-audit failure state."
            : null}
          relatedArtifacts={
            selectedExecution
              ? artifacts.filter((artifact) => artifact.execution_id === selectedExecution.id)
              : []
          }
          originatingArtifactLabel={executionOriginArtifact?.label ?? null}
          originatingArtifactKind={executionOriginArtifact?.kind ?? null}
          onOpenRun={openRunDetail}
          onOpenArtifact={openArtifactDetail}
          onOpenPriorityRecord={selectedExecutionPreferredArtifact
            ? () => openArtifactDetail(selectedExecutionPreferredArtifact.id)
            : null}
          onOpenWarningRecord={selectedExecutionHighestRiskArtifact
            ? () => openArtifactDetail(selectedExecutionHighestRiskArtifact.id)
            : null}
          onPinRecord={() => pinExecutionRecord(selectedExecution)}
          onUnpinRecord={pinnedRecord?.kind === "execution" && selectedExecution?.id === pinnedRecord.id
            ? () => setPinnedRecord(null)
            : null}
          onRefocusPinnedRecord={pinnedRecord?.kind === "execution" ? openPinnedRecord : null}
          onOpenNextLaneRecord={pinnedRecord?.kind === "execution" && nextPinnedLaneRecord ? openPinnedLaneQueueRecord : null}
          onOpenLaneRolloverRecord={pinnedRecord?.kind === "execution" && pinnedLaneRolloverRecord ? openPinnedLaneRolloverRecord : null}
          onReturnToLane={pinnedRecord?.kind !== "execution" && laneMemory ? restoreLaneMemory : null}
          onOpenLaneHistoryEntry={pinnedRecord?.kind !== "execution" ? openLaneHistoryEntry : null}
          refreshHint={executionDetailRefreshHint}
          lastRefreshedAt={executionDetailRefreshedAt}
          onRefresh={() => {
            void refreshExecutionDetailSection();
          }}
          refreshing={executionDetailRefreshing || selectedExecutionLoading}
        />
      </div>
      <div ref={artifactDetailSectionRef}>
        <ArtifactDetailPanel
          item={selectedArtifact}
          loading={selectedArtifactLoading}
          error={selectedArtifactError}
          breadcrumbs={artifactDetailBreadcrumbs}
          selectedRunId={selectedRunId}
          selectedExecutionId={selectedExecutionId}
          selectedArtifactId={selectedArtifactId}
          pinnedRecordId={pinnedRecord?.kind === "artifact" ? pinnedRecord.id : null}
          pinnedRecordStatusLabel={pinnedRecord?.kind === "artifact" ? pinnedRecordStatus?.label ?? null : null}
          pinnedRecordStatusDetail={pinnedRecord?.kind === "artifact" ? pinnedRecordStatus?.detail ?? null : null}
          laneQueueLabel={pinnedRecord?.kind === "artifact" ? nextPinnedLaneRecord?.label ?? null : null}
          laneQueueDetail={pinnedRecord?.kind === "artifact" ? nextPinnedLaneRecord?.detail ?? null : null}
          laneCompletionLabel={pinnedRecord?.kind === "artifact" ? pinnedLaneCompletionState?.label ?? null : null}
          laneCompletionDetail={pinnedRecord?.kind === "artifact" ? pinnedLaneCompletionState?.detail ?? null : null}
          laneRolloverLabel={pinnedRecord?.kind === "artifact" ? pinnedLaneRolloverRecord?.label ?? null : null}
          laneRolloverDetail={pinnedRecord?.kind === "artifact" ? pinnedLaneRolloverRecord?.detail ?? null : null}
          laneMetricsLabel={pinnedRecord?.kind === "artifact" ? pinnedLaneMetrics?.label ?? null : null}
          laneMetricsDetail={pinnedRecord?.kind === "artifact" ? pinnedLaneMetrics?.detail ?? null : null}
          laneDriverLabel={pinnedRecord?.kind === "artifact" ? pinnedLaneMetrics?.driverLabel ?? null : null}
          laneDriverDetail={pinnedRecord?.kind === "artifact" ? pinnedLaneMetrics?.driverDetail ?? null : null}
          laneMemoryLabel={pinnedRecord?.kind !== "artifact" ? laneMemory?.pinnedLabel ?? null : null}
          laneMemoryDetail={pinnedRecord?.kind !== "artifact" ? laneMemory?.detail ?? null : null}
          laneHistoryEntries={pinnedRecord?.kind !== "artifact" ? laneHistory : []}
          laneHandoffLabel={laneHandoffSummary?.label ?? null}
          laneHandoffDetail={laneHandoffSummary?.detail ?? null}
          laneExportLabel={laneExportStatus?.label ?? null}
          laneExportDetail={laneExportStatus?.detail ?? null}
          laneOperatorNoteLabel={activeLaneOperatorNote?.label ?? null}
          laneOperatorNoteDetail={activeLaneOperatorNote?.detail ?? null}
          activeLanePresetLabel={lanePresetStatus?.activeLabel ?? null}
          activeLanePresetDetail={lanePresetStatus?.activeDetail ?? null}
          lanePresetRestoredLabel={lanePresetStatus?.restoredLabel ?? null}
          lanePresetRestoredDetail={lanePresetStatus?.restoredDetail ?? null}
          lanePresetDriftLabel={lanePresetStatus?.driftLabel ?? null}
          lanePresetDriftDetail={lanePresetStatus?.driftDetail ?? null}
          priorityShortcutLabel={selectedArtifactSiblingPriority ? "Open highest-priority sibling artifact" : null}
          priorityShortcutDescription={selectedArtifactSiblingPriority
            ? `Jump directly to ${describeArtifactPriority(
              selectedArtifactSiblingPriority,
              artifacts.filter((artifact) => artifact.execution_id === selectedArtifactSiblingPriority.execution_id),
              selectedArtifactId,
            ).description}`
            : null}
          warningShortcutLabel={selectedArtifactHighestRiskSibling ? "Open highest-risk sibling artifact" : null}
          warningShortcutDescription={selectedArtifactHighestRiskSibling
            ? "Jump directly to the sibling artifact with the strongest persisted risk markers, such as simulated output or mutation-audit rollback or failure state."
            : null}
          relatedArtifacts={
            selectedArtifact
              ? artifacts.filter((artifact) => artifact.execution_id === selectedArtifact.execution_id)
              : []
          }
          relatedRunStatus={relatedArtifactRun?.status ?? null}
          relatedRunSummary={relatedArtifactRun?.result_summary ?? null}
          relatedExecutionStatus={relatedArtifactExecution?.status ?? null}
          relatedExecutionSummary={relatedArtifactExecution?.result_summary ?? null}
          relatedExecutionMode={relatedArtifactExecution?.execution_mode ?? null}
          relatedExecutionStartedAt={relatedArtifactExecution?.started_at ?? null}
          relatedExecutionWarningCount={relatedArtifactExecution?.warning_count ?? null}
          onOpenRun={openRunDetail}
          onOpenExecution={openExecutionDetail}
          onOpenArtifact={openArtifactDetail}
          onOpenPriorityRecord={selectedArtifactSiblingPriority
            ? () => openArtifactDetail(selectedArtifactSiblingPriority.id)
            : null}
          onOpenWarningRecord={selectedArtifactHighestRiskSibling
            ? () => openArtifactDetail(selectedArtifactHighestRiskSibling.id)
            : null}
          onPinRecord={() => pinArtifactRecord(selectedArtifact)}
          onUnpinRecord={pinnedRecord?.kind === "artifact" && selectedArtifact?.id === pinnedRecord.id
            ? () => setPinnedRecord(null)
            : null}
          onRefocusPinnedRecord={pinnedRecord?.kind === "artifact" ? openPinnedRecord : null}
          onOpenNextLaneRecord={pinnedRecord?.kind === "artifact" && nextPinnedLaneRecord ? openPinnedLaneQueueRecord : null}
          onOpenLaneRolloverRecord={pinnedRecord?.kind === "artifact" && pinnedLaneRolloverRecord ? openPinnedLaneRolloverRecord : null}
          onReturnToLane={pinnedRecord?.kind !== "artifact" && laneMemory ? restoreLaneMemory : null}
          onOpenLaneHistoryEntry={pinnedRecord?.kind !== "artifact" ? openLaneHistoryEntry : null}
          refreshHint={artifactDetailRefreshHint}
          lastRefreshedAt={artifactDetailRefreshedAt}
          onRefresh={() => {
            void refreshArtifactDetailSection();
          }}
          refreshing={artifactDetailRefreshing || selectedArtifactLoading}
        />
      </div>
      <LocksPanel
        items={locks}
        loading={locksLoading}
        error={locksError}
      />
      <PoliciesPanel
        items={policies}
        loading={policiesLoading}
        error={policiesError}
      />
    </main>
  );
}

function getRefreshScopePendingDetail(scope: RefreshScope): string {
  if (scope === "overview") {
    return "Refreshing catalog, adapter, system status, overview, and policy surfaces.";
  }
  if (scope === "records") {
    return "Refreshing runs, executions, artifacts, and any selected detail records.";
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
