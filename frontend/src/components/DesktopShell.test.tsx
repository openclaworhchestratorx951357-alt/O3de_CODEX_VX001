import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsProvider } from "../lib/settings/context";
import { createSettingsProfile, DEFAULT_ACCENT_COLOR } from "../lib/settings/defaults";
import { SETTINGS_PROFILE_STORAGE_KEY } from "../types/settings";
import DesktopShell from "./DesktopShell";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("DesktopShell", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.documentElement.style.colorScheme = "";
    vi.clearAllMocks();
  });

  it("renders workspace navigation and forwards selection events", () => {
    const onSelectWorkspace = vi.fn();

    const { container } = render(
      <DesktopShell
        appTitle="O3DE Agent Control App"
        appSubtitle="Desktop operator shell"
        workspaceTitle="Home"
        workspaceSubtitle="Overview and launch surface"
        activeWorkspaceId="home"
        navSections={[
          {
            id: "start",
            label: "Start",
            detail: "Begin with a calmer orientation surface.",
            items: [
              {
                id: "home",
                label: "Home",
                subtitle: "Overview and launch surface",
                badge: "2",
                tone: "info",
                helpTooltip: "Start here to orient the operator desktop.",
              },
            ],
          },
          {
            id: "inspect",
            label: "Inspect",
            detail: "Review persisted evidence and warnings.",
            items: [
              {
                id: "records",
                label: "Records",
                subtitle: "Runs, executions, artifacts",
                badge: "9",
                tone: "warning",
                helpTooltip: "Inspect persisted evidence and warnings.",
              },
            ],
          },
        ]}
        quickStats={[
          {
            label: "Approvals",
            value: "2",
            tone: "warning",
            helpTooltip: "Pending decisions still need review.",
          },
          {
            label: "Bridge",
            value: "fresh",
            tone: "success",
            helpTooltip: "Heartbeat is currently fresh.",
          },
        ]}
        utilityLabel="bridge live"
        utilityDetail="Heartbeat is fresh."
        onSelectWorkspace={onSelectWorkspace}
      >
        <div>Workspace body</div>
      </DesktopShell>,
    );

    const shellRoot = container.firstElementChild as HTMLElement;
    const workspaceCanvas = screen.getByText("Workspace body").parentElement as HTMLElement;

    expect(screen.getByText("Control surface")).toBeInTheDocument();
    expect(screen.getByText("Now open")).toBeInTheDocument();
    expect(screen.getAllByText("Start").length).toBeGreaterThan(0);
    const allAppsSubtitle = screen.getByText(/Inspect -/i);
    expect(allAppsSubtitle).toBeInTheDocument();
    expect(allAppsSubtitle).toHaveStyle("white-space: nowrap");
    expect(allAppsSubtitle).toHaveStyle("text-overflow: ellipsis");
    expect(screen.getByText("Active workspace")).toBeInTheDocument();
    expect(screen.getByText("Workspace body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand all workspace groups" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse to current workspace group" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /records/i })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Show all cockpit apps view" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Show grouped workspace tree view" }));
    fireEvent.click(screen.getByRole("button", { name: "Collapse to current workspace group" }));
    expect(screen.queryByRole("button", { name: /records/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all cockpit apps view" }));
    expect(screen.getByRole("button", { name: /records/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand all workspace groups" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Show grouped workspace tree view" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand all workspace groups" }));
    expect(screen.getByRole("button", { name: /records/i })).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /records/i }),
    ).toHaveAttribute("title", "Inspect persisted evidence and warnings.");
    expect(screen.getByText("Bridge: fresh")).toHaveAttribute("title", "Heartbeat is currently fresh.");
    expect(shellRoot).toHaveStyle("height: 100vh");
    expect(shellRoot).toHaveStyle("max-height: 100dvh");
    expect(shellRoot).toHaveStyle("overflow: hidden");
    expect(workspaceCanvas).toHaveStyle("padding-bottom: 72px");
    expect(workspaceCanvas).toHaveStyle("scroll-padding-bottom: 72px");

    const quickAccessInput = screen.getByRole("combobox", { name: "Quick access app explorer" });
    fireEvent.focus(quickAccessInput);
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    fireEvent.change(quickAccessInput, { target: { value: "record" } });
    expect(screen.getByRole("listbox", { name: "Quick access results" })).toBeInTheDocument();
    expect(screen.queryByText("Type a workspace, tool, or help topic. Use arrows and Enter to jump.")).not.toBeInTheDocument();
    expect(screen.queryByText("Inspect persisted evidence and warnings.")).not.toBeInTheDocument();
    fireEvent.change(quickAccessInput, { target: { value: "rds" } });
    expect(screen.getByRole("option", { name: /records/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /records/i }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("records");
    onSelectWorkspace.mockClear();

    fireEvent.change(quickAccessInput, { target: { value: "record" } });
    expect(screen.getByRole("listbox", { name: "Quick access results" })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox", { name: "Quick access results" })).not.toBeInTheDocument();

    fireEvent.focus(quickAccessInput);
    fireEvent.change(quickAccessInput, { target: { value: "home" } });
    fireEvent.keyDown(quickAccessInput, { key: "Enter" });
    expect(onSelectWorkspace).toHaveBeenCalledWith("home");
    onSelectWorkspace.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /records/i }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("records");

    fireEvent.click(screen.getByRole("button", { name: /call an agent/i }));
    const agentCallMenu = screen.getByRole("dialog", { name: "Agent call menu" });
    expect(agentCallMenu).toBeInTheDocument();
    expect(agentCallMenu.parentElement).toBe(document.body);
    expect(agentCallMenu).toHaveStyle("max-height: 662px");
    expect(agentCallMenu).toHaveStyle("overflow: hidden");
    expect(screen.getByText("Mission Control").parentElement?.parentElement).toHaveStyle("overflow-y: auto");
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog", { name: "Agent call menu" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /call an agent/i }));
    expect(screen.getByRole("dialog", { name: "Agent call menu" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start new chat" }));
    const agentChatDock = screen.getByRole("region", { name: "Agent chat dock" });
    expect(agentChatDock).toBeInTheDocument();
    expect(agentChatDock.parentElement).toBe(document.body);
    expect(agentChatDock).toHaveStyle("position: fixed");
    expect(agentChatDock).toHaveStyle("bottom: 18px");
    expect(screen.getByRole("button", { name: "Attach source" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send agent message" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("region", { name: "Agent chat dock" })).not.toBeInTheDocument();
  });

  it("hides the workspace tree when a standalone cockpit shell is active", () => {
    const onSelectWorkspace = vi.fn();

    render(
      <DesktopShell
        appTitle="O3DE Agent Control App"
        appSubtitle="Desktop operator shell"
        workspaceTitle="Create Game"
        workspaceSubtitle="Standalone cockpit shell"
        activeWorkspaceId="create-game"
        hideWorkspaceTree
        navSections={[
          {
            id: "start",
            label: "Start",
            detail: "Home shell",
            items: [
              {
                id: "home",
                label: "Home",
                subtitle: "Overview shell",
              },
            ],
          },
          {
            id: "create",
            label: "Create",
            detail: "Dedicated cockpit shells",
            items: [
              {
                id: "create-game",
                label: "Create Game",
                subtitle: "Standalone cockpit shell",
              },
              {
                id: "create-movie",
                label: "Create Movie",
                subtitle: "Standalone cockpit shell",
              },
            ],
          },
        ]}
        onSelectWorkspace={onSelectWorkspace}
      >
        <div>Standalone workspace body</div>
      </DesktopShell>,
    );

    expect(screen.queryByText("Control surface")).toBeNull();
    expect(screen.getByText("Standalone workspace body")).toBeInTheDocument();
    expect(screen.queryByText("Active workspace")).toBeNull();
    expect(screen.queryByLabelText("Workspaces workspace sections")).toBeNull();
    const quickAccessInput = screen.getByRole("combobox", { name: "Quick access app explorer" });
    fireEvent.focus(quickAccessInput);
    fireEvent.change(quickAccessInput, { target: { value: "home" } });
    fireEvent.keyDown(quickAccessInput, { key: "Enter" });
    expect(onSelectWorkspace).toHaveBeenCalledWith("home");
  });

  it("consumes saved shell settings for dark compact desktop layout", () => {
    window.localStorage.setItem(
      SETTINGS_PROFILE_STORAGE_KEY,
      JSON.stringify(createSettingsProfile({
        appearance: {
          themeMode: "dark",
          accentColor: DEFAULT_ACCENT_COLOR,
          density: "compact",
          contentMaxWidth: "focused",
          cardRadius: "rounded",
          reducedMotion: true,
          fontScale: 1,
        },
        layout: {
          preferredLandingSection: "home",
          workspaceTreeDefaultMode: "auto",
          showDesktopTelemetry: true,
          guidedMode: true,
          guidedTourCompleted: true,
        },
        operatorDefaults: {
          projectRoot: "",
          engineRoot: "",
          dryRun: true,
          timeoutSeconds: 30,
          locks: ["project_config"],
        },
      })),
    );

    const { container } = render(
      <SettingsProvider>
        <DesktopShell
          appTitle="O3DE Agent Control App"
          appSubtitle="Desktop operator shell"
          workspaceTitle="Runtime Console"
          workspaceSubtitle="Bridge status, executors, workspaces, and governance health."
          activeWorkspaceId="runtime"
          navSections={[
            {
              id: "start",
              label: "Start",
              detail: "Begin with the overview shell.",
              items: [
                {
                  id: "home",
                  label: "Home",
                  subtitle: "Overview and launch surface",
                },
              ],
            },
            {
              id: "operate",
              label: "Operate",
              detail: "Watch bridge status and workspace health.",
              items: [
                {
                  id: "runtime",
                  label: "Runtime",
                  subtitle: "Bridge status and workspace health",
                  badge: "live",
                  tone: "success",
                },
              ],
            },
          ]}
          quickStats={[
            {
              label: "Bridge",
              value: "fresh",
              tone: "success",
            },
          ]}
          utilityLabel="bridge live"
          utilityDetail="Heartbeat is fresh."
          onSelectWorkspace={vi.fn()}
        >
          <div>Runtime workspace body</div>
        </DesktopShell>
      </SettingsProvider>,
    );

    const providerRoot = container.firstElementChild as HTMLElement;
    const desktopSurface = screen.getByText("Control surface").closest("aside")?.parentElement as HTMLElement;

    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(screen.getByText("Runtime workspace body")).toBeInTheDocument();
    expect(providerRoot.getAttribute("style")).toContain("--app-shell-max-width: 1240px");
    expect(providerRoot.getAttribute("style")).toContain("--app-transition: none");
    expect(desktopSurface).toHaveStyle("padding-top: 18px");
    expect(desktopSurface).toHaveStyle("padding-right: 18px");
    expect(desktopSurface).toHaveStyle("padding-bottom: 76px");
    expect(desktopSurface).toHaveStyle("padding-left: 18px");
    expect(desktopSurface).toHaveStyle("width: 100%");
    expect(desktopSurface).toHaveStyle("overflow: hidden");
  });

  it("persists all-apps preference for the session and keeps all-app defaults on reset when auto mode resolves all-apps", () => {
    const onSelectWorkspace = vi.fn();
    const navSections = [
      {
        id: "start",
        label: "Start",
        detail: "Begin with a calmer orientation surface.",
        items: [
          {
            id: "home",
            label: "Home",
            subtitle: "Overview and launch surface",
          },
        ],
      },
      {
        id: "inspect",
        label: "Inspect",
        detail: "Review persisted evidence and warnings.",
        items: [
          {
            id: "records",
            label: "Records",
            subtitle: "Runs, executions, artifacts",
          },
        ],
      },
    ] as const;

    const firstRender = render(
      <DesktopShell
        appTitle="O3DE Agent Control App"
        appSubtitle="Desktop operator shell"
        workspaceTitle="Home"
        workspaceSubtitle="Overview and launch surface"
        activeWorkspaceId="home"
        navSections={navSections}
        onSelectWorkspace={onSelectWorkspace}
      >
        <div>Workspace body</div>
      </DesktopShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show all cockpit apps view" }));
    expect(screen.getByRole("button", { name: "Expand all workspace groups" })).toBeDisabled();
    firstRender.unmount();

    const secondRender = render(
      <DesktopShell
        appTitle="O3DE Agent Control App"
        appSubtitle="Desktop operator shell"
        workspaceTitle="Home"
        workspaceSubtitle="Overview and launch surface"
        activeWorkspaceId="home"
        navSections={navSections}
        onSelectWorkspace={onSelectWorkspace}
      >
        <div>Workspace body</div>
      </DesktopShell>,
    );

    expect(screen.getByRole("button", { name: "Expand all workspace groups" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Reset workspace tree defaults" }));
    expect(screen.getByRole("button", { name: "Expand all workspace groups" })).toBeDisabled();
    secondRender.unmount();

    render(
      <DesktopShell
        appTitle="O3DE Agent Control App"
        appSubtitle="Desktop operator shell"
        workspaceTitle="Home"
        workspaceSubtitle="Overview and launch surface"
        activeWorkspaceId="home"
        navSections={navSections}
        onSelectWorkspace={onSelectWorkspace}
      >
        <div>Workspace body</div>
      </DesktopShell>,
    );

    expect(screen.getByRole("button", { name: "Expand all workspace groups" })).toBeDisabled();
  });

  it("uses the settings-configured workspace tree default mode when no session override exists", () => {
    window.localStorage.setItem(
      SETTINGS_PROFILE_STORAGE_KEY,
      JSON.stringify(createSettingsProfile({
        appearance: {
          themeMode: "system",
          accentColor: DEFAULT_ACCENT_COLOR,
          density: "comfortable",
          contentMaxWidth: "wide",
          cardRadius: "rounded",
          reducedMotion: false,
          fontScale: 1,
        },
        layout: {
          preferredLandingSection: "home",
          workspaceTreeDefaultMode: "all",
          showDesktopTelemetry: true,
          guidedMode: true,
          guidedTourCompleted: true,
        },
        operatorDefaults: {
          projectRoot: "",
          engineRoot: "",
          dryRun: true,
          timeoutSeconds: 30,
          locks: ["project_config"],
        },
      })),
    );

    render(
      <SettingsProvider>
        <DesktopShell
          appTitle="O3DE Agent Control App"
          appSubtitle="Desktop operator shell"
          workspaceTitle="Home"
          workspaceSubtitle="Overview and launch surface"
          activeWorkspaceId="home"
          navSections={[
            {
              id: "start",
              label: "Start",
              detail: "Begin with a calmer orientation surface.",
              items: [
                {
                  id: "home",
                  label: "Home",
                  subtitle: "Overview and launch surface",
                },
              ],
            },
            {
              id: "inspect",
              label: "Inspect",
              detail: "Review persisted evidence and warnings.",
              items: [
                {
                  id: "records",
                  label: "Records",
                  subtitle: "Runs, executions, artifacts",
                },
              ],
            },
          ]}
          onSelectWorkspace={vi.fn()}
        >
          <div>Workspace body</div>
        </DesktopShell>
      </SettingsProvider>,
    );

    expect(screen.getByRole("button", { name: "Show all cockpit apps view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Expand all workspace groups" })).toBeDisabled();
  });

  it("defaults to all-apps mode on first run when viewport height is small and mode is auto", () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 680,
    });

    try {
      render(
        <DesktopShell
          appTitle="O3DE Agent Control App"
          appSubtitle="Desktop operator shell"
          workspaceTitle="Home"
          workspaceSubtitle="Overview and launch surface"
          activeWorkspaceId="home"
          navSections={[
            {
              id: "start",
              label: "Start",
              detail: "Begin with a calmer orientation surface.",
              items: [
                {
                  id: "home",
                  label: "Home",
                  subtitle: "Overview and launch surface",
                },
              ],
            },
            {
              id: "inspect",
              label: "Inspect",
              detail: "Review persisted evidence and warnings.",
              items: [
                {
                  id: "records",
                  label: "Records",
                  subtitle: "Runs, executions, artifacts",
                },
              ],
            },
          ]}
          onSelectWorkspace={vi.fn()}
        >
          <div>Workspace body</div>
        </DesktopShell>,
      );

      expect(screen.getByRole("button", { name: "Show all cockpit apps view" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Expand all workspace groups" })).toBeDisabled();
    } finally {
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
      });
    }
  });

  it("prefers all-apps mode for small-height auto layout even when grouped was persisted in session", () => {
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 680,
    });
    window.sessionStorage.setItem("o3de.app.workspaceTree.viewMode.v1", "grouped");

    try {
      render(
        <DesktopShell
          appTitle="O3DE Agent Control App"
          appSubtitle="Desktop operator shell"
          workspaceTitle="Home"
          workspaceSubtitle="Overview and launch surface"
          activeWorkspaceId="home"
          navSections={[
            {
              id: "start",
              label: "Start",
              detail: "Begin with a calmer orientation surface.",
              items: [
                {
                  id: "home",
                  label: "Home",
                  subtitle: "Overview and launch surface",
                },
              ],
            },
            {
              id: "inspect",
              label: "Inspect",
              detail: "Review persisted evidence and warnings.",
              items: [
                {
                  id: "records",
                  label: "Records",
                  subtitle: "Runs, executions, artifacts",
                },
              ],
            },
          ]}
          onSelectWorkspace={vi.fn()}
        >
          <div>Workspace body</div>
        </DesktopShell>,
      );

      expect(screen.getByRole("button", { name: "Show all cockpit apps view" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Expand all workspace groups" })).toBeDisabled();
    } finally {
      Object.defineProperty(window, "innerHeight", {
        configurable: true,
        value: originalInnerHeight,
      });
    }
  });
});
