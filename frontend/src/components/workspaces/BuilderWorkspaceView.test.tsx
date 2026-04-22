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
    expect(screen.getByText("Lane creation content")).toBeInTheDocument();
    expect(screen.getByText("Worktrees content")).toBeInTheDocument();
    expect(screen.getByText("How to use this workspace")).toBeInTheDocument();
    expect(screen.getByText(/Check the harness and repo status first/i)).toBeInTheDocument();
    expect(screen.getAllByText("How to use this window")).toHaveLength(3);
    expect(screen.queryByText("Mission board content")).not.toBeInTheDocument();
    expect(screen.queryByText("Worker lifecycle content")).not.toBeInTheDocument();
    expect(screen.queryByText("Managed terminals content")).not.toBeInTheDocument();
    expect(screen.queryByText("Autonomy inbox content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /active lane/i }));
    expect(screen.getByText("Worker lifecycle content")).toBeInTheDocument();
    expect(screen.getByText("Managed terminals content")).toBeInTheDocument();
    expect(screen.getAllByText(/Use worker sync when a lane exists but its branch, worktree, status, or summary needs to be refreshed/i)).toHaveLength(2);
    expect(screen.getAllByText(/Launch only repo-owned commands here so the app can capture logs/i)).toHaveLength(2);
    expect(screen.queryByText("Overview content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /mission control/i }));
    expect(screen.getByText("Mission board content")).toBeInTheDocument();
    expect(screen.getByText(/Check worker ownership before you tell another thread to start on a file or scope/i)).toBeInTheDocument();
    expect(screen.queryByText("Worker lifecycle content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /autonomy/i }));
    expect(screen.getByText("Autonomy inbox content")).toBeInTheDocument();
    expect(screen.getByText(/Use the inbox summary cards to see whether there are active objectives/i)).toBeInTheDocument();
    expect(screen.queryByText("Mission board content")).not.toBeInTheDocument();
  });
});
