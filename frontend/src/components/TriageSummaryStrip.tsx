import {
  summaryBadgeStyle,
  summaryCardHeadingStyle,
  summaryCardStyle,
  summaryInlineActionButtonStyle,
  summaryMutedTextStyle,
  summaryTopStackStyle,
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
  jumpLabel?: string | null;
  jumpTitle?: string | null;
  onJump?: (() => void) | null;
};

type StripItem = {
  label: string;
  description: string;
};

type StripTone = "default" | "info" | "warning" | "success";

const triageSummaryTooltip =
  "Use the operator triage summary to keep the current priority, action, and attention signals visible before jumping to related evidence or records.";

const triageSummaryJumpTooltip =
  "Jump directly to the related record or evidence highlighted by this operator triage summary.";

function getStripTone(label: string): StripTone {
  const normalizedLabel = label.toLowerCase();
  if (
    normalizedLabel.includes("simulation") ||
    normalizedLabel.includes("audit") ||
    normalizedLabel.includes("live decision")
  ) {
    return "warning";
  }
  if (
    normalizedLabel.includes("selected") ||
    normalizedLabel.includes("current operator focus")
  ) {
    return "success";
  }
  if (
    normalizedLabel.includes("real") ||
    normalizedLabel.includes("provenance") ||
    normalizedLabel.includes("review") ||
    normalizedLabel.includes("monitor")
  ) {
    return "info";
  }
  return "default";
}

function getBadgeToneStyle(tone: StripTone) {
  if (tone === "warning") {
    return {
      background: "var(--app-warning-bg)",
      borderColor: "var(--app-warning-border)",
      color: "var(--app-warning-text)",
    };
  }
  if (tone === "success") {
    return {
      background: "var(--app-success-bg)",
      borderColor: "var(--app-success-border)",
      color: "var(--app-success-text)",
    };
  }
  if (tone === "info") {
    return {
      background: "var(--app-info-bg)",
      borderColor: "var(--app-info-border)",
      color: "var(--app-info-text)",
    };
  }
  return {
    background: summaryBadgeStyle.background,
    borderColor: "var(--app-panel-border)",
    color: "var(--app-text-color)",
  };
}

function getDescriptionToneStyle(tone: StripTone) {
  if (tone === "warning") {
    return { color: "var(--app-warning-text)" };
  }
  if (tone === "success") {
    return { color: "var(--app-success-text)" };
  }
  if (tone === "info") {
    return { color: "var(--app-info-text)" };
  }
  return summaryMutedTextStyle;
}

export default function TriageSummaryStrip({
  heading,
  subjectLabel,
  priorityLabel,
  priorityDescription,
  actionLabel,
  actionDescription,
  attentionLabel,
  attentionDescription,
  jumpLabel,
  jumpTitle = null,
  onJump,
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
    <article style={{ ...summaryCardStyle, marginBottom: 0 }} title={triageSummaryTooltip}>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <h4 style={summaryCardHeadingStyle}>{heading}</h4>
        {jumpLabel && onJump ? (
          <button
            type="button"
            style={summaryInlineActionButtonStyle}
            title={jumpTitle ?? triageSummaryJumpTooltip}
            onClick={onJump}
          >
            {jumpLabel}
          </button>
        ) : null}
      </div>
      {subjectLabel ? <div style={summaryMutedTextStyle}>{subjectLabel}</div> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {items.map((item) => {
          const tone = getStripTone(item.label);
          return (
            <span
              key={`${item.label}-${item.description}`}
              title={`${item.label}: ${item.description}`}
              style={{ ...summaryBadgeStyle, ...getBadgeToneStyle(tone) }}
            >
              {item.label}
            </span>
          );
        })}
      </div>
      <div style={{ ...summaryTopStackStyle, gap: 6, marginBottom: 0 }}>
        {items.map((item) => {
          const tone = getStripTone(item.label);
          return (
            <div key={`${item.label}-${item.description}-detail`}>
              <strong>{item.label}:</strong>{" "}
              <span style={getDescriptionToneStyle(tone)}>{item.description}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}
