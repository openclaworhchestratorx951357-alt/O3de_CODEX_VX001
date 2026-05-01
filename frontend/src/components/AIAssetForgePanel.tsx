import { useEffect, useState, type CSSProperties } from "react";

import AssetForgeStudioPacket01 from "./AssetForgeStudioPacket01";
import MovieStudioPanel from "./movieStudio/MovieStudioPanel";
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
};

const WORKSPACE_MODE_SESSION_KEY = "ai-asset-forge-workspace-mode-v1";

function loadWorkspaceMode(): "asset_forge" | "movie_studio" {
  if (typeof window === "undefined") {
    return "asset_forge";
  }
  const saved = window.sessionStorage.getItem(WORKSPACE_MODE_SESSION_KEY);
  return saved === "movie_studio" ? "movie_studio" : "asset_forge";
}

export default function AIAssetForgePanel(props: AIAssetForgePanelProps) {
  const [workspaceMode, setWorkspaceMode] = useState<"asset_forge" | "movie_studio">(loadWorkspaceMode);
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(WORKSPACE_MODE_SESSION_KEY, workspaceMode);
    }
  }, [workspaceMode]);

  return (
    <section aria-label="AI Asset Forge" style={panelStyle}>
      <div style={workspaceToggleRowStyle}>
        <button
          type="button"
          onClick={() => setWorkspaceMode("asset_forge")}
          aria-pressed={workspaceMode === "asset_forge"}
          style={workspaceMode === "asset_forge" ? activeToggleButtonStyle : toggleButtonStyle}
        >
          Asset Forge Studio
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceMode("movie_studio")}
          aria-pressed={workspaceMode === "movie_studio"}
          style={workspaceMode === "movie_studio" ? activeToggleButtonStyle : toggleButtonStyle}
        >
          Movie Studio Timeline
        </button>
      </div>
      {workspaceMode === "asset_forge" ? (
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
      ) : (
        <MovieStudioPanel />
      )}
    </section>
  );
}

const panelStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const workspaceToggleRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const toggleButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 999,
  padding: "7px 12px",
  background: "rgba(18, 26, 36, 0.7)",
  color: "var(--app-text-primary)",
  cursor: "pointer",
} satisfies CSSProperties;

const activeToggleButtonStyle = {
  ...toggleButtonStyle,
  border: "1px solid rgba(111, 190, 248, 0.95)",
  boxShadow: "0 0 0 1px rgba(111, 190, 248, 0.3)",
  background: "rgba(31, 72, 108, 0.6)",
} satisfies CSSProperties;
