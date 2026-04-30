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

export const raisedControlShadow = "var(--app-raised-shadow)";

export const goldSelectedShadow = "var(--app-selected-shadow)";
