import type {
  ArtifactListItem,
  EventListItem,
  ExecutionListItem,
  RunListItem,
  WorkspaceRecord,
} from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
} from "./summaryPrimitives";

type WorkspaceDetailPanelProps = {
  item: WorkspaceRecord | null;
  loading: boolean;
  error: string | null;
  localReviewDisposition?: "in_queue" | "reviewed" | "snoozed" | null;
  localReviewUpdatedAt?: string | null;
  localContextFocusLabel?: string | null;
  localContextSavedAt?: string | null;
  localContextNote?: string | null;
  localReadinessLabel?: string | null;
  localReadinessDetail?: string | null;
  localHasDrift?: boolean;
  onOpenSavedContext?: (() => void) | null;
  onMarkLocalReviewed?: (() => void) | null;
  onSnoozeLocalReview?: (() => void) | null;
  onKeepLocalInQueue?: (() => void) | null;
  attentionExecutionLabel?: string | null;
  attentionExecutionDetail?: string | null;
  attentionArtifactLabel?: string | null;
  attentionArtifactDetail?: string | null;
  attentionRunLabel?: string | null;
  attentionRunDetail?: string | null;
  relatedExecutions?: ExecutionListItem[];
  relatedRuns?: RunListItem[];
  relatedArtifacts?: ArtifactListItem[];
  relatedEvents?: EventListItem[];
  onOpenExecution?: (executionId: string) => void;
  onOpenRun?: (runId: string) => void;
  onOpenArtifact?: (artifactId: string) => void;
  lastRefreshedAt?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

export default function WorkspaceDetailPanel({
  item,
  loading,
  error,
  localReviewDisposition = null,
  localReviewUpdatedAt = null,
  localContextFocusLabel = null,
  localContextSavedAt = null,
  localContextNote = null,
  localReadinessLabel = null,
  localReadinessDetail = null,
  localHasDrift = false,
  onOpenSavedContext = null,
  onMarkLocalReviewed = null,
  onSnoozeLocalReview = null,
  onKeepLocalInQueue = null,
  attentionExecutionLabel = null,
  attentionExecutionDetail = null,
  attentionArtifactLabel = null,
  attentionArtifactDetail = null,
  attentionRunLabel = null,
  attentionRunDetail = null,
  relatedExecutions = [],
  relatedRuns = [],
  relatedArtifacts = [],
  relatedEvents = [],
  onOpenExecution,
  onOpenRun,
  onOpenArtifact,
  lastRefreshedAt,
  onRefresh,
  refreshing = false,
}: WorkspaceDetailPanelProps) {
  return (
    <SummarySection
      title="Workspace Detail"
      description="Workspace detail is persisted substrate bookkeeping for isolation, ownership, and cleanup lifecycle. It does not imply broader mutation admission or remote tool execution beyond currently admitted surfaces."
      loading={loading}
      error={error}
      emptyMessage="Select a workspace to inspect its persisted substrate record."
      hasItems={Boolean(item)}
      actions={onRefresh ? (
        <button type="button" onClick={onRefresh} disabled={refreshing} style={summaryActionButtonStyle}>
          {refreshing ? "Refreshing..." : "Refresh workspace detail"}
        </button>
      ) : null}
    >
      {item ? (
        <div style={summaryCardGridStyle}>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Local Handoff State</h4>
            <SummaryFacts>
              <SummaryFact label="Review state">
                <StatusChip
                  label={localReviewDisposition ? localReviewDisposition.replace("_", " ") : "not saved"}
                  tone={
                    localReviewDisposition === "reviewed"
                      ? "success"
                      : localReviewDisposition === "snoozed"
                        ? "warning"
                        : "info"
                  }
                />
              </SummaryFact>
              <SummaryFact label="Saved context">
                {localContextFocusLabel ?? "No local workspace context saved in this browser session."}
              </SummaryFact>
              {localContextSavedAt ? (
                <SummaryFact label="Saved at">{formatSummaryTimestamp(localContextSavedAt)}</SummaryFact>
              ) : null}
              {localReviewUpdatedAt ? (
                <SummaryFact label="Review updated">{formatSummaryTimestamp(localReviewUpdatedAt)}</SummaryFact>
              ) : null}
              <SummaryFact label="Readiness">
                {localReadinessLabel ?? "No local readiness assessment yet."}
              </SummaryFact>
              {localHasDrift ? (
                <SummaryFact label="Drift status">
                  Local saved workspace context no longer matches currently persisted records in this slice.
                </SummaryFact>
              ) : null}
              {localContextNote ? (
                <SummaryFact label="Local note">{localContextNote}</SummaryFact>
              ) : null}
              {localReadinessDetail ? (
                <SummaryFact label="Readiness detail">{localReadinessDetail}</SummaryFact>
              ) : null}
            </SummaryFacts>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {onOpenSavedContext ? (
                <button type="button" style={summaryActionButtonStyle} onClick={onOpenSavedContext}>
                  Open saved context
                </button>
              ) : null}
              {onMarkLocalReviewed ? (
                <button type="button" style={summaryActionButtonStyle} onClick={onMarkLocalReviewed}>
                  Mark reviewed
                </button>
              ) : null}
              {onSnoozeLocalReview ? (
                <button type="button" style={summaryActionButtonStyle} onClick={onSnoozeLocalReview}>
                  Snooze
                </button>
              ) : null}
              {localReviewDisposition !== "in_queue" && onKeepLocalInQueue ? (
                <button type="button" style={summaryActionButtonStyle} onClick={onKeepLocalInQueue}>
                  Return to queue
                </button>
              ) : null}
            </div>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Workspace Identity</h4>
            <SummaryFacts>
              <SummaryFact label="Workspace ID" copyValue={item.id}>{item.id}</SummaryFact>
              <SummaryFact label="Root" copyValue={item.workspace_root}>{item.workspace_root}</SummaryFact>
              <SummaryFact label="Kind">{item.workspace_kind}</SummaryFact>
              <SummaryFact label="State">
                <StatusChip label={item.workspace_state} tone={item.workspace_state === "ready" ? "success" : "warning"} />
              </SummaryFact>
              <SummaryFact label="Runner family">{item.runner_family}</SummaryFact>
              <SummaryFact label="Retention">{item.retention_class}</SummaryFact>
              <SummaryFact label="Cleanup">{item.cleanup_policy}</SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Ownership</h4>
            <SummaryFacts>
              {item.owner_executor_id ? (
                <SummaryFact label="Owner executor" copyValue={item.owner_executor_id}>{item.owner_executor_id}</SummaryFact>
              ) : null}
              {item.owner_execution_id ? (
                <SummaryFact label="Owner execution" copyValue={item.owner_execution_id}>{item.owner_execution_id}</SummaryFact>
              ) : null}
              {item.owner_run_id ? (
                <SummaryFact label="Owner run" copyValue={item.owner_run_id}>{item.owner_run_id}</SummaryFact>
              ) : null}
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Bindings</h4>
            <SummaryFact label="Engine binding">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(item.engine_binding, null, 2)}</pre>
            </SummaryFact>
            <SummaryFact label="Project binding">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(item.project_binding, null, 2)}</pre>
            </SummaryFact>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Lifecycle</h4>
            <SummaryFacts>
              <SummaryFact label="Created">{formatSummaryTimestamp(item.created_at)}</SummaryFact>
              {item.activated_at ? (
                <SummaryFact label="Activated">{formatSummaryTimestamp(item.activated_at)}</SummaryFact>
              ) : null}
              {item.completed_at ? (
                <SummaryFact label="Completed">{formatSummaryTimestamp(item.completed_at)}</SummaryFact>
              ) : null}
              {item.cleaned_at ? (
                <SummaryFact label="Cleaned">{formatSummaryTimestamp(item.cleaned_at)}</SummaryFact>
              ) : null}
              {item.last_failure_summary ? (
                <SummaryFact label="Last failure">{item.last_failure_summary}</SummaryFact>
              ) : null}
              {lastRefreshedAt ? (
                <SummaryFact label="UI refreshed">{formatSummaryTimestamp(lastRefreshedAt)}</SummaryFact>
              ) : null}
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Linked Record Summary</h4>
            <SummaryFacts>
              <SummaryFact label="Executions">{relatedExecutions.length}</SummaryFact>
              <SummaryFact label="Runs">{relatedRuns.length}</SummaryFact>
              <SummaryFact label="Artifacts">{relatedArtifacts.length}</SummaryFact>
              <SummaryFact label="Recent events">{relatedEvents.length}</SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Operator Attention</h4>
            <SummaryFacts>
              <SummaryFact label="Execution attention">
                {attentionExecutionLabel ?? "No linked execution currently stands out."}
              </SummaryFact>
              {attentionExecutionDetail ? (
                <SummaryFact label="Execution detail">{attentionExecutionDetail}</SummaryFact>
              ) : null}
              <SummaryFact label="Artifact attention">
                {attentionArtifactLabel ?? "No linked artifact currently stands out."}
              </SummaryFact>
              {attentionArtifactDetail ? (
                <SummaryFact label="Artifact detail">{attentionArtifactDetail}</SummaryFact>
              ) : null}
              <SummaryFact label="Run attention">
                {attentionRunLabel ?? "No linked run currently stands out."}
              </SummaryFact>
              {attentionRunDetail ? (
                <SummaryFact label="Run detail">{attentionRunDetail}</SummaryFact>
              ) : null}
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Related Executions</h4>
            <SummaryFacts>
              {relatedExecutions.length > 0 ? relatedExecutions.slice(0, 5).map((execution) => (
                <SummaryFact key={execution.id} label={execution.status} copyValue={execution.id}>
                  {execution.tool}
                </SummaryFact>
              )) : (
                <SummaryFact label="Executions">none linked</SummaryFact>
              )}
            </SummaryFacts>
            {onOpenExecution && relatedExecutions[0] ? (
              <button type="button" style={summaryActionButtonStyle} onClick={() => onOpenExecution(relatedExecutions[0].id)}>
                Open first execution
              </button>
            ) : null}
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Related Runs And Artifacts</h4>
            <SummaryFacts>
              <SummaryFact label="Runs">
                {relatedRuns.length > 0 ? relatedRuns.slice(0, 3).map((run) => run.id).join(", ") : "none linked"}
              </SummaryFact>
              <SummaryFact label="Artifacts">
                {relatedArtifacts.length > 0 ? relatedArtifacts.slice(0, 3).map((artifact) => artifact.id).join(", ") : "none linked"}
              </SummaryFact>
            </SummaryFacts>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {onOpenRun && relatedRuns[0] ? (
                <button type="button" style={summaryActionButtonStyle} onClick={() => onOpenRun(relatedRuns[0].id)}>
                  Open first run
                </button>
              ) : null}
              {onOpenArtifact && relatedArtifacts[0] ? (
                <button type="button" style={summaryActionButtonStyle} onClick={() => onOpenArtifact(relatedArtifacts[0].id)}>
                  Open first artifact
                </button>
              ) : null}
            </div>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Recent Events</h4>
            <SummaryFacts>
              {relatedEvents.length > 0 ? relatedEvents.slice(0, 5).map((event) => (
                <SummaryFact key={event.id} label={event.severity}>
                  {event.message}
                </SummaryFact>
              )) : (
                <SummaryFact label="Events">none linked</SummaryFact>
              )}
            </SummaryFacts>
          </article>
        </div>
      ) : null}
    </SummarySection>
  );
}
