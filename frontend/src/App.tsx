import { useEffect, useRef, useState } from "react";

import AgentPanel from "./components/AgentPanel";
import AdaptersPanel from "./components/AdaptersPanel";
import ArtifactsPanel from "./components/ArtifactsPanel";
import ApprovalQueue from "./components/ApprovalQueue";
import CatalogPanel from "./components/CatalogPanel";
import DispatchForm from "./components/DispatchForm";
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
import type {
  ArtifactListItem,
  AdaptersResponse,
  ApprovalListItem,
  CatalogAgent,
  ControlPlaneSummaryResponse,
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

type AuditFilter =
  | "all"
  | "preflight"
  | "blocked"
  | "succeeded"
  | "rolled_back"
  | "other";

type ToolFilter = "all" | "settings.patch";

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
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);
  const [selectedToolFilter, setSelectedToolFilter] =
    useState<ToolFilter>("all");
  const [selectedAuditFilter, setSelectedAuditFilter] =
    useState<AuditFilter>("all");
  const [runsSearchPreset, setRunsSearchPreset] = useState<string | null>(null);
  const [approvalsSearchPreset, setApprovalsSearchPreset] = useState<string | null>(null);
  const [artifactsSearchPreset, setArtifactsSearchPreset] = useState<string | null>(null);
  const [executionsSearchPreset, setExecutionsSearchPreset] = useState<string | null>(null);
  const [eventsSearchPreset, setEventsSearchPreset] = useState<string | null>(null);
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

  async function loadApprovals() {
    setApprovalsLoading(true);
    try {
      const nextApprovals = await fetchApprovalCards();
      setApprovals(nextApprovals);
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
      setArtifactsError(null);
    } catch (error) {
      setArtifactsError(
        error instanceof Error ? error.message : "Failed to load artifacts",
      );
    } finally {
      setArtifactsLoading(false);
    }
  }

  async function loadRuns(
    toolFilter: ToolFilter = selectedToolFilter,
    auditFilter: AuditFilter = selectedAuditFilter,
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
      setRunsError(null);
    } catch (error) {
      setRunsError(
        error instanceof Error ? error.message : "Failed to load runs",
      );
    } finally {
      setRunsLoading(false);
    }
  }

  async function loadRunDetail(runId: string) {
    setSelectedRunId(runId);
    setSelectedRunLoading(true);
    setSelectedExecutionDetails(null);
    try {
      const nextRun = await fetchRun(runId);
      setSelectedRun(nextRun);
      const matchingExecution = executions.find((execution) => execution.run_id === runId);
      if (matchingExecution) {
        const nextExecution = await fetchExecution(matchingExecution.id);
        setSelectedExecutionDetails(
          (nextExecution.details as Record<string, unknown> | null | undefined) ?? null,
        );
      }
      setSelectedRunError(null);
    } catch (error) {
      setSelectedRunError(
        error instanceof Error ? error.message : "Failed to load run detail",
      );
    } finally {
      setSelectedRunLoading(false);
    }
  }

  async function loadExecutions() {
    setExecutionsLoading(true);
    try {
      const nextExecutions = await fetchExecutionCards();
      setExecutions(nextExecutions);
      setExecutionsError(null);
    } catch (error) {
      setExecutionsError(
        error instanceof Error ? error.message : "Failed to load executions",
      );
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
      try {
        const catalog = (await fetchToolsCatalog()) as ToolsCatalog;
        setCatalogAgents(catalog.agents ?? []);
      } catch (error) {
        setCatalogError(
          error instanceof Error ? error.message : "Failed to load tools catalog",
        );
      }

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
      await loadApprovals();
      await loadAdapters();
      await loadArtifacts();
      await loadEvents();
      await loadExecutions();
      await loadLocks();
      await loadPolicies();
      await loadReadiness();
      await loadControlPlaneSummary();
      await loadRuns(selectedToolFilter, selectedAuditFilter);
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
    void loadApprovals();
    void loadArtifacts();
    void loadEvents();
    void loadExecutions();
    void loadLocks();
    void loadPolicies();
    void loadReadiness();
    void loadControlPlaneSummary();
    void loadRuns(selectedToolFilter, selectedAuditFilter);
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

  async function handleRunStatusDrilldown(status: string) {
    setSelectedToolFilter("all");
    setSelectedAuditFilter("all");
    setRunsSearchPreset(status);
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
    setApprovalsSearchVersion((value) => value + 1);
    scrollToSection(approvalsSectionRef.current);
  }

  function handleExecutionModeDrilldown(mode: string) {
    setExecutionsSearchPreset(mode);
    setExecutionsSearchVersion((value) => value + 1);
    scrollToSection(executionsSectionRef.current);
  }

  function handleArtifactModeDrilldown(mode: string) {
    setArtifactsSearchPreset(mode);
    setArtifactsSearchVersion((value) => value + 1);
    scrollToSection(artifactsSectionRef.current);
  }

  function handleEventSeverityDrilldown(severity: string) {
    setEventsSearchPreset(severity);
    setEventsSearchVersion((value) => value + 1);
    scrollToSection(eventsSectionRef.current);
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
        onRunStatusSelect={handleRunStatusDrilldown}
        onPendingApprovalsSelect={handlePendingApprovalsDrilldown}
        onExecutionModeSelect={handleExecutionModeDrilldown}
        onArtifactModeSelect={handleArtifactModeDrilldown}
        onEventSeveritySelect={handleEventSeverityDrilldown}
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
        />
      </section>

      <div ref={eventsSectionRef}>
        <TaskTimeline
          key={`events-search-${eventsSearchVersion}`}
          items={events}
          loading={eventsLoading}
          error={eventsError}
          searchPreset={eventsSearchPreset}
        />
      </div>
      <div ref={artifactsSectionRef}>
        <ArtifactsPanel
          key={`artifacts-search-${artifactsSearchVersion}`}
          items={artifacts}
          loading={artifactsLoading}
          error={artifactsError}
          searchPreset={artifactsSearchPreset}
        />
      </div>
      <div ref={executionsSectionRef}>
        <ExecutionsPanel
          key={`executions-search-${executionsSearchVersion}`}
          items={executions}
          loading={executionsLoading}
          error={executionsError}
          searchPreset={executionsSearchPreset}
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
          onSelectRun={(runId) => void loadRunDetail(runId)}
          searchPreset={runsSearchPreset}
        />
      </div>
      <RunDetailPanel
        item={selectedRun}
        loading={selectedRunLoading}
        error={selectedRunError}
        executionDetails={selectedExecutionDetails}
      />
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
