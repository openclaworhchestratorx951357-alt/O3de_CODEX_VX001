import MissionTruthRail from "../MissionTruthRail";
import type { CSSProperties } from "react";
import type { PlacementProofOnlyReviewSnapshot } from "../../lib/promptPlacementProofOnlyReview";
import type { AdaptersResponse, O3DEBridgeStatus, ReadinessStatus } from "../../types/contracts";
import {
  cinematicPlacementProofOnlyMissionPromptDraft,
  createCinematicCameraPlaceholderMissionPromptDraft,
  inspectCinematicTargetMissionPromptDraft,
} from "../../lib/missionPromptTemplates";
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
  onLaunchInspectTemplate?: () => void;
  onLaunchCameraTemplate?: () => void;
  onLaunchPlacementProofTemplate?: () => void;
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
  onLaunchInspectTemplate,
  onLaunchCameraTemplate,
  onLaunchPlacementProofTemplate,
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

  const promptTemplates: CockpitPromptTemplate[] = [
    {
      id: "inspect",
      label: "Template 1",
      truthLabels: "read-only",
      promptText: inspectCinematicTargetMissionPromptDraft.promptText,
      actionLabel: "Load cinematic inspect template in Prompt Studio",
      onAction: onLaunchInspectTemplate,
    },
    {
      id: "camera-placeholder",
      label: "Template 2",
      truthLabels: "admitted-real narrow editor lane",
      promptText: createCinematicCameraPlaceholderMissionPromptDraft.promptText,
      actionLabel: "Load camera placeholder template in Prompt Studio",
      onAction: onLaunchCameraTemplate,
    },
    {
      id: "placement-proof",
      label: "Template 3",
      truthLabels: "proof-only / fail-closed / non-mutating / real placement not admitted",
      promptText: cinematicPlacementProofOnlyMissionPromptDraft.promptText,
      actionLabel: "Load placement proof-only template in Prompt Studio",
      onAction: onLaunchPlacementProofTemplate,
    },
  ];

  return (
    <CockpitWorkspaceShell
      cockpitId="create-movie"
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
      primaryViewport={(
        <section style={viewerShellStyle} aria-label="Cinematic viewport">
          <header style={viewerHeaderStyle}>
            <strong>Blender-Style Program Viewer</strong>
            <span style={viewerBadgeStyle}>Asset Forge cockpit visual parity</span>
          </header>
          <div style={viewerStageStyle}>
            <aside style={viewerRailStyle}>
              <strong>Outliner</strong>
              <span>Scene Collection</span>
              <span>Camera_Main</span>
              <span>Character_A</span>
              <span>Prop_LightRig</span>
            </aside>
            <div style={viewerCanvasFrameStyle}>
              <div style={viewerCanvasStyle} aria-label="Cinematic viewer canvas">
                <div style={viewerTopBarStyle}>
                  <span>Shading: Solid</span>
                  <span>View: Perspective</span>
                  <span>Overlays: On</span>
                </div>
                <div style={viewerCenterMarkStyle}>LIVE CINEMATIC PREVIEW</div>
                <div style={viewerBottomBarStyle}>
                  <span>Frame 124 / 480</span>
                  <span>24 fps</span>
                  <span>Camera Lock</span>
                </div>
              </div>
            </div>
            <aside style={viewerRailStyle}>
              <strong>Properties</strong>
              <span>Lens: 35mm</span>
              <span>Exposure: +0.20</span>
              <span>DOF: Enabled</span>
              <span>Render: Filmic</span>
            </aside>
          </div>
          <footer style={timelineStripStyle}>
            <span>Timeline</span>
            <span>|IN 96</span>
            <span>PLAYHEAD 124</span>
            <span>OUT 156|</span>
            <span>Zoom 1:1</span>
          </footer>
        </section>
      )}
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
          latestPlacementProofOnlyReview={latestPlacementProofOnlyReview ?? null}
          nextSafeAction="Use proof-only placement templates for prop planning, then review evidence before any future admission request."
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

const viewerShellStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  background: "var(--app-panel-bg-muted)",
  display: "grid",
  gap: 8,
  padding: 10,
  minHeight: 300,
} satisfies CSSProperties;

const viewerHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const viewerBadgeStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 999,
  padding: "2px 9px",
  fontSize: 11,
  textTransform: "uppercase",
  background: "var(--app-panel-elevated)",
} satisfies CSSProperties;

const viewerStageStyle = {
  display: "grid",
  gridTemplateColumns: "146px minmax(0, 1fr) 146px",
  gap: 8,
  minHeight: 340,
} satisfies CSSProperties;

const viewerRailStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  background: "var(--app-panel-bg-alt)",
  padding: 8,
  display: "grid",
  alignContent: "start",
  gap: 6,
  fontSize: 12,
} satisfies CSSProperties;

const viewerCanvasFrameStyle = {
  minWidth: 0,
  minHeight: 0,
  display: "grid",
  placeItems: "center",
  padding: 4,
} satisfies CSSProperties;

const viewerCanvasStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  background:
    "linear-gradient(180deg, rgba(19, 31, 49, 0.95) 0%, rgba(11, 20, 34, 0.95) 100%)",
  display: "grid",
  gridTemplateRows: "auto 1fr auto",
  width: "100%",
  maxWidth: "min(68vh, 100%)",
  aspectRatio: "1 / 1",
  minHeight: 280,
} satisfies CSSProperties;

const viewerTopBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  padding: "7px 9px",
  borderBottom: "1px solid var(--app-panel-border)",
  fontSize: 12,
  color: "var(--app-subtle-color)",
} satisfies CSSProperties;

const viewerCenterMarkStyle = {
  display: "grid",
  placeItems: "center",
  fontSize: 14,
  letterSpacing: 1.2,
  color: "#d5e7ff",
  fontWeight: 700,
} satisfies CSSProperties;

const viewerBottomBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  padding: "7px 9px",
  borderTop: "1px solid var(--app-panel-border)",
  fontSize: 12,
  color: "var(--app-subtle-color)",
} satisfies CSSProperties;

const timelineStripStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  background: "var(--app-panel-bg-alt)",
  padding: "7px 10px",
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  fontSize: 12,
  color: "var(--app-subtle-color)",
  flexWrap: "wrap",
} satisfies CSSProperties;
