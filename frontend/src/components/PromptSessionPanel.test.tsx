import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PromptSessionRecord } from "../types/contracts";
import PromptSessionPanel from "./PromptSessionPanel";

const sessions: PromptSessionRecord[] = [
  {
    prompt_id: "prompt-waiting-1",
    plan_id: "plan-waiting-1",
    status: "waiting_approval",
    prompt_text: "Open the default level in the editor.",
    project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
    engine_root: "C:/src/o3de",
    dry_run: false,
    preferred_domains: ["editor-control"],
    operator_note: null,
    child_run_ids: ["run-1"],
    child_execution_ids: ["exec-1"],
    child_artifact_ids: [],
    child_event_ids: [],
    workspace_id: "workspace-1",
    executor_id: "executor-1",
    plan_summary: "Compiled 2 admitted typed steps.",
    evidence_summary: null,
    admitted_capabilities: ["editor.session.open"],
    refused_capabilities: [],
    final_result_summary: "Paused pending approval.",
    next_step_index: 1,
    current_step_id: "editor-level-1",
    pending_approval_id: "approval-1",
    pending_approval_token: null,
    last_error_code: "APPROVAL_REQUIRED",
    last_error_retryable: true,
    step_attempts: {},
    plan: null,
    latest_child_responses: [],
    created_at: "2026-04-21T00:00:00Z",
    updated_at: "2026-04-21T00:01:00Z",
  },
  {
    prompt_id: "prompt-complete-1",
    plan_id: "plan-complete-1",
    status: "completed",
    prompt_text: "Inspect the project manifest.",
    project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
    engine_root: "C:/src/o3de",
    dry_run: false,
    preferred_domains: ["project-build"],
    operator_note: null,
    child_run_ids: ["run-2"],
    child_execution_ids: ["exec-2"],
    child_artifact_ids: ["artifact-2"],
    child_event_ids: ["event-2"],
    workspace_id: "workspace-2",
    executor_id: "executor-2",
    plan_summary: "Compiled 1 admitted typed step.",
    evidence_summary: "runs=1, executions=1",
    admitted_capabilities: ["project.inspect"],
    refused_capabilities: [],
    final_result_summary: "Completed successfully.",
    next_step_index: 1,
    current_step_id: null,
    pending_approval_id: null,
    pending_approval_token: null,
    last_error_code: null,
    last_error_retryable: false,
    step_attempts: {},
    plan: null,
    latest_child_responses: [],
    created_at: "2026-04-21T00:02:00Z",
    updated_at: "2026-04-21T00:03:00Z",
  },
];

describe("PromptSessionPanel", () => {
  it("renders prompt session status chips and keeps selection interactive", () => {
    const onSelect = vi.fn();

    render(
      <PromptSessionPanel
        sessions={sessions}
        selectedPromptId="prompt-waiting-1"
        onSelect={onSelect}
      />,
    );

    const waitingButton = screen.getByRole("button", { name: /prompt-waiting-1/i });
    const completedButton = screen.getByRole("button", { name: /prompt-complete-1/i });

    expect(within(waitingButton).getByText("waiting_approval")).toBeInTheDocument();
    expect(within(completedButton).getByText("completed")).toBeInTheDocument();

    fireEvent.click(completedButton);

    expect(onSelect).toHaveBeenCalledWith("prompt-complete-1");
  });

  it("renders an honest empty state when no prompt sessions exist", () => {
    render(
      <PromptSessionPanel
        sessions={[]}
        selectedPromptId={null}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText("No prompt sessions have been created yet.")).toBeInTheDocument();
  });
});
