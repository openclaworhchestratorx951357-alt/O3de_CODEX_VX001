import type { CSSProperties } from "react";

import type {
  AdaptersResponse,
  AssetForgeBlenderStatusRecord,
  AssetForgeEditorModelRecord,
  AssetForgeProviderStatusRecord,
  AssetForgeTaskRecord,
  O3DEBridgeStatus,
  ReadinessStatus,
} from "../../types/contracts";
import type { PlacementProofOnlyReviewSnapshot } from "../../lib/promptPlacementProofOnlyReview";
import type { O3DEProjectProfile } from "../../types/o3deProjectProfiles";

type Props = {
  projectProfile?: O3DEProjectProfile;
  taskModel?: AssetForgeTaskRecord | null;
  providerStatus?: AssetForgeProviderStatusRecord | null;
  blenderStatus?: AssetForgeBlenderStatusRecord | null;
  editorModel?: AssetForgeEditorModelRecord | null;
  editorModelError?: string | null;
  bridgeStatus?: O3DEBridgeStatus | null;
  adapters?: AdaptersResponse | null;
  readiness?: ReadinessStatus | null;
  latestRunId?: string | null;
  latestExecutionId?: string | null;
  latestArtifactId?: string | null;
  latestPlacementProofOnlyReview?: PlacementProofOnlyReviewSnapshot | null;
  onOpenPromptStudio?: () => void;
  onLaunchInspectTemplate?: () => void;
  onLaunchPlacementProofTemplate?: () => void;
  onOpenRecords?: () => void;
  onOpenRuntimeOverview?: () => void;
  onViewLatestRun?: () => void;
  onViewExecution?: () => void;
  onViewArtifact?: () => void;
  onViewEvidence?: () => void;
};

type Tone = "demo" | "read-only" | "plan-only" | "preflight-only" | "proof-only" | "blocked" | "review";

const fallbackTools = [
  ["transform", "Transform", "T", "demo"],
  ["translate", "Translate", "G", "demo"],
  ["rotate", "Rotate", "R", "demo"],
  ["scale", "Scale", "S", "demo"],
  ["origin", "Origin", "O", "plan-only"],
  ["object", "Object", "", "plan-only"],
  ["duplicate", "Duplicate", "", "blocked"],
  ["delete", "Delete", "", "blocked"],
  ["join", "Join", "J", "blocked"],
  ["split", "Split", "", "blocked"],
  ["smoothing", "Smoothing", "", "preflight-only"],
  ["smooth", "Smooth", "", "preflight-only"],
  ["flat", "Flat", "", "preflight-only"],
  ["keyframes", "Keyframes", "", "blocked"],
  ["insert-keyframe", "Insert", "I", "blocked"],
  ["remove-keyframe", "Remove", "", "blocked"],
  ["motion-paths", "Motion Paths", "", "blocked"],
  ["calculate-paths", "Calculate Paths", "", "blocked"],
  ["clear-paths", "Clear Paths", "", "blocked"],
  ["repeat-last", "Repeat Last", "", "read-only"],
  ["history", "History", "", "read-only"],
  ["grease-pencil", "Grease Pencil", "", "blocked"],
  ["draw-line", "Draw Line", "", "blocked"],
  ["erase", "Erase", "", "blocked"],
  ["use-sketching", "Use Sketching", "", "blocked"],
] as const;

const fallbackOutliner = [
  ["scene", "Scene", "scene", 0, "read-only"],
  ["asset-root", "Asset Root", "root", 1, "demo"],
  ["mesh-lod0", "Mesh_LOD0", "mesh", 2, "demo"],
  ["mesh-lod1", "Mesh_LOD1 planned", "mesh", 2, "plan-only"],
  ["materials", "Materials", "material", 2, "blocked"],
  ["textures", "Textures", "texture", 2, "read-only"],
  ["collision", "Collision planned", "collision", 2, "plan-only"],
  ["export-manifest", "Export Manifest planned", "manifest", 2, "plan-only"],
] as const;

function toneStyle(toneRaw: string): CSSProperties {
  const tone = toneRaw as Tone;
  if (tone === "demo") {
    return { background: "#294966", borderColor: "#5aa8ff", color: "#e7f2ff" };
  }
  if (tone === "read-only" || tone === "review") {
    return { background: "#164e4a", borderColor: "#2dd4bf", color: "#ddfffb" };
  }
  if (tone === "preflight-only") {
    return { background: "#5b4312", borderColor: "#d6a536", color: "#fff4cc" };
  }
  if (tone === "proof-only") {
    return { background: "#46306f", borderColor: "#a78bfa", color: "#f2eaff" };
  }
  if (tone === "blocked") {
    return { background: "#65313b", borderColor: "#f87171", color: "#ffe4e6" };
  }
  return { background: "#3f4652", borderColor: "#9ca3af", color: "#f1f5f9" };
}

function Badge({ tone }: { tone: string }) {
  return <span style={{ ...styles.badge, ...toneStyle(tone) }}>{tone}</span>;
}

function getCandidate(taskModel?: AssetForgeTaskRecord | null) {
  const first = taskModel?.candidates?.[0];
  return {
    id: first?.candidate_id ?? "candidate-a",
    name: first?.display_name ?? "Weathered Ivy Arch",
    triangles: first?.estimated_triangles ?? "tri estimate unavailable",
    readiness: first?.readiness_placeholder ?? "readiness pending proof-only review",
  };
}

function getTools(model?: AssetForgeEditorModelRecord | null) {
  if (model?.tools?.length) {
    return model.tools.map((tool) => ({
      id: tool.tool_id,
      label: tool.label,
      shortcut: tool.shortcut ?? "",
      truth: tool.truth_state,
    }));
  }

  return fallbackTools.map(([id, label, shortcut, truth]) => ({
    id,
    label,
    shortcut,
    truth,
  }));
}

function getOutliner(model?: AssetForgeEditorModelRecord | null) {
  if (model?.outliner?.length) {
    return model.outliner.map((node) => ({
      id: node.node_id,
      label: node.label,
      kind: node.kind,
      depth: node.depth,
      truth: node.truth_state,
    }));
  }

  return fallbackOutliner.map(([id, label, kind, depth, truth]) => ({
    id,
    label,
    kind,
    depth,
    truth,
  }));
}

function getOverlayLines(model?: AssetForgeEditorModelRecord | null) {
  return model?.viewport?.overlays?.length
    ? model.viewport.overlays
    : [
        "Axis: Z-up demo",
        "No real model loaded",
        "No provider/Blender/Asset Processor/O3DE mutation admitted",
      ];
}

function getPropertyRows({
  model,
  providerStatus,
  blenderStatus,
  bridgeStatus,
  adapters,
  readiness,
  candidate,
}: {
  model?: AssetForgeEditorModelRecord | null;
  providerStatus?: AssetForgeProviderStatusRecord | null;
  blenderStatus?: AssetForgeBlenderStatusRecord | null;
  bridgeStatus?: O3DEBridgeStatus | null;
  adapters?: AdaptersResponse | null;
  readiness?: ReadinessStatus | null;
  candidate: ReturnType<typeof getCandidate>;
}) {
  if (model?.properties?.rows?.length) {
    return model.properties.rows.map((row) => ({
      label: row.label ?? row.name ?? "Property",
      value: row.value ?? row.status ?? "not reported",
      tone: row.truth_state ?? row.tone ?? undefined,
    }));
  }

  return [
    { label: "Candidate", value: `${candidate.name} (${candidate.id})` },
    { label: "Location X/Y/Z", value: "0.000 / 0.000 / 0.000", tone: "blocked" },
    { label: "Rotation X/Y/Z", value: "0.000 / 0.000 / 0.000", tone: "blocked" },
    { label: "Scale X/Y/Z", value: "1.000 / 1.000 / 1.000", tone: "blocked" },
    { label: "Dimensions X/Y/Z", value: "0.000 / 0.000 / 0.000", tone: "blocked" },
    {
      label: "Project",
      value: bridgeStatus?.project_root ?? "unknown project target",
    },
    {
      label: "Bridge",
      value: bridgeStatus
        ? `${bridgeStatus.configured ? "configured" : "not configured"} / heartbeat ${
            bridgeStatus.heartbeat_fresh ? "fresh" : "stale"
          }`
        : "bridge unavailable",
    },
    {
      label: "Adapter",
      value: adapters?.active_mode ?? readiness?.adapter_mode?.active_mode ?? "unknown",
    },
    {
      label: "Provider",
      value: providerStatus
        ? `${providerStatus.provider_mode}; ${providerStatus.generation_execution_status}`
        : "blocked / status unavailable",
      tone: "blocked",
    },
    {
      label: "Blender",
      value: blenderStatus
        ? `${blenderStatus.executable_found ? "detected" : "missing"}; ${blenderStatus.blender_prep_execution_status}`
        : "preflight-only / status unavailable",
      tone: "preflight-only",
    },
    { label: "Execution admitted", value: "false", tone: "blocked" },
    { label: "Placement write admitted", value: "false", tone: "blocked" },
    { label: "Mutation occurred", value: "false", tone: "read-only" },
    { label: "Surface", value: "Lambert / demo" },
    { label: "Diffuse", value: "mutation blocked", tone: "blocked" },
    { label: "Specular", value: "mutation blocked", tone: "blocked" },
    { label: "Transparency", value: "not admitted", tone: "blocked" },
  ];
}

export default function AssetForgeBlenderCockpit({
  projectProfile,
  taskModel,
  providerStatus,
  blenderStatus,
  editorModel,
  editorModelError,
  bridgeStatus,
  adapters,
  readiness,
  latestRunId,
  latestExecutionId,
  latestArtifactId,
  latestPlacementProofOnlyReview,
  onOpenPromptStudio,
  onLaunchInspectTemplate,
  onLaunchPlacementProofTemplate,
  onOpenRecords,
  onOpenRuntimeOverview,
  onViewLatestRun,
  onViewExecution,
  onViewArtifact,
  onViewEvidence,
}: Props) {
  const candidate = getCandidate(taskModel);
  const tools = getTools(editorModel);
  const outliner = getOutliner(editorModel);
  const overlays = getOverlayLines(editorModel);
  const propertyRows = getPropertyRows({
    model: editorModel,
    providerStatus,
    blenderStatus,
    bridgeStatus,
    adapters,
    readiness,
    candidate,
  });

  return (
    <section style={styles.app} aria-label="Asset Forge Blender-like editor">
      <header style={styles.menuBar}>
        <div style={styles.menuLeft}>
          <strong style={styles.brand}>Asset Forge</strong>
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Candidate</span>
          <span>Stage</span>
          <span>Proof</span>
          <span>Review</span>
        </div>
        <div style={styles.menuRight}>
          <span>{projectProfile?.name ?? "McpSandbox"}</span>
          <span>{editorModel ? "backend model" : "frontend fallback"}</span>
          <Badge tone="blocked" />
        </div>
      </header>

      <section style={styles.contextBar}>
        <div style={styles.contextLeft}>
          <span style={styles.modePill}>{editorModel?.viewport?.mode ?? "Object Mode"}</span>
          <span>{editorModel?.viewport?.label ?? "Front Ortho"}</span>
          <span>Candidate: {candidate.name}</span>
          {editorModelError ? (
            <span style={styles.warningText}>Editor model backend unavailable; using frontend fallback. No execution admitted.</span>
          ) : null}
        </div>
        <div style={styles.contextActions}>
          <button type="button" onClick={onLaunchInspectTemplate} style={styles.smallButton}>Inspect / Preflight</button>
          <button type="button" onClick={onLaunchPlacementProofTemplate} style={styles.primaryButton}>Load proof-only template</button>
          <button type="button" onClick={onOpenPromptStudio} style={styles.smallButton}>Prompt Studio</button>
          <button type="button" onClick={onOpenRecords} style={styles.smallButton}>Records</button>
        </div>
      </section>

      <div style={styles.editorFrame}>
        <aside style={styles.toolShelf} aria-label="Asset Forge left tool shelf">
          <div style={styles.panelHeader}>Object Tools</div>
          <div style={styles.toolList}>
            {tools.map((tool) => (
              <button key={tool.id} type="button" style={styles.toolButton}>
                <span style={styles.toolShortcut}>{tool.shortcut || "*"}</span>
                <span style={styles.toolLabel}>{tool.label}</span>
                <Badge tone={tool.truth} />
              </button>
            ))}
          </div>
        </aside>

        <main style={styles.viewportPane} aria-label="Asset Forge central 3D viewport">
          <header style={styles.viewportHeader}>
            <div style={styles.viewportMenus}>
              <span>View</span>
              <span>Select</span>
              <span>Add</span>
              <span>Object</span>
            </div>
            <div style={styles.viewportModes}>
              {(editorModel?.viewport?.shading_modes ?? ["Solid", "Wireframe", "Material Preview", "O3DE Preview"]).map((mode) => (
                <button key={mode} type="button" style={styles.viewportModeButton}>
                  {mode}
                </button>
              ))}
            </div>
          </header>

          <div style={styles.viewportCanvas}>
            <div style={styles.gridLayer} />
            <div style={styles.meshPreview} aria-label="demo wireframe asset preview">
              <div style={styles.headShape} />
              <div style={styles.neckShape} />
              <div style={styles.torsoShape} />
              {Array.from({ length: 24 }).map((_, index) => (
                <span
                  key={`wire-h-${index}`}
                  style={{
                    ...styles.wireLine,
                    top: `${7 + index * 3.6}%`,
                    left: "14%",
                    width: "72%",
                    transform: `rotate(${index % 2 === 0 ? 2 : -2}deg)`,
                  }}
                />
              ))}
              {Array.from({ length: 22 }).map((_, index) => (
                <span
                  key={`wire-v-${index}`}
                  style={{
                    ...styles.wireLineVertical,
                    left: `${15 + index * 3.25}%`,
                    top: "7%",
                    height: "76%",
                    transform: `rotate(${index % 2 === 0 ? 7 : -7}deg)`,
                  }}
                />
              ))}
            </div>
            <div style={styles.overlayTopLeft}>{editorModel?.viewport?.label ?? "Front Ortho"}</div>
            <div style={styles.overlayTopRight}>{editorModel?.viewport?.mode ?? "Object Mode"}</div>
            <ul style={styles.overlayList}>
              {overlays.map((overlay) => (
                <li key={overlay}>{overlay}</li>
              ))}
            </ul>
            <div style={styles.overlayBottom}>
              {editorModel?.viewport?.preview_status ?? "demo_no_real_model_loaded"} - no provider generation, Blender execution, Asset Processor execution, or O3DE mutation admitted.
            </div>
          </div>

          <footer style={styles.viewportFooter}>
            <span>View</span>
            <span>Select</span>
            <span>Add</span>
            <span>Object Mode</span>
            <span>Front Ortho</span>
            <span>No Sync</span>
          </footer>
        </main>

        <aside style={styles.rightPane} aria-label="Asset Forge right outliner and properties">
          <section style={styles.outlinerPanel} aria-label="Asset Forge backend outliner">
            <div style={styles.panelHeader}>Outliner</div>
            <div style={styles.outlinerSearch}>View  Search  All Scenes</div>
            <div style={styles.outlinerList}>
              {outliner.map((node) => (
                <div key={node.id} style={{ ...styles.outlinerRow, paddingLeft: 6 + node.depth * 12 }}>
                  <span style={styles.outlinerTwist}>{">"}</span>
                  <span style={styles.outlinerName}>{node.label}</span>
                  <Badge tone={node.truth} />
                </div>
              ))}
            </div>
          </section>

          <section style={styles.propertiesPanel} aria-label="Asset Forge transform and material properties">
            <div style={styles.panelHeader}>Properties</div>
            <div style={styles.propertiesTabs}>
              <span>Transform</span>
              <span>Object</span>
              <span>Material</span>
              <span>Proof</span>
            </div>
            <div style={styles.previewChecker}>
              <div style={styles.previewSphere} />
            </div>
            <div style={styles.propertiesRows}>
              {propertyRows.map((row) => (
                <div key={`${row.label}-${row.value}`} style={styles.propertyRow}>
                  <span style={styles.propertyLabel}>{row.label}</span>
                  <span style={styles.propertyValue}>{row.value}</span>
                  {row.tone ? <Badge tone={row.tone} /> : null}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <footer style={styles.timelineStrip} aria-label="Asset Forge timeline evidence and prompt strip">
        <div style={styles.timelineTabs}>
          <span>Timeline</span>
          <span>Evidence</span>
          <span>Prompt Template</span>
          <span>Logs</span>
          <span>Latest Artifacts</span>
        </div>
        <div style={styles.timelineBody}>
          <span>Start 1</span>
          <div style={styles.timelineTrack}>
            {Array.from({ length: 30 }).map((_, index) => (
              <span key={index} style={styles.tick}>{index % 5 === 0 ? index * 10 : ""}</span>
            ))}
          </div>
          <span>End 250</span>
          <button type="button" onClick={onViewLatestRun} style={styles.smallButton}>Run</button>
          <button type="button" onClick={onViewExecution} style={styles.smallButton}>Execution</button>
          <button type="button" onClick={onViewArtifact} style={styles.smallButton}>Artifact</button>
          <button type="button" onClick={onViewEvidence} style={styles.smallButton}>Evidence</button>
          <button type="button" onClick={onOpenRuntimeOverview} style={styles.smallButton}>Runtime</button>
          <span style={styles.statusText}>Run: {latestRunId ?? "not selected"}</span>
          <span style={styles.statusText}>Exec: {latestExecutionId ?? "not selected"}</span>
          <span style={styles.statusText}>Artifact: {latestArtifactId ?? "not selected"}</span>
          <span style={styles.statusText}>
            {latestPlacementProofOnlyReview ? "proof-only snapshot loaded" : "no placement proof snapshot"}
          </span>
        </div>
      </footer>
    </section>
  );
}

const border = "1px solid #6f747b";
const panelHeaderBg = "#a8adb3";

const styles = {
  app: {
    height: "calc(100vh - 120px)",
    minHeight: 680,
    width: "100%",
    minWidth: 0,
    display: "grid",
    gridTemplateRows: "22px 28px minmax(0, 1fr) 48px",
    overflow: "hidden",
    background: "#7a7f86",
    color: "#101820",
    fontFamily: "Arial, Helvetica, sans-serif",
    border,
  },
  menuBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "0 8px",
    background: "#c4c8cd",
    borderBottom: border,
    fontSize: 12,
    minWidth: 0,
  },
  menuLeft: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  menuRight: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    whiteSpace: "nowrap",
  },
  brand: {
    fontWeight: 800,
  },
  contextBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    padding: "0 8px",
    background: "#b4b9bf",
    borderBottom: border,
    minWidth: 0,
    fontSize: 12,
  },
  contextLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  contextActions: {
    display: "flex",
    gap: 6,
    whiteSpace: "nowrap",
  },
  modePill: {
    border: "1px solid #6f747b",
    borderRadius: 3,
    padding: "2px 7px",
    background: "#e1e4e8",
    fontWeight: 700,
  },
  warningText: {
    color: "#c2410c",
    fontWeight: 700,
  },
  editorFrame: {
    minHeight: 0,
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "86px minmax(720px, 1fr) 324px",
    overflow: "hidden",
    background: "#6f747b",
  },
  toolShelf: {
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "24px minmax(0, 1fr)",
    background: "#8d9298",
    borderRight: border,
    overflow: "hidden",
  },
  panelHeader: {
    minHeight: 24,
    display: "flex",
    alignItems: "center",
    padding: "0 6px",
    background: panelHeaderBg,
    borderBottom: border,
    fontSize: 12,
    fontWeight: 800,
  },
  toolList: {
    minHeight: 0,
    overflow: "auto",
    display: "grid",
    alignContent: "start",
    gap: 3,
    padding: 4,
  },
  toolButton: {
    display: "grid",
    gridTemplateColumns: "20px minmax(0, 1fr) auto",
    gap: 3,
    alignItems: "center",
    minWidth: 0,
    minHeight: 24,
    padding: "2px 3px",
    border: "1px solid #646a71",
    borderRadius: 2,
    background: "#c9cdd2",
    color: "#101820",
    fontSize: 11,
    cursor: "pointer",
  },
  toolShortcut: {
    display: "grid",
    placeItems: "center",
    height: 18,
    border: "1px solid #7b8087",
    background: "#eef0f3",
    fontWeight: 800,
  },
  toolLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "left",
  },
  viewportPane: {
    minHeight: 0,
    minWidth: 0,
    display: "grid",
    gridTemplateRows: "24px minmax(0, 1fr) 24px",
    overflow: "hidden",
    background: "#30353b",
  },
  viewportHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
    padding: "0 6px",
    background: "#aab0b6",
    borderBottom: border,
    fontSize: 12,
    minWidth: 0,
  },
  viewportMenus: {
    display: "flex",
    gap: 12,
    overflow: "hidden",
    whiteSpace: "nowrap",
    minWidth: 0,
  },
  viewportModes: {
    display: "flex",
    gap: 4,
    whiteSpace: "nowrap",
  },
  viewportModeButton: {
    border: "1px solid #646a71",
    borderRadius: 3,
    background: "#d7dbe0",
    padding: "2px 6px",
    fontSize: 11,
  },
  viewportCanvas: {
    position: "relative",
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
    background: "#2f343b",
  },
  gridLayer: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
    backgroundSize: "24px 24px",
  },
  meshPreview: {
    position: "absolute",
    left: "50%",
    top: "47%",
    width: "min(60vw, 560px)",
    height: "min(62vh, 560px)",
    transform: "translate(-50%, -50%)",
  },
  headShape: {
    position: "absolute",
    left: "36%",
    top: "5%",
    width: "28%",
    height: "30%",
    border: "2px solid rgba(230,235,245,0.86)",
    borderRadius: "44% 44% 48% 48%",
    background: "rgba(170,176,185,0.18)",
  },
  neckShape: {
    position: "absolute",
    left: "43%",
    top: "34%",
    width: "14%",
    height: "12%",
    border: "2px solid rgba(230,235,245,0.65)",
    background: "rgba(170,176,185,0.12)",
  },
  torsoShape: {
    position: "absolute",
    left: "17%",
    top: "44%",
    width: "66%",
    height: "35%",
    border: "2px solid rgba(96,142,210,0.9)",
    borderRadius: "22% 22% 10% 10%",
    background: "rgba(77,111,158,0.42)",
  },
  wireLine: {
    position: "absolute",
    height: 1,
    background: "rgba(235,240,248,0.42)",
    pointerEvents: "none",
  },
  wireLineVertical: {
    position: "absolute",
    width: 1,
    background: "rgba(235,240,248,0.35)",
    pointerEvents: "none",
  },
  overlayTopLeft: {
    position: "absolute",
    top: 8,
    left: 8,
    padding: "3px 7px",
    borderRadius: 3,
    background: "rgba(8,12,18,0.76)",
    color: "#f8fafc",
    fontSize: 12,
  },
  overlayTopRight: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: "3px 7px",
    borderRadius: 3,
    background: "rgba(8,12,18,0.76)",
    color: "#f8fafc",
    fontSize: 12,
  },
  overlayList: {
    position: "absolute",
    top: 38,
    left: 10,
    margin: 0,
    paddingLeft: 18,
    color: "#f8fafc",
    fontSize: 12,
    lineHeight: 1.55,
    background: "rgba(8,12,18,0.2)",
  },
  overlayBottom: {
    position: "absolute",
    left: 8,
    bottom: 8,
    maxWidth: "calc(100% - 16px)",
    padding: "5px 8px",
    borderRadius: 3,
    background: "rgba(8,12,18,0.82)",
    color: "#f8fafc",
    fontSize: 12,
    overflowWrap: "anywhere",
  },
  viewportFooter: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 6px",
    background: "#aab0b6",
    borderTop: border,
    fontSize: 11,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  rightPane: {
    minHeight: 0,
    minWidth: 0,
    display: "grid",
    gridTemplateRows: "210px minmax(0, 1fr)",
    background: "#8d9298",
    borderLeft: border,
    overflow: "hidden",
  },
  outlinerPanel: {
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "24px 22px minmax(0, 1fr)",
    overflow: "hidden",
    borderBottom: border,
  },
  outlinerSearch: {
    display: "flex",
    alignItems: "center",
    padding: "0 6px",
    background: "#c0c5cb",
    borderBottom: border,
    fontSize: 11,
  },
  outlinerList: {
    minHeight: 0,
    overflow: "auto",
    background: "#d3d7dc",
    fontSize: 11,
  },
  outlinerRow: {
    display: "grid",
    gridTemplateColumns: "12px minmax(0, 1fr) auto",
    gap: 4,
    alignItems: "center",
    borderBottom: "1px solid #b3b8bf",
    paddingTop: 2,
    paddingBottom: 2,
    paddingRight: 4,
    minWidth: 0,
  },
  outlinerTwist: {
    color: "#334155",
  },
  outlinerName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  propertiesPanel: {
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "24px 24px 90px minmax(0, 1fr)",
    overflow: "hidden",
  },
  propertiesTabs: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "0 5px",
    background: "#bfc4ca",
    borderBottom: border,
    fontSize: 11,
  },
  previewChecker: {
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(45deg, #bfc4ca 25%, transparent 25%), linear-gradient(-45deg, #bfc4ca 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #bfc4ca 75%), linear-gradient(-45deg, transparent 75%, #bfc4ca 75%)",
    backgroundSize: "24px 24px",
    backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
    borderBottom: border,
  },
  previewSphere: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "radial-gradient(circle at 35% 30%, #f0d5c3, #8d7066)",
    boxShadow: "0 5px 14px rgba(0,0,0,0.35)",
  },
  propertiesRows: {
    minHeight: 0,
    overflow: "auto",
    display: "grid",
    alignContent: "start",
    gap: 4,
    padding: 5,
    background: "#c9cdd2",
  },
  propertyRow: {
    display: "grid",
    gridTemplateColumns: "112px minmax(0, 1fr) auto",
    gap: 5,
    alignItems: "center",
    minWidth: 0,
    padding: "3px 4px",
    border: "1px solid #9aa0a8",
    background: "#e2e5e9",
    fontSize: 11,
  },
  propertyLabel: {
    fontWeight: 800,
    color: "#334155",
  },
  propertyValue: {
    minWidth: 0,
    overflowWrap: "anywhere",
  },
  timelineStrip: {
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "20px 28px",
    background: "#9ea4ac",
    borderTop: border,
    overflow: "hidden",
  },
  timelineTabs: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 6px",
    background: "#b9bec5",
    borderBottom: border,
    fontSize: 11,
  },
  timelineBody: {
    display: "grid",
    gridTemplateColumns: "auto minmax(260px, 1fr) auto auto auto auto auto auto auto auto auto auto",
    gap: 6,
    alignItems: "center",
    padding: "0 6px",
    minWidth: 0,
    overflow: "hidden",
    fontSize: 11,
  },
  timelineTrack: {
    minWidth: 0,
    height: 18,
    display: "grid",
    gridTemplateColumns: "repeat(30, minmax(8px, 1fr))",
    border: "1px solid #777",
    background: "#d5d8dc",
    overflow: "hidden",
  },
  tick: {
    borderRight: "1px solid #aaa",
    textAlign: "center",
    fontSize: 9,
    color: "#333",
  },
  statusText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  badge: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    border: "1px solid",
    borderRadius: 3,
    padding: "1px 4px",
    fontSize: 9,
    fontWeight: 800,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  smallButton: {
    border: "1px solid #777",
    borderRadius: 3,
    padding: "3px 6px",
    background: "#d6d9dd",
    color: "#111827",
    cursor: "pointer",
    fontSize: 11,
    whiteSpace: "nowrap",
  },
  primaryButton: {
    border: "1px solid #2563eb",
    borderRadius: 3,
    padding: "3px 6px",
    background: "#dbeafe",
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
} satisfies Record<string, CSSProperties>;
