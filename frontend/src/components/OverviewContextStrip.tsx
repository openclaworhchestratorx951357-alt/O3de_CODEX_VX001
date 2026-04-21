import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import PanelGuideDetails from "./PanelGuideDetails";
import {
  summaryActionButtonStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

const overviewContextStripGuide = getPanelGuide("overview-context-strip");
const overviewContextStripHistoryControlGuide = getPanelControlGuide("overview-context-strip", "history-entry");
const overviewContextStripPresetControlGuide = getPanelControlGuide("overview-context-strip", "preset-actions");
const overviewContextStripClearFocusControlGuide = getPanelControlGuide("overview-context-strip", "clear-focus");

type OverviewContextStripProps = {
  laneLabel: string;
  focusLabel: string | null;
  originLabel?: string | null;
  autoOpenLabel?: string | null;
  impactLabel?: string | null;
  impactDetail?: string | null;
  promotedPresetLabel?: string | null;
  promotedPresetDetail?: string | null;
  historyEntries?: Array<{
    id: string;
    focusLabel: string;
    originLabel: string;
  }>;
  onSelectHistoryEntry?: ((entryId: string) => void) | null;
  onClearHistory?: (() => void) | null;
  onPromoteCurrentContext?: (() => void) | null;
  onApplyPromotedPreset?: (() => void) | null;
  onClearPromotedPreset?: (() => void) | null;
  onClearFocus?: (() => void) | null;
};

const stripStyle = {
  ...summarySectionStyle,
  display: "grid",
  gap: 8,
  marginBottom: 12,
  background: "linear-gradient(135deg, var(--app-accent-soft) 0%, var(--app-panel-bg-muted) 100%)",
  borderColor: "var(--app-accent)",
  boxShadow: "var(--app-shadow-soft)",
};

const titleStyle = {
  margin: 0,
  fontSize: 14,
};

export default function OverviewContextStrip({
  laneLabel,
  focusLabel,
  originLabel,
  autoOpenLabel,
  impactLabel,
  impactDetail,
  promotedPresetLabel,
  promotedPresetDetail,
  historyEntries = [],
  onSelectHistoryEntry,
  onClearHistory,
  onPromoteCurrentContext,
  onApplyPromotedPreset,
  onClearPromotedPreset,
  onClearFocus,
}: OverviewContextStripProps) {
  if (!focusLabel) {
    return null;
  }

  return (
    <section style={stripStyle}>
      <h3 style={titleStyle}>Active overview context</h3>
      <p style={summaryMutedTextStyle}>
        {laneLabel} is currently focused from the overview on {focusLabel}.
      </p>
      <PanelGuideDetails
        tooltip={overviewContextStripGuide.tooltip}
        checklist={overviewContextStripGuide.checklist}
      />
      {originLabel ? (
        <p style={summaryMutedTextStyle}>
          Drilldown source: {originLabel}.
        </p>
      ) : null}
      {autoOpenLabel ? (
        <p style={summaryMutedTextStyle}>
          Auto-open: {autoOpenLabel}
        </p>
      ) : null}
      {impactLabel ? (
        <p style={summaryMutedTextStyle}>
          Focus impact: {impactLabel}
          {impactDetail ? ` ${impactDetail}` : ""}
        </p>
      ) : null}
      {promotedPresetLabel ? (
        <div style={{ display: "grid", gap: 6 }}>
          <p style={summaryMutedTextStyle}>
            Local session preset: {promotedPresetLabel}.
            {promotedPresetDetail ? ` ${promotedPresetDetail}` : ""}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {onApplyPromotedPreset ? (
              <button
                type="button"
                title={overviewContextStripPresetControlGuide.tooltip}
                style={summaryActionButtonStyle}
                onClick={onApplyPromotedPreset}
              >
                Reapply local preset
              </button>
            ) : null}
            {onClearPromotedPreset ? (
              <button
                type="button"
                title={overviewContextStripPresetControlGuide.tooltip}
                style={summaryActionButtonStyle}
                onClick={onClearPromotedPreset}
              >
                Clear local preset
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {historyEntries.length > 0 ? (
        <div style={{ display: "grid", gap: 6 }}>
          <p style={summaryMutedTextStyle}>Recent overview contexts:</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {historyEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                title={overviewContextStripHistoryControlGuide.tooltip}
                style={summaryActionButtonStyle}
                onClick={() => onSelectHistoryEntry?.(entry.id)}
              >
                {entry.originLabel}: {entry.focusLabel}
              </button>
            ))}
            {onClearHistory ? (
              <button
                type="button"
                title={overviewContextStripHistoryControlGuide.tooltip}
                style={summaryActionButtonStyle}
                onClick={onClearHistory}
              >
                Clear history
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {onClearFocus ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onPromoteCurrentContext ? (
            <button
              type="button"
              title={overviewContextStripPresetControlGuide.tooltip}
              style={summaryActionButtonStyle}
              onClick={onPromoteCurrentContext}
            >
              Save as local preset
            </button>
          ) : null}
          <button
            type="button"
            title={overviewContextStripClearFocusControlGuide.tooltip}
            style={summaryActionButtonStyle}
            onClick={onClearFocus}
          >
            Clear {laneLabel.toLowerCase()} overview context
          </button>
        </div>
      ) : null}
    </section>
  );
}
