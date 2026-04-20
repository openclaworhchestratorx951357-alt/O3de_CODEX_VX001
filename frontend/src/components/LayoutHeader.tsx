import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryBadgeStyle,
} from "./summaryPrimitives";

type LayoutHeaderProps = {
  title: string;
  subtitle: string;
  onRefresh?: (() => void) | null;
  refreshing?: boolean;
  lastRefreshedAt?: string | null;
  refreshStatusLabel?: string | null;
};

export default function LayoutHeader({
  title,
  subtitle,
  onRefresh,
  refreshing = false,
  lastRefreshedAt,
  refreshStatusLabel,
}: LayoutHeaderProps) {
  return (
    <header
      style={{
        borderBottom: "1px solid #d0d7de",
        paddingBottom: 16,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p style={{ margin: "8px 0 0 0" }}>{subtitle}</p>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {refreshStatusLabel ? (
            <span style={summaryBadgeStyle}>{refreshStatusLabel}</span>
          ) : null}
          {lastRefreshedAt ? (
            <span style={summaryBadgeStyle}>
              last refresh: {formatSummaryTimestamp(lastRefreshedAt)}
            </span>
          ) : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              style={summaryActionButtonStyle}
            >
              {refreshing ? "Refreshing..." : "Refresh dashboard"}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
