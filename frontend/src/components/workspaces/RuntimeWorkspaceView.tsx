import type { ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import {
  getWorkspaceSurfaceGuide,
  getWorkspaceWindowGuide,
  mergeGuideChecklists,
} from "../../content/operatorGuide";

type RuntimeSurfaceId =
  | "overview"
  | "executors"
  | "workspaces"
  | "governance";

type RuntimeWorkspaceViewProps = {
  activeSurfaceId: RuntimeSurfaceId;
  items: readonly DesktopTabStripItem[];
  onSelectSurface: (surfaceId: RuntimeSurfaceId) => void;
  overviewContent: ReactNode;
  executorsContent: ReactNode;
  workspacesContent: ReactNode;
  governanceContent: ReactNode;
};

const runtimeConsoleWindow = getWorkspaceWindowGuide("runtime", "runtime-console");
const governanceDeckWindow = getWorkspaceWindowGuide("runtime", "governance-deck");

export default function RuntimeWorkspaceView({
  activeSurfaceId,
  items,
  onSelectSurface,
  overviewContent,
  executorsContent,
  workspacesContent,
  governanceContent,
}: RuntimeWorkspaceViewProps) {
  const activeSurfaceGuide = getWorkspaceSurfaceGuide("runtime", activeSurfaceId);
  const activeWindow = activeSurfaceId === "governance"
    ? governanceDeckWindow
    : runtimeConsoleWindow;
  const activeContent = activeSurfaceId === "overview"
    ? overviewContent
    : activeSurfaceId === "executors"
      ? executorsContent
      : activeSurfaceId === "workspaces"
        ? workspacesContent
        : governanceContent;

  return (
    <DesktopWindow
      title={activeWindow.title}
      subtitle={activeWindow.subtitle}
      helpTooltip={activeWindow.tooltip}
      guideTitle="How to use this workspace"
      guideChecklist={mergeGuideChecklists(
        activeWindow.instructions,
        activeSurfaceGuide.instructions,
      )}
      toolbar={(
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => onSelectSurface(surfaceId as RuntimeSurfaceId)}
        />
      )}
    >
      {activeContent}
    </DesktopWindow>
  );
}
