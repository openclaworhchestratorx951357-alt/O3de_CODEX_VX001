import type { CSSProperties } from "react";

import ActionReviewCard from "../../ActionReviewCard";
import type { AutonomyDraftRecommendation } from "./types";

type BuilderAutonomyRecommendationsPanelProps = {
  recommendations: readonly AutonomyDraftRecommendation[];
  loadedRecommendation: AutonomyDraftRecommendation | null;
  onLoadRecommendation: (recommendation: AutonomyDraftRecommendation) => void;
  onClearLoadedRecommendation: () => void;
};

export default function BuilderAutonomyRecommendationsPanel({
  recommendations,
  loadedRecommendation,
  onLoadRecommendation,
  onClearLoadedRecommendation,
}: BuilderAutonomyRecommendationsPanelProps) {
  return (
    <article style={summaryCardStyle}>
      <div style={rowBetweenStyle}>
        <div style={stackStyle}>
          <strong>Codex draft recommendations</strong>
          <p style={mutedParagraphStyle}>
            Load practical objective and inbox-job drafts from current Builder state instead of
            starting from blank templates. These are browser-local suggestions only until you edit
            and save them.
          </p>
        </div>
        <span style={{ ...pillStyle, ...toneStyle("info") }}>
          {recommendations.length} ready
        </span>
      </div>
      <div style={summaryGridStyle}>
        {recommendations.map((recommendation) => (
          <ActionReviewCard
            key={recommendation.id}
            ariaLabel={`Recommendation preview: ${recommendation.label}`}
            eyebrow="Recommendation preview"
            eyebrowTone="info"
            title={recommendation.label}
            description={recommendation.detail}
            action={(
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => onLoadRecommendation(recommendation)}
              >
                Load {recommendation.label}
              </button>
            )}
            details={[
              { label: "Objective", value: recommendation.objective.title },
              { label: "Job", value: recommendation.job.title },
              { label: "Lane", value: recommendation.job.assignedLane || "builder" },
              { label: "Save behavior", value: "loads editable drafts only; nothing is saved yet" },
            ]}
          />
        ))}
      </div>
      {loadedRecommendation ? (
        <ActionReviewCard
          ariaLabel="Loaded draft review"
          eyebrow="Loaded draft review"
          eyebrowTone="info"
          title={loadedRecommendation.label}
          description={loadedRecommendation.detail}
          style={{ marginTop: 12 }}
          action={(
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={onClearLoadedRecommendation}
            >
              Clear review
            </button>
          )}
          details={[
            { label: "Changed fields", value: "Objective draft, job draft, resource keys, payload JSON" },
            { label: "Objective ID", value: loadedRecommendation.objective.id },
            { label: "Job ID", value: loadedRecommendation.job.id },
            { label: "Lane", value: loadedRecommendation.job.assignedLane || "builder" },
            { label: "Resources", value: loadedRecommendation.job.resourceKeys.trim() || "none" },
            {
              label: "Safe until saved",
              value: "review the drafts below, then use Add objective and Add inbox job when ready",
            },
          ]}
        />
      ) : null}
    </article>
  );
}

function toneStyle(kind: "neutral" | "success" | "warning" | "info"): CSSProperties {
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

const stackStyle = {
  display: "grid",
  gap: 12,
} satisfies CSSProperties;

const summaryGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
} satisfies CSSProperties;

const summaryCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  background: "var(--app-panel-bg-muted)",
  padding: "14px 16px",
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const rowBetweenStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
} satisfies CSSProperties;

const pillStyle = {
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
} satisfies CSSProperties;

const mutedParagraphStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  lineHeight: 1.55,
} satisfies CSSProperties;

const buttonStyle = {
  borderRadius: 10,
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  padding: "10px 14px",
  font: "inherit",
  cursor: "pointer",
} satisfies CSSProperties;

const secondaryButtonStyle = {
  ...buttonStyle,
  border: "1px solid var(--app-panel-border)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;
