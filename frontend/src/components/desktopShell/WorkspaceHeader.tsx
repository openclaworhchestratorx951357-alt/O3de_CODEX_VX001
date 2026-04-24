import type { CSSProperties } from "react";

import { goldSelectedShadow, raisedControlShadow, toneStyles } from "./sharedStyles";
import type { DesktopShellNavSection, DesktopShellQuickStat } from "./types";

type WorkspaceHeaderProps = {
  workspaceTitle: string;
  workspaceSubtitle: string;
  activeWorkspaceId: string;
  activeNavItemId?: string;
  activeNavSection?: DesktopShellNavSection;
  quickStats: readonly DesktopShellQuickStat[];
  onSelectWorkspace: (workspaceId: string) => void;
};

export default function WorkspaceHeader({
  workspaceTitle,
  workspaceSubtitle,
  activeWorkspaceId,
  activeNavItemId,
  activeNavSection,
  quickStats,
  onSelectWorkspace,
}: WorkspaceHeaderProps) {
  const currentNavItemId = activeNavItemId ?? activeWorkspaceId;

  return (
    <div style={workspaceChromeStyle}>
      <div style={workspaceChromeMetaStyle}>
        <div style={{ display: "grid", gap: 4 }}>
          <span style={navSectionEyebrowStyle}>Active workspace</span>
          <strong style={workspaceTitleStyle}>{workspaceTitle}</strong>
          <span style={workspaceSubtitleStyle}>{workspaceSubtitle}</span>
        </div>
      </div>

      <div style={workspaceChromeControlsStyle}>
        {activeNavSection ? (
          <div
            aria-label={`${activeNavSection.label} workspace sections`}
            style={workspacePeerNavStyle}
          >
            <span style={workspacePeerNavLabelStyle}>
              {activeNavSection.label}
            </span>
            {activeNavSection.items.map((item) => {
              const active = item.id === currentNavItemId;
              return (
                <button
                  key={`peer-${item.id}`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelectWorkspace(item.id)}
                  title={item.helpTooltip ?? item.subtitle}
                  style={{
                    ...workspacePeerNavPillStyle,
                    ...(active ? activeWorkspacePeerNavPillStyle : null),
                  }}
                >
                  {item.label}
                  {item.badge ? (
                    <span style={workspacePeerNavBadgeStyle}>{item.badge}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

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
    </div>
  );
}

const workspaceChromeStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  width: "min(100%, 1040px)",
  justifySelf: "start",
  padding: "10px 12px",
  borderRadius: "var(--app-panel-radius)",
  background: "linear-gradient(135deg, var(--app-accent-soft) 0%, var(--app-panel-bg-alt) 100%)",
  border: "1px solid var(--app-panel-border)",
  boxSizing: "border-box",
} satisfies CSSProperties;

const workspaceChromeMetaStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flex: "1 1 320px",
  minWidth: 220,
} satisfies CSSProperties;

const workspaceChromeControlsStyle = {
  display: "grid",
  justifyItems: "start",
  alignSelf: "flex-start",
  gap: 6,
  flex: "0 1 560px",
  minWidth: 0,
} satisfies CSSProperties;

const navSectionEyebrowStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
} satisfies CSSProperties;

const workspacePeerNavStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "fit-content",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
  padding: "5px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  background: "color-mix(in srgb, var(--app-panel-bg) 70%, transparent)",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
} satisfies CSSProperties;

const workspacePeerNavLabelStyle = {
  flex: "0 0 auto",
  color: "var(--app-subtle-color)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  paddingInline: 5,
} satisfies CSSProperties;

const workspacePeerNavPillStyle = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "color-mix(in srgb, var(--app-panel-border) 86%, transparent)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 11px",
  background: "linear-gradient(180deg, color-mix(in srgb, var(--app-panel-bg-alt) 92%, white 8%) 0%, var(--app-panel-bg-alt) 100%)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
  boxShadow: "0 5px 12px rgba(0, 0, 0, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
  transform: "translateY(-1px)",
} satisfies CSSProperties;

const activeWorkspacePeerNavPillStyle = {
  borderColor: "#f8d477",
  background: "linear-gradient(180deg, var(--app-accent-soft) 0%, color-mix(in srgb, var(--app-accent-soft) 76%, var(--app-panel-bg) 24%) 100%)",
  boxShadow: goldSelectedShadow,
} satisfies CSSProperties;

const workspacePeerNavBadgeStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "1px 5px",
  background: "var(--app-panel-bg)",
  fontSize: 9,
} satisfies CSSProperties;

const workspaceTitleStyle = {
  fontSize: 20,
  lineHeight: 1.1,
} satisfies CSSProperties;

const workspaceSubtitleStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
  lineHeight: 1.35,
} satisfies CSSProperties;

const workspaceQuickStatsRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
  alignItems: "flex-start",
} satisfies CSSProperties;

const workspaceQuickStatPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "flex-start",
  flex: "0 0 auto",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "4px 8px",
  fontSize: 11,
  lineHeight: 1.2,
  whiteSpace: "nowrap" as const,
  boxShadow: raisedControlShadow,
} satisfies CSSProperties;
