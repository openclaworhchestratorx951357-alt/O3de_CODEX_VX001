import {
  formatSummaryTimestamp,
  summaryActionButtonStyle,
  summaryBadgeStyle,
} from "./summaryPrimitives";

type LayoutHeaderProps = {
  title: string;
  subtitle: string;
  refreshing?: boolean;
  lastRefreshedAt?: string | null;
  refreshStatusLabel?: string | null;
  refreshActions?: Array<{
    label: string;
    onClick: () => void;
  }>;
};

export default function LayoutHeader({
  title,
  subtitle,
  refreshing = false,
  lastRefreshedAt,
  refreshStatusLabel,
  refreshActions = [],
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
          {refreshActions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              type="button"
              onClick={action.onClick}
              disabled={refreshing}
              style={summaryActionButtonStyle}
            >
              {refreshing ? "Refreshing..." : action.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
