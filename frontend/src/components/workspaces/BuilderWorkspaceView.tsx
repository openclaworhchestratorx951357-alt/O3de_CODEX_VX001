import { useState, type CSSProperties, type ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import { getWorkspaceWindowGuide } from "../../content/operatorGuide";

type BuilderSurfaceId = "start" | "mission-control" | "active-lane" | "autonomy";

type BuilderWorkspaceViewProps = {
  overviewContent: ReactNode;
  worktreesContent: ReactNode;
  missionBoardContent: ReactNode;
  laneCreateContent: ReactNode;
  workerLifecycleContent: ReactNode;
  terminalsContent: ReactNode;
  autonomyInboxContent: ReactNode;
};

const overviewWindow = getWorkspaceWindowGuide("builder", "builder-overview");
const worktreesWindow = getWorkspaceWindowGuide("builder", "worktree-lanes");
const missionBoardWindow = getWorkspaceWindowGuide("builder", "mission-board");
const laneCreateWindow = getWorkspaceWindowGuide("builder", "lane-create");
const workerLifecycleWindow = getWorkspaceWindowGuide("builder", "worker-lifecycle");
const workerTerminalsWindow = getWorkspaceWindowGuide("builder", "worker-terminals");
const autonomyInboxWindow = getWorkspaceWindowGuide("builder", "autonomy-inbox");

const items: DesktopTabStripItem[] = [
  {
    id: "start",
    label: "Start Here",
    detail: "Orient the lane, launch worktrees, and seed shared tasks before touching advanced controls.",
    helpTooltip: "Use Start here for the calmest Builder entry path.",
  },
  {
    id: "mission-control",
    label: "Mission Control",
    detail: "Focus only on workers, tasks, waiters, and notifications when coordinating shared work.",
    helpTooltip: missionBoardWindow.tooltip,
  },
  {
    id: "active-lane",
    label: "Active Lane",
    detail: "Work with the selected lane, heartbeat state, and managed terminals without board clutter.",
    helpTooltip: workerLifecycleWindow.tooltip,
  },
  {
    id: "autonomy",
    label: "Autonomy",
    detail: "Review the Builder inbox and related guidance in its own quieter surface.",
    helpTooltip: autonomyInboxWindow.tooltip,
  },
];

export default function BuilderWorkspaceView({
  overviewContent,
  worktreesContent,
  missionBoardContent,
  laneCreateContent,
  workerLifecycleContent,
  terminalsContent,
  autonomyInboxContent,
}: BuilderWorkspaceViewProps) {
  const [activeSurfaceId, setActiveSurfaceId] = useState<BuilderSurfaceId>("start");

  const activeSurface = activeSurfaceId === "mission-control"
    ? missionBoardWindow
    : activeSurfaceId === "active-lane"
      ? workerLifecycleWindow
      : activeSurfaceId === "autonomy"
        ? autonomyInboxWindow
        : {
            title: "Builder start here",
            subtitle: "Begin with lane setup and current state before drilling into coordination or worker-specific tools.",
            tooltip: "This guided Builder surface groups overview, lane creation, and worktree visibility into a calmer first stop.",
          };

  return (
    <DesktopWindow
      title={activeSurface.title}
      subtitle={activeSurface.subtitle}
      helpTooltip={activeSurface.tooltip}
      toolbar={(
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => setActiveSurfaceId(surfaceId as BuilderSurfaceId)}
        />
      )}
    >
      {activeSurfaceId === "start" ? (
        <div style={builderSurfaceStackStyle}>
          <div style={builderTwoPaneGridStyle}>
            <DesktopWindow
              variant="nested"
              title={overviewWindow.title}
              subtitle={overviewWindow.subtitle}
              helpTooltip={overviewWindow.tooltip}
            >
              {overviewContent}
            </DesktopWindow>
            <DesktopWindow
              variant="nested"
              title={laneCreateWindow.title}
              subtitle={laneCreateWindow.subtitle}
              helpTooltip={laneCreateWindow.tooltip}
            >
              {laneCreateContent}
            </DesktopWindow>
          </div>
          <DesktopWindow
            variant="nested"
            title={worktreesWindow.title}
            subtitle={worktreesWindow.subtitle}
            helpTooltip={worktreesWindow.tooltip}
          >
            {worktreesContent}
          </DesktopWindow>
        </div>
      ) : activeSurfaceId === "mission-control" ? (
        <DesktopWindow
          variant="nested"
          title={missionBoardWindow.title}
          subtitle={missionBoardWindow.subtitle}
          helpTooltip={missionBoardWindow.tooltip}
        >
          {missionBoardContent}
        </DesktopWindow>
      ) : activeSurfaceId === "active-lane" ? (
        <div style={builderTwoPaneGridStyle}>
          <DesktopWindow
            variant="nested"
            title={workerLifecycleWindow.title}
            subtitle={workerLifecycleWindow.subtitle}
            helpTooltip={workerLifecycleWindow.tooltip}
          >
            {workerLifecycleContent}
          </DesktopWindow>
          <DesktopWindow
            variant="nested"
            title={workerTerminalsWindow.title}
            subtitle={workerTerminalsWindow.subtitle}
            helpTooltip={workerTerminalsWindow.tooltip}
          >
            {terminalsContent}
          </DesktopWindow>
        </div>
      ) : (
        <DesktopWindow
          variant="nested"
          title={autonomyInboxWindow.title}
          subtitle={autonomyInboxWindow.subtitle}
          helpTooltip={autonomyInboxWindow.tooltip}
        >
          {autonomyInboxContent}
        </DesktopWindow>
      )}
    </DesktopWindow>
  );
}

const builderSurfaceStackStyle = {
  display: "grid",
  gap: 16,
  alignItems: "start",
} satisfies CSSProperties;

const builderTwoPaneGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  alignItems: "start",
} satisfies CSSProperties;
