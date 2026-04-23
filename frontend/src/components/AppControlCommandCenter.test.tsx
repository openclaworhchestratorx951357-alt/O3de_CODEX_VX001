import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsProvider } from "../lib/settings/context";
import { SETTINGS_PROFILE_STORAGE_KEY } from "../types/settings";
import AppControlCommandCenter from "./AppControlCommandCenter";

const apiMocks = vi.hoisted(() => ({
  previewAppControlScript: vi.fn(),
}));

vi.mock("../lib/api", () => apiMocks);

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

describe("AppControlCommandCenter", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("previews, approves, applies, and reverts a safe app-control script", async () => {
    const onSelectWorkspace = vi.fn();
    apiMocks.previewAppControlScript.mockResolvedValue({
      script_id: "app-control-test",
      status: "ready",
      instruction: "Make the app dark and compact, then open Runtime.",
      summary: "Apply 3 safe app-control operations after taking a reversible settings backup.",
      risk_level: "low",
      approval_required: true,
      backup: {
        required: true,
        captures: ["settings profile", "active workspace", "acting agent identity"],
        revert_action_label: "Revert last app-control script",
      },
      operations: [
        {
          operation_id: "set-theme-dark",
          kind: "settings.patch",
          target: "appearance.themeMode",
          value: "dark",
          description: "Set the app theme mode to dark.",
          reversible: true,
        },
        {
          operation_id: "set-density-compact",
          kind: "settings.patch",
          target: "appearance.density",
          value: "compact",
          description: "Use compact app spacing.",
          reversible: true,
        },
        {
          operation_id: "open-workspace-runtime",
          kind: "navigation.open_workspace",
          target: "activeWorkspaceId",
          value: "runtime",
          description: "Open the runtime workspace.",
          reversible: true,
        },
      ],
      warnings: ["This preview does not execute shell commands."],
      generated_by: "deterministic-app-control-preview-v1",
      actor: { display_name: "O3DE authoring specialist" },
    });

    render(
      <SettingsProvider>
        <AppControlCommandCenter activeWorkspaceId="home" onSelectWorkspace={onSelectWorkspace} />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "App OS" }));
    fireEvent.change(screen.getByLabelText("Type what you want the app to do"), {
      target: { value: "Make the app dark and compact, then open Runtime." },
    });
    fireEvent.change(screen.getByLabelText(/Acting agent\/thread/i), {
      target: { value: "O3DE authoring specialist" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview script" }));

    expect(await screen.findByText("Approval required")).toBeInTheDocument();
    expect(screen.getByText(/Set the app theme mode to dark/i)).toBeInTheDocument();
    expect(screen.getByText("O3DE authoring specialist")).toBeInTheDocument();
    expect(apiMocks.previewAppControlScript).toHaveBeenCalledWith(expect.objectContaining({
      actor: { display_name: "O3DE authoring specialist" },
    }));

    fireEvent.click(screen.getByRole("button", { name: "Approve and run script" }));

    await waitFor(() => {
      expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain('"themeMode":"dark"');
    });
    expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain('"density":"compact"');
    expect(onSelectWorkspace).toHaveBeenCalledWith("runtime");
    expect(screen.getByText(/Backup is ready for revert/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back / revert last" }));

    await waitFor(() => {
      expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain('"themeMode":"system"');
    });
    expect(onSelectWorkspace).toHaveBeenCalledWith("home");
  });

  it("shows blocked preview warnings without executing unsupported scripts", async () => {
    apiMocks.previewAppControlScript.mockResolvedValue({
      script_id: "app-control-blocked",
      status: "no_supported_action",
      instruction: "Run PowerShell.",
      summary: "No safe app-control operation was generated.",
      risk_level: "medium",
      approval_required: true,
      backup: {
        required: true,
        captures: ["settings profile", "active workspace"],
        revert_action_label: "Revert last app-control script",
      },
      operations: [],
      warnings: ["This instruction mentions terms outside the safe app-control boundary: powershell."],
      generated_by: "deterministic-app-control-preview-v1",
      actor: null,
    });

    render(
      <SettingsProvider>
        <AppControlCommandCenter activeWorkspaceId="home" onSelectWorkspace={vi.fn()} />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "App OS" }));
    fireEvent.change(screen.getByLabelText("Type what you want the app to do"), {
      target: { value: "Run PowerShell." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview script" }));

    expect(await screen.findByText("No safe app-control operation was generated.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve and run script" })).toBeDisabled();
  });
});
