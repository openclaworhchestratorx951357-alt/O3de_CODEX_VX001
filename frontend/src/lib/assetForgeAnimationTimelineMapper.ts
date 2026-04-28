import { assetForgeAnimationTimelineFixture } from "../fixtures/assetForgeAnimationTimelineFixture";
import type { AssetForgeAnimationTimelineFixture } from "../types/assetForgeAnimationTimeline";

export type AnimationTimelineParseIssue = {
  source: string;
  detail: string;
};

export type AnimationTimelineResolution = {
  timeline: AssetForgeAnimationTimelineFixture | null;
  issues: AnimationTimelineParseIssue[];
};

const ISSUE_LIMIT = 20;

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

function asAnimationStringArray(
  value: unknown,
  source: string,
  issues: AnimationTimelineParseIssue[],
  issueFieldName: string,
): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push({
      source,
      detail: `${issueFieldName} expected an array of primitive values.`,
    });
    return [];
  }

  return value
    .map((entry) => asAnimationString(entry))
    .filter((entry): entry is string => entry !== null);
}

function asAnimationNotes(value: unknown, source: string, issues: AnimationTimelineParseIssue[]): Array<[string, string]> {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push({
      source,
      detail: "notes expected an array of [label, detail] tuples.",
    });
    return [];
  }

  return value
    .map((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) {
        issues.push({
          source,
          detail: "Dropped invalid note tuple (expected [label, detail]).",
        });
        return null;
      }
      const [label, detail] = entry;
      const safeLabel = asAnimationString(label);
      const safeDetail = asAnimationString(detail);
      if (!safeLabel || !safeDetail) {
        issues.push({
          source,
          detail: "Dropped note tuple with empty label/detail.",
        });
        return null;
      }
      return [safeLabel, safeDetail] as [string, string];
    })
    .filter((entry): entry is [string, string] => entry !== null);
}

function asAnimationRow(
  value: unknown,
  source: string,
  issues: AnimationTimelineParseIssue[],
  rowIndex: number,
): AssetForgeAnimationTimelineFixture["keyframeRows"][number] | null {
  const record = asRecord(value);
  if (!record) {
    issues.push({
      source,
      detail: `Dropped invalid keyframe row #${rowIndex + 1}: not an object.`,
    });
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
    issues.push({
      source,
      detail: `Dropped keyframe row #${rowIndex + 1}: expected frame/channel/valueFrom/valueTo/blendMode.`,
    });
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

function asAnimationRowsPayload(
  value: unknown,
  source: string,
  issues: AnimationTimelineParseIssue[],
): AssetForgeAnimationTimelineFixture["keyframeRows"] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    issues.push({ source, detail: "keyframeRows expected an array." });
    return [];
  }

  if (value.length > ISSUE_LIMIT) {
    issues.push({
      source,
      detail: `keyframeRows had ${value.length} rows; only first ${ISSUE_LIMIT} are shown.`,
    });
  }

  return value
    .slice(0, ISSUE_LIMIT)
    .map((entry, index) => asAnimationRow(entry, source, issues, index))
    .filter((entry): entry is AssetForgeAnimationTimelineFixture["keyframeRows"][number] => entry !== null);
}

function coerceAnimationTimeline(
  payload: unknown,
  source: string,
): AnimationTimelineResolution {
  if (payload === undefined) {
    return {
      timeline: null,
      issues: [
        {
          source,
          detail: "Timeline payload missing.",
        },
      ],
    };
  }

  const record = asRecord(payload);
  if (!record) {
    return {
      timeline: null,
      issues: [
        {
          source,
          detail: "Timeline payload must be an object.",
        },
      ],
    };
  }

  const issues: Array<AnimationTimelineParseIssue> = [];

  const pageModeLabel = asAnimationString(record.pageModeLabel);
  const timelineLabel = asAnimationString(record.timelineLabel);
  const keyframeRows = asAnimationRowsPayload(record.keyframeRows, `${source}.keyframeRows`, issues);
  const cameraShots = asAnimationStringArray(record.cameraShots, source, issues, "cameraShots");
  const notes = asAnimationNotes(record.notes, source, issues);
  const mutedActionsBlocked = asAnimationStringArray(record.mutedActionsBlocked, source, issues, "mutedActionsBlocked");
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
    return {
      timeline: null,
      issues,
    };
  }

  if (issues.length > 0) {
    issues.unshift({
      source,
      detail: "Timeline payload is partially usable with fallback defaults.",
    });
  }

  return {
    timeline: {
      pageModeLabel: pageModeLabel ?? "Animation timeline preview",
      timelineLabel: timelineLabel ?? "Review-only animation keyframe preview",
      keyframeRows: keyframeRows.length > 0 ? keyframeRows : assetForgeAnimationTimelineFixture.keyframeRows,
      cameraShots: cameraShots.length > 0 ? cameraShots : assetForgeAnimationTimelineFixture.cameraShots,
      notes: notes.length > 0 ? notes : assetForgeAnimationTimelineFixture.notes,
      mutedActionsBlocked: mutedActionsBlocked.length > 0
        ? mutedActionsBlocked
        : assetForgeAnimationTimelineFixture.mutedActionsBlocked,
      disabledWriteActionLabel: disabledWriteActionLabel ?? assetForgeAnimationTimelineFixture.disabledWriteActionLabel,
      writeActionLabel: writeActionLabel ?? assetForgeAnimationTimelineFixture.writeActionLabel,
    },
    issues,
  };
}

export function resolveAnimationTimelineWithDiagnostics(payload: unknown): AnimationTimelineResolution {
  const packetRecord = asRecord(payload);
  if (!packetRecord) {
    return {
      timeline: null,
      issues: [{ source: "payload", detail: "No payload record to inspect." }],
    };
  }

  const nestedPacket = asRecord(packetRecord.asset_readback_review_packet);
  const nestedResolution = coerceAnimationTimeline(
    nestedPacket?.animation_timeline,
    "asset_readback_review_packet.animation_timeline",
  );
  if (nestedResolution.timeline) {
    return nestedResolution;
  }

  const rootResolution = coerceAnimationTimeline(packetRecord.animation_timeline, "animation_timeline");
  if (rootResolution.timeline) {
    return rootResolution;
  }

  const frontendReviewPacket = asRecord(packetRecord.review_packet);
  const frontendResolution = coerceAnimationTimeline(
    frontendReviewPacket?.animation_timeline,
    "review_packet.animation_timeline",
  );
  if (frontendResolution.timeline) {
    return frontendResolution;
  }

  return {
    timeline: null,
    issues: [
      ...nestedResolution.issues,
      ...rootResolution.issues,
      ...frontendResolution.issues,
    ].slice(0, 30),
  };
}

export function resolveAnimationTimelineFromPacket(payload: unknown): AssetForgeAnimationTimelineFixture | null {
  return resolveAnimationTimelineWithDiagnostics(payload).timeline;
}
