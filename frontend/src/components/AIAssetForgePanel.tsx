import { useEffect, useMemo, useState, type CSSProperties } from "react";

import AssetForgeStudioPacket01 from "./AssetForgeStudioPacket01";
import AssetForgeGuidedPipeline from "./AssetForgeGuidedPipeline";
import MissionTruthRail from "./MissionTruthRail";
import DockableCockpitLayout from "./cockpits/DockableCockpitLayout";
import { getCockpitLayoutDefaults } from "./cockpits/cockpitLayoutDefaults";
import type { CockpitPanelDefinition } from "./cockpits/cockpitLayoutTypes";
import type { PlacementProofOnlyReviewSnapshot } from "../lib/promptPlacementProofOnlyReview";
import {
  fetchAssetForgeBlenderStatus,
  fetchAssetForgeProviderStatus,
  fetchAssetForgeTask,
} from "../lib/api";
import type {
  AdaptersResponse,
  AssetForgeBlenderStatusRecord,
  AssetForgeProviderStatusRecord,
  AssetForgeTaskRecord,
  O3DEBridgeStatus,
  ReadinessStatus,
  ToolPolicy,
} from "../types/contracts";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

type AIAssetForgePanelProps = {
  projectProfile?: O3DEProjectProfile;
  onOpenPromptStudio?: () => void;
  onLaunchInspectTemplate?: () => void;
  onLaunchPlacementProofTemplate?: () => void;
  promptTemplateActionHandlers?: Partial<Record<string, (() => void) | undefined>>;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  reviewPacketData?: unknown;
  reviewPacketSource?: string;
  bridgeStatus?: O3DEBridgeStatus | null;
  policies?: ToolPolicy[];
  policiesLoading?: boolean;
  policiesError?: string | null;
  readiness?: ReadinessStatus | null;
  readinessLoading?: boolean;
  readinessError?: string | null;
  adapters?: AdaptersResponse | null;
  adaptersLoading?: boolean;
  adaptersError?: string | null;
  latestRunId?: string | null;
  latestExecutionId?: string | null;
  latestArtifactId?: string | null;
  latestPlacementProofOnlyReview?: PlacementProofOnlyReviewSnapshot | null;
  onViewLatestRun?: () => void;
  onViewExecution?: () => void;
  onViewArtifact?: () => void;
  onViewEvidence?: () => void;
  onOpenPromptSessionDetail?: (promptId: string) => void;
  onOpenExecutionDetail?: (executionId: string) => void;
  onOpenArtifactDetail?: (artifactId: string) => void;
  onOpenRunDetail?: (runId: string) => void;
  onOpenRecords?: () => void;
};

export default function AIAssetForgePanel(props: AIAssetForgePanelProps) {
  const layoutDefaults = getCockpitLayoutDefaults("asset-forge");
  const [taskModel, setTaskModel] = useState<AssetForgeTaskRecord | null>(null);
  const [providerStatus, setProviderStatus] = useState<AssetForgeProviderStatusRecord | null>(null);
  const [blenderStatus, setBlenderStatus] = useState<AssetForgeBlenderStatusRecord | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTaskModel() {
      try {
        const payload = await fetchAssetForgeTask();
        if (isActive) {
          setTaskModel(payload);
        }
      } catch {
        if (isActive) {
          setTaskModel(null);
        }
      }
    }

    async function loadProviderStatus() {
      try {
        const payload = await fetchAssetForgeProviderStatus();
        if (isActive) {
          setProviderStatus(payload);
        }
      } catch {
        if (isActive) {
          setProviderStatus(null);
        }
      }
    }

    async function loadBlenderStatus() {
      try {
        const payload = await fetchAssetForgeBlenderStatus();
        if (isActive) {
          setBlenderStatus(payload);
        }
      } catch {
        if (isActive) {
          setBlenderStatus(null);
        }
      }
    }

    void Promise.allSettled([
      loadTaskModel(),
      loadProviderStatus(),
      loadBlenderStatus(),
    ]);

    return () => {
      isActive = false;
    };
  }, []);

  const cockpitPanels = useMemo<CockpitPanelDefinition[]>(() => [
    {
      id: "asset-forge-command-strip",
      title: "Asset Forge command strip",
      subtitle: "Compact workflow posture with safe launch actions",
      truthState: "plan-only / preflight / proof-only",
      defaultZone: "top",
      collapsible: true,
      scrollMode: "content",
      priority: "tools",
      minHeight: 110,
      defaultHeight: 136,
      render: () => (
        <AssetForgeCommandStrip
          onOpenPromptStudio={props.onOpenPromptStudio}
          onOpenRuntimeOverview={props.onOpenRuntimeOverview}
          onOpenRecords={props.onOpenRecords}
          onViewEvidence={props.onViewEvidence}
        />
      ),
    },
    {
      id: "asset-forge-tools-outliner",
      title: "Tools, candidates, and outliner",
      subtitle: "Left dock for tool mode, candidate shortlist, and target outliner posture",
      truthState: "read-only / plan-only",
      defaultZone: "left",
      collapsible: true,
      scrollMode: "content",
      priority: "tools",
      minWidth: 240,
      minHeight: 280,
      defaultHeight: 400,
      render: () => (
        <AssetForgeToolsOutlinerPanel
          taskModel={taskModel}
          providerStatus={providerStatus}
          onOpenPromptStudio={props.onOpenPromptStudio}
          onLaunchInspectTemplate={
            props.promptTemplateActionHandlers?.["inspect-project"] ?? props.onLaunchInspectTemplate
          }
          onLaunchPlacementProofTemplate={
            props.promptTemplateActionHandlers?.["placement-proof-only"] ?? props.onLaunchPlacementProofTemplate
          }
        />
      ),
    },
    {
      id: "asset-forge-truth-rail",
      title: "Mission truth rail",
      subtitle: "Safety, readiness, and latest evidence context",
      truthState: "status/evidence",
      defaultZone: "right",
      collapsible: true,
      scrollMode: "content",
      priority: "status",
      minWidth: 260,
      minHeight: 260,
      defaultHeight: 300,
      render: () => (
        <MissionTruthRail
          locationLabel="Asset Forge"
          projectLabel={props.projectProfile?.name ?? "unknown project"}
          projectPath={props.projectProfile?.projectRoot ?? props.bridgeStatus?.project_root ?? null}
          bridgeStatus={props.bridgeStatus}
          adapters={props.adapters}
          readiness={props.readiness}
          currentExecutionMode={props.readiness?.execution_mode ?? null}
          executionAdmitted={false}
          placementWriteAdmitted={false}
          mutationOccurred={false}
          latestRunId={props.latestRunId ?? null}
          latestExecutionId={props.latestExecutionId ?? null}
          latestArtifactId={props.latestArtifactId ?? null}
          latestPlacementProofOnlyReview={props.latestPlacementProofOnlyReview ?? null}
          nextSafeAction="Open Prompt Studio and run the bounded placement proof-only template, then review persisted evidence."
          onViewLatestRun={props.onViewLatestRun}
          onViewExecution={props.onViewExecution}
          onViewArtifact={props.onViewArtifact}
          onViewEvidence={props.onViewEvidence}
          onOpenPromptStudio={props.onOpenPromptStudio}
          onOpenRuntimeOverview={props.onOpenRuntimeOverview}
          onOpenRecords={props.onOpenRecords}
          onOpenPromptSessionDetail={props.onOpenPromptSessionDetail}
          onOpenExecutionDetail={props.onOpenExecutionDetail}
          onOpenArtifactDetail={props.onOpenArtifactDetail}
          onOpenRunDetail={props.onOpenRunDetail}
        />
      ),
    },
    {
      id: "asset-forge-inspector-blockers",
      title: "Inspector and blockers",
      subtitle: "Selected target assumptions, blocked lanes, and next unlock guidance",
      truthState: "blocked / preflight",
      defaultZone: "right",
      collapsible: true,
      scrollMode: "content",
      priority: "status",
      minWidth: 260,
      minHeight: 210,
      defaultHeight: 250,
      render: () => (
        <AssetForgeInspectorPanel
          projectLabel={props.projectProfile?.name ?? "unknown project"}
          providerStatus={providerStatus}
          blenderStatus={blenderStatus}
          bridgeStatus={props.bridgeStatus
            ? (props.bridgeStatus.configured ? "configured" : "not configured")
            : "unknown"}
          adaptersMode={props.adapters?.active_mode ?? "unknown"}
        />
      ),
    },
    {
      id: "asset-forge-evidence-drawer",
      title: "Evidence, prompts, and logs drawer",
      subtitle: "Bottom drawer for proof-only templates, evidence links, and fail-closed explanations",
      truthState: "proof-only / fail-closed / review",
      defaultZone: "bottom",
      collapsible: true,
      scrollMode: "content",
      priority: "evidence",
      minHeight: 180,
      defaultHeight: 210,
      render: () => (
        <section aria-label="Asset Forge evidence drawer" style={evidenceDrawerStyle}>
          <div style={evidenceDrawerActionRowStyle}>
            <button type="button" onClick={props.onViewLatestRun} disabled={!props.onViewLatestRun} style={evidenceDrawerButtonStyle}>
              View latest run
            </button>
            <button type="button" onClick={props.onViewExecution} disabled={!props.onViewExecution} style={evidenceDrawerButtonStyle}>
              View latest execution
            </button>
            <button type="button" onClick={props.onViewArtifact} disabled={!props.onViewArtifact} style={evidenceDrawerButtonStyle}>
              View latest artifact
            </button>
            <button type="button" onClick={props.onViewEvidence} disabled={!props.onViewEvidence} style={evidenceDrawerButtonStyle}>
              Open evidence index
            </button>
          </div>
          <p style={evidenceDrawerDetailStyle}>
            Proof-only placement remains fail-closed and non-mutating: execution admitted is `no`, placement write admitted is `no`,
            and broad mutation surfaces are blocked.
          </p>
          <AssetForgeGuidedPipeline
            onOpenPromptStudio={props.onOpenPromptStudio}
            onLaunchInspectTemplate={props.onLaunchInspectTemplate}
            onLaunchPlacementProofTemplate={props.onLaunchPlacementProofTemplate}
            promptTemplateActionHandlers={props.promptTemplateActionHandlers}
            onOpenRuntimeOverview={props.onOpenRuntimeOverview}
            onOpenRecords={props.onOpenRecords}
            onViewEvidence={props.onViewEvidence}
          />
        </section>
      ),
    },
    {
      id: "asset-forge-studio",
      title: "Asset Forge studio",
      subtitle: "Candidate workspace, bounded tools, and evidence-driven review surfaces",
      truthState: "mission workspace",
      defaultZone: "center",
      collapsible: true,
      scrollMode: "content",
      priority: "primary",
      minWidth: 520,
      minHeight: 360,
      defaultHeight: 620,
      render: () => (
        <AssetForgeStudioPacket01
          projectProfile={props.projectProfile}
          onOpenPromptStudio={props.onOpenPromptStudio}
          onOpenRuntimeOverview={props.onOpenRuntimeOverview}
          onOpenBuilder={props.onOpenBuilder}
          policies={props.policies}
          policiesLoading={props.policiesLoading}
          policiesError={props.policiesError}
          readiness={props.readiness}
          readinessLoading={props.readinessLoading}
          readinessError={props.readinessError}
          adapters={props.adapters}
          adaptersLoading={props.adaptersLoading}
          adaptersError={props.adaptersError}
          taskModel={taskModel}
          providerStatus={providerStatus}
          blenderStatus={blenderStatus}
        />
      ),
    },
  ], [
    blenderStatus,
    props.adapters,
    props.adaptersError,
    props.adaptersLoading,
    props.bridgeStatus,
    props.latestArtifactId,
    props.latestExecutionId,
    props.latestPlacementProofOnlyReview,
    props.latestRunId,
    props.onLaunchInspectTemplate,
    props.onLaunchPlacementProofTemplate,
    props.promptTemplateActionHandlers,
    props.onOpenArtifactDetail,
    props.onOpenBuilder,
    props.onOpenExecutionDetail,
    props.onOpenPromptSessionDetail,
    props.onOpenPromptStudio,
    props.onOpenRecords,
    props.onOpenRunDetail,
    props.onOpenRuntimeOverview,
    props.onViewArtifact,
    props.onViewEvidence,
    props.onViewExecution,
    props.onViewLatestRun,
    props.policies,
    props.policiesError,
    props.policiesLoading,
    props.projectProfile,
    props.readiness,
    props.readinessError,
    props.readinessLoading,
    providerStatus,
    taskModel,
  ]);

  return (
    <section aria-label="AI Asset Forge" style={panelStyle}>
      <DockableCockpitLayout
        cockpitId="asset-forge"
        panels={cockpitPanels}
        defaultPresetId={layoutDefaults.presetId}
        splitConstraints={layoutDefaults.splitConstraints}
      />
    </section>
  );
}

type AssetForgeCommandStripProps = {
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
  onViewEvidence?: () => void;
};

function AssetForgeCommandStrip({
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenRecords,
  onViewEvidence,
}: AssetForgeCommandStripProps) {
  return (
    <section aria-label="Asset Forge command strip" style={commandStripStyle}>
      <p style={commandStripLabelStyle}>Asset Forge workflow strip</p>
      <div style={commandStripStageRowStyle}>
        {[
          "Describe",
          "Candidate",
          "Preflight",
          "Stage plan",
          "Proof-only placement",
          "Review",
        ].map((stageLabel) => (
          <span key={stageLabel} style={commandStripStageChipStyle}>
            {stageLabel}
          </span>
        ))}
      </div>
      <div style={commandStripActionsStyle}>
        <button type="button" onClick={onOpenPromptStudio} disabled={!onOpenPromptStudio} style={commandStripButtonStyle}>
          Open Prompt Studio
        </button>
        <button type="button" onClick={onOpenRuntimeOverview} disabled={!onOpenRuntimeOverview} style={commandStripButtonStyle}>
          Open Runtime
        </button>
        <button type="button" onClick={onOpenRecords} disabled={!onOpenRecords} style={commandStripButtonStyle}>
          Open Records
        </button>
        <button type="button" onClick={onViewEvidence} disabled={!onViewEvidence} style={commandStripButtonStyle}>
          View evidence
        </button>
      </div>
    </section>
  );
}

type AssetForgeToolsOutlinerPanelProps = {
  taskModel: AssetForgeTaskRecord | null;
  providerStatus: AssetForgeProviderStatusRecord | null;
  onOpenPromptStudio?: () => void;
  onLaunchInspectTemplate?: () => void;
  onLaunchPlacementProofTemplate?: () => void;
};

function AssetForgeToolsOutlinerPanel({
  taskModel,
  providerStatus,
  onOpenPromptStudio,
  onLaunchInspectTemplate,
  onLaunchPlacementProofTemplate,
}: AssetForgeToolsOutlinerPanelProps) {
  const candidateLabels = taskModel?.candidates?.map((candidate) => candidate.display_name) ?? [];

  return (
    <section aria-label="Asset Forge tools and outliner panel" style={toolRailStyle}>
      <div style={toolRailCardStyle}>
        <strong>Tool rail</strong>
        <div style={toolRailChipRowStyle}>
          <span style={toolRailChipStyle}>Select</span>
          <span style={toolRailChipStyle}>Move</span>
          <span style={toolRailChipStyle}>Rotate</span>
          <span style={toolRailChipStyle}>Scale</span>
          <span style={toolRailChipStyle}>Annotate</span>
        </div>
      </div>
      <div style={toolRailCardStyle}>
        <strong>Candidate outliner</strong>
        <p style={toolRailDetailStyle}>
          {candidateLabels.length > 0
            ? `Loaded ${candidateLabels.length} candidate entries.`
            : "No latest run selected; candidate list unavailable."}
        </p>
        {candidateLabels.length > 0 ? (
          <ul style={toolRailListStyle}>
            {candidateLabels.slice(0, 6).map((candidateLabel) => (
              <li key={candidateLabel}>{candidateLabel}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div style={toolRailCardStyle}>
        <strong>Provider posture</strong>
        <p style={toolRailDetailStyle}>
          Mode: {providerStatus?.provider_mode ?? "unknown"}.
        </p>
        <p style={toolRailDetailStyle}>
          Generation execution: {providerStatus?.generation_execution_status ?? "unknown"}.
        </p>
      </div>
      <div style={toolRailActionsStyle}>
        <button type="button" onClick={onOpenPromptStudio} disabled={!onOpenPromptStudio} style={toolRailButtonStyle}>
          Open Prompt Studio
        </button>
        <button type="button" onClick={onLaunchInspectTemplate} disabled={!onLaunchInspectTemplate} style={toolRailButtonStyle}>
          Load inspect template
        </button>
        <button
          type="button"
          onClick={onLaunchPlacementProofTemplate}
          disabled={!onLaunchPlacementProofTemplate}
          style={toolRailButtonStyle}
        >
          Load placement proof-only template
        </button>
      </div>
    </section>
  );
}

type AssetForgeInspectorPanelProps = {
  projectLabel: string;
  providerStatus: AssetForgeProviderStatusRecord | null;
  blenderStatus: AssetForgeBlenderStatusRecord | null;
  bridgeStatus: string;
  adaptersMode: string;
};

function AssetForgeInspectorPanel({
  projectLabel,
  providerStatus,
  blenderStatus,
  bridgeStatus,
  adaptersMode,
}: AssetForgeInspectorPanelProps) {
  return (
    <section aria-label="Asset Forge inspector and blockers panel" style={inspectorStyle}>
      <article style={inspectorCardStyle}>
        <strong>Inspector details</strong>
        <p style={inspectorDetailStyle}><strong>Project:</strong> {projectLabel || "unknown"}</p>
        <p style={inspectorDetailStyle}><strong>Bridge:</strong> {bridgeStatus || "unknown"}</p>
        <p style={inspectorDetailStyle}><strong>Adapter mode:</strong> {adaptersMode || "unknown"}</p>
      </article>
      <article style={inspectorCardStyle}>
        <strong>Blocked capabilities</strong>
        <ul style={inspectorListStyle}>
          <li>Provider generation blocked until admitted corridor exists.</li>
          <li>Blender execution blocked ({blenderStatus?.blender_prep_execution_status ?? "unknown"}).</li>
          <li>Asset Processor execution blocked in this cockpit packet.</li>
          <li>Placement execution blocked (execution_admitted=false).</li>
          <li>Placement write blocked (placement_write_admitted=false).</li>
        </ul>
      </article>
      <article style={inspectorCardStyle}>
        <strong>Next safe unlock</strong>
        <p style={inspectorDetailStyle}>
          {providerStatus?.safest_next_step ?? "Use read-only/preflight/proof-only evidence and keep fail-closed posture explicit."}
        </p>
      </article>
    </section>
  );
}

const panelStyle = {
  display: "grid",
  minWidth: 0,
  minHeight: 0,
  height: "100%",
} satisfies CSSProperties;

const commandStripStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const commandStripLabelStyle = {
  margin: 0,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.3,
  color: "var(--app-subtle-color)",
} satisfies CSSProperties;

const commandStripStageRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
} satisfies CSSProperties;

const commandStripStageChipStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 999,
  padding: "3px 10px",
  fontSize: 12,
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const commandStripActionsStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
} satisfies CSSProperties;

const commandStripButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: "6px 10px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;

const toolRailStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const toolRailCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  background: "var(--app-panel-bg-muted)",
  padding: 10,
  display: "grid",
  gap: 8,
  minWidth: 0,
} satisfies CSSProperties;

const toolRailChipRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
} satisfies CSSProperties;

const toolRailChipStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const toolRailDetailStyle = {
  margin: 0,
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const toolRailListStyle = {
  margin: 0,
  paddingLeft: 18,
  display: "grid",
  gap: 4,
  fontSize: 12,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const toolRailActionsStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const toolRailButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: "6px 10px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  textAlign: "left",
} satisfies CSSProperties;

const inspectorStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const inspectorCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  background: "var(--app-panel-bg-muted)",
  padding: 10,
  display: "grid",
  gap: 7,
  minWidth: 0,
} satisfies CSSProperties;

const inspectorDetailStyle = {
  margin: 0,
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const inspectorListStyle = {
  margin: 0,
  paddingLeft: 18,
  display: "grid",
  gap: 4,
  fontSize: 12,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const evidenceDrawerStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
  minHeight: 0,
} satisfies CSSProperties;

const evidenceDrawerActionRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
} satisfies CSSProperties;

const evidenceDrawerButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: "6px 10px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;

const evidenceDrawerDetailStyle = {
  margin: 0,
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;
