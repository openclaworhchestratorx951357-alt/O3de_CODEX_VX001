import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import SystemStatusPanel from "./SystemStatusPanel";
import type { O3DEBridgeStatus, ReadinessStatus } from "../types/contracts";

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

Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

const readiness: ReadinessStatus = {
  ok: true,
  service: "backend",
  execution_mode: "hybrid",
  persistence_ready: true,
  requested_database_strategy: "sqlite",
  database_strategy: "SQLite via local file",
  database_path: "C:/tmp/control-plane.sqlite3",
  persistence_warning: null,
  attempted_database_paths: ["C:/tmp/control-plane.sqlite3"],
  adapter_mode: {
    ready: true,
    configured_mode: "hybrid",
    active_mode: "hybrid",
    supports_real_execution: true,
    contract_version: "v0.1",
    execution_boundary: "admitted editor bridge boundary",
    supported_modes: ["hybrid", "simulated"],
    available_families: ["editor-control"],
    real_tool_paths: ["editor.session.open", "editor.level.open"],
    plan_only_tool_paths: ["build.configure", "settings.patch"],
    simulated_tool_paths: ["editor.entity.create"],
    warning: null,
    notes: [],
  },
  schema_validation: {
    mode: "subset-json-schema",
    schema_scope: "published-tool-arg-result-schemas",
    supports_request_args: true,
    supports_result_conformance: true,
    supports_persisted_execution_details: true,
    supports_persisted_artifact_metadata: true,
    active_keywords: ["$ref"],
    active_unsupported_keywords: [],
    active_metadata_keywords: ["$schema"],
    supported_keywords: ["allOf"],
    supported_refs: [],
    unsupported_keywords: ["oneOf"],
    persisted_execution_details_tool_count: 2,
    persisted_artifact_metadata_tool_count: 2,
    persisted_execution_details_tools: ["editor.session.open", "editor.level.open"],
    persisted_artifact_metadata_tools: ["editor.session.open", "editor.level.open"],
    persisted_family_coverage: [
      {
        family: "editor-control",
        total_tools: 4,
        execution_details_tools: 2,
        artifact_metadata_tools: 2,
        covered_tools: ["editor.session.open", "editor.level.open"],
        uncovered_tools: ["editor.entity.create", "editor.component.add"],
      },
    ],
    notes: [],
  },
  dependencies: ["sqlite approvals store", "adapter mode: hybrid"],
};

const bridgeStatus: O3DEBridgeStatus = {
  project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
  project_root_exists: true,
  bridge_root: "C:/Users/topgu/O3DE/Projects/McpSandbox/user/ControlPlaneBridge",
  inbox_path: "C:/Users/topgu/O3DE/Projects/McpSandbox/user/ControlPlaneBridge/inbox",
  processing_path: "C:/Users/topgu/O3DE/Projects/McpSandbox/user/ControlPlaneBridge/processing",
  results_path: "C:/Users/topgu/O3DE/Projects/McpSandbox/user/ControlPlaneBridge/results",
  deadletter_path: "C:/Users/topgu/O3DE/Projects/McpSandbox/user/ControlPlaneBridge/deadletter",
  heartbeat_path: "C:/Users/topgu/O3DE/Projects/McpSandbox/user/ControlPlaneBridge/heartbeat/status.json",
  log_path: "C:/Users/topgu/O3DE/Projects/McpSandbox/user/ControlPlaneBridge/logs/control_plane_bridge.log",
  source_label: "project-local-control-plane-editor-bridge",
  configured: true,
  heartbeat_fresh: true,
  queue_counts: {
    inbox: 0,
    processing: 0,
    results: 0,
    deadletter: 2,
  },
  heartbeat: {
    heartbeat_at: "2026-04-21T04:57:20.414912Z",
    project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
    running: true,
    active_level_path: "C:/Users/topgu/O3DE/Projects/McpSandbox/Levels/DefaultLevel",
  },
  last_results_cleanup: {
    attempted_at: "2026-04-21T05:01:20.414912Z",
    outcome: "stale-results-removed",
    min_age_s: 300,
    deleted_response_count: 2,
    retained_response_count: 0,
    deadletter_preserved_count: 2,
  },
  recent_deadletters: [
    {
      bridge_command_id: "dead-1",
      operation: "editor.level.open",
      error_code: "LEVEL_CONTEXT_NOT_OBSERVED",
      result_summary: "Persistent bridge did not observe the requested level as active after the open/create call.",
      finished_at: "2026-04-21T04:21:59.259582Z",
      result_path: "C:/Users/topgu/O3DE/Projects/McpSandbox/user/ControlPlaneBridge/deadletter/dead-1.json.resp",
    },
    {
      bridge_command_id: "dead-2",
      operation: "editor.level.open",
      error_code: "LEVEL_CONTEXT_NOT_OBSERVED",
      result_summary: "Persistent bridge did not observe the requested level as active after the open/create call.",
      finished_at: "2026-04-21T04:21:48.838020Z",
      result_path: "C:/Users/topgu/O3DE/Projects/McpSandbox/user/ControlPlaneBridge/deadletter/dead-2.json.resp",
    },
  ],
};

describe("SystemStatusPanel", () => {
  it("renders bridge diagnostics alongside backend readiness", async () => {
    const handleCleanupBridgeResults = vi.fn();
    const clipboardWrite = vi.mocked(navigator.clipboard.writeText);
    clipboardWrite.mockClear();
    render(
      <SystemStatusPanel
        readiness={readiness}
        bridgeStatus={bridgeStatus}
        loading={false}
        error={null}
        bridgeError={null}
        bridgeCleanupBusy={false}
        bridgeCleanupStatus="Removed 2 stale successful bridge responses; deadletters preserved."
        onCleanupBridgeResults={handleCleanupBridgeResults}
      />,
    );

    expect(screen.getByText("Editor Bridge")).toBeInTheDocument();
    expect(screen.getByText("How to use this panel")).toBeInTheDocument();
    expect(screen.getByText("Heartbeat fresh")).toBeInTheDocument();
    expect(screen.getByText("Recent deadletters")).toBeInTheDocument();
    expect(screen.getByText("Deadletter path")).toBeInTheDocument();
    expect(screen.getByText("Bridge log path")).toBeInTheDocument();
    expect(screen.getByText("Last cleanup")).toBeInTheDocument();
    expect(screen.getByText("Cleanup outcome")).toBeInTheDocument();
    expect(screen.getByText("stale results removed")).toBeInTheDocument();
    expect(screen.getAllByText("editor.level.open").length).toBeGreaterThan(0);
    expect(screen.getByText("Clear stale success results")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear stale success results" }),
    ).toHaveAttribute(
      "title",
      "Use this only to remove stale successful bridge transport artifacts; it does not delete deadletters.",
    );
    expect(
      screen.getByText(/Deadletters remain preserved by default/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Copy recent deadletter follow-up draft:/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Removed 2 stale successful bridge responses; deadletters preserved\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Last cleanup removed 2 stale successful responses, retained 0, and preserved 2 deadletters\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Repeated deadletter pattern: 2 recent deadletters for editor\.level\.open with LEVEL_CONTEXT_NOT_OBSERVED\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Bridge telemetry reflects the persistent Gem-backed editor host only/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Backend")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Clear stale success results" }));
    expect(handleCleanupBridgeResults).toHaveBeenCalledTimes(1);

    await userEvent.click(
      screen.getByRole("button", {
        name: /Copy Bridge deadletter follow-up draft \(browser-local clipboard only\)/i,
      }),
    );
    expect(clipboardWrite).toHaveBeenCalledTimes(1);
  });

  it("renders no-stale-results cleanup snapshots explicitly", () => {
    render(
      <SystemStatusPanel
        readiness={readiness}
        bridgeStatus={{
          ...bridgeStatus,
          last_results_cleanup: {
            attempted_at: "2026-04-21T05:14:04.952948Z",
            outcome: "no-stale-results-removed",
            min_age_s: 300,
            deleted_response_count: 0,
            retained_response_count: 0,
            deadletter_preserved_count: 6,
          },
        }}
        loading={false}
        error={null}
        bridgeError={null}
        bridgeCleanupBusy={false}
        bridgeCleanupStatus={null}
        onCleanupBridgeResults={null}
      />,
    );

    expect(screen.getByText("Cleanup outcome")).toBeInTheDocument();
    expect(screen.getByText("no stale results removed")).toBeInTheDocument();
    expect(
      screen.getByText(/Last cleanup removed 0 stale successful responses, retained 0, and preserved 6 deadletters\./i),
    ).toBeInTheDocument();
  });

  it("renders a heartbeat lag note when bridge context is still catching up", () => {
    render(
      <SystemStatusPanel
        readiness={readiness}
        bridgeStatus={{
          ...bridgeStatus,
          queue_counts: {
            inbox: 1,
            processing: 0,
            results: 0,
            deadletter: 2,
          },
          heartbeat: {
            ...bridgeStatus.heartbeat,
            active_level_path: null,
            running: true,
          },
        }}
        loading={false}
        error={null}
        bridgeError={null}
        bridgeCleanupBusy={false}
        bridgeCleanupStatus={null}
        onCleanupBridgeResults={null}
      />,
    );

    expect(
      screen.getByText(/Bridge heartbeat is healthy, but the editor context snapshot may still be catching up after a real editor action\./i),
    ).toBeInTheDocument();
  });
});
