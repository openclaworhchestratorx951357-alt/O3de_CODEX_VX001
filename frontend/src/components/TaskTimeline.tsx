import { useMemo, useState } from "react";

import { describeTimelineMeaning } from "../lib/capabilityNarrative";
import type { EventListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryFact, SummaryFacts } from "./SummaryFacts";
import { SummaryList, SummaryListItem } from "./SummaryList";
import StatusChip from "./StatusChip";
import {
  getAdapterModeTone,
  getCapabilityTone,
  getSeverityTone,
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

type TaskTimelineProps = {
  items: EventListItem[];
  loading: boolean;
  error: string | null;
  searchPreset?: string | null;
  focusLabel?: string | null;
  onClearFocus?: () => void;
  lastRefreshedAt?: string | null;
  updateBadgeLabel?: string | null;
};

export default function TaskTimeline({
  items,
  loading,
  error,
  searchPreset,
  focusLabel,
  onClearFocus,
  lastRefreshedAt,
  updateBadgeLabel,
}: TaskTimelineProps) {
  const [searchValue, setSearchValue] = useState(searchPreset ?? "");
  const normalizedQuery = searchValue.trim().toLowerCase();
  const filteredItems = useMemo(
    () => items.filter((item) => matchesTimelineSearch(item, normalizedQuery)),
    [items, normalizedQuery],
  );

  return (
    <SummarySection
      title="Task Timeline"
      description="This timeline shows persisted control-plane events, including simulated execution activity where applicable."
      loading={loading}
      error={error}
      emptyMessage={normalizedQuery ? "No timeline events match the current search." : "No timeline events are recorded yet."}
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
          placeholder="Search timeline by message, run, category, state, or capability"
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
          const capabilityStatus = item.capability_status ?? null;
          const adapterMode = item.adapter_mode ?? null;
          const meaning = describeTimelineMeaning(capabilityStatus, adapterMode, item.message);
          return (
            <SummaryListItem key={item.id} card>
              <strong>{item.message}</strong>
              <SummaryFacts>
                <SummaryFact label="Category">{item.category}</SummaryFact>
                <SummaryFact label="Severity">
                  <StatusChip label={item.severity} tone={getSeverityTone(item.severity)} />
                </SummaryFact>
                <SummaryFact label="State">
                  <StatusChip label={item.event_state} tone="neutral" />
                </SummaryFact>
                {capabilityStatus ? (
                  <SummaryFact label="Capability">
                    <StatusChip label={capabilityStatus} tone={getCapabilityTone(capabilityStatus)} />
                  </SummaryFact>
                ) : null}
                {adapterMode ? (
                  <SummaryFact label="Adapter mode">
                    <StatusChip label={adapterMode} tone={getAdapterModeTone(adapterMode)} />
                  </SummaryFact>
                ) : null}
                {item.run_id ? <SummaryFact label="Run">{item.run_id}</SummaryFact> : null}
                <SummaryFact label="Created">{formatSummaryTimestamp(item.created_at)}</SummaryFact>
              </SummaryFacts>
              {meaning ? (
                <div style={summaryCalloutStyle}>
                  {formatSummaryLabeledText("Meaning", meaning)}
                </div>
              ) : null}
            </SummaryListItem>
          );
        })}
      </SummaryList>
    </SummarySection>
  );
}

function matchesTimelineSearch(item: EventListItem, query: string): boolean {
  if (!query) {
    return true;
  }

  return [
    item.id,
    item.message,
    item.category,
    item.severity,
    item.event_state,
    item.run_id ?? "",
    item.capability_status ?? "",
    item.adapter_mode ?? "",
  ].some((value) => value.toLowerCase().includes(query));
}
