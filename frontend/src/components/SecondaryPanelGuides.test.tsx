import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ExecutorDetailPanel from "./ExecutorDetailPanel";
import ExecutorsPanel from "./ExecutorsPanel";
import LocksPanel from "./LocksPanel";
import PoliciesPanel from "./PoliciesPanel";
import ResponseEnvelopeView from "./ResponseEnvelopeView";
import WorkspacesPanel from "./WorkspacesPanel";
import type {
  ArtifactListItem,
  EventListItem,
  ExecutionListItem,
  ExecutorRecord,
  LockListItem,
  ResponseEnvelope,
  RunListItem,
  ToolPolicy,
  WorkspaceRecord,
} from "../types/contracts";

const successResponse: ResponseEnvelope = {
  request_id: "req-1",
  ok: true,
  timing_ms: 842,
  result: {
    execution_mode: "real",
    summary: "editor.level.open completed",
  },
  warnings: ["Heartbeat snapshot still warming"],
  logs: ["bridge response received"],
  artifacts: ["artifact://level/default"],
  state: {
    dirty: false,
    requires_save: false,
    requires_reconfigure: false,
    requires_rebuild: false,
    requires_asset_reprocess: false,
  },
};

const failureResponse: ResponseEnvelope = {
  request_id: "req-2",
  ok: false,
  timing_ms: 1200,
  error: {
    code: "RESOURCE_BUSY",
    message: "Editor bridge was busy processing another request.",
    retryable: true,
    details: {
      queue_depth: 1,
    },
  },
};

const locks: LockListItem[] = [
  {
    name: "editor_session",
    owner_run_id: "run-1",
    created_at: "2026-04-21T10:00:00Z",
  },
];

const policies: ToolPolicy[] = [
  {
    agent: "editor-control",
    tool: "editor.level.open",
    approval_class: "read_only",
    adapter_family: "editor-control",
    capability_status: "real-authoring",
    real_admission_stage: "admitted-real",
    next_real_requirement: "Maintain live proof on the canonical backend.",
    args_schema: "EditorLevelOpenArgs",
    result_schema: "EditorLevelOpenResult",
    required_locks: ["editor_session"],
    risk: "low",
    requires_approval: false,
    supports_dry_run: true,
    execution_mode: "real",
  },
];

const executor: ExecutorRecord = {
  id: "executor-1",
  executor_kind: "desktop-editor",
  executor_label: "McpSandbox Editor",
  executor_host_label: "local-windows",
  execution_mode_class: "hybrid",
  availability_state: "available",
  supported_runner_families: ["editor-control"],
  capability_snapshot: {
    real_tool_paths: ["editor.session.open", "editor.level.open"],
    simulated_tool_paths: ["editor.entity.create"],
  },
  last_heartbeat_at: "2026-04-21T10:03:00Z",
  last_failure_summary: null,
  created_at: "2026-04-21T09:00:00Z",
  updated_at: "2026-04-21T10:03:00Z",
};

const workspace: WorkspaceRecord = {
  id: "workspace-1",
  workspace_kind: "local-project",
  workspace_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
  workspace_state: "ready",
  cleanup_policy: "retain-until-review",
  retention_class: "operator-review",
  engine_binding: {
    engine_root: "C:/src/o3de",
  },
  project_binding: {
    project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
  },
  runner_family: "editor-control",
  owner_run_id: "run-1",
  owner_execution_id: "exec-1",
  owner_executor_id: "executor-1",
  created_at: "2026-04-21T09:00:00Z",
  activated_at: "2026-04-21T09:02:00Z",
  completed_at: null,
  cleaned_at: null,
  last_failure_summary: null,
};

const relatedExecutions: ExecutionListItem[] = [
  {
    id: "exec-1",
    run_id: "run-1",
    request_id: "req-1",
    agent: "editor-control",
    tool: "editor.level.open",
    execution_mode: "real",
    status: "succeeded",
    started_at: "2026-04-21T09:00:30Z",
    finished_at: "2026-04-21T09:00:50Z",
    result_summary: "Execution completed.",
    warning_count: 0,
    artifact_count: 1,
    failure_category: "none",
  },
];

const relatedRuns: RunListItem[] = [
  {
    id: "run-1",
    request_id: "req-1",
    agent: "editor-control",
    tool: "editor.level.open",
    status: "succeeded",
    dry_run: false,
    execution_mode: "real",
    result_summary: "Run completed.",
  },
];

const relatedArtifacts: ArtifactListItem[] = [
  {
    id: "artifact-1",
    run_id: "run-1",
    execution_id: "exec-1",
    label: "Opened level evidence",
    kind: "json",
    uri: "artifact://level/default",
    simulated: false,
    created_at: "2026-04-21T09:01:00Z",
    execution_mode: "real",
  },
];

const relatedEvents: EventListItem[] = [
  {
    id: "event-1",
    run_id: "run-1",
    execution_id: "exec-1",
    executor_id: "executor-1",
    workspace_id: "workspace-1",
    category: "runtime",
    event_type: "heartbeat",
    severity: "info",
    message: "Executor heartbeat observed.",
    created_at: "2026-04-21T09:01:10Z",
    previous_state: null,
    current_state: "available",
    failure_category: null,
    capability_status: "real-authoring",
    adapter_mode: "hybrid",
    event_state: "observed",
  },
];

describe("secondary panel guides", () => {
  it("renders guide affordances for response, locks, and policies panels", () => {
    render(
      <>
        <ResponseEnvelopeView response={successResponse} />
        <ResponseEnvelopeView response={failureResponse} />
        <LocksPanel items={locks} loading={false} error={null} />
        <PoliciesPanel items={policies} loading={false} error={null} />
      </>,
    );

    expect(screen.getAllByText("How to use this panel").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("success")).toHaveAttribute(
      "title",
      "Read the status badge as the immediate dispatch outcome only; it is not a substitute for persisted run or execution evidence.",
    );
    expect(screen.getByText("Result").closest("section")).toHaveAttribute(
      "title",
      "Inspect the result payload when you need the raw returned fields from the latest dispatch.",
    );
    expect(screen.getByText("Error").closest("section")).toHaveAttribute(
      "title",
      "Inspect the error payload to confirm code, message, retryability, and any structured details from the latest dispatch.",
    );
    expect(screen.getByText("Owner run: run-1").parentElement).toHaveAttribute(
      "title",
      "Review each lock record to confirm the lock name, owner run, and creation time before escalating coordination issues.",
    );
    expect(screen.getByPlaceholderText("Search policies by tool, agent, capability, risk, or locks")).toHaveAttribute(
      "title",
      "Search policies by tool, agent, capability, risk, or required locks without leaving governance.",
    );
    expect(screen.getByText("editor.level.open").closest("div")).toHaveAttribute(
      "title",
      "Read each policy entry as the governed truth for approval class, capability posture, and next requirement.",
    );
  });

  it("renders guide affordances for executor and workspace inventory panels", () => {
    render(
      <>
        <ExecutorsPanel
          items={[executor]}
          loading={false}
          error={null}
          selectedExecutorId={null}
          onSelectExecutor={() => {}}
          onRefresh={() => {}}
          refreshing={false}
        />
        <WorkspacesPanel
          items={[workspace]}
          loading={false}
          error={null}
          selectedWorkspaceId={null}
          onSelectWorkspace={() => {}}
          onRefresh={() => {}}
          refreshing={false}
        />
      </>,
    );

    const detailButtons = screen.getAllByRole("button", { name: "View detail" });

    expect(screen.getAllByText("How to use this panel").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Refresh executors" })).toHaveAttribute(
      "title",
      "Refresh the executor inventory when persisted availability or heartbeat metadata may be stale.",
    );
    expect(screen.getByPlaceholderText("Search executors by id, label, host, kind, or runner family")).toHaveAttribute(
      "title",
      "Search executors by ID, label, host, kind, or runner family without leaving the runtime workspace.",
    );
    expect(detailButtons[0]).toHaveAttribute(
      "title",
      "Open the selected executor when you need the full linked-record and handoff detail view.",
    );
    expect(screen.getByRole("button", { name: "Refresh workspaces" })).toHaveAttribute(
      "title",
      "Refresh the workspace inventory when persisted lifecycle or ownership data may be stale.",
    );
    expect(screen.getByPlaceholderText("Search workspaces by id, root, state, runner family, or owner")).toHaveAttribute(
      "title",
      "Search workspaces by ID, root, state, runner family, or owner without leaving the runtime workspace.",
    );
    expect(detailButtons[1]).toHaveAttribute(
      "title",
      "Open the selected workspace when you need the full workspace detail pane.",
    );
  });

  it("renders guide affordances for executor detail actions", () => {
    const onRefresh = vi.fn();

    render(
      <ExecutorDetailPanel
        item={executor}
        loading={false}
        error={null}
        onRefresh={onRefresh}
        onOpenSavedContext={() => {}}
        onMarkLocalReviewed={() => {}}
        onSnoozeLocalReview={() => {}}
        onKeepLocalInQueue={() => {}}
        relatedWorkspaces={[workspace]}
        relatedExecutions={relatedExecutions}
        relatedRuns={relatedRuns}
        relatedArtifacts={relatedArtifacts}
        relatedEvents={relatedEvents}
        onOpenWorkspace={() => {}}
        onOpenExecution={() => {}}
        onOpenRun={() => {}}
        onOpenArtifact={() => {}}
      />,
    );

    expect(screen.getByText("How to use this panel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh executor detail" })).toHaveAttribute(
      "title",
      "Refresh the selected executor detail without leaving the executors lane.",
    );
    expect(screen.getByRole("button", { name: "Open saved context" })).toHaveAttribute(
      "title",
      "Use Open saved context to restore the browser-local executor review context for this lane.",
    );
    expect(screen.getByRole("button", { name: "Mark reviewed" })).toHaveAttribute(
      "title",
      "Use the local review actions to mark reviewed, snooze, or return the executor to the local queue.",
    );
    expect(screen.getByRole("button", { name: "Open first workspace" })).toHaveAttribute(
      "title",
      "Use the related record buttons to open the first linked workspace, execution, run, or artifact from the executor view.",
    );
    expect(screen.getByRole("button", { name: "Open first execution" })).toHaveAttribute(
      "title",
      "Use the related record buttons to open the first linked workspace, execution, run, or artifact from the executor view.",
    );
  });
});
