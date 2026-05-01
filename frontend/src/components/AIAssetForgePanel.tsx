import type { CSSProperties } from "react";

import AssetForgeToolbenchLayout from "./AssetForgeToolbenchLayout";
import { assetForgeReviewPacketFixture } from "../fixtures/assetForgeReviewPacketFixture";
import type { PlacementProofOnlyReviewSnapshot } from "../lib/promptPlacementProofOnlyReview";
import type { AssetForgeReviewPacketSource } from "../types/assetForgeReviewPacket";
import type {
  AdaptersResponse,
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

function normalizeReviewPacketSource(source: string | undefined): AssetForgeReviewPacketSource {
  if (source === "existing_frontend_packet_data") {
    return source;
  }
  if (source === "live_phase9_packet_data") {
    return source;
  }
  return "typed_fixture_data";
}

export default function AIAssetForgePanel(props: AIAssetForgePanelProps) {
  const onLaunchInspectTemplate = props.promptTemplateActionHandlers?.["inspect-project"]
    ?? props.onLaunchInspectTemplate;
  const onLaunchPlacementProofTemplate = props.promptTemplateActionHandlers?.["placement-proof-only"]
    ?? props.onLaunchPlacementProofTemplate;
  const reviewPacketSource = normalizeReviewPacketSource(props.reviewPacketSource);
  const reviewPacketData = props.reviewPacketData ?? assetForgeReviewPacketFixture;

  return (
    <section aria-label="AI Asset Forge" style={panelStyle}>
      <section aria-label="Asset Forge prompt launch strip" style={promptLaunchStripStyle}>
        <button
          type="button"
          onClick={props.onOpenPromptStudio}
          disabled={!props.onOpenPromptStudio}
          style={promptLaunchButtonStyle}
        >
          Open Prompt Studio
        </button>
        <button
          type="button"
          onClick={onLaunchInspectTemplate}
          disabled={!onLaunchInspectTemplate}
          style={promptLaunchButtonStyle}
        >
          Load inspect template in Prompt Studio
        </button>
        <button
          type="button"
          onClick={onLaunchPlacementProofTemplate}
          disabled={!onLaunchPlacementProofTemplate}
          style={promptLaunchButtonStyle}
        >
          Load placement proof-only template in Prompt Studio
        </button>
      </section>
      <div style={toolbenchShellStyle}>
        <AssetForgeToolbenchLayout
          projectProfile={props.projectProfile}
          onOpenPromptStudio={props.onOpenPromptStudio}
          onOpenRuntimeOverview={props.onOpenRuntimeOverview}
          onOpenBuilder={props.onOpenBuilder}
          reviewPacketData={reviewPacketData}
          reviewPacketSource={reviewPacketSource}
          bridgeStatus={props.bridgeStatus}
        />
      </div>
    </section>
  );
}

const panelStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  alignContent: "start",
} satisfies CSSProperties;

const promptLaunchStripStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  padding: 10,
  background: "var(--app-panel-bg-alt)",
} satisfies CSSProperties;

const promptLaunchButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  minHeight: 32,
  padding: "0 10px",
  background: "var(--app-panel-elevated)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontWeight: 600,
} satisfies CSSProperties;

const toolbenchShellStyle = {
  minWidth: 0,
  minHeight: 0,
  height: "100%",
} satisfies CSSProperties;
