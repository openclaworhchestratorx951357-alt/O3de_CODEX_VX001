import type { ReactNode } from "react";

import DesktopWindow from "../DesktopWindow";
import { getWorkspaceWindowGuide } from "../../content/operatorGuide";

type PromptWorkspaceViewProps = {
  content: ReactNode;
};

const promptStudioWindow = getWorkspaceWindowGuide("prompt", "prompt-studio");

export default function PromptWorkspaceView({
  content,
}: PromptWorkspaceViewProps) {
  return (
    <DesktopWindow
      title={promptStudioWindow.title}
      subtitle={promptStudioWindow.subtitle}
      helpTooltip={promptStudioWindow.tooltip}
      guideTitle="How to use this workspace"
      guideChecklist={promptStudioWindow.instructions}
    >
      {content}
    </DesktopWindow>
  );
}
