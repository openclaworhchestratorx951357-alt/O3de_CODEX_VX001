import type { CSSProperties } from "react";

export const summarySectionStyle: CSSProperties = {
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 16,
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

export const summaryCardStyle: CSSProperties = {
  border: "1px solid #d8dee4",
  borderRadius: 10,
  padding: 12,
  background: "#f6f8fa",
  display: "grid",
  gap: 8,
};

export const summaryCardHeadingStyle: CSSProperties = {
  margin: 0,
};

export const summaryMutedTextStyle: CSSProperties = {
  color: "#57606a",
};

export const summaryBadgeStyle: CSSProperties = {
  border: "1px solid #d0d7de",
  borderRadius: 999,
  padding: "6px 10px",
  background: "#f6f8fa",
  fontSize: 12,
};

export const summaryFilterButtonStyle: CSSProperties = {
  border: "1px solid #d0d7de",
  borderRadius: 999,
  padding: "6px 12px",
  cursor: "pointer",
};

export const summaryActionButtonStyle: CSSProperties = {
  border: "1px solid #d0d7de",
  borderRadius: 8,
  padding: "6px 12px",
  background: "#f6f8fa",
  cursor: "pointer",
};

export const summaryCalloutStyle: CSSProperties = {
  ...summaryMutedTextStyle,
  marginTop: 8,
};

export function formatSummaryLabeledText(label: string, value: string): string {
  return `${label}: ${value}`;
}

export function formatSummaryTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}
