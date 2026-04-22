import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DispatchForm from "./DispatchForm";
import type { AdaptersResponse, CatalogAgent, ReadinessStatus } from "../types/contracts";

const apiMocks = vi.hoisted(() => ({
  dispatchTool: vi.fn(),
  fetchO3deTarget: vi.fn(),
}));

vi.mock("../lib/api", () => apiMocks);

const agents: CatalogAgent[] = [
  {
    id: "project-build",
    name: "Project Build",
    role: "project-build",
    summary: "Project and build actions.",
    tools: [
      {
        name: "project.inspect",
        description: "Inspect project state.",
        approval_class: "read_only",
        adapter_family: "project-build",
        capability_status: "hybrid-read-only",
        real_adapter_availability: true,
        default_locks: ["project_config"],
        default_timeout_s: 30,
        risk: "low",
        tags: ["inspect"],
      },
    ],
  },
];

const adapters: AdaptersResponse = {
  configured_mode: "hybrid",
  active_mode: "hybrid",
  supported_modes: ["hybrid", "simulated"],
  contract_version: "v0.1",
  supports_real_execution: true,
  real_tool_paths: ["project.inspect"],
  plan_only_tool_paths: [],
  simulated_tool_paths: [],
  families: [
    {
      family: "project-build",
      mode: "hybrid",
      supports_real_execution: true,
      contract_version: "v0.1",
      execution_boundary: "manifest-backed",
      ready: true,
      real_tool_paths: ["project.inspect"],
      plan_only_tool_paths: [],
      simulated_tool_paths: [],
      notes: [],
    },
  ],
  notes: [],
  warning: null,
};

const readiness: ReadinessStatus = {
  ok: true,
  service: "backend",
  execution_mode: "hybrid",
  persistence_ready: true,
  requested_database_strategy: "sqlite",
  database_strategy: "SQLite via local path",
  database_path: "runtime/control_plane.sqlite3",
  persistence_warning: null,
  attempted_database_paths: [],
  adapter_mode: {
    ready: true,
    configured_mode: "hybrid",
    active_mode: "hybrid",
    supports_real_execution: true,
    contract_version: "v0.1",
    execution_boundary: "manifest-backed",
    supported_modes: ["hybrid", "simulated"],
    available_families: ["project-build"],
    real_tool_paths: ["project.inspect"],
    plan_only_tool_paths: [],
    simulated_tool_paths: [],
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
    active_keywords: [],
    active_unsupported_keywords: [],
    active_metadata_keywords: [],
    supported_keywords: [],
    supported_refs: [],
    unsupported_keywords: [],
    persisted_execution_details_tool_count: 0,
    persisted_artifact_metadata_tool_count: 0,
    persisted_execution_details_tools: [],
    persisted_artifact_metadata_tools: [],
    persisted_family_coverage: [],
    notes: [],
  },
  dependencies: [],
};

describe("DispatchForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.fetchO3deTarget.mockResolvedValue({
      project_root: "C:/Users/topgu/O3DE/Projects/McpSandbox",
      engine_root: "C:/src/o3de",
      editor_runner: "C:/Users/topgu/O3DE/Projects/McpSandbox/build/windows/bin/profile/Editor.exe",
      runtime_runner: "C:/Users/topgu/O3DE/Projects/McpSandbox/build/windows/bin/profile/Editor.exe",
      source_label: "repo-configured-local-target",
      project_root_exists: true,
      engine_root_exists: true,
      editor_runner_exists: true,
      runtime_runner_exists: true,
    });
  });

  it("prefills the configured local target instead of placeholder paths", async () => {
    render(
      <DispatchForm
        agents={agents}
        adapters={adapters}
        readiness={readiness}
        onResponse={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("C:/Users/topgu/O3DE/Projects/McpSandbox")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("C:/src/o3de")).toBeInTheDocument();
    expect(screen.getByText(/Active local target:/i)).toBeInTheDocument();
    expect(screen.getByText(/Capability:/).parentElement).toHaveTextContent("Capability: hybrid-read-only");
    expect(screen.getByText(/Expected execution truth:/).parentElement).toHaveTextContent(
      "Expected execution truth: Possible real read-only project inspection in hybrid mode, including explicit manifest-backed config, Gem, settings, origin, presentation, identity, and tag evidence; simulated fallback remains explicit.",
    );
    expect(screen.getByText("How to use this panel")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Agent"),
    ).toHaveAttribute(
      "title",
      "Choose the owning agent family before selecting a tool or dispatching the request.",
    );
    expect(
      screen.getByRole("button", { name: "Dispatch Request" }),
    ).toHaveAttribute(
      "title",
      "Submit the typed request after agent, tool, target, locks, timeout, and args all match the intended action.",
    );
  });

  it("keeps dispatch controls honest when the live tools catalog is unavailable", async () => {
    render(
      <DispatchForm
        agents={[]}
        adapters={adapters}
        readiness={readiness}
        onResponse={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Dispatch is disabled until the live tools catalog is available.")).toBeInTheDocument();
    });

    expect(screen.getByRole("combobox", { name: "Agent" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Tool" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dispatch Request" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "No live agents available" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "No live tools available" })).toBeInTheDocument();
  });
});
