import type { ArtifactListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
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
              <div>Kind: {item.kind}</div>
              <div>Run ID: {item.run_id}</div>
              <div>Execution ID: {item.execution_id}</div>
              <div>URI: {item.uri}</div>
              {item.path ? <div>Path: {item.path}</div> : null}
              {item.content_type ? <div>Content type: {item.content_type}</div> : null}
              <div>
                Simulated: <StatusChip label={String(item.simulated)} tone={item.simulated ? "warning" : "success"} />
              </div>
              {item.execution_mode ? (
                <div>
                  Execution mode: <StatusChip label={item.execution_mode} tone={getExecutionModeTone(item.execution_mode)} />
                </div>
              ) : null}
              <div>Created: {formatSummaryTimestamp(item.created_at)}</div>
              <div style={summaryCalloutStyle}>
                {formatSummaryLabeledText("Provenance", provenanceLabel)}
              </div>
              {item.project_name ? <div>Project name: {item.project_name}</div> : null}
              {item.mutation_audit_summary ? (
                <div>Mutation audit: {item.mutation_audit_summary}</div>
              ) : null}
              {item.mutation_audit_status ? (
                <div>
                  Mutation audit status:{" "}
                  <StatusChip label={item.mutation_audit_status} tone={getAuditStatusTone(item.mutation_audit_status)} />
                </div>
              ) : null}
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
