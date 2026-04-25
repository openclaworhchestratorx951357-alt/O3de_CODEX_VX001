# GUI Overhaul Branch Map

> Post-promotion note: This branch map is historical. The GUI/control-plane
> integration stream was promoted to `main` in merge commit
> `9e3825dd9faa9bea3550afb14b19fb870b3cb0da`. New slices should branch from
> updated `main`; old GUI/integration branches are audit/rollback references
> unless explicitly reactivated.

This document defines the safe branch layout for a full GUI simplification pass while preserving the current feature-complete build.

## Why this overhaul exists

The current desktop shell is powerful, but it asks inexperienced users to parse too many expert surfaces at once.

Grounded repo observations:

- `frontend/src/App.tsx` mounts multiple desktop workspaces and high-density operator data flows at the shell level.
- `frontend/src/components/workspaces/HomeWorkspaceView.tsx` renders four top-level windows immediately.
- `frontend/src/components/workspaces/BuilderWorkspaceView.tsx` renders seven top-level windows immediately.
- `frontend/src/components/LayoutHeader.tsx` exposes a dense operator-state header with advanced lane context that is useful for experts but heavy for first-time users.

## Overhaul goal

Make the app feel approachable for inexperienced operators without removing features.

That means:

- keep every existing capability available
- reduce what is shown by default
- move expert controls behind progressive disclosure
- replace dense screen-scanning with guided task flows
- keep admitted-real vs simulated wording explicit

## Design principles

1. Progressive disclosure first.
Only show the next useful action by default. Advanced controls should live behind drawers, tabs, "More", or "Advanced" sections.

2. Task-first navigation.
The shell should answer "What do you want to do?" before it asks users to understand every subsystem.

3. Beginner-safe defaults.
New users should land on guided flows, not raw control-plane density.

4. Expert escape hatches stay intact.
No capability should be removed. Advanced users should still be able to reach the full mission-control surfaces.

5. Workspace reduction, not capability reduction.
The overhaul should simplify the entry path and grouping, not delete important operational tooling.

## Recommended target shell

The overhaul should move toward:

- a simpler home screen with clear "Start here" actions
- role/task cards such as "Launch O3DE work", "Run Builder tasks", "Review records", and "Inspect runtime state"
- guided flows/wizards for common operations
- clickable contextual help affordances, including small circled `i` controls beside major titles, forms, and actions
- professional nested-window composition with clear pane hierarchy instead of stacked visual clutter
- disciplined scrollbar behavior that avoids multiple competing scroll regions unless the nested surface truly needs one
- an "Advanced mode" or expandable panels for expert-only controls
- per-workspace summaries that lead with status, next action, and risk
- a calmer visual hierarchy with fewer equally prominent windows on first load

## Branch map

## Current local checkpoint

The current GUI stabilization stream now has a repo-recorded checkpoint and a
follow-on branch for the next narrow slice.

- checkpoint branch:
  `codex/control-plane/gui-stabilization-refactor`
  - checkpoint commit:
    `4399972`
  - purpose:
    preserve the accepted GUI stabilization state before the next control-plane
    UX slice
  - checkpoint scope:
    quick access outside-click close, compact header theme toggle restoration,
    agent call menu overlay stabilization, Home left-nav restore, O3DE planner
    `Open world` and sub-genre additions, App OS overlay anchoring, and App OS
    readability polish

- active follow-on branch:
  `codex/control-plane/app-os-review-evidence`
  - purpose:
    continue from the checkpoint on the next narrow App OS review/evidence,
    rollback-truth, and persisted audit-event slice without risking the fallback
    branch
  - handoff summary:
    this branch hardened the App OS review/evidence lane, added backend-aligned and persisted App OS audit/event surfaces, improved Records event inspection and recovery UX, and reduced the App/Home entry bundle by moving guide- and Home-heavy sections behind local lazy boundaries.
    branch proof is repeatable from the repo root with `pwsh -File .\scripts\dev.ps1 app-os-readiness`, which covers focused frontend tests, frontend build, and backend smoke including `python -m pytest backend/tests/test_api_routes.py backend/tests/test_app_control.py` with `47 passed`.
    this handoff does not claim full manual UI QA, broader O3DE execution expansion, or another frontend performance phase; the next higher-priority lane should be integration readiness or roadmap-native capability work rather than more App/Home bundle splitting.
  - integration note:
    the closest comparison base is `codex/control-plane/gui-stabilization-refactor`, because this branch was cut directly from that checkpoint and the committed ancestry still matches it.
    the broader eventual merge lane is `codex/control-plane/gui-overhaul-integration`, but that branch is materially farther away and will likely conflict in shared shell files such as `frontend/src/App.tsx`, `frontend/src/components/workspaces/HomeWorkspaceView.tsx`, `frontend/src/components/workspaces/RecordsWorkspaceDesktop.tsx`, and `docs/GUI-OVERHAUL-BRANCH-MAP.md`.
    the safest order is: commit and review this branch against the stabilization checkpoint first, accept `app-os-readiness` as the merge baseline, then do the broader integration merge as a separate step with conflict review.

### Safety baseline

- `codex/control-plane/gui-safe-baseline-2026-04-22`
  - frozen preservation branch for the current accepted working UI
  - use this when a known-good fallback is needed

### Historical integration branch

- `codex/control-plane/gui-overhaul-integration`
  - historical integration lane for the overhaul before promotion to `main`
  - keep as an audit/rollback reference unless explicitly reactivated

### Focused side branches

- `codex/control-plane/gui-overhaul-information-architecture`
  - redesign information grouping, entry points, naming, and workspace hierarchy

- `codex/control-plane/gui-overhaul-navigation-shell`
  - redesign shell navigation, desktop chrome, section switching, global layout, nested window hierarchy, and scrollbar behavior

- `codex/control-plane/gui-overhaul-guided-flows`
  - add beginner-friendly guided flows, "Start here" actions, quickstarts, and progressive disclosure

- `codex/control-plane/gui-overhaul-contextual-help`
  - add clickable step-by-step help, circled `i` affordances, example actions, and inline explanation patterns across the shell

- `codex/control-plane/gui-overhaul-workspace-simplification`
  - reduce default on-screen density inside Builder, Home, Operations, Runtime, and Records without deleting features

- `codex/control-plane/gui-overhaul-polish-validation`
  - final consistency pass, responsive cleanup, copy/tooltips, and test validation

## Suggested implementation order

1. Information architecture
2. Navigation shell
3. Guided flows
4. Contextual help system
5. Workspace simplification
6. Polish and validation
7. Open a focused PR back to `main` from a fresh `codex/<slice>` branch

## Guardrails

- Do not weaken backend or admitted-real truthfulness for the sake of a cleaner UI.
- Do not remove expert surfaces; hide or regroup them.
- Keep operator-facing language explicit where real vs simulated matters.
- Keep help text practical: every help surface should explain what this is, when to use it, a safe next step, and one concrete example.
- Do not create scrollbar soup. Favor one primary scroll container per workspace view and reserve nested scrolling for isolated lists, logs, inspectors, or code/artifact panels that genuinely need it.
- Prefer reusable shell patterns over one-off workspace rewrites.
- Validate desktop and mobile behavior before merging back to `main`.
