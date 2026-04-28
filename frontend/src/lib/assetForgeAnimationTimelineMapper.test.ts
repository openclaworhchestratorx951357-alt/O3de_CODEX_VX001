import { describe, expect, it } from "vitest";

import { resolveAnimationTimelineFromPacket, resolveAnimationTimelineWithDiagnostics } from "./assetForgeAnimationTimelineMapper";

describe("resolveAnimationTimelineFromPacket", () => {
  it("reads animation_timeline from nested asset_readback_review_packet first", () => {
    const payload = {
      asset_readback_review_packet: {
        animation_timeline: {
          pageModeLabel: "Nested preview",
          timelineLabel: "Nested lane",
          keyframeRows: [
            {
              frame: 1,
              channel: "Transform",
              valueFrom: "0",
              valueTo: "1",
              blendMode: "linear",
            },
          ],
          cameraShots: ["Shot nested"],
          notes: [["Timeline mode", "Nested"]],
          mutedActionsBlocked: ["Insert keyframe"],
          disabledWriteActionLabel: "Disabled nested action",
          writeActionLabel: "Queued nested action",
          extra_field_ignored: true,
        },
      },
      animation_timeline: {
        pageModeLabel: "Ignored root",
        timelineLabel: "Ignored root timeline",
      },
    };

    const resolved = resolveAnimationTimelineFromPacket(payload);

    expect(resolved?.pageModeLabel).toBe("Nested preview");
    expect(resolved?.timelineLabel).toBe("Nested lane");
    expect(resolved?.keyframeRows[0]?.channel).toBe("Transform");
    expect(resolved?.cameraShots).toEqual(["Shot nested"]);
    expect(resolved?.mutedActionsBlocked).toEqual(["Insert keyframe"]);
    expect(resolved?.disabledWriteActionLabel).toBe("Disabled nested action");
    expect(resolved?.writeActionLabel).toBe("Queued nested action");
  });

  it("reads animation_timeline from root payload when nested packet timeline is missing", () => {
    const payload = {
      animation_timeline: {
        pageModeLabel: "Root preview",
        timelineLabel: "Root lane",
        keyframeRows: [
          {
            frame: 12,
            channel: "Camera FOV",
            valueFrom: "60deg",
            valueTo: "45deg",
            blendMode: "ease",
          },
        ],
      },
      review_packet: {
        animation_timeline: {
          pageModeLabel: "Fallback should ignore",
          timelineLabel: "Fallback should ignore",
        },
      },
    };

    const resolved = resolveAnimationTimelineFromPacket(payload);

    expect(resolved?.pageModeLabel).toBe("Root preview");
    expect(resolved?.timelineLabel).toBe("Root lane");
    expect(resolved?.keyframeRows).toHaveLength(1);
    expect(resolved?.keyframeRows[0]?.channel).toBe("Camera FOV");
  });

  it("reads animation_timeline from review_packet.animation_timeline when others are missing", () => {
    const payload = {
      review_packet: {
        animation_timeline: {
          pageModeLabel: "Frontend payload preview",
          timelineLabel: "Frontend lane",
          notes: [
            ["Timeline mode", "Frontend packet"],
            ["Writeback", "Blocked"],
          ],
          mutedActionsBlocked: ["Insert keyframe", "Delete keyframe"],
          disabledWriteActionLabel: "Frontend blocked",
          writeActionLabel: "Frontend queued",
          cameraShots: ["Shot from frontend"],
        },
      },
    };

    const resolved = resolveAnimationTimelineFromPacket(payload);

    expect(resolved?.pageModeLabel).toBe("Frontend payload preview");
    expect(resolved?.timelineLabel).toBe("Frontend lane");
    expect(resolved?.notes).toEqual([["Timeline mode", "Frontend packet"], ["Writeback", "Blocked"]]);
    expect(resolved?.cameraShots).toEqual(["Shot from frontend"]);
  });

  it("returns null when timeline payload exists but has no usable fields", () => {
    const payload = {
      asset_readback_review_packet: {
        animation_timeline: {},
      },
    };

    const resolved = resolveAnimationTimelineFromPacket(payload);

    expect(resolved).toBeNull();
  });

  it("returns null for payloads without usable timeline data", () => {
    const payload = {
      asset_readback_review_packet: {
        something_else: "not a timeline",
      },
      animation_timeline: null,
      review_packet: {
        capability: "asset.source.inspect",
      },
    };

    const resolved = resolveAnimationTimelineFromPacket(payload);

    expect(resolved).toBeNull();
  });

  it("returns issues for non-array keyframeRows and notes", () => {
    const payload = {
      asset_readback_review_packet: {
        animation_timeline: {
          pageModeLabel: "Invalid timeline",
          timelineLabel: "Row shape test",
          keyframeRows: "not-an-array",
          notes: "not-an-array",
          cameraShots: ["Shot 1", "Shot 2"],
          mutedActionsBlocked: ["Blocked"],
        },
      },
    };

    const resolved = resolveAnimationTimelineWithDiagnostics(payload);

    expect(resolved.timeline?.pageModeLabel).toBe("Invalid timeline");
    expect(resolved.timeline?.timelineLabel).toBe("Row shape test");
    expect(resolved.timeline?.cameraShots).toEqual(["Shot 1", "Shot 2"]);
    expect(resolved.issues.some((issue) => issue.detail.includes("keyframeRows expected an array"))).toBe(true);
    expect(resolved.issues.some((issue) => issue.detail.includes("notes expected an array"))).toBe(true);
  });

  it("drops malformed keyframe rows and keeps valid rows", () => {
    const payload = {
      animation_timeline: {
        pageModeLabel: "Partial timeline",
        timelineLabel: "Rows filtered",
        keyframeRows: [
          { frame: 1, channel: "Transform", valueFrom: "0", valueTo: "1", blendMode: "linear" },
          { frame: "bad", channel: "Transform", valueFrom: "0", valueTo: "1", blendMode: "linear" },
          { frame: 3, channel: "Camera", valueFrom: "2", valueTo: "3", blendMode: "ease" },
          { channel: "Missing frame", valueFrom: "1", valueTo: "2", blendMode: "linear" },
        ],
      },
    };

    const resolved = resolveAnimationTimelineWithDiagnostics(payload);

    expect(resolved.timeline?.keyframeRows.map((row) => row.frame)).toEqual([1, 3]);
    expect(resolved.issues.some((issue) => issue.detail.includes("Dropped keyframe row #2"))).toBe(true);
    expect(resolved.issues.some((issue) => issue.detail.includes("Dropped keyframe row #4"))).toBe(true);
  });
});
