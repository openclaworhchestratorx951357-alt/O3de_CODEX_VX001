import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import OperatorOverviewPanel from "./OperatorOverviewPanel";
import type { ControlPlaneSummaryResponse } from "../types/contracts";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const summary: ControlPlaneSummaryResponse = {
  prompt_sessions_total: 3,
  prompt_sessions_by_status: {
    completed: 1,
    waiting_approval: 2,
  },
  prompt_sessions_waiting_approval: 2,
  prompt_sessions_with_real_editor_children: 1,
  runs_total: 4,
  runs_by_status: { succeeded: 2, waiting_approval: 2 },
  runs_by_related_execution_mode: { real: 2, simulated: 2 },
  runs_by_inspection_surface: { editor_entity_created: 1, simulated: 3 },
  runs_by_fallback_category: {},
  runs_by_manifest_source_of_truth: {},
  approvals_total: 2,
  approvals_pending: 1,
  approvals_decided: 1,
  executions_total: 4,
  executions_by_status: { succeeded: 2, waiting_approval: 2 },
  executions_by_mode: { real: 2, simulated: 2 },
  executions_by_attempt_state: { completed: 2 },
  executions_by_failure_category: {},
  executions_by_inspection_surface: { editor_session_runtime: 1, editor_entity_created: 1 },
  executions_by_fallback_category: {},
  executions_by_manifest_source_of_truth: {},
  executors_total: 1,
  executors_by_availability_state: { available: 1 },
  workspaces_total: 1,
  workspaces_by_state: { ready: 1 },
  artifacts_total: 2,
  artifacts_by_mode: { real: 2 },
  artifacts_by_inspection_surface: { editor_entity_created: 1, editor_session_runtime: 1 },
  artifacts_by_fallback_category: {},
  artifacts_by_manifest_source_of_truth: {},
  events_total: 3,
  active_events: 1,
  events_by_severity: { info: 2, warning: 1 },
  locks_total: 1,
};

describe("OperatorOverviewPanel", () => {
  it("renders prompt-session awareness alongside operator summary counts", () => {
    render(
      <OperatorOverviewPanel
        summary={summary}
        loading={false}
        error={null}
        onRunStatusSelect={() => {}}
        onPendingApprovalsSelect={() => {}}
        onExecutionModeSelect={() => {}}
        onArtifactModeSelect={() => {}}
        onEventSeveritySelect={() => {}}
      />,
    );

    expect(screen.getByText("Prompt Sessions")).toBeInTheDocument();
    expect(screen.getByText("prompt sessions: 3")).toBeInTheDocument();
    expect(screen.getByText("Real editor child paths")).toBeInTheDocument();
    expect(screen.getAllByText("waiting_approval: 2").length).toBeGreaterThan(0);
  });
});
