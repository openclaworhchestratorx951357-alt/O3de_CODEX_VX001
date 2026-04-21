import type { ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";

type RecordsSurfaceId =
  | "runs"
  | "executions"
  | "artifacts";

type RecordsWorkspaceViewProps = {
  activeSurfaceId: RecordsSurfaceId;
  items: readonly DesktopTabStripItem[];
  onSelectSurface: (surfaceId: RecordsSurfaceId) => void;
  runsContent: ReactNode;
  executionsContent: ReactNode;
  artifactsContent: ReactNode;
};

export default function RecordsWorkspaceView({
  activeSurfaceId,
  items,
  onSelectSurface,
  runsContent,
  executionsContent,
  artifactsContent,
}: RecordsWorkspaceViewProps) {
  return (
    <DesktopWindow
      title="Records Explorer"
      subtitle="Inspect persisted runs, executions, and artifacts in a dedicated workspace."
      toolbar={(
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => onSelectSurface(surfaceId as RecordsSurfaceId)}
        />
      )}
    >
      {artifactsContent}
      {executionsContent}
      {runsContent}
    </DesktopWindow>
  );
}
