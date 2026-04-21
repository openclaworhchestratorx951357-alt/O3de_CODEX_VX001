import type { CSSProperties, ReactNode } from "react";

import { useThemeTokens } from "../lib/settings/hooks";

export type DesktopShellTone = "neutral" | "info" | "success" | "warning";

export type DesktopShellNavItem = {
  id: string;
  label: string;
  subtitle: string;
  badge?: string | null;
  tone?: DesktopShellTone;
  helpTooltip?: string | null;
};

export type DesktopShellQuickStat = {
  label: string;
  value: string;
  tone?: DesktopShellTone;
  helpTooltip?: string | null;
};

type DesktopShellProps = {
  appTitle: string;
  appSubtitle: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  activeWorkspaceId: string;
  navItems: readonly DesktopShellNavItem[];
  quickStats?: readonly DesktopShellQuickStat[];
  utilityLabel?: string | null;
  utilityDetail?: string | null;
  utilityActions?: ReactNode;
  onSelectWorkspace: (workspaceId: string) => void;
  children: ReactNode;
};

const toneStyles: Record<DesktopShellTone, CSSProperties> = {
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

export default function DesktopShell({
  appTitle,
  appSubtitle,
  workspaceTitle,
  workspaceSubtitle,
  activeWorkspaceId,
  navItems,
  quickStats = [],
  utilityLabel,
  utilityDetail,
  utilityActions,
  onSelectWorkspace,
  children,
}: DesktopShellProps) {
  const themeTokens = useThemeTokens();
  const timestampLabel = new Date().toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      style={{
        ...shellStyle,
        transition: "var(--app-transition)",
      }}
    >
      <div style={wallpaperGlowTopStyle} />
      <div style={wallpaperGlowBottomStyle} />
      <div style={taskbarStyle}>
        <div style={taskbarBrandGroupStyle}>
          <div style={startBadgeStyle}>CP</div>
          <div style={{ display: "grid", gap: 2 }}>
            <strong style={taskbarTitleStyle}>{appTitle}</strong>
            <span style={taskbarSubtitleStyle}>{appSubtitle}</span>
          </div>
        </div>
        <div style={taskbarMetaGroupStyle}>
          {utilityActions}
          {utilityLabel ? (
            <span
              style={{
                ...taskbarUtilityBadgeStyle,
                ...(utilityDetail ? toneStyles.info : toneStyles.neutral),
              }}
              title={utilityDetail ?? undefined}
            >
              {utilityLabel}
            </span>
          ) : null}
          <span style={taskbarClockStyle}>{timestampLabel}</span>
        </div>
      </div>

      <div
        style={{
          ...desktopSurfaceStyle,
          padding: themeTokens.compactDensity ? 18 : 24,
          width: "min(100%, var(--app-shell-max-width))",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <aside style={navRailStyle}>
          <div style={navSectionHeaderStyle}>
            <span style={navSectionEyebrowStyle}>Workspace switcher</span>
            <strong style={navSectionTitleStyle}>Control surface</strong>
            <span style={navSectionDetailStyle}>
              Move through the project like a desktop shell instead of one continuous operator page.
            </span>
          </div>

          <div style={navListStyle}>
            {navItems.map((item) => {
              const active = item.id === activeWorkspaceId;
              const tone = toneStyles[item.tone ?? "neutral"];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectWorkspace(item.id)}
                  title={item.helpTooltip ?? undefined}
                  style={{
                    ...navButtonStyle,
                    ...(active ? activeNavButtonStyle : null),
                  }}
                >
                  <div style={navButtonHeaderStyle}>
                    <strong>{item.label}</strong>
                    {item.badge ? (
                      <span style={{ ...navBadgeStyle, ...tone }}>
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <span style={navButtonSubtitleStyle}>{item.subtitle}</span>
                </button>
              );
            })}
          </div>

          {quickStats.length > 0 ? (
            <div style={quickStatsRailStyle}>
              <span style={navSectionEyebrowStyle}>Desktop telemetry</span>
              <div style={quickStatsGridStyle}>
                {quickStats.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    title={item.helpTooltip ?? undefined}
                    style={{
                      ...quickStatCardStyle,
                      ...toneStyles[item.tone ?? "neutral"],
                    }}
                  >
                    <span style={quickStatLabelStyle}>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        <section style={workspaceShellStyle}>
          <div style={workspaceChromeStyle}>
            <div style={workspaceChromeMetaStyle}>
              <div style={windowControlsStyle}>
                <span style={{ ...windowControlDotStyle, background: "var(--app-window-control-minimize)" }} />
                <span style={{ ...windowControlDotStyle, background: "var(--app-window-control-maximize)" }} />
                <span style={{ ...windowControlDotStyle, background: "var(--app-window-control-close)" }} />
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                <span style={navSectionEyebrowStyle}>Active workspace</span>
                <strong style={workspaceTitleStyle}>{workspaceTitle}</strong>
                <span style={workspaceSubtitleStyle}>{workspaceSubtitle}</span>
              </div>
            </div>

            {quickStats.length > 0 ? (
              <div style={workspaceQuickStatsRowStyle}>
                {quickStats.map((item) => (
                  <span
                    key={`workspace-${item.label}-${item.value}`}
                    title={item.helpTooltip ?? undefined}
                    style={{
                      ...workspaceQuickStatPillStyle,
                      ...toneStyles[item.tone ?? "neutral"],
                    }}
                  >
                    {item.label}: {item.value}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div style={workspaceCanvasStyle}>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

const shellStyle = {
  minHeight: "100vh",
  background: "var(--app-shell-bg)",
  color: "var(--app-text-color)",
  fontFamily: '"Segoe UI Variable", "Segoe UI", "Trebuchet MS", sans-serif',
  position: "relative",
  overflow: "hidden",
} satisfies CSSProperties;

const wallpaperGlowTopStyle = {
  position: "absolute",
  inset: "-14% auto auto -12%",
  width: 420,
  height: 420,
  borderRadius: "50%",
  background: "rgba(118, 170, 255, 0.36)",
  filter: "blur(96px)",
  pointerEvents: "none",
} satisfies CSSProperties;

const wallpaperGlowBottomStyle = {
  position: "absolute",
  inset: "auto -10% -18% auto",
  width: 460,
  height: 460,
  borderRadius: "50%",
  background: "rgba(33, 127, 255, 0.18)",
  filter: "blur(108px)",
  pointerEvents: "none",
} satisfies CSSProperties;

const taskbarStyle = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: "14px 20px",
  background: "var(--app-panel-bg)",
  borderBottom: "1px solid var(--app-panel-border)",
  backdropFilter: "blur(18px)",
} satisfies CSSProperties;

const taskbarBrandGroupStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  minWidth: 0,
} satisfies CSSProperties;

const startBadgeStyle = {
  width: 42,
  height: 42,
  borderRadius: "var(--app-card-radius)",
  display: "grid",
  placeItems: "center",
  color: "var(--app-accent-contrast)",
  background: "linear-gradient(145deg, var(--app-accent) 0%, rgba(24, 70, 166, 0.96) 100%)",
  boxShadow: "var(--app-shadow-soft)",
  fontWeight: 700,
  letterSpacing: "0.08em",
} satisfies CSSProperties;

const taskbarTitleStyle = {
  fontSize: 15,
  lineHeight: 1.1,
} satisfies CSSProperties;

const taskbarSubtitleStyle = {
  color: "var(--app-muted-color)",
  fontSize: 12,
} satisfies CSSProperties;

const taskbarMetaGroupStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 10,
} satisfies CSSProperties;

const taskbarUtilityBadgeStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "7px 11px",
  fontSize: 12,
} satisfies CSSProperties;

const taskbarClockStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "7px 12px",
  background: "var(--app-panel-bg-alt)",
  boxShadow: "var(--app-shadow-soft)",
  fontSize: 12,
} satisfies CSSProperties;

const desktopSurfaceStyle = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexWrap: "wrap",
  gap: 24,
  alignItems: "flex-start",
  padding: 24,
} satisfies CSSProperties;

const navRailStyle = {
  flex: "1 1 260px",
  minWidth: 240,
  maxWidth: 320,
  display: "grid",
  gap: 18,
  padding: 20,
  background: "var(--app-panel-bg)",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-window-radius)",
  boxShadow: "var(--app-shadow-strong)",
  backdropFilter: "blur(20px)",
} satisfies CSSProperties;

const navSectionHeaderStyle = {
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const navSectionEyebrowStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
} satisfies CSSProperties;

const navSectionTitleStyle = {
  fontSize: 18,
} satisfies CSSProperties;

const navSectionDetailStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
  lineHeight: 1.45,
} satisfies CSSProperties;

const navListStyle = {
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const navButtonStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "14px 16px",
  background: "var(--app-panel-bg-alt)",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 6,
  color: "var(--app-text-color)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const activeNavButtonStyle = {
  borderColor: "var(--app-accent-strong)",
  background: "linear-gradient(145deg, var(--app-accent-soft) 0%, var(--app-panel-bg-alt) 100%)",
  boxShadow: "var(--app-shadow-strong)",
  transform: "translateY(-1px)",
} satisfies CSSProperties;

const navButtonHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
} satisfies CSSProperties;

const navButtonSubtitleStyle = {
  color: "var(--app-muted-color)",
  fontSize: 12,
  lineHeight: 1.45,
} satisfies CSSProperties;

const navBadgeStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
} satisfies CSSProperties;

const quickStatsRailStyle = {
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const quickStatsGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
} satisfies CSSProperties;

const quickStatCardStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "12px 14px",
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const quickStatLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
} satisfies CSSProperties;

const workspaceShellStyle = {
  flex: "999 1 760px",
  minWidth: 0,
  display: "grid",
  gap: 16,
  padding: 20,
  background: "var(--app-panel-bg)",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-window-radius)",
  boxShadow: "var(--app-shadow-strong)",
  backdropFilter: "blur(20px)",
} satisfies CSSProperties;

const workspaceChromeStyle = {
  display: "grid",
  gap: 14,
  padding: "var(--app-panel-padding)",
  borderRadius: "var(--app-panel-radius)",
  background: "linear-gradient(135deg, var(--app-accent-soft) 0%, var(--app-panel-bg-alt) 100%)",
  border: "1px solid var(--app-panel-border)",
} satisfies CSSProperties;

const workspaceChromeMetaStyle = {
  display: "flex",
  gap: 16,
  alignItems: "flex-start",
  justifyContent: "space-between",
  flexWrap: "wrap",
} satisfies CSSProperties;

const workspaceTitleStyle = {
  fontSize: 24,
  lineHeight: 1.1,
} satisfies CSSProperties;

const workspaceSubtitleStyle = {
  color: "var(--app-muted-color)",
  lineHeight: 1.5,
} satisfies CSSProperties;

const workspaceQuickStatsRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
} satisfies CSSProperties;

const workspaceQuickStatPillStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  fontSize: 12,
} satisfies CSSProperties;

const windowControlsStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
} satisfies CSSProperties;

const windowControlDotStyle = {
  width: 11,
  height: 11,
  borderRadius: "50%",
  boxShadow: "var(--app-window-control-shadow)",
} satisfies CSSProperties;

const workspaceCanvasStyle = {
  display: "grid",
  gap: 20,
} satisfies CSSProperties;
