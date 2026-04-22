import type { ReactNode } from "react";

import DesktopWindow from "../DesktopWindow";
import { getWorkspaceWindowGuide } from "../../content/operatorGuide";

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

export default function BuilderWorkspaceView({
  overviewContent,
  worktreesContent,
  missionBoardContent,
  laneCreateContent,
  workerLifecycleContent,
  terminalsContent,
  autonomyInboxContent,
}: BuilderWorkspaceViewProps) {
  return (
    <>
      <DesktopWindow
        title={overviewWindow.title}
        subtitle={overviewWindow.subtitle}
        helpTooltip={overviewWindow.tooltip}
      >
        {overviewContent}
      </DesktopWindow>

      <DesktopWindow
        title={worktreesWindow.title}
        subtitle={worktreesWindow.subtitle}
        helpTooltip={worktreesWindow.tooltip}
      >
        {worktreesContent}
      </DesktopWindow>

      <DesktopWindow
        title={missionBoardWindow.title}
        subtitle={missionBoardWindow.subtitle}
        helpTooltip={missionBoardWindow.tooltip}
      >
        {missionBoardContent}
      </DesktopWindow>

      <DesktopWindow
        title={laneCreateWindow.title}
        subtitle={laneCreateWindow.subtitle}
        helpTooltip={laneCreateWindow.tooltip}
      >
        {laneCreateContent}
      </DesktopWindow>

      <DesktopWindow
        title={workerLifecycleWindow.title}
        subtitle={workerLifecycleWindow.subtitle}
        helpTooltip={workerLifecycleWindow.tooltip}
      >
        {workerLifecycleContent}
      </DesktopWindow>

      <DesktopWindow
        title={workerTerminalsWindow.title}
        subtitle={workerTerminalsWindow.subtitle}
        helpTooltip={workerTerminalsWindow.tooltip}
      >
        {terminalsContent}
      </DesktopWindow>

      <DesktopWindow
        title={autonomyInboxWindow.title}
        subtitle={autonomyInboxWindow.subtitle}
        helpTooltip={autonomyInboxWindow.tooltip}
      >
        {autonomyInboxContent}
      </DesktopWindow>
    </>
  );
}
