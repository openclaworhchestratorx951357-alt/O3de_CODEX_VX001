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
  getPresetSizes,
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
  splitConstraints?: {
    leftMinWidth?: number;
    centerMinWidth?: number;
    rightMinWidth?: number;
    mainMinHeight?: number;
    bottomMinHeight?: number;
  };
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

function resolvePanelInsertTarget(
  event: ReactDragEvent<HTMLElement>,
  panelElement: HTMLElement,
  panelIndex: number,
): { targetIndex: number; insertPosition: "before" | "after" } {
  const rect = panelElement.getBoundingClientRect();
  const pointerY = Number.isFinite(event.clientY)
    ? event.clientY
    : rect.top + (rect.height / 2);
  const pointerX = Number.isFinite(event.clientX)
    ? event.clientX
    : rect.left + (rect.width / 2);
  const useHorizontalAxis = panelElement.getAttribute("data-drop-axis") === "horizontal";
  const insertBefore = useHorizontalAxis
    ? pointerX <= (rect.left + (rect.width / 2))
    : pointerY <= (rect.top + (rect.height / 2));
  return {
    targetIndex: insertBefore ? panelIndex : panelIndex + 1,
    insertPosition: insertBefore ? "before" : "after",
  };
}

export default function DockableCockpitLayout({
  cockpitId,
  panels,
  defaultPresetId = "balanced",
  toolbar,
  splitConstraints,
}: DockableCockpitLayoutProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<CockpitLayoutPresetId>(defaultPresetId);
  const [layoutState, setLayoutState] = useState<CockpitLayoutState>(() => (
    readCockpitLayoutState(cockpitId, panels, defaultPresetId)
  ));
  const [isCompact, setIsCompact] = useState(false);
  const [dragState, setDragState] = useState<CockpitDragState | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const skipPersistOnceRef = useRef(false);
  const dragHoverRef = useRef<CockpitDragState | null>(null);

  const panelFingerprint = useMemo(
    () => getPanelIdFingerprint(panels),
    [panels],
  );

  useEffect(() => {
    setLayoutState(readCockpitLayoutState(cockpitId, panels, defaultPresetId));
    setSelectedPresetId(defaultPresetId);
    setDragState(null);
    dragHoverRef.current = null;
  }, [cockpitId, defaultPresetId, panelFingerprint, panels]);

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

  const defaultPresetSizes = useMemo(() => getPresetSizes(defaultPresetId), [defaultPresetId]);

  const leftMinWidth = splitConstraints?.leftMinWidth ?? 220;
  const centerMinWidth = splitConstraints?.centerMinWidth ?? 260;
  const rightMinWidth = splitConstraints?.rightMinWidth ?? 220;
  const mainMinHeight = splitConstraints?.mainMinHeight ?? 220;
  const bottomMinHeight = splitConstraints?.bottomMinHeight ?? 150;

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
    dragHoverRef.current = null;
  }

  function applyPreset(presetId: CockpitLayoutPresetId): void {
    setSelectedPresetId(presetId);
    setLayoutState(createCockpitLayoutStateFromPreset(cockpitId, panels, presetId));
    setDragState(null);
    dragHoverRef.current = null;
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
    const nextState: CockpitDragState = {
      panelId,
      sourceZoneId: origin.zone,
      overZoneId: origin.zone,
      overPanelId: null,
      insertPosition: "inside",
      targetIndex: origin.index,
    };
    dragHoverRef.current = nextState;
    setDragState(nextState);
  }

  function endPanelDrag(): void {
    setDragState(null);
    dragHoverRef.current = null;
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
    const nextDragState: CockpitDragState = {
      ...dragState,
      overZoneId: targetZone,
      overPanelId,
      insertPosition,
      targetIndex,
    };
    dragHoverRef.current = nextDragState;
    setDragState((current) => {
      if (!current) {
        return current;
      }
      if (
        current.overZoneId === targetZone
        && current.targetIndex === targetIndex
        && current.overPanelId === overPanelId
        && current.insertPosition === insertPosition
      ) {
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
    dragHoverRef.current = null;
  }

  function handlePanelHover(
    event: ReactDragEvent<HTMLElement>,
    targetZone: CockpitLayoutZone,
    targetPanelId: string,
    targetPanelIndex: number,
  ): void {
    if (!dragState) {
      return;
    }
    const draggedPanel = panelById.get(dragState.panelId);
    if (!draggedPanel || !isZoneAllowed(draggedPanel, targetZone)) {
      return;
    }
    event.preventDefault();
    const target = resolvePanelInsertTarget(event, event.currentTarget, targetPanelIndex);
    handleDropTargetHover(
      event,
      targetZone,
      target.targetIndex,
      targetPanelId,
      target.insertPosition,
    );
  }

  function handlePanelDrop(
    event: ReactDragEvent<HTMLElement>,
    targetZone: CockpitLayoutZone,
    targetPanelId: string,
    targetPanelIndex: number,
  ): void {
    if (!dragState) {
      return;
    }
    const draggedPanel = panelById.get(dragState.panelId);
    if (!draggedPanel || !isZoneAllowed(draggedPanel, targetZone)) {
      return;
    }
    const target = resolvePanelInsertTarget(event, event.currentTarget, targetPanelIndex);
    const hoverSnapshot = dragHoverRef.current;
    const resolvedTargetIndex = (
      hoverSnapshot
      && hoverSnapshot.overZoneId === targetZone
      && hoverSnapshot.overPanelId === targetPanelId
      && hoverSnapshot.targetIndex !== null
    )
      ? hoverSnapshot.targetIndex
      : target.targetIndex;
    handleDropTargetRelease(event, targetZone, resolvedTargetIndex);
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
            dragHoverRef.current = dragState ? ({
              ...dragState,
              overZoneId: zone,
              overPanelId: null,
              insertPosition: "inside",
              targetIndex: 0,
            }) : dragHoverRef.current;
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
          const panelTargetBeforeHighlighted = dragState
            && dragState.overZoneId === zone
            && dragState.overPanelId === panel.id
            && dragState.insertPosition === "before";
          const panelTargetAfterHighlighted = dragState
            && dragState.overZoneId === zone
            && dragState.overPanelId === panel.id
            && dragState.insertPosition === "after";
          const panelTargetActive = dragState
            && dragState.panelId !== panel.id
            && dragState.overZoneId === zone
            && dragState.overPanelId === panel.id;
          return (
            <div key={`${panel.id}-container`} style={panelContainerStyle}>
              {renderDropSlot(zone, index, panel.id, "before", `${panel.id}-before`)}
              <div
                aria-label={`${panel.title} panel drop target`}
                data-testid={`${cockpitId}-${zone}-panel-target-${panel.id}`}
                data-drop-axis="vertical"
                onDragOver={(event) => handlePanelHover(event, zone, panel.id, index)}
                onDrop={(event) => handlePanelDrop(event, zone, panel.id, index)}
                style={{
                  ...panelDropTargetStyle,
                  ...(panelTargetActive ? panelDropTargetActiveStyle : null),
                  ...(panelTargetBeforeHighlighted ? panelDropTargetBeforeStyle : null),
                  ...(panelTargetAfterHighlighted ? panelDropTargetAfterStyle : null),
                }}
              >
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
              </div>
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
      resetRatio={defaultPresetSizes.leftPrimaryRatio}
      minPrimary={leftMinWidth}
      minSecondary={centerMinWidth + rightMinWidth}
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
          resetRatio={defaultPresetSizes.centerPrimaryRatio}
          minPrimary={centerMinWidth}
          minSecondary={rightMinWidth}
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
            resetRatio={defaultPresetSizes.topPrimaryRatio}
            minPrimary={mainMinHeight}
            minSecondary={bottomMinHeight}
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

const panelDropTargetStyle = {
  minWidth: 0,
  minHeight: 0,
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  transition: "border-color 120ms ease, background 120ms ease, box-shadow 120ms ease",
} satisfies CSSProperties;

const panelDropTargetActiveStyle = {
  borderColor: "color-mix(in srgb, var(--app-accent) 45%, var(--app-panel-border))",
  background: "color-mix(in srgb, var(--app-accent) 9%, transparent)",
} satisfies CSSProperties;

const panelDropTargetBeforeStyle = {
  boxShadow: "inset 0 3px 0 0 var(--app-accent)",
} satisfies CSSProperties;

const panelDropTargetAfterStyle = {
  boxShadow: "inset 0 -3px 0 0 var(--app-accent)",
} satisfies CSSProperties;

const dropSlotStyle = {
  height: 6,
  borderRadius: 6,
  border: "1px dashed transparent",
  background: "transparent",
  transition: "all 120ms ease",
} satisfies CSSProperties;

const dropSlotActiveStyle = {
  border: "1px dashed var(--app-accent)",
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
  border: "1px dashed var(--app-accent)",
  color: "var(--app-text-color)",
  background: "color-mix(in srgb, var(--app-accent) 18%, transparent)",
} satisfies CSSProperties;
