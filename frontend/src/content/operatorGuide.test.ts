import { describe, expect, it } from "vitest";

import {
  getPanelControlGuide,
  getPanelGuide,
  getWorkspaceGuide,
  getWorkspaceSurfaceGuide,
  getWorkspaceWindowGuide,
  operatorGuideCatalog,
} from "./operatorGuide";

describe("operatorGuide catalog", () => {
  it("keeps the guided surface inventory in sync with the current desktop and panel coverage", () => {
    expect(operatorGuideCatalog.quickStats.map((entry) => entry.id)).toEqual([
      "approvals",
      "bridge",
      "warnings",
      "runs",
    ]);

    expect(operatorGuideCatalog.proofChecklist.map((entry) => entry.id)).toEqual([
      "canonical-target",
      "bridge-heartbeat",
      "capability-admission",
      "repo-proof-command",
      "editor-boundaries",
    ]);

    expect(operatorGuideCatalog.workspaces.map((entry) => entry.id)).toEqual([
      "home",
      "prompt",
      "builder",
      "operations",
      "runtime",
      "records",
    ]);

    expect(operatorGuideCatalog.panels.map((entry) => entry.id)).toEqual([
      "dispatch-form",
      "response-envelope",
      "agent-control",
      "system-status",
      "operator-overview",
      "overview-attention",
      "overview-review-queue",
      "overview-context-memory",
      "overview-context-strip",
      "overview-closeout-readiness",
      "overview-handoff-confidence",
      "overview-handoff-export",
      "overview-handoff-package",
      "overview-review-session",
      "prompt-control",
      "prompt-sessions",
      "prompt-plan",
      "prompt-capabilities",
      "prompt-execution-timeline",
      "runs-panel",
      "executions-panel",
      "artifacts-panel",
      "approval-queue",
      "task-timeline",
      "catalog-panel",
      "adapter-registry",
      "executors-panel",
      "executor-detail",
      "workspaces-panel",
      "locks-panel",
      "policies-panel",
      "run-detail",
      "execution-detail",
      "artifact-detail",
      "workspace-detail",
    ]);

    expect(getWorkspaceGuide("home").windows.map((entry) => entry.id)).toEqual([
      "mission-control",
      "launchpad",
      "operator-overview",
      "guidebook",
    ]);
    expect(getWorkspaceGuide("prompt").windows.map((entry) => entry.id)).toEqual([
      "prompt-studio",
    ]);
    expect(getWorkspaceGuide("builder").windows.map((entry) => entry.id)).toEqual([
      "builder-overview",
      "worktree-lanes",
      "mission-board",
      "lane-create",
      "worker-lifecycle",
      "worker-terminals",
      "autonomy-inbox",
    ]);
    expect(getWorkspaceGuide("operations").windows.map((entry) => entry.id)).toEqual([
      "command-center",
    ]);
    expect(getWorkspaceGuide("runtime").windows.map((entry) => entry.id)).toEqual([
      "runtime-console",
      "governance-deck",
    ]);
    expect(getWorkspaceGuide("records").windows.map((entry) => entry.id)).toEqual([
      "records-explorer",
    ]);

    expect(getWorkspaceGuide("operations").surfaces?.map((entry) => entry.id)).toEqual([
      "dispatch",
      "agents",
      "approvals",
      "timeline",
    ]);
    expect(getWorkspaceGuide("runtime").surfaces?.map((entry) => entry.id)).toEqual([
      "overview",
      "executors",
      "workspaces",
      "governance",
    ]);
    expect(getWorkspaceGuide("records").surfaces?.map((entry) => entry.id)).toEqual([
      "runs",
      "executions",
      "artifacts",
    ]);

    expect(getWorkspaceWindowGuide("home", "guidebook").tooltip).toMatch(/generated operator guide document/i);
    expect(getWorkspaceSurfaceGuide("runtime", "governance").tooltip).toMatch(/admitted capability boundary/i);
    expect(getPanelGuide("workspace-detail").locationLabel).toBe("Runtime > Workspaces > Workspace Detail");
    expect(operatorGuideCatalog.proofChecklist[0]?.commands[0]).toBe(
      "Invoke-RestMethod 'http://127.0.0.1:8000/o3de/target'",
    );
    expect(operatorGuideCatalog.proofChecklist[4]?.evidence[3]).toMatch(/position remain rejected/i);
    expect(operatorGuideCatalog.proofChecklist[4]?.evidence[4]).toMatch(/editor\.component\.add is admitted real-authoring/i);
    expect(operatorGuideCatalog.proofChecklist[4]?.evidence[6]).toMatch(/editor\.component\.property\.get is admitted hybrid read-only/i);

    expect(getPanelControlGuide("dispatch-form", "submit").tooltip).toMatch(/Submit the typed request/i);
    expect(getPanelControlGuide("response-envelope", "status-badge").tooltip).toMatch(/immediate dispatch outcome/i);
    expect(getPanelControlGuide("agent-control", "agent-card").tooltip).toMatch(/ownership, coordination locks, and the tool lane/i);
    expect(getPanelControlGuide("system-status", "cleanup-results").tooltip).toMatch(/stale successful bridge transport artifacts/i);
    expect(getPanelControlGuide("operator-overview", "status-filters").tooltip).toMatch(/jump into the matching run, approval, execution, artifact, event, executor, or workspace lane/i);
    expect(getPanelControlGuide("overview-attention", "action-buttons").tooltip).toMatch(/jump directly into the suggested lane/i);
    expect(getPanelControlGuide("overview-review-queue", "triage-actions").tooltip).toMatch(/mark reviewed, snooze, or return an entry to the active queue/i);
    expect(getPanelControlGuide("overview-context-memory", "note-editor").tooltip).toMatch(/save a browser-local note/i);
    expect(getPanelControlGuide("overview-context-strip", "preset-actions").tooltip).toMatch(/save, reapply, or clear browser-local overview presets/i);
    expect(getPanelControlGuide("overview-closeout-readiness", "readiness-entry").tooltip).toMatch(/lane, focus, summary label, and the local reason/i);
    expect(getPanelControlGuide("overview-handoff-confidence", "confidence-summary").tooltip).toMatch(/high-confidence, cautionary, or risky/i);
    expect(getPanelControlGuide("overview-handoff-export", "draft-preview").tooltip).toMatch(/exact handoff text that would be copied/i);
    expect(getPanelControlGuide("overview-handoff-package", "package-entry").tooltip).toMatch(/included now or excluded pending follow-up/i);
    expect(getPanelControlGuide("overview-review-session", "session-actions").tooltip).toMatch(/copy a session snapshot, return all entries to queue, or clear/i);
    expect(getPanelControlGuide("prompt-control", "execute-selected").tooltip).toMatch(/only when its admitted plan is ready/i);
    expect(getPanelControlGuide("prompt-sessions", "session-entry").tooltip).toMatch(/inspect that prompt's persisted plan, timeline, and capability posture/i);
    expect(getPanelControlGuide("prompt-plan", "args-json").tooltip).toMatch(/exact typed argument payload/i);
    expect(getPanelControlGuide("prompt-capabilities", "capability-entry").tooltip).toMatch(/typed tool identity, agent family, maturity, admission stage/i);
    expect(getPanelControlGuide("prompt-execution-timeline", "child-lineage").tooltip).toMatch(/runs, executions, artifacts, and events created by the prompt session/i);
    expect(getPanelControlGuide("catalog-panel", "tool-entry").tooltip).toMatch(/Review each tool entry/i);
    expect(getPanelControlGuide("adapter-registry", "family-card").tooltip).toMatch(/per-family readiness/i);
    expect(getPanelControlGuide("executors-panel", "search").tooltip).toMatch(/Search executors by ID, label, host, kind, or runner family/i);
    expect(getPanelControlGuide("executor-detail", "related-record-open").tooltip).toMatch(/first linked workspace, execution, run, or artifact/i);
    expect(getPanelControlGuide("workspaces-panel", "select-detail").tooltip).toMatch(/full workspace detail pane/i);
    expect(getPanelControlGuide("locks-panel", "lock-record").tooltip).toMatch(/lock name, owner run, and creation time/i);
    expect(getPanelControlGuide("policies-panel", "policy-entry").tooltip).toMatch(/governed truth for approval class/i);
    expect(getPanelControlGuide("run-detail", "jump").tooltip).toMatch(/truth-boundary/i);
    expect(getPanelControlGuide("execution-detail", "record-navigation").tooltip).toMatch(/related artifacts/i);
    expect(getPanelControlGuide("artifact-detail", "next-hop").tooltip).toMatch(/closest execution or broader run context/i);
    expect(getPanelControlGuide("workspace-detail", "related-record-open").tooltip).toMatch(/first linked execution, run, or artifact/i);
  });
});
