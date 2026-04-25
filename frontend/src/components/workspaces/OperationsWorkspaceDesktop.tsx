import type { ComponentProps, RefObject } from "react";

import AgentControlPanel from "../AgentControlPanel";
import ApprovalQueue from "../ApprovalQueue";
import CatalogPanel from "../CatalogPanel";
import DispatchForm from "../DispatchForm";
import ResponseEnvelopeView from "../ResponseEnvelopeView";
import TaskTimeline from "../TaskTimeline";
import OperationsWorkspaceView from "./OperationsWorkspaceView";

type OperationsWorkspaceDesktopProps = {
  activeSurfaceId: ComponentProps<typeof OperationsWorkspaceView>["activeSurfaceId"];
  items: ComponentProps<typeof OperationsWorkspaceView>["items"];
  onSelectSurface: ComponentProps<typeof OperationsWorkspaceView>["onSelectSurface"];
  dispatch: {
    catalogError: string | null;
    catalogAgents: ComponentProps<typeof CatalogPanel>["agents"];
    adapters: ComponentProps<typeof DispatchForm>["adapters"];
    readiness: ComponentProps<typeof DispatchForm>["readiness"];
    onResponse: ComponentProps<typeof DispatchForm>["onResponse"];
    lastResponse: ComponentProps<typeof ResponseEnvelopeView>["response"];
  };
  agents: ComponentProps<typeof AgentControlPanel>;
  approvals: ComponentProps<typeof ApprovalQueue> & {
    panelKey: string;
  };
  timeline: ComponentProps<typeof TaskTimeline> & {
    panelKey: string;
  };
  approvalsSectionRef: RefObject<HTMLElement>;
  timelineSectionRef: RefObject<HTMLDivElement>;
};

export default function OperationsWorkspaceDesktop({
  activeSurfaceId,
  items,
  onSelectSurface,
  dispatch,
  agents,
  approvals,
  timeline,
  approvalsSectionRef,
  timelineSectionRef,
}: OperationsWorkspaceDesktopProps) {
  return (
    <OperationsWorkspaceView
      activeSurfaceId={activeSurfaceId}
      items={items}
      onSelectSurface={onSelectSurface}
      dispatchContent={(
        <>
          {dispatch.catalogError ? <p style={{ color: "var(--app-danger-text)" }}>{dispatch.catalogError}</p> : null}
          <CatalogPanel agents={dispatch.catalogAgents} />
          <DispatchForm
            adapters={dispatch.adapters}
            readiness={dispatch.readiness}
            onResponse={dispatch.onResponse}
            agents={dispatch.catalogAgents}
          />
          <ResponseEnvelopeView response={dispatch.lastResponse} />
        </>
      )}
      agentsContent={<AgentControlPanel {...agents} />}
      approvalsContent={(
        <section ref={approvalsSectionRef}>
          <ApprovalQueue key={approvals.panelKey} {...approvals} />
        </section>
      )}
      timelineContent={(
        <div ref={timelineSectionRef}>
          <TaskTimeline key={timeline.panelKey} {...timeline} />
        </div>
      )}
    />
  );
}
