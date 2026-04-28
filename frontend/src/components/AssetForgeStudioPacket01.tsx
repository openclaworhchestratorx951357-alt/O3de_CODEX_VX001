import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { assetForgeStudioDemoState } from "../fixtures/assetForgeStudioDemoState";
import {
  createAssetForgeO3DEStagePlan,
  createAssetForgeO3DEPlacementPlan,
  executeAssetForgeO3DEPlacementProof,
  readAssetForgeO3DEPlacementEvidence,
  prepareAssetForgeO3DEPlacementRuntimeHarness,
  executeAssetForgeO3DEPlacementRuntimeHarness,
  executeAssetForgeO3DEPlacementLiveProof,
  getAssetForgeO3DEPlacementLiveProofEvidenceIndex,
  readAssetForgeO3DEIngestEvidence,
  executeAssetForgeO3DEStageWrite,
  inspectAssetForgeBlenderArtifact,
  fetchAssetForgeTask,
  fetchAssetForgeProviderStatus,
  fetchAssetForgeBlenderStatus,
  fetchAssetForgeStudioStatus,
} from "../lib/api";
import type {
  AssetForgeCandidateCard,
  AssetForgeStatusLane,
  AssetForgeTruthState,
} from "../types/assetForgeStudioDemo";
import type {
  AdaptersResponse,
  AssetForgeBlenderInspectReport,
  AssetForgeO3DEReadbackRecord,
  AssetForgeO3DEPlacementPlanRecord,
  AssetForgeO3DEPlacementEvidenceRecord,
  AssetForgeO3DEPlacementHarnessRecord,
  AssetForgeO3DEPlacementHarnessExecuteRecord,
  AssetForgeO3DEPlacementLiveProofRecord,
  AssetForgePlacementEvidenceIndexRecord,
  AssetForgeO3DEPlacementProofRecord,
  AssetForgeBlenderStatusRecord,
  AssetForgeStudioStatusRecord,
  AssetForgeO3DEStagePlanRecord,
  AssetForgeO3DEStageWriteRecord,
  AssetForgeProviderStatusRecord,
  AssetForgeTaskRecord,
  ReadinessStatus,
  ToolPolicy,
} from "../types/contracts";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

type AssetForgeStudioPacket01Props = {
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  policies?: ToolPolicy[];
  policiesLoading?: boolean;
  policiesError?: string | null;
  readiness?: ReadinessStatus | null;
  readinessLoading?: boolean;
  readinessError?: string | null;
  adapters?: AdaptersResponse | null;
  adaptersLoading?: boolean;
  adaptersError?: string | null;
  taskModel?: AssetForgeTaskRecord | null;
  providerStatus?: AssetForgeProviderStatusRecord | null;
  blenderStatus?: AssetForgeBlenderStatusRecord | null;
};

const EVIDENCE_FILTERS_SESSION_KEY = "asset-forge-packet01-evidence-filters-v1";
const OUTLINER_SESSION_KEY = "asset-forge-packet01-outliner-v1";
const EDITOR_SESSION_KEY = "asset-forge-packet01-editor-v1";
const EVIDENCE_VISIBLE_ITEM_LIMIT = 5;

type EvidenceFilterSessionState = {
  limit: number;
  status: string;
  candidate: string;
  from_age_s: string;
};

type OutlinerSessionState = {
  filter: string;
  auto_sync: boolean;
};

type EditorSessionState = {
  tool: EditorToolLabel;
  viewport_mode: ViewportMode;
  viewport_control: ViewControl;
};

type ViewportMode = "Solid" | "Material Preview" | "Wireframe" | "O3DE Preview";
type ViewControl = "Orbit" | "Pan" | "Zoom" | "Frame" | "Top" | "Front" | "Side";
type EditorToolLabel =
  | "Select"
  | "Move"
  | "Rotate"
  | "Scale"
  | "Set Origin"
  | "Align to Ground"
  | "Apply Transforms"
  | "Measure"
  | "Inspect Mesh";

const VIEWPORT_MODES: readonly ViewportMode[] = ["Solid", "Material Preview", "Wireframe", "O3DE Preview"];
const VIEWPORT_CONTROLS: readonly ViewControl[] = ["Orbit", "Pan", "Zoom", "Frame", "Top", "Front", "Side"];
const TOOL_RAIL_ITEMS: readonly { label: EditorToolLabel; truth: AssetForgeTruthState }[] = [
  { label: "Select", truth: "demo" },
  { label: "Move", truth: "demo" },
  { label: "Rotate", truth: "demo" },
  { label: "Scale", truth: "demo" },
  { label: "Set Origin", truth: "plan-only" },
  { label: "Align to Ground", truth: "plan-only" },
  { label: "Apply Transforms", truth: "preflight-only" },
  { label: "Measure", truth: "preflight-only" },
  { label: "Inspect Mesh", truth: "blocked" },
];
const OUTLINER_ITEMS: readonly string[] = [
  "Asset Root",
  "Mesh_LOD0",
  "Mesh_LOD1 planned",
  "Materials",
  "Textures",
  "Collision planned",
  "Export Manifest planned",
];

const TOOL_SHORTCUTS: Record<EditorToolLabel, string> = {
  Select: "1",
  Move: "2",
  Rotate: "3",
  Scale: "4",
  "Set Origin": "5",
  "Align to Ground": "6",
  "Apply Transforms": "7",
  Measure: "8",
  "Inspect Mesh": "9",
};

const VIEW_CONTROL_SHORTCUTS: Record<ViewControl, string> = {
  Orbit: "O",
  Pan: "P",
  Zoom: "Z",
  Frame: "F",
  Top: "T",
  Front: "R",
  Side: "Y",
};

function loadEvidenceFilterSessionState(): EvidenceFilterSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const rawValue = window.sessionStorage.getItem(EVIDENCE_FILTERS_SESSION_KEY);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue) as Partial<EvidenceFilterSessionState>;
    return {
      limit: typeof parsed.limit === "number" ? parsed.limit : 10,
      status: typeof parsed.status === "string" ? parsed.status : "",
      candidate: typeof parsed.candidate === "string" ? parsed.candidate : "",
      from_age_s: typeof parsed.from_age_s === "string" ? parsed.from_age_s : "",
    };
  } catch {
    return null;
  }
}

function loadOutlinerSessionState(): OutlinerSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const rawValue = window.sessionStorage.getItem(OUTLINER_SESSION_KEY);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue) as Partial<OutlinerSessionState>;
    return {
      filter: typeof parsed.filter === "string" ? parsed.filter : "",
      auto_sync: typeof parsed.auto_sync === "boolean" ? parsed.auto_sync : false,
    };
  } catch {
    return null;
  }
}

function loadEditorSessionState(): EditorSessionState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const rawValue = window.sessionStorage.getItem(EDITOR_SESSION_KEY);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue) as Partial<EditorSessionState>;
    const tool = TOOL_RAIL_ITEMS.find((item) => item.label === parsed.tool)?.label ?? "Select";
    const viewportMode = VIEWPORT_MODES.find((mode) => mode === parsed.viewport_mode) ?? "Solid";
    const viewportControl = VIEWPORT_CONTROLS.find((control) => control === parsed.viewport_control) ?? "Orbit";
    return {
      tool,
      viewport_mode: viewportMode,
      viewport_control: viewportControl,
    };
  } catch {
    return null;
  }
}

function truthTone(truth: AssetForgeTruthState): CSSProperties {
  switch (truth) {
    case "demo":
      return {
        background: "rgba(21, 111, 186, 0.24)",
        borderColor: "rgba(88, 173, 245, 0.8)",
        color: "#d8efff",
      };
    case "plan-only":
      return {
        background: "rgba(71, 75, 89, 0.5)",
        borderColor: "rgba(140, 148, 168, 0.9)",
        color: "#e5ebf5",
      };
    case "preflight-only":
      return {
        background: "rgba(109, 78, 13, 0.45)",
        borderColor: "rgba(232, 184, 73, 0.9)",
        color: "#ffe8b6",
      };
    case "gated-real":
      return {
        background: "rgba(26, 102, 61, 0.42)",
        borderColor: "rgba(113, 219, 160, 0.92)",
        color: "#d7ffe7",
      };
    case "blocked":
    default:
      return {
        background: "rgba(121, 36, 54, 0.44)",
        borderColor: "rgba(236, 119, 143, 0.86)",
        color: "#ffd4de",
      };
  }
}

function TruthBadge({ truth }: { truth: AssetForgeTruthState }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid",
        borderRadius: 999,
        padding: "2px 9px",
        fontSize: 11,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        fontWeight: 700,
        ...truthTone(truth),
      }}
    >
      {truth}
    </span>
  );
}

function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: AssetForgeCandidateCard;
  selected: boolean;
  onSelect: (candidateId: string) => void;
}) {
  return (
    <article
      style={{
        ...s.card,
        borderColor: selected ? "#7ac7ff" : "var(--app-panel-border)",
        boxShadow: selected ? "0 0 0 1px rgba(122, 199, 255, 0.55), 0 8px 18px rgba(6, 20, 40, 0.35)" : "none",
      }}
    >
      <header style={s.cardHeader}>
        <strong style={{ fontSize: 14 }}>{candidate.name}</strong>
        <TruthBadge truth={candidate.status} />
      </header>
      <p style={s.cardDetail}>{candidate.previewNotes}</p>
      <p style={s.cardMicro}>{candidate.trisEstimate}</p>
      <p style={s.cardMicro}>{candidate.readinessPlaceholder}</p>
      <p style={s.demoNotice}>Demo candidate - no real generation performed.</p>
      <button
        type="button"
        style={selected ? s.activeButton : s.secondaryButton}
        onClick={() => onSelect(candidate.id)}
      >
        {selected ? "Selected candidate" : `Select ${candidate.name}`}
      </button>
    </article>
  );
}

function findPolicy(
  policies: ToolPolicy[],
  toolNames: readonly string[],
): ToolPolicy | null {
  for (const toolName of toolNames) {
    const match = policies.find((policy) => policy.tool === toolName);
    if (match) {
      return match;
    }
  }
  return null;
}

function providerModeToTruth(mode: AssetForgeProviderStatusRecord["provider_mode"]): AssetForgeTruthState {
  if (mode === "disabled") {
    return "blocked";
  }
  return "preflight-only";
}

function blenderPreflightToTruth(executableFound: boolean): AssetForgeTruthState {
  return executableFound ? "preflight-only" : "blocked";
}

function blenderVersionProbeSummary(
  status: AssetForgeBlenderStatusRecord["version_probe_status"] | "demo",
): string {
  if (status === "detected") {
    return "detected";
  }
  if (status === "missing") {
    return "missing";
  }
  if (status === "failed") {
    return "failed";
  }
  return "demo";
}

function blenderInspectStatusToTruth(status: AssetForgeBlenderInspectReport["inspection_status"]): AssetForgeTruthState {
  if (status === "succeeded") {
    return "preflight-only";
  }
  return "blocked";
}

function stagePlanStatusToTruth(status: AssetForgeO3DEStagePlanRecord["plan_status"]): AssetForgeTruthState {
  if (status === "ready-for-approval") {
    return "plan-only";
  }
  return "blocked";
}

function stageWriteStatusToTruth(status: AssetForgeO3DEStageWriteRecord["write_status"]): AssetForgeTruthState {
  if (status === "succeeded") {
    return "gated-real";
  }
  return "blocked";
}

function readbackStatusToTruth(status: AssetForgeO3DEReadbackRecord["readback_status"]): AssetForgeTruthState {
  if (status === "succeeded") {
    return "preflight-only";
  }
  return "blocked";
}

function evidenceItemStatusToTruth(status: string | null | undefined): AssetForgeTruthState {
  const normalized = (status ?? "").trim().toLowerCase();
  if (normalized === "succeeded") {
    return "preflight-only";
  }
  if (normalized === "approval-required") {
    return "plan-only";
  }
  return "blocked";
}

function buildLaneStatuses(input: {
  fallbackLanes: AssetForgeStatusLane[];
  policies: ToolPolicy[];
  policiesLoading: boolean;
  policiesError: string | null;
  readiness: ReadinessStatus | null;
  readinessLoading: boolean;
  readinessError: string | null;
  adapters: AdaptersResponse | null;
  adaptersLoading: boolean;
  adaptersError: string | null;
  providerStatus: AssetForgeProviderStatusRecord | null;
  blenderStatus: AssetForgeBlenderStatusRecord | null;
}): AssetForgeStatusLane[] {
  const nextLanes = input.fallbackLanes.map((lane) => ({ ...lane }));
  const providerTools = [
    "ai.asset.generate.local",
    "asset_forge.provider.status",
  ] as const;
  const blenderTools = [
    "ai.asset.cleanup.convert",
    "asset_forge.blender.status",
  ] as const;
  const ingestTools = [
    "asset.source.inspect",
    "asset.processor.status",
    "asset.batch.process",
  ] as const;
  const placementTools = [
    "editor.entity.create",
    "editor.component.add",
  ] as const;
  const reviewTools = [
    "asset.source.inspect",
  ] as const;

  const providerPolicy = findPolicy(input.policies, providerTools);
  const blenderPolicy = findPolicy(input.policies, blenderTools);
  const ingestPolicy = findPolicy(input.policies, ingestTools);
  const placementPolicy = findPolicy(input.policies, placementTools);
  const reviewPolicy = findPolicy(input.policies, reviewTools);

  return nextLanes.map((lane) => {
    if (lane.lane === "Provider") {
      if (input.providerStatus) {
        return {
          ...lane,
          truth: providerModeToTruth(input.providerStatus.provider_mode),
          detail: `Provider mode ${input.providerStatus.provider_mode}, config ready ${input.providerStatus.configuration_ready ? "yes" : "no"}, generation status ${input.providerStatus.generation_execution_status}.`,
        };
      }
      if (providerPolicy) {
        return {
          ...lane,
          truth: providerPolicy.execution_mode === "real" ? "preflight-only" : "blocked",
          detail: `Backend policy ${providerPolicy.tool}: ${providerPolicy.capability_status} / ${providerPolicy.real_admission_stage}. Provider execution stays blocked in this packet.`,
        };
      }
      if (input.policiesLoading) {
        return {
          ...lane,
          truth: "demo",
          detail: "Loading backend policy registry for provider lane.",
        };
      }
      if (input.policiesError) {
        return {
          ...lane,
          truth: "blocked",
          detail: `Policy registry unavailable (${input.policiesError}). Provider lane remains blocked.`,
        };
      }
      return {
        ...lane,
        truth: "blocked",
        detail: "No provider capability policy is registered yet; lane remains blocked.",
      };
    }

    if (lane.lane === "Blender") {
      if (input.blenderStatus) {
        const versionLabel = input.blenderStatus.version ?? "unavailable";
        return {
          ...lane,
          truth: blenderPreflightToTruth(input.blenderStatus.executable_found),
          detail: `Blender preflight ${input.blenderStatus.executable_found ? "detected" : "missing"} (${input.blenderStatus.detection_source}); version ${versionLabel}; prep execution ${input.blenderStatus.blender_prep_execution_status}.`,
        };
      }
      if (blenderPolicy) {
        return {
          ...lane,
          truth: "preflight-only",
          detail: `Backend policy ${blenderPolicy.tool}: ${blenderPolicy.capability_status} / ${blenderPolicy.real_admission_stage}. Blender execution is still not admitted.`,
        };
      }
      if (input.readinessLoading || input.adaptersLoading) {
        return {
          ...lane,
          truth: "preflight-only",
          detail: "Waiting for readiness/adapter telemetry to complete Blender preflight reporting.",
        };
      }
      if (input.readinessError || input.adaptersError) {
        return {
          ...lane,
          truth: "preflight-only",
          detail: `Readiness telemetry unavailable (${input.readinessError ?? input.adaptersError}). Blender stays preflight-only.`,
        };
      }
      return {
        ...lane,
        truth: "preflight-only",
        detail: "No Blender policy corridor is registered yet; lane remains preflight-only.",
      };
    }

    if (lane.lane === "O3DE ingest") {
      if (ingestPolicy) {
        return {
          ...lane,
          truth: "plan-only",
          detail: `Backend policy ${ingestPolicy.tool}: ${ingestPolicy.capability_status} / ${ingestPolicy.real_admission_stage}. Read-only ingest evidence is available; staging writes remain blocked.`,
        };
      }
      if (input.policiesLoading) {
        return {
          ...lane,
          truth: "plan-only",
          detail: "Loading backend ingest policy signals.",
        };
      }
      return {
        ...lane,
        truth: "plan-only",
        detail: "No ingest policy found; lane remains plan-only from the Packet 01 baseline.",
      };
    }

    if (lane.lane === "Placement") {
      if (placementPolicy) {
        return {
          ...lane,
          truth: "plan-only",
          detail: `General editor policy ${placementPolicy.tool} is ${placementPolicy.capability_status}, but Asset Forge placement contract remains plan-only.`,
        };
      }
      if (input.adapters) {
        return {
          ...lane,
          truth: "plan-only",
          detail: `Adapter mode ${input.adapters.active_mode} is connected, but no Asset Forge placement capability registry entry exists yet.`,
        };
      }
      return {
        ...lane,
        truth: "plan-only",
        detail: "Placement remains plan-only pending explicit Asset Forge placement capability admission.",
      };
    }

    if (lane.lane === "Review") {
      if (reviewPolicy) {
        return {
          ...lane,
          truth: "preflight-only",
          detail: `Review is backed by ${reviewPolicy.tool} (${reviewPolicy.capability_status} / ${reviewPolicy.real_admission_stage}) for read-only evidence.`,
        };
      }
      if (input.readiness?.ok) {
        return {
          ...lane,
          truth: "demo",
          detail: "Service is ready but review policy data is missing; using demo review timeline.",
        };
      }
      return lane;
    }

    return lane;
  });
}

function mapTaskCandidateStatus(status: AssetForgeTaskRecord["candidates"][number]["status"]): AssetForgeTruthState {
  if (status === "demo") {
    return "demo";
  }
  if (status === "selected" || status === "planned" || status === "staged") {
    return "plan-only";
  }
  return "blocked";
}

function mapTaskCandidates(taskModel?: AssetForgeTaskRecord | null): AssetForgeCandidateCard[] {
  if (!taskModel || taskModel.candidates.length === 0) {
    return assetForgeStudioDemoState.candidates;
  }

  return taskModel.candidates.map((candidate) => ({
    id: candidate.candidate_id,
    name: candidate.display_name,
    status: mapTaskCandidateStatus(candidate.status),
    previewNotes: candidate.preview_notes,
    readinessPlaceholder: candidate.readiness_placeholder,
    trisEstimate: candidate.estimated_triangles,
  }));
}

function candidateDemoScores(candidateId: string): {
  geometry: number;
  texture: number;
  readiness: number;
  warnings: string;
} {
  switch (candidateId) {
    case "candidate-a":
      return { geometry: 86, texture: 79, readiness: 74, warnings: "Minor UV seam checks pending (demo)." };
    case "candidate-b":
      return { geometry: 72, texture: 68, readiness: 67, warnings: "Keystone normals cleanup planned." };
    case "candidate-c":
      return { geometry: 83, texture: 71, readiness: 81, warnings: "LOD1 and collision still planned." };
    case "candidate-d":
      return { geometry: 77, texture: 66, readiness: 59, warnings: "High tri budget exceeds target envelope." };
    default:
      return { geometry: 70, texture: 65, readiness: 60, warnings: "Demo warning unavailable." };
  }
}

function candidateIdToOutlinerHint(candidateId: string): string {
  switch (candidateId) {
    case "candidate-a":
      return "Mesh_LOD0";
    case "candidate-b":
      return "Materials";
    case "candidate-c":
      return "Textures";
    case "candidate-d":
      return "Collision";
    default:
      return "Asset Root";
  }
}

export default function AssetForgeStudioPacket01({
  projectProfile,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenBuilder,
  policies = [],
  policiesLoading = false,
  policiesError = null,
  readiness = null,
  readinessLoading = false,
  readinessError = null,
  adapters = null,
  adaptersLoading = false,
  adaptersError = null,
  taskModel = null,
  providerStatus = null,
  blenderStatus = null,
}: AssetForgeStudioPacket01Props) {
  const packet01DemoLock = import.meta.env.MODE !== "test";
  const [fetchedTaskModel, setFetchedTaskModel] = useState<AssetForgeTaskRecord | null>(null);
  const effectiveTaskModel = taskModel ?? fetchedTaskModel;
  const effectiveCandidates = useMemo(
    () => mapTaskCandidates(effectiveTaskModel),
    [effectiveTaskModel],
  );
  const [selectedCandidateId, setSelectedCandidateId] = useState(assetForgeStudioDemoState.candidates[0]?.id ?? "");
  const initialEditorSessionState = useMemo(() => loadEditorSessionState(), []);
  const [activeViewportMode, setActiveViewportMode] = useState<ViewportMode>(
    initialEditorSessionState?.viewport_mode ?? "Solid",
  );
  const [activeViewportControl, setActiveViewportControl] = useState<ViewControl>(
    initialEditorSessionState?.viewport_control ?? "Orbit",
  );
  const [activeToolLabel, setActiveToolLabel] = useState<EditorToolLabel>(initialEditorSessionState?.tool ?? "Select");
  const initialOutlinerSessionState = useMemo(() => loadOutlinerSessionState(), []);
  const [outlinerFilter, setOutlinerFilter] = useState(initialOutlinerSessionState?.filter ?? "");
  const [autoSyncOutlinerToSelection, setAutoSyncOutlinerToSelection] = useState(
    initialOutlinerSessionState?.auto_sync ?? false,
  );
  const [editorSnapshotCopyStatus, setEditorSnapshotCopyStatus] = useState<string | null>(null);
  const [blenderInspectPath, setBlenderInspectPath] = useState("candidates/sample.obj");
  const [blenderInspectReport, setBlenderInspectReport] = useState<AssetForgeBlenderInspectReport | null>(null);
  const [blenderInspectError, setBlenderInspectError] = useState<string | null>(null);
  const [blenderInspectBusy, setBlenderInspectBusy] = useState(false);
  const [stagePlanReport, setStagePlanReport] = useState<AssetForgeO3DEStagePlanRecord | null>(null);
  const [stagePlanError, setStagePlanError] = useState<string | null>(null);
  const [stagePlanBusy, setStagePlanBusy] = useState(false);
  const [stageSourceArtifactPath, setStageSourceArtifactPath] = useState("prepared_exports/candidate_a.glb");
  const [stageApprovalNote, setStageApprovalNote] = useState("");
  const [stageApprovalGranted, setStageApprovalGranted] = useState(false);
  const [stageWriteReport, setStageWriteReport] = useState<AssetForgeO3DEStageWriteRecord | null>(null);
  const [stageWriteError, setStageWriteError] = useState<string | null>(null);
  const [stageWriteBusy, setStageWriteBusy] = useState(false);
  const [readbackSourceRelativePath, setReadbackSourceRelativePath] = useState(
    "Assets/Generated/asset_forge/candidate_a/candidate_a.glb",
  );
  const [readbackPlatform, setReadbackPlatform] = useState("pc");
  const [readbackReport, setReadbackReport] = useState<AssetForgeO3DEReadbackRecord | null>(null);
  const [readbackError, setReadbackError] = useState<string | null>(null);
  const [readbackBusy, setReadbackBusy] = useState(false);
  const [placementLevelPath, setPlacementLevelPath] = useState("Levels/BridgeLevel01/BridgeLevel01.prefab");
  const [placementEntityName, setPlacementEntityName] = useState("AssetForgeCandidateA");
  const [placementComponent, setPlacementComponent] = useState("Mesh");
  const [placementPlanReport, setPlacementPlanReport] = useState<AssetForgeO3DEPlacementPlanRecord | null>(null);
  const [placementPlanError, setPlacementPlanError] = useState<string | null>(null);
  const [placementPlanBusy, setPlacementPlanBusy] = useState(false);
  const [placementProofApprovalGranted, setPlacementProofApprovalGranted] = useState(false);
  const [placementProofApprovalNote, setPlacementProofApprovalNote] = useState("");
  const [placementProofReport, setPlacementProofReport] = useState<AssetForgeO3DEPlacementProofRecord | null>(null);
  const [placementProofError, setPlacementProofError] = useState<string | null>(null);
  const [placementProofBusy, setPlacementProofBusy] = useState(false);
  const [placementEvidenceReport, setPlacementEvidenceReport] = useState<AssetForgeO3DEPlacementEvidenceRecord | null>(null);
  const [placementEvidenceError, setPlacementEvidenceError] = useState<string | null>(null);
  const [placementEvidenceBusy, setPlacementEvidenceBusy] = useState(false);
  const [placementHarnessReport, setPlacementHarnessReport] = useState<AssetForgeO3DEPlacementHarnessRecord | null>(null);
  const [placementHarnessError, setPlacementHarnessError] = useState<string | null>(null);
  const [placementHarnessBusy, setPlacementHarnessBusy] = useState(false);
  const [placementHarnessExecuteApprovalGranted, setPlacementHarnessExecuteApprovalGranted] = useState(false);
  const [placementHarnessExecuteApprovalNote, setPlacementHarnessExecuteApprovalNote] = useState("");
  const [placementHarnessExecuteReport, setPlacementHarnessExecuteReport] = useState<AssetForgeO3DEPlacementHarnessExecuteRecord | null>(null);
  const [placementHarnessExecuteError, setPlacementHarnessExecuteError] = useState<string | null>(null);
  const [placementHarnessExecuteBusy, setPlacementHarnessExecuteBusy] = useState(false);
  const [placementLiveProofReport, setPlacementLiveProofReport] = useState<AssetForgeO3DEPlacementLiveProofRecord | null>(null);
  const [placementLiveProofError, setPlacementLiveProofError] = useState<string | null>(null);
  const [placementLiveProofBusy, setPlacementLiveProofBusy] = useState(false);
  const [evidenceIndexReport, setEvidenceIndexReport] = useState<AssetForgePlacementEvidenceIndexRecord | null>(null);
  const [evidenceIndexError, setEvidenceIndexError] = useState<string | null>(null);
  const [evidenceIndexBusy, setEvidenceIndexBusy] = useState(false);
  const evidenceFilterSession = loadEvidenceFilterSessionState();
  const [showEvidenceFiltersRestoredHint, setShowEvidenceFiltersRestoredHint] = useState(
    evidenceFilterSession !== null,
  );
  const [evidenceIndexLimit, setEvidenceIndexLimit] = useState(evidenceFilterSession?.limit ?? 10);
  const [evidenceIndexStatusFilter, setEvidenceIndexStatusFilter] = useState(evidenceFilterSession?.status ?? "");
  const [evidenceIndexCandidateFilter, setEvidenceIndexCandidateFilter] = useState(evidenceFilterSession?.candidate ?? "");
  const [evidenceIndexCandidateFilterDebounced, setEvidenceIndexCandidateFilterDebounced] = useState(
    evidenceFilterSession?.candidate ?? "",
  );
  const [evidenceIndexFromAgeSeconds, setEvidenceIndexFromAgeSeconds] = useState(evidenceFilterSession?.from_age_s ?? "");
  const [evidenceIndexLastRefreshedAt, setEvidenceIndexLastRefreshedAt] = useState<string | null>(null);
  const [evidenceIndexRefreshSource, setEvidenceIndexRefreshSource] = useState<"manual" | "preset" | "auto-after-live-proof" | null>(null);
  const [evidenceQueryCopyStatus, setEvidenceQueryCopyStatus] = useState<string | null>(null);
  const [evidenceQueryPasteInput, setEvidenceQueryPasteInput] = useState("");
  const [evidencePasteApplyBusy, setEvidencePasteApplyBusy] = useState(false);
  const [fetchedProviderStatus, setFetchedProviderStatus] = useState<AssetForgeProviderStatusRecord | null>(null);
  const [fetchedBlenderStatus, setFetchedBlenderStatus] = useState<AssetForgeBlenderStatusRecord | null>(null);
  const [fetchedStudioStatus, setFetchedStudioStatus] = useState<AssetForgeStudioStatusRecord | null>(null);
  const effectiveProviderStatus = providerStatus ?? fetchedProviderStatus;
  const effectiveBlenderStatus = blenderStatus ?? fetchedBlenderStatus;
  const selectedCandidate = useMemo(
    () => effectiveCandidates.find((candidate) => candidate.id === selectedCandidateId)
      ?? effectiveCandidates[0],
    [effectiveCandidates, selectedCandidateId],
  );
  const laneStatuses = useMemo(() => {
    if (fetchedStudioStatus?.lanes.length) {
      return fetchedStudioStatus.lanes.map((lane) => ({
        lane: lane.lane,
        truth: lane.truth,
        detail: lane.detail,
      }));
    }
    return buildLaneStatuses({
      fallbackLanes: assetForgeStudioDemoState.lanes,
      policies,
      policiesLoading,
      policiesError,
      readiness,
      readinessLoading,
      readinessError,
      adapters,
      adaptersLoading,
      adaptersError,
      providerStatus: effectiveProviderStatus,
      blenderStatus: effectiveBlenderStatus,
    });
  }, [
      fetchedStudioStatus,
      policies,
      policiesLoading,
      policiesError,
      readiness,
      readinessLoading,
      readinessError,
      adapters,
      adaptersLoading,
      adaptersError,
      effectiveProviderStatus,
      effectiveBlenderStatus,
    ],
  );
  const hasBackendStatusSignals = Boolean(
    effectiveProviderStatus
    || effectiveBlenderStatus
    || fetchedStudioStatus
    || policies.length > 0
    || readiness
    || adapters,
  );
  const statusSourceLabel = hasBackendStatusSignals ? "backend status signals" : "demo fallback only";
  const providerSettingsTruth = effectiveProviderStatus
    ? providerModeToTruth(effectiveProviderStatus.provider_mode)
    : "plan-only";
  const blenderPanelTruth = effectiveBlenderStatus
    ? blenderPreflightToTruth(effectiveBlenderStatus.executable_found)
    : assetForgeStudioDemoState.blenderPrep.blenderStatus;
  const blenderExecutableLabel = effectiveBlenderStatus
    ? (effectiveBlenderStatus.executable_found
      ? `${effectiveBlenderStatus.executable_path ?? "detected path unavailable"} (${effectiveBlenderStatus.detection_source})`
      : `Not detected (${effectiveBlenderStatus.detection_source})`)
    : assetForgeStudioDemoState.blenderPrep.executable;
  const blenderVersionLabel = effectiveBlenderStatus
    ? (effectiveBlenderStatus.version ?? `Unknown (${effectiveBlenderStatus.version_probe_status})`)
    : assetForgeStudioDemoState.blenderPrep.version;
  const blenderVersionProbeLabel = effectiveBlenderStatus
    ? blenderVersionProbeSummary(effectiveBlenderStatus.version_probe_status)
    : "demo";
  const blenderWarnings = effectiveBlenderStatus?.warnings ?? [];
  const blenderInspectTruth = blenderInspectReport
    ? blenderInspectStatusToTruth(blenderInspectReport.inspection_status)
    : "plan-only";
  const stagePlanTruth = stagePlanReport
    ? stagePlanStatusToTruth(stagePlanReport.plan_status)
    : "plan-only";
  const stageWriteTruth = stageWriteReport
    ? stageWriteStatusToTruth(stageWriteReport.write_status)
    : "blocked";
  const readbackTruth = readbackReport
    ? readbackStatusToTruth(readbackReport.readback_status)
    : "plan-only";
  const placementPlanTruth = placementPlanReport
    ? stagePlanStatusToTruth(placementPlanReport.plan_status)
    : "plan-only";
  const placementEvidenceTruth = placementEvidenceReport
    ? (placementEvidenceReport.evidence_status === "succeeded" ? "preflight-only" : "blocked")
    : "plan-only";
  const placementHarnessTruth = placementHarnessReport
    ? (placementHarnessReport.harness_status === "ready-for-admitted-runtime-harness" ? "plan-only" : "blocked")
    : "plan-only";
  const placementHarnessExecuteTruth = placementHarnessExecuteReport
    ? (placementHarnessExecuteReport.execute_status === "submitted-proof-only" ? "preflight-only" : "blocked")
    : "plan-only";
  const placementLiveProofTruth = placementLiveProofReport
    ? (placementLiveProofReport.proof_status === "succeeded" ? "preflight-only" : "blocked")
    : "plan-only";
  const evidenceCandidateDebouncePending = evidenceIndexCandidateFilter !== evidenceIndexCandidateFilterDebounced;
  const evidenceRefreshDisabledTitle = evidenceCandidateDebouncePending
    ? "Wait for candidate filter debounce before refreshing."
    : (evidenceIndexBusy ? "Refresh in progress." : undefined);
  const evidencePresetDisabledTitle = evidenceCandidateDebouncePending
    ? "Wait for candidate filter debounce before applying age preset."
    : (evidenceIndexBusy ? "Refresh in progress." : undefined);
  const evidencePasteQueryEmpty = evidenceQueryPasteInput.trim().length === 0;
  const evidenceFiltersAtDefault = (
    evidenceIndexLimit === 10
    && evidenceIndexStatusFilter === ""
    && evidenceIndexCandidateFilter === ""
    && evidenceIndexFromAgeSeconds === ""
  );
  const selectedCandidateScores = selectedCandidate ? candidateDemoScores(selectedCandidate.id) : null;
  const selectedOutlinerHint = selectedCandidate ? candidateIdToOutlinerHint(selectedCandidate.id) : "Asset Root";
  const editorSnapshotText = `tool=${activeToolLabel}; viewport_mode=${activeViewportMode}; view_control=${activeViewportControl}; outliner_filter=${outlinerFilter || "none"}; outliner_auto_sync=${autoSyncOutlinerToSelection ? "on" : "off"}`;
  const copyEditorSnapshot = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setEditorSnapshotCopyStatus("Clipboard unavailable in this environment.");
      return;
    }
    try {
      await navigator.clipboard.writeText(editorSnapshotText);
      setEditorSnapshotCopyStatus("Editor snapshot copied.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to copy editor snapshot.";
      setEditorSnapshotCopyStatus(message);
    }
  };
  const resetEditorWorkspace = () => {
    setActiveToolLabel("Select");
    setActiveViewportMode("Solid");
    setActiveViewportControl("Orbit");
    setOutlinerFilter("");
    setAutoSyncOutlinerToSelection(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(EDITOR_SESSION_KEY);
      window.sessionStorage.removeItem(OUTLINER_SESSION_KEY);
    }
  };
  useEffect(() => {
    if (!autoSyncOutlinerToSelection) {
      return;
    }
    setOutlinerFilter(selectedOutlinerHint);
  }, [autoSyncOutlinerToSelection, selectedOutlinerHint]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const state: OutlinerSessionState = {
      filter: outlinerFilter,
      auto_sync: autoSyncOutlinerToSelection,
    };
    window.sessionStorage.setItem(OUTLINER_SESSION_KEY, JSON.stringify(state));
  }, [autoSyncOutlinerToSelection, outlinerFilter]);
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const state: EditorSessionState = {
      tool: activeToolLabel,
      viewport_mode: activeViewportMode,
      viewport_control: activeViewportControl,
    };
    window.sessionStorage.setItem(EDITOR_SESSION_KEY, JSON.stringify(state));
  }, [activeToolLabel, activeViewportControl, activeViewportMode]);
  useEffect(() => {
    if (!editorSnapshotCopyStatus) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setEditorSnapshotCopyStatus(null);
    }, 3200);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [editorSnapshotCopyStatus]);
  const filteredOutlinerItems = useMemo(() => {
    const normalizedFilter = outlinerFilter.trim().toLowerCase();
    if (!normalizedFilter) {
      return OUTLINER_ITEMS;
    }
    return OUTLINER_ITEMS.filter((item) => item.toLowerCase().includes(normalizedFilter));
  }, [outlinerFilter]);
  const evidenceFilterMismatch = (() => {
    if (!evidenceIndexReport) {
      return false;
    }
    const server = evidenceIndexReport.applied_filters;
    const uiLimit = evidenceIndexLimit;
    const uiStatus = evidenceIndexStatusFilter || null;
    const uiCandidate = evidenceIndexCandidateFilter || null;
    const uiFromAge = evidenceIndexFromAgeSeconds ? Number(evidenceIndexFromAgeSeconds) : null;
    const serverLimit = typeof server.limit === "number" ? server.limit : null;
    const serverStatus = typeof server.proof_status === "string" ? server.proof_status : null;
    const serverCandidate = typeof server.candidate_id === "string" ? server.candidate_id : null;
    const serverFromAge = typeof server.from_age_s === "number" ? server.from_age_s : null;
    return (
      uiLimit !== serverLimit
      || uiStatus !== serverStatus
      || uiCandidate !== serverCandidate
      || uiFromAge !== serverFromAge
    );
  })();
  const evidenceComputedFreshCount = evidenceIndexReport
    ? evidenceIndexReport.items.reduce((count, item) => {
      const ageSeconds = typeof item.age_seconds === "number" ? item.age_seconds : Number.POSITIVE_INFINITY;
      return ageSeconds <= evidenceIndexReport.freshness_window_seconds ? count + 1 : count;
    }, 0)
    : 0;
  const evidenceComputedDisplayedCount = evidenceIndexReport
    ? Math.min(evidenceIndexReport.items.length, EVIDENCE_VISIBLE_ITEM_LIMIT)
    : 0;
  const evidenceFreshCountMismatch = evidenceIndexReport
    ? evidenceComputedFreshCount !== evidenceIndexReport.fresh_item_count
    : false;
  const evidenceVisibleAges = evidenceIndexReport
    ? evidenceIndexReport.items
      .slice(0, EVIDENCE_VISIBLE_ITEM_LIMIT)
      .map((item) => item.age_seconds)
      .filter((age): age is number => typeof age === "number")
    : [];
  const evidenceUnknownAgeCount = evidenceIndexReport
    ? evidenceIndexReport.items
      .slice(0, EVIDENCE_VISIBLE_ITEM_LIMIT)
      .filter((item) => typeof item.age_seconds !== "number")
      .length
    : 0;
  const evidenceComputedStaleCount = Math.max(
    0,
    evidenceComputedDisplayedCount - evidenceComputedFreshCount - evidenceUnknownAgeCount,
  );
  const evidenceAccountingBalanced = (
    evidenceComputedFreshCount + evidenceComputedStaleCount + evidenceUnknownAgeCount
  ) === evidenceComputedDisplayedCount;
  const evidenceComputedFreshPercent = evidenceComputedDisplayedCount > 0
    ? Math.round((evidenceComputedFreshCount / evidenceComputedDisplayedCount) * 100)
    : 0;
  const evidenceComputedStalePercent = evidenceComputedDisplayedCount > 0
    ? Math.round((evidenceComputedStaleCount / evidenceComputedDisplayedCount) * 100)
    : 0;
  const evidenceNewestAgeSeconds = evidenceVisibleAges.length ? Math.min(...evidenceVisibleAges) : null;
  const evidenceOldestAgeSeconds = evidenceVisibleAges.length ? Math.max(...evidenceVisibleAges) : null;

  useEffect(() => {
    if (providerStatus || blenderStatus || taskModel) {
      return;
    }
    let cancelled = false;
    void Promise.allSettled([
      fetchAssetForgeStudioStatus(),
      fetchAssetForgeTask(),
      fetchAssetForgeProviderStatus(),
      fetchAssetForgeBlenderStatus(),
    ]).then((results) => {
      if (cancelled) {
        return;
      }
      const [studioResult, taskResult, providerResult, blenderResult] = results;
      if (studioResult.status === "fulfilled") {
        setFetchedStudioStatus(studioResult.value);
      }
      if (taskResult.status === "fulfilled") {
        setFetchedTaskModel(taskResult.value);
      }
      if (providerResult.status === "fulfilled") {
        setFetchedProviderStatus(providerResult.value);
      }
      if (blenderResult.status === "fulfilled") {
        setFetchedBlenderStatus(blenderResult.value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [providerStatus, blenderStatus, taskModel]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const payload: EvidenceFilterSessionState = {
      limit: evidenceIndexLimit,
      status: evidenceIndexStatusFilter,
      candidate: evidenceIndexCandidateFilter,
      from_age_s: evidenceIndexFromAgeSeconds,
    };
    window.sessionStorage.setItem(EVIDENCE_FILTERS_SESSION_KEY, JSON.stringify(payload));
  }, [
    evidenceIndexLimit,
    evidenceIndexStatusFilter,
    evidenceIndexCandidateFilter,
    evidenceIndexFromAgeSeconds,
  ]);

  useEffect(() => {
    if (!evidenceQueryCopyStatus) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setEvidenceQueryCopyStatus(null);
    }, 3500);
    return () => window.clearTimeout(timeoutId);
  }, [evidenceQueryCopyStatus]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setEvidenceIndexCandidateFilterDebounced(evidenceIndexCandidateFilter);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [evidenceIndexCandidateFilter]);

  async function runBlenderReadOnlyInspect() {
    if (packet01DemoLock) {
      setBlenderInspectReport(null);
      setBlenderInspectError("Packet 01 demo shell: Blender execution is blocked. This panel is plan-only/preflight-only.");
      return;
    }
    const nextPath = blenderInspectPath.trim();
    if (!nextPath) {
      setBlenderInspectError("Enter a candidate artifact path under backend/runtime/asset_forge before running inspection.");
      setBlenderInspectReport(null);
      return;
    }

    setBlenderInspectBusy(true);
    setBlenderInspectError(null);
    try {
      const report = await inspectAssetForgeBlenderArtifact({ artifact_path: nextPath });
      setBlenderInspectReport(report);
      if (report.inspection_status === "failed") {
        setBlenderInspectError("Inspection script failed. Review warnings and retry with a valid read-only candidate file.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown inspection failure.";
      setBlenderInspectReport(null);
      setBlenderInspectError(message);
    } finally {
      setBlenderInspectBusy(false);
    }
  }

  async function createStagePlan() {
    if (packet01DemoLock) {
      setStagePlanReport(null);
      setStagePlanError("Packet 01 demo shell: O3DE stage planning execution is blocked.");
      return;
    }
    if (!selectedCandidate) {
      setStagePlanError("Select a candidate before creating an O3DE stage plan.");
      setStagePlanReport(null);
      return;
    }

    setStagePlanBusy(true);
    setStagePlanError(null);
    try {
      const report = await createAssetForgeO3DEStagePlan({
        candidate_id: selectedCandidate.id,
        candidate_label: selectedCandidate.name,
        desired_extension: "glb",
      });
      setStagePlanReport(report);
      setStageWriteReport(null);
      setStageWriteError(null);
      setReadbackSourceRelativePath(report.deterministic_staging_relative_path);
      setReadbackReport(null);
      setReadbackError(null);
      if (report.plan_status === "blocked") {
        setStagePlanError("Stage plan request is blocked. Review warnings before proceeding.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown stage plan failure.";
      setStagePlanReport(null);
      setStagePlanError(message);
    } finally {
      setStagePlanBusy(false);
    }
  }

  async function executeStageWrite() {
    if (packet01DemoLock) {
      setStageWriteReport(null);
      setStageWriteError("Packet 01 demo shell: O3DE stage write/mutation is blocked.");
      return;
    }
    if (!selectedCandidate) {
      setStageWriteError("Select a candidate before executing staged source write.");
      setStageWriteReport(null);
      return;
    }
    if (!stagePlanReport) {
      setStageWriteError("Create an O3DE stage plan before running the write step.");
      setStageWriteReport(null);
      return;
    }
    if (!stageSourceArtifactPath.trim()) {
      setStageWriteError("Enter a source artifact path under backend/runtime/asset_forge.");
      setStageWriteReport(null);
      return;
    }

    setStageWriteBusy(true);
    setStageWriteError(null);
    try {
      const report = await executeAssetForgeO3DEStageWrite({
        candidate_id: selectedCandidate.id,
        candidate_label: selectedCandidate.name,
        source_artifact_path: stageSourceArtifactPath.trim(),
        stage_relative_path: stagePlanReport.deterministic_staging_relative_path,
        manifest_relative_path: stagePlanReport.deterministic_manifest_relative_path,
        approval_state: stageApprovalGranted ? "approved" : "not-approved",
        approval_note: stageApprovalNote.trim(),
      });
      setStageWriteReport(report);
      setReadbackReport(null);
      setReadbackError(null);
      if (report.write_status !== "succeeded") {
        setStageWriteError(
          report.write_status === "approval-required"
            ? "Approval is required. Check approval acknowledgement and provide an approval note."
            : "Stage write did not succeed. Review status and warnings in the response.",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown stage-write failure.";
      setStageWriteReport(null);
      setStageWriteError(message);
    } finally {
      setStageWriteBusy(false);
    }
  }

  async function runO3deIngestReadback() {
    if (packet01DemoLock) {
      setReadbackReport(null);
      setReadbackError("Packet 01 demo shell: O3DE ingest/review runtime calls are blocked.");
      return;
    }
    if (!selectedCandidate) {
      setReadbackError("Select a candidate before requesting Packet 09 readback evidence.");
      setReadbackReport(null);
      return;
    }
    if (!readbackSourceRelativePath.trim()) {
      setReadbackError("Enter a staged source relative path under Assets/Generated/asset_forge.");
      setReadbackReport(null);
      return;
    }
    if (!readbackPlatform.trim()) {
      setReadbackError("Enter a target platform (for example: pc).");
      setReadbackReport(null);
      return;
    }

    setReadbackBusy(true);
    setReadbackError(null);
    try {
      const report = await readAssetForgeO3DEIngestEvidence({
        candidate_id: selectedCandidate.id,
        candidate_label: selectedCandidate.name,
        source_asset_relative_path: readbackSourceRelativePath.trim(),
        selected_platform: readbackPlatform.trim(),
      });
      setReadbackReport(report);
      if (report.readback_status !== "succeeded") {
        setReadbackError(
          "Readback evidence is incomplete or blocked. Review freshness/warnings and rerun after operator-managed Asset Processor refresh.",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown ingest readback failure.";
      setReadbackReport(null);
      setReadbackError(message);
    } finally {
      setReadbackBusy(false);
    }
  }

  async function createPlacementPlan() {
    if (packet01DemoLock) {
      setPlacementPlanReport(null);
      setPlacementPlanError("Packet 01 demo shell: placement planning execution is blocked.");
      return;
    }
    if (!selectedCandidate) {
      setPlacementPlanError("Select a candidate before creating a placement plan.");
      setPlacementPlanReport(null);
      return;
    }
    if (!readbackSourceRelativePath.trim()) {
      setPlacementPlanError("Enter a staged source path before creating a placement plan.");
      setPlacementPlanReport(null);
      return;
    }

    setPlacementPlanBusy(true);
    setPlacementPlanError(null);
    try {
      const report = await createAssetForgeO3DEPlacementPlan({
        candidate_id: selectedCandidate.id,
        candidate_label: selectedCandidate.name,
        staged_source_relative_path: readbackSourceRelativePath.trim(),
        target_level_relative_path: placementLevelPath.trim(),
        target_entity_name: placementEntityName.trim(),
        target_component: placementComponent.trim(),
      });
      setPlacementPlanReport(report);
      setPlacementProofReport(null);
      setPlacementProofError(null);
      if (report.plan_status !== "ready-for-approval") {
        setPlacementPlanError("Placement plan is blocked. Review path/level constraints and retry.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown placement plan failure.";
      setPlacementPlanReport(null);
      setPlacementPlanError(message);
    } finally {
      setPlacementPlanBusy(false);
    }
  }

  async function executePlacementProofGate() {
    if (packet01DemoLock) {
      setPlacementProofReport(null);
      setPlacementProofError("Packet 01 demo shell: placement proof execution is blocked.");
      return;
    }
    if (!selectedCandidate) {
      setPlacementProofError("Select a candidate before running placement proof gate.");
      setPlacementProofReport(null);
      return;
    }
    if (!placementPlanReport) {
      setPlacementProofError("Create a placement plan before running the placement proof gate.");
      setPlacementProofReport(null);
      return;
    }

    setPlacementProofBusy(true);
    setPlacementProofError(null);
    try {
      const report = await executeAssetForgeO3DEPlacementProof({
        candidate_id: selectedCandidate.id,
        candidate_label: selectedCandidate.name,
        staged_source_relative_path: placementPlanReport.staged_source_relative_path,
        target_level_relative_path: placementPlanReport.target_level_relative_path,
        target_entity_name: placementPlanReport.target_entity_name,
        target_component: placementPlanReport.target_component,
        approval_state: placementProofApprovalGranted ? "approved" : "not-approved",
        approval_note: placementProofApprovalNote.trim(),
      });
      setPlacementProofReport(report);
      if (report.proof_status !== "ready-for-runtime-proof") {
        setPlacementProofError(
          report.proof_status === "approval-required"
            ? "Placement proof requires explicit approval and note."
            : "Placement proof remains blocked. Review gate warnings.",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown placement proof gate failure.";
      setPlacementProofReport(null);
      setPlacementProofError(message);
    } finally {
      setPlacementProofBusy(false);
    }
  }

  async function collectPlacementEvidencePreflight() {
    if (packet01DemoLock) {
      setPlacementEvidenceReport(null);
      setPlacementEvidenceError("Packet 01 demo shell: placement evidence readback execution is blocked.");
      return;
    }
    if (!selectedCandidate) {
      setPlacementEvidenceError("Select a candidate before collecting placement evidence.");
      setPlacementEvidenceReport(null);
      return;
    }
    if (!placementPlanReport) {
      setPlacementEvidenceError("Create a placement plan before collecting placement evidence.");
      setPlacementEvidenceReport(null);
      return;
    }

    setPlacementEvidenceBusy(true);
    setPlacementEvidenceError(null);
    try {
      const report = await readAssetForgeO3DEPlacementEvidence({
        candidate_id: selectedCandidate.id,
        candidate_label: selectedCandidate.name,
        staged_source_relative_path: placementPlanReport.staged_source_relative_path,
        target_level_relative_path: placementPlanReport.target_level_relative_path,
        selected_platform: "pc",
      });
      setPlacementEvidenceReport(report);
      if (report.evidence_status !== "succeeded") {
        setPlacementEvidenceError("Placement evidence preflight is blocked. Review missing source/level prerequisites.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown placement evidence preflight failure.";
      setPlacementEvidenceReport(null);
      setPlacementEvidenceError(message);
    } finally {
      setPlacementEvidenceBusy(false);
    }
  }

  async function preparePlacementRuntimeHarness() {
    if (packet01DemoLock) {
      setPlacementHarnessReport(null);
      setPlacementHarnessError("Packet 01 demo shell: runtime harness preparation is blocked.");
      return;
    }
    if (!selectedCandidate) {
      setPlacementHarnessError("Select a candidate before preparing runtime harness readiness.");
      setPlacementHarnessReport(null);
      return;
    }
    if (!placementPlanReport) {
      setPlacementHarnessError("Create a placement plan before preparing runtime harness readiness.");
      setPlacementHarnessReport(null);
      return;
    }

    setPlacementHarnessBusy(true);
    setPlacementHarnessError(null);
    try {
      const report = await prepareAssetForgeO3DEPlacementRuntimeHarness({
        candidate_id: selectedCandidate.id,
        candidate_label: selectedCandidate.name,
        staged_source_relative_path: placementPlanReport.staged_source_relative_path,
        target_level_relative_path: placementPlanReport.target_level_relative_path,
        target_entity_name: placementPlanReport.target_entity_name,
        target_component: placementPlanReport.target_component,
        selected_platform: "pc",
      });
      setPlacementHarnessReport(report);
      if (report.harness_status !== "ready-for-admitted-runtime-harness") {
        setPlacementHarnessError("Runtime harness readiness is still blocked. Review gate and bridge prerequisites.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime harness prepare failure.";
      setPlacementHarnessReport(null);
      setPlacementHarnessError(message);
    } finally {
      setPlacementHarnessBusy(false);
    }
  }

  async function executePlacementRuntimeHarnessGate() {
    if (packet01DemoLock) {
      setPlacementHarnessExecuteReport(null);
      setPlacementHarnessExecuteError("Packet 01 demo shell: runtime harness execution is blocked.");
      return;
    }
    if (!selectedCandidate) {
      setPlacementHarnessExecuteError("Select a candidate before executing runtime harness gate.");
      setPlacementHarnessExecuteReport(null);
      return;
    }
    if (!placementPlanReport) {
      setPlacementHarnessExecuteError("Create a placement plan before executing runtime harness gate.");
      setPlacementHarnessExecuteReport(null);
      return;
    }
    setPlacementHarnessExecuteBusy(true);
    setPlacementHarnessExecuteError(null);
    try {
      const report = await executeAssetForgeO3DEPlacementRuntimeHarness({
        candidate_id: selectedCandidate.id,
        candidate_label: selectedCandidate.name,
        staged_source_relative_path: placementPlanReport.staged_source_relative_path,
        target_level_relative_path: placementPlanReport.target_level_relative_path,
        target_entity_name: placementPlanReport.target_entity_name,
        target_component: placementPlanReport.target_component,
        selected_platform: "pc",
        approval_state: placementHarnessExecuteApprovalGranted ? "approved" : "not-approved",
        approval_note: placementHarnessExecuteApprovalNote.trim(),
      });
      setPlacementHarnessExecuteReport(report);
      if (report.execute_status !== "submitted-proof-only") {
        setPlacementHarnessExecuteError("Harness execute gate is not admitted yet. Review approval/prerequisite warnings.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime harness execute failure.";
      setPlacementHarnessExecuteReport(null);
      setPlacementHarnessExecuteError(message);
    } finally {
      setPlacementHarnessExecuteBusy(false);
    }
  }

  async function executePlacementLiveProofGate() {
    if (packet01DemoLock) {
      setPlacementLiveProofReport(null);
      setPlacementLiveProofError("Packet 01 demo shell: live proof execution is blocked.");
      return;
    }
    if (!selectedCandidate || !placementPlanReport) {
      setPlacementLiveProofError("Create placement plan and select candidate before live proof.");
      setPlacementLiveProofReport(null);
      return;
    }
    setPlacementLiveProofBusy(true);
    setPlacementLiveProofError(null);
    try {
      const report = await executeAssetForgeO3DEPlacementLiveProof({
        candidate_id: selectedCandidate.id,
        candidate_label: selectedCandidate.name,
        target_level_relative_path: placementPlanReport.target_level_relative_path,
        target_entity_name: placementPlanReport.target_entity_name,
        selected_platform: "pc",
        approval_state: placementHarnessExecuteApprovalGranted ? "approved" : "not-approved",
        approval_note: placementHarnessExecuteApprovalNote.trim(),
      });
      setPlacementLiveProofReport(report);
      if (report.proof_status === "succeeded") {
        const refreshedIndex = await getAssetForgeO3DEPlacementLiveProofEvidenceIndex(
          evidenceIndexLimit,
          evidenceIndexStatusFilter,
          evidenceIndexCandidateFilterDebounced,
          evidenceIndexFromAgeSeconds.trim() ? Number(evidenceIndexFromAgeSeconds) : undefined,
        );
        setEvidenceIndexReport(refreshedIndex);
        setEvidenceIndexLastRefreshedAt(new Date().toISOString());
        setEvidenceIndexRefreshSource("auto-after-live-proof");
      }
      if (report.proof_status !== "succeeded") {
        setPlacementLiveProofError("Live proof did not succeed; review bridge/session prerequisites.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown placement live proof failure.";
      setPlacementLiveProofReport(null);
      setPlacementLiveProofError(message);
    } finally {
      setPlacementLiveProofBusy(false);
    }
  }

  async function refreshLiveProofEvidenceIndex() {
    if (packet01DemoLock) {
      setEvidenceIndexReport(null);
      setEvidenceIndexError("Packet 01 demo shell: evidence index refresh is blocked (no runtime/O3DE calls in this packet).");
      return;
    }
    setEvidenceIndexBusy(true);
    setEvidenceIndexError(null);
    try {
      const report = await getAssetForgeO3DEPlacementLiveProofEvidenceIndex(
        evidenceIndexLimit,
        evidenceIndexStatusFilter,
        evidenceIndexCandidateFilterDebounced,
        evidenceIndexFromAgeSeconds.trim() ? Number(evidenceIndexFromAgeSeconds) : undefined,
      );
      setEvidenceIndexReport(report);
      setEvidenceIndexLastRefreshedAt(new Date().toISOString());
      setEvidenceIndexRefreshSource("manual");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown evidence index failure.";
      setEvidenceIndexReport(null);
      setEvidenceIndexError(message);
    } finally {
      setEvidenceIndexBusy(false);
    }
  }

  async function applyEvidenceAgePreset(seconds: number) {
    if (packet01DemoLock) {
      setEvidenceIndexFromAgeSeconds(String(seconds));
      setEvidenceIndexReport(null);
      setEvidenceIndexError("Packet 01 demo shell: evidence index refresh is blocked (preset captured as plan-only).");
      return;
    }
    setEvidenceIndexFromAgeSeconds(String(seconds));
    setEvidenceIndexBusy(true);
    setEvidenceIndexError(null);
    try {
      const report = await getAssetForgeO3DEPlacementLiveProofEvidenceIndex(
        evidenceIndexLimit,
        evidenceIndexStatusFilter,
        evidenceIndexCandidateFilterDebounced,
        seconds,
      );
      setEvidenceIndexReport(report);
      setEvidenceIndexLastRefreshedAt(new Date().toISOString());
      setEvidenceIndexRefreshSource("preset");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown evidence index failure.";
      setEvidenceIndexReport(null);
      setEvidenceIndexError(message);
    } finally {
      setEvidenceIndexBusy(false);
    }
  }

  async function clearEvidenceFiltersAndRefresh() {
    if (packet01DemoLock) {
      const defaultLimit = 10;
      setEvidenceIndexLimit(defaultLimit);
      setEvidenceIndexStatusFilter("");
      setEvidenceIndexCandidateFilter("");
      setEvidenceIndexFromAgeSeconds("");
      setEvidenceIndexReport(null);
      setEvidenceIndexError("Packet 01 demo shell: clear/reset applied locally; runtime evidence refresh is blocked.");
      return;
    }
    const defaultLimit = 10;
    setEvidenceIndexLimit(defaultLimit);
    setEvidenceIndexStatusFilter("");
    setEvidenceIndexCandidateFilter("");
    setEvidenceIndexFromAgeSeconds("");
    setEvidenceIndexBusy(true);
    setEvidenceIndexError(null);
    try {
      const report = await getAssetForgeO3DEPlacementLiveProofEvidenceIndex(defaultLimit, "", "", undefined);
      setEvidenceIndexReport(report);
      setEvidenceIndexLastRefreshedAt(new Date().toISOString());
      setEvidenceIndexRefreshSource("manual");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown evidence index failure.";
      setEvidenceIndexReport(null);
      setEvidenceIndexError(message);
    } finally {
      setEvidenceIndexBusy(false);
    }
  }

  async function copyEvidenceFilterQuery() {
    const query = new URLSearchParams({ limit: String(evidenceIndexLimit) });
    if (evidenceIndexStatusFilter.trim()) {
      query.set("proof_status", evidenceIndexStatusFilter.trim());
    }
    if (evidenceIndexCandidateFilter.trim()) {
      query.set("candidate_id", evidenceIndexCandidateFilter.trim());
    }
    if (evidenceIndexFromAgeSeconds.trim()) {
      query.set("from_age_s", evidenceIndexFromAgeSeconds.trim());
    }
    const value = `?${query.toString()}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setEvidenceQueryCopyStatus("Copied query to clipboard.");
      } else {
        setEvidenceQueryCopyStatus(`Clipboard unavailable. Query: ${value}`);
      }
    } catch {
      setEvidenceQueryCopyStatus(`Clipboard copy failed. Query: ${value}`);
    }
  }

  async function copyAppliedFiltersFromServer() {
    if (!evidenceIndexReport) {
      setEvidenceQueryCopyStatus("No server-applied filters available yet. Refresh evidence index first.");
      return;
    }
    const value = JSON.stringify(evidenceIndexReport.applied_filters);
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setEvidenceQueryCopyStatus("Copied server-applied filters to clipboard.");
      } else {
        setEvidenceQueryCopyStatus(`Clipboard unavailable. Server filters: ${value}`);
      }
    } catch {
      setEvidenceQueryCopyStatus(`Clipboard copy failed. Server filters: ${value}`);
    }
  }

  function applyServerFiltersToUi() {
    if (!evidenceIndexReport) {
      setEvidenceQueryCopyStatus("No server-applied filters available yet. Refresh evidence index first.");
      return;
    }
    const filters = evidenceIndexReport.applied_filters;
    const nextLimitRaw = filters.limit;
    const nextLimit = typeof nextLimitRaw === "number"
      ? Math.max(1, Math.min(25, Math.trunc(nextLimitRaw)))
      : 10;
    const nextStatus = typeof filters.proof_status === "string" ? filters.proof_status : "";
    const nextCandidate = typeof filters.candidate_id === "string" ? filters.candidate_id : "";
    const nextFromAge = typeof filters.from_age_s === "number"
      ? String(Math.max(0, Math.min(86400, Math.trunc(filters.from_age_s))))
      : "";

    setEvidenceIndexLimit(nextLimit);
    setEvidenceIndexStatusFilter(nextStatus);
    setEvidenceIndexCandidateFilter(nextCandidate);
    setEvidenceIndexFromAgeSeconds(nextFromAge);
    setEvidenceQueryCopyStatus("Applied server filters to UI controls.");
  }

  async function applyPastedEvidenceFilterQuery() {
    const raw = evidenceQueryPasteInput.trim();
    if (!raw) {
      setEvidenceQueryCopyStatus("Paste a query string first.");
      return;
    }
    const queryText = raw.startsWith("?") ? raw.slice(1) : raw;
    const params = new URLSearchParams(queryText);
    const parsedLimit = Number(params.get("limit") || 10);
    const nextLimit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(25, Math.trunc(parsedLimit)))
      : 10;
    const nextStatus = (params.get("proof_status") || "").trim();
    const nextCandidate = (params.get("candidate_id") || "").trim();
    const nextFromAge = (params.get("from_age_s") || "").trim();
    const parsedFromAge = Number(nextFromAge);
    const normalizedFromAge = nextFromAge && Number.isFinite(parsedFromAge)
      ? String(Math.max(0, Math.min(86400, Math.trunc(parsedFromAge))))
      : "";

    setEvidenceIndexLimit(nextLimit);
    setEvidenceIndexStatusFilter(nextStatus);
    setEvidenceIndexCandidateFilter(nextCandidate);
    setEvidenceIndexFromAgeSeconds(normalizedFromAge);
    if (packet01DemoLock) {
      setEvidenceIndexReport(null);
      setEvidenceQueryCopyStatus("Applied pasted query locally (demo-only). Runtime evidence refresh is blocked in Packet 01.");
      setEvidenceIndexError("Packet 01 demo shell: evidence refresh is blocked.");
      return;
    }
    setEvidencePasteApplyBusy(true);
    setEvidenceIndexBusy(true);
    setEvidenceIndexError(null);
    try {
      const report = await getAssetForgeO3DEPlacementLiveProofEvidenceIndex(
        nextLimit,
        nextStatus,
        nextCandidate,
        normalizedFromAge ? Number(normalizedFromAge) : undefined,
      );
      setEvidenceIndexReport(report);
      setEvidenceIndexLastRefreshedAt(new Date().toISOString());
      setEvidenceIndexRefreshSource("manual");
      setEvidenceQueryCopyStatus("Applied pasted query.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown evidence index failure.";
      setEvidenceIndexReport(null);
      setEvidenceIndexError(message);
      setEvidenceQueryCopyStatus(`Failed to apply query: ${message}`);
    } finally {
      setEvidenceIndexBusy(false);
      setEvidencePasteApplyBusy(false);
    }
  }

  return (
    <section aria-label="Asset Forge Packet 01 studio shell" style={s.shell}>
      <header aria-label="Asset Forge studio header" style={s.header}>
        <div>
          <h2 style={s.title}>{assetForgeStudioDemoState.title}</h2>
          <p style={s.subtitle}>{assetForgeStudioDemoState.subtitle}</p>
        </div>
        <div style={s.laneGrid}>
          {laneStatuses.map((lane) => (
            <article key={lane.lane} style={s.laneCard}>
              <div style={s.laneHeading}>
                <strong>{lane.lane}</strong>
                <TruthBadge truth={lane.truth} />
              </div>
              <p style={s.laneDetail}>{lane.detail}</p>
            </article>
          ))}
        </div>
        <p style={s.bannerNote}>
          Packet 01 demo lock is active in app/runtime: provider, Blender, and O3DE execution calls are blocked. Planned, demo, blocked, and preflight-only surfaces are labeled.
        </p>
        <p style={s.bannerSubnote}>Status source: {statusSourceLabel}.</p>
      </header>

      <section aria-label="Asset Forge generation workspace" style={s.panel}>
        <div style={s.panelHeader}>
          <h3 style={s.panelTitle}>Generation workspace</h3>
          <TruthBadge truth="demo" />
        </div>
        <p style={s.panelDetail}>Prompt planning and candidate creation flow with explicit non-real action labels and no real provider execution.</p>
        <div style={s.generationGrid}>
          <label style={s.labelBlock}>
            Prompt
            <textarea
              readOnly
              aria-label="Asset Forge prompt draft"
              value={effectiveTaskModel?.prompt_text ?? assetForgeStudioDemoState.generationWorkspace.prompt}
              style={s.textarea}
            />
          </label>
          <div>
            <h4 style={s.subheading}>References</h4>
            <ul style={s.list}>
              {assetForgeStudioDemoState.generationWorkspace.references.map((reference) => (
                <li key={reference}>{reference}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={s.subheading}>Plan settings</h4>
            <ul style={s.list}>
              <li>Style preset: {assetForgeStudioDemoState.generationWorkspace.stylePreset}</li>
              <li>Poly budget: {assetForgeStudioDemoState.generationWorkspace.polyBudget}</li>
              <li>Material plan: {assetForgeStudioDemoState.generationWorkspace.materialPlan}</li>
              <li>Project profile: {projectProfile?.name ?? "Unknown (demo-only)"}</li>
              <li>Task source: {effectiveTaskModel?.source ?? "typed fixture fallback"}</li>
            </ul>
          </div>
        </div>
        <div style={s.actionWrap}>
          {assetForgeStudioDemoState.generationWorkspace.actions.map((action) => (
            <button key={action.id} type="button" disabled title={action.blockedReason} style={s.disabledButton}>
              {action.label} ({action.truth})
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Asset Forge Blender-style editor workspace" style={s.editorShell}>
        <div style={s.panelHeader}>
          <h3 style={s.panelTitle}>Blender-style Asset Forge Editor Workspace</h3>
          <TruthBadge truth="demo" />
        </div>
        <div style={s.editorModeBanner}>
          <strong>Editor workspace mode</strong>
          <span>Demo / plan-only surface - no admitted-real 3D editing, Blender execution, or O3DE mutation.</span>
        </div>
        <p style={s.panelDetail}>
          Demo/plan-only creative workspace inspired by Blender and Meshy. No real provider, Blender, or O3DE mutation execution is admitted.
        </p>
        <div style={s.editorMainGrid}>
          <aside style={s.editorLeftCol}>
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <h4 style={s.subheading}>Tool rail</h4>
                <TruthBadge truth="demo" />
              </div>
              <div style={s.toolRailGrid}>
                {TOOL_RAIL_ITEMS.map((tool) => (
                  <button
                    key={tool.label}
                    type="button"
                    style={activeToolLabel === tool.label ? s.toolRailItemActive : s.toolRailItem}
                    aria-pressed={activeToolLabel === tool.label}
                    onClick={() => setActiveToolLabel(tool.label)}
                    disabled={tool.truth === "blocked"}
                    title={tool.truth === "blocked" ? "Blocked in current packet." : undefined}
                    aria-keyshortcuts={TOOL_SHORTCUTS[tool.label]}
                  >
                    <span>{tool.label} ({TOOL_SHORTCUTS[tool.label]})</span>
                    <TruthBadge truth={tool.truth} />
                  </button>
                ))}
              </div>
              <p style={s.panelDetail}>Active tool: {activeToolLabel} (demo only)</p>
              <p style={s.panelDetail}>Shortcut hint (demo): `1-9` tool slots only, no real editing execution.</p>
            </section>
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <h4 style={s.subheading}>Object outliner</h4>
                <TruthBadge truth="demo" />
              </div>
              <label style={s.labelBlock}>
                Search/filter placeholder
                <input
                  type="text"
                  value={outlinerFilter}
                  onChange={(event) => setOutlinerFilter(event.currentTarget.value)}
                  placeholder="Filter objects (demo)"
                  style={s.input}
                />
              </label>
              <p style={s.panelDetail}>
                Outliner matches: {filteredOutlinerItems.length}/{OUTLINER_ITEMS.length} (demo only)
              </p>
              <label style={s.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={autoSyncOutlinerToSelection}
                  onChange={(event) => setAutoSyncOutlinerToSelection(event.currentTarget.checked)}
                />
                Auto-sync outliner to selected candidate hint (demo)
              </label>
              <div style={s.actionWrap}>
                <button
                  type="button"
                  style={s.secondaryButton}
                  onClick={() => setOutlinerFilter(selectedOutlinerHint)}
                >
                  Focus selected in outliner (demo)
                </button>
                <button
                  type="button"
                  style={s.secondaryButton}
                  onClick={() => setOutlinerFilter("")}
                  disabled={outlinerFilter.length === 0}
                  title={outlinerFilter.length === 0 ? "Outliner filter already clear." : undefined}
                >
                  Clear outliner filter
                </button>
              </div>
              <p style={s.panelDetail}>Selection hint: {selectedOutlinerHint} (demo mapping)</p>
              <ul style={s.list}>
                {filteredOutlinerItems.length ? (
                  filteredOutlinerItems.map((item) => <li key={item}>{item}</li>)
                ) : (
                  <li>No outliner items match current filter (demo).</li>
                )}
              </ul>
            </section>
          </aside>

          <section style={s.editorCenterCol}>
            <section style={s.viewportPanel}>
              <div style={s.panelHeader}>
                <h4 style={s.subheading}>3D viewport</h4>
                <TruthBadge truth="demo" />
              </div>
              <div style={s.viewportModes}>
                {VIEWPORT_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    style={activeViewportMode === mode ? s.modeChipActive : s.modeChip}
                    aria-pressed={activeViewportMode === mode}
                    onClick={() => setActiveViewportMode(mode)}
                    aria-keyshortcuts={mode === "Solid" ? "S" : mode === "Material Preview" ? "M" : mode === "Wireframe" ? "W" : "Q"}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div style={s.viewportCanvas}>
                <div style={s.viewportGrid} />
                <div style={s.viewportSilhouette} />
                <p style={s.viewportLabel}>Demo viewport - no real model loaded</p>
              </div>
              <div style={s.actionWrap}>
                {VIEWPORT_CONTROLS.map((control) => (
                  <button
                    key={control}
                    type="button"
                    style={activeViewportControl === control ? s.activeButton : s.secondaryButton}
                    aria-pressed={activeViewportControl === control}
                    onClick={() => setActiveViewportControl(control)}
                    aria-keyshortcuts={VIEW_CONTROL_SHORTCUTS[control]}
                  >
                    {control} ({VIEW_CONTROL_SHORTCUTS[control]})
                  </button>
                ))}
              </div>
              <p style={s.panelDetail}>
                Active viewport mode: {activeViewportMode} (demo). Active view control: {activeViewportControl} (demo).
              </p>
              <p style={s.panelDetail}>Shortcut hint (demo): `S/M/W/Q` modes and `O/P/Z/F/T/R/Y` view controls.</p>
              <div style={s.inspectCard}>
                <h4 style={s.subheading}>Editor state snapshot (demo)</h4>
                <ul style={s.list}>
                  <li>Tool: {activeToolLabel}</li>
                  <li>Viewport mode: {activeViewportMode}</li>
                  <li>View control: {activeViewportControl}</li>
                  <li>Outliner filter: {outlinerFilter || "none"}</li>
                  <li>Outliner auto-sync: {autoSyncOutlinerToSelection ? "on" : "off"}</li>
                </ul>
                <div style={s.actionWrap}>
                  <button type="button" style={s.secondaryButton} onClick={copyEditorSnapshot}>
                    Copy editor snapshot (demo)
                  </button>
                </div>
                {editorSnapshotCopyStatus ? (
                  <p style={s.panelDetail} role="status" aria-live="polite">
                    {editorSnapshotCopyStatus}
                  </p>
                ) : null}
              </div>
              <div style={s.actionWrap}>
                <button type="button" style={s.secondaryButton} onClick={resetEditorWorkspace}>
                  Reset editor workspace (demo)
                </button>
              </div>
            </section>

            <section style={s.panel}>
              <div style={s.panelHeader}>
                <h4 style={s.subheading}>Viewport candidate tray</h4>
                <TruthBadge truth="demo" />
              </div>
              <div style={s.editorCandidateGrid}>
                {effectiveCandidates.map((candidate) => {
                  const scores = candidateDemoScores(candidate.id);
                  const isSelected = selectedCandidate?.id === candidate.id;
                  return (
                    <article key={`editor-${candidate.id}`} style={s.editorCandidateCard}>
                      <div style={s.thumbnailPlaceholder}>thumbnail placeholder</div>
                      <div style={s.cardHeader}>
                        <strong>{candidate.name}</strong>
                        <TruthBadge truth={candidate.status} />
                      </div>
                      <p style={s.cardMicro}>Demo label: demo</p>
                      <p style={s.cardMicro}>Geometry score: {scores.geometry}/100</p>
                      <p style={s.cardMicro}>Texture score: {scores.texture}/100</p>
                      <p style={s.cardMicro}>O3DE readiness score: {scores.readiness}/100</p>
                      <p style={s.cardMicro}>Warnings: {scores.warnings}</p>
                      <button
                        type="button"
                        style={isSelected ? s.activeButton : s.secondaryButton}
                        onClick={() => setSelectedCandidateId(candidate.id)}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          </section>

          <aside style={s.editorRightCol}>
            <section style={s.panel}>
              <div style={s.panelHeader}>
                <h4 style={s.subheading}>Inspector</h4>
                <TruthBadge truth={selectedCandidate?.status ?? "demo"} />
              </div>
              <h4 style={s.subheading}>Transform</h4>
              <ul style={s.list}>
                <li>Location X/Y/Z: 0.00 / 0.00 / 0.00 (demo)</li>
                <li>Rotation X/Y/Z: 0.00 / 0.00 / 0.00 (demo)</li>
                <li>Scale X/Y/Z: 1.00 / 1.00 / 1.00 (demo)</li>
              </ul>
              <h4 style={s.subheading}>Geometry</h4>
              <ul style={s.list}>
                <li>Vertices: {selectedCandidateScores ? selectedCandidateScores.geometry * 112 : 0} (demo)</li>
                <li>Triangles: {selectedCandidate?.trisEstimate ?? "N/A"} (demo)</li>
                <li>UV status: plan-only</li>
                <li>Normals status: preflight-only</li>
                <li>Non-manifold status: blocked</li>
              </ul>
              <h4 style={s.subheading}>Materials</h4>
              <ul style={s.list}>
                <li>Material slots: 2 (demo)</li>
                <li>Base color: plan-only</li>
                <li>Normal map: plan-only</li>
                <li>Roughness map: plan-only</li>
                <li>Metallic map: plan-only</li>
              </ul>
              <h4 style={s.subheading}>O3DE Readiness</h4>
              <ul style={s.list}>
                <li>Scale status: preflight-only</li>
                <li>Origin status: plan-only</li>
                <li>Texture status: plan-only</li>
                <li>Product asset status: blocked</li>
                <li>Placement readiness: plan-only</li>
              </ul>
            </section>

            <section style={s.panel}>
              <div style={s.panelHeader}>
                <h4 style={s.subheading}>Blender prep tool groups</h4>
                <TruthBadge truth="plan-only" />
              </div>
              <div style={s.toolRailGrid}>
                {[
                  { label: "Normalize", truth: "plan-only" as AssetForgeTruthState },
                  { label: "Cleanup", truth: "preflight-only" as AssetForgeTruthState },
                  { label: "Materials", truth: "plan-only" as AssetForgeTruthState },
                  { label: "Textures", truth: "plan-only" as AssetForgeTruthState },
                  { label: "Rigging", truth: "blocked" as AssetForgeTruthState },
                  { label: "Export", truth: "preflight-only" as AssetForgeTruthState },
                ].map((group) => (
                  <div key={group.label} style={s.toolRailItem}>
                    <span>{group.label}</span>
                    <TruthBadge truth={group.truth} />
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>

      <section aria-label="Asset Forge candidate gallery" style={s.panel}>
        <div style={s.panelHeader}>
          <h3 style={s.panelTitle}>Candidate gallery</h3>
          <TruthBadge truth="demo" />
        </div>
        <p style={s.panelDetail}>Four demo candidates are shown so the review/selection workflow is visible before real provider execution exists.</p>
        <div style={s.cardGrid}>
          {effectiveCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              selected={candidate.id === selectedCandidate?.id}
              onSelect={setSelectedCandidateId}
            />
          ))}
        </div>
      </section>

      <section aria-label="Asset Forge selected candidate inspector" style={s.panel}>
        <div style={s.panelHeader}>
          <h3 style={s.panelTitle}>Selected candidate inspector</h3>
          <TruthBadge truth={selectedCandidate?.status ?? "demo"} />
        </div>
        <p style={s.panelDetail}>
          Inspect selected candidate metadata and planned follow-up actions. This is demo metadata only.
        </p>
        <ul style={s.list}>
          <li>Name: {selectedCandidate?.name ?? "No selection"}</li>
          <li>Status: {selectedCandidate?.status ?? "demo"}</li>
          <li>Preview notes: {selectedCandidate?.previewNotes ?? "No candidate selected"}</li>
          <li>Tris estimate: {selectedCandidate?.trisEstimate ?? "N/A"}</li>
          <li>{selectedCandidate?.readinessPlaceholder ?? "O3DE readiness placeholder: N/A"}</li>
          <li>Reality check: Demo candidate - no real generation performed.</li>
        </ul>
      </section>

      <section aria-label="Asset Forge Blender Prep panel" style={s.panel}>
        <div style={s.panelHeader}>
          <h3 style={s.panelTitle}>Blender Prep panel</h3>
          <TruthBadge truth={blenderPanelTruth} />
        </div>
        <p style={s.panelDetail}>
          Blender lane is visible and explicit, but preflight-only in this packet.
        </p>
        <ul style={s.list}>
          <li>Executable status: {blenderExecutableLabel}</li>
          <li>Version status: {blenderVersionLabel}</li>
          <li>Version probe: {blenderVersionProbeLabel}</li>
          <li>Detection source: {effectiveBlenderStatus?.detection_source ?? "demo-fallback"}</li>
          {effectiveBlenderStatus ? (
            <li>Prep execution status: {effectiveBlenderStatus.blender_prep_execution_status}</li>
          ) : null}
          {assetForgeStudioDemoState.blenderPrep.checks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
        {blenderWarnings.length > 0 ? (
          <>
            <h4 style={s.subheading}>Blender warnings</h4>
            <ul style={s.list}>
              {blenderWarnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </>
        ) : null}
        <div style={s.inspectCard}>
          <div style={s.panelHeader}>
            <h4 style={s.subheading}>Read-only candidate inspection</h4>
            <TruthBadge truth={blenderInspectTruth} />
          </div>
          <p style={s.panelDetail}>
            Packet 06 runs an allowlisted repo inspection script only. Blender execution remains blocked.
          </p>
          <label style={s.labelBlock}>
            Candidate artifact path
            <input
              type="text"
              value={blenderInspectPath}
              onChange={(event) => setBlenderInspectPath(event.target.value)}
              placeholder="candidates/sample.obj"
              style={s.input}
            />
          </label>
          <div style={s.actionWrap}>
            <button
              type="button"
              onClick={runBlenderReadOnlyInspect}
              disabled={blenderInspectBusy}
              style={s.secondaryButton}
            >
              {blenderInspectBusy ? "Inspecting..." : "Run read-only inspection"}
            </button>
          </div>
          {blenderInspectError ? (
            <p style={s.errorText}>{blenderInspectError}</p>
          ) : null}
          {blenderInspectReport ? (
            <ul style={s.list}>
              <li>Inspection status: {blenderInspectReport.inspection_status}</li>
              <li>Artifact path: {blenderInspectReport.artifact_path}</li>
              <li>Script execution: {blenderInspectReport.script_execution_status}</li>
              <li>Runtime root scoped: {blenderInspectReport.artifact_within_runtime_root ? "yes" : "no"}</li>
              <li>Extension allowlisted: {blenderInspectReport.extension_allowed ? "yes" : "no"}</li>
              <li>Artifact size bytes: {String((blenderInspectReport.metadata["artifact_file_size_bytes"] as number | undefined)
                ?? (blenderInspectReport.metadata["file_size_bytes"] as number | undefined)
                ?? "unknown")}</li>
              <li>Inspection cap bytes: {String(
                (
                  blenderInspectReport.metadata["inspection_policy"] as { max_inspect_bytes?: number } | undefined
                )?.max_inspect_bytes ?? "unknown",
              )}</li>
              <li>Read-only policy: {String(
                (
                  blenderInspectReport.metadata["inspection_policy"] as { read_only?: boolean } | undefined
                )?.read_only ?? "unknown",
              )}</li>
            </ul>
          ) : null}
        </div>
        <button type="button" disabled style={s.disabledButton}>
          Run Blender prep script (blocked)
        </button>
      </section>

      <section aria-label="Asset Forge O3DE ingest review panel" style={s.panel}>
        <div style={s.panelHeader}>
          <h3 style={s.panelTitle}>O3DE ingest and review panel</h3>
          <TruthBadge truth={assetForgeStudioDemoState.o3deIngest.ingestStatus} />
        </div>
        <p style={s.panelDetail}>O3DE ingest remains plan-only and readback-oriented in this packet.</p>
        <h4 style={s.subheading}>Stage plan</h4>
        <ol style={s.list}>
          {assetForgeStudioDemoState.o3deIngest.stagePlan.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <h4 style={s.subheading}>Warnings</h4>
        <ul style={s.list}>
          {assetForgeStudioDemoState.o3deIngest.reviewWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
        <div style={s.inspectCard}>
          <div style={s.panelHeader}>
            <h4 style={s.subheading}>Deterministic O3DE stage plan</h4>
            <TruthBadge truth={stagePlanTruth} />
          </div>
          <p style={s.panelDetail}>
            Packet 07 creates a plan-only stage path and manifest path. No O3DE project write is executed.
          </p>
          <div style={s.actionWrap}>
            <button
              type="button"
              onClick={createStagePlan}
              disabled={stagePlanBusy || !selectedCandidate}
              style={s.secondaryButton}
            >
              {stagePlanBusy ? "Planning..." : "Create O3DE stage plan"}
            </button>
          </div>
          {stagePlanError ? (
            <p style={s.errorText}>{stagePlanError}</p>
          ) : null}
          {stagePlanReport ? (
            <ul style={s.list}>
              <li>Plan status: {stagePlanReport.plan_status}</li>
              <li>Candidate: {stagePlanReport.candidate_label}</li>
              <li>Project root hint: {stagePlanReport.project_root_hint ?? "not configured"}</li>
              <li>Stage path: {stagePlanReport.deterministic_staging_relative_path}</li>
              <li>Manifest path: {stagePlanReport.deterministic_manifest_relative_path}</li>
              <li>Allowed staging prefix: {String(stagePlanReport.stage_plan_policy["allowed_staging_prefix"] ?? "Assets/Generated/asset_forge/")}</li>
              <li>Allowed output extensions: {Array.isArray(stagePlanReport.stage_plan_policy["allowed_output_extensions"])
                ? (stagePlanReport.stage_plan_policy["allowed_output_extensions"] as string[]).join(", ")
                : "unknown"}</li>
              <li>Approval required: {stagePlanReport.approval_required ? "yes" : "no"}</li>
              <li>Project writes admitted: {stagePlanReport.project_write_admitted ? "yes" : "no"}</li>
            </ul>
          ) : null}
        </div>
        <div style={s.inspectCard}>
          <div style={s.panelHeader}>
            <h4 style={s.subheading}>Approval-gated source staging write</h4>
            <TruthBadge truth={stageWriteTruth} />
          </div>
          <p style={s.panelDetail}>
            Packet 08 can perform one bounded source copy + provenance sidecar write after explicit approval.
          </p>
          <label style={s.labelBlock}>
            Source artifact path (runtime-root scoped)
            <input
              type="text"
              value={stageSourceArtifactPath}
              onChange={(event) => setStageSourceArtifactPath(event.target.value)}
              placeholder="prepared_exports/candidate_a.glb"
              style={s.input}
            />
          </label>
          <label style={s.labelBlock}>
            Approval note (required when approved)
            <input
              type="text"
              value={stageApprovalNote}
              onChange={(event) => setStageApprovalNote(event.target.value)}
              placeholder="Operator approved bounded source staging for review."
              style={s.input}
            />
          </label>
          <label style={s.checkboxLabel}>
            <input
              type="checkbox"
              checked={stageApprovalGranted}
              onChange={(event) => setStageApprovalGranted(event.target.checked)}
            />
            Approval acknowledged for bounded stage write
          </label>
          <div style={s.actionWrap}>
            <button
              type="button"
              onClick={executeStageWrite}
              disabled={stageWriteBusy || !stagePlanReport}
              style={s.secondaryButton}
            >
              {stageWriteBusy ? "Writing..." : "Execute stage write (approval-gated)"}
            </button>
          </div>
          {stageWriteError ? (
            <p style={s.errorText}>{stageWriteError}</p>
          ) : null}
          {stageWriteReport ? (
            <ul style={s.list}>
              <li>Write status: {stageWriteReport.write_status}</li>
              <li>Write executed: {stageWriteReport.write_executed ? "yes" : "no"}</li>
              <li>Project root: {stageWriteReport.project_root ?? "not configured"}</li>
              <li>Destination source: {stageWriteReport.destination_source_asset_path ?? "n/a"}</li>
              <li>Destination sidecar: {stageWriteReport.destination_manifest_path ?? "n/a"}</li>
              <li>Bytes copied: {stageWriteReport.bytes_copied ?? 0}</li>
              <li>Source SHA256: {stageWriteReport.source_sha256 ?? "n/a"}</li>
              <li>Destination SHA256: {stageWriteReport.destination_sha256 ?? "n/a"}</li>
              <li>Manifest SHA256: {stageWriteReport.manifest_sha256 ?? "n/a"}</li>
            </ul>
          ) : null}
        </div>
        <div style={s.inspectCard}>
          <div style={s.panelHeader}>
            <h4 style={s.subheading}>Assetdb/catalog readback evidence (Packet 09)</h4>
            <TruthBadge truth={readbackTruth} />
          </div>
          <p style={s.panelDetail}>
            Packet 09 captures read-only ingest evidence from `Cache/assetdb.sqlite` and `Cache/&lt;platform&gt;/assetcatalog.xml`.
          </p>
          <label style={s.labelBlock}>
            Staged source relative path
            <input
              type="text"
              value={readbackSourceRelativePath}
              onChange={(event) => setReadbackSourceRelativePath(event.target.value)}
              placeholder="Assets/Generated/asset_forge/candidate_a/candidate_a.glb"
              style={s.input}
            />
          </label>
          <label style={s.labelBlock}>
            Platform cache
            <input
              type="text"
              value={readbackPlatform}
              onChange={(event) => setReadbackPlatform(event.target.value)}
              placeholder="pc"
              style={s.input}
            />
          </label>
          <div style={s.actionWrap}>
            <button
              type="button"
              onClick={runO3deIngestReadback}
              disabled={readbackBusy}
              style={s.secondaryButton}
            >
              {readbackBusy ? "Reading..." : "Run read-only ingest evidence readback"}
            </button>
          </div>
          {readbackError ? (
            <p style={s.errorText}>{readbackError}</p>
          ) : null}
          {readbackReport ? (
            <>
              <ul style={s.list}>
                <li>Readback status: {readbackReport.readback_status}</li>
                <li>Source exists: {readbackReport.source_exists ? "yes" : "no"}</li>
                <li>Source found in assetdb: {readbackReport.source_found_in_assetdb ? "yes" : "no"}</li>
                <li>Assetdb freshness: {readbackReport.asset_database_freshness_status}</li>
                <li>Assetdb last write (UTC): {readbackReport.asset_database_last_write_time ?? "n/a"}</li>
                <li>Catalog freshness: {readbackReport.catalog_freshness_status}</li>
                <li>Catalog last write (UTC): {readbackReport.catalog_last_write_time ?? "n/a"}</li>
                <li>Asset Processor warnings: {readbackReport.asset_processor_warning_count}</li>
                <li>Asset Processor errors: {readbackReport.asset_processor_error_count}</li>
                <li>Product rows: {readbackReport.product_count}</li>
                <li>Dependency rows: {readbackReport.dependency_count}</li>
                <li>Catalog presence: {readbackReport.catalog_presence ? "yes" : "no"}</li>
                <li>Read only: {readbackReport.read_only ? "yes" : "no"}</li>
                <li>Mutation occurred: {readbackReport.mutation_occurred ? "yes" : "no"}</li>
              </ul>
              {readbackReport.asset_processor_job_rows.length ? (
                <>
                  <h4 style={s.subheading}>Asset Processor job evidence</h4>
                  <ul style={s.list}>
                    {readbackReport.asset_processor_job_rows.map((row) => (
                      <li key={row}>{row}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              {readbackReport.catalog_product_path_presence.length ? (
                <>
                  <h4 style={s.subheading}>Catalog path presence</h4>
                  <ul style={s.list}>
                    {readbackReport.catalog_product_path_presence.map((row) => (
                      <li key={row}>{row}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : null}
        </div>
        <div style={s.inspectCard}>
          <div style={s.panelHeader}>
            <h4 style={s.subheading}>Editor placement plan (Packet 10)</h4>
            <TruthBadge truth={placementPlanTruth} />
          </div>
          <p style={s.panelDetail}>
            Packet 10 creates a plan-only placement target. No Editor placement write is executed.
          </p>
          <label style={s.labelBlock}>
            Target level path (Levels/*.prefab)
            <input
              type="text"
              value={placementLevelPath}
              onChange={(event) => setPlacementLevelPath(event.target.value)}
              placeholder="Levels/BridgeLevel01/BridgeLevel01.prefab"
              style={s.input}
            />
          </label>
          <label style={s.labelBlock}>
            Target entity name
            <input
              type="text"
              value={placementEntityName}
              onChange={(event) => setPlacementEntityName(event.target.value)}
              placeholder="AssetForgeCandidateA"
              style={s.input}
            />
          </label>
          <label style={s.labelBlock}>
            Target component
            <input
              type="text"
              value={placementComponent}
              onChange={(event) => setPlacementComponent(event.target.value)}
              placeholder="Mesh"
              style={s.input}
            />
          </label>
          <div style={s.actionWrap}>
            <button
              type="button"
              onClick={createPlacementPlan}
              disabled={placementPlanBusy}
              style={s.secondaryButton}
            >
              {placementPlanBusy ? "Planning..." : "Create plan-only placement target"}
            </button>
          </div>
          {placementPlanError ? (
            <p style={s.errorText}>{placementPlanError}</p>
          ) : null}
          {placementPlanReport ? (
            <ul style={s.list}>
              <li>Plan status: {placementPlanReport.plan_status}</li>
              <li>Placement execution status: {placementPlanReport.placement_execution_status}</li>
              <li>Target level: {placementPlanReport.target_level_relative_path}</li>
              <li>Target entity: {placementPlanReport.target_entity_name}</li>
              <li>Target component: {placementPlanReport.target_component}</li>
              <li>Approval required: {placementPlanReport.approval_required ? "yes" : "no"}</li>
              <li>Placement writes admitted: {placementPlanReport.placement_write_admitted ? "yes" : "no"}</li>
              <li>Allowed stage prefix: {String(placementPlanReport.placement_plan_policy["allowed_stage_prefix"] ?? "Assets/Generated/asset_forge/")}</li>
              <li>Allowed stage extensions: {Array.isArray(placementPlanReport.placement_plan_policy["allowed_stage_extensions"])
                ? (placementPlanReport.placement_plan_policy["allowed_stage_extensions"] as string[]).join(", ")
                : ".glb, .gltf, .fbx, .obj"}</li>
              <li>Allowed level path: {String(placementPlanReport.placement_plan_policy["allowed_level_prefix"] ?? "Levels/")}*{String(placementPlanReport.placement_plan_policy["allowed_level_suffix"] ?? ".prefab")}</li>
            </ul>
          ) : null}
          <div style={s.actionWrap}>
            <label style={s.checkboxLabel}>
              <input
                type="checkbox"
                checked={placementProofApprovalGranted}
                onChange={(event) => setPlacementProofApprovalGranted(event.target.checked)}
              />
              Approval acknowledged for narrow placement proof gate
            </label>
          </div>
          <label style={s.labelBlock}>
            Placement proof approval note
            <input
              type="text"
              value={placementProofApprovalNote}
              onChange={(event) => setPlacementProofApprovalNote(event.target.value)}
              placeholder="Operator approved exact Packet 11 proof gate."
              style={s.input}
            />
          </label>
          <div style={s.actionWrap}>
            <button
              type="button"
              onClick={executePlacementProofGate}
              disabled={placementProofBusy || !placementPlanReport}
              style={s.secondaryButton}
            >
              {placementProofBusy ? "Gating..." : "Run narrow placement proof gate (Packet 11)"}
            </button>
          </div>
          {placementProofError ? (
            <p style={s.errorText}>{placementProofError}</p>
          ) : null}
          {placementProofReport ? (
            <ul style={s.list}>
              <li>Proof status: {placementProofReport.proof_status}</li>
              <li>Placement execution status: {placementProofReport.placement_execution_status}</li>
              <li>Runtime proof gate enabled: {placementProofReport.proof_runtime_gate_enabled ? "yes" : "no"}</li>
              <li>Proof approval required: {placementProofReport.placement_proof_policy["approval_required"] ? "yes" : "no"}</li>
              <li>Proof runtime gate env: {String(placementProofReport.placement_proof_policy["runtime_gate_env"] ?? "ASSET_FORGE_ENABLE_PLACEMENT_PROOF")}</li>
              <li>Proof mutation scope: {String(placementProofReport.placement_proof_policy["mutation_scope"] ?? "proof-only-no-scene-mutation")}</li>
              <li>Write occurred: {placementProofReport.write_occurred ? "yes" : "no"}</li>
            </ul>
          ) : null}
          <div style={s.panelHeader}>
            <h4 style={s.subheading}>Placement evidence preflight (Packet 11)</h4>
            <TruthBadge truth={placementEvidenceTruth} />
          </div>
          <p style={s.panelDetail}>
            Read-only proof surface for staged source, target level, and assetdb evidence. No Editor mutation is executed.
          </p>
          <div style={s.actionWrap}>
            <button
              type="button"
              onClick={collectPlacementEvidencePreflight}
              disabled={placementEvidenceBusy || !placementPlanReport}
              style={s.secondaryButton}
            >
              {placementEvidenceBusy ? "Collecting..." : "Collect placement evidence preflight"}
            </button>
          </div>
          {placementEvidenceError ? (
            <p style={s.errorText}>{placementEvidenceError}</p>
          ) : null}
          {placementEvidenceReport ? (
            <ul style={s.list}>
              <li>Evidence status: {placementEvidenceReport.evidence_status}</li>
              <li>Staged source exists: {placementEvidenceReport.staged_source_exists ? "yes" : "no"}</li>
              <li>Target level exists: {placementEvidenceReport.target_level_exists ? "yes" : "no"}</li>
              <li>Asset database exists: {placementEvidenceReport.asset_database_exists ? "yes" : "no"}</li>
              <li>Source found in assetdb: {placementEvidenceReport.source_found_in_assetdb ? "yes" : "no"}</li>
              <li>Read-only: {placementEvidenceReport.read_only ? "yes" : "no"}</li>
              <li>Mutation occurred: {placementEvidenceReport.mutation_occurred ? "yes" : "no"}</li>
            </ul>
          ) : null}
          <div style={s.panelHeader}>
            <h4 style={s.subheading}>Runtime harness readiness (next slice)</h4>
            <TruthBadge truth={placementHarnessTruth} />
          </div>
          <p style={s.panelDetail}>
            Plan-only harness preparation: checks bridge and gate prerequisites, but performs no placement execution.
          </p>
          <div style={s.actionWrap}>
            <button
              type="button"
              onClick={preparePlacementRuntimeHarness}
              disabled={placementHarnessBusy || !placementPlanReport}
              style={s.secondaryButton}
            >
              {placementHarnessBusy ? "Preparing..." : "Prepare bounded runtime harness (plan-only)"}
            </button>
          </div>
          {placementHarnessError ? (
            <p style={s.errorText}>{placementHarnessError}</p>
          ) : null}
          {placementHarnessReport ? (
            <ul style={s.list}>
              <li>Harness status: {placementHarnessReport.harness_status}</li>
              <li>Bridge configured: {placementHarnessReport.bridge_configured ? "yes" : "no"}</li>
              <li>Bridge heartbeat fresh: {placementHarnessReport.bridge_heartbeat_fresh ? "yes" : "no"}</li>
              <li>Runtime gate enabled: {placementHarnessReport.runtime_gate_enabled ? "yes" : "no"}</li>
              <li>Execution performed: {placementHarnessReport.execution_performed ? "yes" : "no"}</li>
              <li>Read-only: {placementHarnessReport.read_only ? "yes" : "no"}</li>
            </ul>
          ) : null}
          <div style={s.panelHeader}>
            <h4 style={s.subheading}>One-shot runtime harness execute gate</h4>
            <TruthBadge truth={placementHarnessExecuteTruth} />
          </div>
          <p style={s.panelDetail}>
            Proof-only submission gate with approval and prerequisites. This records command marker evidence without claiming scene mutation/readback.
          </p>
          <div style={s.actionWrap}>
            <label style={s.checkboxLabel}>
              <input
                type="checkbox"
                checked={placementHarnessExecuteApprovalGranted}
                onChange={(event) => setPlacementHarnessExecuteApprovalGranted(event.target.checked)}
              />
              Approval acknowledged for one-shot harness execute gate
            </label>
          </div>
          <label style={s.labelBlock}>
            Harness execute approval note
            <input
              type="text"
              value={placementHarnessExecuteApprovalNote}
              onChange={(event) => setPlacementHarnessExecuteApprovalNote(event.target.value)}
              placeholder="Operator approved one-shot harness execute gate."
              style={s.input}
            />
          </label>
          <div style={s.actionWrap}>
            <button
              type="button"
              onClick={executePlacementRuntimeHarnessGate}
              disabled={placementHarnessExecuteBusy || !placementPlanReport}
              style={s.secondaryButton}
            >
              {placementHarnessExecuteBusy ? "Submitting..." : "Submit one-shot runtime harness gate"}
            </button>
          </div>
          {placementHarnessExecuteError ? (
            <p style={s.errorText}>{placementHarnessExecuteError}</p>
          ) : null}
          {placementHarnessExecuteReport ? (
            <ul style={s.list}>
              <li>Execute status: {placementHarnessExecuteReport.execute_status}</li>
              <li>Bridge command id: {placementHarnessExecuteReport.bridge_command_id ?? "none"}</li>
              <li>Execution performed: {placementHarnessExecuteReport.execution_performed ? "yes" : "no"}</li>
              <li>Readback captured: {placementHarnessExecuteReport.readback_captured ? "yes" : "no"}</li>
              <li>Read-only: {placementHarnessExecuteReport.read_only ? "yes" : "no"}</li>
            </ul>
          ) : null}
          <div style={s.panelHeader}>
            <h4 style={s.subheading}>Live proof attempt (read-only bounded)</h4>
            <TruthBadge truth={placementLiveProofTruth} />
          </div>
          <p style={s.panelDetail}>
            Executes one bridge-backed `editor.entity.exists` read operation when all gates are admitted.
          </p>
          <div style={s.actionWrap}>
            <button
              type="button"
              onClick={executePlacementLiveProofGate}
              disabled={placementLiveProofBusy || !placementPlanReport}
              style={s.secondaryButton}
            >
              {placementLiveProofBusy ? "Running..." : "Run one-shot live proof (read-only)"}
            </button>
          </div>
          {placementLiveProofError ? <p style={s.errorText}>{placementLiveProofError}</p> : null}
          {placementLiveProofReport ? (
            <ul style={s.list}>
              <li>Proof status: {placementLiveProofReport.proof_status}</li>
              <li>Execution performed: {placementLiveProofReport.execution_performed ? "yes" : "no"}</li>
              <li>Readback captured: {placementLiveProofReport.readback_captured ? "yes" : "no"}</li>
              <li>Entity exists: {placementLiveProofReport.entity_exists === null ? "unknown" : (placementLiveProofReport.entity_exists ? "yes" : "no")}</li>
              <li>Bridge command id: {placementLiveProofReport.bridge_command_id ?? "none"}</li>
              <li>Evidence bundle: {placementLiveProofReport.evidence_bundle_path ?? "not-written"}</li>
              <li>Revert statement: {placementLiveProofReport.revert_statement}</li>
            </ul>
          ) : null}
        </div>
        <button type="button" disabled style={s.disabledButton}>
          Stage into O3DE project (blocked)
        </button>
      </section>

      <section aria-label="Asset Forge evidence timeline" style={s.panel}>
        <div style={s.panelHeader}>
          <h3 style={s.panelTitle}>Evidence timeline</h3>
          <TruthBadge truth="demo" />
        </div>
        <p style={s.panelDetail}>Timeline shows which events are demo, plan-only, preflight-only, or blocked.</p>
        <div style={s.actionWrap}>
          <label style={s.labelBlock}>
            Evidence index limit
            <select
              value={String(evidenceIndexLimit)}
              onChange={(event) => setEvidenceIndexLimit(Number(event.target.value))}
              style={s.input}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="25">25</option>
            </select>
          </label>
          <label style={s.labelBlock}>
            Status filter
            <select
              value={evidenceIndexStatusFilter}
              onChange={(event) => setEvidenceIndexStatusFilter(event.target.value)}
              style={s.input}
            >
              <option value="">all</option>
              <option value="succeeded">succeeded</option>
              <option value="blocked">blocked</option>
              <option value="approval-required">approval-required</option>
            </select>
          </label>
          <label style={s.labelBlock}>
            Candidate filter
            <input
              type="text"
              value={evidenceIndexCandidateFilter}
              onChange={(event) => setEvidenceIndexCandidateFilter(event.target.value)}
              placeholder="candidate-a"
              style={s.input}
            />
          </label>
          <label style={s.labelBlock}>
            Max age seconds
            <input
              type="number"
              min={0}
              max={86400}
              value={evidenceIndexFromAgeSeconds}
              onChange={(event) => setEvidenceIndexFromAgeSeconds(event.target.value)}
              placeholder="1800"
              style={s.input}
            />
          </label>
          <button
            type="button"
            onClick={refreshLiveProofEvidenceIndex}
            style={s.secondaryButton}
            disabled={evidenceIndexBusy || evidenceCandidateDebouncePending}
            title={evidenceRefreshDisabledTitle}
          >
            {evidenceIndexBusy ? "Refreshing..." : "Refresh live-proof evidence index"}
          </button>
          <button
            type="button"
            onClick={clearEvidenceFiltersAndRefresh}
            style={s.secondaryButton}
            disabled={evidenceIndexBusy || evidenceFiltersAtDefault}
            title={evidenceFiltersAtDefault ? "Filters already at defaults." : undefined}
          >
            Clear filters
          </button>
          <button type="button" onClick={copyEvidenceFilterQuery} style={s.secondaryButton}>
            Copy filter query
          </button>
          <button
            type="button"
            onClick={copyAppliedFiltersFromServer}
            style={s.secondaryButton}
            disabled={!evidenceIndexReport}
            title={!evidenceIndexReport ? "Refresh evidence index first." : undefined}
          >
            Copy applied filters (server)
          </button>
          <button
            type="button"
            onClick={applyServerFiltersToUi}
            style={s.secondaryButton}
            disabled={!evidenceIndexReport}
            title={!evidenceIndexReport ? "Refresh evidence index first." : undefined}
          >
            Apply server filters to UI
          </button>
        </div>
        <div style={s.actionWrap}>
          <label style={s.labelBlock}>
            Paste query (leading ? optional)
            <input
              type="text"
              value={evidenceQueryPasteInput}
              onChange={(event) => setEvidenceQueryPasteInput(event.target.value)}
              placeholder="?limit=10&proof_status=succeeded"
              style={s.input}
              aria-describedby="asset-forge-paste-query-help asset-forge-paste-query-example"
            />
          </label>
          <p id="asset-forge-paste-query-help" style={s.panelDetail}>Accepted keys: limit, proof_status, candidate_id, from_age_s.</p>
          <p id="asset-forge-paste-query-example" style={s.panelDetail}>Example (leading ? optional): ?limit=10&proof_status=succeeded&candidate_id=candidate-a&from_age_s=1800</p>
          <button
            type="button"
            onClick={applyPastedEvidenceFilterQuery}
            style={s.secondaryButton}
            disabled={evidenceIndexBusy || evidencePasteQueryEmpty}
            title={evidencePasteQueryEmpty ? "Paste a query string to enable this action." : undefined}
          >
            {evidencePasteApplyBusy ? "Applying query..." : "Apply pasted query"}
          </button>
        </div>
        <p style={s.panelDetail}>
          Current filters: limit={evidenceIndexLimit}, status={evidenceIndexStatusFilter || "all"}, candidate=
          {evidenceIndexCandidateFilter || "all"}, maxAge={evidenceIndexFromAgeSeconds || "none"}s
        </p>
        {evidenceCandidateDebouncePending ? (
          <p style={s.panelDetail} role="status" aria-live="polite">
            Applying candidate filter...
          </p>
        ) : null}
        {evidenceIndexReport ? (
          <p style={evidenceFilterMismatch ? s.errorText : s.panelDetail}>
            Filter sync: {evidenceFilterMismatch ? "UI/server mismatch" : "UI matches server applied filters"}
          </p>
        ) : null}
        {evidenceQueryCopyStatus ? (
          <p style={s.panelDetail} role="status" aria-live="polite">
            {evidenceQueryCopyStatus}
          </p>
        ) : null}
        {!evidenceIndexReport ? (
          <p style={s.panelDetail}>Refresh evidence index to enable server-applied filter actions.</p>
        ) : null}
        <div style={s.actionWrap}>
          <button
            type="button"
            style={s.secondaryButton}
            disabled={evidenceIndexBusy || evidenceCandidateDebouncePending}
            title={evidencePresetDisabledTitle}
            onClick={() => applyEvidenceAgePreset(300)}
          >
            Last 5m
          </button>
          <button
            type="button"
            style={s.secondaryButton}
            disabled={evidenceIndexBusy || evidenceCandidateDebouncePending}
            title={evidencePresetDisabledTitle}
            onClick={() => applyEvidenceAgePreset(1800)}
          >
            Last 30m
          </button>
          <button
            type="button"
            style={s.secondaryButton}
            disabled={evidenceIndexBusy || evidenceCandidateDebouncePending}
            title={evidencePresetDisabledTitle}
            onClick={() => applyEvidenceAgePreset(7200)}
          >
            Last 2h
          </button>
        </div>
        {evidenceIndexError ? (
          <p style={s.errorText} role="status" aria-live="polite">
            {evidenceIndexError}
          </p>
        ) : null}
        {showEvidenceFiltersRestoredHint ? (
          <div style={s.actionWrap}>
            <p style={s.panelDetail}>Filters restored from session storage.</p>
            <button
              type="button"
              style={s.secondaryButton}
              onClick={() => setShowEvidenceFiltersRestoredHint(false)}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {evidenceIndexLastRefreshedAt ? (
          <p style={s.panelDetail}>
            Last refreshed: {evidenceIndexLastRefreshedAt} ({evidenceIndexRefreshSource ?? "unknown"})
          </p>
        ) : null}
        {evidenceIndexReport ? (
          <ul style={s.list}>
            <li>Capability: {evidenceIndexReport.capability_name}</li>
            <li>Index status: {evidenceIndexReport.index_status}</li>
            <li>
              Displayed items: {Math.min(evidenceIndexReport.items.length, EVIDENCE_VISIBLE_ITEM_LIMIT)} of{" "}
              {evidenceIndexReport.items.length}
            </li>
            <li>Fresh items (max {evidenceIndexReport.freshness_window_seconds}s age): {evidenceIndexReport.fresh_item_count}</li>
            <li>Computed fresh items (current view): {evidenceComputedFreshCount}</li>
            <li>Computed stale items (current view): {evidenceComputedStaleCount}</li>
            <li>Evidence accounting balanced: {evidenceAccountingBalanced ? "yes" : "no"}</li>
            <li>
              Computed freshness ratio (current view): {evidenceComputedFreshCount}/
              {evidenceComputedDisplayedCount}
            </li>
            <li>Computed freshness percent (current view): {evidenceComputedFreshPercent}%</li>
            <li>Computed stale percent (current view): {evidenceComputedStalePercent}%</li>
            <li>
              Visible age range (s): newest {evidenceNewestAgeSeconds ?? "n/a"}, oldest {evidenceOldestAgeSeconds ?? "n/a"}
            </li>
            <li>Visible items with unknown age: {evidenceUnknownAgeCount}</li>
            <li>
              Age coverage (current view): {evidenceComputedDisplayedCount - evidenceUnknownAgeCount}/
              {evidenceComputedDisplayedCount}
            </li>
            <li>Read-only: {evidenceIndexReport.read_only ? "yes" : "no"}</li>
            <li>Evidence source: {evidenceIndexReport.source}</li>
            <li>Runtime root: {evidenceIndexReport.runtime_root}</li>
            <li>Evidence dir: {evidenceIndexReport.evidence_dir}</li>
            <li>
              Server status filter applied: {String(evidenceIndexReport.applied_filters.proof_status ?? "all")}
            </li>
            <li>
              Server candidate filter applied: {String(evidenceIndexReport.applied_filters.candidate_id ?? "all")}
            </li>
            <li>
              Server age filter applied (s): {String(evidenceIndexReport.applied_filters.from_age_s ?? "none")}
            </li>
            <li>
              Server limit applied: {String(evidenceIndexReport.applied_filters.limit ?? "n/a")}
            </li>
            <li>
              Server filter digest: {`limit=${String(evidenceIndexReport.applied_filters.limit ?? "n/a")}; status=${String(evidenceIndexReport.applied_filters.proof_status ?? "all")}; candidate=${String(evidenceIndexReport.applied_filters.candidate_id ?? "all")}; from_age_s=${String(evidenceIndexReport.applied_filters.from_age_s ?? "none")}`}
            </li>
            <li>Server/UI filter mismatch: {evidenceFilterMismatch ? "yes" : "no"}</li>
            <li>
              Applied filters: limit={String(evidenceIndexReport.applied_filters.limit ?? "n/a")}, status=
              {String(evidenceIndexReport.applied_filters.proof_status ?? "all")}, candidate=
              {String(evidenceIndexReport.applied_filters.candidate_id ?? "all")}, from_age_s=
              {String(evidenceIndexReport.applied_filters.from_age_s ?? "none")}
            </li>
          </ul>
        ) : null}
        {evidenceFreshCountMismatch ? (
          <p style={s.errorText} role="status" aria-live="polite">
            Fresh-item mismatch: server reported {evidenceIndexReport?.fresh_item_count ?? "n/a"}, current view computed {evidenceComputedFreshCount}.
          </p>
        ) : null}
        {evidenceIndexReport?.warnings.length ? (
          <>
            <h4 style={s.subheading}>Evidence warnings</h4>
            <ul style={s.list}>
              {evidenceIndexReport.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </>
        ) : null}
        {evidenceIndexReport?.items.length ? (
          <ol style={s.timeline}>
            {evidenceIndexReport.items.slice(0, EVIDENCE_VISIBLE_ITEM_LIMIT).map((item) => (
              <li key={item.path} style={s.timelineItem}>
                <div style={s.timelineRow}>
                  <strong>{item.candidate_id ?? "candidate-unknown"}</strong>
                  <TruthBadge truth={evidenceItemStatusToTruth(item.proof_status)} />
                </div>
                <p style={s.timelineTitle}>{item.proof_status ?? "unknown-status"} - {item.age_seconds ?? "?"}s ago</p>
                <p style={s.timelineDetail}>{item.path}</p>
              </li>
            ))}
          </ol>
        ) : null}
        {evidenceIndexReport && evidenceIndexReport.items.length > EVIDENCE_VISIBLE_ITEM_LIMIT ? (
          <p style={s.panelDetail} role="status" aria-live="polite">
            Showing first {EVIDENCE_VISIBLE_ITEM_LIMIT} of {evidenceIndexReport.items.length} evidence items.
          </p>
        ) : null}
        {evidenceIndexReport && evidenceIndexReport.items.length === 0 ? (
          <p style={s.panelDetail} role="status" aria-live="polite">
            No evidence items matched current filters.
          </p>
        ) : null}
        <ol style={s.timeline}>
          {assetForgeStudioDemoState.evidenceTimeline.map((entry) => (
            <li key={entry.id} style={s.timelineItem}>
              <div style={s.timelineRow}>
                <strong>{entry.timeLabel}</strong>
                <TruthBadge truth={entry.truth} />
              </div>
              <p style={s.timelineTitle}>{entry.title}</p>
              <p style={s.timelineDetail}>{entry.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Asset Forge settings status panel" style={s.panel}>
        <div style={s.panelHeader}>
          <h3 style={s.panelTitle}>Settings and status panel</h3>
          <TruthBadge truth={providerSettingsTruth} />
        </div>
        <p style={s.panelDetail}>Runtime/provider settings are visible while execution remains blocked by Packet 01 demo lock.</p>
        <ul style={s.list}>
          <li>Provider mode: {effectiveProviderStatus?.provider_mode ?? "demo-fallback"}</li>
          <li>Provider config ready: {effectiveProviderStatus ? (effectiveProviderStatus.configuration_ready ? "yes" : "no") : "unknown"}</li>
          <li>Provider credential status: {effectiveProviderStatus?.credential_status ?? "not-checked"}</li>
          <li>Provider execution status: {effectiveProviderStatus?.generation_execution_status ?? "blocked"}</li>
          <li>Provider config: {assetForgeStudioDemoState.settingsStatus.providerConfig}</li>
          <li>Output workspace: {assetForgeStudioDemoState.settingsStatus.defaultOutputWorkspace}</li>
          <li>Allowed formats: {assetForgeStudioDemoState.settingsStatus.allowedFormats.join(", ")}</li>
        </ul>
        {effectiveProviderStatus?.warnings.length ? (
          <>
            <h4 style={s.subheading}>Provider warnings</h4>
            <ul style={s.list}>
              {effectiveProviderStatus.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </>
        ) : null}
        {effectiveProviderStatus?.providers.length ? (
          <>
            <h4 style={s.subheading}>Provider registry (preflight-only)</h4>
            <p style={s.panelDetail}>
              Mode visibility is real-time status only. Generation remains blocked in this packet.
            </p>
            <div style={s.providerRegistryGrid}>
              {effectiveProviderStatus.providers.map((provider) => (
                <article key={provider.provider_id} style={s.providerRegistryCard}>
                  <div style={s.panelHeader}>
                    <strong>{provider.display_name}</strong>
                    <TruthBadge truth={providerModeToTruth(provider.mode)} />
                  </div>
                  <ul style={s.list}>
                    <li>Provider id: {provider.provider_id}</li>
                    <li>Mode: {provider.mode}</li>
                    <li>Configured: {provider.configured ? "yes" : "no"}</li>
                    <li>Credential status: {effectiveProviderStatus.credential_status}</li>
                    <li>Execution: {effectiveProviderStatus.generation_execution_status} (blocked)</li>
                  </ul>
                  <p style={s.panelDetail}>{provider.note}</p>
                </article>
              ))}
            </div>
          </>
        ) : null}
        <h4 style={s.subheading}>Safety guards</h4>
        <ul style={s.list}>
          {assetForgeStudioDemoState.settingsStatus.safetyGuards.map((guard) => (
            <li key={guard}>{guard}</li>
          ))}
        </ul>
        <h4 style={s.subheading}>Packet 01 capability delta</h4>
        <ul style={s.list}>
          <li>Asset Forge GUI: M1 concept/docs -&gt; M3 plan-only/demo studio shell.</li>
          <li>Blender Prep GUI: M1 concept/docs -&gt; M3 visible planned/preflight surface.</li>
          <li>O3DE Ingest GUI: M1 concept/docs -&gt; M3 plan-only review surface.</li>
        </ul>
        <div style={s.actionWrap}>
          <button type="button" onClick={onOpenPromptStudio} style={s.secondaryButton}>
            Open Prompt workspace
          </button>
          <button type="button" onClick={onOpenBuilder} style={s.secondaryButton}>
            Open Builder workspace
          </button>
          <button type="button" onClick={onOpenRuntimeOverview} style={s.secondaryButton}>
            Open Runtime overview
          </button>
          <button type="button" disabled style={s.disabledButton}>
            Save provider credentials (blocked)
          </button>
        </div>
      </section>
    </section>
  );
}

const s = {
  shell: {
    display: "grid",
    gap: 14,
    color: "var(--app-text-color)",
    width: "100%",
  },
  header: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 14,
    padding: 14,
    background: "linear-gradient(160deg, rgba(26, 34, 53, 0.82), rgba(22, 28, 43, 0.92))",
    display: "grid",
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 26,
    lineHeight: 1.2,
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "var(--app-subtle-color)",
  },
  laneGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  },
  laneCard: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "rgba(14, 19, 31, 0.45)",
    display: "grid",
    gap: 8,
  },
  laneHeading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  laneDetail: {
    margin: 0,
    color: "#eef6ff",
    fontSize: 13,
    lineHeight: 1.45,
  },
  bannerNote: {
    margin: 0,
    color: "#d6e8ff",
    fontSize: 13,
  },
  bannerSubnote: {
    margin: 0,
    color: "#a8c8eb",
    fontSize: 12,
  },
  panel: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 12,
    padding: 14,
    background: "var(--app-panel-bg)",
    display: "grid",
    gap: 10,
  },
  editorShell: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 12,
    padding: 12,
    background: "rgba(9, 13, 22, 0.95)",
    display: "grid",
    gap: 12,
  },
  editorModeBanner: {
    border: "1px solid rgba(174, 203, 237, 0.48)",
    borderRadius: 10,
    padding: "8px 10px",
    display: "grid",
    gap: 4,
    fontSize: 12,
    color: "#f2f8ff",
    background: "rgba(31, 49, 74, 0.7)",
  },
  editorMainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(210px, 0.85fr) minmax(420px, 1.9fr) minmax(280px, 1.1fr)",
    gap: 12,
    alignItems: "start",
  },
  editorLeftCol: {
    display: "grid",
    gap: 12,
  },
  editorCenterCol: {
    display: "grid",
    gap: 12,
  },
  editorRightCol: {
    display: "grid",
    gap: 12,
  },
  toolRailGrid: {
    display: "grid",
    gap: 8,
  },
  toolRailItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid var(--app-panel-border)",
    background: "rgba(20, 29, 46, 0.85)",
    color: "#f0f7ff",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  },
  toolRailItemActive: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #86caff",
    background: "rgba(36, 78, 120, 0.75)",
    color: "#f4faff",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  },
  viewportPanel: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 12,
    padding: 12,
    background: "rgba(7, 12, 22, 0.95)",
    display: "grid",
    gap: 10,
  },
  viewportModes: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  modeChip: {
    border: "1px solid rgba(173, 204, 238, 0.72)",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    color: "#f1f8ff",
    background: "rgba(46, 78, 116, 0.65)",
    cursor: "pointer",
  },
  modeChipActive: {
    border: "1px solid #86caff",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    color: "#f6fbff",
    background: "rgba(58, 118, 181, 0.74)",
    cursor: "pointer",
  },
  viewportCanvas: {
    position: "relative",
    minHeight: 360,
    border: "1px solid rgba(169, 198, 230, 0.52)",
    borderRadius: 10,
    background: "linear-gradient(180deg, rgba(28, 46, 69, 0.62), rgba(11, 18, 30, 0.94))",
    overflow: "hidden",
  },
  viewportGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage: "linear-gradient(rgba(173, 200, 232, 0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(173, 200, 232, 0.14) 1px, transparent 1px)",
    backgroundSize: "24px 24px",
  },
  viewportSilhouette: {
    position: "absolute",
    left: "50%",
    top: "52%",
    width: 200,
    height: 200,
    transform: "translate(-50%, -50%)",
    borderRadius: "46% 54% 42% 58% / 50% 42% 58% 50%",
    border: "2px solid rgba(224, 240, 255, 0.7)",
    background: "radial-gradient(circle at 30% 25%, rgba(200, 227, 255, 0.4), rgba(73, 109, 151, 0.1) 72%)",
    boxShadow: "0 0 30px rgba(128, 181, 240, 0.34)",
  },
  viewportLabel: {
    position: "absolute",
    left: 12,
    bottom: 10,
    margin: 0,
    fontSize: 12,
    color: "#f1f8ff",
    background: "rgba(4, 8, 15, 0.7)",
    padding: "5px 8px",
    borderRadius: 6,
  },
  editorCandidateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 10,
  },
  editorCandidateCard: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "rgba(12, 19, 32, 0.84)",
    display: "grid",
    gap: 8,
  },
  thumbnailPlaceholder: {
    minHeight: 88,
    borderRadius: 8,
    border: "1px dashed rgba(175, 204, 238, 0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#def0ff",
    fontSize: 12,
    background: "linear-gradient(135deg, rgba(53, 85, 123, 0.55), rgba(21, 33, 52, 0.78))",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  panelTitle: {
    margin: 0,
    fontSize: 18,
  },
  panelDetail: {
    margin: 0,
    color: "var(--app-subtle-color)",
    fontSize: 13,
    lineHeight: 1.45,
  },
  generationGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  labelBlock: {
    display: "grid",
    gap: 6,
    fontWeight: 700,
  },
  textarea: {
    width: "100%",
    minHeight: 132,
    resize: "vertical",
    borderRadius: 8,
    border: "1px solid var(--app-panel-border)",
    background: "var(--app-shell-bg)",
    color: "var(--app-text-color)",
    padding: "10px 11px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.4,
  },
  input: {
    width: "100%",
    minHeight: 34,
    borderRadius: 8,
    border: "1px solid var(--app-panel-border)",
    background: "var(--app-shell-bg)",
    color: "var(--app-text-color)",
    padding: "0 10px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    fontSize: 13,
    lineHeight: 1.3,
  },
  subheading: {
    margin: 0,
    fontSize: 14,
  },
  list: {
    margin: "6px 0 0 0",
    paddingLeft: 18,
    display: "grid",
    gap: 6,
    fontSize: 13,
    lineHeight: 1.4,
  },
  actionWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  inspectCard: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    display: "grid",
    gap: 8,
    background: "rgba(12, 17, 28, 0.4)",
  },
  providerRegistryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 10,
  },
  providerRegistryCard: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "rgba(13, 19, 31, 0.6)",
    display: "grid",
    gap: 8,
  },
  errorText: {
    margin: 0,
    fontSize: 12,
    color: "#ffd2d8",
  },
  checkboxLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "var(--app-text-color)",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
  },
  card: {
    border: "1px solid",
    borderRadius: 10,
    padding: 10,
    background: "rgba(13, 17, 26, 0.55)",
    display: "grid",
    gap: 8,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardDetail: {
    margin: 0,
    fontSize: 13,
    color: "var(--app-subtle-color)",
  },
  cardMicro: {
    margin: 0,
    fontSize: 12,
    color: "#d8e2ef",
  },
  demoNotice: {
    margin: 0,
    fontSize: 12,
    color: "#91c9ff",
  },
  timeline: {
    margin: 0,
    paddingLeft: 18,
    display: "grid",
    gap: 10,
  },
  timelineItem: {
    borderLeft: "2px solid rgba(120, 161, 214, 0.35)",
    paddingLeft: 10,
  },
  timelineRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
  },
  timelineTitle: {
    margin: "6px 0 2px 0",
    fontWeight: 600,
    fontSize: 13,
  },
  timelineDetail: {
    margin: 0,
    fontSize: 12,
    color: "var(--app-subtle-color)",
  },
  activeButton: {
    minHeight: 32,
    borderRadius: 8,
    border: "1px solid #86caff",
    background: "rgba(44, 129, 199, 0.3)",
    color: "#e8f4ff",
    fontWeight: 700,
    cursor: "pointer",
    padding: "0 10px",
  },
  secondaryButton: {
    minHeight: 32,
    borderRadius: 8,
    border: "1px solid var(--app-panel-border)",
    background: "var(--app-panel-elevated)",
    color: "var(--app-text-color)",
    fontWeight: 600,
    cursor: "pointer",
    padding: "0 10px",
  },
  disabledButton: {
    minHeight: 32,
    borderRadius: 8,
    border: "1px solid rgba(153, 157, 174, 0.45)",
    background: "rgba(57, 61, 78, 0.45)",
    color: "#c5cad9",
    fontWeight: 600,
    cursor: "not-allowed",
    padding: "0 10px",
  },
} satisfies Record<string, CSSProperties>;
