import type {
  ArtifactListItem,
  ExecutionRecord,
  ProjectInspectEvidenceDetails,
} from "../types/contracts";
import ProjectInspectEvidenceSummary from "./ProjectInspectEvidenceSummary";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
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
} from "./summaryPrimitives";

type ExecutionDetailPanelProps = {
  item: ExecutionRecord | null;
  loading: boolean;
  error: string | null;
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

  return (
    <SummarySection
      title="Execution Detail"
      description="This view shows one persisted execution record with provenance and evidence detail when available."
      loading={loading}
      error={error}
      emptyMessage="Select an execution to inspect its detail."
      hasItems={Boolean(item)}
    >
      {refreshHint ? (
        <div style={summaryCalloutStyle}>{refreshHint}</div>
      ) : null}
      {lastRefreshedAt ? (
        <div style={summaryTimestampNoteStyle}>
          Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
        </div>
      ) : null}
      <div style={summaryCardGridStyle}>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Execution</h4>
          <SummaryFacts>
            <SummaryFact label="Execution ID" copyValue={item?.id ?? undefined}>{item?.id}</SummaryFact>
            <SummaryFact label="Run ID" copyValue={item?.run_id ?? undefined}>{item?.run_id}</SummaryFact>
            <SummaryFact label="Tool">{item?.tool}</SummaryFact>
            <SummaryFact label="Agent">{item?.agent}</SummaryFact>
            <SummaryFact label="Mode">{item?.execution_mode}</SummaryFact>
            <SummaryFact label="Status">{item?.status}</SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Timing</h4>
          <SummaryFacts>
            <SummaryFact label="Started">
              {item ? formatSummaryTimestamp(item.started_at) : ""}
            </SummaryFact>
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
            {onOpenRun ? (
              <button
                type="button"
                style={summaryActionButtonStyle}
                onClick={() => onOpenRun(item.run_id)}
              >
                Open related run detail
              </button>
            ) : null}
            {onOpenArtifact && item.artifact_ids.length > 0 ? (
              <div style={{ ...summaryCardGridStyle, marginTop: 8 }}>
                {item.artifact_ids.map((artifactId) => {
                  const artifact = relatedArtifacts.find((entry) => entry.id === artifactId);
                  const artifactLabel = artifact?.label ?? "artifact";
                  const artifactKind = artifact?.kind ?? "unknown kind";
                  return (
                    <article key={artifactId} style={summaryCardStyle}>
                      <h5 style={summaryCardHeadingStyle}>{artifactLabel}</h5>
                      <SummaryFacts>
                        <SummaryFact label="Artifact ID" copyValue={artifactId}>
                          {artifactId}
                        </SummaryFact>
                        <SummaryFact label="Kind">{artifactKind}</SummaryFact>
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
