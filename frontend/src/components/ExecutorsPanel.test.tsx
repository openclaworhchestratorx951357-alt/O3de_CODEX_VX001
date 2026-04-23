import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { ExecutorRecord } from "../types/contracts";
import ExecutorsPanel from "./ExecutorsPanel";

const executor: ExecutorRecord = {
  id: "executor-1",
  executor_kind: "codex-thread",
  executor_label: "Primary Codex thread",
  executor_host_label: "local laptop",
  execution_mode_class: "hybrid",
  availability_state: "available",
  supported_runner_families: ["editor-control"],
  capability_snapshot: {},
  last_heartbeat_at: "2026-04-22T19:00:00.000Z",
  last_failure_summary: null,
  created_at: "2026-04-22T18:00:00.000Z",
  updated_at: "2026-04-22T19:00:00.000Z",
};

describe("ExecutorsPanel", () => {
  it("keeps search controls visible when a query filters all records", async () => {
    render(
      <ExecutorsPanel
        items={[executor]}
        loading={false}
        error={null}
      />,
    );

    const searchBox = screen.getByRole("searchbox");
    await userEvent.type(searchBox, "does-not-match");

    expect(screen.getByText("No executors match the current search.")).toBeInTheDocument();
    expect(screen.getByText("Widen the executor search")).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toHaveValue("does-not-match");

    await userEvent.clear(screen.getByRole("searchbox"));

    expect(screen.getByText("Primary Codex thread")).toBeInTheDocument();
  });
});
