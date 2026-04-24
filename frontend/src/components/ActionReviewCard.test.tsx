import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ActionReviewCard from "./ActionReviewCard";

describe("ActionReviewCard", () => {
  it("renders the review heading, passive status, and labeled details", () => {
    render(
      <ActionReviewCard
        ariaLabel="Bridge cleanup review"
        eyebrow="Cleanup review"
        eyebrowTone="warning"
        title="Review before clearing stale bridge results"
        description="No files are removed until the operator clicks."
        statusLabel="manual trigger"
        statusTone="warning"
        details={[
          { label: "Action", value: "remove stale successful bridge response artifacts only" },
          { label: "Preserved evidence", value: <code>deadletters remain preserved</code> },
        ]}
      />,
    );

    const reviewCard = screen.getByLabelText("Bridge cleanup review");
    expect(reviewCard).toHaveTextContent("Cleanup review");
    expect(reviewCard).toHaveTextContent("Review before clearing stale bridge results");
    expect(reviewCard).toHaveTextContent("No files are removed until the operator clicks.");
    expect(reviewCard).toHaveTextContent("manual trigger");
    expect(reviewCard).toHaveTextContent("Action: remove stale successful bridge response artifacts only");
    expect(reviewCard).toHaveTextContent("Preserved evidence: deadletters remain preserved");
  });

  it("renders an explicit action control when provided", async () => {
    const onConfirm = vi.fn();

    render(
      <ActionReviewCard
        ariaLabel="Worker interrupt review"
        eyebrow="Urgent review"
        title="Review before interrupting this worker"
        description="Nothing is interrupted yet."
        statusLabel="manual trigger"
        details={[
          { label: "Worker", value: "builder-alpha" },
          { label: "Stop behavior", value: "force-stop terminal-builder-alpha-001" },
        ]}
        action={(
          <button type="button" onClick={onConfirm}>
            Interrupt selected worker
          </button>
        )}
      />,
    );

    const reviewCard = screen.getByLabelText("Worker interrupt review");
    expect(reviewCard).toHaveTextContent("Worker: builder-alpha");
    expect(reviewCard).toHaveTextContent("Stop behavior: force-stop terminal-builder-alpha-001");
    expect(reviewCard).not.toHaveTextContent("manual trigger");

    await userEvent.click(screen.getByRole("button", { name: "Interrupt selected worker" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
