import { useEffect, useState, type CSSProperties } from "react";

import { toneStyles } from "./sharedStyles";
import type { DesktopShellNavSection } from "./types";

type WorkspaceTreeProps = {
  activeWorkspaceId: string;
  activeNavItemId?: string;
  navSections: readonly DesktopShellNavSection[];
  workspaceTitle: string;
  onSelectWorkspace: (workspaceId: string) => void;
};

export default function WorkspaceTree({
  activeWorkspaceId,
  activeNavItemId,
  navSections,
  workspaceTitle,
  onSelectWorkspace,
}: WorkspaceTreeProps) {
  const currentNavItemId = activeNavItemId ?? activeWorkspaceId;
  const activeNavItem = navSections
    .flatMap((section) => section.items)
    .find((item) => item.id === currentNavItemId);
  const activeNavSection = navSections.find((section) => (
    section.items.some((item) => item.id === currentNavItemId)
  ));
  const activeNavSectionId = activeNavSection?.id ?? "start";
  const [expandAllGroups, setExpandAllGroups] = useState(false);
  const [expandedSectionId, setExpandedSectionId] = useState(activeNavSectionId);

  useEffect(() => {
    if (!expandAllGroups) {
      setExpandedSectionId(activeNavSectionId);
    }
  }, [activeNavSectionId, expandAllGroups]);

  function toggleNavSection(sectionId: string) {
    if (expandAllGroups) {
      setExpandAllGroups(false);
      setExpandedSectionId(sectionId);
      return;
    }
    setExpandedSectionId((currentSectionId) => (
      currentSectionId === sectionId ? activeNavSectionId : sectionId
    ));
  }

  function toggleExpandAllGroups(): void {
    setExpandAllGroups((current) => {
      const next = !current;
      if (!next) {
        setExpandedSectionId(activeNavSectionId);
      }
      return next;
    });
  }

  return (
    <aside aria-label="Workspace menu tree" style={navRailStyle}>
      <div style={navSectionHeaderStyle}>
        <span style={navSectionEyebrowStyle}>Workspace tree</span>
        <strong style={navSectionTitleStyle}>Control surface</strong>
        <span style={navSectionDetailStyle}>
          Open one group at a time, or expand all groups when you need faster cockpit access.
        </span>
        <button
          type="button"
          onClick={toggleExpandAllGroups}
          style={expandAllButtonStyle}
        >
          {expandAllGroups ? "Focus active group" : "Expand all groups"}
        </button>
        <span style={currentWorkspacePillStyle}>
          <span>Now open</span>
          <strong>{activeNavItem?.label ?? workspaceTitle}</strong>
        </span>
      </div>

      <div style={navScrollableRegionStyle}>
        {navSections.map((section) => {
          const sectionActive = section.items.some((item) => item.id === activeWorkspaceId);
          const sectionExpanded = expandAllGroups || expandedSectionId === section.id;
          return (
            <section key={section.id} style={navGroupStyle}>
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
                    const active = item.id === currentNavItemId;
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
                          <strong style={navButtonLabelStyle}>{item.label}</strong>
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
  );
}

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
  overflow: "hidden",
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

const expandAllButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "5px 9px",
  width: "fit-content",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  fontSize: 12,
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const currentWorkspacePillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  width: "fit-content",
  maxWidth: "100%",
  border: "1px solid var(--app-active-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 9px",
  background: "var(--app-active-bg)",
  color: "var(--app-text-color)",
  fontSize: 12,
  lineHeight: 1.25,
  boxShadow: "var(--app-active-shadow)",
} satisfies CSSProperties;

const navScrollableRegionStyle = {
  display: "grid",
  alignContent: "start",
  gap: 8,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: 2,
} satisfies CSSProperties;

const navGroupStyle = {
  display: "grid",
  gap: 0,
  border: "1px solid var(--app-panel-border-strong)",
  borderRadius: "var(--app-panel-radius)",
  background: "var(--app-panel-elevated)",
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
  padding: "9px 11px",
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

const navListStyle = {
  display: "grid",
  gap: 6,
  padding: "6px 0 2px",
} satisfies CSSProperties;

const navButtonStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--app-panel-border)",
  borderRadius: "calc(var(--app-panel-radius) - 4px)",
  padding: "8px 10px",
  background: "linear-gradient(155deg, var(--app-panel-bg-alt) 0%, var(--app-panel-bg-muted) 100%)",
  cursor: "pointer",
  textAlign: "left",
  display: "grid",
  gap: 3,
  color: "var(--app-text-color)",
  boxShadow: "var(--app-shadow-soft)",
  minWidth: 0,
  boxSizing: "border-box",
  overflow: "hidden",
} satisfies CSSProperties;

const activeNavButtonStyle = {
  borderColor: "var(--app-active-border)",
  background: "var(--app-active-bg)",
  boxShadow: "var(--app-active-shadow)",
} satisfies CSSProperties;

const navButtonHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 8,
  minWidth: 0,
} satisfies CSSProperties;

const navButtonLabelStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
} satisfies CSSProperties;

const navButtonSubtitleStyle = {
  color: "var(--app-muted-color)",
  fontSize: 11,
  lineHeight: 1.35,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "normal" as const,
  maxHeight: 30,
} satisfies CSSProperties;

const navBadgeStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "3px 7px",
  fontSize: 11,
  fontWeight: 700,
  flex: "0 0 auto",
  whiteSpace: "nowrap" as const,
} satisfies CSSProperties;
