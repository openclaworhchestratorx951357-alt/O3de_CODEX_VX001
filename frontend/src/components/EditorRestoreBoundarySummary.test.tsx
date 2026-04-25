import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EditorRestoreBoundarySummary from "./EditorRestoreBoundarySummary";

describe("EditorRestoreBoundarySummary", () => {
  it("surfaces invoked and hash-verified cleanup restore evidence", () => {
    render(
      <EditorRestoreBoundarySummary
        details={{
          restore_boundary_id: "boundary-cleanup-1",
          restore_boundary_scope: "loaded-level-file",
          restore_strategy: "restore-loaded-level-file-from-pre-mutation-backup",
          restore_boundary_source_path:
            "C:/Users/topgu/O3DE/Projects/McpSandbox/Levels/Test/Test.prefab",
          restore_boundary_backup_path:
            "C:/repo/backend/runtime/editor_state/restore_boundaries/key/boundary.prefab",
          restore_boundary_backup_sha256: "abc123",
          restore_restored_sha256: "abc123",
          restore_boundary_available: true,
          restore_invoked: true,
          restore_succeeded: true,
          restore_verification_succeeded: true,
          restore_result: "restored_and_verified",
          restore_trigger: "live-proof-success-cleanup",
        }}
      />,
    );

    expect(screen.getByText("Editor Restore Boundary")).toBeInTheDocument();
    expect(screen.getByText("Restore invoked and hash-verified.")).toBeInTheDocument();
    expect(screen.getByText("boundary-cleanup-1")).toBeInTheDocument();
    expect(screen.getByText("restored_and_verified")).toBeInTheDocument();
    expect(screen.getByText("live-proof-success-cleanup")).toBeInTheDocument();
    expect(
      screen.getByText(/This proves file-backed loaded-level restore only/i),
    ).toBeInTheDocument();
  });

  it("keeps captured-only restore boundaries separate from cleanup claims", () => {
    render(
      <EditorRestoreBoundarySummary
        details={{
          restore_boundary_id: "boundary-available-1",
          restore_boundary_scope: "loaded-level-file",
          restore_strategy: "restore-loaded-level-file-from-pre-mutation-backup",
          restore_boundary_available: true,
          restore_invoked: false,
          restore_result: "available_not_invoked",
        }}
      />,
    );

    expect(screen.getByText("Restore boundary captured and available.")).toBeInTheDocument();
    expect(
      screen.getByText(/no cleanup or reversibility is claimed/i),
    ).toBeInTheDocument();
    expect(screen.getByText("available_not_invoked")).toBeInTheDocument();
  });
});
