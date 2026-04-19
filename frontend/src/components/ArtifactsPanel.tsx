import type { ArtifactListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import {
  getAuditStatusTone,
  getExecutionModeTone,
} from "./statusChipTones";
import {
  formatSummaryLabeledText,
  formatSummaryTimestamp,
  summaryCalloutStyle,
} from "./summaryPrimitives";

type ArtifactsPanelProps = {
  items: ArtifactListItem[];
  loading: boolean;
  error: string | null;
};

export default function ArtifactsPanel({
  items,
  loading,
  error,
}: ArtifactsPanelProps) {
  return (
    <SummarySection
      title="Artifacts"
      description="These are persisted artifact records. Simulated artifacts stay explicitly labeled as simulated."
      loading={loading}
      error={error}
      emptyMessage="No artifacts are recorded yet."
      hasItems={items.length > 0}
    >
      <SummaryList>
        {items.map((item) => {
          const provenanceLabel = getArtifactProvenanceLabel(item);
          return (
            <SummaryListItem key={item.id} card>
              <strong>{item.label}</strong>
              <SummaryFacts>
                <SummaryFact label="Kind">{item.kind}</SummaryFact>
                <SummaryFact label="Run ID">{item.run_id}</SummaryFact>
                <SummaryFact label="Execution ID">{item.execution_id}</SummaryFact>
                <SummaryFact label="URI">{item.uri}</SummaryFact>
                {item.path ? <SummaryFact label="Path">{item.path}</SummaryFact> : null}
                {item.content_type ? (
                  <SummaryFact label="Content type">{item.content_type}</SummaryFact>
                ) : null}
                <SummaryFact label="Simulated">
                  <StatusChip label={String(item.simulated)} tone={item.simulated ? "warning" : "success"} />
                </SummaryFact>
                {item.execution_mode ? (
                  <SummaryFact label="Execution mode">
                    <StatusChip label={item.execution_mode} tone={getExecutionModeTone(item.execution_mode)} />
                  </SummaryFact>
                ) : null}
                <SummaryFact label="Created">{formatSummaryTimestamp(item.created_at)}</SummaryFact>
                <SummaryFact label="Provenance">
                  <span style={summaryCalloutStyle}>
                    {formatSummaryLabeledText("Provenance", provenanceLabel)}
                  </span>
                </SummaryFact>
                {item.project_name ? (
                  <SummaryFact label="Project name">{item.project_name}</SummaryFact>
                ) : null}
                {item.mutation_audit_summary ? (
                  <SummaryFact label="Mutation audit">{item.mutation_audit_summary}</SummaryFact>
                ) : null}
                {item.mutation_audit_status ? (
                  <SummaryFact label="Mutation audit status">
                    <StatusChip label={item.mutation_audit_status} tone={getAuditStatusTone(item.mutation_audit_status)} />
                  </SummaryFact>
                ) : null}
              </SummaryFacts>
            </SummaryListItem>
          );
        })}
      </SummaryList>
    </SummarySection>
  );
}

function getArtifactProvenanceLabel(item: ArtifactListItem): string {
  if (item.simulated) {
    return "Simulated artifact";
  }
  if (item.inspection_surface === "build_configure_preflight") {
    return "Real build.configure preflight evidence";
  }
  if (item.inspection_surface === "settings_patch_mutation") {
    return "Real settings.patch mutation evidence";
  }
  if (item.inspection_surface === "settings_patch_preflight") {
    return "Real settings.patch preflight evidence";
  }
  if (item.inspection_surface === "project_manifest") {
    return "Real project manifest evidence";
  }
  return "Real artifact";
}
