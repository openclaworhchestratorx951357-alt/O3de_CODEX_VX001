import type { CSSProperties } from "react";

import { mapAssetForgeToolbenchReviewPacket } from "../lib/assetForgeReviewPacketMapper";
import type { AssetForgeReviewPacketSource } from "../types/assetForgeReviewPacket";

type AssetForgeReviewPacketPanelProps = {
  packetData: unknown;
  packetSource: AssetForgeReviewPacketSource;
  packetCorridorLabel?: string;
  packetOriginRows?: Array<[label: string, value: string]>;
};

type ReviewPacketSection = {
  title: string;
  rows: Array<[label: string, value: string]>;
};

export default function AssetForgeReviewPacketPanel({
  packetData,
  packetSource,
  packetCorridorLabel,
  packetOriginRows,
}: AssetForgeReviewPacketPanelProps) {
  const packet = mapAssetForgeToolbenchReviewPacket(packetData, packetSource);
  const resolvedPacketCorridorLabel = packetCorridorLabel ?? defaultPacketCorridorLabel(packetSource);

  const sections: ReviewPacketSection[] = [
    {
      title: "Selected project",
      rows: [
        ["Project name", packet.selectedProject.projectName],
        ["Project root", packet.selectedProject.projectRoot],
        ["project.json", packet.selectedProject.projectJsonPath],
      ],
    },
    {
      title: "Selected platform",
      rows: [
        ["Platform", packet.selectedPlatform.platform],
        ["Cache path", packet.selectedPlatform.cachePath],
        ["Asset Catalog path", packet.selectedPlatform.assetCatalogPath],
      ],
    },
    {
      title: "Source asset evidence",
      rows: [
        ["Original source path", packet.sourceEvidence.originalSourcePath],
        ["Normalized source path", packet.sourceEvidence.normalizedSourcePath],
        ["Source id", packet.sourceEvidence.sourceId],
        ["Source guid", packet.sourceEvidence.sourceGuid],
        ["Source exists", packet.sourceEvidence.sourceExists],
        ["Source is file", packet.sourceEvidence.sourceIsFile],
      ],
    },
    {
      title: "Product asset evidence",
      rows: [
        ["Product path", packet.productEvidence.productPath],
        ["Product id", packet.productEvidence.productId],
        ["Product sub id", packet.productEvidence.productSubId],
        ["Product count", packet.productEvidence.productCount],
        ["Evidence available", packet.productEvidence.evidenceAvailable],
      ],
    },
    {
      title: "Dependency evidence",
      rows: [
        ["Dependency count", packet.dependencyEvidence.dependencyCount],
        ["Evidence available", packet.dependencyEvidence.evidenceAvailable],
      ],
    },
    {
      title: "Catalog evidence",
      rows: [
        ["Catalog presence", packet.catalogEvidence.catalogPresence],
        ["Catalog product-path count", packet.catalogEvidence.catalogProductPathCount],
      ],
    },
    {
      title: "Freshness and readback status",
      rows: [
        ["Readback status", packet.readbackStatus],
        ["Packet resolution", packet.packetResolutionLabel],
        ["Readiness status", packet.readinessStatus],
        ["Proof status", packet.proofStatus],
        ["Asset DB freshness", packet.freshnessStatus.assetDatabaseFreshness],
        ["Asset Catalog freshness", packet.freshnessStatus.assetCatalogFreshness],
        ["Packet resolution detail", packet.packetResolutionDetail],
      ],
    },
    {
      title: "Mutation flags and next step",
      rows: [
        ["Read only", packet.mutationFlags.readOnly],
        ["Mutation occurred", packet.mutationFlags.mutationOccurred],
        ["Safest next step", packet.safestNextStep],
        ["Operator approval state", packet.operatorApprovalState],
      ],
    },
    {
      title: "Unavailable or unknown fields",
      rows: [
        ["License status", packet.unavailableFields.licenseStatus],
        ["Quality status", packet.unavailableFields.qualityStatus],
        ["Placement readiness", packet.unavailableFields.placementReadiness],
        ["Production approval", packet.unavailableFields.productionApproval],
      ],
    },
  ];

  if (packetOriginRows && packetOriginRows.length > 0) {
    sections.splice(2, 0, {
      title: "Packet origin and Records route",
      rows: packetOriginRows,
    });
  }

  return (
    <section style={panelStyle} aria-label="Forge operator review packet">
      <div style={headerStyle}>
        <div>
          <span style={eyebrowStyle}>Operator review packet</span>
          <strong style={titleStyle}>Phase 9 readback evidence for Toolbench review</strong>
          <p style={mutedParagraphStyle}>
            Read-only summary of the current review packet contract fields. This panel does not execute generation,
            import, staging, assignment, or placement.
          </p>
        </div>
        <div style={sourcePillStackStyle}>
          <span style={sourcePillStyle}>{packet.dataSourceLabel}</span>
          <span style={corridorPillStyle} aria-label="Review packet corridor">
            Corridor: {resolvedPacketCorridorLabel}
          </span>
        </div>
      </div>

      <div style={capabilityStripStyle} aria-label="Forge review packet identity">
        <span><strong>Capability</strong>{packet.capability}</span>
        <span><strong>Contract</strong>{packet.contractVersion}</span>
        <span><strong>Resolution</strong>{packet.packetResolutionState}</span>
      </div>

      <div style={sectionGridStyle}>
        {sections.map((section) => (
          <article key={section.title} style={sectionCardStyle}>
            <strong>{section.title}</strong>
            <dl style={rowGridStyle}>
              {section.rows.map(([label, value]) => (
                <div key={label} style={rowStyle}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      <div style={auxGridStyle}>
        <section style={auxCardStyle} aria-label="Forge review packet warnings">
          <strong>Warnings</strong>
          {packet.warnings.length > 0 ? (
            <ul style={listStyle}>
              {packet.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p style={mutedParagraphStyle}>No packet warnings were provided.</p>
          )}
        </section>
        <section style={auxCardStyle} aria-label="Forge blocked or missing guidance">
          <strong>Blocked or missing guidance</strong>
          <dl style={rowGridStyle}>
            <div style={rowStyle}>
              <dt>Blocked reason</dt>
              <dd>{packet.blockedReason}</dd>
            </div>
            <div style={rowStyle}>
              <dt>Missing substrate guidance</dt>
              <dd>{packet.missingSubstrateGuidance}</dd>
            </div>
          </dl>
        </section>
      </div>
    </section>
  );
}

function defaultPacketCorridorLabel(packetSource: AssetForgeReviewPacketSource): string {
  switch (packetSource) {
    case "live_phase9_packet_data":
      return "Live payload origin unresolved";
    case "existing_frontend_packet_data":
      return "Existing frontend payload";
    case "typed_fixture_data":
    default:
      return "Fixture preview";
  }
}

const panelStyle = {
  display: "grid",
  gap: 12,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "start",
} satisfies CSSProperties;

const titleStyle = {
  display: "block",
  fontSize: 17,
  lineHeight: 1.2,
} satisfies CSSProperties;

const eyebrowStyle = {
  display: "block",
  marginBottom: 4,
  color: "var(--app-subtle-color)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  lineHeight: 1.2,
  textTransform: "uppercase",
} satisfies CSSProperties;

const sourcePillStyle = {
  display: "inline-flex",
  width: "fit-content",
  alignItems: "center",
  padding: "6px 10px",
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-pill-radius)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const sourcePillStackStyle = {
  display: "grid",
  gap: 6,
  justifyItems: "end",
} satisfies CSSProperties;

const corridorPillStyle = {
  display: "inline-flex",
  width: "fit-content",
  alignItems: "center",
  padding: "4px 9px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-muted-color)",
  fontSize: 11,
  fontWeight: 700,
} satisfies CSSProperties;

const capabilityStripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 8,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const sectionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const sectionCardStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const rowGridStyle = {
  display: "grid",
  gap: 6,
  margin: 0,
} satisfies CSSProperties;

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(130px, 0.75fr) minmax(0, 1fr)",
  gap: 8,
  margin: 0,
  color: "var(--app-muted-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const auxGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 8,
} satisfies CSSProperties;

const auxCardStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const listStyle = {
  margin: 0,
  paddingLeft: 18,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;

const mutedParagraphStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;
