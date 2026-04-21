import type { ReactNode } from "react";

import DesktopWindow from "../DesktopWindow";

type HomeWorkspaceViewProps = {
  missionControlContent: ReactNode;
  launchpadContent: ReactNode;
  overviewContent: ReactNode;
};

export default function HomeWorkspaceView({
  missionControlContent,
  launchpadContent,
  overviewContent,
}: HomeWorkspaceViewProps) {
  return (
    <>
      <DesktopWindow
        title="Mission Control"
        subtitle="High-level operator shell controls, lane memory, and refresh entry points."
      >
        {missionControlContent}
      </DesktopWindow>

      <DesktopWindow
        title="Launchpad"
        subtitle="Open focused workspaces instead of hunting through one continuous operator page."
      >
        {launchpadContent}
      </DesktopWindow>

      <DesktopWindow
        title="Operator Overview"
        subtitle="Attention queue, handoff posture, and browser-local review memory."
      >
        {overviewContent}
      </DesktopWindow>
    </>
  );
}
