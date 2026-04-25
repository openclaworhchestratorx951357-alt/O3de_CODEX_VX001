import type { CSSProperties } from "react";

import type { AppSettings } from "../../types/settings";

export type ThemeTokens = {
  resolvedThemeMode: "light" | "dark";
  accentColor: string;
  contentMaxWidthPx: number;
  panelPaddingPx: number;
  cardRadiusPx: number;
  panelRadiusPx: number;
  windowRadiusPx: number;
  compactDensity: boolean;
  motionDisabled: boolean;
  cssVariables: CSSProperties;
};

const CONTENT_MAX_WIDTHS = {
  focused: 1240,
  wide: 1480,
  full: 1760,
} as const;

const CARD_RADII = {
  soft: 16,
  rounded: 22,
  pillowed: 28,
} as const;

function hexToRgb(hexColor: string): [number, number, number] {
  const value = hexColor.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return [red, green, blue];
}

function rgba(hexColor: string, alpha: number): string {
  const [red, green, blue] = hexToRgb(hexColor);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function buildThemeTokens(
  settings: AppSettings,
  systemPrefersDark: boolean,
): ThemeTokens {
  const resolvedThemeMode = settings.appearance.themeMode === "system"
    ? (systemPrefersDark ? "dark" : "light")
    : settings.appearance.themeMode;
  const compactDensity = settings.appearance.density === "compact";
  const accentColor = settings.appearance.accentColor;
  const contentMaxWidthPx = CONTENT_MAX_WIDTHS[settings.appearance.contentMaxWidth];
  const cardRadiusPx = CARD_RADII[settings.appearance.cardRadius];
  const panelRadiusPx = cardRadiusPx + 4;
  const windowRadiusPx = cardRadiusPx + 10;
  const panelPaddingPx = compactDensity ? 14 : 18;
  const surfaceGapPx = compactDensity ? 12 : 16;
  const shadowSoft = resolvedThemeMode === "dark"
    ? "0 18px 40px rgba(3, 7, 18, 0.34)"
    : "0 18px 40px rgba(58, 84, 136, 0.12)";
  const shadowStrong = resolvedThemeMode === "dark"
    ? "0 24px 60px rgba(2, 6, 23, 0.48)"
    : "0 24px 60px rgba(58, 84, 136, 0.16)";
  const shellBackground = resolvedThemeMode === "dark"
    ? "radial-gradient(circle at top left, rgba(56, 103, 214, 0.22), transparent 26%), radial-gradient(circle at bottom right, rgba(31, 88, 197, 0.18), transparent 30%), linear-gradient(160deg, #0b1120 0%, #111a30 48%, #17233d 100%)"
    : "radial-gradient(circle at top left, rgba(111, 178, 255, 0.34), transparent 28%), radial-gradient(circle at bottom right, rgba(22, 121, 255, 0.24), transparent 32%), linear-gradient(160deg, #dce8ff 0%, #edf3ff 44%, #f7faff 100%)";

  const pageBackground = resolvedThemeMode === "dark" ? "#0b1120" : "#edf3ff";
  const textColor = resolvedThemeMode === "dark" ? "#e6eefc" : "#122033";
  const mutedColor = resolvedThemeMode === "dark" ? "#a9b7d1" : "#4f6689";
  const subtleColor = resolvedThemeMode === "dark" ? "#7f8da8" : "#5a739d";
  const panelBackground = resolvedThemeMode === "dark" ? "rgba(15, 23, 42, 0.82)" : "rgba(248, 251, 255, 0.82)";
  const panelBackgroundAlt = resolvedThemeMode === "dark" ? "rgba(18, 30, 53, 0.9)" : "rgba(252, 253, 255, 0.94)";
  const panelBackgroundMuted = resolvedThemeMode === "dark" ? "rgba(21, 32, 58, 0.88)" : "rgba(242, 247, 255, 0.9)";
  const panelBorder = resolvedThemeMode === "dark" ? "rgba(112, 137, 179, 0.28)" : "rgba(137, 156, 196, 0.22)";
  const panelBorderStrong = resolvedThemeMode === "dark" ? "rgba(129, 156, 203, 0.34)" : "rgba(103, 132, 184, 0.22)";
  const inputBackground = resolvedThemeMode === "dark" ? "rgba(10, 16, 30, 0.92)" : "#ffffff";
  const inputBorder = resolvedThemeMode === "dark" ? "rgba(129, 156, 203, 0.36)" : "rgba(91, 118, 165, 0.34)";
  const inputShadow = resolvedThemeMode === "dark"
    ? "inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 1px 2px rgba(2, 6, 23, 0.18)"
    : "inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 1px 2px rgba(58, 84, 136, 0.1)";
  const inputFocusRing = resolvedThemeMode === "dark"
    ? `0 0 0 3px ${rgba(accentColor, 0.24)}, inset 0 1px 0 rgba(255, 255, 255, 0.05)`
    : `0 0 0 3px ${rgba(accentColor, 0.18)}, inset 0 1px 0 rgba(255, 255, 255, 0.92)`;
  const inputPlaceholder = resolvedThemeMode === "dark" ? "rgba(169, 183, 209, 0.72)" : "rgba(79, 102, 137, 0.72)";
  const commandBackground = resolvedThemeMode === "dark" ? "#07111f" : "#10203a";
  const commandText = "#e7f0ff";

  return {
    resolvedThemeMode,
    accentColor,
    contentMaxWidthPx,
    panelPaddingPx,
    cardRadiusPx,
    panelRadiusPx,
    windowRadiusPx,
    compactDensity,
    motionDisabled: settings.appearance.reducedMotion,
    cssVariables: {
      "--app-font-scale": String(settings.appearance.fontScale),
      "--app-shell-max-width": `${contentMaxWidthPx}px`,
      "--app-panel-padding": `${panelPaddingPx}px`,
      "--app-surface-gap": `${surfaceGapPx}px`,
      "--app-card-radius": `${cardRadiusPx}px`,
      "--app-panel-radius": `${panelRadiusPx}px`,
      "--app-window-radius": `${windowRadiusPx}px`,
      "--app-pill-radius": "999px",
      "--app-page-bg": pageBackground,
      "--app-shell-bg": shellBackground,
      "--app-panel-bg": panelBackground,
      "--app-panel-bg-alt": panelBackgroundAlt,
      "--app-panel-bg-muted": panelBackgroundMuted,
      "--app-panel-border": panelBorder,
      "--app-panel-border-strong": panelBorderStrong,
      "--app-text-color": textColor,
      "--app-muted-color": mutedColor,
      "--app-text-muted": mutedColor,
      "--app-subtle-color": subtleColor,
      "--app-input-bg": inputBackground,
      "--app-input-border": inputBorder,
      "--app-input-shadow": inputShadow,
      "--app-input-focus-ring": inputFocusRing,
      "--app-input-placeholder": inputPlaceholder,
      "--app-color-scheme": resolvedThemeMode,
      "--app-command-bg": commandBackground,
      "--app-command-text": commandText,
      "--app-shadow-soft": shadowSoft,
      "--app-shadow-strong": shadowStrong,
      "--app-accent": accentColor,
      "--app-accent-soft": rgba(accentColor, resolvedThemeMode === "dark" ? 0.26 : 0.18),
      "--app-accent-strong": rgba(accentColor, resolvedThemeMode === "dark" ? 0.34 : 0.24),
      "--app-accent-contrast": resolvedThemeMode === "dark" ? "#eff6ff" : "#ffffff",
      "--app-info-bg": resolvedThemeMode === "dark" ? "rgba(59, 130, 246, 0.18)" : "rgba(228, 238, 255, 0.92)",
      "--app-info-border": resolvedThemeMode === "dark" ? "rgba(96, 165, 250, 0.3)" : "rgba(9, 105, 218, 0.24)",
      "--app-info-text": resolvedThemeMode === "dark" ? "#b9d7ff" : "#0550ae",
      "--app-success-bg": resolvedThemeMode === "dark" ? "rgba(16, 185, 129, 0.18)" : "rgba(227, 248, 239, 0.84)",
      "--app-success-border": resolvedThemeMode === "dark" ? "rgba(52, 211, 153, 0.3)" : "rgba(24, 136, 91, 0.28)",
      "--app-success-text": resolvedThemeMode === "dark" ? "#8ef0c2" : "#0f6b47",
      "--app-danger-bg": resolvedThemeMode === "dark" ? "rgba(239, 68, 68, 0.18)" : "rgba(254, 242, 242, 0.92)",
      "--app-danger-border": resolvedThemeMode === "dark" ? "rgba(248, 113, 113, 0.3)" : "rgba(220, 38, 38, 0.18)",
      "--app-danger-text": resolvedThemeMode === "dark" ? "#fda4af" : "#b42318",
      "--app-runtime-bg": resolvedThemeMode === "dark" ? "rgba(236, 72, 153, 0.18)" : "rgba(255, 240, 248, 0.94)",
      "--app-runtime-border": resolvedThemeMode === "dark" ? "rgba(244, 114, 182, 0.3)" : "rgba(191, 57, 137, 0.24)",
      "--app-runtime-text": resolvedThemeMode === "dark" ? "#f7b3d8" : "#8f236d",
      "--app-mutation-bg": resolvedThemeMode === "dark" ? "rgba(168, 85, 247, 0.18)" : "rgba(246, 240, 255, 0.94)",
      "--app-mutation-border": resolvedThemeMode === "dark" ? "rgba(192, 132, 252, 0.3)" : "rgba(130, 80, 223, 0.24)",
      "--app-mutation-text": resolvedThemeMode === "dark" ? "#ddc4ff" : "#6639ba",
      "--app-warning-bg": resolvedThemeMode === "dark" ? "rgba(245, 158, 11, 0.18)" : "rgba(255, 244, 224, 0.88)",
      "--app-warning-border": resolvedThemeMode === "dark" ? "rgba(251, 191, 36, 0.32)" : "rgba(193, 126, 17, 0.28)",
      "--app-warning-text": resolvedThemeMode === "dark" ? "#ffd48a" : "#8a4d00",
      "--app-simulated-bg": resolvedThemeMode === "dark" ? "rgba(251, 146, 60, 0.18)" : "rgba(255, 244, 229, 0.92)",
      "--app-simulated-border": resolvedThemeMode === "dark" ? "rgba(253, 186, 116, 0.3)" : "rgba(209, 123, 15, 0.24)",
      "--app-simulated-text": resolvedThemeMode === "dark" ? "#ffd3a1" : "#9a5b00",
      "--app-window-control-minimize": "#ffbd44",
      "--app-window-control-maximize": "#00ca56",
      "--app-window-control-close": "#ff605c",
      "--app-window-control-shadow": resolvedThemeMode === "dark"
        ? "0 1px 3px rgba(3, 7, 18, 0.42)"
        : "0 1px 3px rgba(18, 32, 51, 0.18)",
      "--app-transition": settings.appearance.reducedMotion
        ? "none"
        : "background-color 180ms ease, color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease",
    } as CSSProperties,
  };
}
