import type { ReactNode } from "react";

import type { DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import CockpitSurfaceWorkspaceLayout from "./CockpitSurfaceWorkspaceLayout";
import {
  getWorkspaceSurfaceGuide,
  getWorkspaceWindowGuide,
  mergeGuideChecklists,
} from "../../content/operatorGuide";

type RecordsSurfaceId =
  | "runs"
  | "executions"
  | "artifacts"
  | "events";

type RecordsWorkspaceViewProps = {
  activeSurfaceId: RecordsSurfaceId;
  items: readonly DesktopTabStripItem[];
  onSelectSurface: (surfaceId: RecordsSurfaceId) => void;
  runsContent: ReactNode;
  executionsContent: ReactNode;
  artifactsContent: ReactNode;
  eventsContent: ReactNode;
};

const recordsExplorerWindow = getWorkspaceWindowGuide("records", "records-explorer");

export default function RecordsWorkspaceView({
  activeSurfaceId,
  items,
  onSelectSurface,
  runsContent,
  executionsContent,
  artifactsContent,
  eventsContent,
}: RecordsWorkspaceViewProps) {
  const activeSurfaceGuide = getWorkspaceSurfaceGuide("records", activeSurfaceId);

  return (
    <DesktopWindow
      title={recordsExplorerWindow.title}
      subtitle={recordsExplorerWindow.subtitle}
      helpTooltip={recordsExplorerWindow.tooltip}
      guideTitle="How to use this workspace"
      guideChecklist={mergeGuideChecklists(
        recordsExplorerWindow.instructions,
        activeSurfaceGuide.instructions,
      )}
    >
      <CockpitSurfaceWorkspaceLayout
        cockpitId="records"
        activeSurfaceId={activeSurfaceId}
        items={items}
        onSelectSurface={onSelectSurface}
        activeSurfaceGuideChecklist={activeSurfaceGuide.instructions}
        workAreaTitle="Records dominant work area"
        workAreaSubtitle="Center records viewport for active lane review and persisted evidence detail"
        summaryTitle="Records lane summary drawer"
        surfaceContent={{
          runs: runsContent,
          executions: executionsContent,
          artifacts: artifactsContent,
          events: eventsContent,
        }}
      />
    </DesktopWindow>
  );
}
