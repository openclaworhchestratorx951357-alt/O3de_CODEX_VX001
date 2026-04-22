import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RecordLineageStrip from "./RecordLineageStrip";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import TriageSummaryStrip from "./TriageSummaryStrip";

Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("shared evidence surfaces", () => {
  beforeEach(() => {
    vi.mocked(navigator.clipboard.writeText).mockClear();
  });

  it("gives summary fact copy actions stable default operator guidance", async () => {
    render(
      <SummaryFacts>
        <SummaryFact label="Run ID" copyValue="run-123">
          run-123
        </SummaryFact>
      </SummaryFacts>,
    );

    const copyButton = screen.getByRole("button", { name: "Copy Run ID" });
    expect(copyButton).toHaveAttribute(
      "title",
      "Copy Run ID to the browser-local clipboard so you can reuse the exact persisted value in notes, handoff, or follow-up without retyping it.",
    );

    await userEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("run-123");
    expect(copyButton).toHaveTextContent("Copied");
  });

  it("lays out summary facts as a responsive desktop grid instead of a single narrow stack", () => {
    render(
      <SummaryFacts>
        <SummaryFact label="Run ID">run-123</SummaryFact>
        <SummaryFact label="Execution ID">exec-456</SummaryFact>
      </SummaryFacts>,
    );

    const factsGrid = screen.getByText("Run ID").closest("div")?.parentElement?.parentElement;
    expect(factsGrid).toHaveStyle({
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    });
  });

  it("adds default lineage guidance to persisted record navigation", async () => {
    const openRun = vi.fn();
    const openExecution = vi.fn();
    const openArtifact = vi.fn();

    render(
      <RecordLineageStrip
        runId="run-1"
        runStatus="succeeded"
        executionId="exec-1"
        executionStatus="succeeded"
        artifactId="art-1"
        artifactLabel="Runtime evidence"
        onOpenRun={openRun}
        onOpenExecution={openExecution}
        onOpenArtifact={openArtifact}
      />,
    );

    expect(
      screen.getByTitle(
        "Use Record Lineage to move between related persisted runs, executions, and artifacts without losing the current review context.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open run" })).toHaveAttribute(
      "title",
      "Open run run-1 to inspect the related persisted run record without leaving the current lineage flow.",
    );
    expect(screen.getByRole("button", { name: "Open execution" })).toHaveAttribute(
      "title",
      "Open execution exec-1 to inspect the related persisted execution record without leaving the current lineage flow.",
    );
    expect(screen.getByRole("button", { name: "Open artifact" })).toHaveAttribute(
      "title",
      "Open artifact art-1 to inspect the related persisted artifact record without leaving the current lineage flow.",
    );

    await userEvent.click(screen.getByRole("button", { name: "Open execution" }));
    expect(openExecution).toHaveBeenCalledWith("exec-1");
  });

  it("adds default triage summary help to badges and jump actions", () => {
    render(
      <TriageSummaryStrip
        heading="Operator Triage Summary"
        subjectLabel="Artifact art-1 within execution exec-1"
        priorityLabel="Audit review"
        priorityDescription="Confirm the persisted mutation trail before handoff."
        actionLabel="Open sibling artifact"
        actionDescription="Move to the related artifact record for the next review step."
        attentionLabel="Real editor evidence"
        attentionDescription="Keep admitted-real versus simulated wording explicit in the closeout."
        jumpLabel="Jump to evidence"
        onJump={() => {}}
      />,
    );

    expect(
      screen.getByTitle(
        "Use the operator triage summary to keep the current priority, action, and attention signals visible before jumping to related evidence or records.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTitle("Audit review: Confirm the persisted mutation trail before handoff."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Jump to evidence" }),
    ).toHaveAttribute(
      "title",
      "Jump directly to the related record or evidence highlighted by this operator triage summary.",
    );
  });

  it("preserves panel-specific titles when shared surfaces are explicitly overridden", () => {
    render(
      <>
        <RecordLineageStrip
          runId="run-9"
          onOpenRun={() => {}}
          runActionTitle="Open the parent run from this panel-specific handoff view."
        />
        <TriageSummaryStrip
          heading="Operator Triage Summary"
          priorityLabel="Current operator focus"
          priorityDescription="Stay on the active review lane."
          jumpLabel="Jump now"
          jumpTitle="Jump to the panel-specific follow-up target."
          onJump={() => {}}
        />
      </>,
    );

    expect(screen.getByRole("button", { name: "Open run" })).toHaveAttribute(
      "title",
      "Open the parent run from this panel-specific handoff view.",
    );
    expect(screen.getByRole("button", { name: "Jump now" })).toHaveAttribute(
      "title",
      "Jump to the panel-specific follow-up target.",
    );
  });
});
