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
} from "./summaryPrimitives";

type TaskTimelineProps = {
  items: EventListItem[];
  loading: boolean;
  error: string | null;
};

function describeTimelineMeaning(item: EventListItem): string | null {
  const capabilityStatus = item.capability_status ?? null;
  const adapterMode = item.adapter_mode ?? null;
  const message = item.message.toLowerCase();

  if (capabilityStatus === "plan-only") {
    if (adapterMode === "real" || message.includes("plan-only build.configure preflight")) {
      return "This event reflects the real plan-only build.configure preflight path, not a real configure mutation.";
    }
    return "This event reflects plan-only build.configure behavior; simulated fallback still remains possible in this phase.";
  }

  if (capabilityStatus === "hybrid-read-only") {
    return "This event reflects the first real read-only project.inspect path or its simulated fallback.";
  }

  return null;
}

export default function TaskTimeline({ items, loading, error }: TaskTimelineProps) {
  return (
    <SummarySection
      title="Task Timeline"
      description="This timeline shows persisted control-plane events, including simulated execution activity where applicable."
      loading={loading}
      error={error}
      emptyMessage="No timeline events are recorded yet."
      hasItems={items.length > 0}
    >
      <SummaryList>
        {items.map((item) => {
          const capabilityStatus = item.capability_status ?? null;
          const adapterMode = item.adapter_mode ?? null;
          const meaning = describeTimelineMeaning(item);
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
