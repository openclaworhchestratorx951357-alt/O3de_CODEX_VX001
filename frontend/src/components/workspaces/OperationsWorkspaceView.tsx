import type { ReactNode } from "react";

import type { DesktopTabStripItem } from "../DesktopTabStrip";
import CockpitSurfaceWorkspaceLayout from "./CockpitSurfaceWorkspaceLayout";
import { getWorkspaceSurfaceGuide } from "../../content/operatorGuide";

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
  );
}
