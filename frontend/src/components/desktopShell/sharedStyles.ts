import type { CSSProperties } from "react";

import type { DesktopShellTone } from "./types";

export const toneStyles: Record<DesktopShellTone, CSSProperties> = {
  neutral: {
    background: "var(--app-panel-bg-muted)",
    borderColor: "var(--app-panel-border)",
    color: "var(--app-text-color)",
  },
  info: {
    background: "var(--app-accent-soft)",
    borderColor: "var(--app-accent-strong)",
    color: "var(--app-text-color)",
  },
  success: {
    background: "var(--app-success-bg)",
    borderColor: "var(--app-success-border)",
    color: "var(--app-success-text)",
  },
  warning: {
    background: "var(--app-warning-bg)",
    borderColor: "var(--app-warning-border)",
    color: "var(--app-warning-text)",
  },
};

export const raisedControlShadow = "0 6px 14px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.08)";

export const goldSelectedShadow = [
  "0 0 0 1px rgba(248, 212, 119, 0.94)",
  "0 0 14px rgba(248, 212, 119, 0.42)",
  "0 10px 22px rgba(0, 0, 0, 0.24)",
  "inset 0 1px 0 rgba(255, 255, 255, 0.18)",
].join(", ");
