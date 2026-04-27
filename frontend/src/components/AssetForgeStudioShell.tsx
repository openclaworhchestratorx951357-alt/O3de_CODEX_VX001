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

type AssetForgeStudioShellProps = {
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  reviewPacketData: unknown;
  reviewPacketSource: AssetForgeReviewPacketSource;
};

type WorkspaceLayout =
  | "Forge Command"
  | "Modeling / Assembly"
  | "Animation / Timeline"
  | "Materials / Lookdev"
  | "Asset Management"
  | "Review / Approval"
  | "Automation Studio"
  | "Collaboration / Versioning";

type ViewMode = "Single" | "Dual" | "Quad" | "Camera + Perspective";
type BottomDock = "Timeline" | "Assets" | "Evidence" | "Review Packet";

type PanelSection = {
  title: string;
  gate: GateState;
  items: string[];
};

const UNKNOWN_VALUE = "Unknown / unavailable";
const STORAGE_KEY = "o3de-asset-forge-studio-shell-layout-v1";
const menuItems = ["File", "Edit", "Create", "Assets", "Entity", "Components", "Materials", "Lighting", "Camera", "Review", "Help"];
const workspaceLayouts: WorkspaceLayout[] = [
  "Forge Command",
  "Modeling / Assembly",
  "Animation / Timeline",
  "Materials / Lookdev",
  "Asset Management",
  "Review / Approval",
  "Automation Studio",
  "Collaboration / Versioning",
];
const viewModes: ViewMode[] = ["Single", "Dual", "Quad", "Camera + Perspective"];
const bottomDocks: BottomDock[] = ["Timeline", "Assets", "Evidence", "Review Packet"];

const tools: Array<{ label: string; short: string; gate: GateState }> = [
  { label: "Select", short: "SEL", gate: "read-only" },
  { label: "Move", short: "MOV", gate: "blocked" },
  { label: "Rotate", short: "ROT", gate: "blocked" },
  { label: "Scale", short: "SCL", gate: "blocked" },
  { label: "Snap", short: "SNP", gate: "local preview" },
  { label: "Measure", short: "MSR", gate: "local preview" },
  { label: "Orbit", short: "ORB", gate: "local preview" },
  { label: "Camera", short: "CAM", gate: "local preview" },
  { label: "Light", short: "LGT", gate: "requires approval" },
  { label: "Entity", short: "ENT", gate: "requires approval" },
  { label: "Component", short: "CMP", gate: "not admitted" },
  { label: "Material", short: "MAT", gate: "not admitted" },
  { label: "Collision", short: "COL", gate: "not admitted" },
];

const workspacePanels: Record<WorkspaceLayout, PanelSection[]> = {
  "Forge Command": [
    { title: "Prompt Request", gate: "plan-only", items: ["Natural-language draft", "Prompt Studio route", "No direct execution"] },
    { title: "Forge Plan", gate: "proof-only", items: ["Typed plan preview", "Phase 9 readback context", "Safest next step"] },
    { title: "Approval Gates", gate: "requires approval", items: ["Operator review required", "Production approval unknown", "Mutation corridors blocked"] },
  ],
  "Modeling / Assembly": [
    { title: "Assembly Tools", gate: "local preview", items: ["Selection preview", "Measure overlay", "Transform mutation blocked"] },
    { title: "Component Readiness", gate: "blocked", items: ["Component corridor not admitted", "Placement blocked", "Collision not admitted"] },
  ],
  "Animation / Timeline": [
    { title: "Timeline", gate: "local preview", items: ["Frame strip", "Keyframe lane preview", "Shot notes"] },
    { title: "Animation Import", gate: "not admitted", items: ["Import disabled", "Editing controls local only", "No Asset Processor execution"] },
  ],
  "Materials / Lookdev": [
    { title: "Material Slots", gate: "read-only", items: ["Slot A unknown", "Slot B unknown", "Material mutation blocked"] },
    { title: "Render Evidence", gate: "blocked", items: ["Capture Preview", "Live O3DE Render: Not connected", "Material readiness unknown"] },
  ],
  "Asset Management": [
    { title: "Source Assets", gate: "read-only", items: ["Source path", "Source GUID", "Sample entries"] },
    { title: "Product Assets", gate: "proof-only", items: ["Product path", "Product count", "Cache mutation blocked"] },
    { title: "Asset Catalog", gate: "read-only", items: ["Catalog evidence", "Dependency summary", "Asset Processor status placeholder"] },
  ],
  "Review / Approval": [
    { title: "Evidence Summary", gate: "proof-only", items: ["Source evidence", "Product evidence", "Catalog evidence"] },
    { title: "Warnings", gate: "requires approval", items: ["Unknown license", "Unknown quality", "Unknown placement readiness"] },
  ],
  "Automation Studio": [
    { title: "Prompt Macros", gate: "plan-only", items: ["Plan templates", "Evidence templates", "No execution dispatch"] },
    { title: "Script / Plugin Areas", gate: "not admitted", items: ["Arbitrary code execution blocked", "Plugin execution blocked", "Command passthrough blocked"] },
  ],
  "Collaboration / Versioning": [
    { title: "Review Notes", gate: "local preview", items: ["Operator note placeholder", "Version evidence not connected", "Review packet context"] },
    { title: "Rollback Status", gate: "blocked", items: ["Rollback not connected", "No repository mutation", "No collaboration claim"] },
  ],
};

const outlinerGroups = [
  { label: "Level Root", gate: "local preview" as GateState, nodes: ["BridgeTrainingLevel", "GameplayRoot", "EnvironmentRoot"] },
  { label: "Cameras", gate: "local preview" as GateState, nodes: ["EditorCamera_Main", "PreviewCamera_Cinematic"] },
  { label: "Lights", gate: "plan-only" as GateState, nodes: ["KeyLight", "FillLight", "RimLight"] },
  { label: "Asset Candidates", gate: "proof-only" as GateState, nodes: ["bridge_segment_candidate_a", "bridge_segment_candidate_b"] },
  { label: "Review Targets", gate: "proof-only" as GateState, nodes: ["asset_readback_review_packet", "catalog_evidence_summary"] },
  { label: "Generated Preview Candidate", gate: "requires approval" as GateState, nodes: ["bridge_segment_preview_001"] },
  { label: "O3DE Import Review", gate: "blocked" as GateState, nodes: ["source staging blocked", "asset processor execution blocked"] },
];

const assetTabs = ["Source", "Product", "Materials", "Textures", "Prefabs", "Cameras", "Lights", "Review Packets"] as const;
const assetRows: Record<(typeof assetTabs)[number], string[]> = {
  Source: ["Assets/Bridge/bridge_segment_source.fbx", "Assets/Bridge/bridge_segment_reference.png", "Source GUID: preview"],
  Product: ["Cache/pc/bridge_segment.azmodel", "Cache/pc/bridge_segment.procprefab", "Product count: preview"],
  Materials: ["bridge_segment_shell.azmaterial", "bridge_segment_metal.azmaterial", UNKNOWN_VALUE],
  Textures: ["bridge_segment_albedo.png", "bridge_segment_normal.png", "bridge_segment_roughness.png"],
  Prefabs: ["bridge_segment_preview.prefab", "review_packet_targets.prefab", UNKNOWN_VALUE],
  Cameras: ["EditorCamera_Main", "PreviewCamera_Cinematic", "AssetReviewCamera_01"],
  Lights: ["KeyLight", "FillLight", "RimLight"],
  "Review Packets": ["asset_readback_review_packet", "catalog_evidence_summary", "operator_approval_state"],
};

function safeText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNKNOWN_VALUE;
}

function readSavedLayout(): WorkspaceLayout | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return workspaceLayouts.includes(saved as WorkspaceLayout) ? (saved as WorkspaceLayout) : null;
}

function Badge({ gate }: { gate: GateState }) {
  return <span style={{ ...badgeStyle, ...badgeTone(gate) }}>{gate}</span>;
}

function badgeTone(gate: GateState): CSSProperties {
  switch (gate) {
    case "read-only":
      return { borderColor: "#2f8c5e", color: "#7ee2aa", background: "rgba(18, 85, 57, 0.45)" };
    case "local preview":
      return { borderColor: "#2f77bd", color: "#8ec8ff", background: "rgba(16, 70, 121, 0.45)" };
    case "plan-only":
      return { borderColor: "#6a7280", color: "#c9d3df", background: "rgba(78, 88, 104, 0.32)" };
    case "proof-only":
      return { borderColor: "#697fd0", color: "#c4ceff", background: "rgba(62, 78, 147, 0.38)" };
    case "requires approval":
      return { borderColor: "#a66c22", color: "#ffd07a", background: "rgba(101, 64, 18, 0.45)" };
    case "blocked":
    case "not admitted":
    default:
      return { borderColor: "#a64b5b", color: "#ff9cab", background: "rgba(96, 31, 45, 0.48)" };
  }
}

export default function AssetForgeStudioShell({
  projectProfile,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenBuilder,
  reviewPacketData,
  reviewPacketSource,
}: AssetForgeStudioShellProps) {
  const [activeMenu, setActiveMenu] = useState("File");
  const [layout, setLayout] = useState<WorkspaceLayout>(() => readSavedLayout() ?? "Forge Command");
  const [viewMode, setViewMode] = useState<ViewMode>("Single");
  const [bottomDock, setBottomDock] = useState<BottomDock>("Timeline");
  const [activeTool, setActiveTool] = useState("Select");
  const [assetTab, setAssetTab] = useState<(typeof assetTabs)[number]>("Source");
  const [zoom, setZoom] = useState(72);
  const packet = useMemo(
    () => mapAssetForgeToolbenchReviewPacket(reviewPacketData, reviewPacketSource),
    [reviewPacketData, reviewPacketSource],
  );
  const workspaceDetail = workspacePanels[layout];
  const viewportNames = viewMode === "Single"
    ? ["Perspective"]
    : viewMode === "Dual"
      ? ["Perspective", "Camera"]
      : viewMode === "Camera + Perspective"
        ? ["Camera", "Perspective"]
        : ["Top", "Front", "Side", "Perspective"];

  function saveLayout(): void {
    window.localStorage.setItem(STORAGE_KEY, layout);
  }

  function resetLayout(): void {
    window.localStorage.removeItem(STORAGE_KEY);
    setLayout("Forge Command");
    setViewMode("Single");
    setBottomDock("Timeline");
  }

  return (
    <section aria-label="Asset Forge Toolbench layout" style={shellStyle}>
      <div aria-label="Forge top application menu" style={topMenuStyle}>
        <strong style={brandStyle}>O3DE AI Asset Forge</strong>
        {menuItems.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setActiveMenu(item)}
            style={activeMenu === item ? activeMenuButtonStyle : menuButtonStyle}
          >
            {item}
          </button>
        ))}
        <span style={topStatusStyle}>preview shell • non-mutating</span>
      </div>

      <div aria-label="Forge workspace strip" style={workspaceStripStyle}>
        {workspaceLayouts.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={layout === name}
            onClick={() => setLayout(name)}
            style={layout === name ? activeWorkspaceTabStyle : workspaceTabStyle}
          >
            {name}
          </button>
        ))}
      </div>

      <div style={layoutControlsStyle} aria-label="Production layout controls">
        <span>Layout: {layout}</span>
        <span>Menu: {activeMenu}</span>
        <div style={smallButtonRowStyle}>
          {viewModes.map((mode) => (
            <button key={mode} type="button" onClick={() => setViewMode(mode)} style={viewMode === mode ? activeSmallButtonStyle : smallButtonStyle}>
              {mode}
            </button>
          ))}
        </div>
        <button type="button" onClick={saveLayout} style={smallButtonStyle}>Save Layout</button>
        <button type="button" onClick={resetLayout} style={smallButtonStyle}>Reset Layout</button>
        <button type="button" onClick={() => undefined} style={smallButtonStyle}>Duplicate Layout</button>
      </div>

      <div style={editorGridStyle}>
        <aside aria-label="Forge left tool shelf" style={toolShelfStyle}>
          {tools.map((tool) => (
            <button
              key={tool.label}
              type="button"
              title={`${tool.label}: ${tool.gate}`}
              aria-label={tool.label}
              onClick={() => setActiveTool(tool.label)}
              style={activeTool === tool.label ? activeToolButtonStyle : toolButtonStyle}
            >
              <span>{tool.short}</span>
              <Badge gate={tool.gate} />
            </button>
          ))}
        </aside>

        <aside aria-label="Forge scene and entity outliner" style={paneStyle}>
          <div style={paneHeaderStyle}>Scene / Entity Outliner <Badge gate="local preview" /></div>
          <p style={truthNoteStyle}>Toolbench preview data - not authoritative live O3DE scene truth.</p>
          <div style={outlinerTreeStyle}>
            {outlinerGroups.map((group) => (
              <details key={group.label} open={group.label === "Level Root" || group.label === "Asset Candidates" || group.label === "Review Targets"}>
                <summary style={summaryStyle}>▸ {group.label} <Badge gate={group.gate} /></summary>
                <ul style={nodeListStyle}>
                  {group.nodes.map((node) => <li key={node}>{node}</li>)}
                </ul>
              </details>
            ))}
          </div>
        </aside>

        <main aria-label="Forge viewport preview" style={viewportPaneStyle}>
          <div style={viewportHeaderStyle}>
            <strong>Viewport</strong>
            <span>Perspective | Lit | EditorCamera_Main</span>
            <span>Tool: {activeTool}</span>
          </div>
          <div style={viewportControlsStyle}>
            <button type="button" style={activeSmallButtonStyle}>Orbit</button>
            <button type="button" style={smallButtonStyle}>Pan</button>
            <label style={rangeLabelStyle}>Zoom {zoom}%
              <input aria-label="Viewport zoom" type="range" min="40" max="120" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
            </label>
          </div>
          <div style={{ ...viewportGridStyle, gridTemplateColumns: viewMode === "Single" ? "1fr" : "repeat(2, minmax(0, 1fr))" }}>
            {viewportNames.map((name) => (
              <div key={name} style={viewportCanvasStyle}>
                <div style={gridFloorStyle} />
                <div style={horizonStyle} />
                <div style={axisXStyle} />
                <div style={axisYStyle} />
                <span style={gizmoStyle}>XYZ</span>
                <div style={{ ...previewObjectStyle, transform: `translate(-50%, -50%) scale(${zoom / 100})` }}>
                  <span>{name} Viewport Preview</span>
                  <strong>bridge_segment_preview_001</strong>
                </div>
                <span style={truthBadgeStyle}>Toolbench preview — not live O3DE render</span>
              </div>
            ))}
          </div>
        </main>

        <aside aria-label="Forge properties inspector" style={paneStyle}>
          <div style={paneHeaderStyle}>Properties / Inspector <Badge gate="read-only" /></div>
          <PropertyRows title="Project" rows={[["Project", safeText(projectProfile?.name)], ["Project root", safeText(projectProfile?.projectRoot)]]} />
          <PropertyRows title="Selection" rows={[["Workspace", layout], ["Selected tool", activeTool], ["Outliner focus", "Asset Candidates"]]} />
          <PropertyRows title="Transform" rows={[["Position", UNKNOWN_VALUE], ["Rotation", UNKNOWN_VALUE], ["Scale", UNKNOWN_VALUE]]} />
          <PropertyRows title="Asset readiness" rows={[["Readiness status", safeText(packet.readinessStatus)], ["Proof status", safeText(packet.proofStatus)], ["Readback", safeText(packet.readbackStatus)]]} />
          <PropertyRows title="O3DE import review" rows={[["Asset Processor", "Placeholder only - no execution"], ["Catalog evidence", safeText(packet.catalogEvidence.catalogPresence)], ["Placement", "Blocked"]]} />
        </aside>
      </div>

      <div style={workspacePanelDockStyle} aria-label="Active production workspace panels">
        {workspaceDetail.map((panel) => (
          <section key={panel.title} style={miniPanelStyle}>
            <div style={paneHeaderStyle}>{panel.title} <Badge gate={panel.gate} /></div>
            <ul style={compactListStyle}>{panel.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ))}
      </div>

      <div style={bottomDockStyle}>
        <div aria-label="Forge timeline evidence status" style={bottomLeftStyle}>
          <div style={bottomTabRowStyle}>
            {bottomDocks.map((dock) => (
              <button key={dock} type="button" onClick={() => setBottomDock(dock)} style={bottomDock === dock ? activeSmallButtonStyle : smallButtonStyle}>{dock}</button>
            ))}
          </div>
          {bottomDock === "Review Packet" ? (
            <div style={reviewScrollStyle}>
              <AssetForgeReviewPacketPanel packetData={reviewPacketData} packetSource={reviewPacketSource} />
            </div>
          ) : bottomDock === "Assets" ? (
            <div aria-label="Forge asset browser" style={assetBrowserStyle}>
              <div style={bottomTabRowStyle}>
                {assetTabs.map((tab) => (
                  <button key={tab} type="button" onClick={() => setAssetTab(tab)} style={assetTab === tab ? activeSmallButtonStyle : smallButtonStyle}>{tab}</button>
                ))}
              </div>
              <div style={assetTileGridStyle}>{assetRows[assetTab].map((row) => <span key={row} style={assetTileStyle}>{row}</span>)}</div>
            </div>
          ) : bottomDock === "Evidence" ? (
            <div style={statusGridStyle}>
              <StatusBox title="Review packet" gate="proof-only" detail={safeText(packet.contractVersion)} />
              <StatusBox title="Asset Processor" gate="blocked" detail="Execution blocked" />
              <StatusBox title="Catalog evidence" gate="read-only" detail={safeText(packet.catalogEvidence.catalogPresence)} />
              <StatusBox title="Approval" gate="requires approval" detail={safeText(packet.operatorApprovalState)} />
            </div>
          ) : (
            <div aria-label="Forge timeline strip" style={timelineStripStyle}>
              {["090", "100", "110", "120", "130", "140", "150", "160"].map((frame, index) => (
                <span key={frame} style={index === 3 ? activeFrameStyle : frameStyle}>{frame}</span>
              ))}
              <span style={blockedListStyle}>Blocked: generation • import • staging • assignment • placement • material mutation • prefab mutation</span>
            </div>
          )}
        </div>
        <div aria-label="Forge command strip" style={commandStripStyle}>
          <strong>Command / Prompt</strong>
          <textarea value="Create a weathered modular bridge segment with ivy accents and capture evidence-only review steps." readOnly style={commandTextAreaStyle} />
          <div style={commandButtonRowStyle}>
            <button type="button" onClick={onOpenPromptStudio} style={primaryButtonStyle}>Send to Prompt Studio</button>
            <button type="button" onClick={onOpenRuntimeOverview} style={darkButtonStyle}>Open Runtime</button>
            <button type="button" onClick={onOpenBuilder} style={darkButtonStyle}>Open Builder</button>
            <button type="button" onClick={() => setBottomDock("Review Packet")} style={darkButtonStyle}>Review Evidence</button>
            <button type="button" disabled style={disabledButtonStyle}>Place candidate in level</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PropertyRows({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section style={propertySectionStyle}>
      <strong>{title}</strong>
      {rows.map(([label, value]) => (
        <div key={`${title}-${label}`} style={propertyRowStyle}>
          <span>{label}</span>
          <span>{value}</span>
        </div>
      ))}
    </section>
  );
}

function StatusBox({ title, gate, detail }: { title: string; gate: GateState; detail: string }) {
  return (
    <section style={statusBoxStyle}>
      <strong>{title}</strong>
      <Badge gate={gate} />
      <span>{detail}</span>
    </section>
  );
}

const shellStyle = {
  display: "grid",
  gridTemplateRows: "34px 38px 38px minmax(360px, 1fr) 116px 176px",
  gap: 0,
  height: "min(880px, calc(100vh - 150px))",
  minHeight: 760,
  overflow: "hidden",
  border: "1px solid #26384f",
  borderRadius: 6,
  background: "#0b1017",
  color: "#c3cfdd",
  boxShadow: "0 18px 55px rgba(3, 12, 25, 0.35)",
  fontSize: 13,
  lineHeight: 1.25,
} satisfies CSSProperties;

const topMenuStyle = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "0 8px",
  minWidth: 0,
  borderBottom: "1px solid #27384b",
  background: "#111821",
} satisfies CSSProperties;

const brandStyle = { marginRight: 12, color: "#eef5ff", whiteSpace: "nowrap" } satisfies CSSProperties;
const menuButtonStyle = {
  height: 24,
  padding: "0 10px",
  border: "1px solid transparent",
  borderRadius: 3,
  background: "transparent",
  color: "#c3cfdd",
  fontWeight: 700,
  cursor: "pointer",
} satisfies CSSProperties;
const activeMenuButtonStyle = { ...menuButtonStyle, borderColor: "#3d8bd8", background: "#172b43", color: "#ffffff" } satisfies CSSProperties;
const topStatusStyle = { marginLeft: "auto", color: "#8fa3bc", whiteSpace: "nowrap" } satisfies CSSProperties;

const workspaceStripStyle = {
  display: "flex",
  alignItems: "stretch",
  overflowX: "auto",
  borderBottom: "1px solid #27384b",
  background: "#141d28",
} satisfies CSSProperties;
const workspaceTabStyle = {
  minWidth: 126,
  border: 0,
  borderRight: "1px solid #28394e",
  background: "transparent",
  color: "#aebbd0",
  fontWeight: 800,
  cursor: "pointer",
} satisfies CSSProperties;
const activeWorkspaceTabStyle = { ...workspaceTabStyle, background: "#16395b", color: "#ffffff", boxShadow: "inset 0 -2px 0 #62a7ff" } satisfies CSSProperties;

const layoutControlsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0 8px",
  minWidth: 0,
  borderBottom: "1px solid #27384b",
  background: "#0f1720",
  color: "#8fa3bc",
  overflowX: "auto",
} satisfies CSSProperties;
const smallButtonRowStyle = { display: "flex", gap: 4, alignItems: "center" } satisfies CSSProperties;
const smallButtonStyle = {
  height: 24,
  padding: "0 9px",
  border: "1px solid #344961",
  borderRadius: 3,
  background: "#192331",
  color: "#c8d4e2",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
} satisfies CSSProperties;
const activeSmallButtonStyle = { ...smallButtonStyle, borderColor: "#5aa9ff", background: "#173a5d", color: "#ffffff" } satisfies CSSProperties;

const editorGridStyle = {
  display: "grid",
  gridTemplateColumns: "50px minmax(190px, 240px) minmax(430px, 1fr) minmax(240px, 300px)",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
} satisfies CSSProperties;
const toolShelfStyle = {
  display: "grid",
  alignContent: "start",
  gap: 3,
  padding: 5,
  minWidth: 0,
  overflowY: "auto",
  borderRight: "1px solid #27384b",
  background: "#0e151e",
} satisfies CSSProperties;
const toolButtonStyle = {
  display: "grid",
  placeItems: "center",
  gap: 2,
  minHeight: 42,
  border: "1px solid #2f4054",
  borderRadius: 4,
  background: "#17212d",
  color: "#d6e2ee",
  fontSize: 10,
  fontWeight: 900,
  cursor: "pointer",
} satisfies CSSProperties;
const activeToolButtonStyle = { ...toolButtonStyle, borderColor: "#5aa9ff", background: "#183f63" } satisfies CSSProperties;

const paneStyle = {
  minWidth: 0,
  minHeight: 0,
  overflow: "auto",
  borderRight: "1px solid #27384b",
  background: "#151d27",
} satisfies CSSProperties;
const paneHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  minHeight: 30,
  padding: "0 9px",
  borderBottom: "1px solid #2d3e52",
  background: "#101821",
  color: "#edf4ff",
  fontWeight: 900,
} satisfies CSSProperties;
const truthNoteStyle = { margin: 0, padding: "8px 10px", color: "#92a5ba", fontSize: 12 } satisfies CSSProperties;
const outlinerTreeStyle = { padding: "0 6px 8px" } satisfies CSSProperties;
const summaryStyle = { cursor: "pointer", padding: "6px 4px", color: "#d6e2ee", listStyle: "none" } satisfies CSSProperties;
const nodeListStyle = { margin: "0 0 6px 15px", padding: 0, color: "#a9b8c8" } satisfies CSSProperties;

const viewportPaneStyle = {
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "30px 34px 1fr",
  background: "#080d13",
  borderRight: "1px solid #27384b",
} satisfies CSSProperties;
const viewportHeaderStyle = { ...paneHeaderStyle, borderRight: 0 } satisfies CSSProperties;
const viewportControlsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 8px",
  borderBottom: "1px solid #243448",
  background: "#101721",
} satisfies CSSProperties;
const rangeLabelStyle = { display: "flex", alignItems: "center", gap: 8, color: "#9dafc5", marginLeft: "auto" } satisfies CSSProperties;
const viewportGridStyle = { display: "grid", gap: 6, padding: 8, minWidth: 0, minHeight: 0 } satisfies CSSProperties;
const viewportCanvasStyle = {
  position: "relative",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  border: "1px solid #35506e",
  borderRadius: 4,
  background: "linear-gradient(180deg, #0d2740 0%, #071019 58%, #05080d 100%)",
} satisfies CSSProperties;
const gridFloorStyle = {
  position: "absolute",
  inset: "47% 0 0 0",
  backgroundImage:
    "linear-gradient(rgba(98, 167, 255, 0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(98, 167, 255, 0.18) 1px, transparent 1px)",
  backgroundSize: "32px 32px",
  transform: "perspective(360px) rotateX(60deg)",
  transformOrigin: "top center",
} satisfies CSSProperties;
const horizonStyle = { position: "absolute", left: 0, right: 0, top: "48%", height: 1, background: "rgba(179, 212, 255, 0.42)" } satisfies CSSProperties;
const axisXStyle = { position: "absolute", left: "18%", right: "18%", top: "60%", height: 1, background: "rgba(77, 156, 255, 0.45)" } satisfies CSSProperties;
const axisYStyle = { position: "absolute", left: "50%", top: "25%", bottom: "22%", width: 1, background: "rgba(255, 82, 132, 0.6)" } satisfies CSSProperties;
const gizmoStyle = { position: "absolute", top: 10, right: 10, border: "1px solid #6a7b90", borderRadius: 3, padding: "4px 6px", color: "#e8f3ff", fontWeight: 900 } satisfies CSSProperties;
const previewObjectStyle = {
  position: "absolute",
  left: "50%",
  top: "55%",
  display: "grid",
  gap: 4,
  padding: "10px 14px",
  border: "1px solid #44617e",
  borderRadius: 4,
  background: "rgba(7, 13, 22, 0.82)",
  color: "#ffffff",
  transformOrigin: "center",
} satisfies CSSProperties;
const truthBadgeStyle = {
  position: "absolute",
  right: 12,
  bottom: 10,
  border: "1px solid #b6852d",
  borderRadius: 3,
  padding: "4px 8px",
  background: "rgba(83, 56, 18, 0.65)",
  color: "#ffe4a4",
  fontSize: 12,
  fontWeight: 900,
} satisfies CSSProperties;

const workspacePanelDockStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 6,
  minHeight: 0,
  overflow: "hidden",
  padding: 6,
  borderTop: "1px solid #27384b",
  background: "#101820",
} satisfies CSSProperties;
const miniPanelStyle = { minWidth: 0, overflow: "hidden", border: "1px solid #2f4054", borderRadius: 4, background: "#18222e" } satisfies CSSProperties;
const compactListStyle = { margin: 0, padding: "7px 10px 8px 22px", color: "#aebbd0", fontSize: 12 } satisfies CSSProperties;

const bottomDockStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(340px, 520px)",
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  borderTop: "1px solid #27384b",
  background: "#0e141c",
} satisfies CSSProperties;
const bottomLeftStyle = { minWidth: 0, minHeight: 0, overflow: "hidden", padding: 6, borderRight: "1px solid #27384b" } satisfies CSSProperties;
const bottomTabRowStyle = { display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", marginBottom: 6 } satisfies CSSProperties;
const assetBrowserStyle = { minWidth: 0, overflow: "hidden" } satisfies CSSProperties;
const assetTileGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 5 } satisfies CSSProperties;
const assetTileStyle = { border: "1px solid #2f4054", borderRadius: 3, padding: 7, background: "#18222e", color: "#c7d4e2", overflowWrap: "anywhere" } satisfies CSSProperties;
const statusGridStyle = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 } satisfies CSSProperties;
const statusBoxStyle = { display: "grid", gap: 5, border: "1px solid #2f4054", borderRadius: 4, padding: 8, background: "#18222e" } satisfies CSSProperties;
const timelineStripStyle = { display: "flex", gap: 4, alignItems: "center", height: "100%", overflow: "hidden" } satisfies CSSProperties;
const frameStyle = { minWidth: 44, textAlign: "center", border: "1px solid #2f4054", borderRadius: 3, padding: "8px 4px", background: "#18222e" } satisfies CSSProperties;
const activeFrameStyle = { ...frameStyle, borderColor: "#5aa9ff", background: "#173a5d", color: "#ffffff" } satisfies CSSProperties;
const blockedListStyle = { marginLeft: "auto", color: "#ff9cab", fontWeight: 900 } satisfies CSSProperties;
const reviewScrollStyle = { maxHeight: 136, overflow: "auto", border: "1px solid #2f4054", borderRadius: 4 } satisfies CSSProperties;
const commandStripStyle = { display: "grid", gridTemplateRows: "22px 1fr 34px", gap: 5, padding: 6, minWidth: 0, minHeight: 0 } satisfies CSSProperties;
const commandTextAreaStyle = { minWidth: 0, resize: "none", border: "1px solid #2f4054", borderRadius: 4, padding: 8, background: "#0b1118", color: "#eef5ff", fontWeight: 800 } satisfies CSSProperties;
const commandButtonRowStyle = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 5 } satisfies CSSProperties;
const primaryButtonStyle = { border: "1px solid #6baeff", borderRadius: 4, background: "#3a8eff", color: "#06101d", fontWeight: 900 } satisfies CSSProperties;
const darkButtonStyle = { border: "1px solid #344961", borderRadius: 4, background: "#192331", color: "#d8e4f2", fontWeight: 900 } satisfies CSSProperties;
const disabledButtonStyle = { ...darkButtonStyle, opacity: 0.45, cursor: "not-allowed" } satisfies CSSProperties;

const propertySectionStyle = { borderBottom: "1px solid #26384f", padding: "8px 10px" } satisfies CSSProperties;
const propertyRowStyle = { display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1fr)", gap: 8, color: "#aebbd0", marginTop: 5, overflowWrap: "anywhere" } satisfies CSSProperties;
const badgeStyle = { display: "inline-flex", alignItems: "center", border: "1px solid", borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" } satisfies CSSProperties;
