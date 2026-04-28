import type { AssetForgeAnimationTimelineFixture } from "../types/assetForgeAnimationTimeline";

export const assetForgeAnimationTimelineFixture: AssetForgeAnimationTimelineFixture = {
  pageModeLabel: "Review-only animation planning preview",
  timelineLabel: "Frame sequence + keyframe holdout for preview",
  keyframeRows: [
    {
      frame: 12,
      channel: "Transform Position",
      valueFrom: "0.2",
      valueTo: "1.0",
      blendMode: "hold",
    },
    {
      frame: 24,
      channel: "Transform Rotation",
      valueFrom: "0deg",
      valueTo: "35deg",
      blendMode: "ease",
    },
    {
      frame: 40,
      channel: "Light.Intensity",
      valueFrom: "1.0",
      valueTo: "0.6",
      blendMode: "linear",
    },
    {
      frame: 60,
      channel: "Camera FOV",
      valueFrom: "72deg",
      valueTo: "56deg",
      blendMode: "ease",
    },
  ],
  cameraShots: ["Shot A: Bridge establish", "Shot B: Candidate orbit", "Shot C: Hold for evidence"],
  notes: [
    ["Timeline mode", "Preview only"],
    ["Writeback", "Blocked"],
    ["Placement", "Blocked"],
    ["Material mutation", "Blocked"],
  ],
  mutedActionsBlocked: ["Insert keyframe", "Delete keyframe", "Export animation track", "Write animation to O3DE scene"],
  disabledWriteActionLabel: "Write animation to O3DE scene",
  writeActionLabel: "Write animation to O3DE scene",
};
