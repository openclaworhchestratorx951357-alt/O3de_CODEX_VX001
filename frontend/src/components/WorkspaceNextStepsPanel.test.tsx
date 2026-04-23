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
            opensLabel: "Runtime > Overview window",
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
    expect(screen.getByText(/Opens:/i)).toBeInTheDocument();
    expect(screen.getByText("Runtime > Overview window")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open runtime" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("shows and clears recent guided jumps", () => {
    const onClearRecentActions = vi.fn();
    const onReplayRecentAction = vi.fn();

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
            opensLabel: "Runtime > Overview window",
            workspaceId: "builder",
            workspaceLabel: "Builder",
            usedAt: "2026-04-23T12:00:00.000Z",
          },
        ]}
        onClearRecentActions={onClearRecentActions}
        onReplayRecentAction={onReplayRecentAction}
      />,
    );

    expect(screen.getByLabelText("Recently used next-step actions")).toBeInTheDocument();
    expect(screen.getByText("Verify runtime health")).toBeInTheDocument();
    expect(screen.getByText("Action: Open runtime")).toBeInTheDocument();
    expect(screen.getByText("Opens: Runtime > Overview window")).toBeInTheDocument();
    expect(screen.getByText(/from Builder at/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Jump again" }));
    expect(onReplayRecentAction).toHaveBeenCalledWith(expect.objectContaining({
      stepId: "runtime-health",
      actionLabel: "Open runtime",
    }));

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(onClearRecentActions).toHaveBeenCalledTimes(1);
  });

  it("collapses and restores the guided helper when controlled by the app", () => {
    const onCollapse = vi.fn();
    const onExpand = vi.fn();
    const entries = [
      {
        id: "fallback",
        label: "Start a natural-language request",
        detail: "Use Prompt Studio when unsure.",
        reason: "Fallback guidance keeps beginners oriented.",
        actionLabel: "Open Prompt Studio",
        tone: "success" as const,
        onAction: vi.fn(),
      },
    ];

    const { rerender } = render(
      <WorkspaceNextStepsPanel
        entries={entries}
        onCollapse={onCollapse}
        onExpand={onExpand}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hide for now" }));

    expect(onCollapse).toHaveBeenCalledTimes(1);

    rerender(
      <WorkspaceNextStepsPanel
        entries={entries}
        collapsed
        onCollapse={onCollapse}
        onExpand={onExpand}
      />,
    );

    expect(screen.getByText("Guided next steps hidden for now")).toBeInTheDocument();
    expect(screen.queryByText("What should I do next?")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show guided next steps" }));

    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when no entries are available", () => {
    render(<WorkspaceNextStepsPanel entries={[]} />);

    expect(screen.queryByRole("region", { name: "Workspace next steps" })).not.toBeInTheDocument();
  });
});
