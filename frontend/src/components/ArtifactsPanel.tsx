import { useMemo, useState } from "react";

import type { ArtifactListItem } from "../types/contracts";
import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import {
  getArtifactProvenanceLabel,
  getFallbackCategoryLabel,
  getManifestSourceOfTruthLabel,
} from "../lib/executionTruth";
import { describeArtifactAttention } from "../lib/recordPriority";
import OperatorStatusRail from "./OperatorStatusRail";
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

const artifactsPanelGuide = getPanelGuide("artifacts-panel");
const artifactsPanelRefreshControlGuide = getPanelControlGuide("artifacts-panel", "refresh");
const artifactsPanelSearchControlGuide = getPanelControlGuide("artifacts-panel", "search");
const artifactsPanelSelectDetailControlGuide = getPanelControlGuide("artifacts-panel", "select-detail");

type ArtifactsPanelProps = {
  items: ArtifactListItem[];
  loading: boolean;
  error: string | null;
  selectedArtifactId?: string | null;
  onSelectArtifact?: (artifactId: string) => void;
  searchPreset?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
  lastRefreshedAt?: string | null;
  updateBadgeLabel?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

export default function ArtifactsPanel({
  items,
  loading,
  error,
  selectedArtifactId,
  onSelectArtifact,
  searchPreset,
  focusLabel,
  onClearFocus,
  lastRefreshedAt,
  updateBadgeLabel,
  onRefresh,
  refreshing = false,
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
      guideTooltip={artifactsPanelGuide.tooltip}
      guideChecklist={artifactsPanelGuide.checklist}
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No artifacts match the current search." : "No artifacts are recorded yet."}
      hasItems={filteredItems.length > 0}
      emptyGuideTitle={normalizedQuery ? "Widen the artifact search" : "Create artifact evidence first"}
      emptyGuideDescription={normalizedQuery
        ? "The current search hides all artifact records. Artifacts are easiest to find by label, run ID, execution ID, path, or evidence role."
        : "Artifacts appear after backend work writes durable request, response, proof, or metadata records."}
      emptyGuideSteps={normalizedQuery ? [
        "Clear the search or search by run ID, execution ID, path, or artifact role.",
        "Open the matching Run or Execution if you need the broader lineage first.",
        "Refresh artifacts after new backend work completes.",
      ] : [
        "Run a prompt or typed dispatch that produces persisted evidence.",
        "Open Records after the run completes or fails.",
        "Use artifacts to verify exact payloads, paths, and retained evidence.",
      ]}
      emptyGuideExampleTitle={normalizedQuery ? "Search examples" : "Example artifact source"}
      emptyGuideExample={normalizedQuery
        ? "Try request, response, proof, McpSandbox, or the first few characters of an execution ID."
        : "The repo-owned live editor authoring proof writes a JSON evidence bundle and linked backend artifacts."}
      renderChildrenWhenEmpty
      actionHint="Local refresh updates persisted artifact records and preserves selected artifact detail when available."
      actions={onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          title={artifactsPanelRefreshControlGuide.tooltip}
          disabled={refreshing}
          style={summaryInlineActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh artifacts"}
        </button>
      ) : null}
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
          title={artifactsPanelSearchControlGuide.tooltip}
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
          const attentionLabel = describeArtifactAttention(item).label;
          return (
            <SummaryListItem key={item.id} card>
              <strong>{item.label}</strong>
              <SummaryFacts>
                <SummaryFact label="Kind">{item.kind}</SummaryFact>
                <SummaryFact label="Operator status">
                  <OperatorStatusRail
                    executionMode={item.execution_mode ?? null}
                    simulated={item.simulated}
                    auditStatus={item.mutation_audit_status ?? null}
                    attentionLabel={attentionLabel}
                  />
                </SummaryFact>
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
                <SummaryFact label="Fallback category">
                  {getFallbackCategoryLabel(item)}
                </SummaryFact>
                <SummaryFact label="Manifest source of truth">
                  {getManifestSourceOfTruthLabel(item)}
                </SummaryFact>
                {item.artifact_role ? (
                  <SummaryFact label="Artifact role">{item.artifact_role}</SummaryFact>
                ) : null}
                {item.evidence_completeness ? (
                  <SummaryFact label="Evidence completeness">
                    <StatusChip
                      label={item.evidence_completeness}
                      tone={getEvidenceCompletenessTone(item.evidence_completeness)}
                    />
                  </SummaryFact>
                ) : null}
                {item.retention_class ? (
                  <SummaryFact label="Retention class">{item.retention_class}</SummaryFact>
                ) : null}
                {item.executor_id ? (
                  <SummaryFact label="Executor ID" copyValue={item.executor_id}>
                    {item.executor_id}
                  </SummaryFact>
                ) : null}
                {item.workspace_id ? (
                  <SummaryFact label="Workspace ID" copyValue={item.workspace_id}>
                    {item.workspace_id}
                  </SummaryFact>
                ) : null}
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
                {onSelectArtifact ? (
                  <SummaryFact label="Detail">
                    <button
                      type="button"
                      title={artifactsPanelSelectDetailControlGuide.tooltip}
                      style={summaryInlineActionButtonStyle}
                      onClick={() => onSelectArtifact(item.id)}
                    >
                      {selectedArtifactId === item.id ? "Selected" : "View detail"}
                    </button>
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
    item.fallback_category ?? "",
    item.project_manifest_source_of_truth ?? "",
    item.project_name ?? "",
    item.artifact_role ?? "",
    item.executor_id ?? "",
    item.workspace_id ?? "",
    item.retention_class ?? "",
    item.evidence_completeness ?? "",
    item.mutation_audit_summary ?? "",
    item.mutation_audit_status ?? "",
  ].some((value) => value.toLowerCase().includes(query));
}

function getEvidenceCompletenessTone(
  value: string,
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (value === "complete") {
    return "success";
  }
  if (value === "partial") {
    return "warning";
  }
  if (value === "missing" || value === "failed") {
    return "danger";
  }
  return "neutral";
}
