import type { EventDetailResponse } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import StatusChip from "./StatusChip";
import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryCalloutStyle,
  summaryCardGridStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryTimestampNoteStyle,
} from "./summaryPrimitives";

type EventDetailPanelProps = {
  item: EventDetailResponse | null;
  loading: boolean;
  error: string | null;
  lastRefreshedAt?: string | null;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
};

export default function EventDetailPanel({
  item,
  loading,
  error,
  lastRefreshedAt = null,
  onRefresh = null,
  refreshing = false,
}: EventDetailPanelProps) {
  const event = item?.event ?? null;
  const appControl = item?.app_control ?? null;

  return (
    <SummarySection
      title="Event Detail"
      description="Inspect one persisted event record, including App OS audit receipts when the event carries structured receipt detail."
      loading={loading}
      error={error}
      emptyMessage="Select an event to inspect its persisted detail."
      hasItems={Boolean(item)}
      actionHint="Use this detail view when a timeline row needs more than category and severity chips."
      actions={onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          style={summaryActionButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh event detail"}
        </button>
      ) : null}
    >
      {event ? (
        <div style={{ display: "grid", gap: 12 }}>
          {lastRefreshedAt ? (
            <p style={summaryTimestampNoteStyle}>
              Last refreshed: {formatSummaryTimestamp(lastRefreshedAt)}
            </p>
          ) : null}
          <div style={summaryCardGridStyle}>
            <article style={summaryCardStyle}>
              <h4 style={summaryCardHeadingStyle}>Event Identity</h4>
              <SummaryFacts>
                <SummaryFact label="Event ID" copyValue={event.id}>{event.id}</SummaryFact>
                <SummaryFact label="Category">{event.category}</SummaryFact>
                {event.event_type ? (
                  <SummaryFact label="Event type">{event.event_type}</SummaryFact>
                ) : null}
                <SummaryFact label="Severity">
                  <StatusChip label={event.severity} tone={event.severity === "error" ? "danger" : event.severity === "warning" ? "warning" : "info"} />
                </SummaryFact>
                <SummaryFact label="Created">{formatSummaryTimestamp(event.created_at)}</SummaryFact>
              </SummaryFacts>
              <div style={summaryCalloutStyle}>{event.message}</div>
            </article>
            <article style={summaryCardStyle}>
              <h4 style={summaryCardHeadingStyle}>Linked Records</h4>
              <SummaryFacts>
                {event.run_id ? <SummaryFact label="Run" copyValue={event.run_id}>{event.run_id}</SummaryFact> : null}
                {event.execution_id ? <SummaryFact label="Execution" copyValue={event.execution_id}>{event.execution_id}</SummaryFact> : null}
                {event.executor_id ? <SummaryFact label="Executor" copyValue={event.executor_id}>{event.executor_id}</SummaryFact> : null}
                {event.workspace_id ? <SummaryFact label="Workspace">{event.workspace_id}</SummaryFact> : null}
                {event.previous_state ? <SummaryFact label="Previous state">{event.previous_state}</SummaryFact> : null}
                {event.current_state ? <SummaryFact label="Current state">{event.current_state}</SummaryFact> : null}
                {event.failure_category ? <SummaryFact label="Failure category">{event.failure_category}</SummaryFact> : null}
              </SummaryFacts>
            </article>
            <article style={summaryCardStyle}>
              <h4 style={summaryCardHeadingStyle}>Capability Context</h4>
              <SummaryFacts>
                <SummaryFact label="Capability">
                  {typeof event.details.capability_status === "string" ? event.details.capability_status : "not recorded"}
                </SummaryFact>
                <SummaryFact label="Adapter mode">
                  {typeof event.details.adapter_mode === "string" ? event.details.adapter_mode : "not recorded"}
                </SummaryFact>
                <SummaryFact label="Script ID">{appControl?.script_id ?? "not recorded"}</SummaryFact>
                <SummaryFact label="Receipt mode">{appControl?.mode ?? "not recorded"}</SummaryFact>
                <SummaryFact label="Verified count">{appControl?.verified_count ?? "not recorded"}</SummaryFact>
                <SummaryFact label="Assumed count">{appControl?.assumed_count ?? "not recorded"}</SummaryFact>
              </SummaryFacts>
              {appControl?.summary ? (
                <div style={summaryCalloutStyle}>{appControl.summary}</div>
              ) : null}
            </article>
          </div>
          {appControl && appControl.items.length > 0 ? (
            <div style={summaryCardGridStyle}>
              {appControl.items.map((receiptItem) => (
                <article key={receiptItem.id} style={summaryCardStyle}>
                  <h4 style={summaryCardHeadingStyle}>{receiptItem.label}</h4>
                  <SummaryFacts>
                    {receiptItem.verification ? (
                      <SummaryFact label="Verification">
                        <StatusChip
                          label={receiptItem.verification}
                          tone={receiptItem.verification === "verified" ? "success" : "warning"}
                        />
                      </SummaryFact>
                    ) : null}
                    {receiptItem.delta ? (
                      <SummaryFact label="Delta">{receiptItem.delta}</SummaryFact>
                    ) : null}
                  </SummaryFacts>
                  <div style={summaryCalloutStyle}>{receiptItem.detail}</div>
                </article>
              ))}
            </div>
          ) : null}
          <article style={summaryCardStyle}>
            <h4 style={summaryCardHeadingStyle}>Raw Details</h4>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {JSON.stringify(event.details, null, 2)}
            </pre>
          </article>
        </div>
      ) : null}
    </SummarySection>
  );
}
