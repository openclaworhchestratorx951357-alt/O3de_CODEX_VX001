import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ArtifactDetailPanel from "./ArtifactDetailPanel";
import ExecutionDetailPanel from "./ExecutionDetailPanel";
import type { ArtifactRecord, ExecutionRecord, PromptSafetyEnvelope } from "../types/contracts";

const entityCreateSafetyEnvelope: PromptSafetyEnvelope = {
  state_scope: "Explicit entity creation within the currently loaded level.",
  backup_class: "operator-managed-level-snapshot-before-entity-mutation",
  rollback_class: "manual-level-restore-or-explicit-entity-removal",
  verification_class: "entity-readback-and-level-context verification",
  retention_class: "editor-runtime-evidence",
  natural_language_status: "prompt-ready-approval-gated",
  natural_language_blocker: null,
  mutation_surface_class: "admitted-editor-authoring-loaded-level",
  restore_boundary_class: "loaded-level-file-restore-boundary",
  candidate_expansion_boundary:
    "No parenting, prefab, transform placement, delete, property writes, or arbitrary Editor Python are admitted from this envelope.",
};

const approvalGatedSafetyEnvelope: PromptSafetyEnvelope = {
  state_scope: "Explicit level open/create within the current editor project context.",
  backup_class: "operator-managed-level-snapshot-when-creating-or-overwriting",
  rollback_class: "manual-level-restore-or-level-delete",
  verification_class: "loaded-level-context verification",
  retention_class: "editor-runtime-evidence",
  natural_language_status: "prompt-ready-approval-gated",
  natural_language_blocker: null,
};

describe("prompt safety detail panels", () => {
  it("renders persisted prompt safety evidence in execution detail", () => {
    const execution: ExecutionRecord = {
      id: "exec-entity-1",
      run_id: "run-entity-1",
      request_id: "req-entity-1",
      agent: "editor-control",
      tool: "editor.entity.create",
      execution_mode: "real",
      status: "succeeded",
      started_at: "2026-04-21T00:00:00Z",
      finished_at: "2026-04-21T00:00:05Z",
      warnings: [],
      logs: [],
      artifact_ids: ["art-entity-1"],
      details: {
        inspection_surface: "editor_entity_created",
        prompt_safety: entityCreateSafetyEnvelope,
      },
      result_summary:
        "This run used the admitted bridge-backed real editor entity creation path for root-level named entity creation on the loaded/current level.",
    };

    render(<ExecutionDetailPanel item={execution} loading={false} error={null} />);

    expect(screen.getByText("How to use this panel")).toBeInTheDocument();
    expect(screen.getByText("Prompt Safety Envelope")).toBeInTheDocument();
    expect(screen.getByText("prompt-ready-approval-gated")).toBeInTheDocument();
    expect(
      screen.queryByText(/Excluded from the admitted real set on current tested local targets/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(entityCreateSafetyEnvelope.state_scope)).toBeInTheDocument();
    expect(screen.getByText("admitted-editor-authoring-loaded-level")).toBeInTheDocument();
    expect(screen.getByText("loaded-level-file-restore-boundary")).toBeInTheDocument();
    expect(
      screen.getByText(/arbitrary Editor Python are admitted from this envelope/i),
    ).toBeInTheDocument();
  });

  it("renders persisted prompt safety evidence in artifact detail", () => {
    const artifact: ArtifactRecord = {
      id: "art-level-1",
      run_id: "run-level-1",
      execution_id: "exec-level-1",
      label: "Editor level evidence",
      kind: "editor_automation_evidence",
      uri: "artifact://exec-level-1",
      path: null,
      content_type: "application/json",
      simulated: false,
      created_at: "2026-04-21T00:00:10Z",
      metadata: {
        inspection_surface: "editor_level_opened",
        prompt_safety: approvalGatedSafetyEnvelope,
      },
    };

    render(<ArtifactDetailPanel item={artifact} loading={false} error={null} />);

    expect(screen.getByText("How to use this panel")).toBeInTheDocument();
    expect(screen.getByText("Prompt Safety Envelope")).toBeInTheDocument();
    expect(screen.getByText("prompt-ready-approval-gated")).toBeInTheDocument();
    expect(screen.getByText(approvalGatedSafetyEnvelope.state_scope)).toBeInTheDocument();
    expect(
      screen.getByText(approvalGatedSafetyEnvelope.verification_class),
    ).toBeInTheDocument();
  });

  it("shows a return action when execution detail is auto-opened from Asset Forge packet origin", () => {
    const onOpenAssetForgeWorkspace = vi.fn();
    const execution: ExecutionRecord = {
      id: "exec-forge-1",
      run_id: "run-forge-1",
      request_id: "req-forge-1",
      agent: "editor-control",
      tool: "project.inspect",
      execution_mode: "real",
      status: "succeeded",
      started_at: "2026-04-21T00:00:00Z",
      finished_at: "2026-04-21T00:00:03Z",
      warnings: [],
      logs: [],
      artifact_ids: [],
      details: {},
      result_summary: "Execution detail opened from Asset Forge packet origin.",
    };

    render(
      <ExecutionDetailPanel
        item={execution}
        loading={false}
        error={null}
        refreshHint="Auto-opened from Asset Forge packet origin: execution evidence."
        onOpenAssetForgeWorkspace={onOpenAssetForgeWorkspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Return to Asset Forge workspace" }));
    expect(onOpenAssetForgeWorkspace).toHaveBeenCalledTimes(1);
  });

  it("shows a return action when artifact detail is auto-opened from Asset Forge packet origin", () => {
    const onOpenAssetForgeWorkspace = vi.fn();
    const artifact: ArtifactRecord = {
      id: "art-forge-1",
      run_id: "run-forge-1",
      execution_id: "exec-forge-1",
      label: "Asset Forge artifact evidence",
      kind: "asset_readback_review_packet",
      uri: "artifact://exec-forge-1/packet",
      path: null,
      content_type: "application/json",
      simulated: false,
      created_at: "2026-04-21T00:00:10Z",
      metadata: {},
    };

    render(
      <ArtifactDetailPanel
        item={artifact}
        loading={false}
        error={null}
        refreshHint="Auto-opened from Asset Forge packet origin: artifact evidence."
        onOpenAssetForgeWorkspace={onOpenAssetForgeWorkspace}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Return to Asset Forge workspace" }));
    expect(onOpenAssetForgeWorkspace).toHaveBeenCalledTimes(1);
  });
});
