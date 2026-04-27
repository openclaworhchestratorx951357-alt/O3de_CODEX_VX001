import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

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

const topMenus = ["File", "Edit", "Create", "Assets", "Entity", "Components", "Materials", "Lighting", "Camera", "Review", "Help"] as const;
type TopMenu = (typeof topMenus)[number];
type AssetCategory = "Source assets" | "Product assets" | "Dependencies" | "Catalog evidence" | "Review packets";
type CameraMode = "Perspective" | "Camera" | "Shot list";
type EntityViewportMode = "docked" | "focus";
type PacketViewModel = ReturnType<typeof mapAssetForgeToolbenchReviewPacket>;
type ToolShelfItem = {
  id: string;
  shortLabel: string;
  gate: GateState;
  detail: string;
};

const UNKNOWN_VALUE = "Unknown / unavailable";
const STORAGE_KEY = "o3de-asset-forge-page-shell-menu-v1";
const blockedMutations = ["generation", "import", "staging", "assignment", "placement", "material mutation", "prefab mutation", "Asset Processor execution", "source/product/cache mutation"];
const assetCategories: AssetCategory[] = ["Source assets", "Product assets", "Dependencies", "Catalog evidence", "Review packets"];
const tools: ToolShelfItem[] = [
  { id: "Select", shortLabel: "SEL", gate: "read-only", detail: "Selection preview only" },
  { id: "Move", shortLabel: "MOV", gate: "blocked", detail: "Transform mutation is not admitted" },
  { id: "Rotate", shortLabel: "ROT", gate: "blocked", detail: "Transform mutation is not admitted" },
  { id: "Scale", shortLabel: "SCL", gate: "blocked", detail: "Transform mutation is not admitted" },
  { id: "Snap", shortLabel: "SNP", gate: "local preview", detail: "Snap guide preview only" },
  { id: "Measure", shortLabel: "MSR", gate: "local preview", detail: "Viewport measurement guide" },
  { id: "Orbit", shortLabel: "ORB", gate: "local preview", detail: "Preview orbit controls only" },
  { id: "Camera", shortLabel: "CAM", gate: "local preview", detail: "Preview camera controls only" },
  { id: "Light", shortLabel: "LGT", gate: "plan-only", detail: "Lighting notes only" },
  { id: "Entity", shortLabel: "ENT", gate: "blocked", detail: "Entity placement mutation is blocked" },
  { id: "Component", shortLabel: "CMP", gate: "not admitted", detail: "Component mutation is blocked" },
  { id: "Material", shortLabel: "MAT", gate: "not admitted", detail: "Material mutation is blocked" },
  { id: "Collision", shortLabel: "COL", gate: "not admitted", detail: "Collision authoring is blocked" },
];
const assetRows: Record<AssetCategory, Array<{ name: string; gate: GateState; detail: string }>> = {
  "Source assets": [
    { name: "Assets/Bridge/bridge_segment_source.fbx", gate: "read-only", detail: "Source evidence path from preview packet" },
    { name: "Assets/Bridge/bridge_segment_reference.png", gate: "read-only", detail: "Reference only" },
    { name: "Source GUID", gate: "proof-only", detail: "Resolved by Phase 9 evidence when connected" },
  ],
  "Product assets": [
    { name: "Cache/pc/bridge_segment.azmodel", gate: "proof-only", detail: "Product evidence preview" },
    { name: "Cache/pc/bridge_segment.procprefab", gate: "blocked", detail: "Prefab mutation is not admitted" },
    { name: "Product count", gate: "proof-only", detail: "Readback summary only" },
  ],
  Dependencies: [
    { name: "Texture dependency rows", gate: "proof-only", detail: "Dependency evidence from packet" },
    { name: "Material dependency rows", gate: "proof-only", detail: "Dependency evidence from packet" },
    { name: "Missing dependencies", gate: "requires approval", detail: UNKNOWN_VALUE },
  ],
  "Catalog evidence": [
    { name: "Asset Catalog presence", gate: "read-only", detail: "Catalog evidence only" },
    { name: "Catalog product paths", gate: "read-only", detail: "Read-only path list" },
    { name: "Asset Processor status", gate: "blocked", detail: "Placeholder only - no execution" },
  ],
  "Review packets": [
    { name: "asset_readback_review_packet", gate: "proof-only", detail: "Typed review packet preview" },
    { name: "catalog_evidence_summary", gate: "proof-only", detail: "Catalog proof summary" },
    { name: "operator_approval_state", gate: "requires approval", detail: UNKNOWN_VALUE },
  ],
};

function safeText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : UNKNOWN_VALUE;
}

function readSavedMenu(): TopMenu | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return topMenus.includes(saved as TopMenu) ? (saved as TopMenu) : null;
}

function badgeTone(gate: GateState): CSSProperties {
  switch (gate) {
    case "read-only": return { borderColor: "#2f8c5e", color: "#8ff0b5", background: "rgba(18, 85, 57, 0.42)" };
    case "local preview": return { borderColor: "#2f77bd", color: "#9bd0ff", background: "rgba(16, 70, 121, 0.42)" };
    case "plan-only": return { borderColor: "#6a7280", color: "#d3dde9", background: "rgba(78, 88, 104, 0.3)" };
    case "proof-only": return { borderColor: "#697fd0", color: "#cbd5ff", background: "rgba(62, 78, 147, 0.36)" };
    case "requires approval": return { borderColor: "#a66c22", color: "#ffd58a", background: "rgba(101, 64, 18, 0.42)" };
    case "blocked":
    case "not admitted":
    default: return { borderColor: "#a64b5b", color: "#ffadba", background: "rgba(96, 31, 45, 0.46)" };
  }
}

function gateIndicatorColor(gate: GateState): string {
  switch (gate) {
    case "read-only":
      return "#52d691";
    case "local preview":
      return "#67b7ff";
    case "plan-only":
      return "#d3dde9";
    case "proof-only":
      return "#9eaeff";
    case "requires approval":
      return "#ffd58a";
    case "blocked":
      return "#ff9cae";
    case "not admitted":
    default:
      return "#ff7f97";
  }
}

function Badge({ gate }: { gate: GateState }) {
  return <span style={{ ...s.badge, ...badgeTone(gate) }}>{gate}</span>;
}

export default function AssetForgeStudioShell({ projectProfile, onOpenPromptStudio, onOpenRuntimeOverview, onOpenBuilder, reviewPacketData, reviewPacketSource }: AssetForgeStudioShellProps) {
  const [activeTopMenu, setActiveTopMenu] = useState<TopMenu>(() => readSavedMenu() ?? "Create");
  const [activeAssetCategory, setActiveAssetCategory] = useState<AssetCategory>("Source assets");
  const [activeTool, setActiveTool] = useState("Select");
  const [cameraMode, setCameraMode] = useState<CameraMode>("Perspective");
  const packet = useMemo(() => mapAssetForgeToolbenchReviewPacket(reviewPacketData, reviewPacketSource), [reviewPacketData, reviewPacketSource]);

  const saveLayout = () => window.localStorage.setItem(STORAGE_KEY, activeTopMenu);
  const resetLayout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setActiveTopMenu("Create");
    setActiveAssetCategory("Source assets");
    setActiveTool("Select");
    setCameraMode("Perspective");
  };

  return (
    <section aria-label="Asset Forge Studio Shell" style={s.shell}>
      <nav aria-label="Forge top application menu" style={s.topMenu}>
        <strong style={s.brand}>O3DE AI Asset Forge</strong>
        {topMenus.map((menu) => (
          <button key={menu} type="button" aria-current={activeTopMenu === menu ? "page" : undefined} onClick={() => setActiveTopMenu(menu)} style={activeTopMenu === menu ? s.activeMenuButton : s.menuButton}>
            {menu}
          </button>
        ))}
        <span style={s.topStatus}>preview - non-mutating control surface</span>
      </nav>
      <main aria-label="Asset Forge active page" style={s.pageHost}>
        {activeTopMenu === "File" && <FilePage projectProfile={projectProfile} activeTopMenu={activeTopMenu} saveLayout={saveLayout} resetLayout={resetLayout} />}
        {activeTopMenu === "Edit" && <EditPage />}
        {activeTopMenu === "Create" && <CreatePage onOpenPromptStudio={onOpenPromptStudio} onOpenRuntimeOverview={onOpenRuntimeOverview} onOpenBuilder={onOpenBuilder} />}
        {activeTopMenu === "Assets" && <AssetsPage activeAssetCategory={activeAssetCategory} setActiveAssetCategory={setActiveAssetCategory} packet={packet} />}
        {activeTopMenu === "Entity" && <EntityPage activeTool={activeTool} setActiveTool={setActiveTool} />}
        {activeTopMenu === "Components" && <ComponentsPage readbackStatus={packet.readbackStatus} />}
        {activeTopMenu === "Materials" && <MaterialsPage packet={packet} />}
        {activeTopMenu === "Lighting" && <LightingPage />}
        {activeTopMenu === "Camera" && <CameraPage cameraMode={cameraMode} setCameraMode={setCameraMode} />}
        {activeTopMenu === "Review" && <ReviewPage reviewPacketData={reviewPacketData} reviewPacketSource={reviewPacketSource} packet={packet} />}
        {activeTopMenu === "Help" && <HelpPage />}
      </main>
    </section>
  );
}

function FilePage({ projectProfile, activeTopMenu, saveLayout, resetLayout }: { projectProfile?: O3DEProjectProfile; activeTopMenu: TopMenu; saveLayout: () => void; resetLayout: () => void }) {
  return <Page title="File" gate="local preview" detail="Project/session information and harmless local layout preferences. No file mutation.">
    <div style={s.twoCols}>
      <Panel title="Project session" gate="read-only"><Rows rows={[["Project", safeText(projectProfile?.name)], ["Project root", safeText(projectProfile?.projectRoot)], ["Engine root", safeText(projectProfile?.engineRoot)], ["Profile source", safeText(projectProfile?.sourceLabel)]]} /></Panel>
      <Panel title="Local layout controls" gate="local preview"><p style={s.muted}>Stores only harmless UI menu preference state in localStorage.</p><div style={s.buttonRow}><button type="button" onClick={saveLayout} style={s.primaryButton}>Save Layout</button><button type="button" onClick={resetLayout} style={s.darkButton}>Reset Layout</button><button type="button" disabled style={s.disabledButton}>Write project file</button></div><Rows rows={[["Saved menu target", activeTopMenu], ["Backend persistence", "Not connected"], ["File mutation", "Blocked"]]} /></Panel>
    </div><BlockedSummary />
  </Page>;
}

function EditPage() {
  return <Page title="Edit" gate="local preview" detail="Local undo/redo and layout notes only. No project mutation."><div style={s.threeCols}><Panel title="Local undo stack" gate="local preview"><List items={["Active page changes", "Viewport preview state", "Content browser selection"]} /></Panel><Panel title="Redo stack" gate="local preview"><List items={["No backend actions", "No file writes", "No source/product/cache edits"]} /></Panel><Panel title="Blocked edit actions" gate="blocked"><List items={["Cut entity", "Paste component", "Apply material", "Write prefab"]} /></Panel></div></Page>;
}

function CreatePage({ onOpenPromptStudio, onOpenRuntimeOverview, onOpenBuilder }: Pick<AssetForgeStudioShellProps, "onOpenPromptStudio" | "onOpenRuntimeOverview" | "onOpenBuilder">) {
  return <Page title="Create" gate="plan-only" detail="Prompt/request builder, Forge plan preview, candidate preview, approval gates, and command strip. No direct generation.">
    <div style={s.createGrid}>
      <Panel title="Prompt request" gate="plan-only"><textarea aria-label="Forge prompt request preview" readOnly value="Create a weathered modular bridge segment with ivy accents and prepare evidence-only review steps." style={s.textarea} /><div style={s.buttonRow}><button type="button" onClick={onOpenPromptStudio} style={s.primaryButton}>Open Prompt Studio draft</button><button type="button" disabled style={s.disabledButton}>Generate asset</button></div></Panel>
      <Panel title="Forge plan preview" gate="proof-only"><List items={["Typed plan preview", "Phase 9 readback context", "Operator review packet required", "No model download"]} /></Panel>
      <Panel title="Asset candidate preview" gate="local preview"><ViewportPreview label="Candidate viewport preview" /></Panel>
      <Panel title="Approval gates" gate="requires approval"><List items={["License: Unknown / unavailable", "Quality: Unknown / unavailable", "Placement readiness: Unknown / unavailable", "Production approval: Unknown / unavailable"]} /><button type="button" disabled style={s.disabledWideButton}>Place candidate in level</button></Panel>
    </div><CommandStrip onOpenPromptStudio={onOpenPromptStudio} onOpenRuntimeOverview={onOpenRuntimeOverview} onOpenBuilder={onOpenBuilder} /><BlockedSummary />
  </Page>;
}

function AssetsPage({ activeAssetCategory, setActiveAssetCategory, packet }: { activeAssetCategory: AssetCategory; setActiveAssetCategory: (category: AssetCategory) => void; packet: PacketViewModel }) {
  return <Page title="Assets" gate="read-only" detail="Full content browser for source assets, products, dependency evidence, Asset Catalog evidence, and Asset Processor placeholders.">
    <div aria-label="Forge assets content browser" style={s.assetsGrid}>
      <aside style={s.rail}>{assetCategories.map((category) => <button key={category} type="button" onClick={() => setActiveAssetCategory(category)} style={activeAssetCategory === category ? s.activeRailButton : s.railButton}>{category}</button>)}</aside>
      <section style={s.browser}><div style={s.panelHeader}>{activeAssetCategory} <Badge gate="read-only" /></div><div style={s.assetTiles}>{assetRows[activeAssetCategory].map((row) => <article key={row.name} style={s.assetTile}><strong>{row.name}</strong><Badge gate={row.gate} /><span>{row.detail}</span></article>)}</div></section>
      <Panel title="Evidence readback" gate="proof-only"><Rows rows={[["Source path", packet.sourceEvidence.normalizedSourcePath], ["Product path", packet.productEvidence.productPath], ["Dependency count", packet.dependencyEvidence.dependencyCount], ["Catalog presence", packet.catalogEvidence.catalogPresence], ["Asset Processor", "Placeholder only - no execution"]]} /><div style={s.buttonRow}><button type="button" disabled style={s.disabledButton}>Import selected asset</button><button type="button" disabled style={s.disabledButton}>Stage source asset</button><button type="button" disabled style={s.disabledButton}>Execute Asset Processor</button></div></Panel>
    </div>
  </Page>;
}

function EntityPage({ activeTool, setActiveTool }: { activeTool: string; setActiveTool: (tool: string) => void }) {
  const [viewportMode, setViewportMode] = useState<EntityViewportMode>("docked");
  const isFocusMode = viewportMode === "focus";

  return (
    <Page
      title="Entity"
      gate="read-only"
      detail="Entity outliner, selected entity preview, read-only transform state, and placement gate."
    >
      <section style={s.entityToolbar}>
        <span>
          Viewport mode: <strong>{isFocusMode ? "Full viewport" : "Docked viewport"}</strong>
        </span>
        <button
          type="button"
          onClick={() => setViewportMode(isFocusMode ? "docked" : "focus")}
          style={isFocusMode ? s.activeSmallButton : s.smallButton}
        >
          {isFocusMode ? "Exit full viewport" : "Full viewport"}
        </button>
      </section>
      <div style={isFocusMode ? s.entityFocusGrid : s.entityEditorGrid}>
        <ToolShelf activeTool={activeTool} setActiveTool={setActiveTool} />
        {!isFocusMode && (
          <Panel title="Entity outliner" gate="local preview">
            <p style={s.muted}>Toolbench preview data - not authoritative O3DE scene truth.</p>
            <Tree
              groups={[
                ["Level Root", ["BridgeTrainingLevel", "GameplayRoot", "EnvironmentRoot"]],
                ["Cameras", ["EditorCamera_Main", "PreviewCamera_Cinematic"]],
                ["Lights", ["KeyLight", "FillLight", "RimLight"]],
                ["Asset Candidates", ["bridge_segment_candidate_a", "bridge_segment_candidate_b"]],
                ["Review Targets", ["asset_readback_review_packet", "catalog_evidence_summary"]],
                ["Generated Preview Candidate", ["bridge_segment_preview_001"]],
                ["O3DE Import Review", ["source staging blocked", "asset processor execution blocked"]],
              ]}
            />
          </Panel>
        )}
        <Panel title={isFocusMode ? "Selected entity preview (focus)" : "Selected entity preview"} gate="local preview">
          <ViewportPreview label={isFocusMode ? "Entity placement preview (focus mode)" : "Entity placement preview"} />
        </Panel>
        {!isFocusMode && (
          <Panel title="Transform readback" gate="read-only">
            <Rows rows={[["Position", UNKNOWN_VALUE], ["Rotation", UNKNOWN_VALUE], ["Scale", UNKNOWN_VALUE], ["Placement", "Blocked"]]} />
            <button type="button" disabled style={s.disabledWideButton}>Place selected candidate</button>
          </Panel>
        )}
      </div>
    </Page>
  );
}

function ComponentsPage({ readbackStatus }: { readbackStatus: string }) {
  return <Page title="Components" gate="not admitted" detail="Component palette, readiness, property readback status, and mutation gates."><div style={s.threeCols}><Panel title="Component palette" gate="local preview"><List items={["Mesh", "Transform", "Material", "Collision", "Comment", "Camera"]} /></Panel><Panel title="Component readiness" gate="proof-only"><Rows rows={[["Property readback", safeText(readbackStatus)], ["Component mutation", "Blocked"], ["Prefab mutation", "Blocked"]]} /></Panel><Panel title="Mutation gates" gate="not admitted"><List items={["Add component blocked", "Remove component blocked", "Edit component property blocked", "Prefab write blocked"]} /><button type="button" disabled style={s.disabledWideButton}>Add component to entity</button></Panel></div></Page>;
}

function MaterialsPage({ packet }: { packet: PacketViewModel }) {
  return <Page title="Materials" gate="read-only" detail="Material slots, texture dependencies, O3DE material readiness, and material mutation gates."><div style={s.materialsGrid}><Panel title="Material slots" gate="read-only"><Rows rows={[["Slot 0", "bridge_segment_shell.azmaterial"], ["Slot 1", "bridge_segment_metal.azmaterial"], ["License", packet.unavailableFields.licenseStatus], ["Quality", packet.unavailableFields.qualityStatus]]} /></Panel><Panel title="Texture dependencies" gate="proof-only"><List items={["bridge_segment_albedo.png", "bridge_segment_normal.png", "bridge_segment_roughness.png", "Dependency count: " + packet.dependencyEvidence.dependencyCount]} /></Panel><Panel title="Material inspector preview" gate="local preview"><div style={s.materialPreview}><div style={s.materialSphere} /><span>Lookdev capture preview - renderer connection unavailable.</span></div></Panel><Panel title="O3DE material readiness" gate="blocked"><Rows rows={[["Material mutation", "Blocked"], ["Assignment", "Blocked"], ["Asset Processor", "Placeholder only - no execution"]]} /><button type="button" disabled style={s.disabledWideButton}>Assign material</button></Panel></div></Page>;
}

function LightingPage() {
  return <Page title="Lighting" gate="plan-only" detail="Light list, lookdev preview controls, and lighting plan notes. No scene mutation."><div style={s.lightingGrid}><Panel title="Light list" gate="local preview"><List items={["KeyLight", "FillLight", "RimLight", "Environment probe: Unknown / unavailable"]} /></Panel><Panel title="Lookdev preview" gate="local preview"><ViewportPreview label="Lighting capture preview" /></Panel><Panel title="Lighting plan notes" gate="plan-only"><List items={["Warm key, cool fill", "Review shadow readability", "Capture preview only", "No O3DE light write"]} /></Panel><Panel title="Blocked lighting actions" gate="blocked"><button type="button" disabled style={s.disabledWideButton}>Apply lighting to level</button></Panel></div></Page>;
}

function CameraPage({ cameraMode, setCameraMode }: { cameraMode: CameraMode; setCameraMode: (mode: CameraMode) => void }) {
  const modes: CameraMode[] = ["Perspective", "Camera", "Shot list"];
  return <Page title="Camera" gate="local preview" detail="Camera list, camera/perspective preview, and cinematic shot list. No O3DE camera mutation."><div style={s.cameraGrid}><Panel title="Camera list" gate="read-only"><List items={["EditorCamera_Main", "PreviewCamera_Cinematic", "AssetReviewCamera_01"]} /><div style={s.buttonRow}>{modes.map((mode) => <button key={mode} type="button" onClick={() => setCameraMode(mode)} style={cameraMode === mode ? s.activeSmallButton : s.smallButton}>{mode}</button>)}</div></Panel><Panel title="Camera / perspective preview" gate="local preview"><ViewportPreview label={cameraMode + " preview"} /></Panel><Panel title="Cinematic shot list" gate="plan-only"><List items={["Shot 010: Establish bridge silhouette", "Shot 020: Orbit candidate detail", "Shot 030: Evidence capture still", "Camera mutation blocked"]} /><button type="button" disabled style={s.disabledWideButton}>Write camera to O3DE scene</button></Panel></div></Page>;
}

function ReviewPage({ reviewPacketData, reviewPacketSource, packet }: Pick<AssetForgeStudioShellProps, "reviewPacketData" | "reviewPacketSource"> & { packet: PacketViewModel }) {
  return <Page title="Review" gate="proof-only" detail="Full-page operator review packet, evidence summary, warnings, approval state, and safest next step." review><div style={s.reviewGrid}><section aria-label="Forge operator review packet full page" style={s.reviewPacketFrame}><AssetForgeReviewPacketPanel packetData={reviewPacketData} packetSource={reviewPacketSource} /></section><aside style={s.reviewAside}><Panel title="Evidence summary" gate="proof-only"><Rows rows={[["Source evidence", packet.sourceEvidence.sourceExists], ["Product evidence", packet.productEvidence.evidenceAvailable], ["Catalog evidence", packet.catalogEvidence.catalogPresence], ["Dependency evidence", packet.dependencyEvidence.evidenceAvailable]]} /></Panel><Panel title="Unknown / unavailable" gate="requires approval"><Rows rows={[["License", packet.unavailableFields.licenseStatus], ["Quality", packet.unavailableFields.qualityStatus], ["Placement readiness", packet.unavailableFields.placementReadiness], ["Production approval", packet.unavailableFields.productionApproval]]} /></Panel><Panel title="Operator state" gate="requires approval"><Rows rows={[["Approval", packet.operatorApprovalState], ["Safest next step", packet.safestNextStep]]} /><button type="button" disabled style={s.disabledWideButton}>Approve production import</button></Panel></aside></div></Page>;
}

function HelpPage() {
  return <Page title="Help" gate="read-only" detail="Connected vs preview explanation, gate legend, and safe workflow guide."><div style={s.threeCols}><Panel title="Connected vs preview" gate="read-only"><List items={["Frontend shell is connected", "Phase 9 review packet fixture is preview by default", "Renderer connection unavailable", "Backend mutation corridors are not widened"]} /></Panel><Panel title="Gate legend" gate="read-only"><List items={["read-only: can inspect data", "local preview: UI state only", "plan-only: draft or instruction", "proof-only: evidence display", "blocked/not admitted: disabled"]} /></Panel><Panel title="Workflow guide" gate="plan-only"><List items={["Create: draft prompt and plan", "Assets: inspect evidence", "Review: inspect packet", "Use Prompt Studio/Runtime/Builder only through existing safe navigation"]} /></Panel></div><BlockedSummary /></Page>;
}

function Page({ title, detail, gate, children, review = false }: { title: string; detail: string; gate: GateState; children: ReactNode; review?: boolean }) {
  return <section aria-label={'Asset Forge ' + title + ' page'} style={review ? s.reviewPage : s.page}><header style={s.pageHeader}><div><span style={s.eyebrow}>Asset Forge page</span><h2 style={s.pageTitle}>{title}</h2><p style={s.pageDetail}>{detail}</p></div><Badge gate={gate} /></header>{children}</section>;
}

function Panel({ title, gate, children }: { title: string; gate: GateState; children: ReactNode }) {
  return <section style={s.panel}><div style={s.panelHeader}>{title} <Badge gate={gate} /></div><div style={s.panelBody}>{children}</div></section>;
}

function Rows({ rows }: { rows: Array<[string, string]> }) {
  return <div style={s.rows}>{rows.map(([label, value]) => <div key={label} style={s.row}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

function List({ items }: { items: string[] }) {
  return <ul style={s.list}>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

function Tree({ groups }: { groups: Array<[string, string[]]> }) {
  return <div style={s.tree}>{groups.map(([group, nodes]) => <details key={group} open><summary style={s.summary}>{group}</summary><List items={nodes} /></details>)}</div>;
}

function ToolShelf({ activeTool, setActiveTool }: { activeTool: string; setActiveTool: (tool: string) => void }) {
  return (
    <aside aria-label="Forge left tool shelf" style={s.toolShelf}>
      {tools.map((tool) => {
        const gateColor = gateIndicatorColor(tool.gate);
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            type="button"
            aria-label={`${tool.id} tool - ${tool.gate}. ${tool.detail}`}
            title={`${tool.id} | ${tool.gate} | ${tool.detail}`}
            onClick={() => setActiveTool(tool.id)}
            style={isActive ? s.activeToolButton : s.toolButton}
          >
            <span style={s.toolShortLabel}>{tool.shortLabel}</span>
            <span
              aria-hidden
              style={{
                ...s.toolGateDot,
                background: gateColor,
                borderColor: gateColor,
                boxShadow: isActive ? `0 0 0 2px ${gateColor}44` : "none",
              }}
            />
          </button>
        );
      })}
    </aside>
  );
}

function ViewportPreview({ label }: { label: string }) {
  return <section aria-label="Forge viewport preview" style={s.viewport}><div style={s.gridFloor} /><div style={s.horizon} /><div style={s.axisX} /><div style={s.axisY} /><span style={s.gizmo}>XYZ</span><div style={s.previewObject}><span>{label}</span><strong>bridge_segment_preview_001</strong></div><span style={s.truthBadge}>Toolbench preview - renderer not connected</span></section>;
}

function CommandStrip({ onOpenPromptStudio, onOpenRuntimeOverview, onOpenBuilder }: Pick<AssetForgeStudioShellProps, "onOpenPromptStudio" | "onOpenRuntimeOverview" | "onOpenBuilder">) {
  return <section aria-label="Forge command strip" style={s.commandStrip}><strong>Command / Prompt strip</strong><span>Natural-language draft routes only to existing safe workspaces. No direct execution from this strip.</span><div style={s.buttonRow}><button type="button" onClick={onOpenPromptStudio} style={s.primaryButton}>Send to Prompt Studio</button><button type="button" onClick={onOpenRuntimeOverview} style={s.darkButton}>Open Runtime</button><button type="button" onClick={onOpenBuilder} style={s.darkButton}>Open Builder</button><button type="button" disabled style={s.disabledButton}>Run command</button></div></section>;
}

function BlockedSummary() {
  return <section aria-label="Forge blocked mutation summary" style={s.blockedSummary}><strong>Blocked mutation list</strong><div style={s.blockedChips}>{blockedMutations.map((item) => <span key={item} style={s.blockedChip}>{item}</span>)}</div></section>;
}

const s = {
  shell: { display: "grid", gridTemplateRows: "34px minmax(0, 1fr)", minWidth: 0, height: "100%", minHeight: 0, overflow: "hidden", border: "1px solid #26384f", borderRadius: 6, background: "#0b1017", color: "#c3cfdd", boxShadow: "0 18px 55px rgba(3, 12, 25, 0.35)", fontSize: 13, lineHeight: 1.35 },
  topMenu: { display: "flex", alignItems: "center", gap: 4, minWidth: 0, padding: "0 8px", borderBottom: "1px solid #27384b", background: "#101820", overflow: "hidden" },
  brand: { flex: "0 0 auto", marginRight: 10, color: "#eef5ff", whiteSpace: "nowrap" },
  menuButton: { flex: "0 1 auto", minWidth: 0, height: 24, padding: "0 6px", borderWidth: 1, borderStyle: "solid", borderColor: "transparent", borderRadius: 3, background: "transparent", color: "#c3cfdd", fontSize: 12, fontWeight: 800, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  activeMenuButton: { flex: "0 1 auto", minWidth: 0, height: 24, padding: "0 6px", borderWidth: 1, borderStyle: "solid", borderColor: "#4fa3ff", borderRadius: 3, background: "#173a5d", color: "#ffffff", fontSize: 12, fontWeight: 800, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  topStatus: { flex: "0 0 auto", marginLeft: "auto", color: "#8fa3bc", whiteSpace: "nowrap", fontSize: 11 },
  pageHost: { minWidth: 0, minHeight: 0, overflow: "auto" },
  page: { display: "grid", gridTemplateRows: "auto minmax(0, 1fr) auto", gap: 10, height: "100%", minWidth: 0, minHeight: 0, padding: 10, overflow: "auto", background: "#0b1017", boxSizing: "border-box" },
  reviewPage: { display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gap: 10, height: "100%", minWidth: 0, minHeight: 0, padding: 10, overflow: "auto", background: "#0b1017", boxSizing: "border-box" },
  pageHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "10px 12px", border: "1px solid #26384f", borderRadius: 5, background: "#121b25" },
  eyebrow: { color: "#7f95ad", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 11, fontWeight: 900 },
  pageTitle: { margin: "2px 0", color: "#f2f7ff", fontSize: 24, lineHeight: 1.1 },
  pageDetail: { margin: 0, color: "#9fb0c5", maxWidth: 940 },
  twoCols: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, minWidth: 0, minHeight: 0 },
  threeCols: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, minWidth: 0, minHeight: 0 },
  createGrid: { display: "grid", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 0.7fr) minmax(0, 1.4fr) minmax(0, 0.8fr)", gap: 10, minWidth: 0, minHeight: 0 },
  assetsGrid: { display: "grid", gridTemplateColumns: "160px minmax(0, 1fr) minmax(0, 0.45fr)", gap: 10, minWidth: 0, minHeight: 0 },
  editorGrid: { display: "grid", gridTemplateColumns: "64px minmax(0, 0.8fr) minmax(0, 1.3fr) minmax(0, 0.9fr)", gap: 10, minWidth: 0, minHeight: 0 },
  entityEditorGrid: { display: "grid", gridTemplateColumns: "64px minmax(0, 0.8fr) minmax(0, 1.3fr) minmax(0, 0.9fr)", gap: 10, minWidth: 0, minHeight: 0 },
  entityFocusGrid: { display: "grid", gridTemplateColumns: "64px minmax(0, 1fr)", gap: 10, minWidth: 0, minHeight: 0 },
  lightingGrid: { display: "grid", gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1fr)", gap: 10, minWidth: 0, minHeight: 0 },
  entityToolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minWidth: 0, border: "1px solid #2b3e55", borderRadius: 5, padding: "8px 10px", background: "#111923", color: "#aebbd0" },
  materialsGrid: { display: "grid", gridTemplateColumns: "minmax(0, 0.8fr) minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 0.8fr)", gap: 10, minWidth: 0, minHeight: 0 },
  cameraGrid: { display: "grid", gridTemplateColumns: "minmax(0, 0.7fr) minmax(0, 1.4fr) minmax(0, 0.9fr)", gap: 10, minWidth: 0, minHeight: 0 },
  reviewGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.42fr)", gap: 10, minWidth: 0, minHeight: 0 },
  reviewAside: { display: "grid", gridAutoRows: "min-content", gap: 10, minWidth: 0, overflow: "auto" },
  reviewPacketFrame: { minWidth: 0, minHeight: 0, overflow: "auto", border: "1px solid #26384f", borderRadius: 5, background: "#101820", padding: 10 },
  panel: { minWidth: 0, minHeight: 0, overflow: "hidden", display: "grid", gridTemplateRows: "32px minmax(0, 1fr)", border: "1px solid #2b3e55", borderRadius: 5, background: "#151f2b" },
  panelHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "0 10px", borderBottom: "1px solid #2b3e55", background: "#101820", color: "#eef5ff", fontWeight: 900 },
  panelBody: { minWidth: 0, minHeight: 0, overflow: "auto", padding: 10 },
  muted: { margin: "0 0 10px", color: "#9fb0c5" },
  textarea: { width: "100%", minHeight: 145, boxSizing: "border-box", resize: "none", border: "1px solid #344961", borderRadius: 4, padding: 10, background: "#0b1118", color: "#eef5ff", fontWeight: 800 },
  buttonRow: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 10 },
  primaryButton: { minHeight: 30, border: "1px solid #6baeff", borderRadius: 4, padding: "0 10px", background: "#3a8eff", color: "#06101d", fontWeight: 900, cursor: "pointer" },
  darkButton: { minHeight: 30, border: "1px solid #344961", borderRadius: 4, padding: "0 10px", background: "#192331", color: "#d8e4f2", fontWeight: 900, cursor: "pointer" },
  disabledButton: { minHeight: 30, border: "1px solid #344961", borderRadius: 4, padding: "0 10px", background: "#192331", color: "#d8e4f2", fontWeight: 900, opacity: 0.48, cursor: "not-allowed" },
  disabledWideButton: { width: "100%", minHeight: 30, marginTop: 10, border: "1px solid #344961", borderRadius: 4, padding: "0 10px", background: "#192331", color: "#d8e4f2", fontWeight: 900, opacity: 0.48, cursor: "not-allowed" },
  rows: { display: "grid", gap: 7 },
  row: { display: "grid", gridTemplateColumns: "minmax(0, 0.75fr) minmax(0, 1fr)", gap: 8, alignItems: "start", color: "#aebbd0", overflowWrap: "anywhere" },
  list: { margin: 0, padding: "0 0 0 18px", color: "#b8c6d7" },
  tree: { display: "grid", gap: 6 },
  summary: { cursor: "pointer", color: "#f2f7ff", fontWeight: 900 },
  toolShelf: { display: "grid", alignContent: "start", gap: 4, width: 64, minWidth: 64, maxWidth: 64, minHeight: 0, overflow: "hidden", border: "1px solid #2b3e55", borderRadius: 5, padding: 5, background: "#111923" },
  toolButton: { display: "grid", justifyItems: "center", alignContent: "center", gap: 4, minHeight: 38, border: "1px solid #2f4054", borderRadius: 4, background: "#17212d", color: "#d6e2ee", fontSize: 10, fontWeight: 900, cursor: "pointer", padding: "4px 0", overflow: "hidden" },
  activeToolButton: { display: "grid", justifyItems: "center", alignContent: "center", gap: 4, minHeight: 38, border: "1px solid #5aa9ff", borderRadius: 4, background: "#183f63", color: "#d6e2ee", fontSize: 10, fontWeight: 900, cursor: "pointer", padding: "4px 0", overflow: "hidden" },
  toolShortLabel: { fontSize: 10, fontWeight: 900, letterSpacing: "0.04em", lineHeight: 1 },
  toolGateDot: { width: 7, height: 7, borderRadius: "50%", borderWidth: 1, borderStyle: "solid" },
  viewport: { position: "relative", minHeight: 300, height: "100%", overflow: "hidden", border: "1px solid #35506e", borderRadius: 5, background: "linear-gradient(180deg, #0d2740 0%, #071019 58%, #05080d 100%)" },
  gridFloor: { position: "absolute", inset: "48% 0 0 0", backgroundImage: "linear-gradient(rgba(98, 167, 255, 0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(98, 167, 255, 0.18) 1px, transparent 1px)", backgroundSize: "34px 34px", transform: "perspective(380px) rotateX(60deg)", transformOrigin: "top center" },
  horizon: { position: "absolute", left: 0, right: 0, top: "48%", height: 1, background: "rgba(179, 212, 255, 0.42)" },
  axisX: { position: "absolute", left: "18%", right: "18%", top: "61%", height: 1, background: "rgba(77, 156, 255, 0.45)" },
  axisY: { position: "absolute", left: "50%", top: "24%", bottom: "22%", width: 1, background: "rgba(255, 82, 132, 0.6)" },
  gizmo: { position: "absolute", top: 12, right: 12, border: "1px solid #6a7b90", borderRadius: 3, padding: "4px 6px", color: "#e8f3ff", fontWeight: 900 },
  previewObject: { position: "absolute", left: "50%", top: "55%", transform: "translate(-50%, -50%)", display: "grid", gap: 4, padding: "12px 16px", border: "1px solid #44617e", borderRadius: 4, background: "rgba(7, 13, 22, 0.84)", color: "#ffffff", textAlign: "center" },
  truthBadge: { position: "absolute", right: 12, bottom: 10, border: "1px solid #b6852d", borderRadius: 3, padding: "4px 8px", background: "rgba(83, 56, 18, 0.65)", color: "#ffe4a4", fontSize: 12, fontWeight: 900 },
  commandStrip: { display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: 10, alignItems: "center", minWidth: 0, border: "1px solid #2b3e55", borderRadius: 5, padding: 10, background: "#111923" },
  blockedSummary: { display: "grid", gap: 7, border: "1px solid #55313b", borderRadius: 5, padding: 9, background: "rgba(96, 31, 45, 0.2)" },
  blockedChips: { display: "flex", flexWrap: "wrap", gap: 6 },
  blockedChip: { border: "1px solid #a64b5b", borderRadius: 3, padding: "3px 7px", color: "#ffadba", background: "rgba(96, 31, 45, 0.46)", fontSize: 12, fontWeight: 900 },
  rail: { display: "grid", alignContent: "start", gap: 6, minWidth: 0, overflow: "hidden", border: "1px solid #2b3e55", borderRadius: 5, padding: 8, background: "#111923" },
  railButton: { minHeight: 34, border: "1px solid #344961", borderRadius: 4, background: "#192331", color: "#d8e4f2", fontWeight: 900, textAlign: "left", padding: "0 10px", cursor: "pointer" },
  activeRailButton: { minHeight: 34, border: "1px solid #5aa9ff", borderRadius: 4, background: "#173a5d", color: "#ffffff", fontWeight: 900, textAlign: "left", padding: "0 10px", cursor: "pointer" },
  browser: { minWidth: 0, minHeight: 0, overflow: "hidden", display: "grid", gridTemplateRows: "32px minmax(0, 1fr)", border: "1px solid #2b3e55", borderRadius: 5, background: "#151f2b" },
  assetTiles: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, minWidth: 0, overflow: "auto", padding: 10 },
  assetTile: { display: "grid", gap: 7, alignContent: "start", minHeight: 104, border: "1px solid #2f4054", borderRadius: 4, padding: 10, background: "#18222e", color: "#c7d4e2", overflowWrap: "anywhere" },
  materialPreview: { display: "grid", placeItems: "center", gap: 12, minHeight: 250, border: "1px solid #344961", borderRadius: 5, background: "radial-gradient(circle at 50% 35%, rgba(94, 157, 255, 0.2), rgba(9, 15, 23, 0.95) 58%)", color: "#d7e5f5", textAlign: "center" },
  materialSphere: { width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle at 34% 28%, #d8e7ff, #667990 34%, #1f2a38 66%, #0b1017)", border: "1px solid #56708c", boxShadow: "0 18px 50px rgba(0, 0, 0, 0.45)" },
  smallButton: { minHeight: 28, border: "1px solid #344961", borderRadius: 4, padding: "0 9px", background: "#192331", color: "#d8e4f2", fontWeight: 900, cursor: "pointer" },
  activeSmallButton: { minHeight: 28, border: "1px solid #5aa9ff", borderRadius: 4, padding: "0 9px", background: "#173a5d", color: "#ffffff", fontWeight: 900, cursor: "pointer" },
  badge: { display: "inline-flex", alignItems: "center", borderWidth: 1, borderStyle: "solid", borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" },
} satisfies Record<string, CSSProperties>;
