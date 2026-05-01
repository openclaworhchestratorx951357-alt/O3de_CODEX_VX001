import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type ResizableSplitProps = {
  id: string;
  direction: "horizontal" | "vertical";
  sizeRatio: number;
  onSizeRatioChange: (ratio: number) => void;
  primary: ReactNode;
  secondary: ReactNode;
  minPrimary?: number;
  minSecondary?: number;
  ariaLabel: string;
  handleTitle?: string;
  resetRatio?: number;
};

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

export default function ResizableSplit({
  id,
  direction,
  sizeRatio,
  onSizeRatioChange,
  primary,
  secondary,
  minPrimary = 200,
  minSecondary = 200,
  ariaLabel,
  handleTitle,
  resetRatio = 0.5,
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState(0);
  const isHorizontal = direction === "horizontal";

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const nextSize = isHorizontal
        ? entries[0]?.contentRect.width ?? 0
        : entries[0]?.contentRect.height ?? 0;
      setContainerSize(nextSize);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [isHorizontal]);

  const clampedRatio = useMemo(() => {
    if (!containerSize) {
      return clamp(sizeRatio, 0.12, 0.88);
    }
    const minRatio = minPrimary / containerSize;
    const maxRatio = 1 - (minSecondary / containerSize);
    return clamp(sizeRatio, minRatio, maxRatio);
  }, [containerSize, minPrimary, minSecondary, sizeRatio]);

  useEffect(() => {
    if (Math.abs(clampedRatio - sizeRatio) > 0.0001) {
      onSizeRatioChange(clampedRatio);
    }
  }, [clampedRatio, onSizeRatioChange, sizeRatio]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const node = containerRef.current;
    if (!node) {
      return;
    }
    event.preventDefault();
    const rect = node.getBoundingClientRect();
    const size = isHorizontal ? rect.width : rect.height;
    if (!size) {
      return;
    }
    const pointerStart = isHorizontal ? event.clientX : event.clientY;
    const startRatio = clampedRatio;
    const pointerId = event.pointerId;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = (isHorizontal ? moveEvent.clientX : moveEvent.clientY) - pointerStart;
      const next = startRatio + delta / size;
      const minRatio = minPrimary / size;
      const maxRatio = 1 - (minSecondary / size);
      onSizeRatioChange(clamp(next, minRatio, maxRatio));
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      try {
        node.releasePointerCapture(pointerId);
      } catch {
        // no-op when pointer capture is unavailable.
      }
    };

    node.setPointerCapture(pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }, [clampedRatio, isHorizontal, minPrimary, minSecondary, onSizeRatioChange]);

  const onHandleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    const grow = isHorizontal ? ["ArrowRight", "ArrowDown"] : ["ArrowDown", "ArrowRight"];
    const shrink = isHorizontal ? ["ArrowLeft", "ArrowUp"] : ["ArrowUp", "ArrowLeft"];
    if (!grow.includes(key) && !shrink.includes(key)) {
      return;
    }
    event.preventDefault();
    const step = event.shiftKey ? 0.05 : 0.02;
    if (grow.includes(key)) {
      onSizeRatioChange(clamp(clampedRatio + step, 0.12, 0.88));
      return;
    }
    onSizeRatioChange(clamp(clampedRatio - step, 0.12, 0.88));
  }, [clampedRatio, isHorizontal, onSizeRatioChange]);

  return (
    <div
      ref={containerRef}
      data-testid={`${id}-split`}
      style={{
        ...rootStyle,
        ...(isHorizontal ? horizontalRootStyle : verticalRootStyle),
      }}
    >
      <div
        style={{
          ...paneStyle,
          ...(isHorizontal
            ? { width: `${clampedRatio * 100}%` }
            : { height: `${clampedRatio * 100}%` }),
        }}
      >
        {primary}
      </div>
      <div
        role="separator"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-orientation={isHorizontal ? "vertical" : "horizontal"}
        title={handleTitle}
        data-testid={`${id}-handle`}
        onPointerDown={onPointerDown}
        onKeyDown={onHandleKeyDown}
        onDoubleClick={() => onSizeRatioChange(resetRatio)}
        style={{
          ...handleStyle,
          ...(isHorizontal ? horizontalHandleStyle : verticalHandleStyle),
        }}
      />
      <div style={paneStyle}>
        {secondary}
      </div>
    </div>
  );
}

const rootStyle = {
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  overflow: "hidden",
  height: "100%",
  width: "100%",
} satisfies CSSProperties;

const horizontalRootStyle = {
  flexDirection: "row",
} satisfies CSSProperties;

const verticalRootStyle = {
  flexDirection: "column",
} satisfies CSSProperties;

const paneStyle = {
  minWidth: 0,
  minHeight: 0,
  overflow: "hidden",
  display: "grid",
} satisfies CSSProperties;

const handleStyle = {
  flex: "0 0 auto",
  background: "var(--app-panel-border-strong)",
  boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--app-accent) 26%, transparent)",
  position: "relative",
  zIndex: 2,
} satisfies CSSProperties;

const horizontalHandleStyle = {
  width: 10,
  cursor: "col-resize",
} satisfies CSSProperties;

const verticalHandleStyle = {
  height: 10,
  cursor: "row-resize",
} satisfies CSSProperties;
