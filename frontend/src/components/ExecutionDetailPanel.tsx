import type { ExecutionRecord, ProjectInspectEvidenceDetails } from "../types/contracts";
import ProjectInspectEvidenceSummary from "./ProjectInspectEvidenceSummary";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import {
  formatSummaryTimestamp,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
} from "./summaryPrimitives";

type ExecutionDetailPanelProps = {
  item: ExecutionRecord | null;
  loading: boolean;
  error: string | null;
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
