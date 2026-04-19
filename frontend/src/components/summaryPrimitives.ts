export const summarySectionStyle = {
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 16,
};

export const summaryItemStyle = {
  marginBottom: 12,
};

export const summaryCardGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

export const summaryCardStyle = {
  border: "1px solid #d8dee4",
  borderRadius: 10,
  padding: 12,
  background: "#f6f8fa",
  display: "grid",
  gap: 8,
};

export const summaryCardHeadingStyle = {
  margin: 0,
};

export const summaryMutedTextStyle = {
  color: "#57606a",
};

export function formatSummaryTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}
