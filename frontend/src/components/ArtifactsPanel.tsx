import { useMemo, useState } from "react";

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
  summaryControlRowStyle,
  summaryFocusBadgeStyle,
  summaryInlineActionButtonStyle,
  summaryRefreshBadgeStyle,
  summarySearchInputStyle,
  summaryTimestampNoteStyle,
} from "./summaryPrimitives";

type ArtifactsPanelProps = {
  items: ArtifactListItem[];
  loading: boolean;
  error: string | null;
  searchPreset?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
  lastRefreshedAt?: string | null;
  updateBadgeLabel?: string | null;
};

export default function ArtifactsPanel({
  items,
  loading,
  error,
  searchPreset,
  focusLabel,
  onClearFocus,
  lastRefreshedAt,
  updateBadgeLabel,
}: ArtifactsPanelProps) {
  const [searchValue, setSearchValue] = useState(searchPreset ?? "");
  const normalizedQuery = searchValue.trim().toLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => matchesArtifactSearch(item, normalizedQuery)),
    [items, normalizedQuery],
  );

  return (
    <SummarySection
      title="Artifacts"
      description="These are persisted artifact records. Simulated artifacts stay explicitly labeled as simulated."
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No artifacts match the current search." : "No artifacts are recorded yet."}
      hasItems={filteredItems.length > 0}
    >
      <div style={summaryControlRowStyle}>
        {focusLabel ? (
          <span style={summaryFocusBadgeStyle}>
            focused from overview: {focusLabel}
            {onClearFocus ? (
              <button
                type="button"
                style={summaryInlineActionButtonStyle}
                onClick={onClearFocus}
              >
                Clear
              </button>
            ) : null}
          </span>
        ) : null}
        {updateBadgeLabel ? (
          <span style={summaryRefreshBadgeStyle}>{updateBadgeLabel}</span>
        ) : null}
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search artifacts by label, kind, ID, path, URI, or project"
          style={summarySearchInputStyle}
        />
      </div>
      {lastRefreshedAt ? (
        <div style={summaryTimestampNoteStyle}>
          Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
        </div>
      ) : null}
      <SummaryList>
        {filteredItems.map((item) => {
          const provenanceLabel = getArtifactProvenanceLabel(item);
          return (
            <SummaryListItem key={item.id} card>
              <strong>{item.label}</strong>
              <SummaryFacts>
                <SummaryFact label="Kind">{item.kind}</SummaryFact>
                <SummaryFact label="Run ID" copyValue={item.run_id}>{item.run_id}</SummaryFact>
                <SummaryFact label="Execution ID" copyValue={item.execution_id}>{item.execution_id}</SummaryFact>
                <SummaryFact label="URI" copyValue={item.uri}>{item.uri}</SummaryFact>
                {item.path ? <SummaryFact label="Path" copyValue={item.path}>{item.path}</SummaryFact> : null}
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

function matchesArtifactSearch(item: ArtifactListItem, query: string): boolean {
  if (!query) {
    return true;
  }

  return [
    item.id,
    item.label,
    item.kind,
    item.run_id,
    item.execution_id,
    item.uri,
    item.path ?? "",
    item.content_type ?? "",
    item.execution_mode ?? "",
    item.project_name ?? "",
    item.mutation_audit_summary ?? "",
    item.mutation_audit_status ?? "",
  ].some((value) => value.toLowerCase().includes(query));
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
