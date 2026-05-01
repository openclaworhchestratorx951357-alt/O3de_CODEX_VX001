import type { CSSProperties } from "react";

import { useThemeTokens } from "../lib/settings/hooks";
import AgentCallSurface from "./desktopShell/AgentCallSurface";
import QuickAccessBar from "./desktopShell/QuickAccessBar";
import { toneStyles } from "./desktopShell/sharedStyles";
import type { DesktopShellProps } from "./desktopShell/types";
import WorkspaceHeader from "./desktopShell/WorkspaceHeader";
import WorkspaceTree from "./desktopShell/WorkspaceTree";

export type {
  DesktopShellAgentCallItem,
  DesktopShellNavItem,
  DesktopShellNavSection,
  DesktopShellQuickStat,
  DesktopShellTone,
} from "./desktopShell/types";

export default function DesktopShell({
  appTitle,
  appSubtitle,
  workspaceTitle,
  workspaceSubtitle,
  activeWorkspaceId,
  activeNavItemId,
  hideWorkspaceTree = false,
  navSections,
  quickStats = [],
  utilityLabel,
  utilityDetail,
  utilityActions,
  agentCallItems = [],
  onSelectWorkspace,
  children,
}: DesktopShellProps) {
  const themeTokens = useThemeTokens();
  const currentNavItemId = activeNavItemId ?? activeWorkspaceId;
  const activeNavSection = navSections.find((section) => (
    section.items.some((item) => item.id === currentNavItemId)
  ));
  const headerNavSection = hideWorkspaceTree
    ? {
      id: "workspaces",
      label: "Workspaces",
      detail: "Standalone cockpit tabs",
      items: navSections.flatMap((section) => section.items),
    }
    : activeNavSection;
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
        <QuickAccessBar
          activeWorkspaceId={currentNavItemId}
          navSections={navSections}
          onSelectWorkspace={onSelectWorkspace}
        />
        <div style={taskbarMetaGroupStyle}>
          <AgentCallSurface agentCallItems={agentCallItems} />
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
          paddingBottom: themeTokens.compactDensity ? 76 : 88,
          width: "100%",
          margin: 0,
          boxSizing: "border-box",
        }}
      >
        {hideWorkspaceTree ? null : (
          <WorkspaceTree
            activeWorkspaceId={activeWorkspaceId}
            activeNavItemId={currentNavItemId}
            navSections={navSections}
            workspaceTitle={workspaceTitle}
            onSelectWorkspace={onSelectWorkspace}
          />
        )}

        <section style={workspaceShellStyle}>
          <WorkspaceHeader
            workspaceTitle={workspaceTitle}
            workspaceSubtitle={workspaceSubtitle}
            activeWorkspaceId={activeWorkspaceId}
            activeNavItemId={currentNavItemId}
            activeNavSection={headerNavSection}
            quickStats={quickStats}
            onSelectWorkspace={onSelectWorkspace}
          />

          <div style={workspaceCanvasStyle}>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}

const shellStyle = {
  height: "100vh",
  maxHeight: "100dvh",
  minHeight: 0,
  display: "grid",
  gridTemplateRows: "auto 1fr",
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
  background: "var(--app-shell-glow-primary)",
  filter: "blur(96px)",
  pointerEvents: "none",
} satisfies CSSProperties;

const wallpaperGlowBottomStyle = {
  position: "absolute",
  inset: "auto -10% -18% auto",
  width: 460,
  height: 460,
  borderRadius: "50%",
  background: "var(--app-shell-glow-secondary)",
  filter: "blur(108px)",
  pointerEvents: "none",
} satisfies CSSProperties;

const taskbarStyle = {
  position: "relative",
  zIndex: 2,
  display: "grid",
  gridTemplateColumns: "minmax(260px, max-content) minmax(280px, 1fr) max-content",
  alignItems: "center",
  gap: 14,
  minHeight: 64,
  padding: "10px 18px",
  background: "var(--app-shell-taskbar-bg)",
  borderBottom: "1px solid var(--app-panel-border-strong)",
  backdropFilter: "blur(18px)",
  boxShadow: "var(--app-shadow-soft)",
  overflow: "visible",
} satisfies CSSProperties;

const taskbarBrandGroupStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  minWidth: 0,
  justifySelf: "start",
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
  flexWrap: "nowrap",
  gap: 8,
  minWidth: 0,
  justifySelf: "end",
  whiteSpace: "nowrap",
} satisfies CSSProperties;

const taskbarUtilityBadgeStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  fontSize: 12,
  maxWidth: 170,
  overflow: "hidden",
  textOverflow: "ellipsis",
} satisfies CSSProperties;

const taskbarClockStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  background: "var(--app-panel-bg-alt)",
  boxShadow: "var(--app-shadow-soft)",
  fontSize: 12,
} satisfies CSSProperties;

const desktopSurfaceStyle = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexWrap: "nowrap",
  gap: 18,
  alignItems: "stretch",
  minHeight: 0,
  height: "100%",
  overflow: "hidden",
  padding: 24,
} satisfies CSSProperties;

const workspaceShellStyle = {
  flex: "1 1 820px",
  alignSelf: "stretch",
  minWidth: 0,
  display: "grid",
  gap: 12,
  gridTemplateRows: "auto minmax(0, 1fr)",
  padding: 16,
  background: "linear-gradient(160deg, var(--app-panel-bg) 0%, var(--app-panel-bg-alt) 100%)",
  border: "1px solid var(--app-panel-border-strong)",
  borderRadius: "var(--app-window-radius)",
  boxShadow: "var(--app-shadow-strong)",
  backdropFilter: "blur(20px)",
  minHeight: 0,
  height: "100%",
  maxHeight: "100%",
  overflow: "hidden",
} satisfies CSSProperties;

const workspaceCanvasStyle = {
  display: "grid",
  gap: 20,
  minHeight: 0,
  overflow: "auto",
  alignContent: "start",
  paddingRight: 4,
  paddingBottom: 72,
  scrollPaddingBottom: 72,
} satisfies CSSProperties;
