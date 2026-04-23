import { useState, type CSSProperties, type ReactNode } from "react";

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

export type DesktopShellNavSection = {
  id: string;
  label: string;
  detail: string;
  items: readonly DesktopShellNavItem[];
};

export type DesktopShellQuickStat = {
  label: string;
  value: string;
  tone?: DesktopShellTone;
  helpTooltip?: string | null;
};

export type DesktopShellAgentCallItem = {
  id: string;
  label: string;
  detail: string;
  status?: string | null;
};

type DesktopShellProps = {
  appTitle: string;
  appSubtitle: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  activeWorkspaceId: string;
  navSections: readonly DesktopShellNavSection[];
  quickStats?: readonly DesktopShellQuickStat[];
  utilityLabel?: string | null;
  utilityDetail?: string | null;
  utilityActions?: ReactNode;
  agentCallItems?: readonly DesktopShellAgentCallItem[];
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
  const [agentCallOpen, setAgentCallOpen] = useState(false);
  const [agentChatOpen, setAgentChatOpen] = useState(false);
  const [agentChatDraft, setAgentChatDraft] = useState("");
  const activeNavItem = navSections
    .flatMap((section) => section.items)
    .find((item) => item.id === activeWorkspaceId);
  const activeNavSection = navSections.find((section) => (
    section.items.some((item) => item.id === activeWorkspaceId)
  ));
  const [expandedSectionIds, setExpandedSectionIds] = useState<readonly string[]>(["start"]);
  const expandedSectionIdSet = new Set([
    ...expandedSectionIds,
    activeNavSection?.id ?? "start",
  ]);
  const timestampLabel = new Date().toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
  const visibleAgentCallItems = agentCallItems.length > 0
    ? agentCallItems
    : fallbackAgentCallItems;

  function toggleNavSection(sectionId: string) {
    setExpandedSectionIds((currentSectionIds) => {
      if (currentSectionIds.includes(sectionId)) {
        return currentSectionIds.filter((currentSectionId) => currentSectionId !== sectionId);
      }

      return [...currentSectionIds, sectionId];
    });
  }

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
          <div style={agentCallAnchorStyle}>
            <button
              type="button"
              aria-label="Call an agent"
              aria-expanded={agentCallOpen}
              onClick={() => setAgentCallOpen((open) => !open)}
              style={agentCallButtonStyle}
              title="Call an active agent, resume a thread, or start a new chat."
            >
              <span aria-hidden="true">☎</span>
            </button>
            {agentCallOpen ? (
              <div style={agentCallPopoverStyle} role="dialog" aria-label="Agent call menu">
                <div style={agentCallPopoverHeaderStyle}>
                  <strong>Call an agent</strong>
                  <span>Pick an active helper or start a new chat dock.</span>
                </div>
                <div style={agentCallListStyle}>
                  {visibleAgentCallItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setAgentChatOpen(true);
                        setAgentCallOpen(false);
                      }}
                      style={agentCallListButtonStyle}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                      {item.status ? (
                        <small>{item.status}</small>
                      ) : null}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAgentChatOpen(true);
                    setAgentCallOpen(false);
                  }}
                  style={agentCallNewChatButtonStyle}
                >
                  Start new chat
                </button>
              </div>
            ) : null}
          </div>
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
          width: "100%",
          margin: 0,
          boxSizing: "border-box",
        }}
      >
        <aside aria-label="Workspace menu tree" style={navRailStyle}>
          <div style={navSectionHeaderStyle}>
            <span style={navSectionEyebrowStyle}>Workspace tree</span>
            <strong style={navSectionTitleStyle}>Control surface</strong>
            <span style={navSectionDetailStyle}>
              Open one group at a time so the right side stays available for large editor and viewer surfaces.
            </span>
            <span style={currentWorkspacePillStyle}>
              <span>Now open</span>
              <strong>{activeNavItem?.label ?? workspaceTitle}</strong>
            </span>
          </div>

          <div style={navScrollableRegionStyle}>
            {navSections.map((section) => {
              const sectionActive = section.items.some((item) => item.id === activeWorkspaceId);
              const sectionExpanded = expandedSectionIdSet.has(section.id);
              return (
                <section
                  key={section.id}
                  style={navGroupStyle}
                >
                  <button
                    type="button"
                    aria-expanded={sectionExpanded}
                    onClick={() => toggleNavSection(section.id)}
                    style={navGroupSummaryStyle}
                    title={section.detail}
                  >
                    <span style={navGroupSummaryLabelStyle}>{section.label}</span>
                    <span style={navGroupMetaStyle}>
                      {sectionActive ? (
                        <span style={{ ...navBadgeStyle, ...toneStyles.info }}>
                          open
                        </span>
                      ) : null}
                      <span aria-hidden="true" style={navGroupChevronStyle}>
                        {sectionExpanded ? "v" : ">"}
                      </span>
                    </span>
                  </button>
                  {sectionExpanded ? (
                    <div style={navListStyle}>
                      {section.items.map((item) => {
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
                  ) : null}
                </section>
              );
            })}
          </div>
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

            {activeNavSection ? (
              <div
                aria-label={`${activeNavSection.label} workspace sections`}
                style={workspacePeerNavStyle}
              >
                <span style={workspacePeerNavLabelStyle}>
                  {activeNavSection.label}
                </span>
                {activeNavSection.items.map((item) => {
                  const active = item.id === activeWorkspaceId;
                  return (
                    <button
                      key={`peer-${item.id}`}
                      type="button"
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

          <div style={workspaceCanvasStyle}>
            {children}
          </div>
        </section>
      </div>

      {agentChatOpen ? (
        <div style={agentChatDockStyle} role="region" aria-label="Agent chat dock">
          <div style={agentChatDockHeaderStyle}>
            <div>
              <strong>Agent chat</strong>
              <span>Ask an agent to help with the current app workspace.</span>
            </div>
            <button
              type="button"
              onClick={() => setAgentChatOpen(false)}
              style={agentChatCloseButtonStyle}
            >
              Close
            </button>
          </div>
          <div style={agentChatFeatureRowStyle} aria-label="Agent feature shortcuts">
            <button type="button" style={agentChatFeatureButtonStyle}>Attach source</button>
            <button type="button" style={agentChatFeatureButtonStyle}>Use current panel</button>
            <button type="button" style={agentChatFeatureButtonStyle}>Open App OS</button>
            <button type="button" style={agentChatFeatureButtonStyle}>Ask O3DE</button>
          </div>
          <form
            style={agentChatInputRowStyle}
            onSubmit={(event) => {
              event.preventDefault();
              setAgentChatDraft("");
            }}
          >
            <input
              value={agentChatDraft}
              onChange={(event) => setAgentChatDraft(event.target.value)}
              placeholder="Tell the agent what to inspect, change, or prepare..."
              style={agentChatInputStyle}
            />
            <button type="submit" aria-label="Send agent message" style={agentChatSendButtonStyle}>
              ↑
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

const fallbackAgentCallItems = [
  {
    id: "mission-control",
    label: "Mission Control",
    detail: "Coordinate tasks, handoffs, and active workspaces.",
    status: "ready",
  },
  {
    id: "operator-guide",
    label: "Guide Agent",
    detail: "Explain the current panel and recommend the next safe step.",
    status: "available",
  },
] satisfies DesktopShellAgentCallItem[];

const shellStyle = {
  height: "100vh",
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
  position: "relative",
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

const agentCallAnchorStyle = {
  position: "relative",
  display: "inline-flex",
} satisfies CSSProperties;

const agentCallButtonStyle = {
  width: 42,
  height: 42,
  display: "grid",
  placeItems: "center",
  border: "1px solid rgba(255, 130, 130, 0.85)",
  borderRadius: "50%",
  background: "linear-gradient(145deg, #ef4444 0%, #991b1b 100%)",
  color: "#fff7ed",
  boxShadow: "0 14px 34px rgba(153, 27, 27, 0.32)",
  cursor: "pointer",
  fontSize: 20,
  lineHeight: 1,
} satisfies CSSProperties;

const agentCallPopoverStyle = {
  position: "absolute",
  top: "calc(100% + 10px)",
  right: 0,
  zIndex: 8,
  width: 320,
  display: "grid",
  gap: 12,
  padding: 14,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-window-radius)",
  background: "var(--app-panel-bg)",
  boxShadow: "var(--app-shadow-strong)",
  backdropFilter: "blur(22px)",
} satisfies CSSProperties;

const agentCallPopoverHeaderStyle = {
  display: "grid",
  gap: 4,
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const agentCallListStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const agentCallListButtonStyle = {
  display: "grid",
  gap: 4,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  padding: "10px 12px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  textAlign: "left",
  cursor: "pointer",
} satisfies CSSProperties;

const agentCallNewChatButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "9px 12px",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontWeight: 800,
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

const navRailStyle = {
  flex: "0 0 clamp(220px, 17vw, 280px)",
  alignSelf: "stretch",
  position: "relative",
  minWidth: 220,
  maxWidth: 280,
  height: "100%",
  maxHeight: "100%",
  display: "grid",
  gap: 12,
  gridTemplateRows: "auto minmax(0, 1fr)",
  padding: 14,
  background: "var(--app-panel-bg)",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-window-radius)",
  boxShadow: "var(--app-shadow-strong)",
  backdropFilter: "blur(20px)",
  minHeight: 0,
  overflow: "auto",
} satisfies CSSProperties;

const navSectionHeaderStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const navSectionEyebrowStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
} satisfies CSSProperties;

const navSectionTitleStyle = {
  fontSize: 17,
  lineHeight: 1.15,
} satisfies CSSProperties;

const navSectionDetailStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
  lineHeight: 1.45,
} satisfies CSSProperties;

const currentWorkspacePillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  width: "fit-content",
  maxWidth: "100%",
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 9px",
  background: "var(--app-accent-soft)",
  color: "var(--app-text-color)",
  fontSize: 12,
  lineHeight: 1.25,
} satisfies CSSProperties;

const navListStyle = {
  display: "grid",
  gap: 8,
  paddingTop: 8,
} satisfies CSSProperties;

const navScrollableRegionStyle = {
  display: "grid",
  gap: 10,
  minHeight: 0,
  overflow: "visible",
} satisfies CSSProperties;

const navGroupStyle = {
  display: "grid",
  gap: 0,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-panel-radius)",
  background: "var(--app-panel-bg-alt)",
  boxShadow: "var(--app-shadow-soft)",
  overflow: "hidden",
} satisfies CSSProperties;

const navGroupSummaryStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  border: 0,
  padding: "10px 12px",
  cursor: "pointer",
  background: "transparent",
  color: "var(--app-text-color)",
  textAlign: "left",
} satisfies CSSProperties;

const navGroupSummaryLabelStyle = {
  fontSize: 13,
  lineHeight: 1.15,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--app-subtle-color)",
  fontWeight: 800,
} satisfies CSSProperties;

const navGroupMetaStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flex: "0 0 auto",
} satisfies CSSProperties;

const navGroupChevronStyle = {
  color: "var(--app-muted-color)",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1,
} satisfies CSSProperties;

const navButtonStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--app-panel-border)",
  borderRadius: "calc(var(--app-panel-radius) - 4px)",
  padding: "10px 12px",
  background: "var(--app-panel-bg-alt)",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 4,
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
  minWidth: 0,
} satisfies CSSProperties;

const navButtonSubtitleStyle = {
  color: "var(--app-muted-color)",
  fontSize: 11,
  lineHeight: 1.35,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
} satisfies CSSProperties;

const navBadgeStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
} satisfies CSSProperties;

const workspaceShellStyle = {
  flex: "1 1 820px",
  alignSelf: "stretch",
  minWidth: 0,
  display: "grid",
  gap: 16,
  gridTemplateRows: "auto minmax(0, 1fr)",
  padding: 16,
  background: "var(--app-panel-bg)",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-window-radius)",
  boxShadow: "var(--app-shadow-strong)",
  backdropFilter: "blur(20px)",
  minHeight: 0,
  height: "100%",
  maxHeight: "100%",
  overflow: "hidden",
} satisfies CSSProperties;

const workspaceChromeStyle = {
  display: "grid",
  gap: 12,
  width: "min(100%, 1040px)",
  justifySelf: "start",
  padding: "14px 16px",
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

const workspacePeerNavStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "fit-content",
  maxWidth: "100%",
  minWidth: 0,
  overflowX: "auto",
  padding: "8px",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  background: "color-mix(in srgb, var(--app-panel-bg) 70%, transparent)",
} satisfies CSSProperties;

const workspacePeerNavLabelStyle = {
  flex: "0 0 auto",
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  paddingInline: 4,
} satisfies CSSProperties;

const workspacePeerNavPillStyle = {
  flex: "0 0 auto",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap" as const,
} satisfies CSSProperties;

const activeWorkspacePeerNavPillStyle = {
  borderColor: "var(--app-accent-strong)",
  background: "var(--app-accent-soft)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const workspacePeerNavBadgeStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "2px 6px",
  background: "var(--app-panel-bg)",
  fontSize: 10,
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
  padding: "8px 12px",
  fontSize: 12,
  lineHeight: 1.35,
  whiteSpace: "nowrap" as const,
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
  minHeight: 0,
  overflow: "auto",
  alignContent: "start",
  paddingRight: 4,
} satisfies CSSProperties;

const agentChatDockStyle = {
  position: "fixed",
  left: 18,
  right: 18,
  bottom: 18,
  zIndex: 7,
  display: "grid",
  gap: 10,
  padding: "16px 18px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 28,
  background: "#343638",
  color: "#f4f4f5",
  boxShadow: "0 24px 70px rgba(0, 0, 0, 0.46)",
  backdropFilter: "blur(26px)",
} satisfies CSSProperties;

const agentChatDockHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  color: "#f4f4f5",
} satisfies CSSProperties;

const agentChatCloseButtonStyle = {
  border: "1px solid rgba(255, 255, 255, 0.16)",
  borderRadius: "var(--app-pill-radius)",
  padding: "7px 12px",
  background: "rgba(255, 255, 255, 0.07)",
  color: "#f4f4f5",
  cursor: "pointer",
} satisfies CSSProperties;

const agentChatFeatureRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const agentChatFeatureButtonStyle = {
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "rgba(255, 255, 255, 0.08)",
  color: "#f4f4f5",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
} satisfies CSSProperties;

const agentChatInputRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 50px",
  gap: 10,
  alignItems: "center",
} satisfies CSSProperties;

const agentChatInputStyle = {
  minWidth: 0,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: 24,
  padding: "15px 18px",
  background: "#2d2f31",
  color: "#f8fafc",
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  outline: "none",
} satisfies CSSProperties;

const agentChatSendButtonStyle = {
  width: 46,
  height: 46,
  display: "grid",
  placeItems: "center",
  border: 0,
  borderRadius: "50%",
  padding: 0,
  background: "#f8fafc",
  color: "#111315",
  cursor: "pointer",
  fontWeight: 800,
  boxShadow: "0 10px 22px rgba(0, 0, 0, 0.24)",
} satisfies CSSProperties;
