import { useMemo, useState } from "react";

import type { ApprovalListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import { getApprovalStatusTone } from "./statusChipTones";
import {
  formatSummaryTimestamp,
  formatSummaryLabeledText,
  summaryActionButtonStyle,
  summaryActionRowStyle,
  summaryFocusBadgeStyle,
  summaryCalloutStyle,
  summaryControlRowStyle,
  summaryInlineActionButtonStyle,
  summarySearchInputStyle,
} from "./summaryPrimitives";

type ApprovalQueueProps = {
  items: ApprovalListItem[];
  loading: boolean;
  error: string | null;
  busyApprovalId: string | null;
  onApprove: (approvalId: string) => Promise<void>;
  onReject: (approvalId: string) => Promise<void>;
  searchPreset?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
};

function formatApprovalTitle(item: ApprovalListItem): string {
  return `${item.tool} requested by ${item.agent}`;
}

function describeApprovalMeaning(item: ApprovalListItem): string | null {
  if (item.tool === "build.configure") {
    return "In hybrid mode, this approval may allow the real plan-only build.configure preflight path when dry_run=true. It does not imply a real configure mutation.";
  }
  return null;
}

export default function ApprovalQueue({
  items,
  loading,
  error,
  busyApprovalId,
  onApprove,
  onReject,
  searchPreset,
  focusLabel,
  onClearFocus,
}: ApprovalQueueProps) {
  const [searchValue, setSearchValue] = useState(searchPreset ?? "");
  const normalizedQuery = searchValue.trim().toLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => matchesApprovalSearch(item, normalizedQuery)),
    [items, normalizedQuery],
  );

  return (
    <SummarySection
      title="Approval Queue"
      description="Approval decisions resume capability-gated execution. Any real path still remains narrow and explicitly labeled."
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No approvals match the current search." : "No approvals are waiting for a decision."}
      hasItems={filteredItems.length > 0}
      marginTop={0}
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
        <input
          type="search"
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search approvals by tool, agent, run, class, or reason"
          style={summarySearchInputStyle}
        />
      </div>
      <SummaryList>
        {filteredItems.map((item) => (
          <SummaryListItem key={item.id} card>
            <strong>{formatApprovalTitle(item)}</strong>
            <SummaryFacts>
              <SummaryFact label="Class">{item.approval_class}</SummaryFact>
              <SummaryFact label="Status">
                <StatusChip label={item.status} tone={getApprovalStatusTone(item.status)} />
              </SummaryFact>
              <SummaryFact label="Run">{item.run_id}</SummaryFact>
              <SummaryFact label="Created">{formatSummaryTimestamp(item.created_at)}</SummaryFact>
              {item.decided_at ? (
                <SummaryFact label="Decided">{formatSummaryTimestamp(item.decided_at)}</SummaryFact>
              ) : null}
              {item.reason ? <SummaryFact label="Reason">{item.reason}</SummaryFact> : null}
            </SummaryFacts>
            {describeApprovalMeaning(item) ? (
              <div style={summaryCalloutStyle}>
                {formatSummaryLabeledText("Meaning", describeApprovalMeaning(item) ?? "")}
              </div>
            ) : null}
            {item.can_decide ? (
              <div style={summaryActionRowStyle}>
                <button
                  type="button"
                  style={summaryActionButtonStyle}
                  disabled={busyApprovalId === item.id}
                  onClick={() => void onApprove(item.id)}
                >
                  {busyApprovalId === item.id ? "Working..." : "Approve"}
                </button>
                <button
                  type="button"
                  style={summaryActionButtonStyle}
                  disabled={busyApprovalId === item.id}
                  onClick={() => void onReject(item.id)}
                >
                  {busyApprovalId === item.id ? "Working..." : "Reject"}
                </button>
              </div>
            ) : null}
          </SummaryListItem>
        ))}
      </SummaryList>
    </SummarySection>
  );
}

function matchesApprovalSearch(item: ApprovalListItem, query: string): boolean {
  if (!query) {
    return true;
  }

  return [
    item.id,
    item.run_id,
    item.request_id,
    item.agent,
    item.tool,
    item.approval_class,
    item.status,
    item.reason ?? "",
  ].some((value) => value.toLowerCase().includes(query));
}
