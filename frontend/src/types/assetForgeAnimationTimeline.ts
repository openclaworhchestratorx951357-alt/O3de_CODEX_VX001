export type AnimationTimelineBlendMode = "hold" | "linear" | "ease" | "step" | string;

export type AssetForgeAnimationKeyframe = {
  frame: number;
  channel: string;
  valueFrom: string;
  valueTo: string;
  blendMode: AnimationTimelineBlendMode;
};

export type AssetForgeAnimationTimelineFixture = {
  pageModeLabel: string;
  timelineLabel: string;
  keyframeRows: AssetForgeAnimationKeyframe[];
  cameraShots: string[];
  notes: Array<[string, string]>;
  mutedActionsBlocked: string[];
  disabledWriteActionLabel: string;
  writeActionLabel: string;
};
