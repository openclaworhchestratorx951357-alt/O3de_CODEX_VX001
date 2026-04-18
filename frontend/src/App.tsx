import { useEffect, useState } from "react";

import AgentPanel from "./components/AgentPanel";
import ApprovalQueue from "./components/ApprovalQueue";
import CatalogPanel from "./components/CatalogPanel";
import DispatchForm from "./components/DispatchForm";
import ExecutionsPanel from "./components/ExecutionsPanel";
import LayoutHeader from "./components/LayoutHeader";
import LocksPanel from "./components/LocksPanel";
import PoliciesPanel from "./components/PoliciesPanel";
import ResponseEnvelopeView from "./components/ResponseEnvelopeView";
import RunsPanel from "./components/RunsPanel";
import TaskTimeline from "./components/TaskTimeline";
import { mockAgents } from "./data/mockAgents";
import {
  approveApproval,
  fetchApprovals,
  fetchEvents,
  fetchExecutions,
  fetchLocks,
  fetchPolicies,
  fetchRuns,
  fetchToolsCatalog,
  rejectApproval,
} from "./lib/api";
import type {
  ApprovalRecord,
  CatalogAgent,
  EventRecord,
  ExecutionRecord,
  LockRecord,
  ResponseEnvelope,
  RunRecord,
  ToolPolicy,
} from "./types/contracts";

type ToolsCatalog = {
  agents: CatalogAgent[];
};

export default function App() {
  const [lastResponse, setLastResponse] = useState<ResponseEnvelope | null>(null);
  const [catalogAgents, setCatalogAgents] = useState<CatalogAgent[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [locks, setLocks] = useState<LockRecord[]>([]);
  const [policies, setPolicies] = useState<ToolPolicy[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [executionsError, setExecutionsError] = useState<string | null>(null);
  const [locksError, setLocksError] = useState<string | null>(null);
  const [policiesError, setPoliciesError] = useState<string | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [approvalsLoading, setApprovalsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [executionsLoading, setExecutionsLoading] = useState(true);
  const [locksLoading, setLocksLoading] = useState(true);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);
  const [busyApprovalId, setBusyApprovalId] = useState<string | null>(null);

  async function loadApprovals() {
    setApprovalsLoading(true);
    try {
      const nextApprovals = await fetchApprovals();
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

  async function loadEvents() {
    setEventsLoading(true);
    try {
      const nextEvents = await fetchEvents();
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

  async function loadRuns() {
    setRunsLoading(true);
    try {
      const nextRuns = await fetchRuns();
      setRuns(nextRuns);
      setRunsError(null);
    } catch (error) {
      setRunsError(
        error instanceof Error ? error.message : "Failed to load runs",
      );
    } finally {
      setRunsLoading(false);
    }
  }

  async function loadExecutions() {
    setExecutionsLoading(true);
    try {
      const nextExecutions = await fetchExecutions();
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
      const nextLocks = await fetchLocks();
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
      await loadEvents();
      await loadExecutions();
      await loadLocks();
      await loadPolicies();
      await loadRuns();
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
      await loadEvents();
      await loadExecutions();
      await loadLocks();
      await loadPolicies();
      await loadRuns();
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
    void loadEvents();
    void loadExecutions();
    void loadLocks();
    void loadPolicies();
    void loadRuns();
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

      <section>
        <ApprovalQueue
          items={approvals}
          loading={approvalsLoading}
          error={approvalsError}
          busyApprovalId={busyApprovalId}
          onApprove={(approvalId) => handleApprovalDecision(approvalId, "approve")}
          onReject={(approvalId) => handleApprovalDecision(approvalId, "reject")}
        />
      </section>

      <TaskTimeline
        items={events}
        loading={eventsLoading}
        error={eventsError}
      />
      <ExecutionsPanel
        items={executions}
        loading={executionsLoading}
        error={executionsError}
      />
      <RunsPanel
        items={runs}
        loading={runsLoading}
        error={runsError}
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
