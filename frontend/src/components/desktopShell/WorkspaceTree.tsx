import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { useSettings } from "../../lib/settings/hooks";
import type { WorkspaceTreeDefaultMode } from "../../types/settings";
import { toneStyles } from "./sharedStyles";
import type { DesktopShellNavSection } from "./types";

type WorkspaceTreeProps = {
  activeWorkspaceId: string;
  activeNavItemId?: string;
  navSections: readonly DesktopShellNavSection[];
  workspaceTitle: string;
  onSelectWorkspace: (workspaceId: string) => void;
};

type WorkspaceTreeViewMode = "grouped" | "all";

const WORKSPACE_TREE_VIEW_MODE_SESSION_KEY = "o3de.app.workspaceTree.viewMode.v1";
const SMALL_HEIGHT_ALL_APPS_THRESHOLD_PX = 720;

function readPersistedWorkspaceTreeViewMode(): WorkspaceTreeViewMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const persistedValue = window.sessionStorage.getItem(WORKSPACE_TREE_VIEW_MODE_SESSION_KEY);
    if (persistedValue === "grouped" || persistedValue === "all") {
      return persistedValue;
    }
  } catch {
    return null;
  }

  return null;
}

function resolveWorkspaceTreeDefaultViewMode(
  configuredDefaultMode: WorkspaceTreeDefaultMode,
): WorkspaceTreeViewMode {
  if (configuredDefaultMode === "grouped" || configuredDefaultMode === "all") {
    return configuredDefaultMode;
  }

  if (typeof window !== "undefined" && window.innerHeight <= SMALL_HEIGHT_ALL_APPS_THRESHOLD_PX) {
    return "all";
  }

  // Auto mode now prefers all-app visibility on first load so every cockpit stays reachable
  // without collapsing to a single group lane.
  return "all";
}

function resolveWorkspaceTreeViewModeForSession(
  configuredDefaultMode: WorkspaceTreeDefaultMode,
): WorkspaceTreeViewMode {
  const resolvedDefaultMode = resolveWorkspaceTreeDefaultViewMode(configuredDefaultMode);
  if (configuredDefaultMode === "auto" && resolvedDefaultMode === "all") {
    // In auto mode, small-height accessibility wins over stale session overrides.
    return "all";
  }
  return readPersistedWorkspaceTreeViewMode() ?? resolvedDefaultMode;
}

export default function WorkspaceTree({
  activeWorkspaceId,
  activeNavItemId,
  navSections,
  workspaceTitle,
  onSelectWorkspace,
}: WorkspaceTreeProps) {
  const { settings } = useSettings();
  const workspaceTreeDefaultMode = settings.layout.workspaceTreeDefaultMode;
  const currentNavItemId = activeNavItemId ?? activeWorkspaceId;
  const activeNavItem = navSections
    .flatMap((section) => section.items)
    .find((item) => item.id === currentNavItemId);
  const activeNavSection = navSections.find((section) => (
    section.items.some((item) => item.id === currentNavItemId)
  ));
  const activeNavSectionId = activeNavSection?.id ?? "start";
  const allSectionIds = useMemo(
    () => navSections.map((section) => section.id),
    [navSections],
  );
  const allWorkspaceItems = useMemo(
    () => navSections.flatMap((section) => section.items.map((item) => ({
      ...item,
      sectionLabel: section.label,
    }))),
    [navSections],
  );
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>(allSectionIds);
  const [viewMode, setViewMode] = useState<WorkspaceTreeViewMode>(() => (
    resolveWorkspaceTreeViewModeForSession(workspaceTreeDefaultMode)
  ));

  useEffect(() => {
    setExpandedSectionIds((currentSectionIds) => {
      const knownSectionIds = currentSectionIds.filter((id) => allSectionIds.includes(id));
      const withActiveSection = knownSectionIds.includes(activeNavSectionId)
        ? knownSectionIds
        : [...knownSectionIds, activeNavSectionId];

      return withActiveSection.length > 0 ? withActiveSection : allSectionIds;
    });
  }, [activeNavSectionId, allSectionIds]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(WORKSPACE_TREE_VIEW_MODE_SESSION_KEY, viewMode);
    } catch {
      // Session persistence is best-effort only; tree behavior must remain usable without storage.
    }
  }, [viewMode]);

  useEffect(() => {
    const resolvedDefaultMode = resolveWorkspaceTreeDefaultViewMode(workspaceTreeDefaultMode);
    if (workspaceTreeDefaultMode === "auto" && resolvedDefaultMode === "all") {
      setViewMode("all");
      return;
    }
    const persistedViewMode = readPersistedWorkspaceTreeViewMode();
    if (persistedViewMode) {
      return;
    }
    setViewMode(resolvedDefaultMode);
  }, [workspaceTreeDefaultMode]);

  function toggleNavSection(sectionId: string) {
    setExpandedSectionIds((currentSectionIds) => {
      if (currentSectionIds.includes(sectionId)) {
        const nextSectionIds = currentSectionIds.filter((id) => id !== sectionId);
        if (nextSectionIds.length === 0) {
          return [activeNavSectionId];
        }
        return nextSectionIds;
      }
      return [...currentSectionIds, sectionId];
    });
  }

  function expandAllSections() {
    setExpandedSectionIds(allSectionIds);
  }

  function collapseToActiveSection() {
    setExpandedSectionIds([activeNavSectionId]);
  }

  function resetNavDefaults() {
    setViewMode(resolveWorkspaceTreeDefaultViewMode(workspaceTreeDefaultMode));
    setExpandedSectionIds(allSectionIds);
    try {
      window.sessionStorage.removeItem(WORKSPACE_TREE_VIEW_MODE_SESSION_KEY);
    } catch {
      // Storage reset remains optional; visual reset still applies immediately.
    }
  }

  return (
    <aside aria-label="Workspace menu tree" style={navRailStyle}>
      <div style={navSectionHeaderStyle}>
        <span style={navSectionEyebrowStyle}>Workspace tree</span>
        <strong style={navSectionTitleStyle}>Control surface</strong>
        <span style={navSectionDetailStyle}>
          Every cockpit is reachable here. Use Grouped or All apps view and scroll this rail to reach every destination.
        </span>
        <span style={currentWorkspacePillStyle}>
          <span>Now open</span>
          <strong>{activeNavItem?.label ?? workspaceTitle}</strong>
        </span>
        <div style={navSectionActionRowStyle}>
          <button
            type="button"
            onClick={() => setViewMode("grouped")}
            style={{
              ...navSectionActionButtonStyle,
              ...(viewMode === "grouped" ? navSectionActionButtonActiveStyle : null),
            }}
            aria-label="Show grouped workspace tree view"
            aria-pressed={viewMode === "grouped"}
          >
            Grouped
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            style={{
              ...navSectionActionButtonStyle,
              ...(viewMode === "all" ? navSectionActionButtonActiveStyle : null),
            }}
            aria-label="Show all cockpit apps view"
            aria-pressed={viewMode === "all"}
          >
            All apps
          </button>
          <button
            type="button"
            onClick={expandAllSections}
            style={navSectionActionButtonStyle}
            aria-label="Expand all workspace groups"
            disabled={viewMode !== "grouped"}
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseToActiveSection}
            style={navSectionActionButtonStyle}
            aria-label="Collapse to current workspace group"
            disabled={viewMode !== "grouped"}
          >
            Collapse to active
          </button>
          <button
            type="button"
            onClick={resetNavDefaults}
            style={navSectionActionButtonStyle}
            aria-label="Reset workspace tree defaults"
          >
            Reset defaults
          </button>
        </div>
      </div>

      <div style={navScrollableRegionStyle}>
        {viewMode === "all" ? (
          <section style={navGroupStyle} aria-label="All cockpit apps list">
            <div style={allAppsHeaderStyle}>
              <span style={navGroupSummaryLabelStyle}>All cockpit apps</span>
              <span style={navGroupSummaryCountStyle}>{`${allWorkspaceItems.length} total`}</span>
            </div>
            <div style={navListStyle}>
              {allWorkspaceItems.map((item) => {
                const active = item.id === currentNavItemId;
                const tone = toneStyles[item.tone ?? "neutral"];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectWorkspace(item.id)}
                    title={item.helpTooltip ?? undefined}
                    style={{
                      ...allAppsNavButtonStyle,
                      ...(active ? activeAllAppsNavButtonStyle : null),
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
                    <span style={navButtonSubtitleStyle}>
                      {`${item.sectionLabel} - ${item.subtitle}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : navSections.map((section) => {
          const sectionActive = section.items.some((item) => item.id === activeWorkspaceId);
          const sectionExpanded = expandedSectionIds.includes(section.id);
          return (
            <section key={section.id} style={navGroupStyle}>
              <button
                type="button"
                aria-expanded={sectionExpanded}
                onClick={() => toggleNavSection(section.id)}
                style={navGroupSummaryStyle}
                title={section.detail}
              >
                <span style={navGroupSummaryLabelGroupStyle}>
                  <span style={navGroupSummaryLabelStyle}>{section.label}</span>
                  <span style={navGroupSummaryCountStyle}>{`${section.items.length} app${section.items.length === 1 ? "" : "s"}`}</span>
                </span>
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
  flex: "0 0 clamp(248px, 20vw, 356px)",
  alignSelf: "stretch",
  position: "relative",
  minWidth: 248,
  maxWidth: 356,
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
  gap: 10,
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
  fontSize: 12,
  lineHeight: 1.45,
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

const navSectionActionRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
} satisfies CSSProperties;

const navSectionActionButtonStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "4px 8px",
  background: "var(--app-panel-bg-alt)",
  color: "var(--app-text-color)",
  fontSize: 11,
  cursor: "pointer",
} satisfies CSSProperties;

const navSectionActionButtonActiveStyle = {
  borderColor: "var(--app-active-border)",
  background: "var(--app-active-bg)",
  boxShadow: "var(--app-active-shadow)",
} satisfies CSSProperties;

const navScrollableRegionStyle = {
  display: "grid",
  alignContent: "start",
  gap: 8,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: 4,
  scrollbarWidth: "thin",
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

const allAppsHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "9px 11px 7px",
  borderBottom: "1px solid var(--app-panel-border)",
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

const navGroupSummaryLabelGroupStyle = {
  display: "grid",
  gap: 2,
  minWidth: 0,
} satisfies CSSProperties;

const navGroupSummaryLabelStyle = {
  fontSize: 13,
  lineHeight: 1.15,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--app-subtle-color)",
  fontWeight: 800,
} satisfies CSSProperties;

const navGroupSummaryCountStyle = {
  fontSize: 10,
  lineHeight: 1.2,
  color: "var(--app-muted-color)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
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
  minHeight: 0,
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

const allAppsNavButtonStyle = {
  ...navButtonStyle,
  padding: "6px 9px",
  gap: 2,
  borderRadius: "calc(var(--app-panel-radius) - 6px)",
  boxShadow: "none",
} satisfies CSSProperties;

const activeAllAppsNavButtonStyle = {
  ...activeNavButtonStyle,
  boxShadow: "none",
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
  fontSize: 10,
  lineHeight: 1.25,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap" as const,
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
