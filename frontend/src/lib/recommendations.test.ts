import { describe, expect, it } from "vitest";

import { buildHomeRecommendationDescriptors } from "./recommendations";

describe("buildHomeRecommendationDescriptors", () => {
  it("prioritizes urgent operator blockers before starter guidance", () => {
    expect(buildHomeRecommendationDescriptors({
      pendingApprovalCount: 2,
      warningExecutionCount: 3,
      unresolvedRunCount: 4,
      persistenceReady: true,
      bridgeConfigured: false,
      bridgeHeartbeatFresh: false,
      supportsRealExecution: true,
    })).toEqual([
      expect.objectContaining({
        actionId: "open_operations_approvals",
        tone: "warning",
      }),
      expect.objectContaining({
        actionId: "open_runtime_overview",
        tone: "warning",
      }),
      expect.objectContaining({
        actionId: "open_records_runs",
        tone: "warning",
      }),
    ]);
  });

  it("falls back to beginner-safe starter actions when no urgent blockers are present", () => {
    expect(buildHomeRecommendationDescriptors({
      pendingApprovalCount: 0,
      warningExecutionCount: 0,
      unresolvedRunCount: 0,
      persistenceReady: true,
      bridgeConfigured: true,
      bridgeHeartbeatFresh: true,
      supportsRealExecution: true,
    }).map((entry) => entry.actionId)).toEqual([
      "open_prompt",
      "open_builder",
      "open_runtime_overview",
    ]);
  });
});
