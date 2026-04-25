import { Suspense, lazy, useState, type CSSProperties, type ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import type { HomeTaskModeId } from "../HomeTaskModePanel";
import { getShellWorkspaceGuide, getShellWorkspaceWindowGuide } from "../../content/operatorGuideShell";

type HomeSurfaceId = "start" | "mission-control" | "guidebook";

type HomeWorkspaceViewProps = {
  missionControlContent: ReactNode;
  launchpadContent: ReactNode;
  overviewContent: ReactNode;
  guideContent: ReactNode;
  activeTaskModeId?: HomeTaskModeId;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenBuilder?: () => void;
  onActiveTaskModeChange?: (modeId: HomeTaskModeId) => void;
};

const missionControlWindow = getShellWorkspaceWindowGuide("home", "mission-control");
const launchpadWindow = getShellWorkspaceWindowGuide("home", "launchpad");
const overviewWindow = getShellWorkspaceWindowGuide("home", "operator-overview");
const guidebookWindow = getShellWorkspaceWindowGuide("home", "guidebook");
const homeWorkspace = getShellWorkspaceGuide("home");
const HomeTaskModePanel = lazy(() => import("../HomeTaskModePanel"));

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
  activeTaskModeId,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenBuilder,
  onActiveTaskModeChange,
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
          <Suspense fallback={<div style={taskModeLoadingStyle}>Loading task launcher...</div>}>
            <HomeTaskModePanel
              activeModeId={activeTaskModeId}
              onOpenPromptStudio={onOpenPromptStudio}
              onOpenRuntimeOverview={onOpenRuntimeOverview}
              onOpenBuilder={onOpenBuilder}
              onActiveModeChange={onActiveTaskModeChange}
            />
          </Suspense>
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

const taskModeLoadingStyle = {
  minHeight: 120,
  display: "grid",
  placeItems: "center",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-text-muted)",
} satisfies CSSProperties;
