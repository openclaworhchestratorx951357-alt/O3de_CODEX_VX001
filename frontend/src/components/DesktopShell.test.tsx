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
    document.documentElement.style.colorScheme = "";
    vi.clearAllMocks();
  });

  it("renders workspace navigation and forwards selection events", () => {
    const onSelectWorkspace = vi.fn();

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

    expect(screen.getByText("Control surface")).toBeInTheDocument();
    expect(screen.getByText("Now open")).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("Inspect")).toBeInTheDocument();
    expect(screen.getByText("Active workspace")).toBeInTheDocument();
    expect(screen.getByText("Workspace body")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /records/i }),
    ).toHaveAttribute("title", "Inspect persisted evidence and warnings.");
    expect(screen.getByText("Bridge").closest("div")).toHaveAttribute("title", "Heartbeat is currently fresh.");

    fireEvent.click(screen.getByRole("button", { name: /records/i }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("records");
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
          showDesktopTelemetry: true,
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
    expect(desktopSurface).toHaveStyle("padding: 18px");
    expect(desktopSurface).toHaveStyle("width: min(100%, var(--app-shell-max-width))");
  });
});
