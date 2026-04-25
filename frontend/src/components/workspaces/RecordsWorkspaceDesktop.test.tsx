import { createRef, useEffect, type ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RecordsWorkspaceDesktop from "./RecordsWorkspaceDesktop";

vi.mock("../OverviewContextStrip", () => ({
  default: () => <div>OverviewContextStrip stub</div>,
}));

vi.mock("../ArtifactsPanel", () => ({
  default: () => <div>ArtifactsPanel stub</div>,
}));

vi.mock("../ArtifactDetailPanel", () => ({
  default: () => <div>ArtifactDetailPanel stub</div>,
}));

vi.mock("../AppControlAuditSummaryPanel", () => ({
  default: () => <div>AppControlAuditSummaryPanel stub</div>,
}));

vi.mock("../EventDetailPanel", () => ({
  default: () => <div>EventDetailPanel stub</div>,
}));

vi.mock("../ExecutionsPanel", () => ({
  default: () => <div>ExecutionsPanel stub</div>,
}));

vi.mock("../ExecutionDetailPanel", () => ({
  default: () => <div>ExecutionDetailPanel stub</div>,
}));

vi.mock("../RunsPanel", () => ({
  default: () => <div>RunsPanel stub</div>,
}));

vi.mock("../RunDetailPanel", () => ({
  default: () => <div>RunDetailPanel stub</div>,
}));

vi.mock("../TaskTimeline", () => {
  function TaskTimelineMock({
    onEmptyFilteredStateChange,
    onActiveFiltersChange,
    onEmptyRecoveryChange,
    onFilterResultsChange,
    clearFiltersSignal,
  }: {
    onEmptyFilteredStateChange?: ((active: boolean) => void) | null;
    onActiveFiltersChange?: ((filters: {
      eventTypeLabel: string | null;
      verificationLabel: string | null;
      searchValue: string | null;
      hasActiveFilters: boolean;
    }) => void) | null;
    onEmptyRecoveryChange?: ((recovery: {
      label: string;
      title: string;
      provenanceLabel: string;
      provenanceDetail: string;
      onSelect: () => void;
    } | null) => void) | null;
    onFilterResultsChange?: ((summary: {
      filteredCount: number;
      totalCount: number;
      hasActiveFilters: boolean;
    }) => void) | null;
    clearFiltersSignal?: number;
  }) {
    useEffect(() => {
      onEmptyFilteredStateChange?.(true);
      onActiveFiltersChange?.({
        eventTypeLabel: "App OS receipts",
        verificationLabel: "Has assumed",
        searchValue: "no-match",
        hasActiveFilters: true,
      });
      onEmptyRecoveryChange?.({
        label: "Open App OS narrowed",
        title: "Reopen the strongest saved view match for this empty event lane.",
        provenanceLabel: "saved view",
        provenanceDetail: 'Recovered from the saved browser-session view "App OS narrowed".',
        onSelect: () => undefined,
      });
      onFilterResultsChange?.({
        filteredCount: 1,
        totalCount: 3,
        hasActiveFilters: true,
      });
    }, [onActiveFiltersChange, onEmptyFilteredStateChange, onEmptyRecoveryChange, onFilterResultsChange]);

    return <div>TaskTimeline stub {clearFiltersSignal ?? 0}</div>;
  }

  return { default: TaskTimelineMock };
});

function renderRecordsWorkspaceDesktop(
  activeSurfaceId: ComponentProps<typeof RecordsWorkspaceDesktop>["activeSurfaceId"],
) {
  return render(
    <RecordsWorkspaceDesktop
      activeSurfaceId={activeSurfaceId}
      items={[
        {
          id: "runs",
          label: "Runs",
          detail: "Run list and run detail lane.",
          helpTooltip: "Use runs when you need persisted run truth.",
        },
        {
          id: "executions",
          label: "Executions",
          detail: "Execution list and execution detail lane.",
          helpTooltip: "Use executions when you need persisted execution truth.",
        },
        {
          id: "artifacts",
          label: "Artifacts",
          detail: "Artifact list and artifact detail lane.",
          helpTooltip: "Use artifacts when you need persisted artifact truth.",
        },
        {
          id: "events",
          label: "Events",
          detail: "Timeline list and event detail lane.",
          helpTooltip: "Use events when chronology and persisted receipts need review.",
        },
      ]}
      onSelectSurface={vi.fn()}
      artifacts={{
        panelKey: "artifacts-panel",
        sectionRef: createRef<HTMLDivElement>(),
        detailSectionRef: createRef<HTMLDivElement>(),
        contextStrip: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["artifacts"]["contextStrip"],
        artifactsPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["artifacts"]["artifactsPanel"],
        artifactDetailPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["artifacts"]["artifactDetailPanel"],
      }}
      executions={{
        panelKey: "executions-panel",
        sectionRef: createRef<HTMLDivElement>(),
        detailSectionRef: createRef<HTMLDivElement>(),
        contextStrip: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["executions"]["contextStrip"],
        executionsPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["executions"]["executionsPanel"],
        executionDetailPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["executions"]["executionDetailPanel"],
      }}
      runs={{
        panelKey: "runs-panel",
        sectionRef: createRef<HTMLDivElement>(),
        detailSectionRef: createRef<HTMLDivElement>(),
        contextStrip: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["runs"]["contextStrip"],
        runsPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["runs"]["runsPanel"],
        runDetailPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["runs"]["runDetailPanel"],
      }}
      events={{
        panelKey: "events-panel",
        sectionRef: createRef<HTMLDivElement>(),
        detailSectionRef: createRef<HTMLDivElement>(),
        contextStrip: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["events"]["contextStrip"],
        auditSummaryPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["events"]["auditSummaryPanel"],
        timelinePanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["events"]["timelinePanel"],
        eventDetailPanel: {} as ComponentProps<typeof RecordsWorkspaceDesktop>["events"]["eventDetailPanel"],
      }}
    />,
  );
}

describe("RecordsWorkspaceDesktop", () => {
  it("assembles the runs desktop surface with context, list, and detail panes", () => {
    renderRecordsWorkspaceDesktop("runs");

    expect(getVisibleText("OverviewContextStrip stub")).toBeInTheDocument();
    expect(screen.getByText("RunsPanel stub")).toBeInTheDocument();
    expect(screen.getByText("RunDetailPanel stub")).toBeInTheDocument();
    expect(screen.getByText("ExecutionsPanel stub")).not.toBeVisible();
    expect(screen.getByText("ArtifactsPanel stub")).not.toBeVisible();
  });

  it("assembles the artifact desktop surface with context, list, and detail panes", () => {
    renderRecordsWorkspaceDesktop("artifacts");

    expect(getVisibleText("OverviewContextStrip stub")).toBeInTheDocument();
    expect(screen.getByText("ArtifactsPanel stub")).toBeInTheDocument();
    expect(screen.getByText("ArtifactDetailPanel stub")).toBeInTheDocument();
    expect(screen.getByText("RunsPanel stub")).not.toBeVisible();
    expect(screen.getByText("ExecutionsPanel stub")).not.toBeVisible();
  });

  it("assembles the events desktop surface with timeline and event detail panes", () => {
    renderRecordsWorkspaceDesktop("events");

    expect(screen.getByText("Events lane is empty because the current filters are too narrow.")).toBeInTheDocument();
    expect(screen.getByText("Showing 1 of 3 events")).toBeInTheDocument();
    expect(screen.getByText("high narrowing")).toBeInTheDocument();
    expect(screen.getByText("The current Events review stack is narrowing the lane before it reaches zero.")).toBeInTheDocument();
    expect(screen.getByText("Hidden by the current lane: 2")).toBeInTheDocument();
    expect(screen.getByText('No persisted events matched App OS receipts + Has assumed + search "no-match".')).toBeInTheDocument();
    expect(screen.getByText("Best recovery source: saved view.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open App OS narrowed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear Events filters" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Return to Events review stack" })).toBeInTheDocument();
    expect(getVisibleText("OverviewContextStrip stub")).toBeInTheDocument();
    expect(screen.getByText("AppControlAuditSummaryPanel stub")).toBeInTheDocument();
    expect(screen.getByText("TaskTimeline stub 0")).toBeInTheDocument();
    expect(screen.getByText("EventDetailPanel stub")).toBeInTheDocument();
    expect(screen.getByText("RunsPanel stub")).not.toBeVisible();
    expect(screen.getByText("ArtifactsPanel stub")).not.toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Clear Events filters" }));
    expect(screen.getByText("TaskTimeline stub 1")).toBeInTheDocument();
  });
});

function getVisibleText(text: string): HTMLElement {
  const match = screen.getAllByText(text).find((element) => (
    element.closest('[aria-hidden="false"]')
  ));

  expect(match).toBeDefined();

  return match as HTMLElement;
}
