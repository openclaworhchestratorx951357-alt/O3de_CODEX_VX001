import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ArtifactRecord, ExecutionRecord, RunRecord } from "../types/contracts";
import ArtifactDetailPanel from "./ArtifactDetailPanel";
import ExecutionDetailPanel from "./ExecutionDetailPanel";
import LayoutHeader from "./LayoutHeader";
import RunDetailPanel from "./RunDetailPanel";

const runRecord: RunRecord = {
  id: "run-1",
  request_id: "req-1",
  agent: "operator",
  tool: "editor.session.open",
  status: "succeeded",
  created_at: "2026-04-21T10:00:00Z",
  updated_at: "2026-04-21T10:05:00Z",
  dry_run: false,
  requested_locks: [],
  granted_locks: [],
  warnings: [],
  execution_mode: "real",
  result_summary: "Opened the editor session.",
};

const executionRecord: ExecutionRecord = {
  id: "exec-1",
  run_id: "run-1",
  request_id: "req-1",
  agent: "operator",
  tool: "editor.level.open",
  execution_mode: "real",
  status: "succeeded",
  started_at: "2026-04-21T10:01:00Z",
  finished_at: "2026-04-21T10:02:00Z",
  warnings: [],
  logs: [],
  artifact_ids: ["art-1"],
  details: {},
  result_summary: "Opened the level in the live editor.",
};

const artifactRecord: ArtifactRecord = {
  id: "art-1",
  run_id: "run-1",
  execution_id: "exec-1",
  label: "Level proof",
  kind: "file",
  uri: "file:///tmp/level-proof.txt",
  path: "C:\\proofs\\level-proof.txt",
  content_type: "text/plain",
  simulated: false,
  created_at: "2026-04-21T10:03:00Z",
  metadata: {},
};

describe("layout header navigation help", () => {
  it("adds default operator guidance to lane actions and recent returns", async () => {
    const openHistoryEntry = vi.fn();
    const onSetLaneFilterMode = vi.fn();

    render(
      <LayoutHeader
        title="Operator Desktop"
        subtitle="Home mission control"
        pinnedRecordLabel="Run run-1"
        pinnedRecordSummary="Live editor session opened."
        nextPinnedLaneLabel="Next record"
        laneRolloverLabel="Rollover record"
        laneMemoryLabel="Saved lane"
        laneHistoryEntries={[
          {
            kind: "execution",
            id: "exec-1",
            label: "Execution exec-1",
            detail: "Return to the last admitted-real execution review checkpoint.",
          },
        ]}
        laneRecoveryLabel="Recover lane"
        laneHistoryStatusLabel="recent returns stale"
        laneOperatorNoteDraft="Need to verify the level path."
        onOpenPinnedRecord={() => {}}
        onRefocusPinnedRecord={() => {}}
        onClearPinnedRecord={() => {}}
        onClearLocalLaneContext={() => {}}
        onOpenNextPinnedLaneRecord={() => {}}
        onOpenLaneRolloverRecord={() => {}}
        onReturnToLane={() => {}}
        onCopyLaneContext={() => {}}
        onOpenLaneHistoryEntry={openHistoryEntry}
        onApplyLaneRecovery={() => {}}
        onDropStaleLaneHistory={() => {}}
        onLaneOperatorNoteDraftChange={() => {}}
        onSaveLaneOperatorNote={() => {}}
        onClearLaneOperatorNote={() => {}}
        onSetLaneFilterMode={onSetLaneFilterMode}
        refreshActions={[
          {
            label: "Refresh dashboard",
            onClick: () => {},
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Open pinned lane" })).toHaveAttribute(
      "title",
      "Use the pinned-lane actions to refocus, clear, recover, annotate, or filter the current operator lane. Open the pinned record to continue the current operator lane from the shared home header.",
    );
    expect(screen.getByRole("button", { name: "Recent: Execution exec-1" })).toHaveAttribute(
      "title",
      "Use the pinned-lane actions to refocus, clear, recover, annotate, or filter the current operator lane. Return to recent execution Execution exec-1 from browser-local lane history without losing the current operator context. Return to the last admitted-real execution review checkpoint.",
    );
    expect(screen.getByRole("button", { name: "Save lane note" })).toHaveAttribute(
      "title",
      "Use the pinned-lane actions to refocus, clear, recover, annotate, or filter the current operator lane. Save this browser-local operator note so the pinned lane can be resumed with the same local context.",
    );
    expect(screen.getByRole("button", { name: "Refresh dashboard" })).toHaveAttribute(
      "title",
      "Refresh the home overview when the persisted aggregate may be stale. Refresh the full desktop shell summary so home, runtime, operations, and records signals stay aligned.",
    );
    expect(screen.getByRole("button", { name: "Simulated only" })).toHaveAttribute(
      "title",
      "Use the pinned-lane actions to refocus, clear, recover, annotate, or filter the current operator lane. Filter the pinned lane to simulated-only signals so admitted-real and simulated wording stays explicit.",
    );

    await userEvent.click(screen.getByRole("button", { name: "Recent: Execution exec-1" }));
    expect(openHistoryEntry).toHaveBeenCalledWith({
      kind: "execution",
      id: "exec-1",
      label: "Execution exec-1",
      detail: "Return to the last admitted-real execution review checkpoint.",
    });

    await userEvent.click(screen.getByRole("button", { name: "Warnings only" }));
    expect(onSetLaneFilterMode).toHaveBeenCalledWith("warnings");
  });
});

describe("detail panel navigation help", () => {
  it("adds default titles to run detail shortcut cards and lane returns", () => {
    render(
      <RunDetailPanel
        item={runRecord}
        loading={false}
        error={null}
        relatedExecutionId="exec-1"
        priorityShortcutLabel="Open prioritized execution"
        priorityShortcutDescription="Continue with the admitted-real execution review."
        warningShortcutLabel="Open warning execution"
        warningShortcutDescription="Inspect the warning-focused execution lane."
        laneHistoryEntries={[
          {
            kind: "artifact",
            id: "art-1",
            label: "Artifact art-1",
            detail: "Return to the previously reviewed artifact proof.",
          },
        ]}
        onOpenPriorityRecord={() => {}}
        onOpenWarningRecord={() => {}}
        onOpenLaneHistoryEntry={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Open prioritized execution" })).toHaveAttribute(
      "title",
      "Use the navigation buttons to reopen breadcrumbs, related records, or the origin artifact without leaving the detail workflow. Use the Open prioritized execution shortcut to reopen the related record from the current run-detail workflow.",
    );
    expect(screen.getByRole("button", { name: "Open warning execution" })).toHaveAttribute(
      "title",
      "Use the navigation buttons to reopen breadcrumbs, related records, or the origin artifact without leaving the detail workflow. Use the Open warning execution shortcut to reopen the related record from the current run-detail workflow.",
    );
    expect(screen.getByRole("button", { name: "Recent: Artifact art-1" })).toHaveAttribute(
      "title",
      "Use the navigation buttons to reopen breadcrumbs, related records, or the origin artifact without leaving the detail workflow. Return to recent artifact Artifact art-1 from the current run-detail lane history. Return to the previously reviewed artifact proof.",
    );
  });

  it("adds default titles to execution detail shortcut cards and lane returns", () => {
    render(
      <ExecutionDetailPanel
        item={executionRecord}
        loading={false}
        error={null}
        priorityShortcutLabel="Open prioritized artifact"
        priorityShortcutDescription="Inspect the artifact that should be reviewed next."
        warningShortcutLabel="Open risk artifact"
        warningShortcutDescription="Inspect the artifact carrying audit or warning risk."
        laneHistoryEntries={[
          {
            kind: "run",
            id: "run-1",
            label: "Run run-1",
            detail: "Return to the previous run-level checkpoint.",
          },
        ]}
        onOpenPriorityRecord={() => {}}
        onOpenWarningRecord={() => {}}
        onOpenLaneHistoryEntry={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Open prioritized artifact" })).toHaveAttribute(
      "title",
      "Use these buttons to reopen related artifacts, breadcrumbs, or origin context without leaving the detail workflow. Use the Open prioritized artifact shortcut to reopen the related record from the current execution-detail workflow.",
    );
    expect(screen.getByRole("button", { name: "Open risk artifact" })).toHaveAttribute(
      "title",
      "Use these buttons to reopen related artifacts, breadcrumbs, or origin context without leaving the detail workflow. Use the Open risk artifact shortcut to reopen the related record from the current execution-detail workflow.",
    );
    expect(screen.getByRole("button", { name: "Recent: Run run-1" })).toHaveAttribute(
      "title",
      "Use these buttons to reopen related artifacts, breadcrumbs, or origin context without leaving the detail workflow. Return to recent run Run run-1 from the current execution-detail lane history. Return to the previous run-level checkpoint.",
    );
  });

  it("adds default titles to artifact detail shortcut cards and lane returns", () => {
    render(
      <ArtifactDetailPanel
        item={artifactRecord}
        loading={false}
        error={null}
        priorityShortcutLabel="Open sibling artifact"
        priorityShortcutDescription="Review the sibling artifact that now carries priority."
        warningShortcutLabel="Open risk sibling artifact"
        warningShortcutDescription="Review the sibling artifact with follow-up risk."
        laneHistoryEntries={[
          {
            kind: "execution",
            id: "exec-1",
            label: "Execution exec-1",
            detail: "Return to the execution linked to this proof artifact.",
          },
        ]}
        onOpenPriorityRecord={() => {}}
        onOpenWarningRecord={() => {}}
        onOpenLaneHistoryEntry={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Open sibling artifact" })).toHaveAttribute(
      "title",
      "Use these buttons to reopen breadcrumbs or sibling artifacts without leaving the detail workflow. Use the Open sibling artifact shortcut to reopen the related record from the current artifact-detail workflow.",
    );
    expect(screen.getByRole("button", { name: "Open risk sibling artifact" })).toHaveAttribute(
      "title",
      "Use these buttons to reopen breadcrumbs or sibling artifacts without leaving the detail workflow. Use the Open risk sibling artifact shortcut to reopen the related record from the current artifact-detail workflow.",
    );
    expect(screen.getByRole("button", { name: "Recent: Execution exec-1" })).toHaveAttribute(
      "title",
      "Use these buttons to reopen breadcrumbs or sibling artifacts without leaving the detail workflow. Return to recent execution Execution exec-1 from the current artifact-detail lane history. Return to the execution linked to this proof artifact.",
    );
  });
});
