import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PromptSessionRecord } from "../types/contracts";
import PromptExecutionTimeline from "./PromptExecutionTimeline";

const session: PromptSessionRecord = {
  prompt_id: "prompt-timeline-1",
  plan_id: "plan-timeline-1",
  status: "waiting_approval",
  prompt_text: "Open the default level in the editor.",
  project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
  engine_root: "C:/src/o3de",
  dry_run: false,
  preferred_domains: ["editor-control"],
  operator_note: null,
  child_run_ids: ["run-1", "run-2"],
  child_execution_ids: ["exec-1", "exec-2"],
  child_artifact_ids: ["artifact-1"],
  child_event_ids: ["event-1"],
  workspace_id: "workspace-1",
  executor_id: "executor-1",
  plan_summary: "Compiled 2 admitted typed steps.",
  evidence_summary: "runs=2, executions=2, artifacts=1, events=1",
  admitted_capabilities: ["editor.session.open", "editor.level.open"],
  refused_capabilities: [],
  final_result_summary: "Prompt execution paused pending approval.",
  next_step_index: 1,
  current_step_id: "editor-level-1",
  pending_approval_id: "approval-2",
  pending_approval_token: null,
  last_error_code: "APPROVAL_REQUIRED",
  last_error_retryable: true,
  step_attempts: {
    "editor-session-1": 2,
    "editor-level-1": 1,
  },
  plan: null,
  latest_child_responses: [
    {
      ok: true,
      result: {
        tool: "editor.session.open",
        execution_mode: "real",
        simulated: false,
      },
    },
    {
      ok: false,
      error: {
        code: "APPROVAL_REQUIRED",
      },
    },
  ],
  created_at: "2026-04-21T00:00:00Z",
  updated_at: "2026-04-21T00:05:00Z",
};

describe("PromptExecutionTimeline", () => {
  it("renders session status and child response execution truth with status chips", () => {
    render(<PromptExecutionTimeline session={session} />);

    const summaryCard = screen.getByText("Workspace:").closest("div");
    const firstChildResponse = screen.getByText("Child 1").closest("article");
    const secondChildResponse = screen.getByText("Child 2").closest("article");

    expect(summaryCard).not.toBeNull();
    expect(firstChildResponse).not.toBeNull();
    expect(secondChildResponse).not.toBeNull();

    expect(screen.getByText("waiting_approval")).toBeInTheDocument();
    expect(screen.getByText("approval-2")).toBeInTheDocument();

    expect(within(firstChildResponse as HTMLElement).getByText("ok")).toBeInTheDocument();
    expect(
      within(firstChildResponse as HTMLElement).getByText(/Tool:/),
    ).toHaveTextContent("Tool: editor.session.open");
    expect(within(firstChildResponse as HTMLElement).getByText("real")).toBeInTheDocument();
    expect(within(firstChildResponse as HTMLElement).getByText("Simulated: false")).toBeInTheDocument();

    expect(within(secondChildResponse as HTMLElement).getByText("error")).toBeInTheDocument();
    expect(within(secondChildResponse as HTMLElement).getByText("Execution mode: not reported")).toBeInTheDocument();
    expect(within(secondChildResponse as HTMLElement).getByText("Error code: APPROVAL_REQUIRED")).toBeInTheDocument();

    expect(screen.getByText(/"execution_mode": "real"/)).toBeInTheDocument();
  });

  it("renders an honest empty state until a prompt session is selected", () => {
    render(<PromptExecutionTimeline session={null} />);

    expect(
      screen.getByText("Select a prompt session to inspect child lineage."),
    ).toBeInTheDocument();
  });
});
