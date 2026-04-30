import { useMemo, type CSSProperties, type ReactNode } from "react";

import DesktopTabStrip, { type DesktopTabStripItem } from "../DesktopTabStrip";
import DockableCockpitLayout from "../cockpits/DockableCockpitLayout";
import { getCockpitLayoutDefaults } from "../cockpits/cockpitLayoutDefaults";
import type { CockpitPanelDefinition } from "../cockpits/cockpitLayoutTypes";

type CockpitSurfaceWorkspaceLayoutProps<SurfaceId extends string> = {
  cockpitId: string;
  activeSurfaceId: SurfaceId;
  items: readonly DesktopTabStripItem[];
  onSelectSurface: (surfaceId: SurfaceId) => void;
  surfaceContent: Record<SurfaceId, ReactNode>;
  activeSurfaceGuideChecklist?: readonly string[];
  workAreaTitle: string;
  workAreaSubtitle: string;
  summaryTitle?: string;
};

export default function CockpitSurfaceWorkspaceLayout<SurfaceId extends string>({
  cockpitId,
  activeSurfaceId,
  items,
  onSelectSurface,
  surfaceContent,
  activeSurfaceGuideChecklist = [],
  workAreaTitle,
  workAreaSubtitle,
  summaryTitle = "Surface summary",
}: CockpitSurfaceWorkspaceLayoutProps<SurfaceId>) {
  const layoutDefaults = getCockpitLayoutDefaults(cockpitId);
  const activeItem = items.find((item) => item.id === activeSurfaceId);

  const panels = useMemo<CockpitPanelDefinition[]>(() => ([
    {
      id: `${cockpitId}-surface-strip`,
      title: "Surface strip",
      subtitle: "Choose a cockpit surface without leaving this workspace",
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
          onSelectItem={(surfaceId) => onSelectSurface(surfaceId as SurfaceId)}
        />
      ),
    },
    {
      id: `${cockpitId}-surface-navigator`,
      title: "Surface navigator",
      subtitle: "Left tools/outliner lane for workspace surfaces",
      truthState: "read-only navigation",
      defaultZone: "left",
      collapsible: true,
      scrollMode: "content",
      priority: "tools",
      minWidth: 240,
      minHeight: 260,
      defaultHeight: 360,
      render: () => (
        <div style={navigatorListStyle}>
          {items.map((item) => {
            const selected = item.id === activeSurfaceId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSurface(item.id as SurfaceId)}
                style={{
                  ...navigatorButtonStyle,
                  ...(selected ? navigatorButtonActiveStyle : null),
                }}
              >
                <strong>{item.label}</strong>
                <span style={navigatorDetailStyle}>{`Open ${item.label} surface`}</span>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      id: `${cockpitId}-surface-work-area`,
      title: workAreaTitle,
      subtitle: workAreaSubtitle,
      truthState: "active surface",
      defaultZone: "center",
      collapsible: true,
      scrollMode: "content",
      priority: "primary",
      minWidth: 520,
      minHeight: 360,
      defaultHeight: 560,
      render: () => (
        <div style={surfaceStackStyle}>
          {items.map((item) => (
            <div
              key={`surface-${item.id}`}
              aria-hidden={item.id !== activeSurfaceId}
              style={item.id === activeSurfaceId ? visibleSurfaceStyle : hiddenSurfaceStyle}
            >
              {surfaceContent[item.id as SurfaceId]}
            </div>
          ))}
        </div>
      ),
    },
    {
      id: `${cockpitId}-surface-inspector`,
      title: "Inspector and truth",
      subtitle: "Right details lane for active surface context and checklist truth",
      truthState: "status / checklist",
      defaultZone: "right",
      collapsible: true,
      scrollMode: "content",
      priority: "status",
      minWidth: 280,
      minHeight: 260,
      defaultHeight: 340,
      render: () => (
        <section style={inspectorStyle}>
          <p style={inspectorDetailStyle}>
            <strong>Active surface:</strong> {activeItem?.label ?? "unknown"}
          </p>
          <p style={inspectorDetailStyle}>
            <strong>Surface lane:</strong> {activeItem?.label ?? "unavailable"}
          </p>
          <p style={inspectorDetailStyle}>
            <strong>Help:</strong> {activeItem?.helpTooltip ?? "unavailable"}
          </p>
          {activeSurfaceGuideChecklist.length > 0 ? (
            <>
              <strong>Checklist</strong>
              <ul style={checklistStyle}>
                {activeSurfaceGuideChecklist.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </>
          ) : (
            <p style={inspectorDetailStyle}>Checklist unavailable.</p>
          )}
        </section>
      ),
    },
    {
      id: `${cockpitId}-surface-summary`,
      title: summaryTitle,
      subtitle: "Bottom drawer for lane summaries and quick next-step context",
      truthState: "summary",
      defaultZone: "bottom",
      collapsible: true,
      scrollMode: "content",
      priority: "evidence",
      minHeight: 180,
      defaultHeight: 220,
      render: () => (
        <div style={summaryGridStyle}>
          {items.map((item) => (
            <article key={`summary-${item.id}`} style={summaryCardStyle}>
              <strong>{item.label}</strong>
              <p style={summaryDetailStyle}>{`Surface lane: ${item.label}`}</p>
              <p style={summaryDetailStyle}>
                <strong>Tooltip:</strong> {item.helpTooltip || "unavailable"}
              </p>
            </article>
          ))}
        </div>
      ),
    },
  ]), [
    activeItem?.detail,
    activeItem?.helpTooltip,
    activeItem?.label,
    activeSurfaceGuideChecklist,
    activeSurfaceId,
    cockpitId,
    items,
    onSelectSurface,
    summaryTitle,
    surfaceContent,
    workAreaSubtitle,
    workAreaTitle,
  ]);

  return (
    <DockableCockpitLayout
      cockpitId={cockpitId}
      panels={panels}
      defaultPresetId={layoutDefaults.presetId}
      splitConstraints={layoutDefaults.splitConstraints}
    />
  );
}

const surfaceStackStyle = {
  display: "grid",
  minWidth: 0,
  minHeight: 0,
} satisfies CSSProperties;

const visibleSurfaceStyle = {
  display: "grid",
  gap: 16,
  minWidth: 0,
  minHeight: 0,
} satisfies CSSProperties;

const hiddenSurfaceStyle = {
  display: "none",
} satisfies CSSProperties;

const navigatorListStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
} satisfies CSSProperties;

const navigatorButtonStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--app-panel-border)",
  borderRadius: 12,
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  padding: "10px 11px",
  textAlign: "left",
  display: "grid",
  gap: 4,
  cursor: "pointer",
} satisfies CSSProperties;

const navigatorButtonActiveStyle = {
  borderColor: "color-mix(in srgb, var(--app-accent) 48%, var(--app-panel-border))",
  boxShadow: "0 0 0 2px color-mix(in srgb, var(--app-accent) 24%, transparent)",
  background: "color-mix(in srgb, var(--app-accent) 10%, var(--app-panel-bg-alt))",
} satisfies CSSProperties;

const navigatorDetailStyle = {
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const inspectorStyle = {
  display: "grid",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const inspectorDetailStyle = {
  margin: 0,
  fontSize: 13,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const checklistStyle = {
  margin: 0,
  paddingLeft: 18,
  display: "grid",
  gap: 6,
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  minWidth: 0,
} satisfies CSSProperties;

const summaryCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 10,
  background: "var(--app-panel-bg-alt)",
  padding: "10px 11px",
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const summaryDetailStyle = {
  margin: 0,
  fontSize: 12,
  color: "var(--app-subtle-color)",
  overflowWrap: "anywhere",
} satisfies CSSProperties;
