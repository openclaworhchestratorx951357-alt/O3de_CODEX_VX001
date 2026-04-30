import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DockableCockpitLayout from "./DockableCockpitLayout";
import type { CockpitPanelDefinition } from "./cockpitLayoutTypes";

const STORAGE_KEY = "o3de.appos.cockpit-layouts.v1";

function dataTransferMock(): DataTransfer {
  return {
    dropEffect: "move",
    effectAllowed: "move",
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    clearData: vi.fn(),
    getData: vi.fn(() => ""),
    setData: vi.fn(),
    setDragImage: vi.fn(),
  } as unknown as DataTransfer;
}

const basePanels: CockpitPanelDefinition[] = [
  {
    id: "panel-a",
    title: "Panel A",
    defaultZone: "left",
    scrollMode: "content",
    render: () => <div>Panel A body</div>,
  },
  {
    id: "panel-b",
    title: "Panel B",
    defaultZone: "center",
    scrollMode: "content",
    render: () => <div>Panel B body</div>,
  },
];

const reorderPanels: CockpitPanelDefinition[] = [
  {
    id: "panel-a",
    title: "Panel A",
    defaultZone: "left",
    render: () => <div>Panel A body</div>,
  },
  {
    id: "panel-b",
    title: "Panel B",
    defaultZone: "left",
    render: () => <div>Panel B body</div>,
  },
  {
    id: "panel-c",
    title: "Panel C",
    defaultZone: "center",
    render: () => <div>Panel C body</div>,
  },
];

describe("DockableCockpitLayout", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("renders drop zones and supports menu-based move between zones", () => {
    render(
      <DockableCockpitLayout
        cockpitId="layout-test"
        panels={basePanels}
      />,
    );

    expect(screen.getByTestId("dockable-layout-layout-test")).toBeInTheDocument();
    expect(screen.getByTestId("layout-test-right-drop-zone-empty")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Move")[0] as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Move Panel A panel to right" }));

    const rightZone = screen.getByTestId("layout-test-right-zone");
    expect(within(rightZone).getByLabelText("Panel A panel")).toBeInTheDocument();
  });

  it("supports pointer drag to move a panel into an empty zone", () => {
    render(
      <DockableCockpitLayout
        cockpitId="drag-test"
        panels={basePanels}
      />,
    );

    const transfer = dataTransferMock();
    fireEvent.dragStart(
      screen.getByRole("button", { name: "Move panel Panel A" }),
      { dataTransfer: transfer },
    );
    fireEvent.dragOver(screen.getByTestId("drag-test-right-zone"), { dataTransfer: transfer });
    fireEvent.drop(screen.getByTestId("drag-test-right-zone"), { dataTransfer: transfer });

    const rightZone = screen.getByTestId("drag-test-right-zone");
    expect(within(rightZone).getByLabelText("Panel A panel")).toBeInTheDocument();
  });

  it("reorders within the same zone using drop slots", () => {
    render(
      <DockableCockpitLayout
        cockpitId="reorder-test"
        panels={reorderPanels}
      />,
    );

    const transfer = dataTransferMock();
    fireEvent.dragStart(
      screen.getByRole("button", { name: "Move panel Panel B" }),
      { dataTransfer: transfer },
    );
    fireEvent.dragOver(screen.getByTestId("reorder-test-left-drop-slot-0"), { dataTransfer: transfer });
    fireEvent.drop(screen.getByTestId("reorder-test-left-drop-slot-0"), { dataTransfer: transfer });

    const headings = within(screen.getByTestId("reorder-test-left-zone")).getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("Panel B");
    expect(headings[1]).toHaveTextContent("Panel A");
  });

  it("resets layout back to default after moving and keeps panel collapse usable", () => {
    render(
      <DockableCockpitLayout
        cockpitId="reset-test"
        panels={basePanels}
      />,
    );

    fireEvent.click(screen.getAllByText("Move")[0] as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Move Panel A panel to right" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse Panel A panel" }));
    expect(screen.queryByTestId("dockable-panel-body-panel-a")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand Panel A panel" }));
    expect(screen.getByTestId("dockable-panel-body-panel-a")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset layout" }));
    const leftZone = screen.getByTestId("reset-test-left-zone");
    expect(within(leftZone).getByLabelText("Panel A panel")).toBeInTheDocument();
  });

  it("persists moved layout state per cockpit id across remount", () => {
    const first = render(
      <DockableCockpitLayout
        cockpitId="persist-create-game"
        panels={basePanels}
      />,
    );

    fireEvent.click(screen.getAllByText("Move")[0] as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Move Panel A panel to right" }));

    first.unmount();

    render(
      <DockableCockpitLayout
        cockpitId="persist-create-game"
        panels={basePanels}
      />,
    );

    const rightZone = screen.getByTestId("persist-create-game-right-zone");
    expect(within(rightZone).getByLabelText("Panel A panel")).toBeInTheDocument();
  });

  it("keeps panel bodies scroll-contained", () => {
    render(
      <DockableCockpitLayout
        cockpitId="scroll-test"
        panels={basePanels}
      />,
    );

    expect(screen.getByTestId("dockable-panel-body-panel-a")).toHaveStyle({ overflow: "auto" });
  });
});
