import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsProvider } from "../lib/settings/context";
import { SETTINGS_PROFILE_STORAGE_KEY } from "../types/settings";
import AppControlCommandCenter from "./AppControlCommandCenter";

const apiMocks = vi.hoisted(() => ({
  previewAppControlScript: vi.fn(),
  buildAppControlExecutionReport: vi.fn(),
}));

vi.mock("../lib/api", () => apiMocks);

function AppControlHarness({
  initialWorkspaceId = "asset-forge",
  onSelectWorkspaceSpy,
}: {
  initialWorkspaceId?: string;
  onSelectWorkspaceSpy?: ReturnType<typeof vi.fn>;
}) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(initialWorkspaceId);

  return (
    <AppControlCommandCenter
      activeWorkspaceId={activeWorkspaceId}
      onSelectWorkspace={(workspaceId) => {
        onSelectWorkspaceSpy?.(workspaceId);
        setActiveWorkspaceId(workspaceId);
      }}
    />
  );
}

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
    apiMocks.buildAppControlExecutionReport.mockImplementation(async (request) => ({
      script_id: request.script_id,
      mode: request.mode,
      summary: request.mode === "applied"
        ? "Applied 3 planned operation(s). Verified results are marked explicitly below."
        : "Requested restore of the last saved App OS backup. Verified results are marked explicitly below.",
      items: request.mode === "applied"
        ? [
            {
              id: "set-theme-dark",
              label: "Set the app theme mode to dark.",
              detail: "Verified by re-reading the local saved app settings after apply.",
              delta: "Theme mode: system -> dark",
              verification: "verified",
            },
            {
              id: "set-density-compact",
              label: "Use compact app spacing.",
              detail: "Verified by re-reading the local saved app settings after apply.",
              delta: "Density: comfortable -> compact",
              verification: "verified",
            },
            {
              id: "open-workspace-runtime",
              label: "Open the runtime workspace.",
              detail: "Navigation request was sent to the shell, but the current shell workspace focus does not match yet.",
              delta: "Workspace: asset-forge -> runtime",
              verification: "assumed",
              verification_source: {
                kind: "navigation",
                workspace_id: "runtime",
              },
            },
          ]
        : [
            {
              id: `${request.script_id}-settings-restore`,
              label: "Restore saved app settings profile",
              detail: "Verified by re-reading the local saved settings profile after revert.",
              delta: "Theme mode: dark -> system | Density: compact -> comfortable",
              verification: "verified",
            },
            {
              id: `${request.script_id}-workspace-restore`,
              label: "Return to asset-forge workspace",
              detail: "Navigation request was sent to the shell, but the current shell workspace focus does not match yet.",
              delta: "Workspace: runtime -> asset-forge",
              verification: "assumed",
              verification_source: {
                kind: "navigation",
                workspace_id: "asset-forge",
              },
            },
          ],
      generated_by: "deterministic-app-control-report-v1",
      event_id: request.mode === "applied" ? "evt-app-control-apply" : "evt-app-control-revert",
    }));
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
        <AppControlHarness onSelectWorkspaceSpy={onSelectWorkspace} />
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
    expect(screen.getByText("Will change")).toBeInTheDocument();
    expect(screen.getByText("Won't change here")).toBeInTheDocument();
    expect(screen.getByText("Blocked or unsupported")).toBeInTheDocument();
    expect(screen.getByText(/Set the app theme mode to dark/i)).toBeInTheDocument();
    expect(screen.getByText("Theme mode: system -> dark")).toBeInTheDocument();
    expect(screen.getByText("Density: comfortable -> compact")).toBeInTheDocument();
    expect(screen.getByText("O3DE authoring specialist")).toBeInTheDocument();
    expect(apiMocks.previewAppControlScript).toHaveBeenCalledWith(expect.objectContaining({
      actor: { display_name: "O3DE authoring specialist" },
    }));

    fireEvent.click(screen.getByRole("button", { name: "Approve and run script" }));

    await waitFor(() => {
      expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain("\"themeMode\":\"dark\"");
    });
    expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain("\"density\":\"compact\"");
    expect(onSelectWorkspace).toHaveBeenCalledWith("runtime");
    expect(screen.getByText(/Backup is ready for revert/i)).toBeInTheDocument();
    expect(screen.getByText("Execution receipt")).toBeInTheDocument();
    expect(screen.getByText("Audit event: evt-app-control-apply")).toBeInTheDocument();
    expect(screen.getAllByText(/Verified by re-reading the local saved app settings after apply/i).length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getByText(/Verified by reading the current shell workspace focus as runtime/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Theme mode: system -> dark")).toBeInTheDocument();
    expect(screen.getByText("Density: comfortable -> compact")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/3 verified/)).toBeInTheDocument();
      expect(screen.getByText(/0 assumed/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Back / revert last" }));

    await waitFor(() => {
      expect(window.localStorage.getItem(SETTINGS_PROFILE_STORAGE_KEY)).toContain("\"themeMode\":\"system\"");
    });
    expect(onSelectWorkspace).toHaveBeenCalledWith("asset-forge");
    expect(screen.getByText("Revert receipt")).toBeInTheDocument();
    expect(screen.getByText("Audit event: evt-app-control-revert")).toBeInTheDocument();
    expect(screen.getByText(/Verified by re-reading the local saved settings profile after revert/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Verified by reading the current shell workspace focus as asset-forge/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Theme mode: dark -> system/)).toBeInTheDocument();
    expect(screen.getByText(/Density: compact -> comfortable/)).toBeInTheDocument();
    expect(screen.getByText(/2 verified/)).toBeInTheDocument();
    expect(screen.getByText(/0 assumed/)).toBeInTheDocument();
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
        <AppControlCommandCenter activeWorkspaceId="asset-forge" onSelectWorkspace={vi.fn()} />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "App OS" }));
    fireEvent.change(screen.getByLabelText("Type what you want the app to do"), {
      target: { value: "Run PowerShell." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview script" }));

    expect(await screen.findByText("No safe app-control operation was generated.")).toBeInTheDocument();
    expect(screen.getByText("Blocked or unsupported")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve and run script" })).toBeDisabled();
  });

  it("closes the App OS panel when clicking outside or pressing Escape", () => {
    render(
      <SettingsProvider>
        <button type="button">Outside app surface</button>
        <AppControlCommandCenter activeWorkspaceId="asset-forge" onSelectWorkspace={vi.fn()} />
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "App OS" }));
    expect(screen.getByRole("dialog", { name: "App control command center" })).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside app surface" }));
    expect(screen.queryByRole("dialog", { name: "App control command center" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "App OS" }));
    expect(screen.getByRole("dialog", { name: "App control command center" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "App control command center" })).not.toBeInTheDocument();
  });

  it("renders the App OS panel in a portal so taskbar nowrap styles do not stretch it", () => {
    render(
      <SettingsProvider>
        <div style={{ whiteSpace: "nowrap" }}>
          <AppControlCommandCenter activeWorkspaceId="asset-forge" onSelectWorkspace={vi.fn()} />
        </div>
      </SettingsProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "App OS" }));

    const dialog = screen.getByRole("dialog", { name: "App control command center" });
    expect(dialog).toBeInTheDocument();
    expect(dialog.parentElement).toHaveAttribute("data-app-theme-root", "true");
    expect(dialog).toHaveStyle({ position: "fixed", whiteSpace: "normal" });
  });
});
