import { useState, type CSSProperties, type ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import GuidedAdvancedSection from "../GuidedAdvancedSection";
import RecommendedActionsPanel from "../RecommendedActionsPanel";
import {
  getWorkspaceGuide,
  getWorkspaceWindowGuide,
  mergeGuideChecklists,
} from "../../content/operatorGuide";
import type { BuilderRecommendationActionId, RecommendationDescriptor } from "../../lib/recommendations";

type BuilderSurfaceId = "start" | "mission-control" | "active-lane" | "autonomy";

type BuilderWorkspaceViewProps = {
  overviewContent: ReactNode;
  worktreesContent: ReactNode;
  missionBoardContent: ReactNode;
  laneCreateContent: ReactNode;
  workerLifecycleContent: ReactNode;
  terminalsContent: ReactNode;
  autonomyInboxContent: ReactNode;
  recommendations?: readonly RecommendationDescriptor<BuilderRecommendationActionId>[];
  guidedMode?: boolean;
};

const overviewWindow = getWorkspaceWindowGuide("builder", "builder-overview");
const worktreesWindow = getWorkspaceWindowGuide("builder", "worktree-lanes");
const missionBoardWindow = getWorkspaceWindowGuide("builder", "mission-board");
const laneCreateWindow = getWorkspaceWindowGuide("builder", "lane-create");
const workerLifecycleWindow = getWorkspaceWindowGuide("builder", "worker-lifecycle");
const workerTerminalsWindow = getWorkspaceWindowGuide("builder", "worker-terminals");
const autonomyInboxWindow = getWorkspaceWindowGuide("builder", "autonomy-inbox");
const builderWorkspace = getWorkspaceGuide("builder");

const items: DesktopTabStripItem[] = [
  {
    id: "start",
    label: "Start Here",
    detail: "Orient the lane, launch worktrees, and seed shared tasks before touching advanced controls.",
    helpTooltip: "Use Start here for the calmest Builder entry path.",
  },
  {
    id: "mission-control",
    label: "Mission Control",
    detail: "Focus only on workers, tasks, waiters, and notifications when coordinating shared work.",
    helpTooltip: missionBoardWindow.tooltip,
  },
  {
    id: "active-lane",
    label: "Active Lane",
    detail: "Work with the selected lane, heartbeat state, and managed terminals without board clutter.",
    helpTooltip: workerLifecycleWindow.tooltip,
  },
  {
    id: "autonomy",
    label: "Autonomy",
    detail: "Review the Builder inbox and related guidance in its own quieter surface.",
    helpTooltip: autonomyInboxWindow.tooltip,
  },
];

export default function BuilderWorkspaceView({
  overviewContent,
  worktreesContent,
  missionBoardContent,
  laneCreateContent,
  workerLifecycleContent,
  terminalsContent,
  autonomyInboxContent,
  recommendations = [],
  guidedMode = true,
}: BuilderWorkspaceViewProps) {
  const [activeSurfaceId, setActiveSurfaceId] = useState<BuilderSurfaceId>("start");
  const recommendationEntries = recommendations.map((entry) => ({
    ...entry,
    onAction: () => {
      setActiveSurfaceId(resolveBuilderRecommendationSurface(entry.actionId));
    },
  }));

  const activeSurface = activeSurfaceId === "mission-control"
    ? missionBoardWindow
    : activeSurfaceId === "active-lane"
      ? {
          title: "Active Lane",
          subtitle: "Worker lifecycle controls and managed terminals for the selected lane.",
          tooltip: "Use Active Lane to keep worker lifecycle actions and managed process visibility together while you work one lane at a time.",
          instructions: mergeGuideChecklists(
            workerLifecycleWindow.instructions,
            workerTerminalsWindow.instructions,
          ),
        }
      : activeSurfaceId === "autonomy"
        ? autonomyInboxWindow
        : {
            title: "Builder start here",
            subtitle: "Begin with lane setup and current state before drilling into coordination or worker-specific tools.",
            tooltip: "This guided Builder surface groups overview, lane creation, and worktree visibility into a calmer first stop.",
            instructions: builderWorkspace.operatorChecklist,
          };

  return (
    <DesktopWindow
      title={activeSurface.title}
      subtitle={activeSurface.subtitle}
      helpTooltip={activeSurface.tooltip}
      guideTitle="How to use this workspace"
      guideChecklist={activeSurface.instructions}
      toolbar={(
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => setActiveSurfaceId(surfaceId as BuilderSurfaceId)}
        />
      )}
    >
      <RecommendedActionsPanel
        title="Builder recommendations"
        description="Local coordination guidance based on current worker lanes, mission-board tasks, waiters, notifications, terminals, and Builder inbox state."
        entries={recommendationEntries}
      />
      {activeSurfaceId === "start" ? (
        <div style={builderSurfaceStackStyle}>
          <div style={builderTwoPaneGridStyle}>
            <DesktopWindow
              variant="nested"
              title={overviewWindow.title}
              subtitle={overviewWindow.subtitle}
              helpTooltip={overviewWindow.tooltip}
              guideTitle="How to use this window"
              guideChecklist={overviewWindow.instructions}
            >
              {overviewContent}
            </DesktopWindow>
            <DesktopWindow
              variant="nested"
              title={laneCreateWindow.title}
              subtitle={laneCreateWindow.subtitle}
              helpTooltip={laneCreateWindow.tooltip}
              guideTitle="How to use this window"
              guideChecklist={laneCreateWindow.instructions}
            >
              {laneCreateContent}
            </DesktopWindow>
          </div>
          <GuidedAdvancedSection
            guidedMode={guidedMode}
            title="Worktree lane inventory"
            description="Worktree inventory and branch details are still one click away, but guided mode keeps the first Builder screen focused on setup and recommendations."
          >
            <DesktopWindow
              variant="nested"
              title={worktreesWindow.title}
              subtitle={worktreesWindow.subtitle}
              helpTooltip={worktreesWindow.tooltip}
              guideTitle="How to use this window"
              guideChecklist={worktreesWindow.instructions}
            >
              {worktreesContent}
            </DesktopWindow>
          </GuidedAdvancedSection>
        </div>
      ) : activeSurfaceId === "mission-control" ? (
        <DesktopWindow
          variant="nested"
          title={missionBoardWindow.title}
          subtitle={missionBoardWindow.subtitle}
          helpTooltip={missionBoardWindow.tooltip}
        >
          {missionBoardContent}
        </DesktopWindow>
      ) : activeSurfaceId === "active-lane" ? (
        <div style={builderTwoPaneGridStyle}>
          <DesktopWindow
            variant="nested"
            title={workerLifecycleWindow.title}
            subtitle={workerLifecycleWindow.subtitle}
            helpTooltip={workerLifecycleWindow.tooltip}
            guideTitle="How to use this window"
            guideChecklist={workerLifecycleWindow.instructions}
          >
            {workerLifecycleContent}
          </DesktopWindow>
          <DesktopWindow
            variant="nested"
            title={workerTerminalsWindow.title}
            subtitle={workerTerminalsWindow.subtitle}
            helpTooltip={workerTerminalsWindow.tooltip}
            guideTitle="How to use this window"
            guideChecklist={workerTerminalsWindow.instructions}
          >
            {terminalsContent}
          </DesktopWindow>
        </div>
      ) : (
        <DesktopWindow
          variant="nested"
          title={autonomyInboxWindow.title}
          subtitle={autonomyInboxWindow.subtitle}
          helpTooltip={autonomyInboxWindow.tooltip}
        >
          {autonomyInboxContent}
        </DesktopWindow>
      )}
    </DesktopWindow>
  );
}

function resolveBuilderRecommendationSurface(actionId: BuilderRecommendationActionId): BuilderSurfaceId {
  if (actionId === "open_builder_mission_control") {
    return "mission-control";
  }
  if (actionId === "open_builder_active_lane") {
    return "active-lane";
  }
  if (actionId === "open_builder_autonomy") {
    return "autonomy";
  }
  return "start";
}

const builderSurfaceStackStyle = {
  display: "grid",
  gap: 16,
  alignItems: "start",
} satisfies CSSProperties;

const builderTwoPaneGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  alignItems: "start",
} satisfies CSSProperties;
