import { describe, expect, it } from "vitest";

import {
  buildBuilderRecommendationDescriptors,
  buildHomeRecommendationDescriptors,
  buildRuntimeRecommendationDescriptors,
} from "./recommendations";

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

describe("buildRuntimeRecommendationDescriptors", () => {
  it("routes unhealthy runtime posture to overview before secondary checks", () => {
    expect(buildRuntimeRecommendationDescriptors({
      persistenceReady: false,
      bridgeConfigured: true,
      bridgeHeartbeatFresh: false,
      supportsRealExecution: true,
      executorCount: 0,
      workspaceCount: 0,
      activeLockCount: 2,
      policyCount: 5,
    }).map((entry) => entry.actionId)).toEqual([
      "open_runtime_overview",
      "open_runtime_governance",
      "open_runtime_workspaces",
    ]);
  });
});

describe("buildBuilderRecommendationDescriptors", () => {
  it("prioritizes mission-control attention and autonomy follow-up", () => {
    expect(buildBuilderRecommendationDescriptors({
      missionControlAvailable: true,
      workerCount: 2,
      taskCount: 4,
      waiterCount: 1,
      unreadNotificationCount: 3,
      terminalSessionCount: 1,
      queuedAutonomyJobCount: 2,
      autonomyAttentionCount: 1,
    }).map((entry) => entry.actionId)).toEqual([
      "open_builder_mission_control",
      "open_builder_autonomy",
      "open_builder_active_lane",
    ]);
  });
});
