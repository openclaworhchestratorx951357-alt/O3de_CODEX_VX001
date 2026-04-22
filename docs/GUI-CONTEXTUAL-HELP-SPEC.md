# GUI Contextual Help Spec

This spec defines the beginner-friendly help system for the GUI overhaul.

## Goal

Help inexperienced users understand what they are looking at and what to do next without removing expert features.

## Core pattern

Every major workspace and high-risk control surface should support a clickable contextual help affordance.

Preferred affordance:

- a small circled `i` control near the related title, label, or action

Acceptable alternatives where space is tight:

- `How to use`
- `Help`
- `?`

The circled `i` pattern should remain visually consistent across the shell.

## What every help surface should contain

Each help surface should answer these four questions:

1. What is this?
2. When should I use it?
3. What is the safest next step?
4. What does a real example look like?

## Standard help content blocks

Each contextual help panel, popover, drawer, or modal should contain:

- `Purpose`
  - one plain-language sentence

- `Use this when`
  - short bullets describing the right situations

- `Step by step`
  - a numbered sequence for the common path

- `Example`
  - one concrete realistic example using the actual app vocabulary

- `Advanced notes`
  - optional, collapsed by default

## Recommended UX behavior

- Clicking the circled `i` opens a lightweight popover for simple surfaces.
- Complex surfaces should open a side panel or modal with the full step-by-step guide.
- Help should be dismissible with:
  - outside click
  - close button
  - `Escape`
- Help should never trap the user or block the whole app unless a full tutorial mode is intentional.
- The same pattern should work on desktop and mobile.

## Priority surfaces for the first implementation pass

1. Home workspace entry cards
2. Builder overview
3. Create worktree lane
4. Mission board
5. Worker lifecycle
6. Managed worker terminals
7. Builder autonomy inbox
8. O3DE operator proof/guide panels
9. Settings panels and major toggles

## Example help copy patterns

### Example: Create worktree lane

Purpose:
Create an isolated branch/worktree lane so a new Codex thread can work without colliding with other lanes.

Use this when:

- you want a separate branch for a new task
- you want to keep experiments isolated
- you do not want multiple threads editing the same checkout

Step by step:

1. Enter a worker id such as `builder-ui-01`.
2. Give it a display name that humans can recognize quickly.
3. Keep the recommended base branch unless you intentionally need another source branch.
4. Leave worktree path blank unless you need a custom location.
5. Click `Create worktree lane`.
6. After creation, select that worker and click `Sync worker lane`.
7. Copy the handoff package into the next Codex thread.

Example:
Use `builder-onboarding-01` to create a new lane for onboarding UI work while the main repo stays on the stable branch.

### Example: Mission board

Purpose:
Track shared tasks so threads can claim work, wait cleanly, and avoid duplicate edits.

Use this when:

- you are starting a new task
- you need to see whether someone else already owns a scope
- you need to release, complete, or supersede a task

Step by step:

1. Read the task list first.
2. Claim the task that matches your scope.
3. If another thread already owns the same scope, wait instead of duplicating work.
4. Send a heartbeat while the task is active.
5. Mark the task complete when your slice is done.

Example:
Before editing Builder navigation, claim the Builder shell task so another lane does not change the same files at the same time.

## Beginner mode alignment

The contextual help system should pair with beginner-safe presentation rules:

- show short help by default
- keep advanced notes collapsed
- offer `Show advanced details` instead of dumping everything immediately
- prefer verbs and examples over internal jargon

## Non-goals

- Do not replace real documentation with vague tooltip text.
- Do not hide admitted-real vs simulated truth behind simplified wording.
- Do not force experts through long tutorials on every visit.

## Implementation guidance

- Centralize help content so it can be updated consistently.
- Reuse a shared help-trigger component and shared help-panel primitives.
- Keep copy versioned in repo so UI changes and help text can evolve together.
- Add tests for:
  - open/close behavior
  - keyboard dismissal
  - outside click dismissal
  - presence of step-by-step content for priority surfaces
