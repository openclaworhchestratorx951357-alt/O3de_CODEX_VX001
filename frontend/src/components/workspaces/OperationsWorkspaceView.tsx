import type { CSSProperties, ReactNode } from "react";

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
      <div style={surfaceStackStyle}>
        <div aria-hidden={activeSurfaceId !== "dispatch"} style={activeSurfaceId === "dispatch" ? visibleSurfaceStyle : hiddenSurfaceStyle}>
          {dispatchContent}
        </div>
        <div aria-hidden={activeSurfaceId !== "agents"} style={activeSurfaceId === "agents" ? visibleSurfaceStyle : hiddenSurfaceStyle}>
          {agentsContent}
        </div>
        <div aria-hidden={activeSurfaceId !== "approvals"} style={activeSurfaceId === "approvals" ? visibleSurfaceStyle : hiddenSurfaceStyle}>
          {approvalsContent}
        </div>
        <div aria-hidden={activeSurfaceId !== "timeline"} style={activeSurfaceId === "timeline" ? visibleSurfaceStyle : hiddenSurfaceStyle}>
          {timelineContent}
        </div>
      </div>
    </DesktopWindow>
  );
}

const surfaceStackStyle = {
  display: "grid",
  minWidth: 0,
} satisfies CSSProperties;

const visibleSurfaceStyle = {
  display: "grid",
  gap: 16,
  minWidth: 0,
} satisfies CSSProperties;

const hiddenSurfaceStyle = {
  display: "none",
} satisfies CSSProperties;
