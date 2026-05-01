import type { ReactNode } from "react";

import type { DesktopTabStripItem } from "../DesktopTabStrip";
import CockpitSurfaceWorkspaceLayout from "./CockpitSurfaceWorkspaceLayout";
import { getWorkspaceSurfaceGuide } from "../../content/operatorGuide";

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
  );
}
