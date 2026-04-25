# GUI Layout And Scroll Spec

This spec defines how the overhauled shell should use nested windows, panes, and scroll behavior professionally.

## Goal

Make the app feel structured, calm, and desktop-native without trapping users inside a maze of stacked panels and competing scrollbars.

## Core rule

Each workspace should have one obvious primary reading path and one obvious primary scroll container.

Nested scrolling is allowed only when the nested region is meaningfully different from the parent surface.

Good examples:

- a terminal/log viewer
- an artifact preview
- a long table or list
- a side inspector
- a code block or response payload panel

Bad examples:

- every card in a page getting its own scroll area
- a window scrolling inside a column that scrolls inside the page when all three are carrying the same content flow
- short content areas showing scrollbars just because a fixed height was applied indiscriminately

## Window hierarchy rules

Use a clear hierarchy with no more than three visual levels in normal operation:

1. workspace shell
2. top-level desktop windows
3. contained panes or inspectors where necessary

Avoid deeper default nesting unless the user explicitly expands into advanced tools.

## Recommended desktop composition

### Level 1: Workspace shell

This is the overall page or desktop workspace.

It should provide:

- the workspace title
- the main task context
- the primary navigation for that workspace
- the main scroll flow

### Level 2: Top-level windows

Use top-level windows to group major responsibilities, not every small subsection.

Good top-level windows:

- overview
- task queue / mission board
- worker details
- settings
- records / evidence

Do not create a separate top-level window for every tiny control cluster.

### Level 3: Inner panes

Inner panes are appropriate when the user needs parallel visibility inside one major window.

Good examples:

- list + detail
- form + live preview
- task summary + advanced controls
- selected record + evidence payload

## Scrollbar rules

### Primary rule

Prefer one page-level or workspace-level scrollbar for the main flow.

### Secondary rule

Use inner scrollbars only for surfaces that need fixed local context while the content inside them grows independently.

Examples:

- terminal output
- event timeline
- artifact JSON
- evidence command block
- large selectable list

### Avoid

- horizontal scrolling for standard form layouts
- vertical scrollbars on short cards
- nested scrollbars that activate at almost the same screen height
- containers that clip content without making it obvious that more is available

## Width and height guidance

- Avoid forcing tall fixed-height cards unless the content type truly benefits from it.
- Prefer `max-height` plus internal scrolling for logs, code, and evidence blocks.
- Prefer natural height for instructional cards, summaries, and forms.
- Use consistent window heights only when it improves scanability across sibling panes.

## Builder-specific guidance

The Builder workspace currently carries many major surfaces. In the overhaul:

- reduce the number of equal-weight top-level windows shown by default
- group related actions into a smaller number of stronger windows
- use inner panes for:
  - worker list + selected worker detail
  - task list + selected task detail
  - inbox list + selected guidance detail
- keep terminals and long logs in bounded inner panels with deliberate scrolling

## Home workspace guidance

Home should not feel like a wall of windows.

Prefer:

- a small set of high-confidence entry windows
- concise cards with natural height
- expandable details rather than permanently tall instructional panels

## Help panel guidance

Help surfaces should not create more scroll confusion.

- small help should open in lightweight popovers with no unnecessary scrollbar
- longer step-by-step help should use a side panel or modal with one clear scroll region
- do not put a scrolling help panel inside a scrolling card inside a scrolling page unless there is no better layout

## Visual cues

Users should be able to tell which surface is scrollable.

Use:

- subtle inset shadows or fade edges
- consistent padding near scroll boundaries
- stable sticky headers where useful
- clear pane borders and spacing

Do not rely on hidden overflow with no cue.

## Mobile and smaller screens

On smaller screens:

- collapse side-by-side panes into stacked sections
- reduce simultaneous visible windows
- keep one dominant scroll path
- move advanced inspectors into drawers or secondary routes

## Implementation rules for the overhaul

- Centralize window and pane sizing tokens.
- Reuse a small number of shell layout primitives.
- Add one shared pattern for:
  - list/detail panes
  - inspector drawers
  - bounded log/code panels
  - long-form help panels
- Review every workspace for accidental multi-scroll behavior before merge.

## Validation checklist

When reviewing a screen, ask:

1. What is the primary scroll container?
2. Are any inner scrollbars necessary?
3. Can the user tell which region scrolls?
4. Is there a simpler grouping that removes one nesting level?
5. Does the screen still feel stable on a laptop-height viewport?
