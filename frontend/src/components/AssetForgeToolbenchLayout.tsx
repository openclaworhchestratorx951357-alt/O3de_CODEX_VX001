import { useMemo, useState, type CSSProperties } from "react";

import AssetForgeReviewPacketPanel from "./AssetForgeReviewPacketPanel";
import { mapAssetForgeToolbenchReviewPacket } from "../lib/assetForgeReviewPacketMapper";
import type { AssetForgeReviewPacketSource } from "../types/assetForgeReviewPacket";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

type GateState =
  | "read-only"
  | "local preview"
  | "plan-only"
  | "proof-only"
  | "requires approval"
  | "blocked"
  | "not admitted";

type WorkspaceRow = {
  label: string;
  gate: GateState;
  detail: string;
};

type ToolRow = {
  label: string;
  gate: GateState;
  detail: string;
};

type OutlinerSection = {
  label: string;
  gate: GateState;
  nodes: string[];
};

type EvidenceTab = "Timeline" | "Status board" | "Review packet";

type AssetForgeToolbenchLayoutProps = {
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  reviewPacketData: unknown;
  reviewPacketSource: AssetForgeReviewPacketSource;
};

const UNKNOWN_VALUE = "Unknown / unavailable";
const defaultCommandDraft =
  "Create a weathered modular bridge segment with ivy accents and capture evidence-only review steps.";

const topMenuRows = [
  "File",
  "Edit",
  "Create",
  "Assets",
  "Entity",
  "Components",
  "Materials",
  "Lighting",
  "Camera",
  "Review",
  "Help",
] as const;

const workspaceRows: WorkspaceRow[] = [
  { label: "Forge", gate: "proof-only", detail: "Prompt planning and review packet context." },
  { label: "Model", gate: "local preview", detail: "Modeling controls remain local Toolbench preview." },
  { label: "Materials", gate: "requires approval", detail: "Material authoring remains gated until admitted." },
  { label: "Lighting", gate: "plan-only", detail: "Lighting adjustments are planning notes only." },
  { label: "Animation", gate: "plan-only", detail: "Animation workspace is planning-only in this slice." },
  { label: "Physics", gate: "not admitted", detail: "Physics mutations are not admitted." },
  { label: "Cinematic", gate: "plan-only", detail: "Cinematic controls remain planning-only." },
  { label: "Review", gate: "proof-only", detail: "Readback and operator packet evidence corridor." },
  { label: "Export", gate: "blocked", detail: "Export corridor remains blocked until explicitly admitted." },
];

const toolRows: ToolRow[] = [
  { label: "Select", gate: "read-only", detail: "Inspect and select preview entities." },
  { label: "Move", gate: "blocked", detail: "Transform mutation is blocked in this slice." },
  { label: "Rotate", gate: "blocked", detail: "Transform mutation is blocked in this slice." },
  { label: "Scale", gate: "blocked", detail: "Transform mutation is blocked in this slice." },
  { label: "Snap", gate: "local preview", detail: "Snap guidance is local Toolbench preview only." },
  { label: "Measure", gate: "local preview", detail: "Measure overlay stays local to the UI." },
  { label: "Orbit", gate: "local preview", detail: "Viewport orbit control is local preview only." },
  { label: "Camera", gate: "local preview", detail: "Camera framing controls are preview-only." },
  { label: "Light", gate: "requires approval", detail: "Lighting mutation requires future admission." },
  { label: "Entity", gate: "requires approval", detail: "Entity authoring requires admitted corridors." },
  { label: "Component", gate: "not admitted", detail: "Component mutation is not admitted." },
  { label: "Material", gate: "not admitted", detail: "Material mutation is not admitted." },
  { label: "Collision", gate: "not admitted", detail: "Collision mutation is not admitted." },
];

const outlinerSections: OutlinerSection[] = [
  { label: "Level Root", gate: "local preview", nodes: ["BridgeTrainingLevel", "GameplayRoot", "EnvironmentRoot"] },
  { label: "Cameras", gate: "local preview", nodes: ["EditorCamera_Main", "PreviewCamera_Cinematic"] },
  { label: "Lights", gate: "plan-only", nodes: ["KeyLight", "FillLight", "RimLight"] },
  { label: "Asset Candidates", gate: "proof-only", nodes: ["bridge_segment_candidate_a", "bridge_segment_candidate_b"] },
  { label: "Review Targets", gate: "proof-only", nodes: ["asset_readback_review_packet", "catalog_evidence_summary"] },
  { label: "Generated Preview Candidate", gate: "requires approval", nodes: ["bridge_segment_preview_001"] },
  { label: "O3DE Import Review", gate: "blocked", nodes: ["source staging blocked", "asset processor execution blocked"] },
];

const timelineRows: Array<{ label: string; gate: GateState; detail: string }> = [
  { label: "Prompt drafted", gate: "local preview", detail: "Natural-language intent captured in Toolbench command strip." },
  { label: "Typed plan prepared", gate: "plan-only", detail: "Typed adapter request planned with no execution." },
  { label: "Readback evidence", gate: "proof-only", detail: "Phase 9 readback evidence mapped into review packet." },
  { label: "Operator review", gate: "requires approval", detail: "Review packet awaits operator decision." },
  { label: "Mutation corridors", gate: "blocked", detail: "Generation/import/staging/placement remain blocked." },
];

function ensureDisplayValue(value: string | null | undefined): string {
  if (!value) {
    return UNKNOWN_VALUE;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : UNKNOWN_VALUE;
}

function gateToneStyle(gate: GateState): CSSProperties {
  switch (gate) {
    case "read-only":
      return {
        border: "1px solid var(--app-success-border)",
        background: "var(--app-success-bg)",
        color: "var(--app-success-text)",
      };
    case "local preview":
      return {
        border: "1px solid var(--app-info-border)",
        background: "var(--app-info-bg)",
        color: "var(--app-info-text)",
      };
    case "plan-only":
      return {
        border: "1px solid var(--app-panel-border)",
        background: "var(--app-panel-bg-muted)",
        color: "var(--app-text-color)",
      };
    case "proof-only":
      return {
        border: "1px solid color-mix(in srgb, var(--app-accent-strong) 45%, var(--app-panel-border) 55%)",
        background: "color-mix(in srgb, var(--app-accent-soft) 42%, var(--app-panel-bg) 58%)",
        color: "var(--app-text-color)",
      };
    case "requires approval":
      return {
        border: "1px solid var(--app-warning-border)",
        background: "var(--app-warning-bg)",
        color: "var(--app-warning-text)",
      };
    case "blocked":
    case "not admitted":
    default:
      return {
        border: "1px solid color-mix(in srgb, var(--app-danger-border) 75%, var(--app-panel-border) 25%)",
        background: "color-mix(in srgb, var(--app-danger-bg) 78%, var(--app-panel-bg) 22%)",
        color: "var(--app-danger-text)",
      };
  }
}

function GateBadge({ gate }: { gate: GateState }) {
  return (
    <span style={{ ...gateBadgeStyle, ...gateToneStyle(gate) }}>
      {gate}
    </span>
  );
}

export default function AssetForgeToolbenchLayout({
  projectProfile,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenBuilder,
  reviewPacketData,
  reviewPacketSource,
}: AssetForgeToolbenchLayoutProps) {
  const [activeMenu, setActiveMenu] = useState<(typeof topMenuRows)[number]>("File");
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceRow["label"]>("Forge");
  const [activeTool, setActiveTool] = useState<ToolRow["label"]>("Select");
  const [activeOutlinerSection, setActiveOutlinerSection] = useState<OutlinerSection["label"]>("Asset Candidates");
  const [activeNavigationControl, setActiveNavigationControl] = useState<"Orbit" | "Pan" | "Zoom">("Orbit");
  const [activeCameraMode, setActiveCameraMode] = useState<"Perspective" | "Orthographic">("Perspective");
  const [activeLightingMode, setActiveLightingMode] = useState<"Lit" | "Wireframe" | "Proof">("Lit");
  const [viewportZoom, setViewportZoom] = useState(72);
  const [activeAssetCategory, setActiveAssetCategory] = useState<
    | "Source Assets"
    | "Product Assets"
    | "Materials"
    | "Textures"
    | "Prefabs"
    | "Cameras"
    | "Lights"
    | "Review Packets"
  >("Source Assets");
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<EvidenceTab>("Status board");
  const [timelineCursor, setTimelineCursor] = useState(2);
  const [commandDraft, setCommandDraft] = useState(defaultCommandDraft);

  const packet = useMemo(
    () => mapAssetForgeToolbenchReviewPacket(reviewPacketData, reviewPacketSource),
    [reviewPacketData, reviewPacketSource],
  );

  const activeWorkspaceRow = workspaceRows.find((row) => row.label === activeWorkspace) ?? workspaceRows[0];

  const assetBrowserRows: Record<typeof activeAssetCategory, string[]> = {
    "Source Assets": [
      ensureDisplayValue(packet.sourceEvidence.normalizedSourcePath),
      "Assets/Bridge/bridge_segment_source.fbx",
      "Assets/Bridge/bridge_segment_reference.png",
    ],
    "Product Assets": [
      ensureDisplayValue(packet.productEvidence.productPath),
      "Cache/pc/bridge_segment.azmodel",
      "Cache/pc/bridge_segment.procprefab",
    ],
    Materials: [
      "Materials/bridge_segment_shell.azmaterial",
      "Materials/bridge_segment_metal.azmaterial",
      UNKNOWN_VALUE,
    ],
    Textures: [
      "Textures/bridge_segment_albedo.png",
      "Textures/bridge_segment_normal.png",
      "Textures/bridge_segment_roughness.png",
    ],
    Prefabs: [
      "Prefabs/bridge_segment_preview.prefab",
      UNKNOWN_VALUE,
      "Prefabs/review_packet_targets.prefab",
    ],
    Cameras: ["EditorCamera_Main", "PreviewCamera_Cinematic", "AssetReviewCamera_01"],
    Lights: ["KeyLight", "FillLight", "RimLight"],
    "Review Packets": [
      ensureDisplayValue(packet.contractVersion),
      ensureDisplayValue(packet.readbackStatus),
      ensureDisplayValue(packet.operatorApprovalState),
    ],
  };

  const inspectorSections: Array<{ title: string; rows: Array<[string, string]> }> = [
    {
      title: "Selection",
      rows: [
        ["Workspace", activeWorkspace],
        ["Selected tool", activeTool],
        ["Outliner focus", activeOutlinerSection],
      ],
    },
    {
      title: "Transform",
      rows: [
        ["Position", UNKNOWN_VALUE],
        ["Rotation", UNKNOWN_VALUE],
        ["Scale", UNKNOWN_VALUE],
      ],
    },
    {
      title: "Asset readiness",
      rows: [
        ["Readiness status", ensureDisplayValue(packet.readinessStatus)],
        ["Proof status", ensureDisplayValue(packet.proofStatus)],
        ["Readback status", ensureDisplayValue(packet.readbackStatus)],
      ],
    },
    {
      title: "Source asset",
      rows: [
        ["Source path", ensureDisplayValue(packet.sourceEvidence.normalizedSourcePath)],
        ["Source guid", ensureDisplayValue(packet.sourceEvidence.sourceGuid)],
      ],
    },
    {
      title: "Product asset",
      rows: [
        ["Product path", ensureDisplayValue(packet.productEvidence.productPath)],
        ["Product count", ensureDisplayValue(packet.productEvidence.productCount)],
      ],
    },
    {
      title: "Material slots",
      rows: [
        ["Slot A", UNKNOWN_VALUE],
        ["Slot B", UNKNOWN_VALUE],
      ],
    },
    {
      title: "Texture dependencies",
      rows: [["Dependency count", ensureDisplayValue(packet.dependencyEvidence.dependencyCount)]],
    },
    {
      title: "Component readiness",
      rows: [["Component corridor", "Blocked until a later admitted corridor"]],
    },
    {
      title: "Collision readiness",
      rows: [["Collision corridor", "Not admitted"]],
    },
    {
      title: "O3DE import review",
      rows: [
        ["Asset Processor status", "Placeholder only - no execution in this slice"],
        ["Catalog evidence", ensureDisplayValue(packet.catalogEvidence.catalogPresence)],
      ],
    },
    {
      title: "Operator approval",
      rows: [
        ["Operator state", ensureDisplayValue(packet.operatorApprovalState)],
        ["Production approval", ensureDisplayValue(packet.unavailableFields.productionApproval)],
      ],
    },
  ];

  return (
    <section aria-label="Asset Forge Toolbench layout" style={toolbenchShellStyle}>
      <header style={headerStyle}>
        <div>
          <span style={eyebrowStyle}>O3DE AI Asset Forge</span>
          <strong style={titleStyle}>O3DE AI Asset Forge Toolbench</strong>
          <p style={mutedParagraphStyle}>
            Professional editor-style control surface with O3DE-native corridors, typed readback evidence,
            and operator review gating.
          </p>
        </div>
        <div style={headerBadgeColumnStyle}>
          <GateBadge gate="proof-only" />
          <span style={headerPillStyle}>Control-surface only: non-mutating</span>
        </div>
      </header>

      <section aria-label="Forge top application menu" style={topMenuBarStyle}>
        {topMenuRows.map((menuLabel) => (
          <button
            key={menuLabel}
            type="button"
            onClick={() => setActiveMenu(menuLabel)}
            aria-pressed={activeMenu === menuLabel}
            style={activeMenu === menuLabel ? activeMenuButtonStyle : menuButtonStyle}
          >
            {menuLabel}
          </button>
        ))}
      </section>

      <section aria-label="Forge active menu detail" style={menuDetailStyle}>
        <span>
          <strong>{activeMenu}</strong> menu is a local preview surface only.
        </span>
        <GateBadge gate="local preview" />
      </section>

      <section aria-label="Forge workspace strip" style={workspaceStripStyle}>
        {workspaceRows.map((workspace) => (
          <button
            key={workspace.label}
            type="button"
            role="tab"
            aria-selected={activeWorkspace === workspace.label}
            onClick={() => setActiveWorkspace(workspace.label)}
            style={activeWorkspace === workspace.label ? activeWorkspaceTabStyle : workspaceTabStyle}
          >
            <span>{workspace.label}</span>
            <GateBadge gate={workspace.gate} />
          </button>
        ))}
      </section>

      <section aria-label="Forge workspace focus" style={workspaceFocusStyle}>
        <span>
          <strong>Workspace focus:</strong> {activeWorkspaceRow.label}
        </span>
        <span>{activeWorkspaceRow.detail}</span>
      </section>

      <div style={mainWorkspaceGridStyle}>
        <aside aria-label="Forge left tool shelf" style={toolShelfStyle}>
          {toolRows.map((tool) => (
            <button
              key={tool.label}
              type="button"
              onClick={() => setActiveTool(tool.label)}
              aria-pressed={activeTool === tool.label}
              title={tool.detail}
              style={activeTool === tool.label ? activeToolShelfButtonStyle : toolShelfButtonStyle}
            >
              <span>{tool.label}</span>
              <GateBadge gate={tool.gate} />
            </button>
          ))}
        </aside>

        <aside aria-label="Forge scene and entity outliner" style={outlinerPanelStyle}>
          <div style={panelHeaderStyle}>
            <strong>Scene / Entity Outliner</strong>
            <GateBadge gate="local preview" />
          </div>
          <p style={mutedParagraphStyle}>Toolbench preview data - not authoritative live O3DE scene truth.</p>
          <div style={outlinerTreeStyle}>
            {outlinerSections.map((section) => (
              <article key={section.label} style={outlinerSectionStyle}>
                <button
                  type="button"
                  onClick={() => setActiveOutlinerSection(section.label)}
                  style={
                    activeOutlinerSection === section.label ? activeOutlinerSectionButtonStyle : outlinerSectionButtonStyle
                  }
                >
                  <span>{section.label}</span>
                  <GateBadge gate={section.gate} />
                </button>
                <ul style={outlinerNodesStyle}>
                  {section.nodes.map((node) => (
                    <li key={`${section.label}-${node}`}>{node}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </aside>

        <section aria-label="Forge viewport preview" style={viewportPanelStyle}>
          <div style={viewportHeaderStyle}>
            <strong>Viewport</strong>
            <span>{activeCameraMode} | {activeLightingMode} | EditorCamera_Main</span>
          </div>
          <div style={viewportControlRowStyle}>
            <div style={segmentedRowStyle} aria-label="Viewport camera mode">
              {(["Perspective", "Orthographic"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveCameraMode(mode)}
                  aria-pressed={activeCameraMode === mode}
                  style={activeCameraMode === mode ? activeSegmentButtonStyle : segmentButtonStyle}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div style={segmentedRowStyle} aria-label="Viewport lighting mode">
              {(["Lit", "Wireframe", "Proof"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveLightingMode(mode)}
                  aria-pressed={activeLightingMode === mode}
                  style={activeLightingMode === mode ? activeSegmentButtonStyle : segmentButtonStyle}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div style={segmentedRowStyle} aria-label="Viewport navigation tools">
              {(["Orbit", "Pan", "Zoom"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveNavigationControl(mode)}
                  aria-pressed={activeNavigationControl === mode}
                  style={activeNavigationControl === mode ? activeSegmentButtonStyle : segmentButtonStyle}
                >
                  {mode}
                </button>
              ))}
            </div>
            <label style={rangeLabelStyle}>
              Zoom
              <input
                type="range"
                min={45}
                max={120}
                value={viewportZoom}
                onChange={(event) => setViewportZoom(Number(event.currentTarget.value))}
                style={rangeInputStyle}
              />
            </label>
          </div>
          <div style={viewportCanvasStyle}>
            <div style={horizonLineStyle} />
            <div style={axisLineXStyle} />
            <div style={axisLineYStyle} />
            <div style={gridFloorStyle} />
            <div style={orientationGizmoStyle}>XYZ</div>
            <div style={selectedAssetCardStyle}>
              <strong>Selected preview candidate</strong>
              <span>bridge_segment_preview_001</span>
              <span>Navigation mode: {activeNavigationControl}</span>
              <span>Zoom: {viewportZoom}%</span>
            </div>
            <div style={viewportTruthLabelStyle}>Toolbench viewport preview — not a live O3DE render</div>
          </div>
        </section>

        <aside aria-label="Forge properties inspector" style={inspectorPanelStyle}>
          <div style={panelHeaderStyle}>
            <strong>Properties / Inspector</strong>
            <GateBadge gate="read-only" />
          </div>
          <dl style={inspectorProjectStripStyle}>
            <div style={inspectorRowStyle}>
              <dt>Project</dt>
              <dd>{projectProfile?.name ?? ensureDisplayValue(packet.selectedProject.projectName)}</dd>
            </div>
            <div style={inspectorRowStyle}>
              <dt>Project root</dt>
              <dd>{projectProfile?.projectRoot ?? ensureDisplayValue(packet.selectedProject.projectRoot)}</dd>
            </div>
          </dl>
          <div style={inspectorSectionsStyle}>
            {inspectorSections.map((section) => (
              <article key={section.title} style={inspectorSectionStyle}>
                <strong>{section.title}</strong>
                <dl style={inspectorSectionRowsStyle}>
                  {section.rows.map(([label, value]) => (
                    <div key={label} style={inspectorRowStyle}>
                      <dt>{label}</dt>
                      <dd>{ensureDisplayValue(value)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </aside>
      </div>

      <section aria-label="Forge command strip" style={commandStripStyle}>
        <div style={panelHeaderStyle}>
          <strong>Command / Prompt strip</strong>
          <GateBadge gate="plan-only" />
        </div>
        <label style={commandLabelStyle}>
          Natural-language command draft (local preview)
          <textarea
            value={commandDraft}
            onChange={(event) => setCommandDraft(event.currentTarget.value)}
            rows={3}
            style={commandTextAreaStyle}
          />
        </label>
        <div style={commandButtonRowStyle}>
          <button
            type="button"
            onClick={onOpenPromptStudio}
            disabled={!onOpenPromptStudio}
            style={onOpenPromptStudio ? primaryButtonStyle : disabledButtonStyle}
          >
            Send to Prompt Studio
          </button>
          <button
            type="button"
            onClick={onOpenRuntimeOverview}
            disabled={!onOpenRuntimeOverview}
            style={onOpenRuntimeOverview ? secondaryButtonStyle : disabledButtonStyle}
          >
            Open Runtime
          </button>
          <button
            type="button"
            onClick={onOpenBuilder}
            disabled={!onOpenBuilder}
            style={onOpenBuilder ? secondaryButtonStyle : disabledButtonStyle}
          >
            Open Builder
          </button>
          <button
            type="button"
            onClick={() => setActiveEvidenceTab("Review packet")}
            style={secondaryButtonStyle}
          >
            Review Evidence
          </button>
          <button type="button" disabled title="Entity placement is not admitted in this slice." style={disabledButtonStyle}>
            Place candidate in level
          </button>
          <button type="button" disabled title="Asset Processor execution is blocked in this slice." style={disabledButtonStyle}>
            Execute Asset Processor
          </button>
        </div>
        <p style={mutedParagraphStyle}>
          Command strip does not execute generation or editor mutation directly.
        </p>
      </section>

      <section aria-label="Forge asset browser" style={assetBrowserStyle}>
        <div style={panelHeaderStyle}>
          <strong>Asset browser / content drawer</strong>
          <GateBadge gate="read-only" />
        </div>
        <p style={mutedParagraphStyle}>Sample/preview data only until live artifact plumbing is wired.</p>
        <div style={assetCategoryStripStyle}>
          {(Object.keys(assetBrowserRows) as Array<keyof typeof assetBrowserRows>).map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveAssetCategory(category)}
              aria-pressed={activeAssetCategory === category}
              style={activeAssetCategory === category ? activeCategoryButtonStyle : categoryButtonStyle}
            >
              {category}
            </button>
          ))}
        </div>
        <ul style={assetListStyle}>
          {assetBrowserRows[activeAssetCategory].map((item, index) => (
            <li key={`${activeAssetCategory}-${index + 1}`}>{ensureDisplayValue(item)}</li>
          ))}
        </ul>
      </section>

      <section aria-label="Forge timeline evidence status" style={bottomRegionStyle}>
        <div style={panelHeaderStyle}>
          <strong>Timeline / Evidence / Status</strong>
          <GateBadge gate="proof-only" />
        </div>
        <div style={timelineStripStyle} aria-label="Forge timeline strip">
          {timelineRows.map((row, index) => (
            <button
              key={row.label}
              type="button"
              onClick={() => setTimelineCursor(index)}
              aria-pressed={timelineCursor === index}
              style={timelineCursor === index ? activeTimelineButtonStyle : timelineButtonStyle}
            >
              <span>{row.label}</span>
              <GateBadge gate={row.gate} />
            </button>
          ))}
        </div>

        <div style={evidenceTabStripStyle}>
          {(["Timeline", "Status board", "Review packet"] as EvidenceTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeEvidenceTab === tab}
              onClick={() => setActiveEvidenceTab(tab)}
              style={activeEvidenceTab === tab ? activeEvidenceTabStyle : evidenceTabStyle}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeEvidenceTab === "Timeline" ? (
          <article style={statusBoardStyle} aria-label="Forge timeline detail">
            <strong>{timelineRows[timelineCursor].label}</strong>
            <p style={mutedParagraphStyle}>{timelineRows[timelineCursor].detail}</p>
            <GateBadge gate={timelineRows[timelineCursor].gate} />
          </article>
        ) : null}

        {activeEvidenceTab === "Status board" ? (
          <div style={statusCardGridStyle}>
            <article style={statusCardStyle}>
              <strong>Review packet status</strong>
              <span>{ensureDisplayValue(packet.readbackStatus)}</span>
              <span>{ensureDisplayValue(packet.proofStatus)}</span>
            </article>
            <article style={statusCardStyle}>
              <strong>Asset Processor status placeholder</strong>
              <span>No execution in this control-surface slice</span>
              <GateBadge gate="blocked" />
            </article>
            <article style={statusCardStyle}>
              <strong>Catalog evidence status</strong>
              <span>Presence: {ensureDisplayValue(packet.catalogEvidence.catalogPresence)}</span>
              <span>Path count: {ensureDisplayValue(packet.catalogEvidence.catalogProductPathCount)}</span>
            </article>
            <article style={statusCardStyle}>
              <strong>Approval state</strong>
              <span>{ensureDisplayValue(packet.operatorApprovalState)}</span>
              <span>Production: {ensureDisplayValue(packet.unavailableFields.productionApproval)}</span>
            </article>
            <article style={statusCardStyle}>
              <strong>Blocked mutation list</strong>
              <ul style={statusListStyle}>
                <li>Generation corridor blocked</li>
                <li>Import and source staging blocked</li>
                <li>Asset Processor execution blocked</li>
                <li>Material and prefab mutation blocked</li>
                <li>Assignment and entity placement blocked</li>
              </ul>
            </article>
            <article style={statusCardStyle}>
              <strong>Safest next step</strong>
              <span>{ensureDisplayValue(packet.safestNextStep)}</span>
              <span>Missing substrate guidance: {ensureDisplayValue(packet.missingSubstrateGuidance)}</span>
            </article>
          </div>
        ) : null}

        {activeEvidenceTab === "Review packet" ? (
          <AssetForgeReviewPacketPanel
            packetData={reviewPacketData}
            packetSource={reviewPacketSource}
          />
        ) : null}
      </section>

      <section aria-label="Forge capability gate badges" style={gateLegendStyle}>
        {(["read-only", "local preview", "plan-only", "proof-only", "requires approval", "blocked", "not admitted"] as GateState[]).map(
          (gate) => (
            <span key={gate} style={gateLegendRowStyle}>
              <GateBadge gate={gate} />
            </span>
          ),
        )}
      </section>
    </section>
  );
}

const toolbenchShellStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background:
    "linear-gradient(160deg, color-mix(in srgb, var(--app-panel-bg-alt) 90%, var(--app-page-bg) 10%) 0%, color-mix(in srgb, var(--app-panel-bg) 96%, var(--app-page-bg) 4%) 100%)",
} satisfies CSSProperties;

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "start",
} satisfies CSSProperties;

const titleStyle = {
  display: "block",
  fontSize: 19,
  lineHeight: 1.2,
} satisfies CSSProperties;

const headerBadgeColumnStyle = {
  display: "grid",
  gap: 8,
  justifyItems: "end",
} satisfies CSSProperties;

const headerPillStyle = {
  display: "inline-flex",
  width: "fit-content",
  alignItems: "center",
  padding: "6px 10px",
  border: "1px solid var(--app-warning-border)",
  borderRadius: "var(--app-pill-radius)",
  background: "var(--app-warning-bg)",
  color: "var(--app-warning-text)",
  fontSize: 12,
  fontWeight: 800,
} satisfies CSSProperties;

const topMenuBarStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(74px, 1fr))",
  gap: 6,
  padding: 8,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const menuButtonStyle = {
  minHeight: 34,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
} satisfies CSSProperties;

const activeMenuButtonStyle = {
  ...menuButtonStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
} satisfies CSSProperties;

const menuDetailStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  padding: "8px 10px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const workspaceStripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 6,
  padding: 8,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const workspaceTabStyle = {
  display: "grid",
  gap: 6,
  justifyItems: "start",
  padding: "8px 10px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  textAlign: "left",
} satisfies CSSProperties;

const activeWorkspaceTabStyle = {
  ...workspaceTabStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "color-mix(in srgb, var(--app-info-bg) 84%, var(--app-panel-bg) 16%)",
} satisfies CSSProperties;

const workspaceFocusStyle = {
  display: "grid",
  gap: 4,
  padding: "8px 10px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const mainWorkspaceGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 92px) minmax(0, 1fr) minmax(0, 1.7fr) minmax(0, 1fr)",
  gap: 8,
  alignItems: "start",
} satisfies CSSProperties;

const toolShelfStyle = {
  display: "grid",
  gap: 6,
  alignContent: "start",
  padding: 8,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  minHeight: 540,
} satisfies CSSProperties;

const toolShelfButtonStyle = {
  display: "grid",
  gap: 5,
  justifyItems: "start",
  padding: "8px 6px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "left",
} satisfies CSSProperties;

const activeToolShelfButtonStyle = {
  ...toolShelfButtonStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "color-mix(in srgb, var(--app-info-bg) 80%, var(--app-panel-bg) 20%)",
} satisfies CSSProperties;

const outlinerPanelStyle = {
  display: "grid",
  gap: 8,
  alignContent: "start",
  minHeight: 540,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const panelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
} satisfies CSSProperties;

const outlinerTreeStyle = {
  display: "grid",
  gap: 7,
} satisfies CSSProperties;

const outlinerSectionStyle = {
  display: "grid",
  gap: 5,
  padding: 7,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const outlinerSectionButtonStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 6,
  border: "1px solid transparent",
  borderRadius: "var(--app-card-radius)",
  background: "transparent",
  color: "var(--app-text-color)",
  textAlign: "left",
  padding: 0,
  font: "inherit",
  cursor: "pointer",
} satisfies CSSProperties;

const activeOutlinerSectionButtonStyle = {
  ...outlinerSectionButtonStyle,
  border: "1px solid color-mix(in srgb, var(--app-info-border) 80%, transparent)",
  padding: "4px 6px",
  background: "color-mix(in srgb, var(--app-info-bg) 75%, transparent)",
} satisfies CSSProperties;

const outlinerNodesStyle = {
  margin: 0,
  paddingLeft: 16,
  color: "var(--app-muted-color)",
  lineHeight: 1.4,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const viewportPanelStyle = {
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  gap: 8,
  minHeight: 540,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const viewportHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const viewportControlRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 6,
} satisfies CSSProperties;

const segmentedRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))",
  gap: 4,
  alignItems: "stretch",
} satisfies CSSProperties;

const segmentButtonStyle = {
  minHeight: 32,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
} satisfies CSSProperties;

const activeSegmentButtonStyle = {
  ...segmentButtonStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
} satisfies CSSProperties;

const rangeLabelStyle = {
  display: "grid",
  gap: 4,
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 700,
} satisfies CSSProperties;

const rangeInputStyle = {
  width: "100%",
  accentColor: "var(--app-accent)",
} satisfies CSSProperties;

const viewportCanvasStyle = {
  position: "relative",
  minHeight: 350,
  border: "1px solid color-mix(in srgb, var(--app-info-border) 74%, var(--app-panel-border) 26%)",
  borderRadius: "var(--app-card-radius)",
  overflow: "hidden",
  background: "linear-gradient(180deg, #122f57 0%, #09182e 56%, #060f1d 100%)",
} satisfies CSSProperties;

const horizonLineStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  top: "46%",
  height: 1,
  background: "rgba(255,255,255,0.26)",
} satisfies CSSProperties;

const axisLineXStyle = {
  position: "absolute",
  left: "50%",
  top: "26%",
  width: 1,
  height: "62%",
  background: "rgba(255, 120, 120, 0.48)",
} satisfies CSSProperties;

const axisLineYStyle = {
  position: "absolute",
  left: "36%",
  top: "56%",
  right: "10%",
  height: 1,
  background: "rgba(120, 184, 255, 0.44)",
} satisfies CSSProperties;

const gridFloorStyle = {
  position: "absolute",
  inset: "48% -12% -30%",
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
  transform: "perspective(520px) rotateX(64deg)",
  transformOrigin: "top",
} satisfies CSSProperties;

const orientationGizmoStyle = {
  position: "absolute",
  top: 14,
  right: 14,
  border: "1px solid rgba(255,255,255,0.32)",
  borderRadius: "var(--app-card-radius)",
  padding: "7px 9px",
  background: "rgba(0, 0, 0, 0.34)",
  color: "#e6efff",
  fontSize: 12,
  fontWeight: 800,
} satisfies CSSProperties;

const selectedAssetCardStyle = {
  position: "absolute",
  left: 16,
  bottom: 46,
  display: "grid",
  gap: 4,
  maxWidth: 260,
  padding: 10,
  border: "1px solid rgba(136, 190, 255, 0.46)",
  borderRadius: "var(--app-card-radius)",
  background: "rgba(2, 8, 18, 0.78)",
  color: "#e9f1ff",
  lineHeight: 1.35,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const viewportTruthLabelStyle = {
  position: "absolute",
  right: 12,
  bottom: 12,
  padding: "6px 10px",
  border: "1px solid rgba(255, 219, 142, 0.58)",
  borderRadius: "var(--app-pill-radius)",
  background: "rgba(46, 30, 7, 0.66)",
  color: "#ffe7b8",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.3,
} satisfies CSSProperties;

const inspectorPanelStyle = {
  display: "grid",
  gap: 8,
  alignContent: "start",
  minHeight: 540,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const inspectorProjectStripStyle = {
  display: "grid",
  gap: 6,
  margin: 0,
} satisfies CSSProperties;

const inspectorSectionsStyle = {
  display: "grid",
  gap: 7,
  maxHeight: 435,
  overflowY: "auto",
  paddingRight: 2,
} satisfies CSSProperties;

const inspectorSectionStyle = {
  display: "grid",
  gap: 5,
  padding: 8,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const inspectorSectionRowsStyle = {
  display: "grid",
  gap: 5,
  margin: 0,
} satisfies CSSProperties;

const inspectorRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(120px, 0.8fr) minmax(0, 1fr)",
  gap: 8,
  color: "var(--app-muted-color)",
  margin: 0,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const commandStripStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const commandLabelStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-subtle-color)",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const commandTextAreaStyle = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 82,
  resize: "vertical",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: "10px 12px",
  background: "var(--app-input-bg)",
  color: "var(--app-text-color)",
  font: "inherit",
  lineHeight: 1.4,
} satisfies CSSProperties;

const commandButtonRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 6,
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  fontWeight: 800,
  cursor: "pointer",
} satisfies CSSProperties;

const secondaryButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  fontWeight: 700,
  cursor: "pointer",
} satisfies CSSProperties;

const disabledButtonStyle = {
  ...secondaryButtonStyle,
  color: "var(--app-muted-color)",
  cursor: "not-allowed",
  opacity: 0.7,
} satisfies CSSProperties;

const assetBrowserStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const assetCategoryStripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 5,
} satisfies CSSProperties;

const categoryButtonStyle = {
  minHeight: 34,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
} satisfies CSSProperties;

const activeCategoryButtonStyle = {
  ...categoryButtonStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
} satisfies CSSProperties;

const assetListStyle = {
  margin: 0,
  padding: "0 0 0 18px",
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const bottomRegionStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const timelineStripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 6,
} satisfies CSSProperties;

const timelineButtonStyle = {
  display: "grid",
  gap: 5,
  justifyItems: "start",
  minHeight: 62,
  padding: "8px 10px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  textAlign: "left",
  cursor: "pointer",
} satisfies CSSProperties;

const activeTimelineButtonStyle = {
  ...timelineButtonStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "color-mix(in srgb, var(--app-info-bg) 78%, var(--app-panel-bg) 22%)",
} satisfies CSSProperties;

const evidenceTabStripStyle = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
} satisfies CSSProperties;

const evidenceTabStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "7px 12px",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  fontWeight: 700,
  cursor: "pointer",
} satisfies CSSProperties;

const activeEvidenceTabStyle = {
  ...evidenceTabStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
} satisfies CSSProperties;

const statusBoardStyle = {
  display: "grid",
  gap: 6,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const statusCardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 6,
} satisfies CSSProperties;

const statusCardStyle = {
  display: "grid",
  gap: 6,
  alignContent: "start",
  minHeight: 92,
  padding: 9,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-muted-color)",
  lineHeight: 1.4,
} satisfies CSSProperties;

const statusListStyle = {
  margin: 0,
  paddingLeft: 16,
  lineHeight: 1.4,
} satisfies CSSProperties;

const gateLegendStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  padding: "6px 0 0",
} satisfies CSSProperties;

const gateLegendRowStyle = {
  display: "inline-flex",
} satisfies CSSProperties;

const gateBadgeStyle = {
  display: "inline-flex",
  width: "fit-content",
  alignItems: "center",
  padding: "3px 7px",
  borderRadius: "var(--app-pill-radius)",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "lowercase",
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

const mutedParagraphStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
} satisfies CSSProperties;
