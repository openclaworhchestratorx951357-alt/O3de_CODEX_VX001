import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Phase7CapabilitySummaryPanel from "./Phase7CapabilitySummaryPanel";
import type { CatalogAgent } from "../types/contracts";

const agents: CatalogAgent[] = [
  {
    id: "editor-control",
    name: "Editor Control",
    role: "Editor authoring actions",
    summary: "Editor runtime and authoring surfaces.",
    tools: [
      {
        name: "editor.session.open",
        description: "Attach to the live editor session.",
        approval_class: "project_write",
        default_locks: ["editor_session"],
        default_timeout_s: 60,
        risk: "medium",
        tags: ["editor", "session"],
        capability_status: "real-authoring",
      },
      {
        name: "editor.entity.create",
        description: "Create an entity in the live editor.",
        approval_class: "content_write",
        default_locks: ["editor_session"],
        default_timeout_s: 60,
        risk: "high",
        tags: ["editor", "entity"],
        capability_status: "runtime-reaching",
      },
    ],
  },
  {
    id: "project-build",
    name: "Project Build",
    role: "Project inspection and build actions",
    summary: "Manifest and configure surfaces.",
    tools: [
      {
        name: "project.inspect",
        description: "Inspect project state.",
        approval_class: "read_only",
        default_locks: ["project_config"],
        default_timeout_s: 30,
        risk: "low",
        tags: ["project", "inspect"],
        capability_status: "hybrid-read-only",
      },
      {
        name: "build.configure",
        description: "Configure the build tree.",
        approval_class: "project_write",
        default_locks: ["build_tree"],
        default_timeout_s: 120,
        risk: "medium",
        tags: ["build", "configure"],
        capability_status: "plan-only",
      },
      {
        name: "settings.patch",
        description: "Patch project settings.",
        approval_class: "project_write",
        default_locks: ["project_config"],
        default_timeout_s: 60,
        risk: "high",
        tags: ["settings", "mutation"],
        capability_status: "mutation-gated",
      },
      {
        name: "asset.reimport",
        description: "Simulated asset reimport action.",
        approval_class: "content_write",
        default_locks: ["asset_pipeline"],
        default_timeout_s: 90,
        risk: "medium",
        tags: ["asset", "simulate"],
        capability_status: "simulated-only",
      },
    ],
  },
];

describe("Phase7CapabilitySummaryPanel", () => {
  it("renders grouped capability buckets and tool counts", () => {
    render(<Phase7CapabilitySummaryPanel agents={agents} />);

    expect(screen.getByText("Phase 7 Capability Summary")).toBeInTheDocument();
    expect(screen.getByText("real-authoring surfaces: 1")).toBeInTheDocument();
    expect(screen.getByText("runtime-reaching surfaces: 1")).toBeInTheDocument();
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
  });
});
