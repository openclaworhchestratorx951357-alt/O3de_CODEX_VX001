import type { CSSProperties } from "react";

import {
  getEditorRestoreBoundaryLimitLabel,
  getEditorRestoreBoundaryStatusLabel,
  readEditorRestoreBoundaryEvidence,
  type EditorRestoreBoundaryEvidence,
} from "../lib/executionTruth";
import StatusChip, { type StatusChipTone } from "./StatusChip";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import {
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryCalloutStyle,
} from "./summaryPrimitives";

type EditorRestoreBoundarySummaryProps = {
  details: object | null | undefined;
  title?: string;
};

function restoreTone(evidence: EditorRestoreBoundaryEvidence): StatusChipTone {
  if (evidence.restore_invoked === true && evidence.restore_succeeded === true) {
    return "success";
  }
  if (evidence.restore_invoked === true) {
    return "danger";
  }
  if (evidence.restore_boundary_available === true) {
    return "warning";
  }
  return "neutral";
}

function formatBoolean(value: boolean | null | undefined): string {
  if (typeof value !== "boolean") {
    return "not recorded";
  }
  return value ? "true" : "false";
}

export default function EditorRestoreBoundarySummary({
  details,
  title = "Editor Restore Boundary",
}: EditorRestoreBoundarySummaryProps) {
  const evidence = readEditorRestoreBoundaryEvidence(details);
  if (!evidence) {
    return null;
  }

  const statusLabel = getEditorRestoreBoundaryStatusLabel(evidence);
  const limitLabel = getEditorRestoreBoundaryLimitLabel(evidence);

  return (
    <article style={summaryCardStyle}>
      <h4 style={summaryCardHeadingStyle}>{title}</h4>
      <div style={summaryCalloutStyle}>{limitLabel}</div>
      <div style={restoreSummaryFactsStyle}>
        <SummaryFacts>
          <SummaryFact label="Restore status">
            <StatusChip label={statusLabel} tone={restoreTone(evidence)} />
          </SummaryFact>
          <SummaryFact
            label="Boundary ID"
            copyValue={evidence.restore_boundary_id}
          >
            {evidence.restore_boundary_id}
          </SummaryFact>
          <SummaryFact label="Scope">
            {evidence.restore_boundary_scope ?? "not recorded"}
          </SummaryFact>
          <SummaryFact label="Strategy">
            {evidence.restore_strategy ?? "not recorded"}
          </SummaryFact>
          <SummaryFact
            label="Source prefab"
            copyValue={evidence.restore_boundary_source_path ?? undefined}
          >
            {evidence.restore_boundary_source_path ?? "not recorded"}
          </SummaryFact>
          <SummaryFact
            label="Backup path"
            copyValue={evidence.restore_boundary_backup_path ?? undefined}
          >
            {evidence.restore_boundary_backup_path ?? "not recorded"}
          </SummaryFact>
          <SummaryFact
            label="Backup SHA"
            copyValue={evidence.restore_boundary_backup_sha256 ?? undefined}
          >
            {evidence.restore_boundary_backup_sha256 ?? "not recorded"}
          </SummaryFact>
          <SummaryFact
            label="Restored SHA"
            copyValue={evidence.restore_restored_sha256 ?? undefined}
          >
            {evidence.restore_restored_sha256 ?? "not recorded"}
          </SummaryFact>
          <SummaryFact label="Restore result">
            {evidence.restore_result ?? "not recorded"}
          </SummaryFact>
          <SummaryFact label="Trigger">
            {evidence.restore_trigger ?? "not recorded"}
          </SummaryFact>
          <SummaryFact label="Invoked">
            {formatBoolean(evidence.restore_invoked)}
          </SummaryFact>
          <SummaryFact label="Hash verified">
            {formatBoolean(evidence.restore_verification_succeeded)}
          </SummaryFact>
        </SummaryFacts>
      </div>
    </article>
  );
}

const restoreSummaryFactsStyle = {
  marginTop: 10,
} satisfies CSSProperties;
