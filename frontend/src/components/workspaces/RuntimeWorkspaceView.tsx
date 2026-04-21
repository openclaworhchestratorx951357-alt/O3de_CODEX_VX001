import type { ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";

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
  const title = activeSurfaceId === "governance" ? "Governance Deck" : "Runtime Console";
  const subtitle = activeSurfaceId === "governance"
    ? "Admitted capability posture, lock state, and policy guardrails."
    : "Monitor live runtime health and move between overview, executors, and workspaces.";

  return (
    <DesktopWindow
      title={title}
      subtitle={subtitle}
      toolbar={(
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => onSelectSurface(surfaceId as RuntimeSurfaceId)}
        />
      )}
    >
      {activeSurfaceId === "overview" ? overviewContent : null}
      {activeSurfaceId === "executors" ? executorsContent : null}
      {activeSurfaceId === "workspaces" ? workspacesContent : null}
      {activeSurfaceId === "governance" ? governanceContent : null}
    </DesktopWindow>
  );
}
