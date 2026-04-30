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
    ? "0 18px 44px rgba(1, 6, 18, 0.52), inset 0 1px 0 rgba(198, 220, 255, 0.05)"
    : "0 18px 40px rgba(58, 84, 136, 0.12)";
  const shadowStrong = resolvedThemeMode === "dark"
    ? "0 28px 72px rgba(1, 4, 14, 0.66), 0 0 0 1px rgba(112, 144, 199, 0.16)"
    : "0 24px 60px rgba(58, 84, 136, 0.16)";
  const shellBackground = resolvedThemeMode === "dark"
    ? "radial-gradient(circle at 14% 8%, rgba(92, 139, 255, 0.32) 0%, rgba(92, 139, 255, 0.09) 22%, transparent 48%), radial-gradient(circle at 88% 12%, rgba(152, 100, 255, 0.2) 0%, rgba(152, 100, 255, 0.06) 24%, transparent 50%), radial-gradient(circle at 52% 112%, rgba(43, 132, 255, 0.24) 0%, rgba(43, 132, 255, 0.07) 32%, transparent 60%), linear-gradient(162deg, #060c16 0%, #0a1426 46%, #111c33 100%)"
    : "radial-gradient(circle at top left, rgba(111, 178, 255, 0.34), transparent 28%), radial-gradient(circle at bottom right, rgba(22, 121, 255, 0.24), transparent 32%), linear-gradient(160deg, #dce8ff 0%, #edf3ff 44%, #f7faff 100%)";

  const pageBackground = resolvedThemeMode === "dark" ? "#060c16" : "#edf3ff";
  const textColor = resolvedThemeMode === "dark" ? "#eef4ff" : "#122033";
  const mutedColor = resolvedThemeMode === "dark" ? "#b6c5df" : "#4f6689";
  const subtleColor = resolvedThemeMode === "dark" ? "#94a8ca" : "#5a739d";
  const panelBackground = resolvedThemeMode === "dark" ? "rgba(11, 20, 35, 0.84)" : "rgba(248, 251, 255, 0.82)";
  const panelBackgroundAlt = resolvedThemeMode === "dark" ? "rgba(15, 28, 49, 0.92)" : "rgba(252, 253, 255, 0.94)";
  const panelBackgroundMuted = resolvedThemeMode === "dark" ? "rgba(18, 31, 55, 0.9)" : "rgba(242, 247, 255, 0.9)";
  const panelBorder = resolvedThemeMode === "dark" ? "rgba(128, 154, 198, 0.36)" : "rgba(137, 156, 196, 0.22)";
  const panelBorderStrong = resolvedThemeMode === "dark" ? "rgba(162, 188, 233, 0.46)" : "rgba(103, 132, 184, 0.22)";
  const panelElevated = resolvedThemeMode === "dark"
    ? "linear-gradient(160deg, rgba(32, 60, 107, 0.38) 0%, rgba(14, 25, 45, 0.92) 100%)"
    : "linear-gradient(160deg, rgba(116, 166, 255, 0.18) 0%, rgba(247, 251, 255, 0.97) 100%)";
  const shellTaskbarBackground = resolvedThemeMode === "dark"
    ? "linear-gradient(180deg, rgba(12, 24, 42, 0.95) 0%, rgba(9, 17, 30, 0.94) 100%)"
    : "var(--app-panel-bg)";
  const shellGlowPrimary = resolvedThemeMode === "dark" ? "rgba(112, 165, 255, 0.44)" : "rgba(118, 170, 255, 0.36)";
  const shellGlowSecondary = resolvedThemeMode === "dark" ? "rgba(144, 106, 255, 0.24)" : "rgba(33, 127, 255, 0.18)";
  const inputBackground = resolvedThemeMode === "dark" ? "rgba(8, 16, 29, 0.95)" : "#ffffff";
  const inputBorder = resolvedThemeMode === "dark" ? "rgba(150, 176, 221, 0.44)" : "rgba(91, 118, 165, 0.34)";
  const inputShadow = resolvedThemeMode === "dark"
    ? "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 2px 4px rgba(2, 6, 23, 0.3)"
    : "inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 1px 2px rgba(58, 84, 136, 0.1)";
  const inputFocusRing = resolvedThemeMode === "dark"
    ? `0 0 0 3px ${rgba(accentColor, 0.34)}, inset 0 1px 0 rgba(255, 255, 255, 0.08)`
    : `0 0 0 3px ${rgba(accentColor, 0.18)}, inset 0 1px 0 rgba(255, 255, 255, 0.92)`;
  const inputPlaceholder = resolvedThemeMode === "dark" ? "rgba(182, 197, 223, 0.72)" : "rgba(79, 102, 137, 0.72)";
  const commandBackground = resolvedThemeMode === "dark" ? "#081323" : "#10203a";
  const commandText = "#e7f0ff";
  const activeBackground = resolvedThemeMode === "dark"
    ? "linear-gradient(142deg, rgba(61, 127, 255, 0.34) 0%, rgba(193, 143, 48, 0.2) 42%, rgba(20, 34, 61, 0.86) 100%)"
    : "linear-gradient(145deg, var(--app-accent-soft) 0%, var(--app-panel-bg-alt) 100%)";
  const activeBorder = resolvedThemeMode === "dark" ? "rgba(151, 188, 255, 0.64)" : "var(--app-accent-strong)";
  const activeShadow = resolvedThemeMode === "dark"
    ? "0 0 0 1px rgba(151, 188, 255, 0.48), 0 0 24px rgba(69, 128, 255, 0.36), 0 14px 30px rgba(2, 7, 20, 0.48), inset 0 1px 0 rgba(247, 224, 163, 0.22)"
    : "0 0 0 1px rgba(111, 178, 255, 0.32), 0 10px 20px rgba(58, 84, 136, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.58)";
  const selectedBorder = resolvedThemeMode === "dark" ? "rgba(248, 212, 119, 0.9)" : "rgba(248, 212, 119, 0.94)";
  const selectedShadow = resolvedThemeMode === "dark"
    ? "0 0 0 1px rgba(248, 212, 119, 0.82), 0 0 18px rgba(248, 212, 119, 0.44), 0 14px 34px rgba(3, 8, 20, 0.52), inset 0 1px 0 rgba(255, 248, 230, 0.26)"
    : "0 0 0 1px rgba(248, 212, 119, 0.94), 0 0 14px rgba(248, 212, 119, 0.42), 0 10px 22px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.18)";
  const raisedShadow = resolvedThemeMode === "dark"
    ? "0 8px 18px rgba(1, 7, 22, 0.44), inset 0 1px 0 rgba(238, 246, 255, 0.1)"
    : "0 6px 14px rgba(0, 0, 0, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.08)";
  const scrollbarTrack = resolvedThemeMode === "dark" ? "rgba(10, 19, 34, 0.82)" : "rgba(214, 228, 252, 0.88)";
  const scrollbarThumb = resolvedThemeMode === "dark" ? "rgba(125, 154, 203, 0.58)" : "rgba(117, 145, 194, 0.74)";
  const scrollbarThumbHover = resolvedThemeMode === "dark" ? "rgba(153, 185, 241, 0.74)" : "rgba(94, 126, 184, 0.86)";
  const truthRailShellBackground = resolvedThemeMode === "dark"
    ? "linear-gradient(160deg, rgba(14, 26, 46, 0.94) 0%, rgba(10, 20, 36, 0.94) 100%)"
    : "var(--app-panel-bg)";
  const truthRailSnapshotBackground = resolvedThemeMode === "dark"
    ? "linear-gradient(160deg, rgba(23, 38, 67, 0.9) 0%, rgba(14, 27, 48, 0.92) 100%)"
    : "var(--app-panel-bg-muted)";
  const truthRailRowBackground = resolvedThemeMode === "dark"
    ? "linear-gradient(155deg, rgba(17, 31, 56, 0.96) 0%, rgba(12, 22, 40, 0.96) 100%)"
    : "var(--app-panel-bg-muted)";
  const truthRailSafetyBackground = resolvedThemeMode === "dark"
    ? "linear-gradient(155deg, rgba(57, 72, 20, 0.42) 0%, rgba(28, 36, 14, 0.44) 100%)"
    : "linear-gradient(155deg, rgba(255, 249, 228, 0.94) 0%, rgba(250, 242, 214, 0.95) 100%)";

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
      "--app-panel-elevated": panelElevated,
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
      "--app-shell-taskbar-bg": shellTaskbarBackground,
      "--app-shell-glow-primary": shellGlowPrimary,
      "--app-shell-glow-secondary": shellGlowSecondary,
      "--app-active-bg": activeBackground,
      "--app-active-border": activeBorder,
      "--app-active-shadow": activeShadow,
      "--app-selected-border": selectedBorder,
      "--app-selected-shadow": selectedShadow,
      "--app-raised-shadow": raisedShadow,
      "--app-scrollbar-size": "11px",
      "--app-scrollbar-track": scrollbarTrack,
      "--app-scrollbar-thumb": scrollbarThumb,
      "--app-scrollbar-thumb-hover": scrollbarThumbHover,
      "--app-accent": accentColor,
      "--app-accent-soft": rgba(accentColor, resolvedThemeMode === "dark" ? 0.34 : 0.18),
      "--app-accent-strong": rgba(accentColor, resolvedThemeMode === "dark" ? 0.52 : 0.24),
      "--app-accent-contrast": resolvedThemeMode === "dark" ? "#eff6ff" : "#ffffff",
      "--app-info-bg": resolvedThemeMode === "dark" ? "rgba(64, 140, 255, 0.24)" : "rgba(228, 238, 255, 0.92)",
      "--app-info-border": resolvedThemeMode === "dark" ? "rgba(121, 177, 255, 0.52)" : "rgba(9, 105, 218, 0.24)",
      "--app-info-text": resolvedThemeMode === "dark" ? "#d8e9ff" : "#0550ae",
      "--app-success-bg": resolvedThemeMode === "dark" ? "rgba(33, 179, 128, 0.24)" : "rgba(227, 248, 239, 0.84)",
      "--app-success-border": resolvedThemeMode === "dark" ? "rgba(101, 225, 175, 0.52)" : "rgba(24, 136, 91, 0.28)",
      "--app-success-text": resolvedThemeMode === "dark" ? "#bcf8da" : "#0f6b47",
      "--app-danger-bg": resolvedThemeMode === "dark" ? "rgba(239, 89, 89, 0.24)" : "rgba(254, 242, 242, 0.92)",
      "--app-danger-border": resolvedThemeMode === "dark" ? "rgba(253, 144, 144, 0.5)" : "rgba(220, 38, 38, 0.18)",
      "--app-danger-text": resolvedThemeMode === "dark" ? "#ffd0d5" : "#b42318",
      "--app-runtime-bg": resolvedThemeMode === "dark" ? "rgba(214, 94, 173, 0.24)" : "rgba(255, 240, 248, 0.94)",
      "--app-runtime-border": resolvedThemeMode === "dark" ? "rgba(243, 148, 207, 0.5)" : "rgba(191, 57, 137, 0.24)",
      "--app-runtime-text": resolvedThemeMode === "dark" ? "#ffd6ef" : "#8f236d",
      "--app-mutation-bg": resolvedThemeMode === "dark" ? "rgba(171, 104, 251, 0.24)" : "rgba(246, 240, 255, 0.94)",
      "--app-mutation-border": resolvedThemeMode === "dark" ? "rgba(210, 168, 255, 0.5)" : "rgba(130, 80, 223, 0.24)",
      "--app-mutation-text": resolvedThemeMode === "dark" ? "#ebd8ff" : "#6639ba",
      "--app-warning-bg": resolvedThemeMode === "dark" ? "rgba(220, 155, 46, 0.24)" : "rgba(255, 244, 224, 0.88)",
      "--app-warning-border": resolvedThemeMode === "dark" ? "rgba(248, 199, 108, 0.56)" : "rgba(193, 126, 17, 0.28)",
      "--app-warning-text": resolvedThemeMode === "dark" ? "#ffe3ae" : "#8a4d00",
      "--app-simulated-bg": resolvedThemeMode === "dark" ? "rgba(238, 161, 96, 0.24)" : "rgba(255, 244, 229, 0.92)",
      "--app-simulated-border": resolvedThemeMode === "dark" ? "rgba(251, 204, 147, 0.52)" : "rgba(209, 123, 15, 0.24)",
      "--app-simulated-text": resolvedThemeMode === "dark" ? "#ffe0be" : "#9a5b00",
      "--app-truth-rail-shell-bg": truthRailShellBackground,
      "--app-truth-rail-snapshot-bg": truthRailSnapshotBackground,
      "--app-truth-rail-row-bg": truthRailRowBackground,
      "--app-truth-rail-safety-bg": truthRailSafetyBackground,
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
