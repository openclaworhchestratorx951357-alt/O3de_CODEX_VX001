import type { ReactNode } from "react";

import type { DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import CockpitSurfaceWorkspaceLayout from "./CockpitSurfaceWorkspaceLayout";
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
    >
      <CockpitSurfaceWorkspaceLayout
        cockpitId="operations"
        activeSurfaceId={activeSurfaceId}
        items={items}
        onSelectSurface={onSelectSurface}
        activeSurfaceGuideChecklist={activeSurfaceGuide.instructions}
        workAreaTitle="Operations dominant work area"
        workAreaSubtitle="Center command viewport for dispatch, agents, approvals, and timeline follow-up"
        summaryTitle="Operations queue and timeline summary drawer"
        surfaceContent={{
          dispatch: dispatchContent,
          agents: agentsContent,
          approvals: approvalsContent,
          timeline: timelineContent,
        }}
      />
    </DesktopWindow>
  );
}
