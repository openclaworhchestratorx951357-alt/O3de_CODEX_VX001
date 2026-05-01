import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DockablePanel from "./DockablePanel";

describe("DockablePanel", () => {
  it("renders a drag handle with an accessible move label", () => {
    render(
      <DockablePanel
        panelId="panel-tools"
        title="Tools"
        collapsed={false}
        collapsible
        draggable
        onToggleCollapse={vi.fn()}
        body={<div>Tools body</div>}
      />,
    );

    expect(screen.getByRole("button", { name: "Move panel Tools" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse Tools panel" })).toBeInTheDocument();
  });

  it("disables dragging when a panel is locked", () => {
    render(
      <DockablePanel
        panelId="panel-status"
        title="Status"
        collapsed={false}
        collapsible
        draggable
        locked
        onToggleCollapse={vi.fn()}
        body={<div>Status body</div>}
      />,
    );

    expect(screen.getByRole("button", { name: "Move panel Status" })).toBeDisabled();
  });

  it("supports menu-based move fallback", () => {
    const onMoveToZone = vi.fn();
    render(
      <DockablePanel
        panelId="panel-evidence"
        title="Evidence"
        collapsed={false}
        collapsible
        draggable
        onToggleCollapse={vi.fn()}
        onMoveToZone={onMoveToZone}
        body={<div>Evidence body</div>}
      />,
    );

    fireEvent.click(screen.getByText("Move"));
    fireEvent.click(screen.getByRole("button", { name: "Move Evidence panel to right" }));

    expect(onMoveToZone).toHaveBeenCalledWith("right");
  });

  it("keeps header actions visible when collapsed and hides the body", () => {
    render(
      <DockablePanel
        panelId="panel-pipeline"
        title="Pipeline"
        collapsed
        collapsible
        draggable
        onToggleCollapse={vi.fn()}
        body={<div>Pipeline body</div>}
      />,
    );

    expect(screen.queryByTestId("dockable-panel-body-panel-pipeline")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand Pipeline panel" })).toBeInTheDocument();
  });
});
