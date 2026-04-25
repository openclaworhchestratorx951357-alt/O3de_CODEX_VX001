import type { ComponentProps } from "react";

import OverviewAttentionPanel from "./OverviewAttentionPanel";
import OverviewCloseoutReadinessPanel from "./OverviewCloseoutReadinessPanel";
import OverviewContextMemoryPanel from "./OverviewContextMemoryPanel";
import OverviewHandoffConfidencePanel from "./OverviewHandoffConfidencePanel";
import OverviewHandoffExportPanel from "./OverviewHandoffExportPanel";
import OverviewHandoffPackagePanel from "./OverviewHandoffPackagePanel";
import OverviewReviewQueuePanel from "./OverviewReviewQueuePanel";
import OverviewReviewSessionPanel from "./OverviewReviewSessionPanel";

export type HomeOverviewPanelDeckProps = {
  attention: ComponentProps<typeof OverviewAttentionPanel>;
  closeoutReadiness: ComponentProps<typeof OverviewCloseoutReadinessPanel>;
  handoffConfidence: ComponentProps<typeof OverviewHandoffConfidencePanel>;
  handoffPackage: ComponentProps<typeof OverviewHandoffPackagePanel>;
  handoffExport: ComponentProps<typeof OverviewHandoffExportPanel>;
  reviewSession: ComponentProps<typeof OverviewReviewSessionPanel>;
  reviewQueue: ComponentProps<typeof OverviewReviewQueuePanel>;
  contextMemory: ComponentProps<typeof OverviewContextMemoryPanel>;
};

export default function HomeOverviewPanelDeck({
  attention,
  closeoutReadiness,
  handoffConfidence,
  handoffPackage,
  handoffExport,
  reviewSession,
  reviewQueue,
  contextMemory,
}: HomeOverviewPanelDeckProps) {
  return (
    <>
      <OverviewAttentionPanel {...attention} />
      <OverviewCloseoutReadinessPanel {...closeoutReadiness} />
      <OverviewHandoffConfidencePanel {...handoffConfidence} />
      <OverviewHandoffPackagePanel {...handoffPackage} />
      <OverviewHandoffExportPanel {...handoffExport} />
      <OverviewReviewSessionPanel {...reviewSession} />
      <OverviewReviewQueuePanel {...reviewQueue} />
      <OverviewContextMemoryPanel {...contextMemory} />
    </>
  );
}
