export type AssetForgeToolGateState =
  | "read-only"
  | "local preview"
  | "plan-only"
  | "proof-only"
  | "requires approval"
  | "blocked"
  | "not admitted";

export type AssetForgeConnectedStatus =
  | "connected"
  | "local preview"
  | "not connected"
  | "unresolved";

export type AssetForgeToolPageTarget =
  | "modeling"
  | "geometry_nodes"
  | "materials"
  | "lighting"
  | "animation"
  | "sculpt_paint"
  | "compositor"
  | "assets"
  | "automation"
  | "review";

export type AssetForgeToolGroup =
  | "Modeling / Mesh"
  | "Geometry / Nodes"
  | "Materials / Lookdev"
  | "Lighting / Viewport"
  | "Animation / Timeline"
  | "Sculpt / Paint"
  | "Compositor / Render Evidence"
  | "Asset Browser"
  | "Automation / Extensions"
  | "Review / Approval";

export interface AssetForgeToolDefinition {
  id: string;
  label: string;
  group: AssetForgeToolGroup;
  description: string;
  gateState: AssetForgeToolGateState;
  pageTarget: AssetForgeToolPageTarget;
  connectedStatus: AssetForgeConnectedStatus;
  blockedReason: string;
  evidenceSource: string;
}

export const assetForgeToolRegistry: AssetForgeToolDefinition[] = [
  {
    id: "modeling",
    label: "Modeling",
    group: "Modeling / Mesh",
    description: "Mesh planning, primitive setup, cleanup planning, pivot/sizing checks, and placement-readiness review.",
    gateState: "plan-only",
    pageTarget: "modeling",
    connectedStatus: "local preview",
    blockedReason: "Geometry creation and writeback are not admitted in this interface.",
    evidenceSource: "Typed fixture + read-only Phase 9 packet evidence",
  },
  {
    id: "geometry_nodes",
    label: "Geometry Nodes",
    group: "Geometry / Nodes",
    description: "Procedural recipe and parameter cards for graph-first shape workflows.",
    gateState: "local preview",
    pageTarget: "geometry_nodes",
    connectedStatus: "local preview",
    blockedReason: "Procedural graph execution is intentionally blocked in this slice.",
    evidenceSource: "Typed fixture + read-only packet evidence",
  },
  {
    id: "materials",
    label: "Materials",
    group: "Materials / Lookdev",
    description: "Material slot review, texture dependency checks, and O3DE material readiness.",
    gateState: "proof-only",
    pageTarget: "materials",
    connectedStatus: "local preview",
    blockedReason: "Material assignment and shader mutation are blocked.",
    evidenceSource: "Typed fixture + read-only packet evidence",
  },
  {
    id: "lighting",
    label: "Lighting",
    group: "Lighting / Viewport",
    description: "Lighting rig planning, capture checks, and non-live preview evidence.",
    gateState: "plan-only",
    pageTarget: "lighting",
    connectedStatus: "local preview",
    blockedReason: "Lighting mutation to live O3DE scenes is blocked.",
    evidenceSource: "Typed fixture + read-only packet evidence",
  },
  {
    id: "animation",
    label: "Animation",
    group: "Animation / Timeline",
    description: "Timeline/x-sheet review, shot list planning, and import-readiness checks.",
    gateState: "local preview",
    pageTarget: "animation",
    connectedStatus: "local preview",
    blockedReason: "Animation writeback is read-only and disabled.",
    evidenceSource: "Typed fixture + read-only packet evidence",
  },
  {
    id: "sculpt_paint",
    label: "Sculpt / Paint",
    group: "Sculpt / Paint",
    description: "Brush/tool palette previews, paint-layer planning, and texture review state.",
    gateState: "local preview",
    pageTarget: "sculpt_paint",
    connectedStatus: "local preview",
    blockedReason: "Sculpt/paint mutation is not allowed.",
    evidenceSource: "Typed fixture + read-only packet evidence",
  },
  {
    id: "compositor",
    label: "Compositor",
    group: "Compositor / Render Evidence",
    description: "Render pass checklist, procedural texture / compositor concept page, and capture evidence placeholder.",
    gateState: "proof-only",
    pageTarget: "compositor",
    connectedStatus: "local preview",
    blockedReason: "Compositor execution and render capture export are not connected in this slice.",
    evidenceSource: "Typed fixture + read-only packet evidence",
  },
  {
    id: "assets",
    label: "Assets",
    group: "Asset Browser",
    description: "Source/product asset browser and review evidence for catalog, dependencies, and processor placeholders.",
    gateState: "read-only",
    pageTarget: "assets",
    connectedStatus: "local preview",
    blockedReason: "Staging, import, and processor execution are blocked.",
    evidenceSource: "Typed fixture + read-only packet evidence",
  },
  {
    id: "automation",
    label: "Automation",
    group: "Automation / Extensions",
    description: "Prompt macros, planned tool recipes, and plugin/extension controls (not admitted).",
    gateState: "not admitted",
    pageTarget: "automation",
    connectedStatus: "not connected",
    blockedReason: "Plugin execution and script dispatch are disabled in this interface.",
    evidenceSource: "Local UI template evidence",
  },
  {
    id: "review",
    label: "Review",
    group: "Review / Approval",
    description: "Operator review packet, readiness signals, blocked mutation state, and approval gating.",
    gateState: "proof-only",
    pageTarget: "review",
    connectedStatus: "local preview",
    blockedReason: "Approve/import gates remain read-only without live release mutation.",
    evidenceSource: "Typed fixture + read-only packet evidence",
  },
];

export const assetForgeToolDefinitions = assetForgeToolRegistry;

export const assetForgeToolPageTargets = [
  "modeling",
  "geometry_nodes",
  "materials",
  "lighting",
  "animation",
  "sculpt_paint",
  "compositor",
  "assets",
  "automation",
  "review",
] as const;

export const assetForgeToolDefaultPageTarget: AssetForgeToolPageTarget = "modeling";

export const assetForgeToolRegistryByPageTarget = Object.fromEntries(
  assetForgeToolRegistry.map((tool) => [tool.pageTarget, tool]),
) as Record<AssetForgeToolPageTarget, AssetForgeToolDefinition>;

export const assetForgeToolDefinitionsByGroup: Record<AssetForgeToolGroup, AssetForgeToolDefinition[]> =
  assetForgeToolRegistry.reduce((acc, tool) => {
    acc[tool.group] = acc[tool.group] ?? [];
    acc[tool.group].push(tool);
    return acc;
  }, {} as Record<AssetForgeToolGroup, AssetForgeToolDefinition[]>);

export const assetForgeToolById = (id: string): AssetForgeToolDefinition | undefined =>
  assetForgeToolRegistry.find((tool) => tool.id === id);

export const assetForgeToolDefinitionByPageTarget = (
  pageTarget: AssetForgeToolPageTarget,
): AssetForgeToolDefinition => assetForgeToolRegistryByPageTarget[pageTarget];

export const isValidToolMenuId = (id: string): id is string =>
  assetForgeToolRegistry.some((tool) => tool.id === id);

export const isAssetForgeToolPageTarget = (value: string): value is AssetForgeToolPageTarget =>
  assetForgeToolPageTargets.some((target) => target === value);

export const isValidToolPageTarget = isAssetForgeToolPageTarget;

export const assetForgeToolPageTargetLabels = assetForgeToolPageTargets.map(
  (target) => assetForgeToolDefinitionByPageTarget(target).label,
);
