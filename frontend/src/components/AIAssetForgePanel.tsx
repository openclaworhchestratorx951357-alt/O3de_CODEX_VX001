import { useEffect, useState, type CSSProperties } from "react";

import AssetForgeBlenderCockpit from "./assetForge/AssetForgeBlenderCockpit";
import type { PlacementProofOnlyReviewSnapshot } from "../lib/promptPlacementProofOnlyReview";
import {
  fetchAssetForgeBlenderStatus,
  fetchAssetForgeEditorModel,
  fetchAssetForgeProviderStatus,
  fetchAssetForgeTask,
} from "../lib/api";
import type {
  AdaptersResponse,
  AssetForgeBlenderStatusRecord,
  AssetForgeEditorModelRecord,
  AssetForgePromptTemplateRecord,
  AssetForgeProviderStatusRecord,
  AssetForgeTaskRecord,
  O3DEBridgeStatus,
  ReadinessStatus,
  ToolPolicy,
} from "../types/contracts";
import type { O3DEProjectProfile } from "../types/o3deProjectProfiles";

type AIAssetForgePanelProps = {
  projectProfile?: O3DEProjectProfile;
  onOpenHome?: () => void;
  onOpenCreateGame?: () => void;
  onOpenCreateMovie?: () => void;
  onOpenLoadProject?: () => void;
  onOpenPromptStudio?: () => void;
  onLaunchInspectTemplate?: () => void;
  onLaunchPlacementProofTemplate?: () => void;
  onLaunchPromptTemplate?: (template: AssetForgePromptTemplateRecord) => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  onOpenOperations?: () => void;
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
  const [editorModel, setEditorModel] = useState<AssetForgeEditorModelRecord | null>(null);
  const [editorModelError, setEditorModelError] = useState<string | null>("editor model backend unavailable");

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

    async function loadEditorModel() {
      try {
        const payload = await fetchAssetForgeEditorModel();
        if (isActive) {
          setEditorModel(payload);
          setEditorModelError(null);
        }
      } catch (error) {
        if (isActive) {
          setEditorModel(null);
          setEditorModelError(
            error instanceof Error
              ? error.message
              : "editor model backend unavailable",
          );
        }
      }
    }

    void Promise.allSettled([
      loadTaskModel(),
      loadProviderStatus(),
      loadBlenderStatus(),
      loadEditorModel(),
    ]);

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section aria-label="AI Asset Forge" style={panelStyle}>
      <AssetForgeBlenderCockpit
        projectProfile={props.projectProfile}
        taskModel={taskModel}
        providerStatus={providerStatus}
        blenderStatus={blenderStatus}
        editorModel={editorModel}
        editorModelError={editorModelError}
        bridgeStatus={props.bridgeStatus}
        adapters={props.adapters}
        readiness={props.readiness}
        latestRunId={props.latestRunId}
        latestExecutionId={props.latestExecutionId}
        latestArtifactId={props.latestArtifactId}
        latestPlacementProofOnlyReview={props.latestPlacementProofOnlyReview}
        onOpenHome={props.onOpenHome}
        onOpenCreateGame={props.onOpenCreateGame}
        onOpenCreateMovie={props.onOpenCreateMovie}
        onOpenLoadProject={props.onOpenLoadProject}
        onOpenPromptStudio={props.onOpenPromptStudio}
        onLaunchInspectTemplate={props.onLaunchInspectTemplate}
        onLaunchPlacementProofTemplate={props.onLaunchPlacementProofTemplate}
        onLaunchPromptTemplate={props.onLaunchPromptTemplate}
        onOpenRecords={props.onOpenRecords}
        onOpenRuntimeOverview={props.onOpenRuntimeOverview}
        onOpenBuilder={props.onOpenBuilder}
        onOpenOperations={props.onOpenOperations}
        onViewLatestRun={props.onViewLatestRun}
        onViewExecution={props.onViewExecution}
        onViewArtifact={props.onViewArtifact}
        onViewEvidence={props.onViewEvidence}
      />
    </section>
  );
}

const panelStyle = {
  display: "grid",
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  overflow: "hidden",
} satisfies CSSProperties;
