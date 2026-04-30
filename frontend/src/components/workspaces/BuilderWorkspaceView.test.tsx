import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BuilderWorkspaceView from "./BuilderWorkspaceView";

describe("BuilderWorkspaceView", () => {
  it("defaults to a guided start-here surface and reveals other builder areas only when selected", () => {
    render(
      <BuilderWorkspaceView
        overviewContent={<div>Overview content</div>}
        worktreesContent={<div>Worktrees content</div>}
        missionBoardContent={<div>Mission board content</div>}
        laneCreateContent={<div>Lane creation content</div>}
        workerLifecycleContent={<div>Worker lifecycle content</div>}
        terminalsContent={<div>Managed terminals content</div>}
        autonomyInboxContent={<div>Autonomy inbox content</div>}
      />,
    );

    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.getByTestId("dockable-layout-builder")).toBeInTheDocument();
    expect(screen.getByText("Lane creation content")).toBeInTheDocument();
    expect(screen.getByText("Worktrees content")).toBeInTheDocument();
    expect(screen.getByText("How to use this workspace")).toBeInTheDocument();
    expect(screen.getAllByText(/Check the harness and repo status first/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("How to use this window")).toHaveLength(3);
    expect(screen.queryByText("Mission board content")).not.toBeInTheDocument();
    expect(screen.queryByText("Worker lifecycle content")).not.toBeInTheDocument();
    expect(screen.queryByText("Managed terminals content")).not.toBeInTheDocument();
    expect(screen.queryByText("Autonomy inbox content")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /active lane/i })[0]);
    expect(screen.getByText("Worker lifecycle content")).toBeInTheDocument();
    expect(screen.getByText("Managed terminals content")).toBeInTheDocument();
    expect(screen.getAllByText(/Use worker sync when a lane exists but its branch, worktree, status, or summary needs to be refreshed/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Launch only repo-owned commands here so the app can capture logs/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Overview content")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /mission control/i })[0]);
    expect(screen.getByText("Mission board content")).toBeInTheDocument();
    expect(screen.getAllByText(/Check worker ownership before you tell another thread to start on a file or scope/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Worker lifecycle content")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /autonomy/i })[0]);
    expect(screen.getByText("Autonomy inbox content")).toBeInTheDocument();
    expect(screen.getAllByText(/Use the inbox summary cards to see whether there are active objectives/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("Mission board content")).not.toBeInTheDocument();
  });

  it("uses Builder recommendations to switch nested surfaces", () => {
    render(
      <BuilderWorkspaceView
        overviewContent={<div>Overview content</div>}
        worktreesContent={<div>Worktrees content</div>}
        missionBoardContent={<div>Mission board content</div>}
        laneCreateContent={<div>Lane creation content</div>}
        workerLifecycleContent={<div>Worker lifecycle content</div>}
        terminalsContent={<div>Managed terminals content</div>}
        autonomyInboxContent={<div>Autonomy inbox content</div>}
        recommendations={[
          {
            id: "builder-autonomy",
            label: "Review Builder inbox",
            detail: "Queued autonomy jobs are ready for review.",
            actionLabel: "Open autonomy inbox",
            actionId: "open_builder_autonomy",
            tone: "warning",
          },
        ]}
      />,
    );

    expect(screen.getByText("Builder recommendations")).toBeInTheDocument();
    expect(screen.getByText(/Review why this recommendation appears/i)).toBeInTheDocument();
    expect(screen.getByText(/Suggested because:/i)).toBeInTheDocument();
    expect(screen.getByText("Queued autonomy jobs are ready for review.")).toBeInTheDocument();
    expect(screen.getByText(/Opens:/i)).toBeInTheDocument();
    expect(screen.getByText("Builder > Autonomy window")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open autonomy inbox" }));

    expect(screen.getByText("Autonomy inbox content")).toBeInTheDocument();
    expect(screen.queryByText("Overview content")).not.toBeInTheDocument();
  });
});
