import type {
  ArtifactListItem,
  EventListItem,
  ExecutionListItem,
  ExecutorRecord,
  RunListItem,
  WorkspaceRecord,
} from "../types/contracts";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
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

const executorDetailGuide = getPanelGuide("executor-detail");
const executorDetailRefreshControlGuide = getPanelControlGuide("executor-detail", "refresh");
const executorDetailSavedContextControlGuide = getPanelControlGuide("executor-detail", "saved-context");
const executorDetailLocalReviewActionsControlGuide = getPanelControlGuide("executor-detail", "local-review-actions");
const executorDetailRelatedRecordOpenControlGuide = getPanelControlGuide("executor-detail", "related-record-open");

type ExecutorDetailPanelProps = {
  item: ExecutorRecord | null;
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
  relatedWorkspaces?: WorkspaceRecord[];
  relatedExecutions?: ExecutionListItem[];
  relatedRuns?: RunListItem[];
  relatedArtifacts?: ArtifactListItem[];
  relatedEvents?: EventListItem[];
  onOpenWorkspace?: (workspaceId: string) => void;
  onOpenExecution?: (executionId: string) => void;
  onOpenRun?: (runId: string) => void;
  onOpenArtifact?: (artifactId: string) => void;
  lastRefreshedAt?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

export default function ExecutorDetailPanel({
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
  relatedWorkspaces = [],
  relatedExecutions = [],
  relatedRuns = [],
  relatedArtifacts = [],
  relatedEvents = [],
  onOpenWorkspace,
  onOpenExecution,
  onOpenRun,
  onOpenArtifact,
  lastRefreshedAt,
  onRefresh,
  refreshing = false,
}: ExecutorDetailPanelProps) {
  return (
    <SummarySection
      title="Executor Detail"
      description="Executor detail is persisted substrate bookkeeping only. It reflects executor inventory, runner-family support, and health-like metadata, not proof of broader real O3DE adapter admission."
      guideTooltip={executorDetailGuide.tooltip}
      guideChecklist={executorDetailGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage="Select an executor to inspect its persisted substrate record."
      hasItems={Boolean(item)}
      actions={onRefresh ? (
        <button
          type="button"
          title={executorDetailRefreshControlGuide.tooltip}
          onClick={onRefresh}
          disabled={refreshing}
          style={summaryActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh executor detail"}
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
                {localContextFocusLabel ?? "No local executor context saved in this browser session."}
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
                  Local saved executor context no longer matches currently persisted records in this slice.
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
                <button
                  type="button"
                  title={executorDetailSavedContextControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={onOpenSavedContext}
                >
                  Open saved context
                </button>
              ) : null}
              {onMarkLocalReviewed ? (
                <button
                  type="button"
                  title={executorDetailLocalReviewActionsControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={onMarkLocalReviewed}
                >
                  Mark reviewed
                </button>
              ) : null}
              {onSnoozeLocalReview ? (
                <button
                  type="button"
                  title={executorDetailLocalReviewActionsControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={onSnoozeLocalReview}
                >
                  Snooze
                </button>
              ) : null}
              {localReviewDisposition !== "in_queue" && onKeepLocalInQueue ? (
                <button
                  type="button"
                  title={executorDetailLocalReviewActionsControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={onKeepLocalInQueue}
                >
                  Return to queue
                </button>
              ) : null}
            </div>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Executor Identity</h4>
            <SummaryFacts>
              <SummaryFact label="Executor ID" copyValue={item.id}>{item.id}</SummaryFact>
              <SummaryFact label="Label">{item.executor_label}</SummaryFact>
              <SummaryFact label="Kind">{item.executor_kind}</SummaryFact>
              <SummaryFact label="Host">{item.executor_host_label}</SummaryFact>
              <SummaryFact label="Mode class">
                <StatusChip label={item.execution_mode_class} tone={item.execution_mode_class === "simulated" ? "warning" : "info"} />
              </SummaryFact>
              <SummaryFact label="Availability">
                <StatusChip label={item.availability_state} tone={item.availability_state === "available" ? "success" : "warning"} />
              </SummaryFact>
              <SummaryFact label="Runner families">
                {item.supported_runner_families.length > 0 ? item.supported_runner_families.join(", ") : "none"}
              </SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Lifecycle</h4>
            <SummaryFacts>
              {item.last_heartbeat_at ? (
                <SummaryFact label="Last heartbeat">{formatSummaryTimestamp(item.last_heartbeat_at)}</SummaryFact>
              ) : null}
              {item.last_failure_summary ? (
                <SummaryFact label="Last failure">{item.last_failure_summary}</SummaryFact>
              ) : null}
              <SummaryFact label="Created">{formatSummaryTimestamp(item.created_at)}</SummaryFact>
              <SummaryFact label="Updated">
                {formatSummaryTimestamp(item.updated_at)}
                {lastRefreshedAt ? ` | UI refreshed ${formatSummaryTimestamp(lastRefreshedAt)}` : ""}
              </SummaryFact>
            </SummaryFacts>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Linked Record Summary</h4>
            <SummaryFacts>
              <SummaryFact label="Workspaces">{relatedWorkspaces.length}</SummaryFact>
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
            <h4 style={summaryCardHeadingStyle}>Capability Snapshot</h4>
            <SummaryFact label="Snapshot">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(item.capability_snapshot, null, 2)}</pre>
            </SummaryFact>
          </article>
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Related Workspaces</h4>
            <SummaryFacts>
              {relatedWorkspaces.length > 0 ? relatedWorkspaces.map((workspace) => (
                <SummaryFact key={workspace.id} label={workspace.workspace_state} copyValue={workspace.id}>
                  {workspace.workspace_root}
                </SummaryFact>
              )) : (
                <SummaryFact label="Workspaces">none linked</SummaryFact>
              )}
            </SummaryFacts>
            {onOpenWorkspace && relatedWorkspaces[0] ? (
              <button
                type="button"
                title={executorDetailRelatedRecordOpenControlGuide.tooltip}
                style={summaryActionButtonStyle}
                onClick={() => onOpenWorkspace(relatedWorkspaces[0].id)}
              >
                Open first workspace
              </button>
            ) : null}
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
              <button
                type="button"
                title={executorDetailRelatedRecordOpenControlGuide.tooltip}
                style={summaryActionButtonStyle}
                onClick={() => onOpenExecution(relatedExecutions[0].id)}
              >
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
                <button
                  type="button"
                  title={executorDetailRelatedRecordOpenControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={() => onOpenRun(relatedRuns[0].id)}
                >
                  Open first run
                </button>
              ) : null}
              {onOpenArtifact && relatedArtifacts[0] ? (
                <button
                  type="button"
                  title={executorDetailRelatedRecordOpenControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={() => onOpenArtifact(relatedArtifacts[0].id)}
                >
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
