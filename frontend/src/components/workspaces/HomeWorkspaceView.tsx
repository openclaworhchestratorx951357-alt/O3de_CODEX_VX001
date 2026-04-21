import type { ReactNode } from "react";

import DesktopWindow from "../DesktopWindow";
import { getWorkspaceWindowGuide } from "../../content/operatorGuide";

type HomeWorkspaceViewProps = {
  missionControlContent: ReactNode;
  launchpadContent: ReactNode;
  overviewContent: ReactNode;
  guideContent: ReactNode;
};

const missionControlWindow = getWorkspaceWindowGuide("home", "mission-control");
const launchpadWindow = getWorkspaceWindowGuide("home", "launchpad");
const overviewWindow = getWorkspaceWindowGuide("home", "operator-overview");
const guidebookWindow = getWorkspaceWindowGuide("home", "guidebook");

export default function HomeWorkspaceView({
  missionControlContent,
  launchpadContent,
  overviewContent,
  guideContent,
}: HomeWorkspaceViewProps) {
  return (
    <>
      <DesktopWindow
        title={missionControlWindow.title}
        subtitle={missionControlWindow.subtitle}
        helpTooltip={missionControlWindow.tooltip}
      >
        {missionControlContent}
      </DesktopWindow>

      <DesktopWindow
        title={launchpadWindow.title}
        subtitle={launchpadWindow.subtitle}
        helpTooltip={launchpadWindow.tooltip}
      >
        {launchpadContent}
      </DesktopWindow>

      <DesktopWindow
        title={overviewWindow.title}
        subtitle={overviewWindow.subtitle}
        helpTooltip={overviewWindow.tooltip}
      >
        {overviewContent}
      </DesktopWindow>

      <DesktopWindow
        title={guidebookWindow.title}
        subtitle={guidebookWindow.subtitle}
        helpTooltip={guidebookWindow.tooltip}
      >
        {guideContent}
      </DesktopWindow>
    </>
  );
}
