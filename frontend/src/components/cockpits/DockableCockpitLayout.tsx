import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from "react";

import DockablePanel from "./DockablePanel";
import {
  clearCockpitLayoutState,
  createCockpitLayoutStateFromPreset,
  moveCockpitPanelToZone,
  readCockpitLayoutState,
  reorderCockpitPanelInZone,
  writeCockpitLayoutState,
} from "./cockpitLayoutStore";
import {
  getCockpitLayoutPresetChoices,
} from "./cockpitLayoutPresets";
import type {
  CockpitDragState,
  CockpitLayoutPresetId,
  CockpitLayoutState,
  CockpitLayoutZone,
  CockpitPanelDefinition,
} from "./cockpitLayoutTypes";
import ResizableSplit from "./ResizableSplit";

type DockableCockpitLayoutProps = {
  cockpitId: string;
  panels: CockpitPanelDefinition[];
  defaultPresetId?: CockpitLayoutPresetId;
  toolbar?: ReactNode;
};

function getPanelIdFingerprint(panels: CockpitPanelDefinition[]): string {
  return panels.map((panel) => panel.id).join("|");
}

function findPanelPosition(
  layout: CockpitLayoutState,
  panelId: string,
): { zone: CockpitLayoutZone; index: number } | null {
  const zoneIds: CockpitLayoutZone[] = ["top", "left", "center", "right", "bottom"];
  for (const zone of zoneIds) {
    const index = layout.zones[zone].indexOf(panelId);
    if (index >= 0) {
      return { zone, index };
    }
  }
  return null;
}

function isZoneAllowed(panel: CockpitPanelDefinition, zone: CockpitLayoutZone): boolean {
  if (panel.allowedZones && !panel.allowedZones.includes(zone)) {
    return false;
  }
  return true;
}

export default function DockableCockpitLayout({
  cockpitId,
  panels,
  defaultPresetId = "balanced",
  toolbar,
}: DockableCockpitLayoutProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<CockpitLayoutPresetId>(defaultPresetId);
  const [layoutState, setLayoutState] = useState<CockpitLayoutState>(() => (
    readCockpitLayoutState(cockpitId, panels)
  ));
  const [isCompact, setIsCompact] = useState(false);
  const [dragState, setDragState] = useState<CockpitDragState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const skipPersistOnceRef = useRef(false);

  const panelFingerprint = useMemo(
    () => getPanelIdFingerprint(panels),
    [panels],
  );

  useEffect(() => {
    setLayoutState(readCockpitLayoutState(cockpitId, panels));
    setDragState(null);
  }, [cockpitId, panelFingerprint, panels]);

  useEffect(() => {
    if (skipPersistOnceRef.current) {
      skipPersistOnceRef.current = false;
      return;
    }
    writeCockpitLayoutState(layoutState);
  }, [layoutState]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsCompact(width < 1100);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const panelById = useMemo(() => {
    return new Map(panels.map((panel) => [panel.id, panel]));
  }, [panels]);

  const collapsedPanelIdSet = useMemo(() => {
    return new Set(layoutState.collapsedPanelIds);
  }, [layoutState.collapsedPanelIds]);

  function togglePanelCollapse(panelId: string): void {
    const panel = panelById.get(panelId);
    if (!panel || panel.collapsible === false) {
      return;
    }
    setLayoutState((current) => {
      const collapsed = new Set(current.collapsedPanelIds);
      if (collapsed.has(panelId)) {
        collapsed.delete(panelId);
      } else {
        collapsed.add(panelId);
      }
      return {
        ...current,
        collapsedPanelIds: [...collapsed],
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function setPanelZone(panelId: string, targetZone: CockpitLayoutZone): void {
    setLayoutState((current) => moveCockpitPanelToZone(current, panelId, targetZone, undefined, panels));
  }

  function resetLayout(): void {
    clearCockpitLayoutState(cockpitId);
    skipPersistOnceRef.current = true;
    setLayoutState(createCockpitLayoutStateFromPreset(cockpitId, panels, defaultPresetId));
    setSelectedPresetId(defaultPresetId);
    setDragState(null);
  }

  function applyPreset(presetId: CockpitLayoutPresetId): void {
    setSelectedPresetId(presetId);
    setLayoutState(createCockpitLayoutStateFromPreset(cockpitId, panels, presetId));
    setDragState(null);
  }

  function startPanelDrag(panelId: string): void {
    const panel = panelById.get(panelId);
    if (!panel || panel.locked || panel.draggable === false) {
      return;
    }
    const origin = findPanelPosition(layoutState, panelId);
    if (!origin) {
      return;
    }
    setDragState({
      panelId,
      sourceZoneId: origin.zone,
      overZoneId: origin.zone,
      overPanelId: null,
      insertPosition: "inside",
      targetIndex: origin.index,
    });
  }

  function endPanelDrag(): void {
    setDragState(null);
  }

  function handleDropTargetHover(
    event: ReactDragEvent<HTMLElement>,
    targetZone: CockpitLayoutZone,
    targetIndex: number,
    overPanelId: string | null,
    insertPosition: "before" | "after" | "inside",
  ): void {
    if (!dragState) {
      return;
    }
    const panel = panelById.get(dragState.panelId);
    if (!panel || !isZoneAllowed(panel, targetZone)) {
      return;
    }
    event.preventDefault();
    setDragState((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        overZoneId: targetZone,
        overPanelId,
        insertPosition,
        targetIndex,
      };
    });
  }

  function handleDropTargetRelease(
    event: ReactDragEvent<HTMLElement>,
    targetZone: CockpitLayoutZone,
    targetIndex: number,
  ): void {
    if (!dragState) {
      return;
    }
    event.preventDefault();
    const panelId = dragState.panelId;
    setLayoutState((current) => reorderCockpitPanelInZone(
      current,
      panelId,
      targetZone,
      targetIndex,
      panels,
    ));
    setDragState(null);
  }

  function renderDropSlot(
    zone: CockpitLayoutZone,
    index: number,
    overPanelId: string | null,
    position: "before" | "after" | "inside",
    key: string,
  ): JSX.Element {
    const highlighted = dragState
      && dragState.overZoneId === zone
      && dragState.targetIndex === index
      && dragState.insertPosition === position;
    return (
      <div
        key={key}
        role="presentation"
        aria-label={`${zone} drop slot ${index}`}
        data-testid={`${cockpitId}-${zone}-drop-slot-${index}`}
        onDragOver={(event) => handleDropTargetHover(event, zone, index, overPanelId, position)}
        onDrop={(event) => handleDropTargetRelease(event, zone, index)}
        style={{
          ...dropSlotStyle,
          ...(highlighted ? dropSlotActiveStyle : null),
        }}
      />
    );
  }

  function renderZone(zone: CockpitLayoutZone): JSX.Element {
    const panelIds = layoutState.zones[zone];
    const visiblePanelIds = panelIds.filter((panelId) => panelById.has(panelId));
    const emptyZoneHighlighted = dragState
      && dragState.overZoneId === zone
      && dragState.targetIndex === 0
      && visiblePanelIds.length === 0;
    return (
      <section
        aria-label={`${cockpitId} ${zone} zone`}
        data-testid={`${cockpitId}-${zone}-zone`}
        onDragOver={(event) => {
          if (!dragState) {
            return;
          }
          const panel = panelById.get(dragState.panelId);
          if (!panel || !isZoneAllowed(panel, zone)) {
            return;
          }
          if (visiblePanelIds.length === 0) {
            event.preventDefault();
            setDragState((current) => current ? ({
              ...current,
              overZoneId: zone,
              overPanelId: null,
              insertPosition: "inside",
              targetIndex: 0,
            }) : current);
          }
        }}
        onDrop={(event) => {
          if (!dragState || visiblePanelIds.length !== 0) {
            return;
          }
          handleDropTargetRelease(event, zone, 0);
        }}
        style={zoneStyle}
      >
        {visiblePanelIds.length === 0 ? (
          <div
            aria-label={`${zone} drop zone`}
            data-testid={`${cockpitId}-${zone}-drop-zone-empty`}
            style={{
              ...emptyZoneStyle,
              ...(emptyZoneHighlighted ? emptyZoneActiveStyle : null),
            }}
          >
            Drop panel here
          </div>
        ) : null}
        {visiblePanelIds.map((panelId, index) => {
          const panel = panelById.get(panelId);
          if (!panel) {
            return null;
          }
          const isDragging = dragState?.panelId === panel.id;
          return (
            <div key={`${panel.id}-container`} style={panelContainerStyle}>
              {renderDropSlot(zone, index, panel.id, "before", `${panel.id}-before`)}
              <DockablePanel
                panelId={panel.id}
                title={panel.title}
                subtitle={panel.subtitle}
                truthState={panel.truthState}
                collapsed={collapsedPanelIdSet.has(panel.id)}
                collapsible={panel.collapsible !== false}
                draggable={panel.draggable !== false}
                locked={panel.locked}
                allowedZones={panel.allowedZones}
                isDragging={Boolean(isDragging)}
                onDragStart={startPanelDrag}
                onDragEnd={endPanelDrag}
                onToggleCollapse={() => togglePanelCollapse(panel.id)}
                onMoveToZone={(targetZone) => setPanelZone(panel.id, targetZone)}
                minWidth={panel.minWidth}
                minHeight={panel.minHeight}
                defaultHeight={panel.defaultHeight}
                scrollMode={panel.scrollMode}
                body={panel.render()}
              />
              {index === visiblePanelIds.length - 1
                ? renderDropSlot(zone, index + 1, panel.id, "after", `${panel.id}-after`)
                : null}
            </div>
          );
        })}
      </section>
    );
  }

  const hasTopPanels = layoutState.zones.top.some((panelId) => panelById.has(panelId));
  const hasBottomPanels = layoutState.zones.bottom.some((panelId) => panelById.has(panelId));

  const columnsLayout = (
    <ResizableSplit
      id={`${cockpitId}-left-split`}
      direction="horizontal"
      ariaLabel={`${cockpitId} left column resize handle`}
      handleTitle="Resize left and center/right zones"
      sizeRatio={layoutState.sizes.leftPrimaryRatio}
      resetRatio={0.3}
      minPrimary={220}
      minSecondary={320}
      onSizeRatioChange={(nextRatio) => {
        setLayoutState((current) => ({
          ...current,
          sizes: {
            ...current.sizes,
            leftPrimaryRatio: nextRatio,
          },
          updatedAt: new Date().toISOString(),
        }));
      }}
      primary={renderZone("left")}
      secondary={(
        <ResizableSplit
          id={`${cockpitId}-center-split`}
          direction="horizontal"
          ariaLabel={`${cockpitId} center and right column resize handle`}
          handleTitle="Resize center and right zones"
          sizeRatio={layoutState.sizes.centerPrimaryRatio}
          resetRatio={0.62}
          minPrimary={260}
          minSecondary={220}
          onSizeRatioChange={(nextRatio) => {
            setLayoutState((current) => ({
              ...current,
              sizes: {
                ...current.sizes,
                centerPrimaryRatio: nextRatio,
              },
              updatedAt: new Date().toISOString(),
            }));
          }}
          primary={renderZone("center")}
          secondary={renderZone("right")}
        />
      )}
    />
  );

  const canvasBody = isCompact ? (
    <div style={compactStackStyle}>
      {hasTopPanels ? renderZone("top") : null}
      {renderZone("left")}
      {renderZone("center")}
      {renderZone("right")}
      {hasBottomPanels ? renderZone("bottom") : null}
    </div>
  ) : (
    <div style={desktopCanvasStyle}>
      {hasTopPanels ? renderZone("top") : null}
      <div style={desktopBodyStyle}>
        {hasBottomPanels ? (
          <ResizableSplit
            id={`${cockpitId}-bottom-split`}
            direction="vertical"
            ariaLabel={`${cockpitId} main and bottom zone resize handle`}
            handleTitle="Resize main zones and bottom evidence drawer"
            sizeRatio={layoutState.sizes.topPrimaryRatio}
            resetRatio={0.74}
            minPrimary={220}
            minSecondary={150}
            onSizeRatioChange={(nextRatio) => {
              setLayoutState((current) => ({
                ...current,
                sizes: {
                  ...current.sizes,
                  topPrimaryRatio: nextRatio,
                },
                updatedAt: new Date().toISOString(),
              }));
            }}
            primary={columnsLayout}
            secondary={renderZone("bottom")}
          />
        ) : columnsLayout}
      </div>
    </div>
  );

  return (
    <section
      ref={containerRef}
      aria-label={`${cockpitId} dockable cockpit layout`}
      data-testid={`dockable-layout-${cockpitId}`}
      style={rootStyle}
    >
      <div style={toolbarRowStyle}>
        <div style={layoutActionsStyle}>
          <label style={presetLabelStyle}>
            Preset
            <select
              aria-label={`${cockpitId} layout preset`}
              value={selectedPresetId}
              onChange={(event) => applyPreset(event.target.value as CockpitLayoutPresetId)}
              style={selectStyle}
            >
              {getCockpitLayoutPresetChoices().map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={resetLayout} aria-label="Reset layout" style={resetButtonStyle}>
            Reset layout
          </button>
        </div>
        {toolbar}
      </div>
      <div style={canvasRootStyle}>
        {canvasBody}
      </div>
    </section>
  );
}

const rootStyle = {
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 10,
  minWidth: 0,
  minHeight: 0,
  height: "100%",
} satisfies CSSProperties;

const toolbarRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  minWidth: 0,
} satisfies CSSProperties;

const layoutActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const presetLabelStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  color: "var(--app-subtle-color)",
} satisfies CSSProperties;

const selectStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: "4px 8px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const resetButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: 8,
  padding: "4px 9px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;

const canvasRootStyle = {
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  border: "1px solid var(--app-panel-border)",
  borderRadius: 12,
  background: "var(--app-panel-bg-alt)",
  padding: 8,
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const desktopCanvasStyle = {
  minWidth: 0,
  minHeight: 0,
  height: "100%",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 8,
} satisfies CSSProperties;

const desktopBodyStyle = {
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  display: "grid",
} satisfies CSSProperties;

const compactStackStyle = {
  minWidth: 0,
  minHeight: 0,
  overflow: "auto",
  display: "grid",
  gap: 8,
  alignContent: "start",
} satisfies CSSProperties;

const zoneStyle = {
  minWidth: 0,
  minHeight: 0,
  overflow: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  padding: 2,
} satisfies CSSProperties;

const panelContainerStyle = {
  display: "grid",
  gap: 4,
  minWidth: 0,
} satisfies CSSProperties;

const dropSlotStyle = {
  height: 6,
  borderRadius: 6,
  border: "1px dashed transparent",
  background: "transparent",
  transition: "all 120ms ease",
} satisfies CSSProperties;

const dropSlotActiveStyle = {
  borderColor: "var(--app-accent)",
  background: "color-mix(in srgb, var(--app-accent) 22%, transparent)",
  boxShadow: "0 0 0 1px color-mix(in srgb, var(--app-accent) 30%, transparent)",
} satisfies CSSProperties;

const emptyZoneStyle = {
  minHeight: 34,
  borderRadius: 10,
  border: "1px dashed var(--app-panel-border)",
  color: "var(--app-muted-color)",
  display: "grid",
  placeItems: "center",
  fontSize: 12,
  padding: "8px 10px",
} satisfies CSSProperties;

const emptyZoneActiveStyle = {
  borderColor: "var(--app-accent)",
  color: "var(--app-text-color)",
  background: "color-mix(in srgb, var(--app-accent) 18%, transparent)",
} satisfies CSSProperties;
