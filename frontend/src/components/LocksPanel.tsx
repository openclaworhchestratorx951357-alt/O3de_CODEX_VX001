import type { LockListItem } from "../types/contracts";
import SummarySection from "./SummarySection";
import {
  formatSummaryTimestamp,
  summaryItemStyle,
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
      <ul>
        {items.map((item) => (
          <li key={`${item.name}:${item.owner_run_id}`} style={summaryItemStyle}>
            <strong>{item.name}</strong>
            <div>Owner run: {item.owner_run_id}</div>
            <div>Created: {formatSummaryTimestamp(item.created_at)}</div>
          </li>
        ))}
      </ul>
    </SummarySection>
  );
}
