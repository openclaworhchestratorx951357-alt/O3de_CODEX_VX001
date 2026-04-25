import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  describeBuildConfigureMeaning,
  describeSettingsPatchPolicyMeaning,
} from "../lib/capabilityNarrative";
import type { ToolPolicy } from "../types/contracts";
import PoliciesPanel from "./PoliciesPanel";

const policies: ToolPolicy[] = [
  {
    agent: "editor-control",
    tool: "editor.session.open",
    approval_class: "project_write",
    adapter_family: "editor-control",
    capability_status: "real-authoring",
    real_admission_stage: "real-editor-authoring-active",
    next_real_requirement: "Keep the admitted real session path limited to the runtime-owned editor bridge.",
    args_schema: "EditorSessionOpenArgs",
    result_schema: "EditorSessionOpenResult",
    required_locks: ["editor_session"],
    risk: "medium",
    requires_approval: true,
    supports_dry_run: false,
    execution_mode: "real",
  },
  {
    agent: "project-build",
    tool: "build.configure",
    approval_class: "project_write",
    adapter_family: "project-build",
    capability_status: "plan-only",
    real_admission_stage: "real-plan-only-active",
    next_real_requirement: "Keep the real path limited to dry-run preflight only.",
    args_schema: "BuildConfigureArgs",
    result_schema: "BuildConfigureResult",
    required_locks: ["build_tree"],
    risk: "medium",
    requires_approval: true,
    supports_dry_run: true,
    execution_mode: "plan-only",
  },
  {
    agent: "project-build",
    tool: "settings.patch",
    approval_class: "project_write",
    adapter_family: "project-build",
    capability_status: "mutation-gated",
    real_admission_stage: "real-mutation-preflight-active",
    next_real_requirement: "Keep the admitted mutation path tightly scoped to manifest-backed settings evidence.",
    args_schema: "SettingsPatchArgs",
    result_schema: "SettingsPatchResult",
    required_locks: ["project_config"],
    risk: "high",
    requires_approval: true,
    supports_dry_run: true,
    execution_mode: "gated",
  },
];

describe("PoliciesPanel", () => {
  it("renders truthful execution mode and dry run support for live policy records", async () => {
    render(<PoliciesPanel items={policies} loading={false} error={null} />);

    const sessionPolicy = screen.getByText("editor.session.open").closest("li");
    const buildConfigurePolicy = screen.getByText("build.configure").closest("li");
    const settingsPatchPolicy = screen.getByText("settings.patch").closest("li");

    expect(sessionPolicy).not.toBeNull();
    expect(buildConfigurePolicy).not.toBeNull();
    expect(settingsPatchPolicy).not.toBeNull();

    expect(within(sessionPolicy as HTMLLIElement).getByText("real")).toBeInTheDocument();
    expect(screen.getByText("Governance first steps")).toBeInTheDocument();

    expect(within(buildConfigurePolicy as HTMLLIElement).getAllByText("plan-only")).toHaveLength(2);

    expect(within(settingsPatchPolicy as HTMLLIElement).getByText("gated")).toBeInTheDocument();

    const buildMeaningToggle = within(buildConfigurePolicy as HTMLLIElement).getByText("Meaning and next requirement");
    const settingsMeaningToggle = within(settingsPatchPolicy as HTMLLIElement).getByText("Meaning and next requirement");

    await userEvent.click(buildMeaningToggle);
    await userEvent.click(settingsMeaningToggle);

    expect(within(buildConfigurePolicy as HTMLLIElement).getByText("supported")).toBeInTheDocument();
    expect(within(sessionPolicy as HTMLLIElement).getByText("not supported")).toBeInTheDocument();
    expect(within(settingsPatchPolicy as HTMLLIElement).getByText("supported")).toBeInTheDocument();
    expect(screen.getByText(`Meaning: ${describeBuildConfigureMeaning()}`)).toBeInTheDocument();
    expect(screen.getByText(`Meaning: ${describeSettingsPatchPolicyMeaning()}`)).toBeInTheDocument();
  });

  it("keeps policy search aligned with execution-mode filtering", () => {
    render(<PoliciesPanel items={policies} loading={false} error={null} />);

    fireEvent.change(
      screen.getByPlaceholderText("Search policies by tool, agent, capability, risk, or locks"),
      { target: { value: "gated" } },
    );

    expect(screen.getByText("settings.patch")).toBeInTheDocument();
    expect(screen.queryByText("editor.session.open")).not.toBeInTheDocument();
    expect(screen.queryByText("build.configure")).not.toBeInTheDocument();
  });
});
