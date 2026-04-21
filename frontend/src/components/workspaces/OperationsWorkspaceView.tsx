import type { ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";

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
  return (
    <DesktopWindow
      title="Command Center"
      subtitle="Work through dispatch, agents, approvals, and timeline without leaving the operator desktop."
      toolbar={(
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => onSelectSurface(surfaceId as OperationsSurfaceId)}
        />
      )}
    >
      {activeSurfaceId === "dispatch" ? dispatchContent : null}
      {activeSurfaceId === "agents" ? agentsContent : null}
      {activeSurfaceId === "approvals" ? approvalsContent : null}
      {activeSurfaceId === "timeline" ? timelineContent : null}
    </DesktopWindow>
  );
}
