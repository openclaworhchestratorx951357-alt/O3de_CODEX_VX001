import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { AdaptersResponse } from "../types/contracts";
import AdaptersPanel from "./AdaptersPanel";

const adapters: AdaptersResponse = {
  configured_mode: "hybrid",
  active_mode: "hybrid",
  supported_modes: ["hybrid", "simulated"],
  supports_real_execution: true,
  contract_version: "v0.1",
  real_tool_paths: [
    "editor.session.open",
    "editor.level.open",
    "editor.entity.create",
    "editor.component.add",
    "editor.component.property.get",
  ],
  plan_only_tool_paths: ["build.configure", "settings.patch"],
  simulated_tool_paths: ["asset.batch.process", "render.capture.viewport"],
  warning: null,
  notes: [
    "Adapter mode selection is config-driven.",
    "Hybrid mode enables narrow admitted real editor paths only.",
  ],
  families: [
    {
      family: "editor-control",
      mode: "hybrid",
      ready: true,
      supports_real_execution: true,
      contract_version: "v0.1",
      real_tool_paths: [
        "editor.session.open",
        "editor.level.open",
        "editor.entity.create",
        "editor.component.add",
      ],
      plan_only_tool_paths: [],
      simulated_tool_paths: [],
      notes: [],
      execution_boundary:
        "Control-plane bookkeeping is real. Only the admitted editor bridge-backed paths should be treated as real on the current McpSandbox target.",
    },
  ],
};

describe("AdaptersPanel", () => {
  it("collapses long runtime path and boundary text behind explicit disclosures", async () => {
    render(
      <AdaptersPanel
        adapters={adapters}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText("Adapter Registry")).toBeInTheDocument();
    expect(screen.getByText("Registry Summary")).toBeInTheDocument();
    expect(screen.getByText("Path Rollup")).toBeInTheDocument();

    const registrySummaryCard = screen.getByText("Registry Summary").closest("article");
    const pathRollupCard = screen.getByText("Path Rollup").closest("article");

    expect(registrySummaryCard).not.toBeNull();
    expect(pathRollupCard).not.toBeNull();
    const registryBoundaryToggle = within(registrySummaryCard as HTMLElement).getByText("Execution boundary");
    const realToolPathsToggle = within(pathRollupCard as HTMLElement).getByText("Real tool paths");
    const registryBoundarySection = registryBoundaryToggle.closest("details");
    const realToolPathsSection = realToolPathsToggle.closest("details");

    expect(registryBoundaryToggle).toBeInTheDocument();
    expect(realToolPathsToggle).toBeInTheDocument();
    expect(registryBoundarySection).not.toBeNull();
    expect(realToolPathsSection).not.toBeNull();
    expect(registryBoundarySection).not.toHaveAttribute("open");
    expect(realToolPathsSection).not.toHaveAttribute("open");

    await userEvent.click(registryBoundaryToggle);
    expect(registryBoundarySection).toHaveAttribute("open");
    expect(
      within(registryBoundarySection as HTMLElement).getByText(
        /Only the admitted editor bridge-backed paths should be treated as real/i,
      ),
    ).toBeInTheDocument();

    await userEvent.click(realToolPathsToggle);
    expect(realToolPathsSection).toHaveAttribute("open");
    expect(within(realToolPathsSection as HTMLElement).getByText("editor.component.property.get")).toBeInTheDocument();
  });
});
