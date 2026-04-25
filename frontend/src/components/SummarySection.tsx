import type { ReactNode } from "react";
import GuidedEmptyState from "./GuidedEmptyState";
import PanelActionStrip from "./PanelActionStrip";
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
  quickStartTitle?: string;
  quickStartDescription?: string | null;
  quickStartItems?: readonly string[];
  emptyGuideTitle?: string;
  emptyGuideDescription?: string | null;
  emptyGuideSteps?: readonly string[];
  emptyGuideExampleTitle?: string;
  emptyGuideExample?: string | null;
  renderChildrenWhenEmpty?: boolean;
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
  quickStartTitle,
  quickStartDescription,
  quickStartItems = [],
  emptyGuideTitle,
  emptyGuideDescription = null,
  emptyGuideSteps = [],
  emptyGuideExampleTitle,
  emptyGuideExample = null,
  renderChildrenWhenEmpty = false,
}: SummarySectionProps) {
  const quickStartItemSet = new Set(
    quickStartItems.map((item) => item.trim()).filter(Boolean),
  );
  const remainingGuideChecklist = guideChecklist.filter((item) => {
    const normalizedItem = item.trim();
    return normalizedItem.length > 0 && !quickStartItemSet.has(normalizedItem);
  });

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
            checklist={remainingGuideChecklist}
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
      <PanelActionStrip
        title={quickStartTitle}
        description={quickStartDescription}
        items={quickStartItems}
      />
      {error ? <p style={{ color: "var(--app-danger-text)" }}>{error}</p> : null}
      {loading ? (
        <p>Loading {title.toLowerCase()}...</p>
      ) : (
        <>
          {!hasItems ? (
            <GuidedEmptyState
              message={emptyMessage}
              title={emptyGuideTitle}
              description={emptyGuideDescription}
              steps={emptyGuideSteps}
              exampleTitle={emptyGuideExampleTitle}
              exampleBody={emptyGuideExample}
            />
          ) : null}
          {hasItems || renderChildrenWhenEmpty ? children : null}
        </>
      )}
    </section>
  );
}
