import type { ComponentProps, RefObject } from "react";

import AdaptersPanel from "../AdaptersPanel";
import ExecutorDetailPanel from "../ExecutorDetailPanel";
import ExecutorsPanel from "../ExecutorsPanel";
import LocksPanel from "../LocksPanel";
import OperatorOverviewPanel from "../OperatorOverviewPanel";
import OverviewContextStrip from "../OverviewContextStrip";
import Phase7CapabilitySummaryPanel from "../Phase7CapabilitySummaryPanel";
import PoliciesPanel from "../PoliciesPanel";
import SystemStatusPanel from "../SystemStatusPanel";
import WorkspaceDetailPanel from "../WorkspaceDetailPanel";
import WorkspacesPanel from "../WorkspacesPanel";
import RuntimeWorkspaceView from "./RuntimeWorkspaceView";

type RuntimeWorkspaceDesktopProps = {
  activeSurfaceId: ComponentProps<typeof RuntimeWorkspaceView>["activeSurfaceId"];
  items: ComponentProps<typeof RuntimeWorkspaceView>["items"];
  onSelectSurface: ComponentProps<typeof RuntimeWorkspaceView>["onSelectSurface"];
  overview: {
    adapters: ComponentProps<typeof AdaptersPanel>;
    systemStatus: ComponentProps<typeof SystemStatusPanel>;
    operatorOverview: ComponentProps<typeof OperatorOverviewPanel>;
  };
  executors: {
    panelKey: string;
    sectionRef: RefObject<HTMLDivElement>;
    detailSectionRef: RefObject<HTMLDivElement>;
    contextStrip: ComponentProps<typeof OverviewContextStrip>;
    executorsPanel: ComponentProps<typeof ExecutorsPanel>;
    executorDetailPanel: ComponentProps<typeof ExecutorDetailPanel>;
  };
  workspaces: {
    panelKey: string;
    sectionRef: RefObject<HTMLDivElement>;
    detailSectionRef: RefObject<HTMLDivElement>;
    contextStrip: ComponentProps<typeof OverviewContextStrip>;
    workspacesPanel: ComponentProps<typeof WorkspacesPanel>;
    workspaceDetailPanel: ComponentProps<typeof WorkspaceDetailPanel>;
  };
  governance: {
    phase7: ComponentProps<typeof Phase7CapabilitySummaryPanel>;
    locks: ComponentProps<typeof LocksPanel>;
    policies: ComponentProps<typeof PoliciesPanel>;
  };
};

export default function RuntimeWorkspaceDesktop({
  activeSurfaceId,
  items,
  onSelectSurface,
  overview,
  executors,
  workspaces,
  governance,
}: RuntimeWorkspaceDesktopProps) {
  return (
    <RuntimeWorkspaceView
      activeSurfaceId={activeSurfaceId}
      items={items}
      onSelectSurface={onSelectSurface}
      overviewContent={(
        <>
          <AdaptersPanel {...overview.adapters} />
          <SystemStatusPanel {...overview.systemStatus} />
          <OperatorOverviewPanel {...overview.operatorOverview} />
        </>
      )}
      executorsContent={(
        <>
          <div ref={executors.sectionRef}>
            <OverviewContextStrip {...executors.contextStrip} />
            <ExecutorsPanel key={executors.panelKey} {...executors.executorsPanel} />
          </div>
          <div ref={executors.detailSectionRef}>
            <ExecutorDetailPanel {...executors.executorDetailPanel} />
          </div>
        </>
      )}
      workspacesContent={(
        <>
          <div ref={workspaces.sectionRef}>
            <OverviewContextStrip {...workspaces.contextStrip} />
            <WorkspacesPanel key={workspaces.panelKey} {...workspaces.workspacesPanel} />
          </div>
          <div ref={workspaces.detailSectionRef}>
            <WorkspaceDetailPanel {...workspaces.workspaceDetailPanel} />
          </div>
        </>
      )}
      governanceContent={(
        <>
          <Phase7CapabilitySummaryPanel {...governance.phase7} />
          <LocksPanel {...governance.locks} />
          <PoliciesPanel {...governance.policies} />
        </>
      )}
    />
  );
}
