import { useEffect, useRef, useState } from "react";
import type {
  ProjectInspectEvidenceDetails,
  RunRecord,
  SettingsPatchMutationAudit,
} from "../types/contracts";
import { getRunTruthBoundaryDescription } from "../lib/executionTruth";
import ProjectInspectEvidenceSummary from "./ProjectInspectEvidenceSummary";
import RecordLineageStrip from "./RecordLineageStrip";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import TriageSummaryStrip from "./TriageSummaryStrip";
import {
  formatSummaryLabeledText,
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryCalloutStyle,
  summaryHighlightedCardStyle,
  summaryTimestampNoteStyle,
  summaryTopStackStyle,
} from "./summaryPrimitives";

type RunDetailPanelProps = {
  item: RunRecord | null;
  loading: boolean;
  error: string | null;
  executionDetails?: Record<string, unknown> | null;
  relatedExecutionId?: string | null;
  relatedExecutionPriorityLabel?: string | null;
  relatedExecutionPriorityDescription?: string | null;
  relatedExecutionActionLabel?: string | null;
  relatedExecutionActionDescription?: string | null;
  relatedExecutionAttentionLabel?: string | null;
  relatedExecutionAttentionDescription?: string | null;
  selectedRunId?: string | null;
  selectedExecutionId?: string | null;
  onOpenExecution?: (executionId: string) => void;
  refreshHint?: string | null;
  lastRefreshedAt?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

function readMutationAudit(
  details: Record<string, unknown> | null | undefined,
): SettingsPatchMutationAudit | null {
  const value = details?.mutation_audit;
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as SettingsPatchMutationAudit)
    : null;
}

function readProjectInspectDetails(
  details: Record<string, unknown> | null | undefined,
): ProjectInspectEvidenceDetails | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  return details as ProjectInspectEvidenceDetails;
}

export default function RunDetailPanel({
  item,
  loading,
  error,
  executionDetails,
  relatedExecutionId,
  relatedExecutionPriorityLabel,
  relatedExecutionPriorityDescription,
  relatedExecutionActionLabel,
  relatedExecutionActionDescription,
  relatedExecutionAttentionLabel,
  relatedExecutionAttentionDescription,
  selectedRunId,
  selectedExecutionId,
  onOpenExecution,
  refreshHint,
  lastRefreshedAt,
  onRefresh,
  refreshing = false,
}: RunDetailPanelProps) {
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const mutationAudit = readMutationAudit(executionDetails);
  const projectInspectDetails = readProjectInspectDetails(executionDetails);
  const isProjectInspectDetail = item?.tool === "project.inspect" && projectInspectDetails;
  const truthBoundaryRef = useRef<HTMLElement | null>(null);
  const mutationAuditRef = useRef<HTMLElement | null>(null);
  const evidenceSummaryRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!highlightedSection) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setHighlightedSection(null), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [highlightedSection]);
  const handleJump = () => {
    if (isProjectInspectDetail && evidenceSummaryRef.current) {
      setHighlightedSection("evidence");
      evidenceSummaryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (item?.tool === "settings.patch" && mutationAudit && mutationAuditRef.current) {
      setHighlightedSection("mutation-audit");
      mutationAuditRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setHighlightedSection("truth-boundary");
    truthBoundaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const jumpLabel = isProjectInspectDetail
    ? "Jump to evidence"
    : item?.tool === "settings.patch" && mutationAudit
      ? "Jump to mutation audit"
      : "Jump to truth boundary";
  return (
    <SummarySection
      title="Run Detail"
      description="This view shows one persisted run record with explicit execution truth, including simulated runs."
      loading={loading}
      error={error}
      emptyMessage="Select a run to inspect its detail."
      hasItems={Boolean(item)}
      actionHint="Local refresh updates the selected persisted run detail and related execution evidence when available."
      actions={onRefresh && item ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          style={summaryActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh run detail"}
        </button>
      ) : null}
    >
      <div style={summaryTopStackStyle}>
        <RecordLineageStrip
          runId={item?.id ?? null}
          runStatus={item?.status ?? null}
          runSummary={item?.result_summary ?? null}
          executionId={relatedExecutionId}
          executionMode={item?.execution_mode ?? null}
          runUpdatedAt={item?.updated_at ?? null}
          runWarningCount={item?.warnings.length ?? null}
          selectedRunId={selectedRunId}
          selectedExecutionId={selectedExecutionId}
          onOpenExecution={onOpenExecution}
        />
        {refreshHint ? (
          <div style={summaryCalloutStyle}>{refreshHint}</div>
        ) : null}
        {lastRefreshedAt ? (
          <div style={summaryTimestampNoteStyle}>
            Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
          </div>
        ) : null}
        <TriageSummaryStrip
          heading="Operator Triage Summary"
          subjectLabel={relatedExecutionId ? `Related execution ${relatedExecutionId}` : null}
          priorityLabel={relatedExecutionPriorityLabel}
          priorityDescription={relatedExecutionPriorityDescription}
          actionLabel={relatedExecutionActionLabel}
          actionDescription={relatedExecutionActionDescription}
          attentionLabel={relatedExecutionAttentionLabel}
          attentionDescription={relatedExecutionAttentionDescription}
          jumpLabel={jumpLabel}
          onJump={handleJump}
        />
      </div>
      <div style={summaryCardGridStyle}>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Run Identity</h4>
          <SummaryFacts>
            <SummaryFact label="Run ID" copyValue={item?.id ?? undefined}>{item?.id}</SummaryFact>
            <SummaryFact label="Request ID" copyValue={item?.request_id ?? undefined}>{item?.request_id}</SummaryFact>
            <SummaryFact label="Agent">{item?.agent}</SummaryFact>
            <SummaryFact label="Tool">{item?.tool}</SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Run Totals</h4>
          <SummaryFacts>
            <SummaryFact label="Dry run">{String(item?.dry_run)}</SummaryFact>
            <SummaryFact label="Created">
              {item ? formatSummaryTimestamp(item.created_at) : ""}
            </SummaryFact>
            {relatedExecutionId ? (
              <SummaryFact label="Related execution" copyValue={relatedExecutionId}>
                {relatedExecutionId}
              </SummaryFact>
            ) : null}
          </SummaryFacts>
        </article>
        <article
          ref={truthBoundaryRef}
          style={{
            ...summaryCardStyle,
            ...(highlightedSection === "truth-boundary" ? summaryHighlightedCardStyle : {}),
          }}
        >
          <h4 style={summaryCardHeadingStyle}>Truth Boundary</h4>
          <div style={summaryCalloutStyle}>
            {item ? formatSummaryLabeledText("Execution truth", getRunTruthBoundaryDescription(item)) : null}
          </div>
          {item?.result_summary ? (
            <div style={{ marginTop: 8 }}>
              <strong>Summary:</strong> {item.result_summary}
            </div>
          ) : null}
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Locks And Warnings</h4>
          <SummaryFacts>
            <SummaryFact label="Requested locks">
              {item?.requested_locks.join(", ") || "none"}
            </SummaryFact>
            <SummaryFact label="Granted locks">
              {item?.granted_locks.join(", ") || "none"}
            </SummaryFact>
            <SummaryFact label="Warnings">
              {item?.warnings.join(", ") || "none"}
            </SummaryFact>
          </SummaryFacts>
        </article>
        {item?.tool === "settings.patch" && mutationAudit ? (
          <article
            ref={mutationAuditRef}
            style={{
              ...summaryCardStyle,
              ...(highlightedSection === "mutation-audit" ? summaryHighlightedCardStyle : {}),
            }}
          >
            <h4 style={summaryCardHeadingStyle}>Mutation Audit</h4>
            <SummaryFacts>
              <SummaryFact label="Audit summary">{mutationAudit.summary ?? "available"}</SummaryFact>
              <SummaryFact label="Audit phase">{mutationAudit.phase ?? "unknown"}</SummaryFact>
              <SummaryFact label="Audit status">{mutationAudit.status ?? "unknown"}</SummaryFact>
              {typeof mutationAudit.backup_created === "boolean" ? (
                <SummaryFact label="Backup created">{String(mutationAudit.backup_created)}</SummaryFact>
              ) : null}
              {typeof mutationAudit.post_write_verification_succeeded === "boolean" ? (
                <SummaryFact label="Verification succeeded">
                  {String(mutationAudit.post_write_verification_succeeded)}
                </SummaryFact>
              ) : null}
              {mutationAudit.rollback_outcome ? (
                <SummaryFact label="Rollback outcome">{mutationAudit.rollback_outcome}</SummaryFact>
              ) : null}
            </SummaryFacts>
          </article>
        ) : null}
      </div>
      {isProjectInspectDetail ? (
        <div
          ref={evidenceSummaryRef}
          style={highlightedSection === "evidence" ? summaryHighlightedCardStyle : undefined}
        >
          <ProjectInspectEvidenceSummary details={projectInspectDetails} />
        </div>
      ) : null}
    </SummarySection>
  );
}
