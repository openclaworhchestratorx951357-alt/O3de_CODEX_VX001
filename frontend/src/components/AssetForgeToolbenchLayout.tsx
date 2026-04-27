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

type IntegrationDockAction = {
  label: string;
  gate: GateState;
  detail: string;
};

type XSheetTrack = {
  label: string;
  gate: GateState;
  cells: string[];
};

type ProductionWorkspaceLayout =
  | "Forge Command"
  | "Modeling / Assembly"
  | "Animation / Timeline"
  | "Materials / Lookdev"
  | "Asset Management"
  | "Review / Approval"
  | "Automation Studio"
  | "Collaboration / Versioning";

type ViewportMode = "Single View" | "Dual View" | "Quad View" | "Camera + Perspective";
type PanelSet = "Core Panels" | "Evidence Panels" | "Asset Panels" | "Extension Panels";
type BottomDockMode = "Timeline" | "X-Sheet" | "Status board" | "Review packet";
type InspectorMode = "Selection" | "Transform" | "Readiness" | "Approval";
type DensityMode = "Compact" | "Expanded";

type WorkspacePanel = {
  title: string;
  gate: GateState;
  items: string[];
};

type SavedLayoutPreferences = {
  activeWorkspaceLayout: ProductionWorkspaceLayout;
  activeViewportMode: ViewportMode;
  activePanelSet: PanelSet;
  bottomDockMode: BottomDockMode;
  inspectorMode: InspectorMode;
  densityMode: DensityMode;
};

type EvidenceTab = "Timeline" | "X-Sheet" | "Status board" | "Review packet";

type AssetForgeToolbenchLayoutProps = {
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  reviewPacketData: unknown;
  reviewPacketSource: AssetForgeReviewPacketSource;
};

const UNKNOWN_VALUE = "Unknown / unavailable";
const LAYOUT_STORAGE_KEY = "o3de-asset-forge-production-layout-preferences";
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

const productionWorkspaceLayouts: ProductionWorkspaceLayout[] = [
  "Forge Command",
  "Modeling / Assembly",
  "Animation / Timeline",
  "Materials / Lookdev",
  "Asset Management",
  "Review / Approval",
  "Automation Studio",
  "Collaboration / Versioning",
];

const viewportModes: ViewportMode[] = ["Single View", "Dual View", "Quad View", "Camera + Perspective"];
const panelSets: PanelSet[] = ["Core Panels", "Evidence Panels", "Asset Panels", "Extension Panels"];
const bottomDockModes: BottomDockMode[] = ["Timeline", "X-Sheet", "Status board", "Review packet"];
const inspectorModes: InspectorMode[] = ["Selection", "Transform", "Readiness", "Approval"];

const workspacePanels: Record<ProductionWorkspaceLayout, WorkspacePanel[]> = {
  "Forge Command": [
    {
      title: "Prompt request",
      gate: "plan-only",
      items: ["Natural-language request", "Prompt Studio route", "No direct execution"],
    },
    {
      title: "Forge plan",
      gate: "proof-only",
      items: ["Typed plan preview", "Phase 9 readback context", "Safest next step"],
    },
    {
      title: "Review packet summary",
      gate: "read-only",
      items: ["Source evidence", "Product evidence", "Catalog evidence"],
    },
    {
      title: "Approval gates",
      gate: "requires approval",
      items: ["Operator approval state", "Unknown production approval", "Blocked mutation list"],
    },
  ],
  "Modeling / Assembly": [
    {
      title: "Tool shelf",
      gate: "local preview",
      items: ["Select", "Measure", "Camera", "Transform mutation blocked"],
    },
    {
      title: "Outliner",
      gate: "local preview",
      items: ["Level Root", "Asset Candidates", "Review Targets"],
    },
    {
      title: "Transform inspector",
      gate: "read-only",
      items: ["Position unknown", "Rotation unknown", "Scale unknown"],
    },
    {
      title: "Assembly readiness",
      gate: "blocked",
      items: ["Component readiness", "Collision readiness", "Placement blocked"],
    },
  ],
  "Animation / Timeline": [
    {
      title: "Timeline",
      gate: "local preview",
      items: ["X-sheet playhead", "Frame lane preview", "Sequence notes"],
    },
    {
      title: "Keyframe lane preview",
      gate: "plan-only",
      items: ["Camera Cut", "Asset Candidate", "Material Check"],
    },
    {
      title: "Camera shot list",
      gate: "local preview",
      items: ["A001", "A002", "A003", "A004"],
    },
    {
      title: "Animation import readiness",
      gate: "not admitted",
      items: ["Import controls disabled", "Editing controls local only", "No Asset Processor execution"],
    },
  ],
  "Materials / Lookdev": [
    {
      title: "Material slots",
      gate: "read-only",
      items: ["Slot A unknown", "Slot B unknown", "Material mutation blocked"],
    },
    {
      title: "Texture dependency list",
      gate: "proof-only",
      items: ["Albedo preview", "Normal preview", "Roughness preview"],
    },
    {
      title: "Lighting preview controls",
      gate: "local preview",
      items: ["Lit", "Wireframe", "Proof"],
    },
    {
      title: "Render Evidence",
      gate: "blocked",
      items: ["Capture Preview", "Live O3DE Render: Not connected", "O3DE material readiness unknown"],
    },
  ],
  "Asset Management": [
    {
      title: "Source assets",
      gate: "read-only",
      items: ["Normalized source path", "Source GUID", "Fixture/sample entries"],
    },
    {
      title: "Product assets",
      gate: "proof-only",
      items: ["Product path", "Product count", "Cache mutation blocked"],
    },
    {
      title: "Dependencies",
      gate: "proof-only",
      items: ["Textures", "Materials", "Prefabs"],
    },
    {
      title: "Asset Catalog evidence",
      gate: "read-only",
      items: ["Catalog presence", "Catalog path count", "Asset Processor status placeholder"],
    },
  ],
  "Review / Approval": [
    {
      title: "Evidence summary",
      gate: "proof-only",
      items: ["Source evidence", "Dependency evidence", "Catalog evidence"],
    },
    {
      title: "Warnings",
      gate: "requires approval",
      items: ["Unknown license", "Unknown quality", "Unknown placement readiness"],
    },
    {
      title: "Safest next step",
      gate: "read-only",
      items: ["Review packet first", "Production approval unavailable", "Operator approval state"],
    },
    {
      title: "Approval state",
      gate: "requires approval",
      items: ["Operator review required", "No production approval claim", "No mutation admitted"],
    },
  ],
  "Automation Studio": [
    {
      title: "Prompt macros",
      gate: "plan-only",
      items: ["Plan template", "Evidence template", "Review template"],
    },
    {
      title: "Planned action templates",
      gate: "proof-only",
      items: ["Dry-run/preflight plan", "Operator packet draft", "No execution dispatch"],
    },
    {
      title: "Safe dry-run/preflight actions",
      gate: "requires approval",
      items: ["Preview only", "Approval required", "Backend widening blocked"],
    },
    {
      title: "Script/plugin areas",
      gate: "not admitted",
      items: ["Arbitrary code execution blocked", "Plugin execution blocked", "Command passthrough blocked"],
    },
  ],
  "Collaboration / Versioning": [
    {
      title: "Review notes",
      gate: "local preview",
      items: ["Operator note placeholder", "Version evidence not connected", "Review packet context"],
    },
    {
      title: "Branch/PR evidence placeholder",
      gate: "proof-only",
      items: ["Current branch", "Change summary", "Version evidence not connected"],
    },
    {
      title: "Version snapshot placeholder",
      gate: "read-only",
      items: ["Last artifact", "Review packet version", "Revert path"],
    },
    {
      title: "Rollback status",
      gate: "blocked",
      items: ["Rollback not connected", "No repository mutation", "No collaboration claim"],
    },
  ],
};

const pluginSlotPanels: WorkspacePanel[] = [
  {
    title: "Registered tools",
    gate: "read-only",
    items: ["Typed frontend corridors", "Review packet mapper", "Viewport preview controls"],
  },
  {
    title: "Planned extensions",
    gate: "plan-only",
    items: ["Tool extension slots", "Evidence analyzers", "Asset browser adapters"],
  },
  {
    title: "Blocked unsafe extensions",
    gate: "not admitted",
    items: ["Arbitrary scripts", "Plugin runtime loading", "Shell/O3DE command passthrough"],
  },
  {
    title: "Requires approval",
    gate: "requires approval",
    items: ["Any future execution corridor", "Any material mutation", "Any prefab mutation"],
  },
];

const integrationDockActions: IntegrationDockAction[] = [
  { label: "Prompt Studio", gate: "plan-only", detail: "Compose and refine natural-language plans." },
  { label: "Runtime", gate: "proof-only", detail: "Verify bridge/runtime health and readback truth." },
  { label: "Builder", gate: "plan-only", detail: "Coordinate slices and mission-control tasks." },
  { label: "Records", gate: "proof-only", detail: "Inspect runs, artifacts, and timeline evidence." },
  { label: "Mission Control", gate: "local preview", detail: "Docked status strip for app-wide signals." },
  { label: "Guidebook", gate: "local preview", detail: "Context guidance for Toolbench operators." },
];

const sceneTabs = ["Forge Scene", "Evidence Layout", "Review Targets"] as const;
const xSheetFrames = ["090", "100", "110", "120", "130", "140", "150", "160"];
const xSheetTracks: XSheetTrack[] = [
  { label: "Camera Cut", gate: "local preview", cells: ["A001", "A001", "A002", "A002", "A003", "A003", "A003", "A004"] },
  { label: "Asset Candidate", gate: "proof-only", cells: ["cand-a", "cand-a", "cand-b", "cand-b", "cand-b", "review", "review", "review"] },
  { label: "Material Check", gate: "requires approval", cells: ["-", "-", "queued", "queued", "blocked", "blocked", "blocked", "blocked"] },
  { label: "Collision Track", gate: "not admitted", cells: ["n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "n/a"] },
];
const sceneTabDetail: Record<(typeof sceneTabs)[number], string> = {
  "Forge Scene": "Editor-style composition view with local preview controls and read-only evidence context.",
  "Evidence Layout": "Phase 9 evidence framing for source/product/dependency/catalog review packets.",
  "Review Targets": "Operator-targeted candidate set for proof corridors and safest-next-step review.",
};

function ensureDisplayValue(value: string | null | undefined): string {
  if (!value) {
    return UNKNOWN_VALUE;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : UNKNOWN_VALUE;
}

function isOneOf<T extends string>(value: unknown, allowedValues: readonly T[]): value is T {
  return typeof value === "string" && (allowedValues as readonly string[]).includes(value);
}

function loadSavedLayoutPreferences(): SavedLayoutPreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SavedLayoutPreferences>;
    if (
      isOneOf(parsed.activeWorkspaceLayout, productionWorkspaceLayouts)
      && isOneOf(parsed.activeViewportMode, viewportModes)
      && isOneOf(parsed.activePanelSet, panelSets)
      && isOneOf(parsed.bottomDockMode, bottomDockModes)
      && isOneOf(parsed.inspectorMode, inspectorModes)
      && isOneOf(parsed.densityMode, ["Compact", "Expanded"] as const)
    ) {
      return parsed as SavedLayoutPreferences;
    }
  } catch {
    return null;
  }

  return null;
}

function saveLayoutPreferences(preferences: SavedLayoutPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(preferences));
}

function clearLayoutPreferences(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(LAYOUT_STORAGE_KEY);
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
  const savedLayoutPreferences = useMemo(() => loadSavedLayoutPreferences(), []);
  const [activeMenu, setActiveMenu] = useState<(typeof topMenuRows)[number]>("File");
  const [activeWorkspaceLayout, setActiveWorkspaceLayout] = useState<ProductionWorkspaceLayout>(
    savedLayoutPreferences?.activeWorkspaceLayout ?? "Forge Command",
  );
  const [activeViewportMode, setActiveViewportMode] = useState<ViewportMode>(
    savedLayoutPreferences?.activeViewportMode ?? "Single View",
  );
  const [activePanelSet, setActivePanelSet] = useState<PanelSet>(
    savedLayoutPreferences?.activePanelSet ?? "Core Panels",
  );
  const [bottomDockMode, setBottomDockMode] = useState<BottomDockMode>(
    savedLayoutPreferences?.bottomDockMode ?? "Status board",
  );
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>(
    savedLayoutPreferences?.inspectorMode ?? "Selection",
  );
  const [densityMode, setDensityMode] = useState<DensityMode>(
    savedLayoutPreferences?.densityMode ?? "Compact",
  );
  const [layoutFeedback, setLayoutFeedback] = useState(
    savedLayoutPreferences ? "Saved production layout loaded locally." : "Production layout is local-only.",
  );
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceRow["label"]>("Forge");
  const [activeTool, setActiveTool] = useState<ToolRow["label"]>("Select");
  const [activeOutlinerSection, setActiveOutlinerSection] = useState<OutlinerSection["label"]>("Asset Candidates");
  const [activeSceneTab, setActiveSceneTab] = useState<(typeof sceneTabs)[number]>("Forge Scene");
  const [activeIntegrationAction, setActiveIntegrationAction] = useState<IntegrationDockAction["label"]>("Prompt Studio");
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
  const [activeEvidenceTab, setActiveEvidenceTab] = useState<EvidenceTab>(bottomDockMode);
  const [timelineCursor, setTimelineCursor] = useState(2);
  const [xSheetPlayhead, setXSheetPlayhead] = useState(3);
  const [commandDraft, setCommandDraft] = useState(defaultCommandDraft);

  const packet = useMemo(
    () => mapAssetForgeToolbenchReviewPacket(reviewPacketData, reviewPacketSource),
    [reviewPacketData, reviewPacketSource],
  );

  const activeWorkspaceRow = workspaceRows.find((row) => row.label === activeWorkspace) ?? workspaceRows[0];
  const activeXSheetFrame = xSheetFrames[xSheetPlayhead] ?? xSheetFrames[0];
  const activeIntegrationRow = integrationDockActions.find((row) => row.label === activeIntegrationAction) ?? integrationDockActions[0];
  const activeWorkspacePanels = workspacePanels[activeWorkspaceLayout];
  const currentLayoutPreferences: SavedLayoutPreferences = {
    activeWorkspaceLayout,
    activeViewportMode,
    activePanelSet,
    bottomDockMode,
    inspectorMode,
    densityMode,
  };
  const viewportPaneLabels = activeViewportMode === "Single View"
    ? ["Perspective"]
    : activeViewportMode === "Dual View"
      ? ["Perspective", "Camera"]
      : activeViewportMode === "Camera + Perspective"
        ? ["Camera", "Perspective"]
        : ["Top", "Front", "Side", "Perspective"];
  const viewportGridColumns = activeViewportMode === "Single View"
    ? "minmax(0, 1fr)"
    : "repeat(2, minmax(0, 1fr))";

  function openEvidenceTab(tab: EvidenceTab): void {
    setActiveEvidenceTab(tab);
    setBottomDockMode(tab);
  }

  function handleSaveLayout(): void {
    saveLayoutPreferences(currentLayoutPreferences);
    setLayoutFeedback("Layout saved locally.");
  }

  function handleResetLayout(): void {
    clearLayoutPreferences();
    setActiveWorkspaceLayout("Forge Command");
    setActiveViewportMode("Single View");
    setActivePanelSet("Core Panels");
    setBottomDockMode("Status board");
    setActiveEvidenceTab("Status board");
    setInspectorMode("Selection");
    setDensityMode("Compact");
    setLayoutFeedback("Layout reset locally.");
  }

  function handleDuplicateLayout(): void {
    setLayoutFeedback(`${activeWorkspaceLayout} duplicated as a local preview layout.`);
  }

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

      <section aria-label="Production workspace layout selector" style={productionLayoutShellStyle}>
        <div style={panelHeaderStyle}>
          <strong>Production workspace layouts</strong>
          <GateBadge gate="local preview" />
        </div>
        <div style={productionLayoutButtonGridStyle}>
          {productionWorkspaceLayouts.map((layoutName) => (
            <button
              key={layoutName}
              type="button"
              role="tab"
              aria-selected={activeWorkspaceLayout === layoutName}
              onClick={() => setActiveWorkspaceLayout(layoutName)}
              style={activeWorkspaceLayout === layoutName ? activeProductionLayoutButtonStyle : productionLayoutButtonStyle}
            >
              {layoutName}
            </button>
          ))}
        </div>
        <div style={layoutControlGridStyle}>
          <div style={compactControlGroupStyle} aria-label="Viewport mode selector">
            {viewportModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveViewportMode(mode)}
                aria-pressed={activeViewportMode === mode}
                style={activeViewportMode === mode ? activeCompactControlStyle : compactControlStyle}
              >
                {mode}
              </button>
            ))}
          </div>
          <div style={compactControlGroupStyle} aria-label="Panel set selector">
            {panelSets.map((panelSet) => (
              <button
                key={panelSet}
                type="button"
                onClick={() => setActivePanelSet(panelSet)}
                aria-pressed={activePanelSet === panelSet}
                style={activePanelSet === panelSet ? activeCompactControlStyle : compactControlStyle}
              >
                {panelSet}
              </button>
            ))}
          </div>
          <div style={compactControlGroupStyle} aria-label="Inspector mode selector">
            {inspectorModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInspectorMode(mode)}
                aria-pressed={inspectorMode === mode}
                style={inspectorMode === mode ? activeCompactControlStyle : compactControlStyle}
              >
                {mode}
              </button>
            ))}
          </div>
          <div style={layoutActionRowStyle}>
            <button type="button" onClick={handleSaveLayout} style={secondaryButtonStyle}>
              Save Layout
            </button>
            <button type="button" onClick={handleResetLayout} style={secondaryButtonStyle}>
              Reset Layout
            </button>
            <button type="button" onClick={handleDuplicateLayout} style={secondaryButtonStyle}>
              Duplicate Layout
            </button>
            <button
              type="button"
              onClick={() => setDensityMode(densityMode === "Compact" ? "Expanded" : "Compact")}
              style={secondaryButtonStyle}
            >
              {densityMode === "Compact" ? "Expanded mode" : "Compact mode"}
            </button>
          </div>
        </div>
        <div style={layoutStateBarStyle}>
          <span>Active layout: {activeWorkspaceLayout}</span>
          <span>Viewport Preview: {activeViewportMode}</span>
          <span>Bottom dock: {bottomDockMode}</span>
          <span>Inspector: {inspectorMode}</span>
          <span>{layoutFeedback}</span>
        </div>
      </section>

      <section aria-label="Forge integration dock" style={integrationDockStyle}>
        <div style={panelHeaderStyle}>
          <strong>Integrated workspaces</strong>
          <GateBadge gate={activeIntegrationRow.gate} />
        </div>
        <div style={integrationActionStripStyle}>
          {integrationDockActions.map((action) => {
            const isActive = action.label === activeIntegrationAction;
            const opensPrompt = action.label === "Prompt Studio";
            const opensRuntime = action.label === "Runtime";
            const opensBuilder = action.label === "Builder";
            const handler = opensPrompt
              ? onOpenPromptStudio
              : opensRuntime
                ? onOpenRuntimeOverview
                : opensBuilder
                  ? onOpenBuilder
                  : undefined;
            const canOpen = typeof handler === "function";
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  setActiveIntegrationAction(action.label);
                  if (canOpen) {
                    handler();
                  }
                }}
                disabled={!canOpen && (opensPrompt || opensRuntime || opensBuilder)}
                title={action.detail}
                style={isActive ? activeIntegrationButtonStyle : integrationButtonStyle}
              >
                <span>{action.label}</span>
                <GateBadge gate={action.gate} />
              </button>
            );
          })}
        </div>
        <p style={mutedParagraphStyle}>
          {activeIntegrationRow.detail} Local routing only; no direct generation/import/staging/placement execution.
        </p>
      </section>

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

      <section aria-label="Active production workspace panels" style={workspacePanelDeckStyle}>
        <div style={panelHeaderStyle}>
          <strong>{activeWorkspaceLayout}</strong>
          <span style={compactMetaStyle}>{activePanelSet} | {densityMode}</span>
        </div>
        <div style={workspacePanelGridStyle}>
          {activeWorkspacePanels.map((panel) => (
            <article key={`${activeWorkspaceLayout}-${panel.title}`} style={workspacePanelCardStyle}>
              <div style={panelHeaderStyle}>
                <strong>{panel.title}</strong>
                <GateBadge gate={panel.gate} />
              </div>
              <ul style={compactListStyle}>
                {panel.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        {activeWorkspaceLayout === "Review / Approval" ? (
          <AssetForgeReviewPacketPanel
            packetData={reviewPacketData}
            packetSource={reviewPacketSource}
          />
        ) : null}
        {activeWorkspaceLayout === "Automation Studio" ? (
          <div style={layoutActionRowStyle}>
            <button type="button" disabled title="Arbitrary script execution is not admitted." style={disabledButtonStyle}>
              Run arbitrary script
            </button>
            <button type="button" disabled title="Plugin execution is not admitted." style={disabledButtonStyle}>
              Execute plugin slot
            </button>
          </div>
        ) : null}
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
          <div style={sceneTabStripStyle} aria-label="Forge scene tabs">
            {sceneTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeSceneTab === tab}
                onClick={() => setActiveSceneTab(tab)}
                style={activeSceneTab === tab ? activeSceneTabStyle : sceneTabStyle}
              >
                {tab}
              </button>
            ))}
          </div>
          <p style={mutedParagraphStyle}>{sceneTabDetail[activeSceneTab]}</p>
          <p style={mutedParagraphStyle}>Toolbench preview data - not authoritative live O3DE scene truth.</p>
          <div style={outlinerTreeStyle} aria-label="Forge outliner tree">
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
          <div style={{ ...viewportPaneDeckStyle, gridTemplateColumns: viewportGridColumns }}>
            {viewportPaneLabels.map((paneLabel, index) => (
              <div
                key={`${activeViewportMode}-${paneLabel}-${index + 1}`}
                style={viewportPaneLabels.length > 1 ? compactViewportCanvasStyle : viewportCanvasStyle}
              >
                <div style={horizonLineStyle} />
                <div style={axisLineXStyle} />
                <div style={axisLineYStyle} />
                <div style={gridFloorStyle} />
                <div style={orientationGizmoStyle}>XYZ</div>
                <div style={selectedAssetCardStyle}>
                  <strong>{paneLabel} Viewport Preview</strong>
                  <span>bridge_segment_preview_001</span>
                  <span>Navigation mode: {activeNavigationControl}</span>
                  <span>Zoom: {viewportZoom}%</span>
                </div>
                <div style={viewportTruthLabelStyle}>Toolbench preview — not live O3DE render</div>
              </div>
            ))}
          </div>
        </section>

        <aside aria-label="Forge properties inspector" style={inspectorPanelStyle}>
          <div style={panelHeaderStyle}>
            <strong>Properties / Inspector</strong>
            <GateBadge gate="read-only" />
          </div>
          <span style={compactMetaStyle}>Inspector mode: {inspectorMode}</span>
          <dl style={inspectorProjectStripStyle}>
            <div style={inspectorRowStyle}>
              <dt style={inspectorTermStyle}>Project</dt>
              <dd style={inspectorDefinitionStyle}>{projectProfile?.name ?? ensureDisplayValue(packet.selectedProject.projectName)}</dd>
            </div>
            <div style={inspectorRowStyle}>
              <dt style={inspectorTermStyle}>Project root</dt>
              <dd style={inspectorDefinitionStyle}>{projectProfile?.projectRoot ?? ensureDisplayValue(packet.selectedProject.projectRoot)}</dd>
            </div>
          </dl>
          <div style={inspectorSectionsStyle}>
            {inspectorSections.map((section) => (
              <article key={section.title} style={inspectorSectionStyle}>
                <strong>{section.title}</strong>
                <dl style={inspectorSectionRowsStyle}>
                  {section.rows.map(([label, value]) => (
                    <div key={label} style={inspectorRowStyle}>
                      <dt style={inspectorTermStyle}>{label}</dt>
                      <dd style={inspectorDefinitionStyle}>{ensureDisplayValue(value)}</dd>
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
            onClick={() => openEvidenceTab("Review packet")}
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

      <section aria-label="Forge tool extensions and version evidence" style={extensionVersionGridStyle}>
        <article aria-label="Forge tool extensions panel" style={assetBrowserStyle}>
          <div style={panelHeaderStyle}>
            <strong>Tool Extensions / Plugin Slots</strong>
            <GateBadge gate="not admitted" />
          </div>
          <div style={workspacePanelGridStyle}>
            {pluginSlotPanels.map((panel) => (
              <article key={panel.title} style={workspacePanelCardStyle}>
                <div style={panelHeaderStyle}>
                  <strong>{panel.title}</strong>
                  <GateBadge gate={panel.gate} />
                </div>
                <ul style={compactListStyle}>
                  {panel.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </article>
        <article aria-label="Forge collaboration and version evidence" style={assetBrowserStyle}>
          <div style={panelHeaderStyle}>
            <strong>Collaboration / Versioning Evidence</strong>
            <GateBadge gate="proof-only" />
          </div>
          <dl style={inspectorSectionRowsStyle}>
            {[
              ["Current branch", "Version evidence not connected"],
              ["Last artifact", ensureDisplayValue(packet.productEvidence.productPath)],
              ["Review packet version", ensureDisplayValue(packet.contractVersion)],
              ["Change summary", "Version evidence not connected"],
              ["Revert path", "Version evidence not connected"],
            ].map(([label, value]) => (
              <div key={label} style={inspectorRowStyle}>
                <dt style={inspectorTermStyle}>{label}</dt>
                <dd style={inspectorDefinitionStyle}>{value}</dd>
              </div>
            ))}
          </dl>
        </article>
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
          {(["Timeline", "X-Sheet", "Status board", "Review packet"] as EvidenceTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeEvidenceTab === tab}
              onClick={() => openEvidenceTab(tab)}
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

        {activeEvidenceTab === "X-Sheet" ? (
          <article style={xSheetPanelStyle} aria-label="Forge xsheet timeline panel">
            <div style={panelHeaderStyle}>
              <strong>X-sheet / timeline board</strong>
              <GateBadge gate="local preview" />
            </div>
            <p style={mutedParagraphStyle}>
              Local preview timeline sheet for shot/action planning. Frame {activeXSheetFrame} selected.
            </p>
            <label style={rangeLabelStyle}>
              X-sheet playhead ({activeXSheetFrame})
              <input
                type="range"
                min={0}
                max={Math.max(xSheetFrames.length - 1, 0)}
                value={xSheetPlayhead}
                onChange={(event) => setXSheetPlayhead(Number(event.currentTarget.value))}
                style={rangeInputStyle}
              />
            </label>
            <div style={xSheetGridStyle}>
              <div style={xSheetHeaderCellStyle}>Track</div>
              {xSheetFrames.map((frame, index) => (
                <button
                  key={frame}
                  type="button"
                  onClick={() => setXSheetPlayhead(index)}
                  aria-pressed={xSheetPlayhead === index}
                  style={xSheetPlayhead === index ? activeXSheetFrameButtonStyle : xSheetFrameButtonStyle}
                >
                  {frame}
                </button>
              ))}
              {xSheetTracks.map((track) => (
                <div key={track.label} style={xSheetTrackRowStyle}>
                  <div style={xSheetTrackLabelStyle}>
                    <span>{track.label}</span>
                    <GateBadge gate={track.gate} />
                  </div>
                  {track.cells.map((cell, index) => (
                    <button
                      key={`${track.label}-${xSheetFrames[index] ?? index}`}
                      type="button"
                      onClick={() => setXSheetPlayhead(index)}
                      aria-pressed={xSheetPlayhead === index}
                      style={xSheetPlayhead === index ? activeXSheetCellStyle : xSheetCellStyle}
                      title={`${track.label} frame ${xSheetFrames[index] ?? index}: ${cell}`}
                    >
                      {cell}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <p style={mutedParagraphStyle}>
              X-sheet updates remain local preview only. No generation, import, staging, assignment, placement,
              Asset Processor execution, or source/product/cache mutation is admitted.
            </p>
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
    "linear-gradient(160deg, #101419 0%, #151b22 44%, #0d1117 100%)",
  color: "var(--app-text-color)",
  "--app-panel-bg": "#151b22",
  "--app-panel-bg-muted": "#1b232d",
  "--app-panel-bg-alt": "#202a35",
  "--app-page-bg": "#0d1117",
  "--app-input-bg": "#10161d",
  "--app-text-color": "#e6edf5",
  "--app-muted-color": "#aab7c6",
  "--app-subtle-color": "#7f8ea3",
  "--app-panel-border": "#314052",
  "--app-accent": "#69a7ff",
  "--app-accent-strong": "#83b7ff",
  "--app-accent-soft": "#1c344e",
  "--app-accent-contrast": "#07111f",
  "--app-info-bg": "#172b3d",
  "--app-info-border": "#3f89c7",
  "--app-info-text": "#b9ddff",
  "--app-success-bg": "#173428",
  "--app-success-border": "#48a16f",
  "--app-success-text": "#9be2b8",
  "--app-warning-bg": "#352915",
  "--app-warning-border": "#b88932",
  "--app-warning-text": "#ffd58a",
  "--app-danger-bg": "#351b1f",
  "--app-danger-border": "#c15d6a",
  "--app-danger-text": "#ffb8c0",
} as CSSProperties;

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

const productionLayoutShellStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const productionLayoutButtonGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 5,
} satisfies CSSProperties;

const productionLayoutButtonStyle = {
  minHeight: 34,
  border: "1px solid var(--app-panel-border)",
  borderRadius: 6,
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
} satisfies CSSProperties;

const activeProductionLayoutButtonStyle = {
  ...productionLayoutButtonStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "color-mix(in srgb, var(--app-info-bg) 88%, var(--app-panel-bg) 12%)",
  color: "var(--app-info-text)",
} satisfies CSSProperties;

const layoutControlGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 6,
} satisfies CSSProperties;

const compactControlGroupStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
  gap: 4,
  padding: 6,
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const compactControlStyle = {
  minHeight: 30,
  border: "1px solid var(--app-panel-border)",
  borderRadius: 6,
  background: "var(--app-panel-bg)",
  color: "var(--app-muted-color)",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
} satisfies CSSProperties;

const activeCompactControlStyle = {
  ...compactControlStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
} satisfies CSSProperties;

const layoutActionRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 5,
} satisfies CSSProperties;

const layoutStateBarStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  color: "var(--app-muted-color)",
  fontSize: 12,
} satisfies CSSProperties;

const integrationDockStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const integrationActionStripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 6,
} satisfies CSSProperties;

const integrationButtonStyle = {
  display: "grid",
  gap: 5,
  justifyItems: "start",
  minHeight: 54,
  padding: "7px 10px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  fontWeight: 700,
  textAlign: "left",
  cursor: "pointer",
} satisfies CSSProperties;

const activeIntegrationButtonStyle = {
  ...integrationButtonStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "color-mix(in srgb, var(--app-info-bg) 78%, var(--app-panel-bg) 22%)",
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

const workspacePanelDeckStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  background: "var(--app-panel-bg)",
} satisfies CSSProperties;

const workspacePanelGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 6,
} satisfies CSSProperties;

const workspacePanelCardStyle = {
  display: "grid",
  gap: 6,
  alignContent: "start",
  minHeight: 118,
  padding: 8,
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const compactMetaStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const compactListStyle = {
  margin: 0,
  paddingLeft: 16,
  color: "var(--app-muted-color)",
  fontSize: 12,
  lineHeight: 1.4,
} satisfies CSSProperties;

const mainWorkspaceGridStyle = {
  display: "grid",
  gridTemplateColumns: "88px minmax(250px, 1.1fr) minmax(420px, 1.8fr) minmax(300px, 1.2fr)",
  gap: 8,
  alignItems: "start",
  overflowX: "auto",
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

const sceneTabStripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 5,
} satisfies CSSProperties;

const sceneTabStyle = {
  minHeight: 32,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
} satisfies CSSProperties;

const activeSceneTabStyle = {
  ...sceneTabStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
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

const viewportPaneDeckStyle = {
  display: "grid",
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

const compactViewportCanvasStyle = {
  ...viewportCanvasStyle,
  minHeight: 220,
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
  gridTemplateColumns: "minmax(130px, 0.72fr) minmax(0, 1fr)",
  gap: 8,
  color: "var(--app-muted-color)",
  margin: 0,
  alignItems: "start",
} satisfies CSSProperties;

const inspectorTermStyle = {
  margin: 0,
  color: "var(--app-subtle-color)",
  fontWeight: 700,
} satisfies CSSProperties;

const inspectorDefinitionStyle = {
  margin: 0,
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
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
  borderRadius: 6,
  padding: "8px 12px",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  fontWeight: 800,
  cursor: "pointer",
} satisfies CSSProperties;

const secondaryButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 6,
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

const extensionVersionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 8,
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

const xSheetPanelStyle = {
  display: "grid",
  gap: 8,
  padding: 10,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
} satisfies CSSProperties;

const xSheetGridStyle = {
  display: "grid",
  gridTemplateColumns: `minmax(160px, 1.2fr) repeat(${xSheetFrames.length}, minmax(62px, 1fr))`,
  gap: 4,
  alignItems: "stretch",
  overflowX: "auto",
  paddingBottom: 2,
} satisfies CSSProperties;

const xSheetTrackRowStyle = {
  display: "contents",
} satisfies CSSProperties;

const xSheetHeaderCellStyle = {
  display: "grid",
  alignItems: "center",
  padding: "6px 8px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "color-mix(in srgb, var(--app-panel-bg) 86%, var(--app-page-bg) 14%)",
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 800,
} satisfies CSSProperties;

const xSheetTrackLabelStyle = {
  display: "grid",
  gap: 4,
  alignContent: "center",
  padding: "7px 8px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const xSheetFrameButtonStyle = {
  minHeight: 34,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
} satisfies CSSProperties;

const activeXSheetFrameButtonStyle = {
  ...xSheetFrameButtonStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "var(--app-info-bg)",
  color: "var(--app-info-text)",
} satisfies CSSProperties;

const xSheetCellStyle = {
  minHeight: 34,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg)",
  color: "var(--app-muted-color)",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  padding: "0 4px",
} satisfies CSSProperties;

const activeXSheetCellStyle = {
  ...xSheetCellStyle,
  border: "1px solid var(--app-accent-strong)",
  background: "color-mix(in srgb, var(--app-info-bg) 84%, var(--app-panel-bg) 16%)",
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
