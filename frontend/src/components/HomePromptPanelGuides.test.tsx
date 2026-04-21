import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OverviewAttentionPanel from "./OverviewAttentionPanel";
import OverviewCloseoutReadinessPanel from "./OverviewCloseoutReadinessPanel";
import OverviewContextMemoryPanel from "./OverviewContextMemoryPanel";
import OverviewContextStrip from "./OverviewContextStrip";
import OverviewHandoffConfidencePanel from "./OverviewHandoffConfidencePanel";
import OverviewHandoffExportPanel from "./OverviewHandoffExportPanel";
import OverviewHandoffPackagePanel from "./OverviewHandoffPackagePanel";
import OverviewReviewQueuePanel from "./OverviewReviewQueuePanel";
import OverviewReviewSessionPanel from "./OverviewReviewSessionPanel";
import PromptCapabilityPanel from "./PromptCapabilityPanel";
import PromptExecutionTimeline from "./PromptExecutionTimeline";
import PromptPlanPanel from "./PromptPlanPanel";
import PromptSessionPanel from "./PromptSessionPanel";
import type {
  PromptCapabilityEntry,
  PromptSafetyEnvelope,
  PromptSessionRecord,
} from "../types/contracts";

const promptSafetyEnvelope: PromptSafetyEnvelope = {
  state_scope: "Editor-session and level-open control within the current project target.",
  backup_class: "operator-managed-level-snapshot",
  rollback_class: "manual-level-restore",
  verification_class: "runtime-context verification",
  retention_class: "prompt-evidence",
  natural_language_status: "prompt-ready-approval-gated",
  natural_language_blocker: null,
};

const promptSession: PromptSessionRecord = {
  prompt_id: "prompt-1",
  plan_id: "plan-1",
  status: "waiting_approval",
  prompt_text: "Open the default level in the editor.",
  project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
  engine_root: "C:/src/o3de",
  dry_run: false,
  preferred_domains: ["editor-control"],
  operator_note: null,
  child_run_ids: ["run-1"],
  child_execution_ids: ["exec-1"],
  child_artifact_ids: ["artifact-1"],
  child_event_ids: ["event-1"],
  workspace_id: "workspace-1",
  executor_id: "executor-1",
  plan_summary: "Compiled 2 admitted typed steps.",
  evidence_summary: "runs=1, executions=1, artifacts=1, events=1",
  admitted_capabilities: ["editor.session.open", "editor.level.open"],
  refused_capabilities: ["editor.entity.create"],
  final_result_summary: "Paused awaiting approval for level open.",
  next_step_index: 1,
  current_step_id: "step-level-open",
  pending_approval_id: "approval-1",
  pending_approval_token: null,
  last_error_code: "APPROVAL_REQUIRED",
  last_error_retryable: true,
  step_attempts: {
    "step-session-open": 1,
    "step-level-open": 1,
  },
  plan: {
    prompt_id: "prompt-1",
    plan_id: "plan-1",
    schema_version: "v0.1",
    admitted: true,
    refusal_reason: null,
    summary: "Compiled 2 admitted typed steps.",
    steps: [
      {
        step_id: "step-session-open",
        tool: "editor.session.open",
        agent: "editor-control",
        args: {
          project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
        },
        approval_class: "project_write",
        required_locks: ["editor_session"],
        capability_status_required: "real-authoring",
        workspace_id: "workspace-1",
        executor_id: "executor-1",
        simulated_allowed: false,
        depends_on: [],
        capability_maturity: "real-authoring",
        safety_envelope: promptSafetyEnvelope,
        planner_note: null,
      },
      {
        step_id: "step-level-open",
        tool: "editor.level.open",
        agent: "editor-control",
        args: {
          level_path: "Levels/DefaultLevel",
          focus_viewport: true,
        },
        approval_class: "content_write",
        required_locks: ["editor_session"],
        capability_status_required: "real-authoring",
        workspace_id: "workspace-1",
        executor_id: "executor-1",
        simulated_allowed: false,
        depends_on: ["step-session-open"],
        capability_maturity: "real-authoring",
        safety_envelope: promptSafetyEnvelope,
        planner_note: null,
      },
    ],
    refused_capabilities: ["editor.entity.create"],
    capability_requirements: ["editor.level.open remains admitted real on the canonical local backend."],
  },
  latest_child_responses: [
    {
      ok: true,
      result: {
        tool: "editor.session.open",
        execution_mode: "real",
      },
    },
  ],
  created_at: "2026-04-21T10:00:00Z",
  updated_at: "2026-04-21T10:05:00Z",
};

const promptCapabilities: PromptCapabilityEntry[] = [
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
    real_admission_stage: "real-editor-authoring-active",
    planner_intent_aliases: [],
    natural_language_affordances: [],
    allowlisted_parameter_surfaces: ["level_path", "focus_viewport"],
    safety_envelope: promptSafetyEnvelope,
    real_adapter_availability: true,
    dry_run_availability: false,
    simulation_fallback_availability: false,
  },
];

describe("home and prompt panel guides", () => {
  it("renders guide affordances for home overview helper panels", () => {
    render(
      <>
        <OverviewAttentionPanel
          entries={[
            {
              id: "attention-1",
              label: "Execution warnings",
              detail: "One execution still needs operator review.",
              primaryActionLabel: "Open execution review",
              secondaryActionLabel: "Open records lane",
            },
          ]}
          onPrimaryAction={() => {}}
          onSecondaryAction={() => {}}
        />
        <OverviewReviewQueuePanel
          entries={[
            {
              id: "queue-1",
              laneLabel: "Executions",
              focusLabel: "Execution exec-1",
              priorityLabel: "warning",
              priorityDetail: "Execution still needs truth review.",
              savedAt: "2026-04-21T10:15:00Z",
              triageLabel: "Open triage",
              reviewDisposition: "reviewed",
              noteText: "Check the artifact lineage.",
              lastReviewedLabel: "Reviewed five minutes ago.",
              nextSuggestedCheck: "Inspect the related artifact.",
            },
          ]}
          onOpenEntry={() => {}}
          onTriageEntry={() => {}}
          onMarkReviewed={() => {}}
          onSnoozeEntry={() => {}}
          onKeepInQueue={() => {}}
        />
        <OverviewContextMemoryPanel
          entries={[
            {
              id: "memory-1",
              laneLabel: "Artifacts",
              focusLabel: "Artifact artifact-1",
              originLabel: "records workspace",
              savedAt: "2026-04-21T10:20:00Z",
              triageLabel: "Open artifact review",
              reviewDisposition: "snoozed",
              noteText: "Verify retained evidence before handoff.",
              lastReviewedLabel: "Snoozed recently.",
              lastReviewedDetail: "Waiting on related execution detail.",
              nextSuggestedCheck: "Return to run detail if artifact remains partial.",
            },
          ]}
          onOpenEntry={() => {}}
          onTriageEntry={() => {}}
          onMarkReviewed={() => {}}
          onSnoozeEntry={() => {}}
          onKeepInQueue={() => {}}
          onSaveNote={() => {}}
          onClearEntry={() => {}}
          onClearAll={() => {}}
        />
      </>,
    );

    const openSavedContextButtons = screen.getAllByRole("button", { name: "Open saved context" });

    expect(screen.getAllByText("How to use this panel").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole("button", { name: "Open execution review" })).toHaveAttribute(
      "title",
      "Use the recommendation actions to jump directly into the suggested lane or its secondary follow-up.",
    );
    expect(openSavedContextButtons[0]).toHaveAttribute(
      "title",
      "Use Open saved context to restore the selected browser-local review lane before you act on it.",
    );
    expect(screen.getByRole("button", { name: "Clear all local context presets" })).toHaveAttribute(
      "title",
      "Use Clear all local context presets only when the current browser-session memory is stale or no longer useful.",
    );
    expect(screen.getByPlaceholderText("Local browser-session note for this saved context.")).toHaveAttribute(
      "title",
      "Use the note editor to save a browser-local note for this memory entry.",
    );
  });

  it("renders guide affordances for prompt studio detail panels", () => {
    render(
      <>
        <PromptSessionPanel
          sessions={[promptSession]}
          selectedPromptId={promptSession.prompt_id}
          onSelect={() => {}}
        />
        <PromptPlanPanel session={promptSession} capabilities={promptCapabilities} />
        <PromptCapabilityPanel capabilities={promptCapabilities} session={promptSession} />
        <PromptExecutionTimeline session={promptSession} />
      </>,
    );

    expect(screen.getAllByText("How to use this panel").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("button", { name: /prompt-1/i })).toHaveAttribute(
      "title",
      "Select a prompt session entry to inspect that prompt's persisted plan, timeline, and capability posture.",
    );
    expect(screen.getAllByText("Compiled 2 admitted typed steps.")[0].closest("div[title]")).toHaveAttribute(
      "title",
      "Use the plan summary card for admitted status, overall summary, and any refusal reason.",
    );
    expect(screen.getAllByText("step-level-open")[0].closest("article")).toHaveAttribute(
      "title",
      "Read each step card to inspect tool, agent, approval class, capability posture, safety envelope, and dependency chain.",
    );
    expect(screen.getByText(/"level_path": "Levels\/DefaultLevel"/).closest("pre")).toHaveAttribute(
      "title",
      "Inspect the step args JSON when you need the exact typed argument payload produced by the planner.",
    );
    expect(screen.getByText("Allowlisted params: level_path, focus_viewport").closest("article")).toHaveAttribute(
      "title",
      "Read each capability entry for typed tool identity, agent family, maturity, admission stage, safety posture, and allowlisted parameters.",
    );
    expect(screen.getByText("run-1").closest("article")).toHaveAttribute(
      "title",
      "Use the child lineage groups and latest child responses to inspect the runs, executions, artifacts, and events created by the prompt session.",
    );
  });

  it("renders guide affordances for the remaining overview panels", () => {
    render(
      <>
        <OverviewContextStrip
          laneLabel="Runs"
          focusLabel="Run run-1"
          originLabel="operator overview"
          autoOpenLabel="opened detail view"
          impactLabel="high impact"
          impactDetail="This focus changed the records lane."
          promotedPresetLabel="warning review preset"
          promotedPresetDetail="Saved locally for later replay."
          historyEntries={[
            {
              id: "history-1",
              focusLabel: "Execution exec-1",
              originLabel: "overview drilldown",
            },
          ]}
          onSelectHistoryEntry={() => {}}
          onClearHistory={() => {}}
          onPromoteCurrentContext={() => {}}
          onApplyPromotedPreset={() => {}}
          onClearPromotedPreset={() => {}}
          onClearFocus={() => {}}
        />
        <OverviewCloseoutReadinessPanel
          readyCount={1}
          pendingCount={1}
          entries={[
            {
              id: "closeout-1",
              laneLabel: "Runs",
              focusLabel: "Run run-1",
              ready: true,
              summaryLabel: "ready now",
              detail: "All linked records have been reviewed.",
            },
          ]}
        />
        <OverviewHandoffConfidencePanel
          confidenceLabel="high confidence"
          confidenceDetail="All saved contexts are fresh and ready for handoff."
          tone="high"
          staleCount={0}
          driftedCount={0}
          excludedCount={0}
          changedSinceSnapshotCount={0}
        />
        <OverviewHandoffExportPanel
          generatedAtLabel="generated just now"
          includedEntries={[
            {
              id: "export-1",
              laneLabel: "Runs",
              focusLabel: "Run run-1",
              detail: "Included in the draft.",
              provenanceLabel: "fresh evidence",
              provenanceDetail: "Reviewed within the current browser session.",
            },
          ]}
          excludedEntries={[]}
          draftText={"Run run-1 is ready for operator handoff."}
          statusLabel="draft ready"
          statusDetail="Clipboard export is available."
          onCopyDraft={() => {}}
        />
        <OverviewHandoffPackagePanel
          includedEntries={[
            {
              id: "package-1",
              laneLabel: "Executions",
              focusLabel: "Execution exec-1",
              detail: "Included now.",
              provenanceLabel: "fresh",
              provenanceDetail: "Reviewed in this browser session.",
            },
          ]}
          excludedEntries={[
            {
              id: "package-2",
              laneLabel: "Artifacts",
              focusLabel: "Artifact artifact-1",
              detail: "Excluded pending follow-up.",
              provenanceLabel: "stale",
              provenanceDetail: "Needs another evidence check.",
            },
          ]}
        />
        <OverviewReviewSessionPanel
          inQueueCount={1}
          snoozedCount={1}
          reviewedCount={2}
          staleCount={0}
          driftedCount={1}
          longestSnoozedLabel="Longest snoozed: artifact review"
          longestSnoozedDetail="Artifact review has been snoozed for 15 minutes."
          lastSnapshotLabel="last snapshot: 2 minutes ago"
          compareSummaryLabel="One item moved from queue to reviewed."
          onCopySessionSnapshot={() => {}}
          onResetReviewState={() => {}}
          onReturnAllToQueue={() => {}}
        />
      </>,
    );

    expect(screen.getAllByText("How to use this panel").length).toBeGreaterThanOrEqual(6);
    expect(screen.getByRole("button", { name: "Clear history" })).toHaveAttribute(
      "title",
      "Use the history entries to replay recent overview-driven contexts from this browser session.",
    );
    expect(screen.getByRole("button", { name: "Save as local preset" })).toHaveAttribute(
      "title",
      "Use the preset actions to save, reapply, or clear browser-local overview presets.",
    );
    expect(screen.getByRole("button", { name: "Clear runs overview context" })).toHaveAttribute(
      "title",
      "Use Clear overview context when you want the current lane to stop following the active overview drilldown.",
    );
    expect(screen.getByText("All linked records have been reviewed.").closest("div[title]")).toHaveAttribute(
      "title",
      "Review each readiness entry for lane, focus, summary label, and the local reason it is ready or still pending.",
    );
    expect(screen.getByText("high confidence").closest("div[title]")).toHaveAttribute(
      "title",
      "Use the confidence summary to judge whether the current browser-local handoff posture is high-confidence, cautionary, or risky.",
    );
    expect(screen.getByRole("button", { name: "Copy handoff draft" })).toHaveAttribute(
      "title",
      "Use Copy handoff draft to place the current browser-local handoff text on the clipboard.",
    );
    expect(screen.getByText("Run run-1 is ready for operator handoff.").closest("pre")).toHaveAttribute(
      "title",
      "Inspect the draft preview to confirm the exact handoff text that would be copied from the current browser session.",
    );
    expect(screen.getByText("Execution exec-1").closest("div[title]")).toHaveAttribute(
      "title",
      "Review each package entry card to see whether that saved context is included now or excluded pending follow-up.",
    );
    expect(screen.getByRole("button", { name: "Copy session snapshot" })).toHaveAttribute(
      "title",
      "Use the session actions to copy a session snapshot, return all entries to queue, or clear the browser-local review state.",
    );
  });
});
