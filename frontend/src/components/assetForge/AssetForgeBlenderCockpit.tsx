import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import MissionTruthRail from "../MissionTruthRail";
import type { PlacementProofOnlyReviewSnapshot } from "../../lib/promptPlacementProofOnlyReview";
import type {
  AdaptersResponse,
  AssetForgeBlenderStatusRecord,
  AssetForgeBlockedCapabilityRecord,
  AssetForgeEditorModelRecord,
  AssetForgeEditorToolRecord,
  AssetForgeOutlinerNodeRecord,
  AssetForgePromptTemplateRecord,
  AssetForgeProviderStatusRecord,
  AssetForgeTaskRecord,
  O3DEBridgeStatus,
  ReadinessStatus,
  ToolPolicy,
} from "../../types/contracts";
import type { O3DEProjectProfile } from "../../types/o3deProjectProfiles";

type AssetForgeBlenderCockpitProps = {
  projectProfile?: O3DEProjectProfile;
  taskModel?: AssetForgeTaskRecord | null;
  providerStatus?: AssetForgeProviderStatusRecord | null;
  blenderStatus?: AssetForgeBlenderStatusRecord | null;
  editorModel?: AssetForgeEditorModelRecord | null;
  editorModelUnavailable?: boolean;
  bridgeStatus?: O3DEBridgeStatus | null;
  adapters?: AdaptersResponse | null;
  readiness?: ReadinessStatus | null;
  policies?: ToolPolicy[];
  latestRunId?: string | null;
  latestExecutionId?: string | null;
  latestArtifactId?: string | null;
  latestPlacementProofOnlyReview?: PlacementProofOnlyReviewSnapshot | null;
  onOpenPromptStudio?: () => void;
  onLaunchInspectTemplate?: () => void;
  onLaunchPlacementProofTemplate?: () => void;
  onPrefillPromptTemplate?: (
    template: AssetForgePromptTemplateRecord,
    sourceToolId?: string | null,
  ) => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
  onViewLatestRun?: () => void;
  onViewExecution?: () => void;
  onViewArtifact?: () => void;
  onViewEvidence?: () => void;
  onOpenPromptSessionDetail?: (promptId: string) => void;
  onOpenExecutionDetail?: (executionId: string) => void;
  onOpenArtifactDetail?: (artifactId: string) => void;
  onOpenRunDetail?: (runId: string) => void;
};

type TruthTone =
  | "demo"
  | "read-only"
  | "plan-only"
  | "preflight-only"
  | "proof-only"
  | "blocked"
  | "review"
  | "safe";

const stageItems = [
  { label: "Describe", truth: "plan-only" as TruthTone },
  { label: "Candidate", truth: "demo" as TruthTone },
  { label: "Preflight", truth: "preflight-only" as TruthTone },
  { label: "Stage Plan", truth: "plan-only" as TruthTone },
  { label: "Stage Write", truth: "proof-only" as TruthTone },
  { label: "Readback", truth: "review" as TruthTone },
  { label: "Placement Proof", truth: "proof-only" as TruthTone },
  { label: "Review", truth: "review" as TruthTone },
];

const fallbackTools: AssetForgeEditorToolRecord[] = [
  {
    tool_id: "transform",
    label: "Transform",
    shortcut: null,
    group: "transform",
    truth_state: "demo",
    enabled: true,
    selected: true,
    description: "UI tool selection only.",
    blocked_reason: null,
    next_unlock: null,
    prompt_template_id: "inspect-candidate",
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "translate",
    label: "Translate",
    shortcut: "G",
    group: "transform",
    truth_state: "demo",
    enabled: true,
    selected: false,
    description: "UI tool selection only.",
    blocked_reason: null,
    next_unlock: null,
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "rotate",
    label: "Rotate",
    shortcut: "R",
    group: "transform",
    truth_state: "demo",
    enabled: true,
    selected: false,
    description: "UI tool selection only.",
    blocked_reason: null,
    next_unlock: null,
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "scale",
    label: "Scale",
    shortcut: "S",
    group: "transform",
    truth_state: "demo",
    enabled: true,
    selected: false,
    description: "UI tool selection only.",
    blocked_reason: null,
    next_unlock: null,
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "origin",
    label: "Origin",
    shortcut: null,
    group: "object",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Origin mutation remains blocked.",
    blocked_reason: "Origin writes are not admitted.",
    next_unlock: "Add explicit transform-write corridor.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "object",
    label: "Object",
    shortcut: null,
    group: "object",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Object mutation remains blocked.",
    blocked_reason: "Object writes are not admitted.",
    next_unlock: "Add explicit object mutation corridor.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "duplicate",
    label: "Duplicate",
    shortcut: "Shift+D",
    group: "object",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Duplicate remains blocked.",
    blocked_reason: "Duplicate would mutate level content.",
    next_unlock: "Require bounded write admission and rollback proof.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "delete",
    label: "Delete",
    shortcut: "X",
    group: "object",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Delete remains blocked.",
    blocked_reason: "Delete is destructive mutation.",
    next_unlock: "Require destructive-corridor admission and restore proof.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "join",
    label: "Join",
    shortcut: "Ctrl+J",
    group: "object",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Join remains blocked.",
    blocked_reason: "Join mutates object topology.",
    next_unlock: "Add exact join corridor with readback/rollback proof.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "split",
    label: "Split",
    shortcut: "Y",
    group: "object",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Split remains blocked.",
    blocked_reason: "Split mutates object topology.",
    next_unlock: "Add exact split corridor with readback/rollback proof.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "smoothing",
    label: "Smoothing",
    shortcut: null,
    group: "mesh",
    truth_state: "preflight-only",
    enabled: true,
    selected: false,
    description: "Preflight-only smoothing review.",
    blocked_reason: null,
    next_unlock: null,
    prompt_template_id: "project-asset-preflight",
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "smooth",
    label: "Smooth",
    shortcut: null,
    group: "mesh",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Smooth mutation remains blocked.",
    blocked_reason: "Mesh smoothing writes are not admitted.",
    next_unlock: "Add bounded smoothing corridor.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "flat",
    label: "Flat",
    shortcut: null,
    group: "mesh",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Flat shading mutation remains blocked.",
    blocked_reason: "Shading writes are not admitted.",
    next_unlock: "Add bounded shading corridor.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "keyframes",
    label: "Keyframes",
    shortcut: null,
    group: "animation",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Keyframe mutation remains blocked.",
    blocked_reason: "Animation writes are not admitted.",
    next_unlock: "Add bounded keyframe corridor.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "insert-keyframe",
    label: "Insert",
    shortcut: "I",
    group: "animation",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Insert keyframe remains blocked.",
    blocked_reason: "Animation writes are not admitted.",
    next_unlock: "Add bounded keyframe corridor.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "remove-keyframe",
    label: "Remove",
    shortcut: "Alt+I",
    group: "animation",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Remove keyframe remains blocked.",
    blocked_reason: "Animation writes are not admitted.",
    next_unlock: "Add bounded keyframe corridor.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "motion-paths",
    label: "Motion Paths",
    shortcut: null,
    group: "animation",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Motion path operations remain blocked.",
    blocked_reason: "Motion path writes are not admitted.",
    next_unlock: "Add read-only motion-path evidence then bounded writes.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "calculate-paths",
    label: "Calculate Paths",
    shortcut: null,
    group: "animation",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Calculate paths remains blocked.",
    blocked_reason: "Motion path writes are not admitted.",
    next_unlock: "Add read-only motion-path evidence then bounded writes.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "clear-paths",
    label: "Clear Paths",
    shortcut: null,
    group: "animation",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Clear paths remains blocked.",
    blocked_reason: "Motion path writes are not admitted.",
    next_unlock: "Add read-only motion-path evidence then bounded writes.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "repeat-last",
    label: "Repeat Last",
    shortcut: "Shift+R",
    group: "history",
    truth_state: "demo",
    enabled: true,
    selected: false,
    description: "UI guidance only.",
    blocked_reason: null,
    next_unlock: null,
    prompt_template_id: "placement-proof-only",
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "history",
    label: "History",
    shortcut: null,
    group: "history",
    truth_state: "read-only",
    enabled: true,
    selected: false,
    description: "Read-only evidence history.",
    blocked_reason: null,
    next_unlock: null,
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "grease-pencil",
    label: "Grease Pencil",
    shortcut: null,
    group: "grease_pencil",
    truth_state: "demo",
    enabled: true,
    selected: false,
    description: "UI overlay mode only.",
    blocked_reason: null,
    next_unlock: null,
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "draw-line",
    label: "Draw Line",
    shortcut: "D",
    group: "grease_pencil",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Draw line remains blocked.",
    blocked_reason: "Annotation writes are not admitted.",
    next_unlock: "Add bounded annotation corridor.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "erase",
    label: "Erase",
    shortcut: "E",
    group: "grease_pencil",
    truth_state: "blocked",
    enabled: false,
    selected: false,
    description: "Erase remains blocked.",
    blocked_reason: "Annotation writes are not admitted.",
    next_unlock: "Add bounded annotation corridor.",
    prompt_template_id: null,
    execution_admitted: false,
    mutation_admitted: false,
  },
  {
    tool_id: "use-sketching",
    label: "Use Sketching",
    shortcut: null,
    group: "grease_pencil",
    truth_state: "preflight-only",
    enabled: true,
    selected: false,
    description: "Preflight-only sketching guidance.",
    blocked_reason: null,
    next_unlock: null,
    prompt_template_id: "inspect-candidate",
    execution_admitted: false,
    mutation_admitted: false,
  },
];

const fallbackOutliner: AssetForgeOutlinerNodeRecord[] = [
  { node_id: "scene", label: "Scene", kind: "scene", depth: 0, truth_state: "read-only", visible: true, selected: false },
  { node_id: "asset-root", label: "Asset Root", kind: "candidate_root", depth: 1, truth_state: "demo", visible: true, selected: true },
  { node_id: "mesh-lod0", label: "Mesh_LOD0", kind: "mesh", depth: 2, truth_state: "demo", visible: true, selected: true },
  { node_id: "materials", label: "Materials", kind: "material_group", depth: 2, truth_state: "blocked", visible: true, selected: false },
  { node_id: "textures", label: "Textures", kind: "texture_group", depth: 2, truth_state: "preflight-only", visible: true, selected: false },
];

const fallbackPromptTemplates: AssetForgePromptTemplateRecord[] = [
  {
    template_id: "inspect-candidate",
    label: "Inspect candidate",
    description: "Read-only inspection template.",
    text: "Inspect candidate in read-only mode.",
    truth_state: "read-only",
    safety_labels: ["read-only", "auto_execute=false"],
    auto_execute: false,
  },
  {
    template_id: "placement-proof-only",
    label: "Placement proof-only",
    description: "Proof-only placement template.",
    text: "Prepare proof-only placement review metadata.",
    truth_state: "proof-only",
    safety_labels: ["proof-only", "auto_execute=false"],
    auto_execute: false,
  },
  {
    template_id: "project-asset-preflight",
    label: "Project/asset preflight",
    description: "Read-only project/asset preflight.",
    text: "Run read-only preflight checks.",
    truth_state: "preflight-only",
    safety_labels: ["preflight-only", "auto_execute=false"],
    auto_execute: false,
  },
];

const fallbackBlockedCapabilities: AssetForgeBlockedCapabilityRecord[] = [
  {
    capability_id: "asset_forge.provider.generate",
    label: "Provider generation",
    reason: "Provider generation is blocked.",
    next_unlock: "Add bounded provider admission corridor.",
  },
  {
    capability_id: "asset_forge.blender.execute",
    label: "Blender execution",
    reason: "Blender execution is blocked.",
    next_unlock: "Add bounded Blender execution corridor.",
  },
  {
    capability_id: "asset_forge.asset_processor.execute",
    label: "Asset Processor execution",
    reason: "Asset Processor execution is blocked.",
    next_unlock: "Add bounded execution corridor with readback proof.",
  },
  {
    capability_id: "asset_forge.placement.write",
    label: "Placement write",
    reason: "Placement write is blocked.",
    next_unlock: "Keep proof-only placement corridor until explicit admission.",
  },
];

function truthToneStyle(truth: TruthTone): CSSProperties {
  switch (truth) {
    case "demo":
      return {
        borderColor: "rgba(92, 170, 255, 0.55)",
        background: "rgba(59, 130, 246, 0.16)",
        color: "var(--app-text-color)",
      };
    case "read-only":
    case "safe":
      return {
        borderColor: "rgba(74, 222, 128, 0.5)",
        background: "rgba(34, 197, 94, 0.12)",
        color: "var(--app-text-color)",
      };
    case "plan-only":
      return {
        borderColor: "rgba(148, 163, 184, 0.62)",
        background: "rgba(100, 116, 139, 0.16)",
        color: "var(--app-text-color)",
      };
    case "preflight-only":
      return {
        borderColor: "rgba(245, 184, 72, 0.72)",
        background: "rgba(245, 184, 72, 0.16)",
        color: "var(--app-text-color)",
      };
    case "proof-only":
      return {
        borderColor: "rgba(168, 122, 255, 0.72)",
        background: "rgba(124, 58, 237, 0.16)",
        color: "var(--app-text-color)",
      };
    case "review":
      return {
        borderColor: "rgba(45, 212, 191, 0.55)",
        background: "rgba(20, 184, 166, 0.14)",
        color: "var(--app-text-color)",
      };
    case "blocked":
    default:
      return {
        borderColor: "rgba(248, 113, 113, 0.72)",
        background: "rgba(220, 38, 38, 0.15)",
        color: "var(--app-text-color)",
      };
  }
}

function toTruthTone(truth: string): TruthTone {
  if (
    truth === "demo" ||
    truth === "read-only" ||
    truth === "plan-only" ||
    truth === "preflight-only" ||
    truth === "proof-only" ||
    truth === "blocked"
  ) {
    return truth;
  }
  return "blocked";
}

function TruthBadge({ truth }: { truth: TruthTone }) {
  return (
    <span style={{ ...styles.truthBadge, ...truthToneStyle(truth) }}>
      {truth}
    </span>
  );
}

function EditorRegion({
  title,
  subtitle,
  label,
  children,
  actions,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  label?: string;
  children: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section style={styles.region} aria-label={title}>
      <header style={styles.regionHeader}>
        <div style={styles.regionTitleGroup}>
          <strong style={styles.regionTitle}>{title}</strong>
          {subtitle ? <span style={styles.regionSubtitle}>{subtitle}</span> : null}
        </div>
        <div style={styles.regionActions}>
          {label ? <span style={styles.regionLabel}>{label}</span> : null}
          {actions}
        </div>
      </header>
      <div style={compact ? styles.regionBodyCompact : styles.regionBody}>{children}</div>
    </section>
  );
}

function getCandidateSummary(taskModel?: AssetForgeTaskRecord | null) {
  const firstCandidate = taskModel?.candidates?.[0];
  return {
    id: firstCandidate?.candidate_id ?? "candidate-a",
    name: firstCandidate?.display_name ?? "Weathered Ivy Arch",
    status: firstCandidate?.status ?? "demo",
    notes:
      firstCandidate?.preview_notes ??
      "Demo candidate placeholder. No provider generation has executed.",
    readiness:
      firstCandidate?.readiness_placeholder ??
      "Readiness pending proof-only review.",
    triangles: firstCandidate?.estimated_triangles ?? "triangle estimate unavailable",
  };
}

function providerSummary(providerStatus?: AssetForgeProviderStatusRecord | null): string {
  if (!providerStatus) {
    return "No provider status loaded; provider generation remains blocked.";
  }
  return `Provider mode ${providerStatus.provider_mode}; configuration ${
    providerStatus.configuration_ready ? "ready" : "not ready"
  }; generation ${providerStatus.generation_execution_status}.`;
}

function blenderSummary(blenderStatus?: AssetForgeBlenderStatusRecord | null): string {
  if (!blenderStatus) {
    return "No Blender status loaded; Blender execution remains blocked.";
  }
  const version = blenderStatus.version ?? "version unavailable";
  return `Blender ${blenderStatus.executable_found ? "detected" : "missing"} via ${
    blenderStatus.detection_source
  }; ${version}; prep ${blenderStatus.blender_prep_execution_status}.`;
}

export default function AssetForgeBlenderCockpit({
  projectProfile,
  taskModel,
  providerStatus,
  blenderStatus,
  editorModel,
  editorModelUnavailable = false,
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
  onPrefillPromptTemplate,
  onOpenRuntimeOverview,
  onOpenRecords,
  onViewLatestRun,
  onViewExecution,
  onViewArtifact,
  onViewEvidence,
  onOpenPromptSessionDetail,
  onOpenExecutionDetail,
  onOpenArtifactDetail,
  onOpenRunDetail,
}: AssetForgeBlenderCockpitProps) {
  const candidate = getCandidateSummary(taskModel);
  const tools = editorModel?.tools ?? fallbackTools;
  const outliner = editorModel?.outliner ?? fallbackOutliner;
  const promptTemplates = editorModel?.prompt_templates ?? fallbackPromptTemplates;
  const blockedCapabilities = editorModel?.blocked_capabilities ?? fallbackBlockedCapabilities;

  const [activeToolId, setActiveToolId] = useState<string>(editorModel?.active_tool_id ?? "transform");

  useEffect(() => {
    setActiveToolId(editorModel?.active_tool_id ?? "transform");
  }, [editorModel]);

  const activeTool = useMemo(
    () => tools.find((tool) => tool.tool_id === activeToolId) ?? tools[0] ?? null,
    [activeToolId, tools],
  );

  const activeToolPromptTemplate = useMemo(() => {
    const templateId = activeTool?.prompt_template_id;
    if (!templateId) {
      return null;
    }
    return promptTemplates.find((template) => template.template_id === templateId) ?? null;
  }, [activeTool, promptTemplates]);

  const effectiveViewport = editorModel?.viewport ?? {
    label: "Front Ortho",
    mode: "Object Mode",
    shading_modes: ["Solid", "Wireframe", "Material Preview", "O3DE Preview"],
    active_shading_mode: "Solid",
    grid_visible: true,
    preview_status: "demo_no_real_model_loaded",
    selected_object_label: candidate.name,
    overlays: [
      "Axis: Z-up demo",
      "No real model loaded",
      "No provider/Blender/Asset Processor/O3DE mutation admitted",
    ],
  };

  const effectiveTransformRows =
    editorModel?.properties.rows.filter(
      (row) =>
        row.label.startsWith("Location") ||
        row.label.startsWith("Rotation") ||
        row.label.startsWith("Scale") ||
        row.label.startsWith("Dimensions"),
    ) ?? [
      {
        row_id: "location",
        label: "Location X/Y/Z",
        value: "0.000, 0.000, 0.000",
        truth_state: "blocked",
        mutation_admitted: false,
        blocked_reason: "Transform writes are blocked.",
      },
      {
        row_id: "rotation",
        label: "Rotation X/Y/Z",
        value: "0.000, 0.000, 0.000",
        truth_state: "blocked",
        mutation_admitted: false,
        blocked_reason: "Transform writes are blocked.",
      },
      {
        row_id: "scale",
        label: "Scale X/Y/Z",
        value: "1.000, 1.000, 1.000",
        truth_state: "blocked",
        mutation_admitted: false,
        blocked_reason: "Transform writes are blocked.",
      },
      {
        row_id: "dimensions",
        label: "Dimensions X/Y/Z",
        value: "2.180, 0.260, 1.850",
        truth_state: "preflight-only",
        mutation_admitted: false,
        blocked_reason: "Dimensions are read-only preview values.",
      },
    ];

  const effectiveSafetyRows =
    editorModel?.properties.rows.filter(
      (row) =>
        row.label.includes("Provider") ||
        row.label.includes("Blender") ||
        row.label.includes("Asset Processor") ||
        row.label.includes("Placement"),
    ) ?? [];

  const effectiveMaterialRows = editorModel?.material_preview.rows ?? [
    {
      row_id: "mat-diffuse",
      label: "Diffuse",
      value: "Lambert (read-only preview)",
      truth_state: "preflight-only",
      mutation_admitted: false,
      blocked_reason: "Material mutation is blocked.",
    },
    {
      row_id: "mat-specular",
      label: "Specular",
      value: "CookTorr (read-only preview)",
      truth_state: "preflight-only",
      mutation_admitted: false,
      blocked_reason: "Material mutation is blocked.",
    },
    {
      row_id: "mat-shading",
      label: "Shading",
      value: "Emit 0.0 / Ambient 1.0",
      truth_state: "preflight-only",
      mutation_admitted: false,
      blocked_reason: "Material mutation is blocked.",
    },
    {
      row_id: "mat-transparency",
      label: "Transparency",
      value: "blocked mutation path",
      truth_state: "blocked",
      mutation_admitted: false,
      blocked_reason: "Material mutation is blocked.",
    },
  ];

  const timeline = editorModel?.timeline ?? {
    start_frame: 0,
    end_frame: 240,
    current_frame: 1,
    status: "read_only_status_strip",
  };

  const evidence = useMemo(() => {
    return {
      latest_run_id: editorModel?.evidence.latest_run_id ?? latestRunId ?? null,
      latest_execution_id: editorModel?.evidence.latest_execution_id ?? latestExecutionId ?? null,
      latest_artifact_id: editorModel?.evidence.latest_artifact_id ?? latestArtifactId ?? null,
      stage_write_evidence_reference:
        editorModel?.evidence.stage_write_evidence_reference ?? null,
      stage_write_readback_reference:
        editorModel?.evidence.stage_write_readback_reference ?? null,
      stage_write_readback_status:
        editorModel?.evidence.stage_write_readback_status ?? null,
    };
  }, [editorModel, latestArtifactId, latestExecutionId, latestRunId]);

  return (
    <section style={styles.shell} aria-label="Asset Forge Blender-style editor cockpit">
      <div style={styles.topbar}>
        <div style={styles.identity}>
          <span style={styles.eyebrow}>Asset Forge Editor Mode</span>
          <h2 style={styles.title}>Asset Forge Studio</h2>
          <p style={styles.subtitle}>
            Backend-supported Blender-style cockpit contract with explicit safety truth labels.
          </p>
          {editorModelUnavailable ? (
            <p style={styles.warningInline}>
              Editor model backend unavailable; using frontend fallback. No execution admitted.
            </p>
          ) : null}
        </div>
        <div style={styles.commandRow}>
          <button type="button" onClick={onLaunchInspectTemplate} style={styles.commandButton}>
            Inspect / Preflight
          </button>
          <button type="button" onClick={onLaunchPlacementProofTemplate} style={styles.commandButtonStrong}>
            Load placement proof-only template in Prompt Studio
          </button>
          <button type="button" onClick={onOpenPromptStudio} style={styles.commandButton}>
            Open Prompt Studio
          </button>
          <button type="button" onClick={onOpenRecords} style={styles.commandButton}>
            Open Records
          </button>
        </div>
      </div>

      <nav style={styles.stageStrip} aria-label="Asset Forge workflow stages">
        {stageItems.map((stage) => (
          <div key={stage.label} style={styles.stagePill}>
            <span>{stage.label}</span>
            <TruthBadge truth={stage.truth} />
          </div>
        ))}
      </nav>

      <div style={styles.editorGrid}>
        <aside style={styles.leftArea} aria-label="Asset Forge left tool and outliner area">
          <EditorRegion title="Tool Shelf" subtitle="Backend editor tools" label="LEFT" compact>
            <div style={styles.toolList}>
              {tools.map((tool) => {
                const tone = toTruthTone(tool.truth_state);
                const isSelected = activeToolId === tool.tool_id;
                return (
                  <button
                    key={tool.tool_id}
                    type="button"
                    style={{
                      ...styles.toolButton,
                      ...(isSelected ? styles.toolButtonSelected : null),
                      ...(!tool.enabled ? styles.toolButtonDisabled : null),
                    }}
                    onClick={() => setActiveToolId(tool.tool_id)}
                    aria-disabled={!tool.enabled}
                    aria-label={`Tool ${tool.label}`}
                    aria-pressed={isSelected}
                    title={tool.blocked_reason ?? tool.description}
                  >
                    <span style={styles.toolText}>
                      <strong>{tool.label}</strong>
                      <small>{tool.shortcut ?? ""}</small>
                    </span>
                    <TruthBadge truth={tone} />
                  </button>
                );
              })}
            </div>
          </EditorRegion>

          <EditorRegion title="Tool Detail" subtitle="Selection-only state and safety truth" label="LEFT" compact>
            {activeTool ? (
              <article style={styles.toolDetailCard}>
                <div style={styles.cardHeader}>
                  <strong>{activeTool.label}</strong>
                  <TruthBadge truth={toTruthTone(activeTool.truth_state)} />
                </div>
                <p style={styles.compactText}>{activeTool.description}</p>
                <p style={styles.metaLine}>
                  execution_admitted=false / mutation_admitted=false / backend dispatch disabled from tool click
                </p>
                {activeTool.blocked_reason ? (
                  <p style={styles.compactText}><strong>Blocked reason:</strong> {activeTool.blocked_reason}</p>
                ) : null}
                {activeTool.next_unlock ? (
                  <p style={styles.compactText}><strong>Next unlock:</strong> {activeTool.next_unlock}</p>
                ) : null}
                {activeToolPromptTemplate ? (
                  <div style={styles.toolDetailActions}>
                    <p style={styles.compactText}>
                      Linked prompt template: <strong>{activeToolPromptTemplate.label}</strong> (auto_execute=false)
                    </p>
                    <button
                      type="button"
                      style={styles.commandButton}
                      onClick={() => onPrefillPromptTemplate?.(activeToolPromptTemplate, activeTool.tool_id)}
                    >
                      Prefill linked template in Prompt Studio (no auto-execute)
                    </button>
                  </div>
                ) : (
                  <p style={styles.compactText}>No linked prompt template for this tool.</p>
                )}
              </article>
            ) : (
              <p style={styles.compactText}>No tool selected.</p>
            )}
          </EditorRegion>

          <EditorRegion title="Candidate Browser" subtitle="Selected variant" label="LEFT" compact>
            <article style={styles.candidateCard}>
              <div style={styles.cardHeader}>
                <strong>{candidate.name}</strong>
                <TruthBadge truth="demo" />
              </div>
              <p style={styles.compactText}>{candidate.notes}</p>
              <p style={styles.metaLine}>{candidate.triangles}</p>
              <p style={styles.metaLine}>{candidate.readiness}</p>
            </article>
          </EditorRegion>
        </aside>

        <main style={styles.centerArea} aria-label="Asset Forge center viewport area">
          <EditorRegion
            title="3D Viewport"
            subtitle={`${effectiveViewport.mode} / ${effectiveViewport.label}`}
            label="CENTER"
            actions={<TruthBadge truth={editorModel ? "read-only" : "demo"} />}
          >
            <div style={styles.viewportToolbar}>
              {effectiveViewport.shading_modes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  style={{
                    ...styles.viewportButton,
                    ...(mode === effectiveViewport.active_shading_mode ? styles.viewportButtonActive : null),
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div style={styles.viewport}>
              {effectiveViewport.grid_visible ? <div style={styles.gridOverlay} /> : null}
              <div style={styles.axisBadge}>{effectiveViewport.label}</div>
              <div style={styles.viewBadge}>{effectiveViewport.mode}</div>
              <div style={styles.previewObject} />
              <div style={styles.viewportNotice}>
                {effectiveViewport.preview_status} - no provider generation, Blender execution, Asset Processor execution, or O3DE mutation admitted.
              </div>
              <ul style={styles.viewportOverlayList}>
                {effectiveViewport.overlays.map((overlay) => (
                  <li key={overlay}>{overlay}</li>
                ))}
              </ul>
            </div>
            <div style={styles.viewportFooter}>
              {["View", "Select", "Add", "Object", "Object Mode", "Front Ortho"].map((control) => (
                <button key={control} type="button" style={styles.footerButton}>
                  {control}
                </button>
              ))}
            </div>
          </EditorRegion>
        </main>

        <aside style={styles.rightArea} aria-label="Asset Forge right inspector area">
          <EditorRegion title="Asset Outliner" subtitle="Backend outliner nodes" label="RIGHT" compact>
            <div style={styles.outliner}>
              {outliner.map((node) => (
                <div key={node.node_id} style={styles.outlinerItem}>
                  <div style={{ ...styles.outlinerText, marginLeft: node.depth * 10 }}>
                    <strong>{node.label}</strong>
                    <span>{node.kind}</span>
                  </div>
                  <TruthBadge truth={toTruthTone(node.truth_state)} />
                </div>
              ))}
            </div>
          </EditorRegion>

          <EditorRegion title="Transform / Properties" subtitle="Location, rotation, scale, dimensions" label="RIGHT">
            <div style={styles.inspectorStack}>
              <InspectorRow label="Candidate" value={`${candidate.name} (${candidate.id})`} />
              {effectiveTransformRows.map((row) => (
                <InspectorRow
                  key={row.row_id}
                  label={row.label}
                  value={row.value}
                  tone={toTruthTone(row.truth_state)}
                />
              ))}
              {effectiveSafetyRows.map((row) => (
                <InspectorRow
                  key={row.row_id}
                  label={row.label}
                  value={row.value}
                  tone={toTruthTone(row.truth_state)}
                />
              ))}
              <InspectorRow label="Provider" value={providerSummary(providerStatus)} tone="blocked" />
              <InspectorRow label="Blender" value={blenderSummary(blenderStatus)} tone="preflight-only" />
            </div>
          </EditorRegion>

          <EditorRegion title="Material Preview" subtitle="Surface / Wire / Volume / Halo" label="RIGHT" compact>
            <div style={styles.badgeRow}>
              {(editorModel?.material_preview.tabs ?? ["Surface", "Wire", "Volume", "Halo"]).map((tab) => (
                <span key={tab} style={styles.tabChip}>{tab}</span>
              ))}
            </div>
            <p style={styles.compactText}>{editorModel?.material_preview.preview_label ?? "Preview sphere/checker"}</p>
            {effectiveMaterialRows.map((row) => (
              <InspectorRow
                key={row.row_id}
                label={row.label}
                value={row.value}
                tone={toTruthTone(row.truth_state)}
              />
            ))}
          </EditorRegion>

          <EditorRegion title="Mission Truth" subtitle="Compact safety rail" label="RIGHT">
            <MissionTruthRail
              locationLabel="Asset Forge"
              projectLabel={projectProfile?.name ?? "unknown project"}
              projectPath={projectProfile?.projectRoot ?? bridgeStatus?.project_root ?? null}
              bridgeStatus={bridgeStatus}
              adapters={adapters}
              readiness={readiness}
              currentExecutionMode={readiness?.execution_mode ?? null}
              executionAdmitted={false}
              placementWriteAdmitted={false}
              mutationOccurred={false}
              latestRunId={latestRunId ?? null}
              latestExecutionId={latestExecutionId ?? null}
              latestArtifactId={latestArtifactId ?? null}
              latestPlacementProofOnlyReview={latestPlacementProofOnlyReview ?? null}
              nextSafeAction={editorModel?.next_safe_action ?? "Load a non-mutating prompt template, then review proof-only evidence."}
              onViewLatestRun={onViewLatestRun}
              onViewExecution={onViewExecution}
              onViewArtifact={onViewArtifact}
              onViewEvidence={onViewEvidence}
              onOpenPromptStudio={onOpenPromptStudio}
              onOpenRuntimeOverview={onOpenRuntimeOverview}
              onOpenRecords={onOpenRecords}
              onOpenPromptSessionDetail={onOpenPromptSessionDetail}
              onOpenExecutionDetail={onOpenExecutionDetail}
              onOpenArtifactDetail={onOpenArtifactDetail}
              onOpenRunDetail={onOpenRunDetail}
            />
          </EditorRegion>
        </aside>
      </div>

      <footer style={styles.bottomDrawer} aria-label="Asset Forge bottom evidence prompt and log drawer">
        <EditorRegion title="Evidence / Prompts / Logs" subtitle="Timeline and safety strip" label="BOTTOM">
          <div style={styles.drawerGrid}>
            <section style={styles.drawerSection}>
              <strong>Timeline / Status strip</strong>
              <p style={styles.compactText}>Frames {timeline.start_frame} - {timeline.end_frame}; current frame {timeline.current_frame}</p>
              <p style={styles.compactText}>Status: {timeline.status}</p>
              <p style={styles.compactText}>Latest run: <code>{evidence.latest_run_id ?? "not selected"}</code></p>
              <p style={styles.compactText}>Latest execution: <code>{evidence.latest_execution_id ?? "not selected"}</code></p>
              <p style={styles.compactText}>Latest artifact: <code>{evidence.latest_artifact_id ?? "not selected"}</code></p>
              <p style={styles.compactText}>Stage-write evidence: <code>{evidence.stage_write_evidence_reference ?? "not provided"}</code></p>
              <p style={styles.compactText}>Stage-write readback: <code>{evidence.stage_write_readback_reference ?? "not provided"}</code></p>
              <p style={styles.compactText}>Stage-write readback status: <code>{evidence.stage_write_readback_status ?? "not provided"}</code></p>
              <div style={styles.drawerButtons}>
                <button type="button" onClick={onViewLatestRun} style={styles.commandButton}>View latest run</button>
                <button type="button" onClick={onViewExecution} style={styles.commandButton}>View execution</button>
                <button type="button" onClick={onViewArtifact} style={styles.commandButton}>View artifact</button>
                <button type="button" onClick={onViewEvidence} style={styles.commandButton}>View evidence</button>
              </div>
            </section>

            <section style={styles.drawerSection}>
              <strong>Prompt templates</strong>
              <div style={styles.templateList}>
                {promptTemplates.map((template) => (
                  <article key={template.template_id} style={styles.templateCard}>
                    <div style={styles.cardHeader}>
                      <strong>{template.label}</strong>
                      <TruthBadge truth={toTruthTone(template.truth_state)} />
                    </div>
                    <p style={styles.compactText}>{template.description}</p>
                    <p style={styles.compactText}>{template.text}</p>
                    <p style={styles.compactText}>Safety labels: {template.safety_labels.join(", ")}</p>
                    <p style={styles.metaLine}>auto_execute=false / non-mutating</p>
                    <button
                      type="button"
                      style={styles.commandButton}
                      onClick={() => onPrefillPromptTemplate?.(template, null)}
                    >
                      Prefill in Prompt Studio (no auto-execute)
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section style={styles.drawerSection}>
              <strong>Blocked capabilities</strong>
              <ul style={styles.blockedList}>
                {blockedCapabilities.map((blocked) => (
                  <li key={blocked.capability_id}>
                    <strong>{blocked.label}</strong>: {blocked.reason}
                    <br />
                    <span style={styles.compactText}>Next unlock: {blocked.next_unlock}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </EditorRegion>
      </footer>
    </section>
  );
}

function InspectorRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: TruthTone;
}) {
  return (
    <div style={{ ...styles.inspectorRow, ...(tone ? truthToneStyle(tone) : null) }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles = {
  shell: {
    display: "grid",
    gridTemplateRows: "auto auto minmax(0, 1fr) minmax(170px, 0.3fr)",
    gap: 10,
    minWidth: 0,
    minHeight: 0,
    height: "100%",
    overflow: "hidden",
    color: "var(--app-text-color)",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    padding: "12px 14px",
    border: "1px solid var(--app-panel-border)",
    borderRadius: "var(--app-card-radius)",
    background: "var(--app-panel-bg)",
    boxShadow: "var(--app-shadow-soft)",
    minWidth: 0,
  },
  identity: {
    display: "grid",
    gap: 3,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--app-muted-color)",
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: 0,
    color: "var(--app-muted-color)",
    fontSize: 13,
  },
  warningInline: {
    margin: "4px 0 0",
    fontSize: 12,
    color: "#f7c7a0",
  },
  commandRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
  },
  commandButton: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 9,
    padding: "7px 10px",
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    cursor: "pointer",
    boxShadow: "var(--app-shadow-soft)",
  },
  commandButtonStrong: {
    border: "1px solid var(--app-accent)",
    borderRadius: 9,
    padding: "7px 10px",
    background: "color-mix(in srgb, var(--app-accent) 20%, var(--app-panel-bg-alt))",
    color: "var(--app-text-color)",
    cursor: "pointer",
    boxShadow: "var(--app-shadow-soft)",
    fontWeight: 700,
  },
  stageStrip: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    padding: "4px 2px 6px",
    minWidth: 0,
  },
  stagePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "6px 10px",
    background: "var(--app-panel-bg)",
    boxShadow: "var(--app-shadow-soft)",
    fontSize: 12,
  },
  editorGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(250px, 0.24fr) minmax(520px, 1fr) minmax(320px, 0.3fr)",
    gap: 10,
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  leftArea: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    minHeight: 0,
    overflow: "auto",
  },
  centerArea: {
    display: "grid",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  rightArea: {
    display: "grid",
    gap: 10,
    minWidth: 0,
    minHeight: 0,
    overflow: "auto",
  },
  bottomDrawer: {
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
  },
  region: {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    minWidth: 0,
    minHeight: 0,
    overflow: "hidden",
    border: "1px solid var(--app-panel-border)",
    borderRadius: "var(--app-card-radius)",
    background: "var(--app-panel-bg)",
    boxShadow: "var(--app-shadow-soft)",
  },
  regionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "8px 10px",
    borderBottom: "1px solid var(--app-panel-border)",
    background: "var(--app-panel-bg-alt)",
    minWidth: 0,
  },
  regionTitleGroup: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },
  regionTitle: {
    fontSize: 13,
  },
  regionSubtitle: {
    fontSize: 12,
    color: "var(--app-muted-color)",
    overflowWrap: "anywhere",
  },
  regionActions: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  regionLabel: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "2px 7px",
    fontSize: 10,
    color: "var(--app-muted-color)",
    textTransform: "uppercase",
  },
  regionBody: {
    minWidth: 0,
    minHeight: 0,
    overflow: "auto",
    padding: 10,
  },
  regionBodyCompact: {
    minWidth: 0,
    minHeight: 0,
    overflow: "auto",
    padding: 8,
  },
  truthBadge: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid",
    borderRadius: 999,
    padding: "2px 7px",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: 800,
    letterSpacing: "0.03em",
  },
  toolList: {
    display: "grid",
    gap: 7,
  },
  toolButton: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "7px 8px",
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    cursor: "pointer",
    minWidth: 0,
    textAlign: "left",
  },
  toolButtonSelected: {
    border: "1px solid var(--app-accent)",
    background: "color-mix(in srgb, var(--app-accent) 12%, var(--app-panel-bg-alt))",
  },
  toolButtonDisabled: {
    opacity: 0.72,
    cursor: "not-allowed",
  },
  toolText: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  toolDetailCard: {
    display: "grid",
    gap: 8,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--app-panel-bg-alt)",
  },
  toolDetailActions: {
    display: "grid",
    gap: 6,
  },
  candidateCard: {
    display: "grid",
    gap: 8,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--app-panel-bg-alt)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  compactText: {
    margin: 0,
    fontSize: 12,
    color: "var(--app-muted-color)",
    overflowWrap: "anywhere",
  },
  metaLine: {
    margin: 0,
    fontSize: 12,
    color: "var(--app-text-color)",
    overflowWrap: "anywhere",
  },
  outliner: {
    display: "grid",
    gap: 6,
  },
  outlinerItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "7px 8px",
    background: "var(--app-panel-bg-alt)",
    minWidth: 0,
  },
  outlinerText: {
    display: "grid",
    gap: 2,
    minWidth: 0,
    fontSize: 12,
  },
  viewportToolbar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  viewportButton: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "5px 10px",
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    cursor: "pointer",
  },
  viewportButtonActive: {
    borderColor: "var(--app-accent)",
    background: "color-mix(in srgb, var(--app-accent) 18%, var(--app-panel-bg-alt))",
  },
  viewport: {
    position: "relative",
    minHeight: 420,
    height: "min(58vh, 620px)",
    border: "1px solid var(--app-panel-border)",
    borderRadius: 12,
    overflow: "hidden",
    background: "linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.86))",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.14) 1px, transparent 1px)",
    backgroundSize: "32px 32px",
  },
  axisBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    border: "1px solid rgba(148, 163, 184, 0.4)",
    borderRadius: 999,
    padding: "5px 10px",
    color: "#e2e8f0",
    background: "rgba(2, 6, 23, 0.72)",
    fontSize: 12,
  },
  viewBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    border: "1px solid rgba(92, 170, 255, 0.58)",
    borderRadius: 999,
    padding: "5px 10px",
    color: "#e0f2fe",
    background: "rgba(14, 116, 144, 0.32)",
    fontSize: 12,
  },
  previewObject: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 220,
    height: 180,
    transform: "translate(-50%, -50%) rotate(12deg)",
    borderRadius: "48% 52% 46% 54%",
    border: "2px solid rgba(203, 213, 225, 0.72)",
    background:
      "radial-gradient(circle at 35% 30%, rgba(226, 232, 240, 0.36), rgba(100, 116, 139, 0.32) 42%, rgba(30, 41, 59, 0.58) 100%)",
    boxShadow: "0 28px 70px rgba(2, 6, 23, 0.45)",
  },
  viewportNotice: {
    position: "absolute",
    left: 16,
    bottom: 16,
    maxWidth: "calc(100% - 32px)",
    borderRadius: 10,
    padding: "8px 10px",
    color: "#f8fafc",
    background: "rgba(2, 6, 23, 0.78)",
    overflowWrap: "anywhere",
    fontSize: 12,
  },
  viewportOverlayList: {
    position: "absolute",
    left: 16,
    top: 48,
    margin: 0,
    paddingLeft: 16,
    color: "#d8e8f8",
    fontSize: 11,
    display: "grid",
    gap: 4,
  },
  viewportFooter: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  footerButton: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "5px 9px",
    background: "var(--app-panel-bg-alt)",
    color: "var(--app-text-color)",
    cursor: "pointer",
  },
  inspectorStack: {
    display: "grid",
    gap: 8,
  },
  inspectorRow: {
    display: "grid",
    gap: 4,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "8px 9px",
    background: "var(--app-panel-bg-alt)",
    fontSize: 12,
    overflowWrap: "anywhere",
  },
  drawerGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 0.9fr) minmax(320px, 1.2fr) minmax(220px, 0.9fr)",
    gap: 12,
    minWidth: 0,
  },
  drawerSection: {
    display: "grid",
    gap: 8,
    minWidth: 0,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--app-panel-bg-alt)",
  },
  drawerButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
  },
  tabChip: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "3px 8px",
    fontSize: 11,
    color: "var(--app-text-color)",
    background: "var(--app-panel-bg-alt)",
  },
  templateList: {
    display: "grid",
    gap: 8,
  },
  templateCard: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: 8,
    display: "grid",
    gap: 6,
    background: "var(--app-panel-bg)",
  },
  blockedList: {
    margin: 0,
    paddingLeft: 18,
    display: "grid",
    gap: 6,
    fontSize: 12,
    color: "var(--app-muted-color)",
  },
} satisfies Record<string, CSSProperties>;
