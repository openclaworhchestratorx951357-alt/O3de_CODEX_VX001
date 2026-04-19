import type { LockListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
import { SummaryList, SummaryListItem } from "./SummaryList";
import {
  formatSummaryTimestamp,
} from "./summaryPrimitives";

type LocksPanelProps = {
  items: LockListItem[];
  loading: boolean;
  error: string | null;
};

export default function LocksPanel({ items, loading, error }: LocksPanelProps) {
  return (
    <SummarySection
      title="Locks"
      description="These are persisted control-plane lock records. They describe orchestration ownership, not proof of real O3DE adapter execution."
      loading={loading}
      error={error}
      emptyMessage="No active locks are recorded."
      hasItems={items.length > 0}
    >
      <SummaryList>
        {items.map((item) => (
          <SummaryListItem key={`${item.name}:${item.owner_run_id}`} card>
            <strong>{item.name}</strong>
            <div>Owner run: {item.owner_run_id}</div>
            <div>Created: {formatSummaryTimestamp(item.created_at)}</div>
          </SummaryListItem>
        ))}
      </SummaryList>
    </SummarySection>
  );
}
