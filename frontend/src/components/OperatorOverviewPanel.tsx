import type { CSSProperties } from "react";

import type { ControlPlaneSummaryResponse } from "../types/contracts";
import OperatorStatusRail from "./OperatorStatusRail";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  getApprovalStatusTone,
  getExecutionModeTone,
  getExecutionStatusTone,
  getRunStatusTone,
  getSeverityTone,
} from "./statusChipTones";
import {
  formatSummaryTimestamp,
  summaryBadgeStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryMutedTextStyle,
  summaryTimestampNoteStyle,
} from "./summaryPrimitives";

type OperatorOverviewPanelProps = {
  summary: ControlPlaneSummaryResponse | null;
  loading: boolean;
  error: string | null;
  lastRefreshedAt?: string | null;
  onRunStatusSelect: (status: string) => void;
  onPendingApprovalsSelect: () => void;
  onExecutionModeSelect: (mode: string) => void;
  onArtifactModeSelect: (mode: string) => void;
  onEventSeveritySelect: (severity: string) => void;
};

export default function OperatorOverviewPanel({
  summary,
  loading,
  error,
  lastRefreshedAt,
  onRunStatusSelect,
  onPendingApprovalsSelect,
  onExecutionModeSelect,
  onArtifactModeSelect,
  onEventSeveritySelect,
}: OperatorOverviewPanelProps) {
  return (
    <SummarySection
      title="Operator Overview"
      description="Compact persisted snapshot of run volume, approvals, execution modes, artifacts, event pressure, and lock occupancy. This is an operator aggregate only: simulated execution must remain explicitly labeled, and these counts do not expand the admitted real O3DE adapter boundary."
      loading={loading}
      error={error}
      emptyMessage="No persisted operator summary is available."
      hasItems={Boolean(summary)}
      marginTop={24}
    >
      {summary ? (
        <>
          {lastRefreshedAt ? (
            <div style={summaryTimestampNoteStyle}>
              Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
            </div>
          ) : null}
          <div style={badgeRowStyle}>
            <span style={summaryBadgeStyle}>runs: {summary.runs_total}</span>
            <span style={summaryBadgeStyle}>approvals: {summary.approvals_total}</span>
            <span style={summaryBadgeStyle}>executions: {summary.executions_total}</span>
            <span style={summaryBadgeStyle}>artifacts: {summary.artifacts_total}</span>
            <span style={summaryBadgeStyle}>events: {summary.events_total}</span>
            <span style={summaryBadgeStyle}>locks: {summary.locks_total}</span>
          </div>
          <div style={summaryCardGridStyle}>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Runs</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.runs_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    attentionLabel={getRunAttentionLabel(summary)}
                  />
                </SummaryFact>
                <SummaryFact label="Statuses">
                  <StatusBreakdown
                    entries={summary.runs_by_status}
                    toneForKey={getRunStatusTone}
                    emptyLabel="none"
                    onSelect={onRunStatusSelect}
                  />
                </SummaryFact>
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Approvals</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.approvals_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    attentionLabel={getApprovalAttentionLabel(summary)}
                  />
                </SummaryFact>
                <SummaryFact label="Pending">
                  <button
                    type="button"
                    onClick={onPendingApprovalsSelect}
                    style={chipButtonStyle}
                  >
                    <StatusChip
                      label={String(summary.approvals_pending)}
                      tone={getApprovalStatusTone(summary.approvals_pending > 0 ? "pending" : "approved")}
                    />
                  </button>
                </SummaryFact>
                <SummaryFact label="Decided">{summary.approvals_decided}</SummaryFact>
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Executions</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.executions_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    executionMode={getDominantMode(summary.executions_by_mode)}
                    attentionLabel={getExecutionAttentionLabel(summary)}
                  />
                </SummaryFact>
                <SummaryFact label="Statuses">
                  <StatusBreakdown
                    entries={summary.executions_by_status}
                    toneForKey={getExecutionStatusTone}
                    emptyLabel="none"
                  />
                </SummaryFact>
                <SummaryFact label="Modes">
                  <StatusBreakdown
                    entries={summary.executions_by_mode}
                    toneForKey={getExecutionModeTone}
                    emptyLabel="none"
                    onSelect={onExecutionModeSelect}
                  />
                </SummaryFact>
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Artifacts</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.artifacts_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    executionMode={getDominantMode(summary.artifacts_by_mode)}
                    simulated={summary.artifacts_by_mode.simulated > 0}
                    attentionLabel={getArtifactAttentionLabel(summary)}
                  />
                </SummaryFact>
                <SummaryFact label="Modes">
                  <StatusBreakdown
                    entries={summary.artifacts_by_mode}
                    toneForKey={getExecutionModeTone}
                    emptyLabel="none"
                    onSelect={onArtifactModeSelect}
                  />
                </SummaryFact>
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Events</h3>
              <SummaryFacts>
                <SummaryFact label="Total">{summary.events_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    attentionLabel={getEventAttentionLabel(summary)}
                  />
                </SummaryFact>
                <SummaryFact label="Active pressure">
                  <StatusChip
                    label={String(summary.active_events)}
                    tone={summary.active_events > 0 ? "warning" : "success"}
                  />
                </SummaryFact>
                <SummaryFact label="Severity mix">
                  <StatusBreakdown
                    entries={summary.events_by_severity}
                    toneForKey={getSeverityTone}
                    emptyLabel="none"
                    onSelect={onEventSeveritySelect}
                  />
                </SummaryFact>
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h3 style={summaryCardHeadingStyle}>Locks</h3>
              <SummaryFacts>
                <SummaryFact label="Held">{summary.locks_total}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    attentionLabel={getLockAttentionLabel(summary)}
                  />
                </SummaryFact>
              </SummaryFacts>
              <p style={summaryMutedTextStyle}>
                Persisted lock count shows current occupancy only. It does not imply broader real execution than the currently admitted hybrid surfaces.
              </p>
            </article>
          </div>
        </>
      ) : null}
    </SummarySection>
  );
}

type StatusBreakdownProps = {
  entries: Record<string, number>;
  toneForKey: (key: string) => "neutral" | "info" | "success" | "warning" | "danger";
  emptyLabel: string;
  onSelect?: (key: string) => void;
};

function StatusBreakdown({ entries, toneForKey, emptyLabel, onSelect }: StatusBreakdownProps) {
  const sortedEntries = Object.entries(entries).sort(([left], [right]) => left.localeCompare(right));

  if (sortedEntries.length === 0) {
    return <span>{emptyLabel}</span>;
  }

  return (
    <div style={chipWrapStyle}>
      {sortedEntries.map(([key, value]) => (
        <button
          key={key}
          type="button"
          onClick={onSelect ? () => onSelect(key) : undefined}
          style={chipButtonStyle}
        >
          <StatusChip
            label={`${key}: ${value}`}
            tone={toneForKey(key)}
          />
        </button>
      ))}
    </div>
  );
}

function getDominantMode(entries: Record<string, number>): string | null {
  const sortedEntries = Object.entries(entries).sort((left, right) => right[1] - left[1]);
  return sortedEntries[0]?.[0] ?? null;
}

function getRunAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  const liveRuns = (summary.runs_by_status.running ?? 0)
    + (summary.runs_by_status.pending ?? 0)
    + (summary.runs_by_status.waiting_approval ?? 0);

  if (liveRuns > 0) {
    return "Live decision state";
  }

  return "Routine follow-up";
}

function getApprovalAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  if (summary.approvals_pending > 0) {
    return "Audit review needed";
  }

  return "Routine follow-up";
}

function getExecutionAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  if ((summary.executions_by_mode.simulated ?? 0) > 0) {
    return "Simulation boundary";
  }

  if ((summary.executions_by_status.running ?? 0) > 0) {
    return "Live decision state";
  }

  return "Routine follow-up";
}

function getArtifactAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  if ((summary.artifacts_by_mode.simulated ?? 0) > 0) {
    return "Simulation boundary";
  }

  return "Routine follow-up";
}

function getEventAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  if (summary.active_events > 0) {
    return "Monitor active pressure";
  }

  return "Routine follow-up";
}

function getLockAttentionLabel(summary: ControlPlaneSummaryResponse): string {
  if (summary.locks_total > 0) {
    return "Monitor live occupancy";
  }

  return "Routine follow-up";
}

const badgeRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 12,
};

const chipWrapStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const chipButtonStyle: CSSProperties = {
  border: "none",
  padding: 0,
  background: "transparent",
  cursor: "pointer",
};
