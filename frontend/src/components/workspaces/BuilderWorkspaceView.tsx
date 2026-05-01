import { useState, type CSSProperties, type ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
import GuidedAdvancedSection from "../GuidedAdvancedSection";
import RecommendedActionsPanel from "../RecommendedActionsPanel";
import DockableCockpitLayout from "../cockpits/DockableCockpitLayout";
import { getCockpitLayoutDefaults } from "../cockpits/cockpitLayoutDefaults";
import type { CockpitPanelDefinition } from "../cockpits/cockpitLayoutTypes";
import {
  getWorkspaceGuide,
  getWorkspaceWindowGuide,
  mergeGuideChecklists,
} from "../../content/operatorGuide";
import type { BuilderRecommendationActionId, RecommendationDescriptor } from "../../lib/recommendations";

type BuilderSurfaceId = "start" | "mission-control" | "active-lane" | "autonomy" | "cockpit-builder";

type BuilderWorkspaceViewProps = {
  overviewContent: ReactNode;
  worktreesContent: ReactNode;
  missionBoardContent: ReactNode;
  laneCreateContent: ReactNode;
  workerLifecycleContent: ReactNode;
  terminalsContent: ReactNode;
  autonomyInboxContent: ReactNode;
  cockpitBuilderContent?: ReactNode;
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
const cockpitBuilderWindow = {
  title: "Cockpit Builder",
  subtitle: "Generate cockpit definition JSON previews and session-only launcher prototypes.",
  tooltip: "Use Cockpit Builder to scaffold a new cockpit definition safely before committing registry code changes.",
  instructions: [
    "Fill the cockpit fields to generate a definition preview; route key and panel metadata update live.",
    "Copy JSON or save a session-only Home preview for local validation; this does not write files.",
    "Keep prompt templates preview-only with autoExecute=false and explicit safety labels.",
    "List blocked capabilities with reason and next unlock so future packets stay truthful.",
    "Commit finalized definitions in a separate reviewed slice to make them first-class cockpit apps.",
  ],
};

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
  {
    id: "cockpit-builder",
    label: "Cockpit Builder",
    detail: "Generate cockpit JSON definitions, preview safe metadata, and stage session-only launcher drafts.",
    helpTooltip: cockpitBuilderWindow.tooltip,
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
  cockpitBuilderContent,
  recommendations = [],
  guidedMode = true,
}: BuilderWorkspaceViewProps) {
  const layoutDefaults = getCockpitLayoutDefaults("builder");
  const [activeSurfaceId, setActiveSurfaceId] = useState<BuilderSurfaceId>("start");
  const recommendationEntries = recommendations.map((entry) => ({
    ...entry,
    suggestedBecause: entry.detail,
    opensLabel: getBuilderRecommendationOpensLabel(entry.actionId),
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
        : activeSurfaceId === "cockpit-builder"
          ? cockpitBuilderWindow
        : {
            title: "Builder start here",
            subtitle: "Begin with lane setup and current state before drilling into coordination or worker-specific tools.",
            tooltip: "This guided Builder surface groups overview, lane creation, and worktree visibility into a calmer first stop.",
            instructions: builderWorkspace.operatorChecklist,
          };

  const activeSurfaceContent = activeSurfaceId === "start" ? (
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
    activeSurfaceId === "autonomy" ? (
      <DesktopWindow
        variant="nested"
        title={autonomyInboxWindow.title}
        subtitle={autonomyInboxWindow.subtitle}
        helpTooltip={autonomyInboxWindow.tooltip}
      >
        {autonomyInboxContent}
      </DesktopWindow>
    ) : (
      <DesktopWindow
        variant="nested"
        title={cockpitBuilderWindow.title}
        subtitle={cockpitBuilderWindow.subtitle}
        helpTooltip={cockpitBuilderWindow.tooltip}
        guideTitle="How to use this window"
        guideChecklist={cockpitBuilderWindow.instructions}
      >
        {cockpitBuilderContent ?? (
          <article style={builderInfoCardStyle}>
            <strong>Cockpit Builder panel unavailable</strong>
            <p style={builderInfoDetailStyle}>
              Attach a Cockpit Builder panel to this surface to generate local JSON cockpit previews.
            </p>
          </article>
        )}
      </DesktopWindow>
    )
  );

  const cockpitPanels: CockpitPanelDefinition[] = [
    {
      id: "builder-command-strip",
      title: "Builder command strip",
      subtitle: "Top pipeline strip for surface selection",
      truthState: "workspace routing",
      defaultZone: "top",
      collapsible: false,
      scrollMode: "none",
      priority: "tools",
      minHeight: 96,
      defaultHeight: 112,
      render: () => (
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => setActiveSurfaceId(surfaceId as BuilderSurfaceId)}
        />
      ),
    },
    {
      id: "builder-tools-outliner",
      title: "Builder tools and outliner",
      subtitle: "Left lane for cockpit surface shortcuts and safe operator focus",
      truthState: "read-only navigation",
      defaultZone: "left",
      collapsible: true,
      scrollMode: "content",
      priority: "tools",
      minWidth: 260,
      minHeight: 260,
      defaultHeight: 360,
      render: () => (
        <section style={builderInfoStackStyle}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSurfaceId(item.id as BuilderSurfaceId)}
              style={{
                ...builderNavButtonStyle,
                ...(item.id === activeSurfaceId ? builderNavButtonActiveStyle : null),
              }}
            >
              <strong>{item.label}</strong>
              <span style={builderNavDetailStyle}>{item.detail}</span>
            </button>
          ))}
        </section>
      ),
    },
    {
      id: "builder-main-work-area",
      title: "Builder dominant work area",
      subtitle: "Center workspace for lane setup, mission control, active lane operations, and autonomy inbox work",
      truthState: "active surface",
      defaultZone: "center",
      collapsible: true,
      scrollMode: "content",
      priority: "primary",
      minWidth: 560,
      minHeight: 360,
      defaultHeight: 580,
      render: () => activeSurfaceContent,
    },
    {
      id: "builder-inspector",
      title: "Inspector and checklist",
      subtitle: "Right lane for active surface details and operator guidance",
      truthState: "status / guidance",
      defaultZone: "right",
      collapsible: true,
      scrollMode: "content",
      priority: "status",
      minWidth: 300,
      minHeight: 260,
      defaultHeight: 340,
      render: () => (
        <section style={builderInfoStackStyle}>
          <article style={builderInfoCardStyle}>
            <strong>Active surface</strong>
            <p style={builderInfoDetailStyle}>{activeSurface.title}</p>
            <p style={builderInfoDetailStyle}>{activeSurface.subtitle}</p>
            <p style={builderInfoDetailStyle}>
              <strong>Tooltip:</strong> {activeSurface.tooltip}
            </p>
          </article>
          <article style={builderInfoCardStyle}>
            <strong>Checklist</strong>
            <ul style={builderChecklistStyle}>
              {activeSurface.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ul>
          </article>
        </section>
      ),
    },
    {
      id: "builder-evidence-drawer",
      title: "Recommendations and evidence drawer",
      subtitle: "Bottom drawer for recommended actions and follow-up context",
      truthState: "review / next action",
      defaultZone: "bottom",
      collapsible: true,
      scrollMode: "content",
      priority: "evidence",
      minHeight: 180,
      defaultHeight: 220,
      render: () => (
        <RecommendedActionsPanel
          title="Builder recommendations"
          description="Local coordination guidance based on current worker lanes, mission-board tasks, waiters, notifications, terminals, and Builder inbox state."
          entries={recommendationEntries}
        />
      ),
    },
  ];

  return (
    <DockableCockpitLayout
      cockpitId="builder"
      panels={cockpitPanels}
      defaultPresetId={layoutDefaults.presetId}
      splitConstraints={layoutDefaults.splitConstraints}
    />
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

function getBuilderRecommendationOpensLabel(actionId: BuilderRecommendationActionId) {
  if (actionId === "open_builder_mission_control") {
    return "Builder > Mission Control window";
  }
  if (actionId === "open_builder_active_lane") {
    return "Builder > Active Lane window";
  }
  if (actionId === "open_builder_autonomy") {
    return "Builder > Autonomy window";
  }
  return "Builder > Start Here window";
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

const builderInfoStackStyle = {
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const builderInfoCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  background: "var(--app-panel-bg-alt)",
  padding: "10px 11px",
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const builderInfoDetailStyle = {
  margin: 0,
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const builderChecklistStyle = {
  margin: 0,
  paddingLeft: 18,
  display: "grid",
  gap: 6,
  fontSize: 12,
  color: "var(--app-subtle-color)",
} satisfies CSSProperties;

const builderNavButtonStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--app-panel-border)",
  borderRadius: 10,
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  display: "grid",
  gap: 4,
  textAlign: "left",
  padding: "10px 11px",
  cursor: "pointer",
} satisfies CSSProperties;

const builderNavButtonActiveStyle = {
  borderColor: "color-mix(in srgb, var(--app-accent) 48%, var(--app-panel-border))",
  boxShadow: "0 0 0 2px color-mix(in srgb, var(--app-accent) 24%, transparent)",
} satisfies CSSProperties;

const builderNavDetailStyle = {
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;
