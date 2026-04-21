import type { ComponentProps, RefObject } from "react";

import ArtifactDetailPanel from "../ArtifactDetailPanel";
import ArtifactsPanel from "../ArtifactsPanel";
import ExecutionDetailPanel from "../ExecutionDetailPanel";
import ExecutionsPanel from "../ExecutionsPanel";
import OverviewContextStrip from "../OverviewContextStrip";
import RunDetailPanel from "../RunDetailPanel";
import RunsPanel from "../RunsPanel";
import RecordsWorkspaceView from "./RecordsWorkspaceView";

type RecordsWorkspaceDesktopProps = {
  activeSurfaceId: ComponentProps<typeof RecordsWorkspaceView>["activeSurfaceId"];
  items: ComponentProps<typeof RecordsWorkspaceView>["items"];
  onSelectSurface: ComponentProps<typeof RecordsWorkspaceView>["onSelectSurface"];
  artifacts: {
    panelKey: string;
    sectionRef: RefObject<HTMLDivElement>;
    detailSectionRef: RefObject<HTMLDivElement>;
    contextStrip: ComponentProps<typeof OverviewContextStrip>;
    artifactsPanel: ComponentProps<typeof ArtifactsPanel>;
    artifactDetailPanel: ComponentProps<typeof ArtifactDetailPanel>;
  };
  executions: {
    panelKey: string;
    sectionRef: RefObject<HTMLDivElement>;
    detailSectionRef: RefObject<HTMLDivElement>;
    contextStrip: ComponentProps<typeof OverviewContextStrip>;
    executionsPanel: ComponentProps<typeof ExecutionsPanel>;
    executionDetailPanel: ComponentProps<typeof ExecutionDetailPanel>;
  };
  runs: {
    panelKey: string;
    sectionRef: RefObject<HTMLDivElement>;
    detailSectionRef: RefObject<HTMLDivElement>;
    contextStrip: ComponentProps<typeof OverviewContextStrip>;
    runsPanel: ComponentProps<typeof RunsPanel>;
    runDetailPanel: ComponentProps<typeof RunDetailPanel>;
  };
};

export default function RecordsWorkspaceDesktop({
  activeSurfaceId,
  items,
  onSelectSurface,
  artifacts,
  executions,
  runs,
}: RecordsWorkspaceDesktopProps) {
  return (
    <RecordsWorkspaceView
      activeSurfaceId={activeSurfaceId}
      items={items}
      onSelectSurface={onSelectSurface}
      artifactsContent={(
        <>
          <div ref={artifacts.sectionRef}>
            <OverviewContextStrip {...artifacts.contextStrip} />
            <ArtifactsPanel key={artifacts.panelKey} {...artifacts.artifactsPanel} />
          </div>
          <div ref={artifacts.detailSectionRef}>
            <ArtifactDetailPanel {...artifacts.artifactDetailPanel} />
          </div>
        </>
      )}
      executionsContent={(
        <>
          <div ref={executions.sectionRef}>
            <OverviewContextStrip {...executions.contextStrip} />
            <ExecutionsPanel key={executions.panelKey} {...executions.executionsPanel} />
          </div>
          <div ref={executions.detailSectionRef}>
            <ExecutionDetailPanel {...executions.executionDetailPanel} />
          </div>
        </>
      )}
      runsContent={(
        <>
          <div ref={runs.sectionRef}>
            <OverviewContextStrip {...runs.contextStrip} />
            <RunsPanel key={runs.panelKey} {...runs.runsPanel} />
          </div>
          <div ref={runs.detailSectionRef}>
            <RunDetailPanel {...runs.runDetailPanel} />
          </div>
        </>
      )}
    />
  );
}
