import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdaptersPanel from "./AdaptersPanel";
import CatalogPanel from "./CatalogPanel";
import RunDetailPanel from "./RunDetailPanel";
import WorkspaceDetailPanel from "./WorkspaceDetailPanel";
import type {
  AdaptersResponse,
  CatalogAgent,
  ExecutionListItem,
  RunRecord,
  WorkspaceRecord,
} from "../types/contracts";

const catalogAgents: CatalogAgent[] = [
  {
    id: "project-build",
    name: "Project Build",
    role: "project-build",
    summary: "Project and build actions.",
    tools: [
      {
        name: "project.inspect",
        description: "Inspect project manifest and override state.",
        approval_class: "read_only",
        adapter_family: "project-build",
        capability_status: "hybrid-read-only",
        default_locks: ["project_config"],
        default_timeout_s: 30,
        risk: "low",
        tags: ["inspect"],
      },
    ],
  },
];

const adapters: AdaptersResponse = {
  configured_mode: "hybrid",
  active_mode: "hybrid",
  supported_modes: ["hybrid", "simulated"],
  contract_version: "v0.1",
  supports_real_execution: true,
  real_tool_paths: ["editor.session.open", "editor.level.open"],
  plan_only_tool_paths: ["build.configure"],
  simulated_tool_paths: ["editor.entity.create"],
  families: [
    {
      family: "editor-control",
      mode: "hybrid",
      supports_real_execution: true,
      contract_version: "v0.1",
      execution_boundary: "admitted editor bridge boundary",
      ready: true,
      real_tool_paths: ["editor.session.open", "editor.level.open"],
      plan_only_tool_paths: ["build.configure"],
      simulated_tool_paths: ["editor.entity.create"],
      notes: [],
    },
  ],
  warning: null,
  notes: [],
};

const run: RunRecord = {
  id: "run-1",
  request_id: "req-1",
  agent: "editor-control",
  tool: "editor.level.open",
  status: "succeeded",
  created_at: "2026-04-21T00:00:00Z",
  updated_at: "2026-04-21T00:01:00Z",
  dry_run: false,
  requested_locks: ["editor_session"],
  granted_locks: ["editor_session"],
  warnings: [],
  execution_mode: "real",
  result_summary: "Level open completed through the current admitted-real path.",
};

const workspace: WorkspaceRecord = {
  id: "workspace-1",
  workspace_kind: "local-project",
  workspace_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
  workspace_state: "ready",
  cleanup_policy: "retain-until-review",
  retention_class: "operator-review",
  engine_binding: { engine_root: "C:/src/o3de" },
  project_binding: { project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox" },
  runner_family: "editor-control",
  owner_run_id: "run-1",
  owner_execution_id: "exec-1",
  owner_executor_id: "executor-1",
  created_at: "2026-04-21T00:00:00Z",
  activated_at: "2026-04-21T00:02:00Z",
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
    started_at: "2026-04-21T00:00:10Z",
    finished_at: "2026-04-21T00:00:20Z",
    result_summary: "Execution completed.",
    warning_count: 0,
    artifact_count: 1,
    fallback_category: "none",
    project_manifest_source_of_truth: "project_json",
  },
];

describe("remaining panel guides", () => {
  it("renders guide affordances for catalog and adapter registry panels", () => {
    render(
      <>
        <CatalogPanel agents={catalogAgents} />
        <AdaptersPanel adapters={adapters} loading={false} error={null} />
      </>,
    );

    expect(screen.getAllByText("How to use this panel").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Project Build").closest("li")).toHaveAttribute(
      "title",
      "Read each agent family row to confirm tool ownership and role before dispatching work.",
    );
    expect(screen.getByText("Registry Summary").closest("article")).toHaveAttribute(
      "title",
      "Use Registry Summary for the top-level configured mode, contract, and boundary posture.",
    );
  });

  it("renders guide affordances for run and workspace detail panels", () => {
    const onRefresh = vi.fn();

    render(
      <>
        <RunDetailPanel
          item={run}
          loading={false}
          error={null}
          relatedExecutionId="exec-1"
          onRefresh={onRefresh}
        />
        <WorkspaceDetailPanel
          item={workspace}
          loading={false}
          error={null}
          onRefresh={onRefresh}
          onOpenSavedContext={() => {}}
          onMarkLocalReviewed={() => {}}
          onSnoozeLocalReview={() => {}}
          onKeepLocalInQueue={() => {}}
          relatedExecutions={relatedExecutions}
          onOpenExecution={() => {}}
          relatedRuns={[]}
          relatedArtifacts={[]}
          relatedEvents={[]}
        />
      </>,
    );

    expect(screen.getAllByText("How to use this panel").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByRole("button", { name: "Refresh run detail" }),
    ).toHaveAttribute(
      "title",
      "Refresh the selected run detail and related execution evidence without leaving the detail lane.",
    );
    expect(
      screen.getByRole("button", { name: "Open saved context" }),
    ).toHaveAttribute(
      "title",
      "Use Open saved context to restore the browser-local workspace review context for this lane.",
    );
    expect(
      screen.getByRole("button", { name: "Open first execution" }),
    ).toHaveAttribute(
      "title",
      "Use the related record buttons to open the first linked execution, run, or artifact from the workspace view.",
    );
  });
});
