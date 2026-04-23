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
            actionLabel: "Open runtime",
            tone: "warning",
            onAction,
          },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: "Workspace next steps" })).toBeInTheDocument();
    expect(screen.getByText("What should I do next?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open runtime" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when no entries are available", () => {
    render(<WorkspaceNextStepsPanel entries={[]} />);

    expect(screen.queryByRole("region", { name: "Workspace next steps" })).not.toBeInTheDocument();
  });
});
