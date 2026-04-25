import type { CSSProperties } from "react";

import type { RecommendationDescriptor } from "../lib/recommendations";
import PanelGuideDetails from "./PanelGuideDetails";
import {
  summaryActionButtonStyle,
  summaryCardGridStyle,
  summaryCardStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

type RecommendedActionsPanelProps = {
  title?: string;
  description?: string;
  entries: ReadonlyArray<
    RecommendationDescriptor & {
      onAction: () => void;
      suggestedBecause?: string;
      opensLabel?: string;
    }
  >;
};

const toneStyles: Record<RecommendationDescriptor["tone"], CSSProperties> = {
  info: {
    background: "var(--app-accent-soft)",
    borderColor: "var(--app-accent-strong)",
    color: "var(--app-text-color)",
  },
  success: {
    background: "var(--app-success-bg)",
    borderColor: "var(--app-success-border)",
    color: "var(--app-success-text)",
  },
  warning: {
    background: "var(--app-warning-bg)",
    borderColor: "var(--app-warning-border)",
    color: "var(--app-warning-text)",
  },
};

const guideChecklist = [
  "Use the warning card first when something is blocked or stale.",
  "Each action jumps straight into the workspace that can resolve that condition.",
  "Return here after finishing a step if you want the next recommendation.",
] as const;

export default function RecommendedActionsPanel({
  title = "Recommended next steps",
  description = "Local desktop guidance derived from the current frontend state so you can move forward without guessing which workspace to open next.",
  entries,
}: RecommendedActionsPanelProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 12,
        marginBottom: 16,
        background: "linear-gradient(135deg, var(--app-accent-soft) 0%, var(--app-panel-bg-muted) 100%)",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>{title}</strong>
        <p style={summaryMutedTextStyle}>{description}</p>
        <PanelGuideDetails
          title="How to use recommendations"
          tooltip="Use the local recommendations to jump directly into the next workspace that is most likely to unblock you."
          checklist={guideChecklist}
        />
      </div>
      <div style={summaryCardGridStyle}>
        {entries.map((entry) => {
          const hasReviewContext = Boolean(entry.suggestedBecause || entry.opensLabel);
          return (
            <article
              key={entry.id}
              style={{
                ...summaryCardStyle,
                alignContent: "start",
              }}
            >
              <span
                style={{
                  ...recommendationBadgeStyle,
                  ...toneStyles[entry.tone],
                }}
              >
                {entry.label}
              </span>
              {hasReviewContext ? (
                <>
                  <p style={summaryMutedTextStyle}>
                    Review why this recommendation appears and which window it opens before you jump.
                  </p>
                  <div style={recommendationContextStyle}>
                    <span>
                      <strong>Suggested because:</strong> {entry.suggestedBecause ?? entry.detail}
                    </span>
                    {entry.opensLabel ? (
                      <span>
                        <strong>Opens:</strong> {entry.opensLabel}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (
                <p style={summaryMutedTextStyle}>{entry.detail}</p>
              )}
              <button
                type="button"
                style={summaryActionButtonStyle}
                onClick={entry.onAction}
              >
                {entry.actionLabel}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

const recommendationBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-start",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const recommendationContextStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: 13,
  lineHeight: 1.45,
} satisfies CSSProperties;
