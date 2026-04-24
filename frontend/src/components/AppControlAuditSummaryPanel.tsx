import type { AppControlEventSummary } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryActionRowStyle,
  summaryCalloutStyle,
} from "./summaryPrimitives";

type AppControlAuditSummaryPanelProps = {
  summary: AppControlEventSummary;
  onOpenLatest?: (() => void) | null;
  onOpenApplied?: (() => void) | null;
  onOpenReverted?: (() => void) | null;
  onOpenVerifiedOnly?: (() => void) | null;
  onOpenAssumedPresent?: (() => void) | null;
  onSaveAppliedView?: (() => void) | null;
  onSaveRevertedView?: (() => void) | null;
  onSaveVerifiedOnlyView?: (() => void) | null;
  onSaveAssumedPresentView?: (() => void) | null;
  savedViewFeedback?: {
    label: string;
    detail: string;
    onOpenSavedView?: (() => void) | null;
  } | null;
};

export default function AppControlAuditSummaryPanel({
  summary,
  onOpenLatest = null,
  onOpenApplied = null,
  onOpenReverted = null,
  onOpenVerifiedOnly = null,
  onOpenAssumedPresent = null,
  onSaveAppliedView = null,
  onSaveRevertedView = null,
  onSaveVerifiedOnlyView = null,
  onSaveAssumedPresentView = null,
  savedViewFeedback = null,
}: AppControlAuditSummaryPanelProps) {
  const latestMode = summary.latest_event_type ?? "unknown";

  return (
    <SummarySection
      title="App OS Audit Summary"
      description="This card summarizes persisted App OS apply and revert receipts recorded in the event lane."
      loading={false}
      error={null}
      emptyMessage="No persisted App OS audit receipts are recorded yet."
      hasItems={summary.total_events > 0}
      actionHint="Use this summary to reopen the newest persisted receipt without searching the full timeline."
      actions={summary.latest_event_id && onOpenLatest ? (
        <button
          type="button"
          onClick={onOpenLatest}
          style={summaryActionButtonStyle}
        >
          Open latest receipt
        </button>
      ) : null}
      renderChildrenWhenEmpty
      marginTop={0}
    >
      <SummaryFacts>
        <SummaryFact label="Applied receipts">
          <div style={summaryMetricActionGroupStyle}>
            {onOpenApplied && summary.applied_events > 0 ? (
              <button type="button" onClick={onOpenApplied} style={summaryActionButtonStyle}>
                {summary.applied_events}
              </button>
            ) : String(summary.applied_events)}
            {onSaveAppliedView && summary.applied_events > 0 ? (
              <button type="button" onClick={onSaveAppliedView} style={summaryActionButtonStyle}>
                Save applied view
              </button>
            ) : null}
          </div>
        </SummaryFact>
        <SummaryFact label="Reverted receipts">
          <div style={summaryMetricActionGroupStyle}>
            {onOpenReverted && summary.reverted_events > 0 ? (
              <button type="button" onClick={onOpenReverted} style={summaryActionButtonStyle}>
                {summary.reverted_events}
              </button>
            ) : String(summary.reverted_events)}
            {onSaveRevertedView && summary.reverted_events > 0 ? (
              <button type="button" onClick={onSaveRevertedView} style={summaryActionButtonStyle}>
                Save reverted view
              </button>
            ) : null}
          </div>
        </SummaryFact>
        <SummaryFact label="Verified-only receipts">
          <div style={summaryMetricActionGroupStyle}>
            {onOpenVerifiedOnly && summary.verified_only_events > 0 ? (
              <button type="button" onClick={onOpenVerifiedOnly} style={summaryActionButtonStyle}>
                {summary.verified_only_events}
              </button>
            ) : String(summary.verified_only_events)}
            {onSaveVerifiedOnlyView && summary.verified_only_events > 0 ? (
              <button type="button" onClick={onSaveVerifiedOnlyView} style={summaryActionButtonStyle}>
                Save verified-only view
              </button>
            ) : null}
          </div>
        </SummaryFact>
        <SummaryFact label="Receipts with assumed results">
          <div style={summaryMetricActionGroupStyle}>
            {onOpenAssumedPresent && summary.assumed_present_events > 0 ? (
              <button type="button" onClick={onOpenAssumedPresent} style={summaryActionButtonStyle}>
                {summary.assumed_present_events}
              </button>
            ) : String(summary.assumed_present_events)}
            {onSaveAssumedPresentView && summary.assumed_present_events > 0 ? (
              <button type="button" onClick={onSaveAssumedPresentView} style={summaryActionButtonStyle}>
                Save assumed-results view
              </button>
            ) : null}
          </div>
        </SummaryFact>
        <SummaryFact label="Verification not recorded">{String(summary.verification_not_recorded_events)}</SummaryFact>
        <SummaryFact label="Latest mode">
          {summary.latest_event_type ? (
            <StatusChip
              label={latestMode.replace("app_control_", "")}
              tone={latestMode.includes("revert") ? "warning" : "info"}
            />
          ) : "not recorded"}
        </SummaryFact>
        <SummaryFact label="Latest event">
          {summary.latest_created_at ? formatSummaryTimestamp(summary.latest_created_at) : "not recorded"}
        </SummaryFact>
        <SummaryFact label="Latest verified count">{summary.latest_verified_count ?? "not recorded"}</SummaryFact>
        <SummaryFact label="Latest assumed count">{summary.latest_assumed_count ?? "not recorded"}</SummaryFact>
      </SummaryFacts>
      {summary.latest_summary ? (
        <div style={summaryCalloutStyle}>{summary.latest_summary}</div>
      ) : null}
      {savedViewFeedback ? (
        <div style={summaryCalloutStyle}>
          <strong>{savedViewFeedback.label}</strong>
          <div>{savedViewFeedback.detail}</div>
          {savedViewFeedback.onOpenSavedView ? (
            <div style={summaryActionRowStyle}>
              <button
                type="button"
                onClick={savedViewFeedback.onOpenSavedView}
                style={summaryActionButtonStyle}
              >
                Open saved view
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </SummarySection>
  );
}

const summaryMetricActionGroupStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
} as const;
