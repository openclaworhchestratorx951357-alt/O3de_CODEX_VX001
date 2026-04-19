import type { ArtifactRecord, ProjectInspectEvidenceDetails } from "../types/contracts";
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

type ArtifactDetailPanelProps = {
  item: ArtifactRecord | null;
  loading: boolean;
  error: string | null;
  onOpenRun?: (runId: string) => void;
  onOpenExecution?: (executionId: string) => void;
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

export default function ArtifactDetailPanel({
  item,
  loading,
  error,
  onOpenRun,
  onOpenExecution,
  refreshHint,
  lastRefreshedAt,
}: ArtifactDetailPanelProps) {
  const projectInspectDetails = item?.metadata && item.kind === "project_manifest_inspection"
    ? readProjectInspectDetails(item.metadata)
    : null;

  return (
    <SummarySection
      title="Artifact Detail"
      description="This view shows one persisted artifact record with provenance and evidence detail when available."
      loading={loading}
      error={error}
      emptyMessage="Select an artifact to inspect its detail."
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
          <h4 style={summaryCardHeadingStyle}>Artifact</h4>
          <SummaryFacts>
            <SummaryFact label="Artifact ID" copyValue={item?.id ?? undefined}>{item?.id}</SummaryFact>
            <SummaryFact label="Label">{item?.label}</SummaryFact>
            <SummaryFact label="Kind">{item?.kind}</SummaryFact>
            <SummaryFact label="Run ID" copyValue={item?.run_id ?? undefined}>{item?.run_id}</SummaryFact>
            <SummaryFact label="Execution ID" copyValue={item?.execution_id ?? undefined}>{item?.execution_id}</SummaryFact>
          </SummaryFacts>
        </article>
        <article style={summaryCardStyle}>
          <h4 style={summaryCardHeadingStyle}>Location</h4>
          <SummaryFacts>
            <SummaryFact label="URI" copyValue={item?.uri ?? undefined}>{item?.uri}</SummaryFact>
            <SummaryFact label="Path" copyValue={item?.path ?? undefined}>{item?.path ?? "not recorded"}</SummaryFact>
            <SummaryFact label="Content type">{item?.content_type ?? "not recorded"}</SummaryFact>
            <SummaryFact label="Created">
              {item ? formatSummaryTimestamp(item.created_at) : ""}
            </SummaryFact>
          </SummaryFacts>
        </article>
        {item ? (
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Related Records</h4>
            <SummaryFacts>
              <SummaryFact label="Run ID" copyValue={item.run_id}>{item.run_id}</SummaryFact>
              <SummaryFact label="Execution ID" copyValue={item.execution_id}>
                {item.execution_id}
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
            {onOpenExecution ? (
              <button
                type="button"
                style={summaryActionButtonStyle}
                onClick={() => onOpenExecution(item.execution_id)}
              >
                Open related execution detail
              </button>
            ) : null}
          </article>
        ) : null}
      </div>
      {projectInspectDetails ? (
        <ProjectInspectEvidenceSummary
          details={projectInspectDetails}
          title="Artifact Evidence Summary"
        />
      ) : null}
    </SummarySection>
  );
}
