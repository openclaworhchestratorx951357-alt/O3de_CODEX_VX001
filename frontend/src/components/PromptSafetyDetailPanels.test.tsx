import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ArtifactDetailPanel from "./ArtifactDetailPanel";
import ExecutionDetailPanel from "./ExecutionDetailPanel";
import type { ArtifactRecord, ExecutionRecord, PromptSafetyEnvelope } from "../types/contracts";

const blockedSafetyEnvelope: PromptSafetyEnvelope = {
  state_scope: "Explicit entity creation within the currently loaded level.",
  backup_class: "operator-managed-level-snapshot-before-entity-mutation",
  rollback_class: "manual-level-restore-or-explicit-entity-removal",
  verification_class: "entity-readback-and-level-context verification",
  retention_class: "runtime-reaching-editor-evidence",
  natural_language_status: "prompt-blocked-pending-admission",
  natural_language_blocker:
    "Excluded from the admitted real set on current tested local targets until prefab-safe entity creation is proven stable.",
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
        prompt_safety: blockedSafetyEnvelope,
      },
      result_summary:
        "This run used a runtime-reaching editor.entity.create path that remains excluded from the admitted real set on McpSandbox.",
    };

    render(<ExecutionDetailPanel item={execution} loading={false} error={null} />);

    expect(screen.getByText("Prompt Safety Envelope")).toBeInTheDocument();
    expect(screen.getByText("prompt-blocked-pending-admission")).toBeInTheDocument();
    expect(
      screen.getByText(/Excluded from the admitted real set on current tested local targets/i),
    ).toBeInTheDocument();
    expect(screen.getByText(blockedSafetyEnvelope.state_scope)).toBeInTheDocument();
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

    expect(screen.getByText("Prompt Safety Envelope")).toBeInTheDocument();
    expect(screen.getByText("prompt-ready-approval-gated")).toBeInTheDocument();
    expect(screen.getByText(approvalGatedSafetyEnvelope.state_scope)).toBeInTheDocument();
    expect(
      screen.getByText(approvalGatedSafetyEnvelope.verification_class),
    ).toBeInTheDocument();
  });
});
