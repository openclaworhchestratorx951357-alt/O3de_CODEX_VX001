import type { ComponentProps } from "react";

import PromptControlPanel from "../PromptControlPanel";
import PromptWorkspaceView from "./PromptWorkspaceView";

type PromptWorkspaceDesktopProps = {
  selectedWorkspaceId: ComponentProps<typeof PromptControlPanel>["selectedWorkspaceId"];
  selectedExecutorId: ComponentProps<typeof PromptControlPanel>["selectedExecutorId"];
  promptLaunchDraftRequest?: ComponentProps<typeof PromptControlPanel>["promptLaunchDraftRequest"];
  onReturnToSourceWorkspace?: ComponentProps<typeof PromptControlPanel>["onReturnToSourceWorkspace"];
  onPlacementProofOnlyReviewChange?: ComponentProps<typeof PromptControlPanel>["onPlacementProofOnlyReviewChange"];
};

export default function PromptWorkspaceDesktop({
  selectedWorkspaceId,
  selectedExecutorId,
  promptLaunchDraftRequest,
  onReturnToSourceWorkspace,
  onPlacementProofOnlyReviewChange,
}: PromptWorkspaceDesktopProps) {
  return (
    <PromptWorkspaceView
      content={(
        <PromptControlPanel
          selectedWorkspaceId={selectedWorkspaceId}
          selectedExecutorId={selectedExecutorId}
          promptLaunchDraftRequest={promptLaunchDraftRequest}
          onReturnToSourceWorkspace={onReturnToSourceWorkspace}
          onPlacementProofOnlyReviewChange={onPlacementProofOnlyReviewChange}
        />
      )}
    />
  );
}
