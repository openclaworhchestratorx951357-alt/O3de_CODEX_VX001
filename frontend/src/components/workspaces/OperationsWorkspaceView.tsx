import type { ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import {
  getWorkspaceSurfaceGuide,
  getWorkspaceWindowGuide,
  mergeGuideChecklists,
} from "../../content/operatorGuide";

type OperationsSurfaceId =
  | "dispatch"
  | "agents"
  | "approvals"
  | "timeline";

type OperationsWorkspaceViewProps = {
  activeSurfaceId: OperationsSurfaceId;
  items: readonly DesktopTabStripItem[];
  onSelectSurface: (surfaceId: OperationsSurfaceId) => void;
  dispatchContent: ReactNode;
  agentsContent: ReactNode;
  approvalsContent: ReactNode;
  timelineContent: ReactNode;
};

const commandCenterWindow = getWorkspaceWindowGuide("operations", "command-center");

export default function OperationsWorkspaceView({
  activeSurfaceId,
  items,
  onSelectSurface,
  dispatchContent,
  agentsContent,
  approvalsContent,
  timelineContent,
}: OperationsWorkspaceViewProps) {
  const activeSurfaceGuide = getWorkspaceSurfaceGuide("operations", activeSurfaceId);
  const activeContent = activeSurfaceId === "dispatch"
    ? dispatchContent
    : activeSurfaceId === "agents"
      ? agentsContent
      : activeSurfaceId === "approvals"
        ? approvalsContent
        : timelineContent;

  return (
    <DesktopWindow
      title={commandCenterWindow.title}
      subtitle={commandCenterWindow.subtitle}
      helpTooltip={commandCenterWindow.tooltip}
      guideTitle="How to use this workspace"
      guideChecklist={mergeGuideChecklists(
        commandCenterWindow.instructions,
        activeSurfaceGuide.instructions,
      )}
      toolbar={(
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => onSelectSurface(surfaceId as OperationsSurfaceId)}
        />
      )}
    >
      {activeContent}
    </DesktopWindow>
  );
}
