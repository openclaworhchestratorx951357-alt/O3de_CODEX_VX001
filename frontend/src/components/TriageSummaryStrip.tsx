import {
  summaryBadgeStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryMutedTextStyle,
} from "./summaryPrimitives";

type TriageSummaryStripProps = {
  heading: string;
  subjectLabel?: string | null;
  priorityLabel?: string | null;
  priorityDescription?: string | null;
  actionLabel?: string | null;
  actionDescription?: string | null;
  attentionLabel?: string | null;
  attentionDescription?: string | null;
};

type StripItem = {
  label: string;
  description: string;
};

export default function TriageSummaryStrip({
  heading,
  subjectLabel,
  priorityLabel,
  priorityDescription,
  actionLabel,
  actionDescription,
  attentionLabel,
  attentionDescription,
}: TriageSummaryStripProps) {
  const items: StripItem[] = [];

  if (priorityLabel && priorityDescription) {
    items.push({ label: priorityLabel, description: priorityDescription });
  }
  if (actionLabel && actionDescription) {
    items.push({ label: actionLabel, description: actionDescription });
  }
  if (attentionLabel && attentionDescription) {
    items.push({ label: attentionLabel, description: attentionDescription });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <article style={{ ...summaryCardStyle, marginBottom: 12 }}>
      <h4 style={summaryCardHeadingStyle}>{heading}</h4>
      {subjectLabel ? <div style={summaryMutedTextStyle}>{subjectLabel}</div> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {items.map((item) => (
          <span key={`${item.label}-${item.description}`} style={summaryBadgeStyle}>
            {item.label}
          </span>
        ))}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((item) => (
          <div key={`${item.label}-${item.description}-detail`}>
            <strong>{item.label}:</strong> <span style={summaryMutedTextStyle}>{item.description}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
