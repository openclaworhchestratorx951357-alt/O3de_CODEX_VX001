import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
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

const reorderThreePanels: CockpitPanelDefinition[] = [
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
    defaultZone: "left",
    render: () => <div>Panel C body</div>,
  },
];

const crossZonePanels: CockpitPanelDefinition[] = [
  {
    id: "panel-a",
    title: "Panel A",
    defaultZone: "left",
    render: () => <div>Panel A body</div>,
  },
  {
    id: "panel-b",
    title: "Panel B",
    defaultZone: "right",
    render: () => <div>Panel B body</div>,
  },
  {
    id: "panel-c",
    title: "Panel C",
    defaultZone: "right",
    render: () => <div>Panel C body</div>,
  },
];

function mockPanelRect(
  target: HTMLElement,
  rect: Pick<DOMRect, "top" | "bottom" | "left" | "right" | "width" | "height">,
) {
  vi.spyOn(target, "getBoundingClientRect").mockImplementation(() => ({
    ...rect,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  } as DOMRect));
}

function firePanelDragOverAt(
  target: HTMLElement,
  transfer: DataTransfer,
  point: { clientX: number; clientY: number },
) {
  const dragOverEvent = createEvent.dragOver(target, { dataTransfer: transfer, bubbles: true, cancelable: true });
  Object.defineProperty(dragOverEvent, "clientX", { value: point.clientX });
  Object.defineProperty(dragOverEvent, "clientY", { value: point.clientY });
  fireEvent(target, dragOverEvent);
}

function firePanelDropAt(
  target: HTMLElement,
  transfer: DataTransfer,
  point: { clientX: number; clientY: number },
) {
  const dropEvent = createEvent.drop(target, { dataTransfer: transfer, bubbles: true, cancelable: true });
  Object.defineProperty(dropEvent, "clientX", { value: point.clientX });
  Object.defineProperty(dropEvent, "clientY", { value: point.clientY });
  fireEvent(target, dropEvent);
}

describe("DockableCockpitLayout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

  it("drops on an existing panel top-half to insert before it", () => {
    render(
      <DockableCockpitLayout
        cockpitId="panel-hover-before"
        panels={reorderPanels}
      />,
    );

    const transfer = dataTransferMock();
    const panelATarget = screen.getByTestId("panel-hover-before-left-panel-target-panel-a");
    mockPanelRect(panelATarget, {
      top: 100,
      bottom: 200,
      left: 20,
      right: 320,
      width: 300,
      height: 100,
    });
    fireEvent.dragStart(
      screen.getByRole("button", { name: "Move panel Panel B" }),
      { dataTransfer: transfer },
    );
    firePanelDragOverAt(panelATarget, transfer, { clientY: 120, clientX: 80 });
    firePanelDropAt(panelATarget, transfer, { clientY: 120, clientX: 80 });

    const headings = within(screen.getByTestId("panel-hover-before-left-zone")).getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("Panel B");
    expect(headings[1]).toHaveTextContent("Panel A");
  });

  it("drops on an existing panel bottom-half to insert after it", () => {
    render(
      <DockableCockpitLayout
        cockpitId="panel-hover-after"
        panels={reorderThreePanels}
      />,
    );

    const transfer = dataTransferMock();
    const panelBTarget = screen.getByTestId("panel-hover-after-left-panel-target-panel-b");
    mockPanelRect(panelBTarget, {
      top: 100,
      bottom: 200,
      left: 20,
      right: 320,
      width: 300,
      height: 100,
    });
    fireEvent.dragStart(
      screen.getByRole("button", { name: "Move panel Panel A" }),
      { dataTransfer: transfer },
    );
    firePanelDragOverAt(panelBTarget, transfer, { clientY: 190, clientX: 80 });
    firePanelDropAt(panelBTarget, transfer, { clientY: 190, clientX: 80 });

    const headings = within(screen.getByTestId("panel-hover-after-left-zone")).getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("Panel B");
    expect(headings[1]).toHaveTextContent("Panel A");
    expect(headings[2]).toHaveTextContent("Panel C");
  });

  it("inserts into another populated zone using hovered panel position", () => {
    render(
      <DockableCockpitLayout
        cockpitId="panel-hover-cross-zone"
        panels={crossZonePanels}
      />,
    );

    const transfer = dataTransferMock();
    const panelBRightTarget = screen.getByTestId("panel-hover-cross-zone-right-panel-target-panel-b");
    mockPanelRect(panelBRightTarget, {
      top: 200,
      bottom: 300,
      left: 20,
      right: 320,
      width: 300,
      height: 100,
    });
    fireEvent.dragStart(
      screen.getByRole("button", { name: "Move panel Panel A" }),
      { dataTransfer: transfer },
    );
    firePanelDragOverAt(panelBRightTarget, transfer, { clientY: 210, clientX: 80 });
    firePanelDropAt(panelBRightTarget, transfer, { clientY: 210, clientX: 80 });

    const rightHeadings = within(screen.getByTestId("panel-hover-cross-zone-right-zone"))
      .getAllByRole("heading", { level: 3 });
    expect(rightHeadings[0]).toHaveTextContent("Panel A");
    expect(rightHeadings[1]).toHaveTextContent("Panel B");
    expect(rightHeadings[2]).toHaveTextContent("Panel C");
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
