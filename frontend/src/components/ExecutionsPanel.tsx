import type { ExecutionListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryList, SummaryListItem } from "./SummaryList";
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
              <div>Agent: {item.agent}</div>
              <div>Status: {item.status}</div>
              <div>Execution mode: {item.execution_mode}</div>
              <div>Run ID: {item.run_id}</div>
              <div>Started: {formatSummaryTimestamp(item.started_at)}</div>
              {item.finished_at ? (
                <div>Finished: {formatSummaryTimestamp(item.finished_at)}</div>
              ) : null}
              <div style={summaryCalloutStyle}>
                {formatSummaryLabeledText("Provenance", provenanceLabel)}
              </div>
              {item.mutation_audit_summary ? (
                <div>Mutation audit: {item.mutation_audit_summary}</div>
              ) : null}
              {item.mutation_audit_status ? (
                <div>Mutation audit status: {item.mutation_audit_status}</div>
              ) : null}
              {item.result_summary ? <div>Summary: {item.result_summary}</div> : null}
              <div>Warnings: {item.warning_count}</div>
              <div>Artifacts: {item.artifact_count}</div>
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
