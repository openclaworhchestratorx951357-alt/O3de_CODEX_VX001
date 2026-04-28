import { assetForgeAnimationTimelineFixture } from "../fixtures/assetForgeAnimationTimelineFixture";
import type { AssetForgeAnimationTimelineFixture } from "../types/assetForgeAnimationTimeline";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asAnimationString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function asAnimationStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => asAnimationString(entry))
    .filter((entry): entry is string => entry !== null);
}

function asAnimationNotes(value: unknown): Array<[string, string]> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) {
        return null;
      }
      const [label, detail] = entry;
      const safeLabel = asAnimationString(label);
      const safeDetail = asAnimationString(detail);
      if (!safeLabel || !safeDetail) {
        return null;
      }
      return [safeLabel, safeDetail] as [string, string];
    })
    .filter((entry): entry is [string, string] => entry !== null);
}

function asAnimationRow(value: unknown): AssetForgeAnimationTimelineFixture["keyframeRows"][number] | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const frameValue = asAnimationString(record.frame);
  const channel = asAnimationString(record.channel);
  const valueFrom = asAnimationString(record.valueFrom);
  const valueTo = asAnimationString(record.valueTo);
  const blendMode = asAnimationString(record.blendMode);
  const frame = Number(frameValue);

  if (
    frameValue === null
    || channel === null
    || valueFrom === null
    || valueTo === null
    || blendMode === null
    || !Number.isFinite(frame)
  ) {
    return null;
  }

  return {
    frame,
    channel,
    valueFrom,
    valueTo,
    blendMode,
  };
}

function asAnimationRowsPayload(value: unknown): AssetForgeAnimationTimelineFixture["keyframeRows"] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => asAnimationRow(entry))
    .filter((entry): entry is AssetForgeAnimationTimelineFixture["keyframeRows"][number] => entry !== null)
    .slice(0, 20);
}

function coerceAnimationTimeline(payload: unknown): AssetForgeAnimationTimelineFixture | null {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }

  const pageModeLabel = asAnimationString(record.pageModeLabel);
  const timelineLabel = asAnimationString(record.timelineLabel);
  const keyframeRows = asAnimationRowsPayload(record.keyframeRows);
  const cameraShots = asAnimationStringArray(record.cameraShots);
  const notes = asAnimationNotes(record.notes);
  const mutedActionsBlocked = asAnimationStringArray(record.mutedActionsBlocked);
  const disabledWriteActionLabel = asAnimationString(record.disabledWriteActionLabel);
  const writeActionLabel = asAnimationString(record.writeActionLabel);

  if (
    pageModeLabel === null
    && timelineLabel === null
    && keyframeRows.length === 0
    && cameraShots.length === 0
    && notes.length === 0
    && mutedActionsBlocked.length === 0
    && disabledWriteActionLabel === null
    && writeActionLabel === null
  ) {
    return null;
  }

  return {
    pageModeLabel: pageModeLabel ?? "Animation timeline preview",
    timelineLabel: timelineLabel ?? "Review-only animation keyframe preview",
    keyframeRows: keyframeRows.length > 0 ? keyframeRows : assetForgeAnimationTimelineFixture.keyframeRows,
    cameraShots: cameraShots.length > 0 ? cameraShots : assetForgeAnimationTimelineFixture.cameraShots,
    notes: notes.length > 0 ? notes : assetForgeAnimationTimelineFixture.notes,
    mutedActionsBlocked: mutedActionsBlocked.length > 0 ? mutedActionsBlocked : assetForgeAnimationTimelineFixture.mutedActionsBlocked,
    disabledWriteActionLabel: disabledWriteActionLabel ?? assetForgeAnimationTimelineFixture.disabledWriteActionLabel,
    writeActionLabel: writeActionLabel ?? assetForgeAnimationTimelineFixture.writeActionLabel,
  };
}

export function resolveAnimationTimelineFromPacket(payload: unknown): AssetForgeAnimationTimelineFixture | null {
  const packetRecord = asRecord(payload);
  if (!packetRecord) {
    return null;
  }

  const nestedPacket = asRecord(packetRecord.asset_readback_review_packet);
  if (nestedPacket) {
    const resolvedFromNested = coerceAnimationTimeline(nestedPacket.animation_timeline);
    if (resolvedFromNested) {
      return resolvedFromNested;
    }
  }

  const resolvedFromRoot = coerceAnimationTimeline(packetRecord.animation_timeline);
  if (resolvedFromRoot) {
    return resolvedFromRoot;
  }

  const frontendReviewPacket = asRecord(packetRecord.review_packet);
  const resolvedFromFrontendShape = frontendReviewPacket
    ? coerceAnimationTimeline(frontendReviewPacket.animation_timeline)
    : null;
  if (resolvedFromFrontendShape) {
    return resolvedFromFrontendShape;
  }

  return null;
}
