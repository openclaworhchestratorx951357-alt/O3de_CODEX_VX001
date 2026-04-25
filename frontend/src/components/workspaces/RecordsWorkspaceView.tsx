import type { CSSProperties, ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DesktopWindow from "../DesktopWindow";
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
      toolbar={(
        <DesktopTabStrip
          items={items}
          activeItemId={activeSurfaceId}
          onSelectItem={(surfaceId) => onSelectSurface(surfaceId as RecordsSurfaceId)}
        />
      )}
    >
      <div style={surfaceStackStyle}>
        <div aria-hidden={activeSurfaceId !== "runs"} style={activeSurfaceId === "runs" ? visibleSurfaceStyle : hiddenSurfaceStyle}>
          {runsContent}
        </div>
        <div aria-hidden={activeSurfaceId !== "executions"} style={activeSurfaceId === "executions" ? visibleSurfaceStyle : hiddenSurfaceStyle}>
          {executionsContent}
        </div>
        <div aria-hidden={activeSurfaceId !== "artifacts"} style={activeSurfaceId === "artifacts" ? visibleSurfaceStyle : hiddenSurfaceStyle}>
          {artifactsContent}
        </div>
        <div aria-hidden={activeSurfaceId !== "events"} style={activeSurfaceId === "events" ? visibleSurfaceStyle : hiddenSurfaceStyle}>
          {eventsContent}
        </div>
      </div>
    </DesktopWindow>
  );
}

const surfaceStackStyle = {
  display: "grid",
  minWidth: 0,
} satisfies CSSProperties;

const visibleSurfaceStyle = {
  display: "grid",
  gap: 16,
  minWidth: 0,
} satisfies CSSProperties;

const hiddenSurfaceStyle = {
  display: "none",
} satisfies CSSProperties;
