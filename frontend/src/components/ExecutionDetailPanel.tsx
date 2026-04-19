import type { ExecutionRecord, ProjectInspectEvidenceDetails } from "../types/contracts";
import ProjectInspectEvidenceSummary from "./ProjectInspectEvidenceSummary";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
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
              <button
                type="button"
                style={summaryActionButtonStyle}
                onClick={() => onOpenArtifact(item.artifact_ids[0])}
              >
                Open first related artifact detail
              </button>
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
