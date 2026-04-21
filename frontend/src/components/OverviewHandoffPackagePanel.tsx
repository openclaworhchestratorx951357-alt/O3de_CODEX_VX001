import { getPanelControlGuide, getPanelGuide } from "../content/operatorGuide";
import PanelGuideDetails from "./PanelGuideDetails";
import {
  summaryBadgeStyle,
  summaryMutedTextStyle,
  summarySectionStyle,
} from "./summaryPrimitives";

const overviewHandoffPackageGuide = getPanelGuide("overview-handoff-package");
const overviewHandoffPackageEntryControlGuide = getPanelControlGuide("overview-handoff-package", "package-entry");

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

function renderEntry(entry: OverviewHandoffPackageEntry, included: boolean) {
  return (
    <div
      key={entry.id}
      title={overviewHandoffPackageEntryControlGuide.tooltip}
      style={{
        border: "1px solid var(--app-panel-border)",
        borderRadius: "var(--app-card-radius)",
        padding: 12,
        background: "var(--app-panel-bg)",
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={summaryBadgeStyle}>{entry.laneLabel}</span>
        <span
          style={{
            ...summaryBadgeStyle,
            borderColor: included ? "var(--app-success-border)" : "var(--app-warning-border)",
            background: included ? "var(--app-success-bg)" : "var(--app-warning-bg)",
            color: included ? "var(--app-success-text)" : "var(--app-warning-text)",
          }}
        >
          {included ? "included" : "excluded"}
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
        background: "linear-gradient(135deg, var(--app-accent-soft) 0%, var(--app-panel-bg-muted) 100%)",
        borderColor: "var(--app-accent-strong)",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <strong>Local handoff package preview</strong>
        <p style={summaryMutedTextStyle}>
          Browser-session preview of which saved contexts would be included in a strong local handoff package right now. This does not create backend persistence or imply operator handoff storage.
        </p>
        <PanelGuideDetails
          tooltip={overviewHandoffPackageGuide.tooltip}
          checklist={overviewHandoffPackageGuide.checklist}
        />
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
          {includedEntries.length > 0 ? includedEntries.map((entry) => renderEntry(entry, true)) : (
            <p style={summaryMutedTextStyle}>
              No saved contexts currently meet the local readiness checks for inclusion.
            </p>
          )}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <strong>Excluded for follow-up</strong>
          {excludedEntries.length > 0 ? excludedEntries.map((entry) => renderEntry(entry, false)) : (
            <p style={summaryMutedTextStyle}>
              Nothing is currently excluded by the local browser-session readiness checks.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
