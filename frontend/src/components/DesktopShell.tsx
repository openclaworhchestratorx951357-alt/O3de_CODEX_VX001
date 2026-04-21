import type { CSSProperties, ReactNode } from "react";

export type DesktopShellTone = "neutral" | "info" | "success" | "warning";

export type DesktopShellNavItem = {
  id: string;
  label: string;
  subtitle: string;
  badge?: string | null;
  tone?: DesktopShellTone;
};

export type DesktopShellQuickStat = {
  label: string;
  value: string;
  tone?: DesktopShellTone;
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
  onSelectWorkspace: (workspaceId: string) => void;
  children: ReactNode;
};

const toneStyles: Record<DesktopShellTone, CSSProperties> = {
  neutral: {
    background: "rgba(240, 244, 252, 0.7)",
    borderColor: "rgba(117, 128, 154, 0.2)",
    color: "#20304d",
  },
  info: {
    background: "rgba(224, 241, 255, 0.78)",
    borderColor: "rgba(25, 118, 210, 0.28)",
    color: "#0e4c92",
  },
  success: {
    background: "rgba(227, 248, 239, 0.82)",
    borderColor: "rgba(24, 136, 91, 0.28)",
    color: "#0f6b47",
  },
  warning: {
    background: "rgba(255, 244, 224, 0.84)",
    borderColor: "rgba(193, 126, 17, 0.28)",
    color: "#8a4d00",
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
  onSelectWorkspace,
  children,
}: DesktopShellProps) {
  const timestampLabel = new Date().toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });

  return (
    <div style={shellStyle}>
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

      <div style={desktopSurfaceStyle}>
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
                <span style={{ ...windowControlDotStyle, background: "#ffbd44" }} />
                <span style={{ ...windowControlDotStyle, background: "#00ca56" }} />
                <span style={{ ...windowControlDotStyle, background: "#ff605c" }} />
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
  background:
    "radial-gradient(circle at top left, rgba(111, 178, 255, 0.34), transparent 28%), radial-gradient(circle at bottom right, rgba(22, 121, 255, 0.24), transparent 32%), linear-gradient(160deg, #dce8ff 0%, #edf3ff 44%, #f7faff 100%)",
  color: "#122033",
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
  background: "rgba(247, 250, 255, 0.7)",
  borderBottom: "1px solid rgba(137, 156, 196, 0.22)",
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
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  color: "#f8fbff",
  background: "linear-gradient(145deg, #3b82f6 0%, #2157c9 100%)",
  boxShadow: "0 14px 28px rgba(28, 75, 167, 0.22)",
  fontWeight: 700,
  letterSpacing: "0.08em",
} satisfies CSSProperties;

const taskbarTitleStyle = {
  fontSize: 15,
  lineHeight: 1.1,
} satisfies CSSProperties;

const taskbarSubtitleStyle = {
  color: "#4d6286",
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
  border: "1px solid rgba(117, 128, 154, 0.2)",
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 12,
} satisfies CSSProperties;

const taskbarClockStyle = {
  border: "1px solid rgba(137, 156, 196, 0.24)",
  borderRadius: 999,
  padding: "7px 12px",
  background: "rgba(255, 255, 255, 0.72)",
  boxShadow: "0 10px 20px rgba(49, 81, 139, 0.08)",
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
  background: "rgba(248, 251, 255, 0.74)",
  border: "1px solid rgba(137, 156, 196, 0.24)",
  borderRadius: 28,
  boxShadow: "0 24px 60px rgba(58, 84, 136, 0.16)",
  backdropFilter: "blur(20px)",
} satisfies CSSProperties;

const navSectionHeaderStyle = {
  display: "grid",
  gap: 6,
} satisfies CSSProperties;

const navSectionEyebrowStyle = {
  color: "#56719f",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
} satisfies CSSProperties;

const navSectionTitleStyle = {
  fontSize: 18,
} satisfies CSSProperties;

const navSectionDetailStyle = {
  color: "#4d6286",
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
  borderColor: "rgba(135, 157, 201, 0.18)",
  borderRadius: 20,
  padding: "14px 16px",
  background: "rgba(255, 255, 255, 0.75)",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 6,
  color: "#193055",
  boxShadow: "0 10px 24px rgba(58, 84, 136, 0.08)",
} satisfies CSSProperties;

const activeNavButtonStyle = {
  borderColor: "rgba(33, 87, 201, 0.34)",
  background: "linear-gradient(145deg, rgba(222, 237, 255, 0.95) 0%, rgba(248, 251, 255, 0.92) 100%)",
  boxShadow: "0 18px 32px rgba(41, 83, 165, 0.18)",
  transform: "translateY(-1px)",
} satisfies CSSProperties;

const navButtonHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
} satisfies CSSProperties;

const navButtonSubtitleStyle = {
  color: "#587096",
  fontSize: 12,
  lineHeight: 1.45,
} satisfies CSSProperties;

const navBadgeStyle = {
  border: "1px solid rgba(117, 128, 154, 0.2)",
  borderRadius: 999,
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
  border: "1px solid rgba(117, 128, 154, 0.2)",
  borderRadius: 18,
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
  background: "rgba(248, 251, 255, 0.74)",
  border: "1px solid rgba(137, 156, 196, 0.24)",
  borderRadius: 32,
  boxShadow: "0 30px 74px rgba(58, 84, 136, 0.16)",
  backdropFilter: "blur(20px)",
} satisfies CSSProperties;

const workspaceChromeStyle = {
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 24,
  background: "linear-gradient(135deg, rgba(235, 243, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)",
  border: "1px solid rgba(137, 156, 196, 0.22)",
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
  color: "#4d6286",
  lineHeight: 1.5,
} satisfies CSSProperties;

const workspaceQuickStatsRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
} satisfies CSSProperties;

const workspaceQuickStatPillStyle = {
  border: "1px solid rgba(117, 128, 154, 0.2)",
  borderRadius: 999,
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
  boxShadow: "0 1px 3px rgba(18, 32, 51, 0.18)",
} satisfies CSSProperties;

const workspaceCanvasStyle = {
  display: "grid",
  gap: 20,
} satisfies CSSProperties;
