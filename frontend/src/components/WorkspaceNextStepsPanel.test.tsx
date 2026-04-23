import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WorkspaceNextStepsPanel from "./WorkspaceNextStepsPanel";

describe("WorkspaceNextStepsPanel", () => {
  it("renders state-aware next-step buttons", () => {
    const onAction = vi.fn();

    render(
      <WorkspaceNextStepsPanel
        entries={[
          {
            id: "runtime-health",
            label: "Verify runtime health",
            detail: "Bridge heartbeat is stale.",
            reason: "Runtime health is recommended because the live bridge heartbeat is not fresh.",
            signals: ["heartbeat_fresh = false"],
            actionLabel: "Open runtime",
            tone: "warning",
            onAction,
          },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: "Workspace next steps" })).toBeInTheDocument();
    expect(screen.getByText("What should I do next?")).toBeInTheDocument();
    expect(screen.getByText("Why this?")).toBeInTheDocument();
    expect(screen.getByText("heartbeat_fresh = false")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open runtime" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("shows and clears recent guided jumps", () => {
    const onClearRecentActions = vi.fn();

    render(
      <WorkspaceNextStepsPanel
        entries={[
          {
            id: "fallback",
            label: "Start a natural-language request",
            detail: "Use Prompt Studio when unsure.",
            reason: "Fallback guidance keeps beginners oriented.",
            actionLabel: "Open Prompt Studio",
            tone: "success",
            onAction: vi.fn(),
          },
        ]}
        recentActions={[
          {
            id: "recent-1",
            stepId: "runtime-health",
            label: "Verify runtime health",
            actionLabel: "Open runtime",
            workspaceId: "builder",
            workspaceLabel: "Builder",
            usedAt: "2026-04-23T12:00:00.000Z",
          },
        ]}
        onClearRecentActions={onClearRecentActions}
      />,
    );

    expect(screen.getByLabelText("Recently used next-step actions")).toBeInTheDocument();
    expect(screen.getByText("Verify runtime health")).toBeInTheDocument();
    expect(screen.getByText(/from Builder at/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(onClearRecentActions).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when no entries are available", () => {
    render(<WorkspaceNextStepsPanel entries={[]} />);

    expect(screen.queryByRole("region", { name: "Workspace next steps" })).not.toBeInTheDocument();
  });
});
