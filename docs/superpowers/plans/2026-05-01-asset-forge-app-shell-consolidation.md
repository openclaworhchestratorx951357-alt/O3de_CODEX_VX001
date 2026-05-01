# Asset Forge App Shell Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Asset Forge the visible application shell while preserving O3DE as the technical engine/service substrate and keeping all execution/mutation gates unchanged.

**Architecture:** This is a frontend shell consolidation packet. It updates the visible app identity, expands Asset Forge cockpit menus into organized workbench modules, and adds tests that prove navigation remains UI-only and no unsafe backend execution is introduced.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, existing `App.tsx`, `DesktopShell`, and `AssetForgeBlenderCockpit` components.

---

## Scope Boundaries

This plan implements only visible shell/navigation consolidation.

It does not add:

- provider generation
- real Blender execution
- Asset Processor execution
- O3DE project writes
- placement writes
- material or prefab mutation
- arbitrary shell, Python, or Editor script execution
- automatic prompt execution
- backend dispatch from menu clicks

## File Structure

- Modify `frontend/src/content/operatorGuideShell.ts`
  - Owns current app title/subtitle strings used by the shell.
  - Change visible identity from "O3DE Agent Control App" to "Asset Forge".

- Modify `frontend/src/components/desktopShell/types.ts`
  - Add optional `startBadgeLabel?: string` so the shell badge can say `AF`.

- Modify `frontend/src/components/DesktopShell.tsx`
  - Render the configurable start badge label.
  - Keep existing shell behavior and workspace children unchanged.

- Modify `frontend/src/App.tsx`
  - Pass Asset Forge shell identity into `DesktopShell`.
  - Keep `activeWorkspaceId === "asset-forge"` full-screen special case.
  - Keep O3DE wording in technical detail rows, runtime diagnostics, and readiness/evidence surfaces.

- Modify `frontend/src/components/assetForge/AssetForgeBlenderCockpit.tsx`
  - Expand top menu groups into organized Asset Forge workbench menus.
  - Preserve existing editor menu groups from backend/static model.
  - Make new menu actions route or switch local UI state only.

- Modify `frontend/src/components/assetForge/AssetForgeBlenderCockpit.test.tsx`
  - Add workbench menu tests for Create, Project, Prompt, Engine, Records, and Safety menus.
  - Assert callbacks fire only for navigation/read-only routes.
  - Assert blocked/processor/generation actions explain status and do not call mutation-style callbacks.

- Modify `frontend/src/App.test.tsx`
  - Update home-shell tests to expect Asset Forge as visible shell identity.
  - Add coverage that old "O3DE Agent Control App" title is not the primary visible app title.
  - Verify major modules are reachable from Asset Forge menus.

- Modify `frontend/src/App.desktop-hydration.test.tsx` only if existing text expectations rely on the old app title.

## Task 1: Product Shell Identity Test

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing product identity assertion**

In the existing test `uses Asset Forge as the app home shell and exposes built-in app navigation`, add assertions after `forgePanel` is found:

```tsx
expect(screen.getAllByText("Asset Forge").length).toBeGreaterThan(0);
expect(screen.queryByText("O3DE Agent Control App")).not.toBeInTheDocument();
expect(screen.queryByText("Windows-style control-plane workspace for O3DE operators")).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "uses Asset Forge as the app home shell"
```

Expected: FAIL because the current app header still renders `O3DE Agent Control App`.

- [ ] **Step 3: Keep the failing test staged only after implementation exists**

Do not commit a red test. Leave it unstaged until Task 3 turns it green.

## Task 2: Asset Forge Workbench Menu Tests

**Files:**
- Modify: `frontend/src/components/assetForge/AssetForgeBlenderCockpit.test.tsx`

- [ ] **Step 1: Replace the old App-only navigation test with grouped menu coverage**

Update the test named `renders an app navigation menu that routes to existing workspaces without mutation` to this structure:

```tsx
it("renders Asset Forge workbench menus that route to existing modules without mutation", () => {
  const callbacks = {
    onOpenHome: vi.fn(),
    onOpenCreateGame: vi.fn(),
    onOpenCreateMovie: vi.fn(),
    onOpenLoadProject: vi.fn(),
    onOpenPromptStudio: vi.fn(),
    onOpenBuilder: vi.fn(),
    onOpenOperations: vi.fn(),
    onOpenRuntimeOverview: vi.fn(),
    onOpenRecords: vi.fn(),
    onLaunchPlacementProofTemplate: vi.fn(),
  };

  render(<AssetForgeBlenderCockpit {...callbacks} />);

  const topMenu = screen.getByLabelText("Asset Forge top menu");

  ["App", "Create", "Project", "Prompt", "Engine", "Records", "Safety"].forEach((label) => {
    expect(within(topMenu).getByRole("button", { name: label })).toBeInTheDocument();
  });

  fireEvent.click(within(topMenu).getByRole("button", { name: "Create" }));
  const createMenu = screen.getByRole("menu", { name: "Create menu" });
  expect(within(createMenu).getByRole("menuitem", { name: /Game/i })).toBeInTheDocument();
  expect(within(createMenu).getByRole("menuitem", { name: /Movie/i })).toBeInTheDocument();
  expect(within(createMenu).getByRole("menuitem", { name: /Generate Asset/i })).toBeInTheDocument();

  fireEvent.click(within(createMenu).getByRole("menuitem", { name: /Game/i }));
  expect(callbacks.onOpenCreateGame).toHaveBeenCalledTimes(1);
  expect(callbacks.onLaunchPlacementProofTemplate).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent(/Opened Create Game from Asset Forge/i);

  fireEvent.click(within(topMenu).getByRole("button", { name: "Engine" }));
  const engineMenu = screen.getByRole("menu", { name: "Engine menu" });
  expect(within(engineMenu).getByRole("menuitem", { name: /Runtime Overview/i })).toBeInTheDocument();
  expect(within(engineMenu).getByRole("menuitem", { name: /Asset Processor Status/i })).toBeInTheDocument();

  fireEvent.click(within(engineMenu).getByRole("menuitem", { name: /Asset Processor Status/i }));
  expect(callbacks.onOpenRuntimeOverview).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toHaveTextContent(/Asset Processor status is preflight\/status only/i);
  expect(screen.getByRole("tab", { name: "Safety" })).toHaveAttribute("aria-pressed", "true");
});
```

- [ ] **Step 2: Run the focused cockpit test and verify it fails**

Run:

```powershell
cd frontend
npm test -- --run src/components/assetForge/AssetForgeBlenderCockpit.test.tsx -t "workbench menus"
```

Expected: FAIL because the Create, Project, Prompt, Engine, Records, and Safety shell menus do not exist yet.

## Task 3: Update Visible App Identity

**Files:**
- Modify: `frontend/src/content/operatorGuideShell.ts`
- Modify: `frontend/src/components/desktopShell/types.ts`
- Modify: `frontend/src/components/DesktopShell.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update shell title and subtitle copy**

In `frontend/src/content/operatorGuideShell.ts`, change `operatorGuideShellApp` to:

```ts
  title: "Asset Forge",
  subtitle: "O3DE-native creation workbench with engine services, evidence, and gated tool workflows",
```

When applying this change, edit only the `title` and `subtitle` values. Do not rewrite the existing `navSections` or `quickStats` arrays.

- [ ] **Step 2: Add configurable desktop badge type**

In `frontend/src/components/desktopShell/types.ts`, add this optional prop to `DesktopShellProps`:

```ts
  startBadgeLabel?: string;
```

Place it after `appSubtitle: string;`.

- [ ] **Step 3: Render the configurable badge**

In `frontend/src/components/DesktopShell.tsx`, destructure the new prop:

```tsx
  startBadgeLabel = "AF",
```

Place it after `appSubtitle,`.

Change the hardcoded badge:

```tsx
<div style={startBadgeStyle}>{startBadgeLabel}</div>
```

- [ ] **Step 4: Pass the Asset Forge badge from App**

In `frontend/src/App.tsx`, update the `DesktopShell` call:

```tsx
<DesktopShell
  appTitle={operatorGuideShellApp.title}
  appSubtitle={operatorGuideShellApp.subtitle}
  startBadgeLabel="AF"
  workspaceTitle={activeWorkspaceMeta.title}
  workspaceSubtitle={activeWorkspaceMeta.subtitle}
```

- [ ] **Step 5: Keep Asset Forge full-screen header using the same title**

No separate title constant is needed. The existing full-screen Asset Forge branch already uses `operatorGuideShellApp.title` and `operatorGuideShellApp.subtitle`. Confirm those values now render as Asset Forge.

- [ ] **Step 6: Run the focused App identity test**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "uses Asset Forge as the app home shell"
```

Expected: PASS.

## Task 4: Add Asset Forge Workbench Menu Groups

**Files:**
- Modify: `frontend/src/components/assetForge/AssetForgeBlenderCockpit.tsx`

- [ ] **Step 1: Replace `appShellMenuGroup` with grouped shell menus**

Replace the current `const appShellMenuGroup: MenuGroup = { ... }` with:

```ts
const assetForgeShellMenuGroups: MenuGroup[] = [
  {
    id: "app",
    label: "App",
    items: [
      {
        id: "app-home",
        label: "Home / Start",
        tone: "read-only",
        action: "open-workspace-home",
        status: "Opened Home from Asset Forge shell navigation only.",
      },
    ],
  },
  {
    id: "create",
    label: "Create",
    items: [
      {
        id: "create-game",
        label: "Game",
        tone: "plan-only",
        action: "open-workspace-create-game",
        status: "Opened Create Game from Asset Forge workbench navigation only.",
      },
      {
        id: "create-movie",
        label: "Movie",
        tone: "plan-only",
        action: "open-workspace-create-movie",
        status: "Opened Create Movie from Asset Forge workbench navigation only.",
      },
      {
        id: "create-generate-asset",
        label: "Generate Asset",
        tone: "blocked",
        action: "blocked",
        status: "Provider generation is blocked. Use Prompt Studio planning or proof-only templates until generation is separately admitted.",
      },
    ],
  },
  {
    id: "project",
    label: "Project",
    items: [
      {
        id: "project-load",
        label: "Load Project",
        tone: "read-only",
        action: "open-workspace-load-project",
        status: "Opened Load Project from Asset Forge workbench navigation only. No project file write occurred.",
      },
      {
        id: "project-status",
        label: "Project / Bridge Status",
        tone: "read-only",
        action: "safety-tab",
        status: "Project and bridge status are shown as read-only safety context.",
      },
    ],
  },
  {
    id: "prompt",
    label: "Prompt",
    items: [
      {
        id: "prompt-studio",
        label: "Prompt Studio",
        tone: "read-only",
        action: "open-prompt-studio",
        status: "Opened Prompt Studio from Asset Forge workbench navigation only. No prompt auto-executes.",
      },
      {
        id: "prompt-inspect",
        label: "Inspect Candidate Template",
        tone: "read-only",
        action: "select-template-inspect-candidate",
        status: "Inspect candidate template selected for preview only.",
      },
      {
        id: "prompt-proof",
        label: "Placement Proof-Only Template",
        tone: "proof-only",
        action: "select-template-placement-proof-only",
        status: "Placement proof-only template selected. No placement write is admitted.",
      },
    ],
  },
  {
    id: "engine",
    label: "Engine",
    items: [
      {
        id: "engine-runtime",
        label: "Runtime Overview",
        tone: "read-only",
        action: "open-workspace-runtime",
        status: "Opened Runtime Overview from Asset Forge workbench navigation only.",
      },
      {
        id: "engine-asset-processor",
        label: "Asset Processor Status",
        tone: "preflight-only",
        action: "safety-tab",
        status: "Asset Processor status is preflight/status only. Asset Processor execution is not admitted.",
      },
      {
        id: "engine-o3de-mutation",
        label: "O3DE Mutation Gates",
        tone: "blocked",
        action: "safety-tab",
        status: "O3DE project, level, material, prefab, and placement mutation remain blocked without a separate admission packet.",
      },
    ],
  },
  {
    id: "records",
    label: "Records",
    items: [
      {
        id: "records-evidence",
        label: "Evidence Explorer",
        tone: "read-only",
        action: "open-records",
        status: "Opened Records from Asset Forge workbench navigation only.",
      },
      {
        id: "records-latest-run",
        label: "Latest Run",
        tone: "read-only",
        action: "view-run",
        status: "Latest run opened as read-only evidence.",
      },
      {
        id: "records-latest-artifact",
        label: "Latest Artifact",
        tone: "read-only",
        action: "view-artifact",
        status: "Latest artifact opened as read-only evidence.",
      },
    ],
  },
  {
    id: "safety",
    label: "Safety",
    items: [
      {
        id: "safety-gates",
        label: "Admission Gates",
        tone: "read-only",
        action: "safety-tab",
        status: "Safety gates shown. Execution and mutation flags remain false for this shell packet.",
      },
      {
        id: "safety-blocked",
        label: "Blocked Capabilities",
        tone: "blocked",
        action: "safety-tab",
        status: "Blocked capabilities shown with next-unlock guidance.",
      },
    ],
  },
];
```

- [ ] **Step 2: Update the menu merge**

Change:

```ts
const editorMenuGroups = useMemo(() => [appShellMenuGroup, ...getMenuGroups(editorModel)], [editorModel]);
```

to:

```ts
const editorMenuGroups = useMemo(
  () => [...assetForgeShellMenuGroups, ...getMenuGroups(editorModel)],
  [editorModel],
);
```

- [ ] **Step 3: Preserve all existing menu action handlers**

Do not add new execution actions. Reuse existing `open-workspace-*`, `open-prompt-studio`, `open-records`, `view-*`, `select-template-*`, and `safety-tab` handling.

- [ ] **Step 4: Run the focused cockpit menu test**

Run:

```powershell
cd frontend
npm test -- --run src/components/assetForge/AssetForgeBlenderCockpit.test.tsx -t "workbench menus"
```

Expected: PASS.

## Task 5: App-Level Route Coverage Through Asset Forge Menus

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Expand the app home-shell routing test**

In `uses Asset Forge as the app home shell and exposes built-in app navigation`, after opening `topMenu`, replace the App-menu-only checks with grouped menu route checks:

```tsx
fireEvent.click(within(topMenu).getByRole("button", { name: "Create" }));
const createMenu = screen.getByRole("menu", { name: "Create menu" });
fireEvent.click(within(createMenu).getByRole("menuitem", { name: /Game/i }));
expect((await screen.findAllByText("Create Game Cockpit")).length).toBeGreaterThan(0);

fireEvent.click(getDesktopNavButton(/Asset Forge/i));
const reopenedForgePanel = await screen.findByLabelText("AI Asset Forge");
const reopenedTopMenu = within(reopenedForgePanel).getByLabelText("Asset Forge top menu");

fireEvent.click(within(reopenedTopMenu).getByRole("button", { name: "Prompt" }));
const promptMenu = screen.getByRole("menu", { name: "Prompt menu" });
fireEvent.click(within(promptMenu).getByRole("menuitem", { name: /Prompt Studio/i }));
expect(await screen.findByText("PromptWorkspaceDesktop stub")).toBeInTheDocument();
```

- [ ] **Step 2: Add read-only Records and Runtime coverage**

Continue the same test with:

```tsx
fireEvent.click(getDesktopNavButton(/Asset Forge/i));
const forgeForEngine = await screen.findByLabelText("AI Asset Forge");
const engineTopMenu = within(forgeForEngine).getByLabelText("Asset Forge top menu");

fireEvent.click(within(engineTopMenu).getByRole("button", { name: "Engine" }));
const engineMenu = screen.getByRole("menu", { name: "Engine menu" });
fireEvent.click(within(engineMenu).getByRole("menuitem", { name: /Runtime Overview/i }));
expect(await screen.findByText("RuntimeWorkspaceDesktop stub")).toBeInTheDocument();

fireEvent.click(getDesktopNavButton(/Asset Forge/i));
const forgeForRecords = await screen.findByLabelText("AI Asset Forge");
const recordsTopMenu = within(forgeForRecords).getByLabelText("Asset Forge top menu");

fireEvent.click(within(recordsTopMenu).getByRole("button", { name: "Records" }));
const recordsMenu = screen.getByRole("menu", { name: "Records menu" });
fireEvent.click(within(recordsMenu).getByRole("menuitem", { name: /Evidence Explorer/i }));
expect(await screen.findByText("RecordsWorkspaceDesktop stub")).toBeInTheDocument();
```

- [ ] **Step 3: Run the app test**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "uses Asset Forge as the app home shell"
```

Expected: PASS.

## Task 6: Hydration Text Expectation Cleanup

**Files:**
- Modify: `frontend/src/App.desktop-hydration.test.tsx` only if failing

- [ ] **Step 1: Run hydration tests**

Run:

```powershell
cd frontend
npm test -- --run src/App.desktop-hydration.test.tsx
```

Expected: PASS.

- [ ] **Step 2: If old title expectations fail, update them to Asset Forge**

Use the same rule as App tests:

```tsx
expect(screen.queryByText("O3DE Agent Control App")).not.toBeInTheDocument();
expect(screen.getAllByText("Asset Forge").length).toBeGreaterThan(0);
```

Only make this edit if the focused hydration test reports a real old-title expectation failure.

## Task 7: Full Verification

**Files:**
- No new files

- [ ] **Step 1: Run frontend build**

Run:

```powershell
cd frontend
npm run build
```

Expected: exit code `0`. Vite large-chunk warnings are acceptable if no errors occur.

- [ ] **Step 2: Run full frontend tests**

Run:

```powershell
cd frontend
npm test -- --run
```

Expected: all test files pass.

- [ ] **Step 3: Run diff hygiene**

Run from repo root:

```powershell
git diff --check
```

Expected: exit code `0`. Line-ending warnings are acceptable if there are no whitespace errors.

## Task 8: Commit and Push

**Files:**
- Stage only intended frontend files:
  - `frontend/src/content/operatorGuideShell.ts`
  - `frontend/src/components/desktopShell/types.ts`
  - `frontend/src/components/DesktopShell.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/App.test.tsx`
  - `frontend/src/App.desktop-hydration.test.tsx` if changed
  - `frontend/src/components/assetForge/AssetForgeBlenderCockpit.tsx`
  - `frontend/src/components/assetForge/AssetForgeBlenderCockpit.test.tsx`

- [ ] **Step 1: Inspect status**

Run:

```powershell
git status --short
```

Expected: only intended frontend files are modified. Untracked local helper/scratch files may remain untracked and must not be staged.

- [ ] **Step 2: Stage intended files**

Run:

```powershell
git add frontend/src/content/operatorGuideShell.ts frontend/src/components/desktopShell/types.ts frontend/src/components/DesktopShell.tsx frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/components/assetForge/AssetForgeBlenderCockpit.tsx frontend/src/components/assetForge/AssetForgeBlenderCockpit.test.tsx
```

If `frontend/src/App.desktop-hydration.test.tsx` changed, also run:

```powershell
git add frontend/src/App.desktop-hydration.test.tsx
```

- [ ] **Step 3: Check staged diff**

Run:

```powershell
git diff --cached --stat
git diff --cached --check
```

Expected: only intended frontend files are staged; no whitespace errors.

- [ ] **Step 4: Commit**

Run:

```powershell
git commit -m "Consolidate Asset Forge app shell"
```

- [ ] **Step 5: Push**

Run:

```powershell
git push -u origin HEAD
```

## Task 9: Required Closeout

**Files:**
- No tracked files unless the slice log helper is tracked in the future

- [ ] **Step 1: Append completion slice log**

Run:

```powershell
$commitSha = git rev-parse --short HEAD
.\scripts\Add-Codex-Slice-Log.ps1 "COMPLETE - Asset Forge app shell consolidation: visible shell identity and workbench menus updated; O3DE remains technical substrate; no execution or mutation admission; frontend build/tests/diff-check passed; commit $commitSha pushed." -PassThru
```

- [ ] **Step 2: Final report**

Include:

- branch and commit
- files changed
- validation commands and results
- capability/runtime behavior changed: no
- execution/mutation introduced: no
- dependency/bootstrap actions: none
- exact completion slice-log line
- revert path using the actual implementation commit, for example `git revert d86dc01`
