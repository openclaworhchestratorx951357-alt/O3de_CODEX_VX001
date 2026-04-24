import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TaskTimeline from "./TaskTimeline";

describe("TaskTimeline", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders preset actions, supports saved-view rename and overwrite, and opens event detail from a timeline row", () => {
    const onPreset = vi.fn();
    const onOpenEvent = vi.fn();
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Assumed receipts");

    render(
      <TaskTimeline
        items={[
          {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            capability_status: "reviewable_local",
            verification_state: "assumed_present",
            verified_count: 1,
            assumed_count: 1,
            event_state: "done",
          },
          {
            id: "evt-runtime-1",
            category: "execution",
            event_type: "workspace-transition",
            severity: "warning",
            message: "Workspace preparation stalled on policy review.",
            created_at: "2026-04-23T17:05:00.000Z",
            event_state: "active",
          },
        ]}
        loading={false}
        error={null}
        presetActions={[
          {
            id: "app-os-receipts",
            label: "App OS receipts",
            title: "Jump to persisted App OS apply and revert receipts.",
            onSelect: onPreset,
          },
        ]}
        onOpenEvent={onOpenEvent}
        savedViewsStorageKey="task-timeline-test-saved-views"
      />,
    );

    const appOsReceiptButtons = screen.getAllByRole("button", { name: "App OS receipts" });

    fireEvent.click(appOsReceiptButtons[0]!);
    expect(onPreset).toHaveBeenCalledTimes(1);

    fireEvent.click(appOsReceiptButtons[1]!);
    expect(screen.getByText("App control applied report recorded for app-control-test.")).toBeInTheDocument();
    expect(screen.queryByText("Workspace preparation stalled on policy review.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Has assumed" }));
    expect(screen.getByText("Active filters")).toBeInTheDocument();
    expect(screen.getByText("Event type: App OS receipts")).toBeInTheDocument();
    expect(screen.getByText("Verification: Has assumed")).toBeInTheDocument();
    expect(screen.getByText("assumed present")).toBeInTheDocument();
    expect(screen.getByText("Verified count")).toBeInTheDocument();
    expect(screen.getByText("Assumed count")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "app-control-test" } });
    expect(screen.getByText("Search: app-control-test")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save current view" }));
    expect(screen.getByText("Saved views")).toBeInTheDocument();
    expect(screen.getByText(/App OS receipts.*Has assumed.*Search app-control-test/)).toBeInTheDocument();
    expect(screen.getAllByText(/saved/i).length).toBeGreaterThan(1);
    expect(screen.getByText("Saved new view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(promptSpy).toHaveBeenCalledWith(
      "Rename saved view",
      expect.stringMatching(/App OS receipts.*Has assumed.*Search app-control-test/),
    );
    expect(screen.getByText("Assumed receipts")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All events" }));
    fireEvent.click(screen.getByRole("button", { name: "All posture" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "policy" } });
    fireEvent.click(screen.getByRole("button", { name: "Overwrite" }));
    expect(screen.getByText("Search: policy")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("searchbox")).toHaveValue("policy");
    expect(screen.getByText("Workspace preparation stalled on policy review.")).toBeInTheDocument();
    expect(screen.queryByText("App control applied report recorded for app-control-test.")).not.toBeInTheDocument();
    expect(screen.getByText(/last used/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save current view" }));
    let savedViewsGroup = screen.getByText("Saved views").parentElement;
    expect(savedViewsGroup).not.toBeNull();
    expect(savedViewsGroup?.textContent).toContain("Assumed receipts");
    expect(savedViewsGroup?.textContent).not.toContain("Search policy");
    expect(screen.getAllByRole("button", { name: "Move first" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1);
    expect(screen.getByText("Updated saved view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save current view" }));
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1);
    savedViewsGroup = screen.getByText("Saved views").parentElement;
    expect(savedViewsGroup?.textContent).toContain("Assumed receipts");
    expect(savedViewsGroup?.textContent).not.toContain("Search policy");

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByText("Saved views")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open detail" }));
    expect(onOpenEvent).toHaveBeenCalledWith("evt-runtime-1");

    promptSpy.mockRestore();
  });

  it("restores the last active event filters from session storage on remount", () => {
    const props = {
      items: [
        {
          id: "evt-app-control-1",
          category: "app_control",
          event_type: "app_control_applied",
          severity: "info",
          message: "Applied receipt for app-control-test.",
          created_at: "2026-04-23T17:00:00.000Z",
          capability_status: "reviewable_local",
          verification_state: "assumed_present",
          verified_count: 1,
          assumed_count: 1,
          event_state: "done",
        },
        {
          id: "evt-runtime-1",
          category: "execution",
          event_type: "workspace-transition",
          severity: "warning",
          message: "Workspace preparation stalled on policy review.",
          created_at: "2026-04-23T17:05:00.000Z",
          event_state: "active",
        },
      ],
      loading: false,
      error: null,
      savedViewsStorageKey: "task-timeline-test-saved-views",
    };

    const firstRender = render(<TaskTimeline {...props} />);

    fireEvent.click(firstRender.getByRole("button", { name: "App OS receipts" }));
    fireEvent.click(firstRender.getByRole("button", { name: "Has assumed" }));
    fireEvent.change(firstRender.getByRole("searchbox"), { target: { value: "app-control-test" } });

    firstRender.unmount();

    render(<TaskTimeline {...props} />);

    expect(screen.getByText("Event type: App OS receipts")).toBeInTheDocument();
    expect(screen.getByText("Verification: Has assumed")).toBeInTheDocument();
    expect(screen.getByText("Search: app-control-test")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("app-control-test");
    expect(screen.queryByText("Workspace preparation stalled on policy review.")).not.toBeInTheDocument();
    expect(screen.getByText("Applied receipt for app-control-test.")).toBeInTheDocument();
  });

  it("auto-clears save feedback after a short delay", () => {
    vi.useFakeTimers();

    render(
      <TaskTimeline
        items={[
          {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            capability_status: "reviewable_local",
            verification_state: "assumed_present",
            verified_count: 1,
            assumed_count: 1,
            event_state: "done",
          },
        ]}
        loading={false}
        error={null}
        savedViewsStorageKey="task-timeline-test-saved-views"
        searchPreset="app-control-test"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save current view" }));
    expect(screen.getByText("Saved new view")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.queryByText("Saved new view")).not.toBeInTheDocument();
  });

  it("dismisses save feedback immediately when requested", () => {
    render(
      <TaskTimeline
        items={[
          {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            capability_status: "reviewable_local",
            verification_state: "assumed_present",
            verified_count: 1,
            assumed_count: 1,
            event_state: "done",
          },
        ]}
        loading={false}
        error={null}
        savedViewsStorageKey="task-timeline-test-saved-views"
        searchPreset="app-control-test"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save current view" }));
    expect(screen.getByText("Saved new view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss save feedback" }));
    expect(screen.queryByText("Saved new view")).not.toBeInTheDocument();
  });

  it("suggests presets and saved views when filters leave the timeline empty", () => {
    const onPreset = vi.fn();
    window.sessionStorage.setItem("task-timeline-test-saved-views", JSON.stringify([
      {
        id: "saved-generic",
        label: "Generic fallback",
        eventTypeFilter: "all",
        verificationFilter: "all",
        searchValue: "",
        createdAt: "2026-04-23T17:00:00.000Z",
        lastUsedAt: null,
      },
      {
        id: "saved-app-os",
        label: "App OS narrowed",
        eventTypeFilter: "app_control",
        verificationFilter: "assumed_present",
        searchValue: "app-control",
        createdAt: "2026-04-23T17:05:00.000Z",
        lastUsedAt: "2026-04-23T17:10:00.000Z",
      },
    ]));

    render(
      <TaskTimeline
        items={[
          {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            capability_status: "reviewable_local",
            verification_state: "assumed_present",
            verified_count: 1,
            assumed_count: 1,
            event_state: "done",
          },
        ]}
        loading={false}
        error={null}
        presetActions={[
          {
            id: "all-events",
            label: "All events",
            title: "Return to the full persisted event lane.",
            onSelect: onPreset,
          },
          {
            id: "app-os-receipts",
            label: "App OS receipts",
            title: "Jump to persisted App OS apply and revert receipts.",
            onSelect: onPreset,
          },
        ]}
        savedViewsStorageKey="task-timeline-test-saved-views"
      />,
    );

    const appOsReceiptButtons = screen.getAllByRole("button", { name: "App OS receipts" });
    fireEvent.click(appOsReceiptButtons[1]!);
    fireEvent.click(screen.getByRole("button", { name: "Has assumed" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "app-control-test" } });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no-match" } });

    expect(screen.getByText("No events match this filter stack")).toBeInTheDocument();

    const helper = screen.getByText("No events match this filter stack").parentElement;
    expect(helper?.textContent).toContain("Try App OS receipts");
    expect(helper?.textContent).toContain("preset path");
    expect(helper?.textContent).toContain("Open App OS narrowed");
    expect(helper?.textContent).toContain("saved view");
    expect(helper?.textContent).toContain("Open Generic fallback");
    expect(helper?.textContent?.indexOf("Open App OS narrowed")).toBeLessThan(
      helper?.textContent?.indexOf("Open Generic fallback") ?? Number.MAX_SAFE_INTEGER,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try App OS receipts" }));
    expect(onPreset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open App OS narrowed" }));
    expect(screen.getByRole("searchbox")).toHaveValue("app-control");
    expect(screen.queryByText("No events match this filter stack")).not.toBeInTheDocument();
  });

  it("reports the best empty-state recovery action upward", () => {
    const onEmptyRecoveryChange = vi.fn();
    window.sessionStorage.setItem("task-timeline-test-saved-views", JSON.stringify([
      {
        id: "saved-app-os",
        label: "App OS narrowed",
        eventTypeFilter: "app_control",
        verificationFilter: "assumed_present",
        searchValue: "app-control",
        createdAt: "2026-04-23T17:05:00.000Z",
        lastUsedAt: "2026-04-23T17:10:00.000Z",
      },
    ]));

    render(
      <TaskTimeline
        items={[
          {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            capability_status: "reviewable_local",
            verification_state: "assumed_present",
            verified_count: 1,
            assumed_count: 1,
            event_state: "done",
          },
        ]}
        loading={false}
        error={null}
        savedViewsStorageKey="task-timeline-test-saved-views"
        onEmptyRecoveryChange={onEmptyRecoveryChange}
      />,
    );

    const appOsReceiptButtons = screen.getAllByRole("button", { name: "App OS receipts" });
    fireEvent.click(appOsReceiptButtons[appOsReceiptButtons.length - 1]!);
    fireEvent.click(screen.getByRole("button", { name: "Has assumed" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no-match" } });

    expect(onEmptyRecoveryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        label: "Restore last non-empty view",
        title: "Return to the most recent filter stack that still showed timeline events.",
        provenanceLabel: "session memory",
      }),
    );
  });

  it("restores the last non-empty filter stack before other empty-state recovery options", () => {
    render(
      <TaskTimeline
        items={[
          {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            capability_status: "reviewable_local",
            verification_state: "assumed_present",
            verified_count: 1,
            assumed_count: 1,
            event_state: "done",
          },
        ]}
        loading={false}
        error={null}
        presetActions={[
          {
            id: "app-os-receipts",
            label: "App OS receipts",
            title: "Jump to persisted App OS apply and revert receipts.",
            onSelect: vi.fn(),
          },
        ]}
        savedViewsStorageKey="task-timeline-test-saved-views"
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "App OS receipts" })[1]!);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no-match" } });

    expect(screen.getByRole("button", { name: "Restore last non-empty view" })).toBeInTheDocument();
    expect(screen.getByText("session memory")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Restore last non-empty view" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.queryByText("No events match this filter stack")).not.toBeInTheDocument();
    expect(screen.getByText("App control applied report recorded for app-control-test.")).toBeInTheDocument();
  });

  it("reports filtered result counts upward", () => {
    const onFilterResultsChange = vi.fn();

    render(
      <TaskTimeline
        items={[
          {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            capability_status: "reviewable_local",
            verification_state: "assumed_present",
            verified_count: 1,
            assumed_count: 1,
            event_state: "done",
          },
          {
            id: "evt-runtime-1",
            category: "execution",
            event_type: "workspace-transition",
            severity: "warning",
            message: "Workspace preparation stalled on policy review.",
            created_at: "2026-04-23T17:05:00.000Z",
            event_state: "active",
          },
        ]}
        loading={false}
        error={null}
        onFilterResultsChange={onFilterResultsChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "App OS receipts" }));

    expect(onFilterResultsChange).toHaveBeenLastCalledWith({
      filteredCount: 1,
      totalCount: 2,
      hasActiveFilters: true,
    });
  });

  it("shows an inline high-narrowing warning near the filters", () => {
    render(
      <TaskTimeline
        items={[
          {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            capability_status: "reviewable_local",
            verification_state: "assumed_present",
            verified_count: 1,
            assumed_count: 1,
            event_state: "done",
          },
          {
            id: "evt-runtime-1",
            category: "execution",
            event_type: "workspace-transition",
            severity: "warning",
            message: "Workspace preparation stalled on policy review.",
            created_at: "2026-04-23T17:05:00.000Z",
            event_state: "active",
          },
          {
            id: "evt-runtime-2",
            category: "execution",
            event_type: "workspace-transition",
            severity: "warning",
            message: "Workspace policy review is still pending.",
            created_at: "2026-04-23T17:06:00.000Z",
            event_state: "active",
          },
        ]}
        loading={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "App OS receipts" }));

    expect(screen.getByText("High narrowing")).toBeInTheDocument();
    expect(screen.getByText("This filter stack is hiding 2 events before the lane reaches zero.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Loosen filters" })).toBeInTheDocument();
  });

  it("lets the inline narrowing warning clear search first", () => {
    render(
      <TaskTimeline
        items={[
          {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            capability_status: "reviewable_local",
            verification_state: "assumed_present",
            verified_count: 1,
            assumed_count: 1,
            event_state: "done",
          },
          {
            id: "evt-runtime-1",
            category: "execution",
            event_type: "workspace-transition",
            severity: "warning",
            message: "Workspace preparation stalled on policy review.",
            created_at: "2026-04-23T17:05:00.000Z",
            event_state: "active",
          },
          {
            id: "evt-runtime-2",
            category: "execution",
            event_type: "workspace-transition",
            severity: "warning",
            message: "Workspace policy review is still pending.",
            created_at: "2026-04-23T17:06:00.000Z",
            event_state: "active",
          },
        ]}
        loading={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "App OS receipts" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "app-control" } });

    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("lets the inline narrowing warning loosen filters when there is no search", () => {
    render(
      <TaskTimeline
        items={[
          {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            capability_status: "reviewable_local",
            verification_state: "assumed_present",
            verified_count: 1,
            assumed_count: 1,
            event_state: "done",
          },
          {
            id: "evt-runtime-1",
            category: "execution",
            event_type: "workspace-transition",
            severity: "warning",
            message: "Workspace preparation stalled on policy review.",
            created_at: "2026-04-23T17:05:00.000Z",
            event_state: "active",
          },
          {
            id: "evt-runtime-2",
            category: "execution",
            event_type: "workspace-transition",
            severity: "warning",
            message: "Workspace policy review is still pending.",
            created_at: "2026-04-23T17:06:00.000Z",
            event_state: "active",
          },
        ]}
        loading={false}
        error={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "App OS receipts" }));

    expect(screen.getByRole("button", { name: "Loosen filters" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Loosen filters" }));
    expect(screen.queryByText("High narrowing")).not.toBeInTheDocument();
  });

  it("reports active filters upward and clears them when the shell requests it", () => {
    const onActiveFiltersChange = vi.fn();

    const items = [
      {
        id: "evt-app-control-1",
        category: "app_control",
        event_type: "app_control_applied",
        severity: "info",
        message: "App control applied report recorded for app-control-test.",
        created_at: "2026-04-23T17:00:00.000Z",
        capability_status: "reviewable_local",
        verification_state: "assumed_present",
        verified_count: 1,
        assumed_count: 1,
        event_state: "done",
      },
    ];

    const { rerender } = render(
      <TaskTimeline
        items={items}
        loading={false}
        error={null}
        onActiveFiltersChange={onActiveFiltersChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "App OS receipts" }));
    fireEvent.click(screen.getByRole("button", { name: "Has assumed" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "app-control-test" } });

    expect(onActiveFiltersChange).toHaveBeenLastCalledWith({
      eventTypeLabel: "App OS receipts",
      verificationLabel: "Has assumed",
      searchValue: "app-control-test",
      hasActiveFilters: true,
    });

    rerender(
      <TaskTimeline
        items={items}
        loading={false}
        error={null}
        onActiveFiltersChange={onActiveFiltersChange}
        clearFiltersSignal={1}
      />,
    );

    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.queryByText("Active filters")).not.toBeInTheDocument();
    expect(onActiveFiltersChange).toHaveBeenLastCalledWith({
      eventTypeLabel: null,
      verificationLabel: null,
      searchValue: null,
      hasActiveFilters: false,
    });
  });
});
