import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import RecommendedActionsPanel from "./RecommendedActionsPanel";

describe("RecommendedActionsPanel", () => {
  it("renders visible next-step guidance and dispatches the selected action", async () => {
    const onAction = vi.fn();

    render(
      <RecommendedActionsPanel
        entries={[
          {
            id: "runtime-health",
            label: "Check runtime health",
            detail: "Bridge heartbeat is stale and needs a runtime review.",
            actionLabel: "Open runtime",
            actionId: "open_runtime_overview",
            tone: "warning",
            onAction,
          },
        ]}
      />,
    );

    expect(screen.getByText("Recommended next steps")).toBeInTheDocument();
    expect(screen.getByText("How to use recommendations")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Open runtime" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
