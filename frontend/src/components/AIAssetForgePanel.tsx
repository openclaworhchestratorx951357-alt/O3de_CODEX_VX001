import { useEffect, useMemo, useState, type CSSProperties } from "react";

import AssetForgeStudioPacket01 from "./AssetForgeStudioPacket01";
import AssetForgeGuidedPipeline from "./AssetForgeGuidedPipeline";
import MissionTruthRail from "./MissionTruthRail";
import DockableCockpitLayout from "./cockpits/DockableCockpitLayout";
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
      id: "asset-forge-truth-rail",
      title: "Mission truth rail",
      subtitle: "Safety, readiness, and latest evidence context",
      truthState: "status/evidence",
      defaultZone: "right",
      collapsible: true,
      scrollMode: "content",
      priority: "status",
      minHeight: 240,
      defaultHeight: 320,
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
      id: "asset-forge-guided-pipeline",
      title: "Asset Forge guided pipeline",
      subtitle: "Describe to review with explicit blocked and proof-only gates",
      truthState: "plan/preflight/proof-only",
      defaultZone: "left",
      collapsible: true,
      scrollMode: "content",
      priority: "tools",
      minHeight: 210,
      defaultHeight: 320,
      render: () => (
        <AssetForgeGuidedPipeline
          onOpenPromptStudio={props.onOpenPromptStudio}
          onLaunchInspectTemplate={props.onLaunchInspectTemplate}
          onLaunchPlacementProofTemplate={props.onLaunchPlacementProofTemplate}
          onOpenRuntimeOverview={props.onOpenRuntimeOverview}
          onOpenRecords={props.onOpenRecords}
          onViewEvidence={props.onViewEvidence}
        />
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
      minHeight: 360,
      defaultHeight: 560,
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
    {
      id: "asset-forge-evidence-drawer",
      title: "Bottom evidence and prompt drawer",
      subtitle: "Evidence links, prompt templates, and explicit blocked execution copy",
      truthState: "review / proof-only",
      defaultZone: "bottom",
      collapsible: true,
      scrollMode: "content",
      priority: "evidence",
      minHeight: 180,
      defaultHeight: 220,
      render: () => (
        <section style={evidenceDrawerStyle} aria-label="Asset Forge bottom evidence drawer">
          <p style={drawerDetailStyle}>
            Layout model: left tools/candidates, center dominant studio viewport, right truth/inspector, bottom evidence/prompts/logs.
          </p>
          <p style={drawerDetailStyle}>
            Safety posture: provider generation blocked, Blender execution blocked, Asset Processor execution blocked, placement execution blocked, placement write blocked, material/prefab mutation blocked.
          </p>
          <div style={drawerActionRowStyle}>
            <button type="button" onClick={props.onViewLatestRun} disabled={!props.onViewLatestRun} style={drawerButtonStyle}>
              View latest run
            </button>
            <button type="button" onClick={props.onViewExecution} disabled={!props.onViewExecution} style={drawerButtonStyle}>
              View execution
            </button>
            <button type="button" onClick={props.onViewArtifact} disabled={!props.onViewArtifact} style={drawerButtonStyle}>
              View artifact
            </button>
            <button type="button" onClick={props.onViewEvidence} disabled={!props.onViewEvidence} style={drawerButtonStyle}>
              View evidence
            </button>
            <button type="button" onClick={props.onOpenPromptStudio} disabled={!props.onOpenPromptStudio} style={drawerButtonStyle}>
              Open Prompt Studio
            </button>
            <button type="button" onClick={props.onLaunchPlacementProofTemplate} disabled={!props.onLaunchPlacementProofTemplate} style={drawerButtonStyle}>
              Load placement proof-only template
            </button>
          </div>
        </section>
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
      />
    </section>
  );
}

const panelStyle = {
  display: "grid",
  minWidth: 0,
  minHeight: 0,
  height: "100%",
} satisfies CSSProperties;

const evidenceDrawerStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const drawerDetailStyle = {
  margin: 0,
  fontSize: 13,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const drawerActionRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const drawerButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: "6px 10px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;
