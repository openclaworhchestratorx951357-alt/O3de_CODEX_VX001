import type { ExecutionListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import {
  getAuditStatusTone,
  getExecutionModeTone,
  getExecutionStatusTone,
} from "./statusChipTones";
import {
  formatSummaryLabeledText,
  formatSummaryTimestamp,
  summaryCalloutStyle,
} from "./summaryPrimitives";

type ExecutionsPanelProps = {
  items: ExecutionListItem[];
  loading: boolean;
  error: string | null;
};

export default function ExecutionsPanel({
  items,
  loading,
  error,
}: ExecutionsPanelProps) {
  return (
    <SummarySection
      title="Executions"
      description="These are persisted execution records. Execution mode remains explicit, including simulated control-plane runs."
      loading={loading}
      error={error}
      emptyMessage="No executions are recorded yet."
      hasItems={items.length > 0}
    >
      <SummaryList>
        {items.map((item) => {
          const provenanceLabel = getExecutionProvenanceLabel(item);
          return (
            <SummaryListItem key={item.id} card>
              <strong>{item.tool}</strong>
              <SummaryFacts>
                <SummaryFact label="Agent">{item.agent}</SummaryFact>
                <SummaryFact label="Status">
                  <StatusChip label={item.status} tone={getExecutionStatusTone(item.status)} />
                </SummaryFact>
                <SummaryFact label="Execution mode">
                  <StatusChip label={item.execution_mode} tone={getExecutionModeTone(item.execution_mode)} />
                </SummaryFact>
                <SummaryFact label="Run ID">{item.run_id}</SummaryFact>
                <SummaryFact label="Started">{formatSummaryTimestamp(item.started_at)}</SummaryFact>
                {item.finished_at ? (
                  <SummaryFact label="Finished">{formatSummaryTimestamp(item.finished_at)}</SummaryFact>
                ) : null}
                <SummaryFact label="Provenance">
                  <span style={summaryCalloutStyle}>
                    {formatSummaryLabeledText("Provenance", provenanceLabel)}
                  </span>
                </SummaryFact>
                {item.mutation_audit_summary ? (
                  <SummaryFact label="Mutation audit">{item.mutation_audit_summary}</SummaryFact>
                ) : null}
                {item.mutation_audit_status ? (
                  <SummaryFact label="Mutation audit status">
                    <StatusChip label={item.mutation_audit_status} tone={getAuditStatusTone(item.mutation_audit_status)} />
                  </SummaryFact>
                ) : null}
                {item.result_summary ? (
                  <SummaryFact label="Summary">{item.result_summary}</SummaryFact>
                ) : null}
                <SummaryFact label="Warnings">{item.warning_count}</SummaryFact>
                <SummaryFact label="Artifacts">{item.artifact_count}</SummaryFact>
              </SummaryFacts>
            </SummaryListItem>
          );
        })}
      </SummaryList>
    </SummarySection>
  );
}

function getExecutionProvenanceLabel(item: ExecutionListItem): string {
  if (item.execution_mode === "real") {
    if (item.inspection_surface === "build_configure_preflight") {
      return "Real plan-only build.configure preflight";
    }
    if (item.inspection_surface === "settings_patch_mutation") {
      return "Real settings.patch mutation";
    }
    if (item.inspection_surface === "settings_patch_preflight") {
      return "Real dry-run-only settings.patch preflight";
    }
    return "Real read-only project inspection";
  }
  if (item.inspection_surface === "project_manifest") {
    return "Real project manifest provenance recorded";
  }
  if (item.inspection_surface === "build_configure_preflight") {
    return "Real build.configure preflight provenance recorded";
  }
  if (item.inspection_surface === "settings_patch_mutation") {
    return "Real settings.patch mutation provenance recorded";
  }
  if (item.inspection_surface === "settings_patch_preflight") {
    return "Real settings.patch preflight provenance recorded";
  }
  return "Simulated execution record";
}
