import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { within } from "@testing-library/react";

import Phase7CapabilitySummaryPanel from "./Phase7CapabilitySummaryPanel";
import type { ToolPolicy } from "../types/contracts";

const policies: ToolPolicy[] = [
  {
    agent: "editor-control",
    tool: "editor.session.open",
    approval_class: "project_write",
    adapter_family: "editor-control",
    capability_status: "real-authoring",
    real_admission_stage: "real-editor-authoring-active",
    next_real_requirement: "Keep the admitted real path limited to runtime-owned session attachment.",
    args_schema: "EditorSessionOpenArgs",
    result_schema: "EditorSessionOpenResult",
    required_locks: ["editor_session"],
    risk: "medium",
    requires_approval: true,
    supports_dry_run: false,
    execution_mode: "real",
  },
  {
    agent: "editor-control",
    tool: "editor.entity.create",
    approval_class: "content_write",
    adapter_family: "editor-control",
    capability_status: "real-authoring",
    real_admission_stage: "real-editor-authoring-active",
    next_real_requirement:
      "Keep the admitted real path limited to root-level named entity creation on the currently loaded level, without parenting, prefab instantiation, or transform placement.",
    args_schema: "EditorEntityCreateArgs",
    result_schema: "EditorEntityCreateResult",
    required_locks: ["editor_session"],
    risk: "high",
    requires_approval: true,
    supports_dry_run: false,
    execution_mode: "real",
  },
  {
    agent: "project-build",
    tool: "project.inspect",
    approval_class: "read_only",
    adapter_family: "project-build",
    capability_status: "hybrid-read-only",
    real_admission_stage: "real-read-only-active",
    next_real_requirement: "Keep manifest-backed read-only evidence truthful.",
    args_schema: "ProjectInspectArgs",
    result_schema: "ProjectInspectResult",
    required_locks: ["project_config"],
    risk: "low",
    requires_approval: false,
    supports_dry_run: true,
    execution_mode: "real",
  },
  {
    agent: "project-build",
    tool: "build.configure",
    approval_class: "project_write",
    adapter_family: "project-build",
    capability_status: "plan-only",
    real_admission_stage: "real-plan-only-active",
    next_real_requirement: "Keep real execution limited to dry-run preflight.",
    args_schema: "BuildConfigureArgs",
    result_schema: "BuildConfigureResult",
    required_locks: ["build_tree"],
    risk: "medium",
    requires_approval: true,
    supports_dry_run: true,
    execution_mode: "simulated",
  },
  {
    agent: "project-build",
    tool: "settings.patch",
    approval_class: "project_write",
    adapter_family: "project-build",
    capability_status: "mutation-gated",
    real_admission_stage: "real-mutation-preflight-active",
    next_real_requirement: "Keep real execution tightly limited to the admitted manifest-backed path.",
    args_schema: "SettingsPatchArgs",
    result_schema: "SettingsPatchResult",
    required_locks: ["project_config"],
    risk: "high",
    requires_approval: true,
    supports_dry_run: true,
    execution_mode: "simulated",
  },
  {
    agent: "asset-control",
    tool: "asset.reimport",
    approval_class: "content_write",
    adapter_family: "asset-control",
    capability_status: "simulated-only",
    real_admission_stage: "simulated-only",
    next_real_requirement: "Remain simulated until a tool-specific real adapter gate is admitted.",
    args_schema: "AssetReimportArgs",
    result_schema: "AssetReimportResult",
    required_locks: ["asset_pipeline"],
    risk: "medium",
    requires_approval: true,
    supports_dry_run: true,
    execution_mode: "simulated",
  },
];

describe("Phase7CapabilitySummaryPanel", () => {
  it("renders grouped capability buckets from live policy records", () => {
    render(
      <Phase7CapabilitySummaryPanel
        items={policies}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText("Phase 7 Capability Summary")).toBeInTheDocument();
    expect(screen.getByText("real-authoring surfaces: 2")).toBeInTheDocument();
    expect(screen.queryByText("runtime-reaching surfaces: 1")).not.toBeInTheDocument();
    expect(screen.getByText("hybrid-read-only surfaces: 1")).toBeInTheDocument();
    expect(screen.getByText("plan-only surfaces: 1")).toBeInTheDocument();
    expect(screen.getByText("mutation-gated surfaces: 1")).toBeInTheDocument();
    expect(screen.getByText("simulated-only surfaces: 1")).toBeInTheDocument();
    expect(screen.getAllByText("editor.session.open").length).toBeGreaterThan(0);
    expect(screen.getAllByText("editor.entity.create").length).toBeGreaterThan(0);
    expect(screen.getAllByText("project.inspect").length).toBeGreaterThan(0);
    expect(screen.getAllByText("build.configure").length).toBeGreaterThan(0);
    expect(screen.getAllByText("settings.patch").length).toBeGreaterThan(0);
    expect(screen.getByText("asset.reimport")).toBeInTheDocument();
    expect(screen.getAllByText("real-editor-authoring-active").length).toBeGreaterThan(0);
    expect(screen.queryByText("runtime-reaching-excluded-from-admitted-real")).not.toBeInTheDocument();
    expect(screen.getByText("real-read-only-active")).toBeInTheDocument();

    const sessionMatches = screen.getAllByText("editor.session.open");
    const entityCreateMatches = screen.getAllByText("editor.entity.create");
    const inspectMatches = screen.getAllByText("project.inspect");
    const sessionPolicy = sessionMatches[sessionMatches.length - 1]?.closest("article");
    const entityCreatePolicy = entityCreateMatches[entityCreateMatches.length - 1]?.closest("article");
    const inspectPolicy = inspectMatches[inspectMatches.length - 1]?.closest("article");

    expect(sessionPolicy).not.toBeNull();
    expect(entityCreatePolicy).not.toBeNull();
    expect(inspectPolicy).not.toBeNull();

    expect(within(sessionPolicy as HTMLElement).getByText("not supported")).toBeInTheDocument();
    expect(within(entityCreatePolicy as HTMLElement).getByText("not supported")).toBeInTheDocument();
    expect(within(inspectPolicy as HTMLElement).getByText("supported")).toBeInTheDocument();
  });

  it("renders an honest empty state until live policies are available", () => {
    render(
      <Phase7CapabilitySummaryPanel
        items={[]}
        loading={false}
        error={null}
      />,
    );

    expect(
      screen.getByText("No capability summary is available until live policies load."),
    ).toBeInTheDocument();
  });
});
