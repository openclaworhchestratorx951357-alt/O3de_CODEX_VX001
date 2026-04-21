import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import PanelGuideDetails from "./PanelGuideDetails";
import {
  summaryActionButtonStyle,
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

const overviewAttentionGuide = getPanelGuide("overview-attention");
const overviewAttentionCardControlGuide = getPanelControlGuide("overview-attention", "recommendation-card");
const overviewAttentionActionControlGuide = getPanelControlGuide("overview-attention", "action-buttons");

type OverviewAttentionEntry = {
  id: string;
  label: string;
  detail: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string | null;
};

type OverviewAttentionPanelProps = {
  entries: OverviewAttentionEntry[];
  onPrimaryAction: (entryId: string) => void;
  onSecondaryAction?: ((entryId: string) => void) | null;
};

export default function OverviewAttentionPanel({
  entries,
  onPrimaryAction,
  onSecondaryAction,
}: OverviewAttentionPanelProps) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 12,
        marginBottom: 24,
        background: "linear-gradient(135deg, var(--app-danger-bg) 0%, var(--app-panel-bg-muted) 100%)",
        borderColor: "var(--app-danger-border)",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>Attention recommendations</strong>
        <p style={summaryMutedTextStyle}>
          Local dashboard recommendations based on browser-session review state and current persisted records. These recommendations do not come from backend orchestration.
        </p>
        <PanelGuideDetails
          tooltip={overviewAttentionGuide.tooltip}
          checklist={overviewAttentionGuide.checklist}
        />
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            title={overviewAttentionCardControlGuide.tooltip}
            style={{
              border: "1px solid var(--app-panel-border)",
              borderRadius: 10,
              padding: 12,
              background: "var(--app-panel-bg)",
              display: "grid",
              gap: 8,
            }}
          >
            <span style={summaryBadgeStyle}>{entry.label}</span>
            <p style={summaryMutedTextStyle}>{entry.detail}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                title={overviewAttentionActionControlGuide.tooltip}
                style={summaryActionButtonStyle}
                onClick={() => onPrimaryAction(entry.id)}
              >
                {entry.primaryActionLabel}
              </button>
              {entry.secondaryActionLabel && onSecondaryAction ? (
                <button
                  type="button"
                  title={overviewAttentionActionControlGuide.tooltip}
                  style={summaryActionButtonStyle}
                  onClick={() => onSecondaryAction(entry.id)}
                >
                  {entry.secondaryActionLabel}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
