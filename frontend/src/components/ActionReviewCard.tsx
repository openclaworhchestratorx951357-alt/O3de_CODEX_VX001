import type { CSSProperties, ReactNode } from "react";

export type ActionReviewTone = "neutral" | "success" | "warning" | "info";

type ActionReviewDetail = {
  label: string;
  value: ReactNode;
};

type ActionReviewCardProps = {
  ariaLabel: string;
  eyebrow: string;
  eyebrowTone?: ActionReviewTone;
  title: ReactNode;
  description: ReactNode;
  statusLabel?: ReactNode;
  statusTone?: ActionReviewTone;
  details: ActionReviewDetail[];
  action?: ReactNode;
  style?: CSSProperties;
};

export default function ActionReviewCard({
  ariaLabel,
  eyebrow,
  eyebrowTone = "info",
  title,
  description,
  statusLabel,
  statusTone = "neutral",
  details,
  action,
  style,
}: ActionReviewCardProps) {
  return (
    <article aria-label={ariaLabel} style={{ ...reviewCardStyle, ...style }}>
      <div style={reviewHeaderStyle}>
        <div style={reviewTitleStackStyle}>
          <span style={{ ...reviewPillStyle, ...reviewToneStyle(eyebrowTone), width: "fit-content" }}>
            {eyebrow}
          </span>
          <strong>{title}</strong>
          <p style={reviewDescriptionStyle}>{description}</p>
        </div>
        {action ?? (
          statusLabel ? (
            <span style={{ ...reviewPillStyle, ...reviewToneStyle(statusTone) }}>
              {statusLabel}
            </span>
          ) : null
        )}
      </div>
      <div style={reviewDetailStackStyle}>
        {details.map((detail, index) => (
          <span key={`${detail.label}-${index}`}>
            <strong>{detail.label}:</strong> {detail.value}
          </span>
        ))}
      </div>
    </article>
  );
}

function reviewToneStyle(kind: ActionReviewTone): CSSProperties {
  switch (kind) {
    case "success":
      return {
        background: "var(--app-success-bg)",
        border: "1px solid var(--app-success-border)",
        color: "var(--app-success-text)",
      };
    case "warning":
      return {
        background: "var(--app-warning-bg)",
        border: "1px solid var(--app-warning-border)",
        color: "var(--app-warning-text)",
      };
    case "info":
      return {
        background: "var(--app-accent-soft)",
        border: "1px solid var(--app-accent-strong)",
        color: "var(--app-text-color)",
      };
    case "neutral":
    default:
      return {
        background: "var(--app-panel-bg-muted)",
        border: "1px solid var(--app-panel-border)",
        color: "var(--app-text-color)",
      };
  }
}

const reviewCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  background: "var(--app-panel-bg)",
  padding: "14px 16px",
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const reviewHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
} satisfies CSSProperties;

const reviewTitleStackStyle = {
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const reviewPillStyle = {
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
} satisfies CSSProperties;

const reviewDetailStackStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 13,
} satisfies CSSProperties;

const reviewDescriptionStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  lineHeight: 1.55,
} satisfies CSSProperties;
