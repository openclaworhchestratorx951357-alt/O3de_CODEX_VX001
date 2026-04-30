import type { ReactNode } from "react";

import type { DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import CockpitSurfaceWorkspaceLayout from "./CockpitSurfaceWorkspaceLayout";
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
    >
      <CockpitSurfaceWorkspaceLayout
        cockpitId="runtime"
        activeSurfaceId={activeSurfaceId}
        items={items}
        onSelectSurface={onSelectSurface}
        activeSurfaceGuideChecklist={activeSurfaceGuide.instructions}
        workAreaTitle="Runtime dominant work area"
        workAreaSubtitle="Center runtime viewport for active surface operations and evidence"
        summaryTitle="Runtime evidence and lane summary drawer"
        surfaceContent={{
          overview: overviewContent,
          executors: executorsContent,
          workspaces: workspacesContent,
          governance: governanceContent,
        }}
      />
    </DesktopWindow>
  );
}
