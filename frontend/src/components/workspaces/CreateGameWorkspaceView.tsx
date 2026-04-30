import MissionTruthRail from "../MissionTruthRail";
import type { PlacementProofOnlyReviewSnapshot } from "../../lib/promptPlacementProofOnlyReview";
import type { AdaptersResponse, O3DEBridgeStatus, ReadinessStatus } from "../../types/contracts";
import {
  addAllowlistedMeshMissionPromptDraft,
  createGameEntityMissionPromptDraft,
  inspectProjectMissionPromptDraft,
} from "../../lib/missionPromptTemplates";
import CockpitWorkspaceShell, {
  type CockpitAction,
  type CockpitBlockedCapability,
  type CockpitPipelineStep,
  type CockpitPromptTemplate,
  type CockpitToolCard,
} from "../cockpits/CockpitWorkspaceShell";

type CreateGameWorkspaceViewProps = {
  onOpenPromptStudio?: () => void;
  onOpenAssetForge?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
  commandActions?: CockpitAction[];
  toolActionHandlers?: Partial<Record<string, (() => void) | undefined>>;
  onLaunchInspectTemplate?: () => void;
  onLaunchCreateEntityTemplate?: () => void;
  onLaunchAddMeshTemplate?: () => void;
  onViewLatestRun?: () => void;
  onViewExecution?: () => void;
  onViewArtifact?: () => void;
  onViewEvidence?: () => void;
  onOpenPromptSessionDetail?: (promptId: string) => void;
  onOpenExecutionDetail?: (executionId: string) => void;
  onOpenArtifactDetail?: (artifactId: string) => void;
  onOpenRunDetail?: (runId: string) => void;
  bridgeStatus?: O3DEBridgeStatus | null;
  adapters?: AdaptersResponse | null;
  readiness?: ReadinessStatus | null;
  latestRunId?: string | null;
  latestExecutionId?: string | null;
  latestArtifactId?: string | null;
  latestPlacementProofOnlyReview?: PlacementProofOnlyReviewSnapshot | null;
};

const pipelineSteps: CockpitPipelineStep[] = [
  {
    id: "concept",
    name: "Concept",
    does: "Define genre, objective, player fantasy, and core gameplay loop.",
    truthState: "plan-only",
    blocker: "Full automatic game generation is not admitted.",
    nextSafeAction: "Inspect project or draft a read-only planning prompt.",
  },
  {
    id: "project-target",
    name: "Project Target",
    does: "Verify project root assumptions, bridge status, and adapter mode.",
    truthState: "read-only / preflight",
    blocker: "Project creation and registration are not admitted here.",
    nextSafeAction: "Run a read-only project.inspect prompt.",
  },
  {
    id: "level",
    name: "Level",
    does: "Open one known level through typed editor-control planning.",
    truthState: "admitted-real narrow",
    blocker: "Broad level generation and destructive rewrites are blocked.",
    nextSafeAction: "Open level or create one safe test entity.",
  },
  {
    id: "gameplay-entities",
    name: "Gameplay Entities",
    does: "Create one root-level named entity through admitted editor lanes.",
    truthState: "admitted-real narrow",
    blocker: "Hierarchy rewrites, prefab creation, and deletes are blocked.",
    nextSafeAction: "Create a single safe test entity and verify readback.",
  },
  {
    id: "components",
    name: "Components",
    does: "Add allowlisted components such as Mesh through typed planning.",
    truthState: "admitted-real allowlisted",
    blocker: "Arbitrary component names and property writes are blocked.",
    nextSafeAction: "Request one allowlisted component add with evidence readback.",
  },
  {
    id: "assets",
    name: "Assets",
    does: "Open Asset Forge candidate lanes and staged evidence context.",
    truthState: "plan-only / proof-only",
    blocker: "Broad asset and material mutation are blocked.",
    nextSafeAction: "Open Asset Forge and keep generation/placement truth labels explicit.",
  },
  {
    id: "validation",
    name: "Validation",
    does: "Review runs, executions, and evidence before widening scope.",
    truthState: "preflight / reporting",
    blocker: "Broad build/test execution is not admitted in this cockpit.",
    nextSafeAction: "Open Runtime and Records for evidence review.",
  },
  {
    id: "review-continue",
    name: "Review / Continue",
    does: "Summarize latest run/execution/artifact and choose one next safe packet.",
    truthState: "review / evidence",
    blocker: "Review alone does not authorize mutation.",
    nextSafeAction: "Pick one bounded next action and keep admission explicit.",
  },
];

const toolCards: CockpitToolCard[] = [
  {
    id: "inspect-project",
    title: "Inspect Project",
    truthState: "read-only",
    description: "Gather target evidence and active level assumptions.",
    blocked: "No project or scene mutation requested.",
    nextSafeAction: "Open Prompt Studio with a read-only inspect prompt.",
    actionLabel: "Open Prompt Studio",
  },
  {
    id: "open-editor-session",
    title: "Open Editor Session",
    truthState: "admitted-real narrow",
    description: "Prepare one bounded editor session for typed workflow steps.",
    blocked: "Arbitrary script execution is blocked.",
    nextSafeAction: "Use typed planner capabilities only.",
    actionLabel: "Open Prompt Studio",
  },
  {
    id: "open-level",
    title: "Open Level",
    truthState: "admitted-real narrow",
    description: "Open one known level path through admitted planning lanes.",
    blocked: "Broad level rewrite and generation remain blocked.",
    nextSafeAction: "Request one exact level open step.",
    actionLabel: "Open Prompt Studio",
  },
  {
    id: "create-safe-entity",
    title: "Create Safe Entity",
    truthState: "admitted-real narrow",
    description: "Create one root-level named entity with bounded arguments.",
    blocked: "Prefab mutation and hierarchy rewrites remain blocked.",
    nextSafeAction: "Create entity and verify readback.",
    actionLabel: "Open Prompt Studio",
  },
  {
    id: "add-component",
    title: "Add Allowlisted Component",
    truthState: "admitted-real allowlisted",
    description: "Add allowlisted component types such as Mesh only.",
    blocked: "Arbitrary component or property writes are blocked.",
    nextSafeAction: "Request one allowlisted component add.",
    actionLabel: "Open Prompt Studio",
  },
  {
    id: "open-asset-forge",
    title: "Open Asset Forge",
    truthState: "plan-only / proof-only",
    description: "Review candidate/stage/proof-only placement context.",
    blocked: "Provider generation and placement writes remain blocked.",
    nextSafeAction: "Use Asset Forge pipeline labels and evidence links.",
    actionLabel: "Open Asset Forge",
  },
  {
    id: "review-run",
    title: "Review Latest Run",
    truthState: "review / evidence",
    description: "Inspect persisted run/execution/artifact truth before continuing.",
    blocked: "Review does not admit runtime mutation.",
    nextSafeAction: "Open Records and inspect evidence.",
    actionLabel: "Open Records",
  },
  {
    id: "open-prompt",
    title: "Open Prompt Studio",
    truthState: "mission launch",
    description: "Launch prompt planning/execution with admitted or proof-only boundaries.",
    blocked: "No auto-execution from cockpit buttons.",
    nextSafeAction: "Open Prompt Studio and preview plan first.",
    actionLabel: "Open Prompt Studio",
  },
];

const blockedCapabilities: CockpitBlockedCapability[] = [
  {
    id: "full-game-generation",
    label: "Full game generation blocked",
    reason: "broad autonomous generation is outside admitted boundaries",
    nextUnlock: "separate exact admission packet with reversible proof",
  },
  {
    id: "arbitrary-asset-generation",
    label: "Arbitrary asset generation blocked",
    reason: "provider generation execution is not admitted",
    nextUnlock: "bounded provider corridor with explicit spend/runtime controls",
  },
  {
    id: "arbitrary-component-writes",
    label: "Arbitrary component writes blocked",
    reason: "only allowlisted component lanes are admitted",
    nextUnlock: "typed allowlist expansion with readback and rollback proof",
  },
  {
    id: "prefab-mutation",
    label: "Prefab mutation blocked",
    reason: "high-risk scene mutation remains non-admitted",
    nextUnlock: "separate prefab corridor with revert/restore proof",
  },
  {
    id: "broad-level-rewrite",
    label: "Broad level rewriting blocked",
    reason: "destructive or wide transforms are out of scope",
    nextUnlock: "exact bounded level mutation packet",
  },
  {
    id: "build-export-shipping",
    label: "Build/export/shipping blocked",
    reason: "release automation and packaging are not admitted in this cockpit",
    nextUnlock: "dedicated build corridor with controlled runtime gates",
  },
  {
    id: "arbitrary-scripts",
    label: "Arbitrary scripts blocked",
    reason: "typed planner only; arbitrary shell/python/editor scripts are forbidden",
    nextUnlock: "future bounded script admission with explicit review",
  },
];

export default function CreateGameWorkspaceView({
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenRecords,
  commandActions,
  toolActionHandlers,
  onLaunchInspectTemplate,
  onLaunchCreateEntityTemplate,
  onLaunchAddMeshTemplate,
  onViewLatestRun,
  onViewExecution,
  onViewArtifact,
  onViewEvidence,
  onOpenPromptSessionDetail,
  onOpenExecutionDetail,
  onOpenArtifactDetail,
  onOpenRunDetail,
  bridgeStatus,
  adapters,
  readiness,
  latestRunId,
  latestExecutionId,
  latestArtifactId,
  latestPlacementProofOnlyReview,
}: CreateGameWorkspaceViewProps) {
  const cardsWithActions = toolCards.map((card) => ({
    ...card,
    onAction: toolActionHandlers?.[card.id] ?? onOpenPromptStudio,
  }));

  const promptTemplates: CockpitPromptTemplate[] = [
    {
      id: "inspect",
      label: "Template 1",
      truthLabels: "read-only",
      promptText: inspectProjectMissionPromptDraft.promptText,
      actionLabel: "Load inspect template in Prompt Studio",
      onAction: onLaunchInspectTemplate,
    },
    {
      id: "create-entity",
      label: "Template 2",
      truthLabels: "admitted-real narrow editor lane",
      promptText: createGameEntityMissionPromptDraft.promptText,
      actionLabel: "Load create-entity template in Prompt Studio",
      onAction: onLaunchCreateEntityTemplate,
    },
    {
      id: "add-mesh",
      label: "Template 3",
      truthLabels: "allowlisted editor component lane",
      promptText: addAllowlistedMeshMissionPromptDraft.promptText,
      actionLabel: "Load add-Mesh template in Prompt Studio",
      onAction: onLaunchAddMeshTemplate,
    },
  ];

  return (
    <CockpitWorkspaceShell
      cockpitId="create-game"
      title="Create Game Cockpit"
      subtitle="Build an O3DE game through safe prompt-driven stages."
      truthLabel="mission cockpit / narrow admitted editor actions + read-only and preflight support"
      missionPurpose="Start from concept, move through bounded editor actions, and keep evidence-first review before any future scope expansion."
      commandActions={commandActions ?? []}
      truthRail={(
        <MissionTruthRail
          locationLabel="Create Game Cockpit"
          projectLabel="active project target"
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
          latestPlacementProofOnlyReview={latestPlacementProofOnlyReview ?? null}
          nextSafeAction="Run one bounded prompt step, review evidence, then choose one next narrow action."
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
      )}
      pipelineTitle="Game creation pipeline"
      pipelineSteps={pipelineSteps}
      toolCardsTitle="Game cockpit tools"
      toolCards={cardsWithActions}
      promptTemplates={promptTemplates}
      blockedCapabilities={blockedCapabilities}
      reviewNote="This cockpit does not admit broad mutation; keep each action bounded and evidence-backed."
    />
  );
}
