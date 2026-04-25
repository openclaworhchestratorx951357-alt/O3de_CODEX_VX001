import type { ComponentProps } from "react";

import PromptControlPanel from "../PromptControlPanel";
import PromptWorkspaceView from "./PromptWorkspaceView";

type PromptWorkspaceDesktopProps = {
  selectedWorkspaceId: ComponentProps<typeof PromptControlPanel>["selectedWorkspaceId"];
  selectedExecutorId: ComponentProps<typeof PromptControlPanel>["selectedExecutorId"];
};

export default function PromptWorkspaceDesktop({
  selectedWorkspaceId,
  selectedExecutorId,
}: PromptWorkspaceDesktopProps) {
  return (
    <PromptWorkspaceView
      content={(
        <PromptControlPanel
          selectedWorkspaceId={selectedWorkspaceId}
          selectedExecutorId={selectedExecutorId}
        />
      )}
    />
  );
}
