import {
  summaryActionButtonStyle,
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

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
        background: "linear-gradient(135deg, #fff7ed 0%, #f6f8fa 100%)",
        borderColor: "#bc4c00",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>Handoff export draft</strong>
        <p style={summaryMutedTextStyle}>
          Local browser-session export draft for a human operator handoff. This preview is not persisted by the backend and does not represent orchestration-owned handoff state.
        </p>
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
            style={summaryActionButtonStyle}
            onClick={onCopyDraft}
          >
            Copy handoff draft
          </button>
        ) : null}
      </div>
      <pre
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #d0d7de",
          background: "#ffffff",
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
