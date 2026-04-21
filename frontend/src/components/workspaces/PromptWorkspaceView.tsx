import type { ReactNode } from "react";

import DesktopWindow from "../DesktopWindow";

type PromptWorkspaceViewProps = {
  content: ReactNode;
};

export default function PromptWorkspaceView({
  content,
}: PromptWorkspaceViewProps) {
  return (
    <DesktopWindow
      title="Prompt Studio"
      subtitle="Natural-language control surface with explicit admitted-real versus simulated guardrails."
    >
      {content}
    </DesktopWindow>
  );
}
