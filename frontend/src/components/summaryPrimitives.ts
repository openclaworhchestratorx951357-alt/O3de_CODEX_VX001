import type { CSSProperties } from "react";

export const summarySectionStyle: CSSProperties = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "var(--app-panel-padding)",
  background: "var(--app-panel-bg-muted)",
  boxShadow: "var(--app-shadow-soft)",
};

export const summaryItemStyle: CSSProperties = {
  marginBottom: 12,
};

export const summaryListStyle: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
};

export const summaryControlRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginBottom: 16,
};

export const summaryActionRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 8,
};

export const summaryCardGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

export const summaryTopStackStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  marginBottom: 12,
};

export const summaryCardStyle: CSSProperties = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: 12,
  background: "var(--app-panel-bg)",
  display: "grid",
  gap: 8,
};

export const summaryHighlightedCardStyle: CSSProperties = {
  boxShadow: "0 0 0 3px var(--app-accent-soft)",
  borderColor: "var(--app-accent)",
};

export const summaryFactsGridStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

export const summaryFactRowStyle: CSSProperties = {
  display: "grid",
  gap: 4,
};

export const summaryFactLabelStyle: CSSProperties = {
  color: "var(--app-muted-color)",
  fontSize: 12,
  fontWeight: 600,
};

export const summaryFactValueStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
};

export const summaryCardHeadingStyle: CSSProperties = {
  margin: 0,
};

export const summaryMutedTextStyle: CSSProperties = {
  color: "var(--app-muted-color)",
};

export const summaryBadgeStyle: CSSProperties = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  fontSize: 12,
};

export const summaryFilterButtonStyle: CSSProperties = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 12px",
  cursor: "pointer",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
};

export const summarySearchInputStyle: CSSProperties = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: "6px 10px",
  minWidth: 220,
  background: "var(--app-input-bg)",
  color: "var(--app-text-color)",
};

export const summaryActionButtonStyle: CSSProperties = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: "6px 12px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
};

export const summaryInlineActionButtonStyle: CSSProperties = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: "2px 8px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontSize: 12,
};

export const summaryFocusBadgeStyle: CSSProperties = {
  ...summaryBadgeStyle,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "var(--app-accent-soft)",
  borderColor: "var(--app-accent)",
};

export const summaryCalloutStyle: CSSProperties = {
  ...summaryMutedTextStyle,
  marginTop: 0,
};

export const summaryTimestampNoteStyle: CSSProperties = {
  ...summaryMutedTextStyle,
  fontSize: 12,
  marginTop: 0,
  marginBottom: 0,
};

export const summaryRefreshBadgeStyle: CSSProperties = {
  ...summaryBadgeStyle,
  background: "var(--app-success-bg)",
  borderColor: "var(--app-success-border)",
  color: "var(--app-success-text)",
};

export function formatSummaryLabeledText(label: string, value: string): string {
  return `${label}: ${value}`;
}

export function formatSummaryTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}
