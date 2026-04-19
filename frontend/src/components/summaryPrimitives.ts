export const summarySectionStyle = {
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 16,
};

export const summaryItemStyle = {
  marginBottom: 12,
};

export function formatSummaryTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}
