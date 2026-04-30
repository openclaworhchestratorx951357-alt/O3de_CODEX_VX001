import MissionTruthRail from "../MissionTruthRail";
import type { AdaptersResponse, O3DEBridgeStatus, ReadinessStatus } from "../../types/contracts";
import CockpitWorkspaceShell, {
  type CockpitBlockedCapability,
  type CockpitPipelineStep,
  type CockpitPromptTemplate,
  type CockpitToolCard,
} from "../cockpits/CockpitWorkspaceShell";

type CreateMovieWorkspaceViewProps = {
  onOpenPromptStudio?: () => void;
  onOpenAssetForge?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
  onLaunchPlacementProofTemplate?: () => void;
  onViewLatestRun?: () => void;
  onViewExecution?: () => void;
  onViewArtifact?: () => void;
  onViewEvidence?: () => void;
  bridgeStatus?: O3DEBridgeStatus | null;
  adapters?: AdaptersResponse | null;
  readiness?: ReadinessStatus | null;
  latestRunId?: string | null;
  latestExecutionId?: string | null;
  latestArtifactId?: string | null;
};

const pipelineSteps: CockpitPipelineStep[] = [
  {
    id: "story-shot-plan",
    name: "Story / Shot Plan",
    does: "Outline shots, mood, sequence, and camera intent.",
    truthState: "plan-only",
    blocker: "Full movie generation is not admitted.",
    nextSafeAction: "Draft planning prompt and capture assumptions.",
  },
  {
    id: "project-target",
    name: "Project Target",
    does: "Verify project, bridge, and adapter status before scene work.",
    truthState: "read-only / preflight",
    blocker: "Project registration and write actions are blocked.",
    nextSafeAction: "Inspect cinematic target in Prompt Studio.",
  },
  {
    id: "level-scene",
    name: "Level / Scene",
    does: "Open one known level scene through narrow admitted editor controls.",
    truthState: "admitted-real narrow",
    blocker: "Broad scene rewrites are blocked.",
    nextSafeAction: "Open level and create one safe placeholder entity.",
  },
  {
    id: "camera",
    name: "Camera",
    does: "Create placeholder camera entity with narrow editor lane support.",
    truthState: "admitted-real narrow",
    blocker: "Broad camera animation writes are not admitted.",
    nextSafeAction: "Create one camera placeholder and review evidence.",
  },
  {
    id: "characters-props",
    name: "Characters / Props",
    does: "Review staged candidates and placement proof-only prompts.",
    truthState: "proof-only / preflight",
    blocker: "Real placement write is non-admitted.",
    nextSafeAction: "Use proof-only placement candidate template.",
  },
  {
    id: "lighting-materials",
    name: "Lighting / Materials",
    does: "Track lookdev needs and blockers for later packets.",
    truthState: "blocked / read-only",
    blocker: "Material and render mutation require separate admission.",
    nextSafeAction: "Document requirements without mutating content.",
  },
  {
    id: "sequence-review",
    name: "Sequence / Review",
    does: "Review latest run/execution/artifact evidence and confidence.",
    truthState: "review / evidence",
    blocker: "Review alone does not admit runtime action.",
    nextSafeAction: "Open Records and verify bounded outcomes.",
  },
  {
    id: "render-export-later",
    name: "Render / Export Later",
    does: "Track future render/export workflow requirements.",
    truthState: "blocked / future",
    blocker: "Render/export automation is not admitted.",
    nextSafeAction: "Design a dedicated render admission corridor later.",
  },
];

const toolCards: CockpitToolCard[] = [
  {
    id: "inspect-cinematic-target",
    title: "Inspect Cinematic Target",
    truthState: "read-only",
    description: "Review current project and target readiness for cinematic work.",
    blocked: "No mutation performed by inspect.",
    nextSafeAction: "Run read-only inspect prompt.",
    actionLabel: "Open Prompt Studio",
  },
  {
    id: "camera-placeholder",
    title: "Create Camera Placeholder",
    truthState: "admitted-real narrow",
    description: "Create one root-level camera placeholder entity.",
    blocked: "Broad camera animation writes blocked.",
    nextSafeAction: "Use bounded camera placeholder prompt.",
    actionLabel: "Open Prompt Studio",
  },
  {
    id: "plan-scene-prop",
    title: "Plan Scene Prop",
    truthState: "plan-only",
    description: "Define prop target, level path, and evidence references.",
    blocked: "No automatic generation or placement writes.",
    nextSafeAction: "Open Asset Forge and review candidate lanes.",
    actionLabel: "Open Asset Forge",
  },
  {
    id: "placement-proof-only",
    title: "Placement Proof-Only Candidate",
    truthState: "proof-only / fail-closed",
    description: "Prepare bounded placement proof candidate for reviewable evidence.",
    blocked: "execution_admitted=false and placement_write_admitted=false.",
    nextSafeAction: "Use template in Prompt Studio and review fail-closed summary.",
    actionLabel: "Use placement proof template",
  },
  {
    id: "review-latest",
    title: "Review Latest Evidence",
    truthState: "review / evidence",
    description: "Inspect latest run/execution/artifact for cinematic intent progress.",
    blocked: "No mutation admitted by review.",
    nextSafeAction: "Open Records.",
    actionLabel: "Open Records",
  },
  {
    id: "open-prompt",
    title: "Open Prompt Studio",
    truthState: "mission launch",
    description: "Open prompt planning and execution surface for bounded actions.",
    blocked: "No auto-execution from cockpit buttons.",
    nextSafeAction: "Open Prompt Studio and preview plan.",
    actionLabel: "Open Prompt Studio",
  },
  {
    id: "open-records",
    title: "Open Records",
    truthState: "review",
    description: "Navigate to persisted records without hiding truth labels.",
    blocked: "No runtime effect.",
    nextSafeAction: "Review latest events and outcomes.",
    actionLabel: "Open Records",
  },
];

const promptTemplates: CockpitPromptTemplate[] = [
  {
    id: "inspect",
    label: "Template 1",
    truthLabels: "read-only",
    promptText: "Inspect the current O3DE project and summarize whether it is ready for a cinematic scene workflow. Do not mutate content.",
  },
  {
    id: "camera-placeholder",
    label: "Template 2",
    truthLabels: "admitted-real narrow editor lane",
    promptText: "Open level \"Levels/DefaultLevel\" in the editor and create one root-level entity named \"CinematicCameraPlaceholder\". Do not set parent_entity_id, prefab_asset, position, components, or properties.",
  },
  {
    id: "placement-proof",
    label: "Template 3",
    truthLabels: "proof-only / fail-closed / non-mutating / real placement not admitted",
    promptText: "In the editor, create a placement proof-only candidate with candidate_id \"candidate-a\", candidate_label \"Weathered Ivy Arch\", staged_source_relative_path \"Assets/Generated/asset_forge/candidate_a/candidate_a.glb\", target_level_relative_path \"Levels/BridgeLevel01/BridgeLevel01.prefab\", target_entity_name \"CinematicPropCandidateA\", target_component \"Mesh\", stage_write_evidence_reference \"packet-10/stage-write-evidence.json\", stage_write_readback_reference \"packet-10/readback-evidence.json\", stage_write_readback_status \"succeeded\", approval_state \"approved\", and approval_note \"bounded proof-only cinematic prop review\".",
  },
];

const blockedCapabilities: CockpitBlockedCapability[] = [
  {
    id: "full-movie-generation",
    label: "Full movie generation blocked",
    reason: "autonomous cinematic generation is outside admitted scope",
    nextUnlock: "future exact admission packet with reversible proof",
  },
  {
    id: "render-export",
    label: "Render/export automation blocked",
    reason: "render pipeline execution is not admitted",
    nextUnlock: "render corridor design with bounded runtime controls",
  },
  {
    id: "camera-animation",
    label: "Broad camera animation writes blocked",
    reason: "only narrow entity lane support is admitted",
    nextUnlock: "camera animation packet with readback and rollback proof",
  },
  {
    id: "material-mutation",
    label: "Material mutation blocked",
    reason: "high-risk lookdev writes remain non-admitted",
    nextUnlock: "material corridor with explicit approval and revert path",
  },
  {
    id: "lighting-mutation",
    label: "Lighting pipeline mutation blocked",
    reason: "render/lighting writes are not admitted",
    nextUnlock: "future bounded lighting mutation packet",
  },
  {
    id: "shader-pipeline",
    label: "Shader/render pipeline changes blocked",
    reason: "pipeline changes are high-risk and out of current scope",
    nextUnlock: "separate pipeline governance packet",
  },
  {
    id: "arbitrary-generation",
    label: "Arbitrary Blender/provider execution blocked",
    reason: "provider and Blender execution remain non-admitted",
    nextUnlock: "bounded execution corridors with explicit controls",
  },
];

export default function CreateMovieWorkspaceView({
  onOpenPromptStudio,
  onOpenAssetForge,
  onOpenRuntimeOverview,
  onOpenRecords,
  onLaunchPlacementProofTemplate,
  onViewLatestRun,
  onViewExecution,
  onViewArtifact,
  onViewEvidence,
  bridgeStatus,
  adapters,
  readiness,
  latestRunId,
  latestExecutionId,
  latestArtifactId,
}: CreateMovieWorkspaceViewProps) {
  const cardsWithActions = toolCards.map((card) => {
    if (card.actionLabel === "Open Asset Forge") {
      return { ...card, onAction: onOpenAssetForge };
    }
    if (card.actionLabel === "Open Records") {
      return { ...card, onAction: onOpenRecords };
    }
    if (card.actionLabel === "Use placement proof template") {
      return { ...card, onAction: onLaunchPlacementProofTemplate };
    }
    return { ...card, onAction: onOpenPromptStudio };
  });

  return (
    <CockpitWorkspaceShell
      title="Create Movie Cockpit"
      subtitle="Build cinematic scenes, shots, cameras, props, and review evidence through safe stages."
      truthLabel="cinematic mission cockpit / planning + narrow editor actions + proof-only placement support"
      missionPurpose="Keep cinematic work bounded: plan first, use narrow editor operations, then use proof-only placement and evidence review."
      commandActions={[
        { label: "Inspect Cinematic Target", onClick: onOpenPromptStudio },
        { label: "Open Prompt Studio", onClick: onOpenPromptStudio },
        { label: "Open Asset Forge", onClick: onOpenAssetForge },
        { label: "Open Runtime", onClick: onOpenRuntimeOverview },
        { label: "Open Records", onClick: onOpenRecords },
      ]}
      truthRail={(
        <MissionTruthRail
          locationLabel="Create Movie Cockpit"
          projectLabel="active cinematic target"
          projectPath={bridgeStatus?.project_root ?? null}
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
          nextSafeAction="Use proof-only placement templates for prop planning, then review evidence before any future admission request."
          onViewLatestRun={onViewLatestRun}
          onViewExecution={onViewExecution}
          onViewArtifact={onViewArtifact}
          onViewEvidence={onViewEvidence}
          onOpenPromptStudio={onOpenPromptStudio}
          onOpenRuntimeOverview={onOpenRuntimeOverview}
          onOpenRecords={onOpenRecords}
        />
      )}
      pipelineTitle="Cinematic pipeline"
      pipelineSteps={pipelineSteps}
      toolCardsTitle="Movie cockpit tools"
      toolCards={cardsWithActions}
      promptTemplates={promptTemplates}
      blockedCapabilities={blockedCapabilities}
      reviewNote="Placement proof-only remains fail-closed and non-mutating: execution_admitted=false, placement_write_admitted=false, mutation_occurred=false."
    />
  );
}
