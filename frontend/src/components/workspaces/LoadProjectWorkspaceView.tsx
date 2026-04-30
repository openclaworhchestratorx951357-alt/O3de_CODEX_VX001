import type { CSSProperties } from "react";

import MissionTruthRail from "../MissionTruthRail";
import type { PlacementProofOnlyReviewSnapshot } from "../../lib/promptPlacementProofOnlyReview";
import type { AdaptersResponse, O3DEBridgeStatus, ReadinessStatus } from "../../types/contracts";
import { inspectLoadProjectMissionPromptDraft } from "../../lib/missionPromptTemplates";
import CockpitWorkspaceShell, {
  type CockpitBlockedCapability,
  type CockpitPipelineStep,
  type CockpitPromptTemplate,
  type CockpitToolCard,
} from "../cockpits/CockpitWorkspaceShell";

type LoadProjectWorkspaceViewProps = {
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
  onOpenSettings?: () => void;
  onLaunchInspectTemplate?: () => void;
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

const checklistSteps: CockpitPipelineStep[] = [
  {
    id: "project-root-selected",
    name: "Project root selected",
    does: "Confirm active project root target.",
    truthState: "read-only",
    blocker: "Missing target means authoring assumptions are unknown.",
    nextSafeAction: "Run inspect prompt and check bridge project path.",
  },
  {
    id: "engine-root-selected",
    name: "Engine root selected",
    does: "Confirm engine root alignment for current target.",
    truthState: "read-only / preflight",
    blocker: "Engine root may be unavailable in this telemetry.",
    nextSafeAction: "Treat missing value as unknown and inspect before mutation.",
  },
  {
    id: "bridge-configured",
    name: "Editor bridge configured",
    does: "Verify bridge configuration and heartbeat freshness.",
    truthState: "preflight",
    blocker: "Bridge unavailable means runtime assumptions are stale.",
    nextSafeAction: "Open Runtime overview and refresh bridge state.",
  },
  {
    id: "heartbeat-fresh",
    name: "Heartbeat fresh or stale",
    does: "Check whether bridge heartbeat is fresh.",
    truthState: "preflight",
    blocker: "Stale heartbeat blocks confident authoring.",
    nextSafeAction: "Recover bridge health before admitted operations.",
  },
  {
    id: "adapter-mode-known",
    name: "Adapter mode known",
    does: "Confirm active adapter mode and execution boundary.",
    truthState: "preflight",
    blocker: "Unknown adapter mode blocks admission confidence.",
    nextSafeAction: "Refresh adapters and readiness status.",
  },
  {
    id: "capabilities-loaded",
    name: "Prompt capabilities loaded",
    does: "Confirm prompt capabilities can be inspected and planned.",
    truthState: "read-only",
    blocker: "Capability surface may be unavailable when runtime is stale.",
    nextSafeAction: "Open Prompt Studio and validate capability visibility.",
  },
  {
    id: "inspect-available",
    name: "Project inspect available",
    does: "Ensure read-only project inspect is available before edits.",
    truthState: "read-only",
    blocker: "No inspect evidence means no safe mutation starting point.",
    nextSafeAction: "Run inspect prompt and store evidence.",
  },
  {
    id: "next-safe-action",
    name: "Next safe action ready",
    does: "Choose the next mission cockpit based on current evidence.",
    truthState: "review / guidance",
    blocker: "Unknown target state blocks confident progression.",
    nextSafeAction: "Move to Create Game or Create Movie only after checks pass.",
  },
];

const toolCards: CockpitToolCard[] = [
  {
    id: "inspect-project",
    title: "Inspect Project",
    truthState: "read-only",
    description: "Open prompt workspace and inspect current project evidence.",
    blocked: "No mutation performed.",
    nextSafeAction: "Run read-only inspect prompt.",
    actionLabel: "Open Prompt Studio",
  },
  {
    id: "refresh-target",
    title: "Refresh Target Status",
    truthState: "preflight",
    description: "Refresh runtime telemetry and bridge/adapters status.",
    blocked: "Cannot fabricate missing telemetry.",
    nextSafeAction: "Open Runtime overview.",
    actionLabel: "Open Runtime Overview",
  },
  {
    id: "open-prompt",
    title: "Open Prompt Studio",
    truthState: "launch",
    description: "Open prompt controls with inspect-first posture.",
    blocked: "No auto-execution from cockpit.",
    nextSafeAction: "Open Prompt Studio and preview prompt plan.",
    actionLabel: "Open Prompt Studio",
  },
  {
    id: "open-runtime",
    title: "Open Runtime Overview",
    truthState: "runtime status",
    description: "Review bridge heartbeat, adapters, and readiness truth.",
    blocked: "No runtime mutation performed.",
    nextSafeAction: "Use runtime evidence to decide next cockpit step.",
    actionLabel: "Open Runtime Overview",
  },
  {
    id: "open-records",
    title: "Open Records",
    truthState: "review",
    description: "Inspect latest run/execution/artifact evidence.",
    blocked: "No mutation.",
    nextSafeAction: "Review evidence before authoring.",
    actionLabel: "Open Records",
  },
  {
    id: "open-settings",
    title: "Open Settings",
    truthState: "configuration",
    description: "Open app settings when target defaults need adjustment.",
    blocked: "No project file writes performed here.",
    nextSafeAction: "Adjust local app settings, then re-check runtime truth.",
    actionLabel: "Open Settings",
  },
];

const promptTemplates: CockpitPromptTemplate[] = [
  {
    id: "inspect-project",
    label: "Project inspection template",
    truthLabels: "read-only / no project file writes",
    promptText: inspectLoadProjectMissionPromptDraft.promptText,
  },
];

const blockedCapabilities: CockpitBlockedCapability[] = [
  {
    id: "select-project-folder",
    label: "Select project folder",
    reason: "future wiring; not admitted in this cockpit",
    nextUnlock: "explicit project-target selection packet",
  },
  {
    id: "validate-project-json",
    label: "Validate project.json writes",
    reason: "read-only target posture in this packet",
    nextUnlock: "bounded validation/write corridor",
  },
  {
    id: "register-project",
    label: "Register project",
    reason: "blocked until a dedicated admitted path exists",
    nextUnlock: "project registration packet with rollback proof",
  },
  {
    id: "create-new-project",
    label: "Create new project",
    reason: "blocked until explicit admission and constraints",
    nextUnlock: "future create-project admission corridor",
  },
  {
    id: "gem-mutation",
    label: "Enable/disable Gems",
    reason: "Gem mutation is out of scope and blocked",
    nextUnlock: "separate Gem governance packet",
  },
  {
    id: "build-preflight",
    label: "Build configure preflight",
    reason: "future preflight only; not admitted here",
    nextUnlock: "dedicated build preflight packet",
  },
  {
    id: "build-export",
    label: "Real build/export",
    reason: "build/export execution blocked",
    nextUnlock: "future admitted build corridor",
  },
];

function valueOrUnknown(value: string | null | undefined, fallback = "unknown"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export default function LoadProjectWorkspaceView({
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenRecords,
  onOpenSettings,
  onLaunchInspectTemplate,
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
}: LoadProjectWorkspaceViewProps) {
  const cardsWithActions = toolCards.map((card) => {
    if (card.actionLabel === "Open Runtime Overview") {
      return { ...card, onAction: onOpenRuntimeOverview };
    }
    if (card.actionLabel === "Open Records") {
      return { ...card, onAction: onOpenRecords };
    }
    if (card.actionLabel === "Open Settings") {
      return { ...card, onAction: onOpenSettings };
    }
    return { ...card, onAction: onOpenPromptStudio };
  });

  const summaryProjectPath = valueOrUnknown(bridgeStatus?.project_root, "not loaded");
  const summaryEngineRoot = "unknown";
  const summarySource = valueOrUnknown(bridgeStatus?.source_label, "unavailable");
  const summaryBridge = bridgeStatus
    ? `${bridgeStatus.configured ? "configured" : "not configured"}; heartbeat ${bridgeStatus.heartbeat_fresh ? "fresh" : "stale"}`
    : "bridge status unavailable";
  const summaryAdapterMode = valueOrUnknown(adapters?.active_mode ?? readiness?.adapter_mode.active_mode, "adapter status unavailable");
  const summaryReadiness = readiness
    ? readiness.ok ? "ready" : "not ready"
    : "not loaded";

  const promptTemplatesWithAction: CockpitPromptTemplate[] = promptTemplates.map((template) => ({
    ...template,
    actionLabel: "Load project inspect template in Prompt Studio",
    onAction: onLaunchInspectTemplate,
  }));

  const targetSummary = (
    <div style={summaryStackStyle}>
      <section aria-label="Load Project target summary" style={summaryCardStyle}>
        <strong>Current target summary</strong>
        <p style={summaryDetailStyle}><strong>Active project path:</strong> {summaryProjectPath}</p>
        <p style={summaryDetailStyle}><strong>Engine root:</strong> {summaryEngineRoot}</p>
        <p style={summaryDetailStyle}><strong>Source label:</strong> {summarySource}</p>
        <p style={summaryDetailStyle}><strong>Editor bridge status:</strong> {summaryBridge}</p>
        <p style={summaryDetailStyle}><strong>Adapter mode:</strong> {summaryAdapterMode}</p>
        <p style={summaryDetailStyle}><strong>Readiness:</strong> {summaryReadiness}</p>
        <p style={summaryDetailStyle}><strong>Latest run:</strong> {latestRunId ?? "no latest run selected"}</p>
        <p style={summaryDetailStyle}><strong>Latest execution:</strong> {latestExecutionId ?? "no latest execution selected"}</p>
        <p style={summaryDetailStyle}><strong>Latest artifact:</strong> {latestArtifactId ?? "no latest artifact selected"}</p>
      </section>
      <MissionTruthRail
        locationLabel="Load Project Cockpit"
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
        nextSafeAction="Run a read-only inspect prompt before moving into Create Game or Create Movie cockpit actions."
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
    </div>
  );

  return (
    <CockpitWorkspaceShell
      cockpitId="load-project"
      title="Load Project Cockpit"
      subtitle="Connect, inspect, and verify the active O3DE project target before authoring."
      truthLabel="read-only / configuration preflight cockpit"
      missionPurpose="Prove target assumptions first; keep unknown values explicit; then launch bounded authoring from verified state."
      commandActions={[
        { label: "Inspect Project", onClick: onOpenPromptStudio },
        { label: "Refresh Target Status", onClick: onOpenRuntimeOverview },
        { label: "Open Prompt Studio", onClick: onOpenPromptStudio },
        { label: "Open Runtime", onClick: onOpenRuntimeOverview },
        { label: "Open Records", onClick: onOpenRecords },
        { label: "Open Settings", onClick: onOpenSettings },
      ]}
      truthRail={targetSummary}
      pipelineTitle="Project connection checklist"
      pipelineSteps={checklistSteps}
      toolCardsTitle="Load Project tools"
      toolCards={cardsWithActions}
      promptTemplates={promptTemplatesWithAction}
      blockedCapabilities={blockedCapabilities}
      reviewNote="This workspace does not create/register projects, write project files, enable/disable Gems, or run build/export automation."
    />
  );
}

const summaryStackStyle = {
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const summaryCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  background: "var(--app-panel-bg)",
  padding: 12,
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const summaryDetailStyle = {
  margin: 0,
  fontSize: 13,
  color: "var(--app-subtle-color)",
} satisfies CSSProperties;
