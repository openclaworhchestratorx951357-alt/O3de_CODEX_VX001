import type { ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import { getWorkspaceWindowGuide } from "../../content/operatorGuide";

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

const recordsExplorerWindow = getWorkspaceWindowGuide("records", "records-explorer");

export default function RecordsWorkspaceView({
  activeSurfaceId,
  items,
  onSelectSurface,
  runsContent,
  executionsContent,
  artifactsContent,
}: RecordsWorkspaceViewProps) {
  const activeContent = activeSurfaceId === "artifacts"
    ? artifactsContent
    : activeSurfaceId === "executions"
      ? executionsContent
      : runsContent;

  return (
    <DesktopWindow
      title={recordsExplorerWindow.title}
      subtitle={recordsExplorerWindow.subtitle}
      helpTooltip={recordsExplorerWindow.tooltip}
      toolbar={(
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => onSelectSurface(surfaceId as RecordsSurfaceId)}
        />
      )}
    >
      {activeContent}
    </DesktopWindow>
  );
}
