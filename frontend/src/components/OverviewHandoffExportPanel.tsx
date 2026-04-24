import { getShellPanelControlGuide, getShellPanelGuide } from "../content/operatorGuideShell";
import PanelGuideDetails from "./PanelGuideDetails";
import {
  summaryActionButtonStyle,
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

const overviewHandoffExportGuide = getShellPanelGuide("overview-handoff-export");
const overviewHandoffExportCopyControlGuide = getShellPanelControlGuide("overview-handoff-export", "copy-draft");
const overviewHandoffExportPreviewControlGuide = getShellPanelControlGuide("overview-handoff-export", "draft-preview");

type OverviewHandoffExportEntry = {
  id: string;
  laneLabel: string;
  focusLabel: string;
  detail: string;
  provenanceLabel: string;
  provenanceDetail: string;
};

type OverviewHandoffExportPanelProps = {
  generatedAtLabel: string;
  includedEntries: OverviewHandoffExportEntry[];
  excludedEntries: OverviewHandoffExportEntry[];
  draftText: string;
  statusLabel?: string | null;
  statusDetail?: string | null;
  onCopyDraft?: (() => void) | null;
};

export default function OverviewHandoffExportPanel({
  generatedAtLabel,
  includedEntries,
  excludedEntries,
  draftText,
  statusLabel,
  statusDetail,
  onCopyDraft,
}: OverviewHandoffExportPanelProps) {
  if (includedEntries.length === 0 && excludedEntries.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        ...summarySectionStyle,
        display: "grid",
        gap: 12,
        marginBottom: 24,
        background: "linear-gradient(135deg, var(--app-simulated-bg) 0%, var(--app-panel-bg-muted) 100%)",
        borderColor: "var(--app-simulated-border)",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>Handoff export draft</strong>
        <p style={summaryMutedTextStyle}>
          Local browser-session export draft for a human operator handoff. This preview is not persisted by the backend and does not represent orchestration-owned handoff state.
        </p>
        <PanelGuideDetails
          tooltip={overviewHandoffExportGuide.tooltip}
          checklist={overviewHandoffExportGuide.checklist}
        />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={summaryBadgeStyle}>{generatedAtLabel}</span>
        <span style={summaryBadgeStyle}>included: {includedEntries.length}</span>
        <span style={summaryBadgeStyle}>excluded: {excludedEntries.length}</span>
      </div>
      {statusLabel ? (
        <div style={{ display: "grid", gap: 4 }}>
          <span style={summaryBadgeStyle}>{statusLabel}</span>
          {statusDetail ? <p style={summaryMutedTextStyle}>{statusDetail}</p> : null}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {onCopyDraft ? (
          <button
            type="button"
            title={overviewHandoffExportCopyControlGuide.tooltip}
            style={summaryActionButtonStyle}
            onClick={onCopyDraft}
          >
            Copy handoff draft
          </button>
        ) : null}
      </div>
      <pre
        title={overviewHandoffExportPreviewControlGuide.tooltip}
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 10,
          border: "1px solid var(--app-panel-border)",
          background: "var(--app-panel-bg)",
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {draftText}
      </pre>
    </section>
  );
}
