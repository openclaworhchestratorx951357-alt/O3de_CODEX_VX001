import { useState, type CSSProperties, type ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import HomeCockpitLaunchPanel from "../HomeCockpitLaunchPanel";
import MissionCardDeck from "../MissionCardDeck";
import MissionTruthRail from "../MissionTruthRail";
import { getShellWorkspaceGuide, getShellWorkspaceWindowGuide } from "../../content/operatorGuideShell";
import type { AdaptersResponse, O3DEBridgeStatus, ReadinessStatus } from "../../types/contracts";

type HomeSurfaceId = "start" | "mission-control" | "guidebook";

type HomeWorkspaceViewProps = {
  missionControlContent: ReactNode;
  launchpadContent: ReactNode;
  overviewContent: ReactNode;
  guideContent: ReactNode;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenAssetForge?: () => void;
  onOpenRecords?: () => void;
  onOpenCreateGame?: () => void;
  onOpenCreateMovie?: () => void;
  onOpenLoadProject?: () => void;
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

const missionControlWindow = getShellWorkspaceWindowGuide("home", "mission-control");
const launchpadWindow = getShellWorkspaceWindowGuide("home", "launchpad");
const overviewWindow = getShellWorkspaceWindowGuide("home", "operator-overview");
const guidebookWindow = getShellWorkspaceWindowGuide("home", "guidebook");
const homeWorkspace = getShellWorkspaceGuide("home");

const items: DesktopTabStripItem[] = [
  {
    id: "start",
    label: "Start Here",
    detail: "Launch work, see the current overview, and avoid an overwhelming first screen.",
    helpTooltip: "Use Start here for the calmest beginner-friendly landing surface.",
  },
  {
    id: "mission-control",
    label: "Mission Control",
    detail: "Focus on the mission-board style coordination surface by itself.",
    helpTooltip: missionControlWindow.tooltip,
  },
  {
    id: "guidebook",
    label: "Guidebook",
    detail: "Read operator guidance without keeping every other home panel visible.",
    helpTooltip: guidebookWindow.tooltip,
  },
];

export default function HomeWorkspaceView({
  missionControlContent,
  launchpadContent,
  overviewContent,
  guideContent,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenAssetForge,
  onOpenRecords,
  onOpenCreateGame,
  onOpenCreateMovie,
  onOpenLoadProject,
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
}: HomeWorkspaceViewProps) {
  const [activeSurfaceId, setActiveSurfaceId] = useState<HomeSurfaceId>("start");

  const activeSurface = activeSurfaceId === "mission-control"
    ? missionControlWindow
    : activeSurfaceId === "guidebook"
      ? guidebookWindow
      : {
          title: "Home start here",
          subtitle: "Use a calmer launch surface first, then switch into coordination or reference when you need it.",
          tooltip: "This guided home surface groups launchpad and overview content into one beginner-safe destination.",
          instructions: homeWorkspace.operatorChecklist,
        };

  return (
    <DesktopWindow
      title={activeSurface.title}
      subtitle={activeSurface.subtitle}
      helpTooltip={activeSurface.tooltip}
      guideTitle="How to use this workspace"
      guideChecklist={activeSurface.instructions}
      toolbar={(
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => setActiveSurfaceId(surfaceId as HomeSurfaceId)}
        />
      )}
    >
      {activeSurfaceId === "start" ? (
        <div style={guidedShellStyle}>
          <MissionTruthRail
            locationLabel="Home / Start Here"
            projectLabel="active operator target"
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
            nextSafeAction="Choose a mission card, open Prompt Studio, then run one bounded admitted/proof-only step and review evidence."
            onViewLatestRun={onViewLatestRun}
            onViewExecution={onViewExecution}
            onViewArtifact={onViewArtifact}
            onViewEvidence={onViewEvidence}
            onOpenPromptStudio={onOpenPromptStudio}
            onOpenRuntimeOverview={onOpenRuntimeOverview}
            onOpenRecords={onOpenRecords}
          />
          <MissionCardDeck
            latestRunId={latestRunId ?? null}
            latestExecutionId={latestExecutionId ?? null}
            latestArtifactId={latestArtifactId ?? null}
            onViewLatestRun={onViewLatestRun}
            onViewExecution={onViewExecution}
            onViewArtifact={onViewArtifact}
            onViewEvidence={onViewEvidence}
            onOpenPromptStudio={onOpenPromptStudio}
            onOpenAssetForge={onOpenAssetForge}
            onOpenRuntimeOverview={onOpenRuntimeOverview}
            onOpenRecords={onOpenRecords}
            onLaunchPlacementProofTemplate={onLaunchPlacementProofTemplate}
          />
          <HomeCockpitLaunchPanel
            onOpenCreateGame={onOpenCreateGame}
            onOpenCreateMovie={onOpenCreateMovie}
            onOpenLoadProject={onOpenLoadProject}
            onOpenPromptStudio={onOpenPromptStudio}
            onOpenAssetForge={onOpenAssetForge}
            onOpenRuntimeOverview={onOpenRuntimeOverview}
            onOpenRecords={onOpenRecords}
          />
          <DesktopWindow
            variant="nested"
            title={missionControlWindow.title}
            subtitle="Keep the current coordination header visible while Start Here narrows the rest of the screen."
            helpTooltip={missionControlWindow.tooltip}
            guideTitle="How to use this window"
            guideChecklist={missionControlWindow.instructions}
          >
            {missionControlContent}
          </DesktopWindow>
          <div style={guidedGridStyle}>
            <DesktopWindow
              variant="nested"
              title={launchpadWindow.title}
              subtitle={launchpadWindow.subtitle}
              helpTooltip={launchpadWindow.tooltip}
              guideTitle="How to use this window"
              guideChecklist={launchpadWindow.instructions}
            >
              {launchpadContent}
            </DesktopWindow>
            <DesktopWindow
              variant="nested"
              title={overviewWindow.title}
              subtitle={overviewWindow.subtitle}
              helpTooltip={overviewWindow.tooltip}
              guideTitle="How to use this window"
              guideChecklist={overviewWindow.instructions}
            >
              {overviewContent}
            </DesktopWindow>
          </div>
        </div>
      ) : activeSurfaceId === "mission-control" ? (
        <DesktopWindow
          variant="nested"
          title={missionControlWindow.title}
          subtitle={missionControlWindow.subtitle}
          helpTooltip={missionControlWindow.tooltip}
        >
          {missionControlContent}
        </DesktopWindow>
      ) : (
        <DesktopWindow
          variant="nested"
          title={guidebookWindow.title}
          subtitle={guidebookWindow.subtitle}
          helpTooltip={guidebookWindow.tooltip}
        >
          {guideContent}
        </DesktopWindow>
      )}
    </DesktopWindow>
  );
}

const guidedGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  alignItems: "start",
} satisfies CSSProperties;

const guidedShellStyle = {
  display: "grid",
  gap: 16,
} satisfies CSSProperties;
