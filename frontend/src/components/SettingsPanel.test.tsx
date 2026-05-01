import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsProvider } from "../lib/settings/context";
import { createDefaultSettings, createSettingsProfile } from "../lib/settings/defaults";
import SettingsPanel from "./SettingsPanel";
import { SETTINGS_PROFILE_STORAGE_KEY } from "../types/settings";
import { COCKPIT_LAYOUT_RESET_EVENT } from "./cockpits/cockpitLayoutStore";

const COCKPIT_LAYOUT_STORAGE_KEY = "o3de.appos.cockpit-layouts.v1";

describe("SettingsPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows a visible quick theme toggle and saves the selected mode immediately", () => {
    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    );

    const darkButton = screen.getByRole("button", { name: "Dark" });
    const systemButton = screen.getByRole("button", { name: "System" });

    expect(systemButton).toHaveAttribute("aria-pressed", "true");
    expect(darkButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(darkButton);

    expect(darkButton).toHaveAttribute("aria-pressed", "true");
    expect(systemButton).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain('"themeMode":"dark"');
  });

  it("shows a visible quick guidance toggle and saves the selected mode immediately", () => {
    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    );

    const guidedButton = screen.getByRole("button", { name: "Guided" });
    const advancedButton = screen.getByRole("button", { name: "Advanced" });

    expect(guidedButton).toHaveAttribute("aria-pressed", "true");
    expect(advancedButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(advancedButton);

    expect(guidedButton).toHaveAttribute("aria-pressed", "false");
    expect(advancedButton).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain('"guidedMode":false');
  });

  it("keeps the quick theme toggle visible in compact launcher mode", () => {
    render(
      <SettingsProvider>
        <SettingsPanel compactLauncher />
      </SettingsProvider>,
    );

    const lightButton = screen.getByRole("button", { name: "Light" });
    const darkButton = screen.getByRole("button", { name: "Dark" });
    const systemButton = screen.getByRole("button", { name: "System" });

    expect(lightButton).toBeInTheDocument();
    expect(darkButton).toBeInTheDocument();
    expect(systemButton).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guided" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Advanced" })).not.toBeInTheDocument();

    fireEvent.click(darkButton);

    expect(darkButton).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain('"themeMode":"dark"');
  });

  it("toggles the settings dialog from the launcher button", () => {
    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    );

    const launcher = screen.getByRole("button", { name: "Settings" });

    fireEvent.click(launcher);
    expect(screen.getByRole("dialog", { name: "Settings profile" })).toBeInTheDocument();
    expect(launcher).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(launcher);
    expect(screen.queryByRole("dialog", { name: "Settings profile" })).not.toBeInTheDocument();
    expect(launcher).toHaveAttribute("aria-expanded", "false");
  });

  it("reverts unsaved changes back to the last saved settings", () => {
    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    const themeSelect = screen.getByLabelText("Theme mode");
    expect(themeSelect).toHaveValue("system");

    fireEvent.change(themeSelect, { target: { value: "dark" } });
    expect(themeSelect).toHaveValue("dark");

    fireEvent.click(screen.getByRole("button", { name: "Revert Changes" }));

    expect(screen.getByLabelText("Theme mode")).toHaveValue("system");
    expect(screen.getByText("Unsaved settings changes were reverted.")).toBeInTheDocument();
  });

  it("closes the settings dialog when escape is pressed", () => {
    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("dialog", { name: "Settings profile" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Settings profile" })).not.toBeInTheDocument();
  });

  it("closes the settings dialog when the backdrop is clicked", () => {
    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    const overlay = screen.getByRole("dialog", { name: "Settings profile" }).parentElement;

    expect(overlay).not.toBeNull();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole("dialog", { name: "Settings profile" })).not.toBeInTheDocument();
  });

  it("closes the settings dialog after saving changes", () => {
    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Theme mode"), { target: { value: "dark" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(screen.queryByRole("dialog", { name: "Settings profile" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain('"themeMode":"dark"');
  });

  it("resets saved settings to defaults after confirmation", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Theme mode"), { target: { value: "dark" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset to Defaults" }));

    expect(screen.getByLabelText("Theme mode")).toHaveValue("system");
    expect(screen.getByText("Saved settings were reset to defaults.")).toBeInTheDocument();
  });

  it("restarts the guided tour from the settings dialog", () => {
    const defaultSettings = createDefaultSettings();
    window.localStorage.setItem(
      SETTINGS_PROFILE_STORAGE_KEY,
      JSON.stringify(createSettingsProfile({
        ...defaultSettings,
        layout: {
          ...defaultSettings.layout,
          guidedMode: false,
          guidedTourCompleted: true,
        },
      })),
    );

    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Restart Guided Tour" }));

    expect(screen.queryByRole("dialog", { name: "Settings profile" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain('"guidedMode":true');
    expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain('"guidedTourCompleted":false');
  });

  it("saves the workspace tree default view mode from layout settings", () => {
    render(
      <SettingsProvider>
        <SettingsPanel />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.change(screen.getByLabelText("Workspace tree default view"), { target: { value: "all" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain('"workspaceTreeDefaultMode":"all"');
  });

  it("resets only the active cockpit layout and dispatches a targeted reset event", () => {
    window.localStorage.setItem(COCKPIT_LAYOUT_STORAGE_KEY, JSON.stringify({
      "create-game": { cockpitId: "create-game", zones: { left: ["panel-a"] } },
      runtime: { cockpitId: "runtime", zones: { left: ["panel-b"] } },
    }));
    const resetEvents: unknown[] = [];
    const handleResetEvent = (event: Event) => {
      resetEvents.push((event as CustomEvent).detail);
    };
    window.addEventListener(COCKPIT_LAYOUT_RESET_EVENT, handleResetEvent);

    render(
      <SettingsProvider>
        <SettingsPanel activeCockpitId="create-game" />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset Current Cockpit Layout" }));

    const rawSnapshot = window.localStorage.getItem(COCKPIT_LAYOUT_STORAGE_KEY);
    expect(rawSnapshot).toBeTruthy();
    const parsedSnapshot = JSON.parse(rawSnapshot ?? "{}") as Record<string, unknown>;
    expect(parsedSnapshot["create-game"]).toBeUndefined();
    expect(parsedSnapshot.runtime).toBeDefined();
    expect(resetEvents).toContainEqual({
      scope: "cockpit",
      cockpitId: "create-game",
    });
    expect(screen.getByText("Layout reset to recommended defaults for create-game.")).toBeInTheDocument();

    window.removeEventListener(COCKPIT_LAYOUT_RESET_EVENT, handleResetEvent);
  });

  it("resets all cockpit layouts and dispatches a global reset event", () => {
    window.localStorage.setItem(COCKPIT_LAYOUT_STORAGE_KEY, JSON.stringify({
      "create-game": { cockpitId: "create-game", zones: { left: ["panel-a"] } },
      runtime: { cockpitId: "runtime", zones: { left: ["panel-b"] } },
    }));
    const resetEvents: unknown[] = [];
    const handleResetEvent = (event: Event) => {
      resetEvents.push((event as CustomEvent).detail);
    };
    window.addEventListener(COCKPIT_LAYOUT_RESET_EVENT, handleResetEvent);

    render(
      <SettingsProvider>
        <SettingsPanel activeCockpitId="create-game" />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset All Cockpit Layouts" }));

    expect(window.localStorage.getItem(COCKPIT_LAYOUT_STORAGE_KEY)).toBeNull();
    expect(resetEvents).toContainEqual({ scope: "all" });
    expect(screen.getByText("All cockpit layouts reset to recommended defaults.")).toBeInTheDocument();

    window.removeEventListener(COCKPIT_LAYOUT_RESET_EVENT, handleResetEvent);
  });
});
