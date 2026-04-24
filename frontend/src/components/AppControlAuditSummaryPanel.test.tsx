import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AppControlAuditSummaryPanel from "./AppControlAuditSummaryPanel";

describe("AppControlAuditSummaryPanel", () => {
  it("summarizes persisted App OS receipts and opens focused event-lane jumps", () => {
    const onOpenLatest = vi.fn();
    const onOpenApplied = vi.fn();
    const onOpenReverted = vi.fn();
    const onOpenVerifiedOnly = vi.fn();
    const onOpenAssumedPresent = vi.fn();
    const onSaveAppliedView = vi.fn();
    const onSaveRevertedView = vi.fn();
    const onSaveVerifiedOnlyView = vi.fn();
    const onSaveAssumedPresentView = vi.fn();
    const onOpenSavedView = vi.fn();

    render(
      <AppControlAuditSummaryPanel
        summary={{
          total_events: 50,
          applied_events: 11,
          reverted_events: 12,
          verified_only_events: 13,
          assumed_present_events: 14,
          verification_not_recorded_events: 0,
          latest_event_id: "evt-app-control-revert",
          latest_event_type: "app_control_reverted",
          latest_created_at: "2026-04-23T18:00:00.000Z",
          latest_summary: "Requested restore of the last saved App OS backup. Verified results are marked explicitly below.",
          latest_verified_count: 2,
          latest_assumed_count: 0,
          latest_script_id: "app-control-test",
        }}
        onOpenLatest={onOpenLatest}
        onOpenApplied={onOpenApplied}
        onOpenReverted={onOpenReverted}
        onOpenVerifiedOnly={onOpenVerifiedOnly}
        onOpenAssumedPresent={onOpenAssumedPresent}
        onSaveAppliedView={onSaveAppliedView}
        onSaveRevertedView={onSaveRevertedView}
        onSaveVerifiedOnlyView={onSaveVerifiedOnlyView}
        onSaveAssumedPresentView={onSaveAssumedPresentView}
        savedViewFeedback={{
          label: "Saved to views",
          detail: "Applied App OS receipts is now available in browser-session saved views.",
          onOpenSavedView,
        }}
      />,
    );

    expect(screen.getByText("App OS Audit Summary")).toBeInTheDocument();
    expect(screen.getByText("Applied receipts")).toBeInTheDocument();
    expect(screen.getByText("Reverted receipts")).toBeInTheDocument();
    expect(screen.getByText("Verified-only receipts")).toBeInTheDocument();
    expect(screen.getByText("Receipts with assumed results")).toBeInTheDocument();
    expect(screen.getByText("reverted")).toBeInTheDocument();
    expect(screen.getByText(/Requested restore of the last saved App OS backup/i)).toBeInTheDocument();
    expect(screen.getByText("Saved to views")).toBeInTheDocument();
    expect(screen.getByText(/Applied App OS receipts is now available/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "11" }));
    expect(onOpenApplied).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "12" }));
    expect(onOpenReverted).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "13" }));
    expect(onOpenVerifiedOnly).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "14" }));
    expect(onOpenAssumedPresent).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Save applied view" }));
    expect(onSaveAppliedView).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Save reverted view" }));
    expect(onSaveRevertedView).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Save verified-only view" }));
    expect(onSaveVerifiedOnlyView).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Save assumed-results view" }));
    expect(onSaveAssumedPresentView).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open saved view" }));
    expect(onOpenSavedView).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Open latest receipt" }));
    expect(onOpenLatest).toHaveBeenCalledTimes(1);
  });
});
