import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";

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
  const shellRef = useRef<HTMLDivElement | null>(null);
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
  const hasQuery = normalizeSearchText(query).length > 0;
  const visibleEntries = hasQuery ? filteredEntries.slice(0, 8) : [];
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

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeIfOutside(target: EventTarget | null) {
      if (!shellRef.current || !target || shellRef.current.contains(target as Node)) {
        return;
      }

      setOpen(false);
      setHighlightedIndex(0);
    }

    function handleMouseDown(event: MouseEvent) {
      closeIfOutside(event.target);
    }

    function handleFocusIn(event: FocusEvent) {
      closeIfOutside(event.target);
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [open]);

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
    <div ref={shellRef} style={quickAccessShellStyle}>
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
          onFocus={() => {
            if (query.trim()) {
              setOpen(true);
            }
          }}
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
                  aria-label={`${entry.label} ${entry.sectionLabel}${active ? " open" : ""}`}
                  aria-selected={highlighted}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectEntry(entry)}
                  style={{
                    ...quickAccessResultButtonStyle,
                    ...(highlighted ? quickAccessResultHighlightedStyle : null),
                  }}
                >
                  <span style={quickAccessResultTextStyle}>
                    <strong style={quickAccessResultTitleStyle}>
                      {renderMatchedText(entry.label, query)}
                    </strong>
                    <span style={quickAccessResultSectionStyle}>{entry.sectionLabel}</span>
                    {active ? <span style={quickAccessActivePillStyle}>open</span> : null}
                  </span>
                </button>
              );
            })
          ) : (
            <>
              <div style={quickAccessEmptyStyle}>
                {hasQuery ? "No matches. Try runtime, builder, prompt, or guide." : "Type letters to find a workspace or command."}
              </div>
              <div style={{ ...quickAccessEmptyStyle, display: "none" }}>
              No matching app section. Try “runtime”, “builder”, “prompt”, or “guide”.
              </div>
            </>
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
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [...entries];
  }

  return entries
    .map((entry) => ({
      entry,
      score: scoreQuickAccessEntry(entry, normalizedQuery),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.entry.label.localeCompare(right.entry.label))
    .map(({ entry }) => entry);
}

function scoreQuickAccessEntry(entry: QuickAccessEntry, normalizedQuery: string) {
  const candidates = [
    { text: entry.label, weight: 100 },
    { text: entry.sectionLabel, weight: 70 },
    { text: entry.subtitle, weight: 42 },
    { text: entry.searchText, weight: 18 },
  ];

  return candidates.reduce((bestScore, candidate) => {
    const candidateScore = scoreOrderedMatch(candidate.text, normalizedQuery);
    if (candidateScore === null) {
      return bestScore;
    }

    return Math.max(bestScore, candidate.weight + candidateScore);
  }, 0);
}

function scoreOrderedMatch(text: string, normalizedQuery: string): number | null {
  const normalizedText = normalizeSearchText(text);
  const matchedIndexes = getOrderedMatchIndexes(normalizedText, normalizedQuery);
  if (!matchedIndexes) {
    return null;
  }

  const firstIndex = matchedIndexes[0] ?? 0;
  const lastIndex = matchedIndexes[matchedIndexes.length - 1] ?? firstIndex;
  const span = Math.max(lastIndex - firstIndex + 1, 1);
  const compactness = Math.max(0, 70 - (span - normalizedQuery.length) * 8);
  const earlyMatch = Math.max(0, 35 - firstIndex * 3);
  const prefixBonus = normalizedText.startsWith(normalizedQuery) ? 80 : 0;
  const substringBonus = normalizedText.includes(normalizedQuery) ? 45 : 0;

  return compactness + earlyMatch + prefixBonus + substringBonus;
}

function getOrderedMatchIndexes(normalizedText: string, normalizedQuery: string): number[] | null {
  const indexes: number[] = [];
  let cursor = 0;

  for (const queryCharacter of normalizedQuery) {
    const nextIndex = normalizedText.indexOf(queryCharacter, cursor);
    if (nextIndex === -1) {
      return null;
    }

    indexes.push(nextIndex);
    cursor = nextIndex + 1;
  }

  return indexes;
}

function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function renderMatchedText(text: string, query: string): ReactNode {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return text;
  }

  const matchedOriginalIndexes = getOrderedOriginalMatchIndexes(text, normalizedQuery);
  if (!matchedOriginalIndexes) {
    return text;
  }

  const matchedIndexSet = new Set(matchedOriginalIndexes);
  return Array.from(text).map((character, index) => (
    matchedIndexSet.has(index)
      ? <mark key={`${character}-${index}`} style={quickAccessMatchStyle}>{character}</mark>
      : <span key={`${character}-${index}`}>{character}</span>
  ));
}

function getOrderedOriginalMatchIndexes(text: string, normalizedQuery: string): number[] | null {
  const matches: number[] = [];
  let queryIndex = 0;

  Array.from(text).some((character, originalIndex) => {
    const normalizedCharacter = normalizeSearchText(character);
    if (!normalizedCharacter) {
      return false;
    }

    if (normalizedCharacter === normalizedQuery[queryIndex]) {
      matches.push(originalIndex);
      queryIndex += 1;
    }

    return queryIndex >= normalizedQuery.length;
  });

  return queryIndex >= normalizedQuery.length ? matches : null;
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
  boxShadow: "var(--app-shadow-soft)",
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
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  display: "grid",
  gap: 2,
  padding: 6,
  maxHeight: 260,
  overflowY: "auto",
  border: "1px solid var(--app-panel-border-strong)",
  borderRadius: "18px",
  background: "var(--app-panel-bg-alt)",
  boxShadow: "var(--app-shadow-strong)",
  backdropFilter: "blur(24px)",
} satisfies CSSProperties;

const quickAccessResultButtonStyle = {
  display: "block",
  width: "100%",
  border: "1px solid transparent",
  borderRadius: "12px",
  padding: "7px 9px",
  background: "transparent",
  color: "var(--app-text-color)",
  cursor: "pointer",
  textAlign: "left",
} satisfies CSSProperties;

const quickAccessResultHighlightedStyle = {
  border: "1px solid var(--app-active-border)",
  background: "var(--app-active-bg)",
  boxShadow: "var(--app-active-shadow)",
} satisfies CSSProperties;

const quickAccessResultTextStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  maxWidth: "100%",
  color: "var(--app-text-color)",
  fontSize: 13,
  whiteSpace: "nowrap",
} satisfies CSSProperties;

const quickAccessResultTitleStyle = {
  fontSize: 14,
  fontWeight: 900,
} satisfies CSSProperties;

const quickAccessResultSectionStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 800,
} satisfies CSSProperties;

const quickAccessActivePillStyle = {
  border: "1px solid var(--app-success-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "1px 6px",
  background: "var(--app-success-bg)",
  color: "var(--app-success-text)",
  fontSize: 9,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
} satisfies CSSProperties;

const quickAccessMatchStyle = {
  borderRadius: 4,
  padding: "0 1px",
  background: "var(--app-warning-bg)",
  color: "var(--app-warning-text)",
  fontWeight: 950,
} satisfies CSSProperties;

const quickAccessEmptyStyle = {
  padding: "12px 10px",
  color: "var(--app-muted-color)",
  fontSize: 12,
  lineHeight: 1.4,
} satisfies CSSProperties;
