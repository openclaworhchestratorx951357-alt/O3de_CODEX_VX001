import type { ReactNode } from "react";
import PanelGuideDetails from "./PanelGuideDetails";
import {
  summarySectionStyle,
  summaryMutedTextStyle,
} from "./summaryPrimitives";
type SummarySectionProps = {
  title: string;
  description: string;
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  hasItems: boolean;
  children: ReactNode;
  marginTop?: number;
  actions?: ReactNode;
  actionHint?: string | null;
  guideTitle?: string;
  guideTooltip?: string | null;
  guideChecklist?: readonly string[];
};

export default function SummarySection({
  title,
  description,
  loading,
  error,
  emptyMessage,
  hasItems,
  children,
  marginTop = 24,
  actions,
  actionHint,
  guideTitle,
  guideTooltip,
  guideChecklist = [],
}: SummarySectionProps) {
  return (
    <section
      style={{
        ...summarySectionStyle,
        marginTop,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 320px" }}>
          <h3 style={{ marginTop: 0, color: "var(--app-text-color)" }}>{title}</h3>
          <p style={{ marginTop: 0, color: "var(--app-muted-color)" }}>{description}</p>
          {actionHint ? (
            <p style={{ ...summaryMutedTextStyle, marginTop: 0 }}>{actionHint}</p>
          ) : null}
          <PanelGuideDetails
            title={guideTitle}
            tooltip={guideTooltip}
            checklist={guideChecklist}
          />
        </div>
        {actions ? (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {error ? <p style={{ color: "var(--app-danger-text)" }}>{error}</p> : null}
      {loading ? (
        <p>Loading {title.toLowerCase()}...</p>
      ) : !hasItems ? (
        <p>{emptyMessage}</p>
      ) : (
        children
      )}
    </section>
  );
}
