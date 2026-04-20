import type {
  ArtifactListItem,
  ExecutionRecord,
  ProjectInspectEvidenceDetails,
} from "../types/contracts";
import {
  compareArtifactPriority,
  describeArtifactAttention,
  describeArtifactPriority,
  getPreferredArtifact,
  recommendArtifactAction,
} from "../lib/recordPriority";
import ProjectInspectEvidenceSummary from "./ProjectInspectEvidenceSummary";
import RecordLineageStrip from "./RecordLineageStrip";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import TriageSummaryStrip from "./TriageSummaryStrip";
import {
  getAuditStatusTone,
  getExecutionModeTone,
} from "./statusChipTones";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryCalloutStyle,
  summaryTimestampNoteStyle,
  summaryTopStackStyle,
} from "./summaryPrimitives";

type ExecutionDetailPanelProps = {
  item: ExecutionRecord | null;
  loading: boolean;
  error: string | null;
  selectedRunId?: string | null;
  selectedExecutionId?: string | null;
  selectedArtifactId?: string | null;
  relatedArtifacts?: ArtifactListItem[];
  onOpenRun?: (runId: string) => void;
  onOpenArtifact?: (artifactId: string) => void;
  refreshHint?: string | null;
  lastRefreshedAt?: string | null;
};

function readProjectInspectDetails(
  details: Record<string, unknown> | ProjectInspectEvidenceDetails | null | undefined,
): ProjectInspectEvidenceDetails | null {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  return details as ProjectInspectEvidenceDetails;
}

export default function ExecutionDetailPanel({
  item,
  loading,
  error,
  selectedRunId,
  selectedExecutionId,
  selectedArtifactId,
  relatedArtifacts = [],
  onOpenRun,
  onOpenArtifact,
  refreshHint,
  lastRefreshedAt,
}: ExecutionDetailPanelProps) {
  const projectInspectDetails = item?.tool === "project.inspect"
    ? readProjectInspectDetails(item.details)
    : null;
  const prioritizedArtifacts = [...relatedArtifacts].sort((left, right) => {
    if (selectedArtifactId) {
      if (left.id === selectedArtifactId && right.id !== selectedArtifactId) {
        return -1;
      }
      if (right.id === selectedArtifactId && left.id !== selectedArtifactId) {
        return 1;
      }
    }
    return compareArtifactPriority(left, right);
  });
  const preferredArtifact = getPreferredArtifact(relatedArtifacts);
  const lineageArtifact = selectedArtifactId
    ? relatedArtifacts.find((artifact) => artifact.id === selectedArtifactId) ?? null
    : preferredArtifact;
  const lineageArtifactId = lineageArtifact?.id ?? item?.artifact_ids[0] ?? null;
  const lineageArtifactPriority = lineageArtifact
    ? describeArtifactPriority(lineageArtifact, relatedArtifacts, selectedArtifactId)
    : null;
  const lineageArtifactAction = lineageArtifact
    ? recommendArtifactAction(lineageArtifact, selectedArtifactId)
    : null;
  const lineageArtifactAttention = lineageArtifact
    ? describeArtifactAttention(lineageArtifact, selectedArtifactId)
    : null;

  return (
    <SummarySection
      title="Execution Detail"
      description="This view shows one persisted execution record with provenance and evidence detail when available."
      loading={loading}
      error={error}
      emptyMessage="Select an execution to inspect its detail."
      hasItems={Boolean(item)}
    >
      <div style={summaryTopStackStyle}>
        <RecordLineageStrip
          runId={item?.run_id ?? null}
          executionId={item?.id ?? null}
          executionStatus={item?.status ?? null}
          executionSummary={item?.result_summary ?? null}
          artifactId={lineageArtifactId}
          artifactLabel={lineageArtifact?.label ?? null}
          artifactKind={lineageArtifact?.kind ?? null}
          artifactMode={lineageArtifact?.execution_mode ?? null}
          artifactSimulated={lineageArtifact?.simulated ?? null}
          executionMode={item?.execution_mode ?? null}
          executionStartedAt={item?.started_at ?? null}
          executionWarningCount={item?.warnings.length ?? null}
          artifactCreatedAt={lineageArtifact?.created_at ?? null}
          artifactAuditStatus={lineageArtifact?.mutation_audit_status ?? null}
          selectedRunId={selectedRunId}
          selectedExecutionId={selectedExecutionId}
          selectedArtifactId={selectedArtifactId}
          onOpenRun={onOpenRun}
          onOpenArtifact={onOpenArtifact}
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
          subjectLabel={lineageArtifactId ? `Prioritized artifact ${lineageArtifactId}` : null}
          priorityLabel={lineageArtifactPriority?.label ?? null}
          priorityDescription={lineageArtifactPriority?.description ?? null}
          actionLabel={lineageArtifactAction?.label ?? null}
          actionDescription={lineageArtifactAction?.description ?? null}
          attentionLabel={lineageArtifactAttention?.label ?? null}
          attentionDescription={lineageArtifactAttention?.description ?? null}
        />
      </div>
      <div style={summaryCardGridStyle}>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Execution Identity</h4>
          <SummaryFacts>
            <SummaryFact label="Execution ID" copyValue={item?.id ?? undefined}>{item?.id}</SummaryFact>
            <SummaryFact label="Run ID" copyValue={item?.run_id ?? undefined}>{item?.run_id}</SummaryFact>
            <SummaryFact label="Tool">{item?.tool}</SummaryFact>
            <SummaryFact label="Agent">{item?.agent}</SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Execution Totals</h4>
          <SummaryFacts>
            <SummaryFact label="Finished">
              {item?.finished_at ? formatSummaryTimestamp(item.finished_at) : "not finished"}
            </SummaryFact>
            <SummaryFact label="Artifacts">{item?.artifact_ids.length ?? 0}</SummaryFact>
            <SummaryFact label="Warnings">{item?.warnings.length ?? 0}</SummaryFact>
          </SummaryFacts>
        </article>
        {item ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Related Records</h4>
            <SummaryFacts>
              <SummaryFact label="Run ID" copyValue={item.run_id}>{item.run_id}</SummaryFact>
              <SummaryFact label="Artifact IDs">
                {item.artifact_ids.length > 0 ? item.artifact_ids.join(", ") : "none"}
              </SummaryFact>
              <SummaryFact label="Artifact records">
                {relatedArtifacts.length}
              </SummaryFact>
            </SummaryFacts>
            {onOpenArtifact && item.artifact_ids.length > 0 ? (
              <div style={{ ...summaryCardGridStyle, marginTop: 8 }}>
                {prioritizedArtifacts.map((artifact) => {
                  const artifactId = artifact.id;
                  const artifactLabel = artifact?.label ?? "artifact";
                  const artifactKind = artifact?.kind ?? "unknown kind";
                  return (
                    <article key={artifactId} style={summaryCardStyle}>
                      <h5 style={summaryCardHeadingStyle}>{artifactLabel}</h5>
                      <div style={summaryCalloutStyle}>{artifactKind}</div>
                      <SummaryFacts>
                        <SummaryFact label="Artifact ID" copyValue={artifactId}>
                          {artifactId}
                        </SummaryFact>
                        <SummaryFact label="Created">
                          {artifact?.created_at
                            ? formatSummaryTimestamp(artifact.created_at)
                            : "not recorded"}
                        </SummaryFact>
                        <SummaryFact label="Execution mode">
                          <StatusChip
                            label={artifact?.execution_mode ?? "unknown"}
                            tone={getExecutionModeTone(artifact?.execution_mode ?? "unknown")}
                          />
                        </SummaryFact>
                        <SummaryFact label="Simulated">
                          <StatusChip
                            label={String(artifact?.simulated ?? false)}
                            tone={artifact?.simulated ? "warning" : "success"}
                          />
                        </SummaryFact>
                        {artifact?.mutation_audit_status ? (
                          <SummaryFact label="Mutation audit">
                            <StatusChip
                              label={artifact.mutation_audit_status}
                              tone={getAuditStatusTone(artifact.mutation_audit_status)}
                            />
                          </SummaryFact>
                        ) : null}
                      </SummaryFacts>
                      <button
                        type="button"
                        style={summaryActionButtonStyle}
                        onClick={() => onOpenArtifact(artifactId)}
                      >
                        {selectedArtifactId === artifactId
                          ? "Artifact detail selected"
                          : "Open artifact detail"}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
      {projectInspectDetails ? (
        <ProjectInspectEvidenceSummary
          details={projectInspectDetails}
          title="Execution Evidence Summary"
        />
      ) : null}
    </SummarySection>
  );
}
