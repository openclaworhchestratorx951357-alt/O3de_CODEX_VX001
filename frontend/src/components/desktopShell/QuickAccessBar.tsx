import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import type { DesktopShellNavSection } from "./types";

type QuickAccessBarProps = {
  activeWorkspaceId: string;
  navSections: readonly DesktopShellNavSection[];
  onSelectWorkspace: (workspaceId: string) => void;
};

type QuickAccessEntry = {
  id: string;
  label: string;
  subtitle: string;
  sectionLabel: string;
  helpText: string;
  searchText: string;
};

export default function QuickAccessBar({
  activeWorkspaceId,
  navSections,
  onSelectWorkspace,
}: QuickAccessBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const entries = useMemo(
    () => buildQuickAccessEntries(navSections),
    [navSections],
  );
  const activeEntry = entries.find((entry) => entry.id === activeWorkspaceId);
  const filteredEntries = useMemo(
    () => filterQuickAccessEntries(entries, query),
    [entries, query],
  );
  const visibleEntries = filteredEntries.slice(0, 8);
  const activeDescendantId = open && visibleEntries[highlightedIndex]
    ? `quick-access-option-${visibleEntries[highlightedIndex].id}`
    : undefined;

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") {
        return;
      }

      event.preventDefault();
      setOpen(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    }

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  function selectEntry(entry: QuickAccessEntry) {
    onSelectWorkspace(entry.id);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) => Math.min(current + 1, Math.max(visibleEntries.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      const selectedEntry = visibleEntries[highlightedIndex] ?? visibleEntries[0];
      if (selectedEntry) {
        event.preventDefault();
        selectEntry(selectedEntry);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div style={quickAccessShellStyle}>
      <label style={quickAccessLabelStyle}>
        <span style={quickAccessIconStyle} aria-hidden="true">{"\u2318"}</span>
        <input
          ref={inputRef}
          role="combobox"
          aria-label="Quick access app explorer"
          aria-expanded={open}
          aria-controls="quick-access-results"
          aria-activedescendant={activeDescendantId}
          autoComplete="off"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={activeEntry ? `Go to ${activeEntry.label} or type a command...` : "Search app workspaces, help, and tools..."}
          style={quickAccessInputStyle}
        />
        <span style={quickAccessShortcutStyle}>Ctrl K</span>
      </label>

      {open ? (
        <div
          id="quick-access-results"
          role="listbox"
          aria-label="Quick access results"
          style={quickAccessResultsStyle}
        >
          <div style={quickAccessHelpStyle}>
            Type a workspace, tool, or help topic. Use arrows and Enter to jump.
          </div>
          {visibleEntries.length ? (
            visibleEntries.map((entry, index) => {
              const highlighted = index === highlightedIndex;
              const active = entry.id === activeWorkspaceId;
              return (
                <button
                  key={entry.id}
                  id={`quick-access-option-${entry.id}`}
                  type="button"
                  role="option"
                  aria-selected={highlighted}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectEntry(entry)}
                  style={{
                    ...quickAccessResultButtonStyle,
                    ...(highlighted ? quickAccessResultHighlightedStyle : null),
                  }}
                >
                  <span style={quickAccessResultSectionStyle}>{entry.sectionLabel}</span>
                  <strong style={quickAccessResultTitleStyle}>
                    {entry.label}
                    {active ? <span style={quickAccessActivePillStyle}>open</span> : null}
                  </strong>
                  <span style={quickAccessResultSubtitleStyle}>{entry.subtitle}</span>
                  <span style={quickAccessResultHelpStyle}>{entry.helpText}</span>
                </button>
              );
            })
          ) : (
            <div style={quickAccessEmptyStyle}>
              No matching app section. Try “runtime”, “builder”, “prompt”, or “guide”.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function buildQuickAccessEntries(navSections: readonly DesktopShellNavSection[]): QuickAccessEntry[] {
  return navSections.flatMap((section) => section.items.map((item) => {
    const helpText = item.helpTooltip || section.detail;
    const searchText = [
      section.label,
      section.detail,
      item.label,
      item.subtitle,
      item.badge ?? "",
      helpText,
      ...(section.keywords ?? []),
      ...(item.keywords ?? []),
    ].join(" ").toLowerCase();

    return {
      id: item.id,
      label: item.label,
      subtitle: item.subtitle,
      sectionLabel: section.label,
      helpText,
      searchText,
    };
  }));
}

function filterQuickAccessEntries(entries: readonly QuickAccessEntry[], query: string): QuickAccessEntry[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return [...entries];
  }

  return entries
    .map((entry) => ({
      entry,
      score: scoreQuickAccessEntry(entry, terms),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.entry.label.localeCompare(right.entry.label))
    .map(({ entry }) => entry);
}

function scoreQuickAccessEntry(entry: QuickAccessEntry, terms: readonly string[]) {
  return terms.reduce((score, term) => {
    if (entry.label.toLowerCase().startsWith(term)) {
      return score + 12;
    }
    if (entry.sectionLabel.toLowerCase().startsWith(term)) {
      return score + 8;
    }
    if (entry.searchText.includes(term)) {
      return score + 3;
    }
    return score - 100;
  }, 0);
}

const quickAccessShellStyle = {
  position: "relative",
  minWidth: 260,
  width: "100%",
  maxWidth: 620,
  justifySelf: "center",
  zIndex: 12,
} satisfies CSSProperties;

const quickAccessLabelStyle = {
  display: "grid",
  gridTemplateColumns: "auto minmax(0, 1fr) auto",
  alignItems: "center",
  gap: 8,
  width: "100%",
  border: "1px solid var(--app-panel-border-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "6px 10px",
  background: "var(--app-input-bg)",
  boxShadow: "var(--app-input-shadow)",
  boxSizing: "border-box",
} satisfies CSSProperties;

const quickAccessIconStyle = {
  color: "var(--app-muted-color)",
  fontSize: 13,
  fontWeight: 900,
} satisfies CSSProperties;

const quickAccessInputStyle = {
  minWidth: 0,
  width: "100%",
  border: 0,
  background: "transparent",
  color: "var(--app-text-color)",
  outline: "none",
  font: "inherit",
  fontSize: 13,
} satisfies CSSProperties;

const quickAccessShortcutStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "3px 7px",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-muted-color)",
  fontSize: 11,
  fontWeight: 800,
  whiteSpace: "nowrap",
} satisfies CSSProperties;

const quickAccessResultsStyle = {
  position: "absolute",
  top: "calc(100% + 10px)",
  left: 0,
  right: 0,
  display: "grid",
  gap: 6,
  padding: 10,
  border: "1px solid var(--app-panel-border-strong)",
  borderRadius: "var(--app-window-radius)",
  background: "var(--app-panel-bg-alt)",
  boxShadow: "var(--app-shadow-strong)",
  backdropFilter: "blur(24px)",
} satisfies CSSProperties;

const quickAccessHelpStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: "8px 10px",
  background: "var(--app-panel-bg-muted)",
  color: "var(--app-muted-color)",
  fontSize: 12,
  lineHeight: 1.35,
} satisfies CSSProperties;

const quickAccessResultButtonStyle = {
  display: "grid",
  gap: 3,
  width: "100%",
  border: "1px solid transparent",
  borderRadius: "var(--app-panel-radius)",
  padding: "10px 11px",
  background: "transparent",
  color: "var(--app-text-color)",
  cursor: "pointer",
  textAlign: "left",
} satisfies CSSProperties;

const quickAccessResultHighlightedStyle = {
  borderColor: "var(--app-accent-strong)",
  background: "linear-gradient(145deg, var(--app-accent-soft), var(--app-panel-bg-muted))",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const quickAccessResultSectionStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} satisfies CSSProperties;

const quickAccessResultTitleStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
} satisfies CSSProperties;

const quickAccessActivePillStyle = {
  border: "1px solid var(--app-success-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "2px 7px",
  background: "var(--app-success-bg)",
  color: "var(--app-success-text)",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
} satisfies CSSProperties;

const quickAccessResultSubtitleStyle = {
  color: "var(--app-muted-color)",
  fontSize: 12,
  lineHeight: 1.35,
} satisfies CSSProperties;

const quickAccessResultHelpStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  lineHeight: 1.35,
} satisfies CSSProperties;

const quickAccessEmptyStyle = {
  padding: "12px 10px",
  color: "var(--app-muted-color)",
  fontSize: 12,
  lineHeight: 1.4,
} satisfies CSSProperties;
