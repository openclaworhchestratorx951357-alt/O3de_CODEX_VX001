import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsProvider } from "../lib/settings/context";
import { createDefaultSettings, createSettingsProfile } from "../lib/settings/defaults";
import SettingsPanel from "./SettingsPanel";
import { SETTINGS_PROFILE_STORAGE_KEY } from "../types/settings";

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
});
