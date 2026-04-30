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
    expect(screen.getByText("disabled")).toBeInTheDocument();
    expect(screen.getByText("yes")).toBeInTheDocument();
    expect(screen.getByText("approval-2")).toBeInTheDocument();

    expect(within(firstChildResponse as HTMLElement).getByText("ok")).toBeInTheDocument();
    expect(
      within(firstChildResponse as HTMLElement).getByText(/Tool:/),
    ).toHaveTextContent("Tool: editor.session.open");
    expect(within(firstChildResponse as HTMLElement).getByText("real")).toBeInTheDocument();
    expect(within(firstChildResponse as HTMLElement).getByText(/Simulated:/)).toHaveTextContent("Simulated: no");

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

  it("renders a structured placement proof-only review card for fail-closed child evidence", () => {
    const placementProofSession: PromptSessionRecord = {
      ...session,
      latest_child_responses: [
        {
          ok: true,
          result: {
            tool: "editor.placement.proof_only",
            execution_mode: "simulated",
            simulated: true,
          },
          execution_details: {
            capability_name: "editor.placement.proof_only",
            proof_status: "blocked",
            candidate_id: "candidate-a",
            candidate_label: "Weathered Ivy Arch",
            staged_source_relative_path: "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
            target_level_relative_path: "Levels/BridgeLevel01/BridgeLevel01.prefab",
            target_entity_name: "AssetForgeCandidateA",
            target_component: "Mesh",
            stage_write_evidence_reference: "packet-10/stage-write-evidence.json",
            stage_write_readback_reference: "packet-10/readback-evidence.json",
            stage_write_readback_status: "succeeded",
            artifact_id: "artifact-42",
            artifact_label: "placement-proof-artifact",
            execution_admitted: false,
            placement_write_admitted: false,
            mutation_occurred: false,
            read_only: true,
            fail_closed_reasons: [
              "server_approval:missing_session",
              "execution_admission_disabled",
            ],
            source: "asset-forge-editor-placement-proof-only",
            server_approval_evaluation: {
              decision_state: "denied",
              decision_code: "missing_session",
              status: "missing",
              reason: "No server-owned approval session was provided; endpoint remains blocked.",
            },
          },
        },
      ],
      final_result_summary:
        "Review result: succeeded_fail_closed_blocked. "
        + "Capability editor.placement.proof_only executed as simulated proof-only evidence. "
        + "execution_admitted=False, placement_write_admitted=False, mutation_occurred=False, read_only=True. "
        + "Server blocker remediation (missing_session): Prepare a server-owned approval session for this exact bounded request, then rerun this same proof-only prompt. "
        + "No editor placement runtime command was admitted or executed.",
    };

    render(<PromptExecutionTimeline session={placementProofSession} />);

    const reviewCard = screen.getByLabelText("Placement proof-only review");

    expect(within(reviewCard).getByText("Capability: editor.placement.proof_only")).toBeInTheDocument();
    expect(within(reviewCard).getByText("proof-only")).toBeInTheDocument();
    expect(within(reviewCard).getByText("fail-closed")).toBeInTheDocument();
    expect(within(reviewCard).getByText("execution_admitted=false")).toBeInTheDocument();
    expect(within(reviewCard).getByText("placement_write_admitted=false")).toBeInTheDocument();
    expect(within(reviewCard).getByText("mutation_occurred=false")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Candidate id: candidate-a")).toBeInTheDocument();
    expect(within(reviewCard).getByText(/Staged source path:/)).toHaveTextContent(
      "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
    );
    expect(within(reviewCard).getByText("Artifact reference: placement-proof-artifact (artifact-42)")).toBeInTheDocument();
    expect(within(reviewCard).getByText(/Target level path:/)).toHaveTextContent(
      "Levels/BridgeLevel01/BridgeLevel01.prefab",
    );
    expect(within(reviewCard).getByText("Target entity: AssetForgeCandidateA")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Target component: Mesh")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Stage-write evidence ref: packet-10/stage-write-evidence.json")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Stage-write readback ref: packet-10/readback-evidence.json")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Stage-write readback status: succeeded")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Execution mode: simulated")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Inspection surface: asset-forge-editor-placement-proof-only")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Placement execution admitted: no (execution_admitted=false)")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Placement write admitted: no (placement_write_admitted=false)")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Mutation occurred: no (mutation_occurred=false)")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Read only: yes (read_only=true)")).toBeInTheDocument();
    expect(within(reviewCard).getByText(/Fail-closed reasons:/)).toHaveTextContent(
      "server_approval:missing_session, execution_admission_disabled",
    );
    expect(within(reviewCard).getByText(/Server approval:/)).toHaveTextContent(
      "decision_code=missing_session, decision_state=denied, status=missing",
    );
    expect(within(reviewCard).getByText(/Server blocker reason:/)).toHaveTextContent(
      "No server-owned approval session was provided; endpoint remains blocked.",
    );
    expect(within(reviewCard).getByText("Server blocker remediation")).toBeInTheDocument();
    expect(within(reviewCard).getByText("Prepare a server-owned approval session for this exact bounded request, then rerun this same proof-only prompt.")).toBeInTheDocument();
    expect(within(reviewCard).getByText(/Prepare a server-owned approval session/)).toHaveTextContent(
      "Prepare a server-owned approval session for this exact bounded request, then rerun this same proof-only prompt.",
    );
    expect(within(reviewCard).getByText(/placement runtime execution is non-admitted/i)).toBeInTheDocument();
    expect(within(reviewCard).getByText(/Next missing gate:/)).toHaveTextContent(
      "exact placement admission corridor",
    );
  });
});
