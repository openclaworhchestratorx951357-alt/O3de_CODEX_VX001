import { useMemo, useState, type CSSProperties } from "react";

import type {
  AdaptersResponse,
  AssetForgeBlenderStatusRecord,
  AssetForgeEditorModelRecord,
  AssetForgePromptTemplateRecord,
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
  onLaunchPromptTemplate?: (template: AssetForgePromptTemplateRecord) => void;
  onOpenRecords?: () => void;
  onOpenRuntimeOverview?: () => void;
  onViewLatestRun?: () => void;
  onViewExecution?: () => void;
  onViewArtifact?: () => void;
  onViewEvidence?: () => void;
};

type Tone = "demo" | "read-only" | "plan-only" | "preflight-only" | "proof-only" | "blocked" | "review";
type Axis = "x" | "y" | "z";
type TransformGroup = "location" | "rotation" | "scale" | "dimensions";
type PropertiesTab = "Transform" | "Object" | "Material" | "Proof" | "Safety";
type BottomTab = "Timeline" | "Evidence" | "Prompt Template" | "Logs" | "Latest Artifacts";
type MaterialSubTab = "Surface" | "Wire" | "Volume" | "Halo";

type EditorTool = {
  id: string;
  label: string;
  shortcut: string;
  truth: string;
  enabled: boolean;
  description: string;
  blockedReason: string | null;
  nextUnlock: string | null;
  promptTemplateId: string | null;
};

type OutlinerNode = {
  id: string;
  label: string;
  kind: string;
  depth: number;
  truth: string;
};

type PromptTemplate = {
  id: string;
  label: string;
  description: string;
  text: string;
  truth: string;
  safetyLabels: string[];
  autoExecute: false;
};

type TransformDraft = Record<TransformGroup, Record<Axis, string>>;

type MenuItem = {
  id: string;
  label: string;
  tone: string;
  action: string;
  status: string;
  blockedReason?: string | null;
  nextUnlock?: string | null;
};

type MenuGroup = {
  id: string;
  label: string;
  items: MenuItem[];
};

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

const fallbackStages = [
  ["Describe", "plan-only"],
  ["Candidate", "demo"],
  ["Preflight", "preflight-only"],
  ["Stage Plan", "plan-only"],
  ["Stage Write", "proof-only"],
  ["Readback", "review"],
  ["Placement Proof", "proof-only"],
  ["Review", "review"],
] as const;

const defaultTransformDraft: TransformDraft = {
  location: { x: "0", y: "0", z: "0" },
  rotation: { x: "0", y: "0", z: "0" },
  scale: { x: "1", y: "1", z: "1" },
  dimensions: { x: "0", y: "0", z: "0" },
};

const fallbackPromptTemplates: PromptTemplate[] = [
  {
    id: "inspect-candidate",
    label: "Inspect candidate",
    description: "Read-only candidate inspection template.",
    text: "Inspect the current Asset Forge candidate and summarize provider readiness, Blender readiness, O3DE stage/readback readiness, blocked capabilities, and safest next step. Do not mutate content.",
    truth: "read-only",
    safetyLabels: ["read-only", "non-mutating", "autoExecute=false"],
    autoExecute: false,
  },
  {
    id: "placement-proof-only",
    label: "Placement proof-only",
    description: "Proof-only placement prompt; preview-first and user-controlled.",
    text: "In the editor, create a placement proof-only candidate with candidate_id \"candidate-a\", candidate_label \"Weathered Ivy Arch\", staged_source_relative_path \"Assets/Generated/asset_forge/candidate_a/candidate_a.glb\", target_level_relative_path \"Levels/BridgeLevel01/BridgeLevel01.prefab\", target_entity_name \"AssetForgeCandidateA\", target_component \"Mesh\", stage_write_evidence_reference \"packet-10/stage-write-evidence.json\", stage_write_readback_reference \"packet-10/readback-evidence.json\", stage_write_readback_status \"succeeded\", approval_state \"approved\", and approval_note \"bounded proof-only review\".",
    truth: "proof-only",
    safetyLabels: ["proof-only", "non-mutating", "autoExecute=false"],
    autoExecute: false,
  },
  {
    id: "transform-plan",
    label: "Transform plan",
    description: "Plan-only transform update request from draft values.",
    text: "Plan a safe transform update for the selected Asset Forge candidate using draft location, rotation, scale, and dimensions values. Do not execute mutation. Return required admission gates, readback requirements, and revert/restore plan.",
    truth: "plan-only",
    safetyLabels: ["plan-only", "non-mutating", "autoExecute=false"],
    autoExecute: false,
  },
];

const menuGroups: MenuGroup[] = [
  {
    id: "file",
    label: "File",
    items: [
      { id: "file-new-plan", label: "New candidate plan", tone: "plan-only", action: "candidate-plan", status: "New candidate planning is plan-only; no provider generation is admitted." },
      { id: "file-prompt", label: "Open Prompt Studio", tone: "read-only", action: "open-prompt-studio", status: "Opening Prompt Studio is navigation only; no prompt auto-executes." },
      { id: "file-records", label: "Open Records", tone: "read-only", action: "open-records", status: "Opening records is read-only evidence navigation." },
      { id: "file-export", label: "Export package", tone: "blocked", action: "blocked", status: "Export package is blocked until generated asset packaging is admitted." },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    items: [
      { id: "edit-reset-transform", label: "Reset transform draft", tone: "demo", action: "reset-transform", status: "Transform draft reset locally; no project mutation occurred." },
      { id: "edit-reset-layout", label: "Reset layout", tone: "blocked", action: "blocked", status: "Layout reset is not wired for this cockpit packet." },
      { id: "edit-duplicate", label: "Duplicate candidate", tone: "blocked", action: "select-tool-duplicate", status: "Duplicate candidate is blocked; asset mutation is not admitted." },
      { id: "edit-delete", label: "Delete candidate", tone: "blocked", action: "select-tool-delete", status: "Delete candidate is blocked; asset deletion is not admitted." },
    ],
  },
  {
    id: "view",
    label: "View",
    items: [
      { id: "view-solid", label: "Solid", tone: "demo", action: "viewport-Solid", status: "Viewport mode changed locally to Solid." },
      { id: "view-wireframe", label: "Wireframe", tone: "demo", action: "viewport-Wireframe", status: "Viewport mode changed locally to Wireframe." },
      { id: "view-material", label: "Material Preview", tone: "demo", action: "viewport-Material Preview", status: "Material Preview is a local UI preview only." },
      { id: "view-o3de", label: "O3DE Preview", tone: "preflight-only", action: "viewport-O3DE Preview", status: "O3DE Preview remains preflight/proof oriented; no runtime renderer was called." },
      { id: "view-frame", label: "Frame selected", tone: "demo", action: "frame-selected", status: "Frame selected adjusted viewport overlay locally." },
      { id: "view-grid", label: "Toggle grid", tone: "demo", action: "toggle-grid", status: "Grid visibility toggled locally." },
    ],
  },
  {
    id: "candidate",
    label: "Candidate",
    items: [
      { id: "candidate-inspect", label: "Inspect candidate", tone: "read-only", action: "select-template-inspect-candidate", status: "Inspect candidate template selected for preview only." },
      { id: "candidate-generate", label: "Generate candidate", tone: "blocked", action: "blocked", status: "Provider generation is blocked in this packet." },
      { id: "candidate-refine", label: "Refine candidate prompt", tone: "plan-only", action: "select-template-transform-plan", status: "Transform plan template selected; no execution is admitted." },
      { id: "candidate-validate", label: "Validate metadata", tone: "preflight-only", action: "preflight", status: "Metadata validation remains preflight-only." },
    ],
  },
  {
    id: "stage",
    label: "Stage",
    items: [
      { id: "stage-plan", label: "Stage plan", tone: "plan-only", action: "stage-plan", status: "Stage planning is plan-only." },
      { id: "stage-write", label: "Stage write", tone: "proof-only", action: "blocked", status: "Stage write is gated/proof-only and is not executed from this UI." },
      { id: "stage-readback", label: "Stage readback", tone: "review", action: "open-evidence", status: "Stage readback is evidence review only." },
      { id: "stage-ap", label: "Asset Processor validate", tone: "blocked", action: "blocked", status: "Asset Processor execution is blocked." },
    ],
  },
  {
    id: "proof",
    label: "Proof",
    items: [
      { id: "proof-template", label: "Load placement proof-only template", tone: "proof-only", action: "select-template-placement-proof-only", status: "Placement proof-only template selected; autoExecute=false." },
      { id: "proof-evidence", label: "Open proof evidence", tone: "read-only", action: "open-evidence", status: "Opening proof evidence is read-only." },
      { id: "proof-execute", label: "Placement execution", tone: "blocked", action: "blocked", status: "Placement execution is blocked." },
      { id: "proof-write", label: "Placement write", tone: "blocked", action: "blocked", status: "Placement write is blocked." },
    ],
  },
  {
    id: "review",
    label: "Review",
    items: [
      { id: "review-run", label: "Latest run", tone: "read-only", action: "view-run", status: "Latest run opened as read-only evidence." },
      { id: "review-execution", label: "Latest execution", tone: "read-only", action: "view-execution", status: "Latest execution opened as read-only evidence." },
      { id: "review-artifact", label: "Latest artifact", tone: "read-only", action: "view-artifact", status: "Latest artifact opened as read-only evidence." },
      { id: "review-evidence", label: "Evidence drawer", tone: "read-only", action: "open-evidence", status: "Evidence drawer is read-only." },
    ],
  },
  {
    id: "help",
    label: "Help",
    items: [
      { id: "help-safety", label: "Safety model", tone: "read-only", action: "safety-tab", status: "Safety model shown; mutation flags remain false." },
      { id: "help-blocked", label: "What is blocked", tone: "blocked", action: "safety-tab", status: "Blocked capabilities shown in Safety tab." },
      { id: "help-unlock", label: "Next unlock", tone: "plan-only", action: "safety-tab", status: "Next unlock requires a separate backend admission packet." },
    ],
  },
];

function getMenuGroups(model?: AssetForgeEditorModelRecord | null): MenuGroup[] {
  if (!model?.context_menu_groups?.length) {
    return menuGroups;
  }

  const groups = model.context_menu_groups
    .map((group) => ({
      id: group.group_id,
      label: group.label,
      items: group.items.map((item) => {
        const unsafeAdmission = item.execution_admitted || item.mutation_admitted || item.auto_execute;
        return {
          id: item.item_id,
          label: item.label,
          tone: unsafeAdmission ? "blocked" : item.truth_state,
          action: unsafeAdmission ? "blocked" : item.action,
          status: unsafeAdmission
            ? `${item.label} is blocked by the frontend safety rail because backend menu metadata requested execution, mutation, or auto-execution.`
            : item.status,
          blockedReason: item.blocked_reason,
          nextUnlock: item.next_unlock,
        };
      }),
    }))
    .filter((group) => group.items.length > 0);

  return groups.length > 0 ? groups : menuGroups;
}

const toolSafetyDetails: Record<string, Pick<EditorTool, "description" | "blockedReason" | "nextUnlock" | "enabled" | "promptTemplateId">> = {
  transform: {
    description: "UI transform tool selection only; draft fields do not mutate the project.",
    blockedReason: null,
    nextUnlock: "Admit a bounded transform planning/readback packet before writes.",
    enabled: true,
    promptTemplateId: "transform-plan",
  },
  translate: {
    description: "UI translate tool selection only; no placement write is admitted.",
    blockedReason: null,
    nextUnlock: "Admit transform writes separately after proof and review.",
    enabled: true,
    promptTemplateId: "transform-plan",
  },
  rotate: {
    description: "UI rotate tool selection only; no project mutation occurs.",
    blockedReason: null,
    nextUnlock: "Admit transform writes separately after proof and review.",
    enabled: true,
    promptTemplateId: "transform-plan",
  },
  scale: {
    description: "UI scale tool selection only; draft values stay local.",
    blockedReason: null,
    nextUnlock: "Admit transform writes separately after proof and review.",
    enabled: true,
    promptTemplateId: "transform-plan",
  },
  smoothing: {
    description: "Smoothing review can be planned, but mesh/material mutation is blocked.",
    blockedReason: "Smoothing requires mesh/material mutation that is not admitted.",
    nextUnlock: "Add a preflight/readback mesh-quality packet before admitting edits.",
    enabled: true,
    promptTemplateId: "inspect-candidate",
  },
  smooth: {
    description: "Smooth shading is preflight-only.",
    blockedReason: "Smooth shading would mutate material or mesh state.",
    nextUnlock: "Add explicit material/mesh mutation admission.",
    enabled: true,
    promptTemplateId: "inspect-candidate",
  },
  flat: {
    description: "Flat shading is preflight-only.",
    blockedReason: "Flat shading would mutate material or mesh state.",
    nextUnlock: "Add explicit material/mesh mutation admission.",
    enabled: true,
    promptTemplateId: "inspect-candidate",
  },
};

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

function dotToneStyle(toneRaw: string): CSSProperties {
  const tone = toneRaw as Tone;
  if (tone === "demo") {
    return { background: "#5aa8ff" };
  }
  if (tone === "read-only" || tone === "review") {
    return { background: "#2dd4bf" };
  }
  if (tone === "preflight-only") {
    return { background: "#d6a536" };
  }
  if (tone === "proof-only") {
    return { background: "#a78bfa" };
  }
  if (tone === "blocked") {
    return { background: "#f87171" };
  }
  return { background: "#9ca3af" };
}

function StatusDot({ tone }: { tone: string }) {
  return <span title={tone} style={{ ...styles.statusDot, ...dotToneStyle(tone) }} />;
}

function getDefaultToolSafety(id: string, truth: string, label: string): Pick<EditorTool, "description" | "blockedReason" | "nextUnlock" | "enabled" | "promptTemplateId"> {
  const known = toolSafetyDetails[id];
  if (known) {
    return known;
  }
  if (truth === "blocked") {
    return {
      description: `${label} is visible for editor orientation, but execution is blocked.`,
      blockedReason: `${label} would mutate an asset, scene, animation, or editor state that is not admitted.`,
      nextUnlock: "Add a separate proof/readback packet and explicit admission before execution.",
      enabled: true,
      promptTemplateId: null,
    };
  }
  if (truth === "plan-only") {
    return {
      description: `${label} can be selected for planning context only.`,
      blockedReason: null,
      nextUnlock: "A later admission packet must prove and admit the exact operation.",
      enabled: true,
      promptTemplateId: "transform-plan",
    };
  }
  if (truth === "preflight-only") {
    return {
      description: `${label} can be reviewed as preflight guidance only.`,
      blockedReason: null,
      nextUnlock: "A later packet must add readback evidence and gated execution.",
      enabled: true,
      promptTemplateId: "inspect-candidate",
    };
  }
  return {
    description: `${label} is UI selection only; no backend execution is triggered.`,
    blockedReason: null,
    nextUnlock: "No unlock is required for UI selection. Runtime behavior remains gated.",
    enabled: true,
    promptTemplateId: null,
  };
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

function getTools(model?: AssetForgeEditorModelRecord | null): EditorTool[] {
  if (model?.tools?.length) {
    return model.tools.map((tool) => ({
      id: tool.tool_id,
      label: tool.label,
      shortcut: tool.shortcut ?? "",
      truth: tool.truth_state,
      enabled: tool.enabled,
      description: tool.description,
      blockedReason: tool.blocked_reason,
      nextUnlock: tool.next_unlock,
      promptTemplateId: tool.prompt_template_id,
    }));
  }

  return fallbackTools.map(([id, label, shortcut, truth]) => ({
    id,
    label,
    shortcut,
    truth,
    ...getDefaultToolSafety(id, truth, label),
  }));
}

function getOutliner(model?: AssetForgeEditorModelRecord | null): OutlinerNode[] {
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

function getPromptTemplates(model?: AssetForgeEditorModelRecord | null): PromptTemplate[] {
  const maybeTemplates = model?.prompt_templates;
  if (Array.isArray(maybeTemplates) && maybeTemplates.length > 0) {
    return maybeTemplates.map((templateRaw) => {
      const template = templateRaw as Partial<{
        template_id: string;
        id: string;
        label: string;
        description: string;
        text: string;
        truth_state: string;
        safety_labels: string[];
      }>;
      const id = template.template_id ?? template.id ?? "editor-model-template";
      return {
        id,
        label: template.label ?? id,
        description: template.description ?? "Backend-provided prompt template; preview-first only.",
        text: template.text ?? "No template text was provided by the editor model.",
        truth: template.truth_state ?? "read-only",
        safetyLabels: template.safety_labels ?? ["autoExecute=false", "non-mutating"],
        autoExecute: false,
      };
    });
  }
  return fallbackPromptTemplates;
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
  onLaunchPromptTemplate,
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
  const promptTemplates = useMemo(() => getPromptTemplates(editorModel), [editorModel]);
  const editorMenuGroups = useMemo(() => getMenuGroups(editorModel), [editorModel]);
  const propertyRows = getPropertyRows({
    model: editorModel,
    providerStatus,
    blenderStatus,
    bridgeStatus,
    adapters,
    readiness,
    candidate,
  });
  const [selectedToolId, setSelectedToolId] = useState("transform");
  const [selectedOutlinerNodeId, setSelectedOutlinerNodeId] = useState("asset-root");
  const [selectedViewportMode, setSelectedViewportMode] = useState(editorModel?.viewport?.active_shading_mode ?? "Solid");
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [selectedPropertiesTab, setSelectedPropertiesTab] = useState<PropertiesTab>("Transform");
  const [selectedMaterialSubTab, setSelectedMaterialSubTab] = useState<MaterialSubTab>("Surface");
  const [selectedBottomTab, setSelectedBottomTab] = useState<BottomTab>("Timeline");
  const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState("inspect-candidate");
  const [transformDraft, setTransformDraft] = useState<TransformDraft>(defaultTransformDraft);
  const [transformDirty, setTransformDirty] = useState(false);
  const [gridVisible, setGridVisible] = useState(editorModel?.viewport?.grid_visible ?? true);
  const [statusMessage, setStatusMessage] = useState(
    "Ready: UI selection and draft editing only. No backend mutation is admitted.",
  );

  const selectedTool = tools.find((tool) => tool.id === selectedToolId) ?? tools[0];
  const selectedOutlinerNode = outliner.find((node) => node.id === selectedOutlinerNodeId) ?? outliner[0];
  const selectedPromptTemplate = promptTemplates.find((template) => template.id === selectedPromptTemplateId) ?? promptTemplates[0];
  const selectedObjectLabel = selectedOutlinerNode?.label ?? editorModel?.viewport?.selected_object_label ?? candidate.name;
  const transformGroups = [
    ["location", "Location"],
    ["rotation", "Rotation"],
    ["scale", "Scale"],
    ["dimensions", "Dimensions"],
  ] as const satisfies readonly [TransformGroup, string][];
  const axisList = ["x", "y", "z"] as const;
  const propertyTabs = ["Transform", "Object", "Material", "Proof", "Safety"] as const;
  const bottomTabs = ["Timeline", "Evidence", "Prompt Template", "Logs", "Latest Artifacts"] as const;
  const viewportModes = editorModel?.viewport?.shading_modes ?? ["Solid", "Wireframe", "Material Preview", "O3DE Preview"];

  function resetTransformDraft() {
    setTransformDraft(defaultTransformDraft);
    setTransformDirty(false);
    setStatusMessage("Transform draft reset locally; no project mutation occurred.");
  }

  function updateTransformDraft(group: TransformGroup, axis: Axis, value: string) {
    setTransformDraft((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [axis]: value,
      },
    }));
    setTransformDirty(true);
    setStatusMessage("Transform draft updated locally. Apply remains blocked because transform mutation is not admitted yet.");
  }

  function selectTool(tool: EditorTool) {
    setSelectedToolId(tool.id);
    if (tool.promptTemplateId) {
      setSelectedPromptTemplateId(tool.promptTemplateId);
    }
    if (tool.truth === "blocked") {
      setStatusMessage(`${tool.label} blocked: ${tool.blockedReason ?? "No mutation is admitted."} Next unlock: ${tool.nextUnlock ?? "separate admission packet required."}`);
      return;
    }
    setStatusMessage(`${tool.label}: UI selection only; no backend execution.`);
  }

  function selectOutlinerNode(node: OutlinerNode) {
    setSelectedOutlinerNodeId(node.id);
    if (node.kind === "material") {
      setSelectedPropertiesTab("Material");
    }
    setStatusMessage(`${node.label} selected in outliner. Selection is UI-only; no backend mutation occurred.`);
  }

  function selectViewportMode(mode: string) {
    setSelectedViewportMode(mode);
    if (mode === "O3DE Preview") {
      setStatusMessage("O3DE Preview selected as proof/preflight UI state only; no renderer, Blender, or O3DE call was made.");
      return;
    }
    setStatusMessage(`Viewport mode changed locally to ${mode}; no renderer execution occurred.`);
  }

  function selectPromptTemplate(templateId: string) {
    const nextTemplate = promptTemplates.find((template) => template.id === templateId);
    setSelectedPromptTemplateId(templateId);
    setSelectedBottomTab("Prompt Template");
    setStatusMessage(`${nextTemplate?.label ?? "Prompt template"} selected for preview only. autoExecute=false.`);
  }

  function copyPromptTemplate() {
    const text = selectedPromptTemplate?.text ?? "";
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(
        () => setStatusMessage(`${selectedPromptTemplate?.label ?? "Prompt template"} copied. autoExecute=false.`),
        () => setStatusMessage("Prompt template is displayed for manual copy. autoExecute=false."),
      );
      return;
    }
    setStatusMessage("Prompt template is displayed for manual copy. autoExecute=false.");
  }

  function toPromptTemplateRecord(template: PromptTemplate): AssetForgePromptTemplateRecord {
    return {
      template_id: template.id,
      label: template.label,
      description: template.description,
      text: template.text,
      truth_state: template.truth as AssetForgePromptTemplateRecord["truth_state"],
      safety_labels: template.safetyLabels,
      auto_execute: false,
    };
  }

  function loadPromptTemplate() {
    setStatusMessage(`${selectedPromptTemplate?.label ?? "Prompt template"} loaded for user-controlled Prompt Studio handoff. autoExecute=false.`);
    if (selectedPromptTemplate && onLaunchPromptTemplate) {
      onLaunchPromptTemplate(toPromptTemplateRecord(selectedPromptTemplate));
      return;
    }
    if (selectedPromptTemplate?.id === "placement-proof-only") {
      onLaunchPlacementProofTemplate?.();
      return;
    }
    if (selectedPromptTemplate?.id === "inspect-candidate") {
      onLaunchInspectTemplate?.();
      return;
    }
    onOpenPromptStudio?.();
  }

  function handleMenuItem(item: MenuItem) {
    if (item.action.startsWith("viewport-")) {
      setSelectedViewportMode(item.action.replace("viewport-", ""));
      setStatusMessage(item.status);
    } else if (item.action.startsWith("select-tool-")) {
      const toolId = item.action.replace("select-tool-", "");
      const tool = tools.find((candidateTool) => candidateTool.id === toolId);
      if (tool) {
        selectTool(tool);
      } else {
        setStatusMessage(item.status);
      }
    } else if (item.action.startsWith("select-template-")) {
      selectPromptTemplate(item.action.replace("select-template-", ""));
    } else if (item.action === "reset-transform") {
      resetTransformDraft();
    } else if (item.action === "toggle-grid") {
      setGridVisible((current) => !current);
      setStatusMessage(item.status);
    } else if (item.action === "open-prompt-studio") {
      onOpenPromptStudio?.();
      setStatusMessage(item.status);
    } else if (item.action === "open-records") {
      onOpenRecords?.();
      setStatusMessage(item.status);
    } else if (item.action === "open-evidence") {
      onViewEvidence?.();
      setStatusMessage(item.status);
    } else if (item.action === "view-run") {
      onViewLatestRun?.();
      setStatusMessage(item.status);
    } else if (item.action === "view-execution") {
      onViewExecution?.();
      setStatusMessage(item.status);
    } else if (item.action === "view-artifact") {
      onViewArtifact?.();
      setStatusMessage(item.status);
    } else if (item.action === "safety-tab") {
      setSelectedPropertiesTab("Safety");
      setStatusMessage(item.status);
    } else {
      setStatusMessage(item.status);
    }
    setSelectedMenuId(null);
  }

  function renderTransformTab() {
    return (
      <>
        {transformGroups.map(([group, label]) => (
          <div key={group} style={styles.transformGroup}>
            <span style={styles.transformGroupLabel}>{label}</span>
            {axisList.map((axis) => (
              <label key={`${group}-${axis}`} style={styles.axisInputLabel}>
                <span style={styles.axisText}>{axis.toUpperCase()}</span>
                <input
                  aria-label={`${label} ${axis.toUpperCase()}`}
                  value={transformDraft[group][axis]}
                  onChange={(event) => updateTransformDraft(group, axis, event.target.value)}
                  style={styles.axisInput}
                />
              </label>
            ))}
          </div>
        ))}
        <div style={styles.propertyActionRow}>
          <Badge tone={transformDirty ? "plan-only" : "read-only"} />
          <span style={styles.propertyValue}>draft only / not applied</span>
          <button type="button" disabled style={styles.blockedButton}>
            Apply Transform
          </button>
          <button type="button" onClick={resetTransformDraft} style={styles.smallButton}>
            Reset Draft
          </button>
        </div>
        <div style={styles.statusNotice}>Transform mutation is not admitted yet.</div>
      </>
    );
  }

  function renderObjectTab() {
    return (
      <>
        <div style={styles.propertyRow}>
          <span style={styles.propertyLabel}>Selected object</span>
          <span style={styles.propertyValue}>{selectedObjectLabel}</span>
          <Badge tone={selectedOutlinerNode?.truth ?? "read-only"} />
        </div>
        <div style={styles.propertyRow}>
          <span style={styles.propertyLabel}>Candidate</span>
          <span style={styles.propertyValue}>{candidate.name} ({candidate.id})</span>
          <Badge tone="demo" />
        </div>
        <div style={styles.propertyRow}>
          <span style={styles.propertyLabel}>Active tool</span>
          <span style={styles.propertyValue}>{selectedTool?.label ?? "Transform"}</span>
          <Badge tone={selectedTool?.truth ?? "demo"} />
        </div>
        <div style={styles.propertyRow}>
          <span style={styles.propertyLabel}>Tool detail</span>
          <span style={styles.propertyValue}>{selectedTool?.description ?? "UI selection only."}</span>
          <Badge tone="read-only" />
        </div>
        {selectedTool?.blockedReason ? (
          <div style={styles.statusNotice}>{selectedTool.blockedReason} Next unlock: {selectedTool.nextUnlock}</div>
        ) : null}
      </>
    );
  }

  function renderMaterialTab() {
    return (
      <>
        <div style={styles.materialSubTabs}>
          {(["Surface", "Wire", "Volume", "Halo"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setSelectedMaterialSubTab(tab);
                setStatusMessage(`${tab} material tab selected. Material mutation remains blocked.`);
              }}
              style={{
                ...styles.materialSubTab,
                ...(selectedMaterialSubTab === tab ? styles.selectedSubTab : {}),
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        {[
          ["Preview", `${selectedMaterialSubTab} preview sphere/checker`],
          ["Diffuse", "material mutation blocked"],
          ["Specular", "material mutation blocked"],
          ["Shading", "read-only preview metadata"],
          ["Transparency", "not admitted"],
        ].map(([label, value]) => (
          <div key={label} style={styles.propertyRow}>
            <span style={styles.propertyLabel}>{label}</span>
            <span style={styles.propertyValue}>{value}</span>
            <Badge tone={label === "Preview" ? "read-only" : "blocked"} />
          </div>
        ))}
      </>
    );
  }

  function renderProofTab() {
    return (
      <>
        <div style={styles.propertyRow}>
          <span style={styles.propertyLabel}>Template</span>
          <select
            aria-label="Prompt template selector"
            value={selectedPromptTemplate?.id}
            onChange={(event) => selectPromptTemplate(event.target.value)}
            style={styles.selectInput}
          >
            {promptTemplates.map((template) => (
              <option key={template.id} value={template.id}>{template.label}</option>
            ))}
          </select>
          <Badge tone={selectedPromptTemplate?.truth ?? "read-only"} />
        </div>
        <div style={styles.promptPreview}>{selectedPromptTemplate?.text}</div>
        <div
          aria-label="Prompt template handoff safety summary"
          style={styles.promptTemplateSafetySummary}
        >
          <strong>{selectedPromptTemplate?.label}</strong>
          <span>{selectedPromptTemplate?.description}</span>
          <span>Prompt Studio opens this as a dry-run editable draft; no auto-execution or mutation dispatch occurs.</span>
          <span style={styles.promptTemplateSafetyLabels}>
            {(selectedPromptTemplate?.safetyLabels ?? ["autoExecute=false", "non-mutating"]).map((label) => (
              <span key={label} style={styles.promptTemplateSafetyLabel}>{label}</span>
            ))}
          </span>
        </div>
        <div style={styles.propertyActionRow}>
          <button type="button" onClick={copyPromptTemplate} style={styles.smallButton}>Copy template</button>
          <button type="button" onClick={loadPromptTemplate} style={styles.smallButton}>Open Prompt Studio</button>
          <button type="button" onClick={loadPromptTemplate} style={styles.primaryButton}>Load template</button>
        </div>
        <div style={styles.statusNotice}>Prompt templates are preview-first and autoExecute=false.</div>
      </>
    );
  }

  function renderSafetyTab() {
    return (
      <>
        {[
          ["execution_admitted", "false"],
          ["placement_write_admitted", "false"],
          ["mutation_occurred", "false"],
          ["provider generation", "blocked"],
          ["Blender execution", "blocked"],
          ["Asset Processor execution", "blocked"],
          ["material/prefab mutation", "blocked"],
        ].map(([label, value]) => (
          <div key={label} style={styles.propertyRow}>
            <span style={styles.propertyLabel}>{label}</span>
            <span style={styles.propertyValue}>{value}</span>
            <Badge tone={value === "false" ? "read-only" : "blocked"} />
          </div>
        ))}
      </>
    );
  }

  function renderPropertiesContent() {
    return (
      <>
        <div role="status" style={styles.statusNotice}>{statusMessage}</div>
        {selectedPropertiesTab === "Transform" ? renderTransformTab() : null}
        {selectedPropertiesTab === "Object" ? renderObjectTab() : null}
        {selectedPropertiesTab === "Material" ? renderMaterialTab() : null}
        {selectedPropertiesTab === "Proof" ? renderProofTab() : null}
        {selectedPropertiesTab === "Safety" ? renderSafetyTab() : null}
      </>
    );
  }

  function renderBottomContent() {
    if (selectedBottomTab === "Evidence") {
      return (
        <div style={styles.bottomContentRow}>
          <button type="button" onClick={onViewLatestRun} style={styles.smallButton}>Latest run</button>
          <button type="button" onClick={onViewExecution} style={styles.smallButton}>Execution</button>
          <button type="button" onClick={onViewArtifact} style={styles.smallButton}>Artifact</button>
          <button type="button" onClick={onViewEvidence} style={styles.smallButton}>Evidence drawer</button>
          <span style={styles.statusText}>Evidence drill-in only; no runtime execution.</span>
        </div>
      );
    }
    if (selectedBottomTab === "Prompt Template") {
      return (
        <div style={styles.bottomContentRow}>
          <span style={styles.statusText}>{selectedPromptTemplate?.label}: autoExecute=false</span>
          <button type="button" onClick={copyPromptTemplate} style={styles.smallButton}>Copy template</button>
          <button type="button" onClick={loadPromptTemplate} style={styles.primaryButton}>Load template</button>
          <span style={styles.promptTextLine}>{selectedPromptTemplate?.text}</span>
        </div>
      );
    }
    if (selectedBottomTab === "Logs") {
      return (
        <div style={styles.bottomContentRow}>
          <span style={styles.statusText}>{statusMessage}</span>
          <span style={styles.statusText}>Blocked operations explain next unlock before any execution exists.</span>
        </div>
      );
    }
    if (selectedBottomTab === "Latest Artifacts") {
      return (
        <div style={styles.bottomContentRow}>
          <span style={styles.statusText}>Run: {latestRunId ?? "not selected"}</span>
          <span style={styles.statusText}>Exec: {latestExecutionId ?? "not selected"}</span>
          <span style={styles.statusText}>Artifact: {latestArtifactId ?? "not selected"}</span>
          <span style={styles.statusText}>{latestPlacementProofOnlyReview ? "proof-only snapshot loaded" : "no placement proof snapshot"}</span>
        </div>
      );
    }
    return (
      <div style={styles.timelineBody}>
        <span>Start 1</span>
        <div style={styles.timelineTrack}>
          {Array.from({ length: 30 }).map((_, index) => (
            <span key={index} style={styles.tick}>{index % 5 === 0 ? index * 10 : ""}</span>
          ))}
        </div>
        <span>End 250</span>
        <span style={styles.statusText}>Frame 1</span>
        <span style={styles.statusText}>{statusMessage}</span>
      </div>
    );
  }

  return (
    <section style={styles.app} aria-label="Asset Forge Blender-like editor">
      <header style={styles.menuBar} aria-label="Asset Forge top menu">
        <div style={styles.menuLeft}>
          <strong style={styles.brand}>Asset Forge</strong>
          {editorMenuGroups.map((menu) => (
            <div key={menu.id} style={styles.menuGroup}>
              <button
                type="button"
                onClick={() => setSelectedMenuId((current) => (current === menu.id ? null : menu.id))}
                style={{
                  ...styles.menuButton,
                  ...(selectedMenuId === menu.id ? styles.selectedMenuButton : {}),
                }}
              >
                {menu.label}
              </button>
              {selectedMenuId === menu.id ? (
                <div role="menu" aria-label={`${menu.label} menu`} style={styles.menuDropdown}>
                  {menu.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      onClick={() => handleMenuItem(item)}
                      style={styles.menuItem}
                    >
                      <span style={styles.menuItemLabel}>{item.label}</span>
                      <Badge tone={item.tone} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
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

      <nav style={styles.stageBar} aria-label="Asset Forge workflow stages">
        {fallbackStages.map(([label, tone]) => (
          <div key={label} style={styles.stageTab}>
            <span style={styles.stageLabel}>{label}</span>
            <Badge tone={tone} />
          </div>
        ))}
      </nav>

      <div style={styles.editorFrame}>
        <aside style={styles.toolShelf} aria-label="Asset Forge left tool shelf">
          <div style={styles.panelHeader}>Object Tools</div>
          <div style={styles.toolList}>
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => selectTool(tool)}
                style={{
                  ...styles.toolButton,
                  ...(selectedTool?.id === tool.id ? styles.selectedToolButton : {}),
                }}
                aria-pressed={selectedTool?.id === tool.id}
              >
                <span style={styles.toolShortcut}>{tool.shortcut || "*"}</span>
                <span style={styles.toolLabel}>{tool.label}</span>
                <StatusDot tone={tool.truth} />
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
              {viewportModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => selectViewportMode(mode)}
                  style={{
                    ...styles.viewportModeButton,
                    ...(selectedViewportMode === mode ? styles.selectedViewportModeButton : {}),
                  }}
                  aria-pressed={selectedViewportMode === mode}
                >
                  {mode}
                </button>
              ))}
            </div>
          </header>

          <div style={styles.viewportCanvas}>
            {gridVisible ? <div style={styles.gridLayer} /> : null}
            <div style={styles.meshPreview} aria-label="demo wireframe asset preview">
              <div style={styles.selectionOutline} />
              <div style={styles.headShape} />
              <div style={styles.neckShape} />
              <div style={styles.torsoShape} />
              {Array.from({ length: 14 }).map((_, index) => (
                <span
                  key={`hair-top-${index}`}
                  style={{
                    ...styles.hairStroke,
                    top: `${6 + index * 1.5}%`,
                    left: `${25 + index * 3.3}%`,
                    width: `${58 + (index % 4) * 14}px`,
                    transform: `rotate(${index % 2 === 0 ? -24 + index : 18 - index}deg)`,
                  }}
                />
              ))}
              {Array.from({ length: 8 }).map((_, index) => (
                <span
                  key={`hair-side-${index}`}
                  style={{
                    ...styles.hairStroke,
                    top: `${21 + index * 4.1}%`,
                    left: index < 4 ? "20%" : "69%",
                    width: `${40 + (index % 3) * 18}px`,
                    transform: `rotate(${index < 4 ? -38 + index * 6 : 34 - index * 4}deg)`,
                  }}
                />
              ))}
              {Array.from({ length: 24 }).map((_, index) => (
                <span
                  key={`wire-h-${index}`}
                  style={{
                    ...styles.wireLine,
                    ...(selectedViewportMode === "Wireframe" ? styles.activeWireLine : {}),
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
                    ...(selectedViewportMode === "Wireframe" ? styles.activeWireLineVertical : {}),
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
              <li>Active tool: {selectedTool?.label ?? "Transform"}</li>
              <li>Selected object: {selectedObjectLabel}</li>
              <li>Viewport mode: {selectedViewportMode}</li>
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
                <button
                  key={node.id}
                  type="button"
                  onClick={() => selectOutlinerNode(node)}
                  style={{
                    ...styles.outlinerRow,
                    ...(selectedOutlinerNode?.id === node.id ? styles.selectedOutlinerRow : {}),
                    paddingLeft: 6 + node.depth * 12,
                  }}
                >
                  <span style={styles.outlinerTwist}>{">"}</span>
                  <span style={styles.outlinerName}>{node.label}</span>
                  <Badge tone={node.truth} />
                </button>
              ))}
            </div>
          </section>

          <section style={styles.propertiesPanel} aria-label="Asset Forge transform and material properties">
            <div style={styles.panelHeader}>Properties</div>
            <div style={styles.propertiesTabs}>
              {propertyTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setSelectedPropertiesTab(tab);
                    setStatusMessage(`${tab} properties tab selected. UI state only; no backend mutation.`);
                  }}
                  style={{
                    ...styles.propertiesTabButton,
                    ...(selectedPropertiesTab === tab ? styles.selectedPropertiesTabButton : {}),
                  }}
                  aria-pressed={selectedPropertiesTab === tab}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div style={styles.previewChecker}>
              <div style={styles.previewSphere} />
            </div>
            <div style={styles.propertiesRows}>
              {selectedPropertiesTab === "Transform" && propertyRows.length > 0 ? propertyRows.slice(0, 1).map((row) => (
                <div key={`${row.label}-${row.value}`} style={styles.propertyRow}>
                  <span style={styles.propertyLabel}>{row.label}</span>
                  <span style={styles.propertyValue}>{row.value}</span>
                  {row.tone ? <Badge tone={row.tone} /> : null}
                </div>
              )) : null}
              {renderPropertiesContent()}
            </div>
          </section>
        </aside>
      </div>

      <footer style={styles.timelineStrip} aria-label="Asset Forge timeline evidence and prompt strip">
        <div style={styles.timelineTabs}>
          {bottomTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setSelectedBottomTab(tab);
                setStatusMessage(`${tab} bottom strip selected. UI state only.`);
              }}
              style={{
                ...styles.bottomTabButton,
                ...(selectedBottomTab === tab ? styles.selectedBottomTabButton : {}),
              }}
              aria-pressed={selectedBottomTab === tab}
            >
              {tab}
            </button>
          ))}
        </div>
        {renderBottomContent()}
      </footer>
    </section>
  );
}

const border = "1px solid #6f747b";
const panelHeaderBg = "#a8adb3";

const styles = {
  app: {
    height: "100%",
    minHeight: 0,
    maxHeight: "100%",
    width: "100%",
    minWidth: 0,
    display: "grid",
    gridTemplateRows: "22px 26px 28px minmax(0, 1fr) 42px",
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
    gap: 8,
    padding: "0 8px",
    background: "#c4c8cd",
    borderBottom: border,
    fontSize: 11,
    minWidth: 0,
  },
  menuLeft: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  menuRight: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    whiteSpace: "nowrap",
    fontSize: 11,
  },
  brand: {
    fontWeight: 800,
  },
  menuGroup: {
    position: "relative",
    display: "inline-flex",
    alignItems: "stretch",
    height: "100%",
  },
  menuButton: {
    border: "1px solid transparent",
    borderRadius: 2,
    padding: "0 5px",
    background: "transparent",
    color: "#101820",
    cursor: "pointer",
    fontSize: 11,
  },
  selectedMenuButton: {
    border: "1px solid #646a71",
    background: "#d7dbe0",
  },
  menuDropdown: {
    position: "absolute",
    top: 21,
    left: 0,
    zIndex: 20,
    minWidth: 210,
    display: "grid",
    gap: 1,
    padding: 3,
    border: border,
    background: "#23272d",
    boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
  },
  menuItem: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 8,
    minHeight: 22,
    border: "1px solid transparent",
    background: "#d3d7dc",
    color: "#101820",
    cursor: "pointer",
    fontSize: 11,
    padding: "2px 5px",
    textAlign: "left",
  },
  menuItemLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  contextBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    padding: "0 8px",
    background: "#b4b9bf",
    borderBottom: border,
    minWidth: 0,
    fontSize: 11,
  },
  contextLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  contextActions: {
    display: "flex",
    gap: 4,
    whiteSpace: "nowrap",
  },
  modePill: {
    border: "1px solid #6f747b",
    borderRadius: 3,
    padding: "1px 6px",
    background: "#e1e4e8",
    fontWeight: 700,
  },
  warningText: {
    color: "#c2410c",
    fontWeight: 700,
  },
  stageBar: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    padding: "3px 5px",
    overflowX: "auto",
    background: "#9ea4ac",
    borderBottom: border,
  },
  stageTab: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    border: "1px solid #717780",
    borderRadius: 2,
    background: "#d5d9de",
    padding: "1px 5px",
    fontSize: 10,
    whiteSpace: "nowrap",
  },
  stageLabel: {
    fontSize: 10,
  },
  editorFrame: {
    minHeight: 0,
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "112px minmax(640px, 1fr) 324px",
    overflow: "hidden",
    background: "#6f747b",
  },
  toolShelf: {
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "22px minmax(0, 1fr)",
    background: "#8d9298",
    borderRight: border,
    overflow: "hidden",
  },
  panelHeader: {
    minHeight: 22,
    display: "flex",
    alignItems: "center",
    padding: "0 6px",
    background: panelHeaderBg,
    borderBottom: border,
    fontSize: 11,
    fontWeight: 800,
  },
  toolList: {
    minHeight: 0,
    overflow: "auto",
    display: "grid",
    alignContent: "start",
    gap: 2,
    padding: 3,
  },
  toolButton: {
    display: "grid",
    gridTemplateColumns: "18px minmax(0, 1fr) 8px",
    gap: 3,
    alignItems: "center",
    minWidth: 0,
    minHeight: 22,
    padding: "2px 3px",
    border: "1px solid #646a71",
    borderRadius: 2,
    background: "#c9cdd2",
    color: "#101820",
    fontSize: 10,
    cursor: "pointer",
  },
  selectedToolButton: {
    border: "1px solid #2f80ed",
    background: "#dbeafe",
    boxShadow: "inset 3px 0 0 #2f80ed",
  },
  toolShortcut: {
    display: "grid",
    placeItems: "center",
    height: 16,
    border: "1px solid #7b8087",
    background: "#eef0f3",
    fontWeight: 800,
    fontSize: 9,
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
    gridTemplateRows: "22px minmax(0, 1fr) 22px",
    overflow: "hidden",
    background: "#30353b",
  },
  viewportHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
    padding: "0 5px",
    background: "#aab0b6",
    borderBottom: border,
    fontSize: 11,
    minWidth: 0,
  },
  viewportMenus: {
    display: "flex",
    gap: 10,
    overflow: "hidden",
    whiteSpace: "nowrap",
    minWidth: 0,
  },
  viewportModes: {
    display: "flex",
    gap: 3,
    whiteSpace: "nowrap",
  },
  viewportModeButton: {
    border: "1px solid #646a71",
    borderRadius: 3,
    background: "#d7dbe0",
    padding: "1px 5px",
    minHeight: 18,
    fontSize: 10,
  },
  selectedViewportModeButton: {
    border: "1px solid #2f80ed",
    background: "#dbeafe",
    fontWeight: 800,
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
    top: "50%",
    width: "min(64vw, 620px)",
    height: "min(70vh, 620px)",
    transform: "translate(-50%, -50%)",
  },
  selectionOutline: {
    position: "absolute",
    left: "11%",
    top: "2%",
    width: "78%",
    height: "84%",
    border: "2px solid rgba(90, 168, 255, 0.26)",
    borderRadius: "38% 38% 18% 18%",
    pointerEvents: "none",
  },
  headShape: {
    position: "absolute",
    left: "35%",
    top: "4%",
    width: "30%",
    height: "30%",
    border: "2px solid rgba(230,235,245,0.82)",
    borderRadius: "45% 45% 48% 48%",
    background: "rgba(175,181,190,0.24)",
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
    left: "13%",
    top: "44%",
    width: "74%",
    height: "38%",
    border: "2px solid rgba(104,151,224,0.92)",
    borderRadius: "26% 26% 12% 12%",
    background: "rgba(77,111,158,0.5)",
  },
  hairStroke: {
    position: "absolute",
    height: 2,
    borderRadius: 999,
    background: "rgba(245, 158, 11, 0.78)",
    pointerEvents: "none",
  },
  wireLine: {
    position: "absolute",
    height: 1,
    background: "rgba(235,240,248,0.42)",
    pointerEvents: "none",
  },
  activeWireLine: {
    height: 2,
    background: "rgba(245,248,255,0.72)",
  },
  wireLineVertical: {
    position: "absolute",
    width: 1,
    background: "rgba(235,240,248,0.35)",
    pointerEvents: "none",
  },
  activeWireLineVertical: {
    width: 2,
    background: "rgba(245,248,255,0.64)",
  },
  overlayTopLeft: {
    position: "absolute",
    top: 8,
    left: 8,
    padding: "2px 6px",
    borderRadius: 3,
    background: "rgba(8,12,18,0.76)",
    color: "#f8fafc",
    fontSize: 11,
  },
  overlayTopRight: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: "2px 6px",
    borderRadius: 3,
    background: "rgba(8,12,18,0.76)",
    color: "#f8fafc",
    fontSize: 11,
  },
  overlayList: {
    position: "absolute",
    top: 38,
    left: 10,
    margin: 0,
    paddingLeft: 18,
    color: "#f8fafc",
    fontSize: 11,
    lineHeight: 1.45,
    background: "rgba(8,12,18,0.2)",
  },
  overlayBottom: {
    position: "absolute",
    left: 8,
    bottom: 8,
    maxWidth: "calc(100% - 16px)",
    padding: "4px 7px",
    borderRadius: 3,
    background: "rgba(8,12,18,0.82)",
    color: "#f8fafc",
    fontSize: 11,
    overflowWrap: "anywhere",
  },
  viewportFooter: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 6px",
    background: "#aab0b6",
    borderTop: border,
    fontSize: 10,
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
    gridTemplateRows: "22px 20px minmax(0, 1fr)",
    overflow: "hidden",
    borderBottom: border,
  },
  outlinerSearch: {
    display: "flex",
    alignItems: "center",
    padding: "0 6px",
    background: "#c0c5cb",
    borderBottom: border,
    fontSize: 10,
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
    minHeight: 20,
    borderBottom: "1px solid #b3b8bf",
    paddingTop: 1,
    paddingBottom: 1,
    paddingRight: 4,
    minWidth: 0,
    fontSize: 11,
    background: "transparent",
    color: "#101820",
    cursor: "pointer",
    textAlign: "left",
  },
  selectedOutlinerRow: {
    background: "#dbeafe",
    boxShadow: "inset 3px 0 0 #2f80ed",
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
    gridTemplateRows: "22px 22px 76px minmax(0, 1fr)",
    overflow: "hidden",
  },
  propertiesTabs: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    padding: "0 5px",
    background: "#bfc4ca",
    borderBottom: border,
    fontSize: 10,
  },
  propertiesTabButton: {
    border: "1px solid #9aa0a8",
    borderRadius: 2,
    background: "#d7dbe0",
    color: "#101820",
    cursor: "pointer",
    fontSize: 10,
    padding: "1px 4px",
  },
  selectedPropertiesTabButton: {
    border: "1px solid #2f80ed",
    background: "#dbeafe",
    fontWeight: 800,
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
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "radial-gradient(circle at 35% 30%, #f0d5c3, #8d7066)",
    boxShadow: "0 5px 14px rgba(0,0,0,0.35)",
  },
  propertiesRows: {
    minHeight: 0,
    overflow: "auto",
    display: "grid",
    alignContent: "start",
    gap: 3,
    padding: 4,
    background: "#c9cdd2",
  },
  statusNotice: {
    minWidth: 0,
    padding: "3px 4px",
    border: "1px solid #9aa0a8",
    background: "#f8fafc",
    color: "#172033",
    fontSize: 10,
    overflowWrap: "anywhere",
  },
  transformGroup: {
    display: "grid",
    gridTemplateColumns: "66px repeat(3, minmax(0, 1fr))",
    gap: 4,
    alignItems: "center",
    minHeight: 22,
    padding: "2px 4px",
    border: "1px solid #9aa0a8",
    background: "#e2e5e9",
    fontSize: 11,
  },
  transformGroupLabel: {
    fontWeight: 800,
    color: "#334155",
  },
  axisInputLabel: {
    display: "grid",
    gridTemplateColumns: "12px minmax(0, 1fr)",
    gap: 2,
    alignItems: "center",
    minWidth: 0,
  },
  axisText: {
    fontSize: 9,
    fontWeight: 800,
    color: "#334155",
  },
  axisInput: {
    minWidth: 0,
    height: 17,
    border: "1px solid #9aa0a8",
    background: "#f8fafc",
    color: "#101820",
    fontSize: 10,
    padding: "0 2px",
  },
  propertyRow: {
    display: "grid",
    gridTemplateColumns: "112px minmax(0, 1fr) 42px",
    gap: 4,
    alignItems: "center",
    minWidth: 0,
    minHeight: 20,
    padding: "2px 4px",
    border: "1px solid #9aa0a8",
    background: "#e2e5e9",
    fontSize: 11,
  },
  propertyLabel: {
    fontWeight: 800,
    color: "#334155",
  },
  propertyValue: {
    display: "block",
    minWidth: 0,
    background: "#f3f4f6",
    border: "1px solid #b8bec5",
    padding: "1px 3px",
    overflowWrap: "anywhere",
  },
  propertyActionRow: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
    gap: 4,
    alignItems: "center",
    minWidth: 0,
    padding: "2px 4px",
    border: "1px solid #9aa0a8",
    background: "#e2e5e9",
    fontSize: 11,
  },
  blockedButton: {
    border: "1px solid #9aa0a8",
    borderRadius: 2,
    padding: "2px 6px",
    minHeight: 20,
    background: "#d7dbe0",
    color: "#64748b",
    cursor: "not-allowed",
    fontSize: 10,
    whiteSpace: "nowrap",
  },
  materialSubTabs: {
    display: "flex",
    gap: 3,
    minWidth: 0,
  },
  materialSubTab: {
    border: "1px solid #9aa0a8",
    borderRadius: 2,
    background: "#d7dbe0",
    color: "#101820",
    cursor: "pointer",
    fontSize: 10,
    padding: "1px 4px",
  },
  selectedSubTab: {
    border: "1px solid #2f80ed",
    background: "#dbeafe",
    fontWeight: 800,
  },
  selectInput: {
    minWidth: 0,
    height: 20,
    border: "1px solid #9aa0a8",
    background: "#f8fafc",
    color: "#101820",
    fontSize: 10,
  },
  promptPreview: {
    minHeight: 42,
    maxHeight: 84,
    overflow: "auto",
    border: "1px solid #9aa0a8",
    background: "#f8fafc",
    color: "#101820",
    padding: 4,
    fontSize: 10,
    lineHeight: 1.35,
  },
  promptTemplateSafetySummary: {
    display: "grid",
    gap: 3,
    minWidth: 0,
    padding: "4px",
    border: "1px solid #9aa0a8",
    background: "#fff7ed",
    color: "#172033",
    fontSize: 10,
    lineHeight: 1.35,
    overflowWrap: "anywhere",
  },
  promptTemplateSafetyLabels: {
    display: "flex",
    flexWrap: "wrap",
    gap: 3,
    minWidth: 0,
  },
  promptTemplateSafetyLabel: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid #d6a536",
    borderRadius: 3,
    background: "#fff4cc",
    color: "#3b2f0a",
    padding: "1px 4px",
    fontSize: 9,
    fontWeight: 800,
  },
  timelineStrip: {
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "18px 24px",
    background: "#9ea4ac",
    borderTop: border,
    overflow: "hidden",
  },
  timelineTabs: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 6px",
    background: "#b9bec5",
    borderBottom: border,
    fontSize: 10,
  },
  bottomTabButton: {
    border: "1px solid transparent",
    borderRadius: 2,
    background: "transparent",
    color: "#101820",
    cursor: "pointer",
    fontSize: 10,
    padding: "1px 4px",
  },
  selectedBottomTabButton: {
    border: "1px solid #646a71",
    background: "#d7dbe0",
    fontWeight: 800,
  },
  timelineBody: {
    display: "grid",
    gridTemplateColumns: "auto minmax(220px, 1fr) auto auto auto auto auto auto auto auto auto auto",
    gap: 4,
    alignItems: "center",
    padding: "0 6px",
    minWidth: 0,
    overflow: "hidden",
    fontSize: 10,
  },
  bottomContentRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    overflow: "hidden",
    padding: "0 6px",
    fontSize: 10,
  },
  promptTextLine: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  timelineTrack: {
    minWidth: 0,
    height: 15,
    display: "grid",
    gridTemplateColumns: "repeat(30, minmax(8px, 1fr))",
    border: "1px solid #777",
    background: "#d5d8dc",
    overflow: "hidden",
  },
  tick: {
    borderRight: "1px solid #aaa",
    textAlign: "center",
    fontSize: 8,
    color: "#333",
  },
  statusText: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
    maxWidth: 112,
  },
  badge: {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    border: "1px solid",
    borderRadius: 3,
    padding: "0 3px",
    fontSize: 8,
    fontWeight: 800,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.35)",
    justifySelf: "center",
  },
  smallButton: {
    border: "1px solid #777",
    borderRadius: 3,
    padding: "2px 6px",
    minHeight: 20,
    background: "#d6d9dd",
    color: "#111827",
    cursor: "pointer",
    fontSize: 11,
    whiteSpace: "nowrap",
  },
  primaryButton: {
    border: "1px solid #2563eb",
    borderRadius: 3,
    padding: "2px 6px",
    minHeight: 20,
    background: "#dbeafe",
    color: "#0f172a",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
} satisfies Record<string, CSSProperties>;
