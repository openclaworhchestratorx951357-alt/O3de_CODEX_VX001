import type { ReactNode } from "react";

import type { DesktopTabStripItem } from "../DesktopTabStrip";
import CockpitSurfaceWorkspaceLayout from "./CockpitSurfaceWorkspaceLayout";
import { getWorkspaceSurfaceGuide } from "../../content/operatorGuide";

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

  return (
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
  );
}
