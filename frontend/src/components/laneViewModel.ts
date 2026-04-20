import type { LaneActionEntry } from "./LaneActionsCard";
import type { OperatorLaneStateEntry } from "./OperatorLaneStateBlock";

type LaneStateArgs = {
  laneHandoffLabel?: string | null;
  laneHandoffDetail?: string | null;
  laneExportLabel?: string | null;
  laneExportDetail?: string | null;
  laneOperatorNoteLabel?: string | null;
  laneOperatorNoteDetail?: string | null;
  activeLanePresetLabel?: string | null;
  activeLanePresetDetail?: string | null;
  lanePresetRestoredLabel?: string | null;
  lanePresetRestoredDetail?: string | null;
  lanePresetDriftLabel?: string | null;
  lanePresetDriftDetail?: string | null;
};

type LaneActionArgs = {
  recordKindLabel: string;
  isPinnedRecord: boolean;
  pinnedRecordStatusDetail?: string | null;
  laneQueueLabel?: string | null;
  laneQueueDetail?: string | null;
  laneCompletionDetail?: string | null;
  laneRolloverLabel?: string | null;
  laneRolloverDetail?: string | null;
  laneMemoryLabel?: string | null;
  laneMemoryDetail?: string | null;
  onPinRecord?: (() => void) | null;
  onUnpinRecord?: (() => void) | null;
  onRefocusPinnedRecord?: (() => void) | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
  onOpenNextLaneRecord?: (() => void) | null;
  onOpenLaneRolloverRecord?: (() => void) | null;
  onReturnToLane?: (() => void) | null;
};

export function buildOperatorLaneStateEntries({
  laneHandoffLabel,
  laneHandoffDetail,
  laneExportLabel,
  laneExportDetail,
  laneOperatorNoteLabel,
  laneOperatorNoteDetail,
  activeLanePresetLabel,
  activeLanePresetDetail,
  lanePresetRestoredLabel,
  lanePresetRestoredDetail,
  lanePresetDriftLabel,
  lanePresetDriftDetail,
}: LaneStateArgs): OperatorLaneStateEntry[] {
  return [
    laneHandoffDetail ? { label: laneHandoffLabel ?? "handoff", detail: laneHandoffDetail, tone: "default" as const } : null,
    laneExportDetail ? { label: laneExportLabel ?? "export", detail: laneExportDetail, tone: "default" as const } : null,
    laneOperatorNoteDetail ? { label: laneOperatorNoteLabel ?? "operator note", detail: laneOperatorNoteDetail, tone: "default" as const } : null,
    activeLanePresetDetail ? { label: activeLanePresetLabel ?? "preset", detail: activeLanePresetDetail, tone: "default" as const } : null,
    lanePresetRestoredDetail ? { label: lanePresetRestoredLabel ?? "preset restore", detail: lanePresetRestoredDetail, tone: "default" as const } : null,
    lanePresetDriftDetail ? { label: lanePresetDriftLabel ?? "preset drift", detail: lanePresetDriftDetail, tone: "warning" as const } : null,
  ].filter((entry): entry is OperatorLaneStateEntry => Boolean(entry));
}

export function buildLaneActionEntries({
  recordKindLabel,
  isPinnedRecord,
  pinnedRecordStatusDetail,
  laneQueueLabel,
  laneQueueDetail,
  laneCompletionDetail,
  laneRolloverLabel,
  laneRolloverDetail,
  laneMemoryLabel,
  laneMemoryDetail,
  onPinRecord,
  onUnpinRecord,
  onRefocusPinnedRecord,
  onRefresh,
  refreshing = false,
  onOpenNextLaneRecord,
  onOpenLaneRolloverRecord,
  onReturnToLane,
}: LaneActionArgs): LaneActionEntry[] {
  return [
    onPinRecord || onUnpinRecord ? {
      key: "pin",
      title: "Decision lane",
      detail: isPinnedRecord
        ? `This ${recordKindLabel} is pinned as the current operator decision lane.`
        : `Pin this ${recordKindLabel} to keep it visible as the current operator decision lane while navigating.`,
      actionLabel: isPinnedRecord ? `Unpin ${recordKindLabel}` : `Pin ${recordKindLabel}`,
      onClick: isPinnedRecord ? onUnpinRecord ?? null : onPinRecord ?? null,
    } : null,
    isPinnedRecord && pinnedRecordStatusDetail ? {
      key: "status",
      title: "Pinned status",
      detail: pinnedRecordStatusDetail,
      actionLabel: onRefocusPinnedRecord ? "Re-focus pinned lane" : onRefresh ? (refreshing ? "Refreshing..." : `Refresh pinned ${recordKindLabel}`) : null,
      onClick: onRefocusPinnedRecord ?? onRefresh ?? null,
    } : null,
    isPinnedRecord && laneQueueLabel && laneQueueDetail && onOpenNextLaneRecord ? {
      key: "queue",
      title: "Lane queue",
      detail: laneQueueDetail,
      actionLabel: laneQueueLabel,
      onClick: onOpenNextLaneRecord,
    } : null,
    isPinnedRecord && laneCompletionDetail ? {
      key: "completion",
      title: "Lane completion",
      detail: laneRolloverDetail ? `${laneCompletionDetail} ${laneRolloverDetail}` : laneCompletionDetail,
      actionLabel: laneRolloverLabel ?? null,
      onClick: onOpenLaneRolloverRecord ?? null,
    } : null,
    laneMemoryLabel && laneMemoryDetail && onReturnToLane ? {
      key: "return",
      title: "Return to lane",
      detail: laneMemoryDetail,
      actionLabel: `Return to ${laneMemoryLabel}`,
      onClick: onReturnToLane,
    } : null,
  ].filter((entry): entry is LaneActionEntry => Boolean(entry));
}
