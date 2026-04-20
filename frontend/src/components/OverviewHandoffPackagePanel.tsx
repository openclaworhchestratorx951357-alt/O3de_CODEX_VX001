import {
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

type OverviewHandoffPackageEntry = {
  id: string;
  laneLabel: string;
  focusLabel: string;
  detail: string;
  provenanceLabel: string;
  provenanceDetail: string;
};

type OverviewHandoffPackagePanelProps = {
  includedEntries: OverviewHandoffPackageEntry[];
  excludedEntries: OverviewHandoffPackageEntry[];
};

function renderEntry(entry: OverviewHandoffPackageEntry, accentColor: string, accentBackground: string) {
  return (
    <div
      key={entry.id}
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 10,
        padding: 12,
        background: "#ffffff",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={summaryBadgeStyle}>{entry.laneLabel}</span>
        <span
          style={{
            ...summaryBadgeStyle,
            borderColor: accentColor,
            background: accentBackground,
          }}
        >
          {accentColor === "#1a7f37" ? "included" : "excluded"}
        </span>
      </div>
      <strong>{entry.focusLabel}</strong>
      <p style={summaryMutedTextStyle}>{entry.detail}</p>
      <div style={{ display: "grid", gap: 4 }}>
        <span style={summaryBadgeStyle}>{entry.provenanceLabel}</span>
        <p style={summaryMutedTextStyle}>{entry.provenanceDetail}</p>
      </div>
    </div>
  );
}

export default function OverviewHandoffPackagePanel({
  includedEntries,
  excludedEntries,
}: OverviewHandoffPackagePanelProps) {
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
        background: "linear-gradient(135deg, #eef7ff 0%, #f6f8fa 100%)",
        borderColor: "#0969da",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>Local handoff package preview</strong>
        <p style={summaryMutedTextStyle}>
          Browser-session preview of which saved contexts would be included in a strong local handoff package right now. This does not create backend persistence or imply operator handoff storage.
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={summaryBadgeStyle}>included: {includedEntries.length}</span>
        <span style={summaryBadgeStyle}>excluded: {excludedEntries.length}</span>
      </div>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <strong>Included now</strong>
          {includedEntries.length > 0 ? includedEntries.map((entry) => renderEntry(entry, "#1a7f37", "#dafbe1")) : (
            <p style={summaryMutedTextStyle}>
              No saved contexts currently meet the local readiness checks for inclusion.
            </p>
          )}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <strong>Excluded for follow-up</strong>
          {excludedEntries.length > 0 ? excludedEntries.map((entry) => renderEntry(entry, "#bf8700", "#fff8c5")) : (
            <p style={summaryMutedTextStyle}>
              Nothing is currently excluded by the local browser-session readiness checks.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
