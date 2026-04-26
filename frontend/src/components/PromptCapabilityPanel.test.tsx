import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  PromptCapabilityEntry,
  PromptSafetyEnvelope,
  PromptSessionRecord,
} from "../types/contracts";
import PromptCapabilityPanel from "./PromptCapabilityPanel";

const safetyEnvelope: PromptSafetyEnvelope = {
  state_scope: "Prompt-driven editor and project control within the current target.",
  backup_class: "operator-managed-backup",
  rollback_class: "manual-restore",
  verification_class: "runtime-and-persisted-evidence verification",
  retention_class: "prompt-evidence",
  natural_language_status: "prompt-ready-approval-gated",
  natural_language_blocker: null,
  mutation_surface_class: "admitted-editor-authoring-loaded-level",
  restore_boundary_class: "loaded-level-file-restore-boundary",
  candidate_expansion_boundary: "No broader editor mutation is admitted from this envelope.",
};

const session: PromptSessionRecord = {
  prompt_id: "prompt-availability-1",
  plan_id: "plan-availability-1",
  status: "planned",
  prompt_text: "Open a level and inspect the capability registry.",
  project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
  engine_root: "C:/src/o3de",
  dry_run: false,
  preferred_domains: ["editor-control", "project-build"],
  operator_note: null,
  child_run_ids: [],
  child_execution_ids: [],
  child_artifact_ids: [],
  child_event_ids: [],
  workspace_id: "workspace-1",
  executor_id: "executor-1",
  plan_summary: "Compiled 2 typed capability entries.",
  evidence_summary: null,
  admitted_capabilities: ["editor.level.open", "build.configure"],
  refused_capabilities: [],
  final_result_summary: null,
  next_step_index: 0,
  current_step_id: null,
  pending_approval_id: null,
  pending_approval_token: null,
  last_error_code: null,
  last_error_retryable: false,
  step_attempts: {},
  plan: null,
  latest_child_responses: [],
  created_at: "2026-04-21T00:00:00Z",
  updated_at: "2026-04-21T00:00:00Z",
};

const capabilities: PromptCapabilityEntry[] = [
  {
    tool_name: "editor.level.open",
    agent_family: "editor-control",
    args_schema: "schemas/editor.level.open.args.json",
    result_schema: "schemas/editor.level.open.result.json",
    persisted_execution_details_schema: "schemas/editor.level.open.execution.json",
    persisted_artifact_metadata_schema: "schemas/editor.level.open.artifact.json",
    approval_class: "content_write",
    default_locks: ["editor_session"],
    capability_maturity: "real-authoring",
    capability_status: "real-authoring",
    real_admission_stage: "real-level-authoring-active",
    planner_intent_aliases: [],
    natural_language_affordances: [],
    allowlisted_parameter_surfaces: ["level_path"],
    safety_envelope: safetyEnvelope,
    real_adapter_availability: true,
    dry_run_availability: false,
    simulation_fallback_availability: false,
  },
  {
    tool_name: "build.configure",
    agent_family: "project-build",
    args_schema: "schemas/build.configure.args.json",
    result_schema: "schemas/build.configure.result.json",
    persisted_execution_details_schema: "schemas/build.configure.execution.json",
    persisted_artifact_metadata_schema: "schemas/build.configure.artifact.json",
    approval_class: "project_write",
    default_locks: ["build_tree"],
    capability_maturity: "plan-only",
    capability_status: "plan-only",
    real_admission_stage: "real-plan-only-active",
    planner_intent_aliases: [],
    natural_language_affordances: [],
    allowlisted_parameter_surfaces: ["generator", "build_directory"],
    safety_envelope: safetyEnvelope,
    real_adapter_availability: false,
    dry_run_availability: true,
    simulation_fallback_availability: true,
  },
];

describe("PromptCapabilityPanel", () => {
  it("renders execution availability truth from the backend capability registry", () => {
    render(<PromptCapabilityPanel capabilities={capabilities} session={session} />);

    const editorLevelCapability = screen.getByText("editor.level.open").closest("article");
    const buildConfigureCapability = screen.getByText("build.configure").closest("article");

    expect(editorLevelCapability).not.toBeNull();
    expect(buildConfigureCapability).not.toBeNull();

    expect(
      within(editorLevelCapability as HTMLElement).getByText(/Capability status:/),
    ).toHaveTextContent("Capability status: real-authoring");
    expect(
      within(editorLevelCapability as HTMLElement).getByText(/Real admission stage:/),
    ).toHaveTextContent("Real admission stage: real-level-authoring-active");
    expect(
      within(editorLevelCapability as HTMLElement).getByText(/Real adapter availability:/),
    ).toHaveTextContent("Real adapter availability: available");
    expect(
      within(editorLevelCapability as HTMLElement).getByText(/Dry-run availability:/),
    ).toHaveTextContent("Dry-run availability: not available");
    expect(
      within(editorLevelCapability as HTMLElement).getByText(/Simulation fallback availability:/),
    ).toHaveTextContent("Simulation fallback availability: not available");
    expect(
      within(editorLevelCapability as HTMLElement).getByText(/Natural-language status:/),
    ).toHaveTextContent("Natural-language status: prompt-ready-approval-gated");
    expect(
      within(editorLevelCapability as HTMLElement).getByText(/Mutation \/ restore boundary:/),
    ).toHaveTextContent(
      "Mutation / restore boundary: admitted-editor-authoring-loaded-level / loaded-level-file-restore-boundary",
    );
    expect(
      within(editorLevelCapability as HTMLElement).getByText(/Expansion boundary:/),
    ).toHaveTextContent("No broader editor mutation is admitted from this envelope.");

    expect(
      within(buildConfigureCapability as HTMLElement).getByText(/Real adapter availability:/),
    ).toHaveTextContent("Real adapter availability: not available");
    expect(
      within(buildConfigureCapability as HTMLElement).getByText(/Capability status:/),
    ).toHaveTextContent("Capability status: plan-only");
    expect(
      within(buildConfigureCapability as HTMLElement).getByText(/Real admission stage:/),
    ).toHaveTextContent("Real admission stage: real-plan-only-active");
    expect(
      within(buildConfigureCapability as HTMLElement).getByText(/Dry-run availability:/),
    ).toHaveTextContent("Dry-run availability: available");
    expect(
      within(buildConfigureCapability as HTMLElement).getByText(/Simulation fallback availability:/),
    ).toHaveTextContent("Simulation fallback availability: available");
    expect(
      within(buildConfigureCapability as HTMLElement).getByText(/Natural-language status:/),
    ).toHaveTextContent("Natural-language status: prompt-ready-approval-gated");
  });

  it("shows an honest empty state when the current prompt has no matching capability entries", () => {
    render(
      <PromptCapabilityPanel
        capabilities={capabilities}
        session={{ ...session, admitted_capabilities: [], refused_capabilities: [] }}
      />,
    );

    expect(
      screen.getByText("No capability entries are relevant to the current prompt selection."),
    ).toBeInTheDocument();
  });
});
