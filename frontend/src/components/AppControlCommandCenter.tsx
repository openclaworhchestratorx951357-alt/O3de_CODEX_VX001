import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { previewAppControlScript } from "../lib/api";
import { useSettings } from "../lib/settings/hooks";
import type { AppControlOperation, AppControlScriptPreview } from "../types/contracts";
import type { AppSettings, SettingsProfile } from "../types/settings";

type AppControlCommandCenterProps = {
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
};

type AppControlBackup = {
  scriptId: string;
  createdAt: string;
  profile: SettingsProfile;
  activeWorkspaceId: string;
};

const APP_CONTROL_BACKUP_SESSION_KEY = "o3de-control-app-last-app-control-backup";
const WORKSPACE_VALUES = ["home", "prompt", "builder", "operations", "runtime", "records"] as const;

function loadLastBackup(): AppControlBackup | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(APP_CONTROL_BACKUP_SESSION_KEY);
    return rawValue ? JSON.parse(rawValue) as AppControlBackup : null;
  } catch {
    return null;
  }
}

function saveLastBackup(backup: AppControlBackup): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(APP_CONTROL_BACKUP_SESSION_KEY, JSON.stringify(backup));
}

function isWorkspaceValue(value: unknown): value is (typeof WORKSPACE_VALUES)[number] {
  return typeof value === "string" && WORKSPACE_VALUES.includes(value as (typeof WORKSPACE_VALUES)[number]);
}

function setSettingsPath(settings: AppSettings, target: string, value: unknown): AppSettings {
  switch (target) {
    case "appearance.themeMode":
      return value === "light" || value === "dark" || value === "system"
        ? { ...settings, appearance: { ...settings.appearance, themeMode: value } }
        : settings;
    case "appearance.density":
      return value === "comfortable" || value === "compact"
        ? { ...settings, appearance: { ...settings.appearance, density: value } }
        : settings;
    case "appearance.contentMaxWidth":
      return value === "focused" || value === "wide" || value === "full"
        ? { ...settings, appearance: { ...settings.appearance, contentMaxWidth: value } }
        : settings;
    case "layout.showDesktopTelemetry":
      return typeof value === "boolean"
        ? { ...settings, layout: { ...settings.layout, showDesktopTelemetry: value } }
        : settings;
    case "layout.guidedMode":
      return typeof value === "boolean"
        ? { ...settings, layout: { ...settings.layout, guidedMode: value } }
        : settings;
    default:
      return settings;
  }
}

function applySettingsOperations(settings: AppSettings, operations: AppControlOperation[]): AppSettings {
  return operations.reduce((nextSettings, operation) => {
    if (operation.kind !== "settings.patch") {
      return nextSettings;
    }

    return setSettingsPath(nextSettings, operation.target, operation.value);
  }, settings);
}

export default function AppControlCommandCenter({
  activeWorkspaceId,
  onSelectWorkspace,
}: AppControlCommandCenterProps) {
  const { profile, settings, saveSettings } = useSettings();
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [instruction, setInstruction] = useState("");
  const [actorName, setActorName] = useState("");
  const [preview, setPreview] = useState<AppControlScriptPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [status, setStatus] = useState("Ask for a safe app setting or navigation change.");
  const [lastBackup, setLastBackup] = useState<AppControlBackup | null>(() => loadLastBackup());
  const overlayTarget = typeof document !== "undefined"
    ? document.querySelector<HTMLElement>("[data-app-theme-root='true']") ?? document.body
    : null;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function updatePanelPosition() {
      const buttonBounds = buttonRef.current?.getBoundingClientRect();
      if (!buttonBounds || typeof window === "undefined") {
        return;
      }

      const width = Math.min(560, Math.max(window.innerWidth - 24, 320));
      const left = Math.min(
        window.innerWidth - width - 12,
        Math.max(12, buttonBounds.right - width),
      );

      setPanelPosition({
        top: buttonBounds.bottom + 10,
        left,
        width,
      });
    }

    function closeWhenOutside(event: PointerEvent) {
      const targetNode = event.target;
      if (!(targetNode instanceof Node)) {
        return;
      }

      if (
        launcherRef.current?.contains(targetNode)
        || panelRef.current?.contains(targetNode)
      ) {
        return;
      }

      setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function previewScript(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!instruction.trim()) {
      setStatus("Type an app-control instruction first.");
      return;
    }

    setPreviewLoading(true);
    setStatus("Building a safe script preview...");
    try {
      const nextPreview = await previewAppControlScript({
        instruction,
        active_workspace_id: activeWorkspaceId,
        current_settings: settings as unknown as Record<string, unknown>,
        actor: actorName.trim() ? { display_name: actorName.trim() } : null,
      });
      setPreview(nextPreview);
      setStatus(
        nextPreview.status === "ready"
          ? "Review the script preview and approve only if it matches your intent."
          : "No executable app-control script was produced. Review the warnings.",
      );
    } catch (error) {
      setPreview(null);
      setStatus(error instanceof Error ? error.message : "App-control preview failed.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function approveAndRunScript() {
    if (!preview || preview.status !== "ready") {
      setStatus("Only ready previews can be executed.");
      return;
    }

    const backup: AppControlBackup = {
      scriptId: preview.script_id,
      createdAt: new Date().toISOString(),
      profile,
      activeWorkspaceId,
    };
    const nextSettings = applySettingsOperations(settings, preview.operations);

    saveSettings(nextSettings);
    preview.operations.forEach((operation) => {
      if (operation.kind === "navigation.open_workspace" && isWorkspaceValue(operation.value)) {
        onSelectWorkspace(operation.value);
      }
    });

    saveLastBackup(backup);
    setLastBackup(backup);
    setStatus(`Executed ${preview.operations.length} operation(s). Backup is ready for revert.`);
    setPreview(null);
  }

  function revertLastScript() {
    if (!lastBackup) {
      setStatus("No app-control backup is available yet.");
      return;
    }

    saveSettings(lastBackup.profile.settings);
    if (isWorkspaceValue(lastBackup.activeWorkspaceId)) {
      onSelectWorkspace(lastBackup.activeWorkspaceId);
    }
    setStatus(`Reverted script ${lastBackup.scriptId}.`);
  }

  const panel = open && overlayTarget && panelPosition
    ? createPortal(
        <section
          id="app-control-command-center"
          ref={panelRef}
          role="dialog"
          aria-label="App control command center"
          style={{
            ...panelStyle,
            top: panelPosition.top,
            left: panelPosition.left,
            width: panelPosition.width,
          }}
        >
          <form onSubmit={(event) => void previewScript(event)} style={formStyle}>
            <div>
              <span style={eyebrowStyle}>LLM App OS</span>
              <strong>Preview, approve, execute, then revert if needed</strong>
              <p style={mutedStyle}>
                This is the app&apos;s built-in virtual operating/file system layer. This slice controls admitted
                app settings and workspace navigation only. It does not run shell commands, edit Windows files,
                call O3DE, or mutate backend runtime state.
              </p>
            </div>

            <label style={fieldStyle}>
              Type what you want the app to do
              <textarea
                value={instruction}
                onChange={(event) => setInstruction(event.currentTarget.value)}
                rows={4}
                style={textAreaStyle}
                placeholder="Example: Make the app dark and compact, hide quick stats, then open Runtime."
              />
            </label>

            <label style={fieldStyle}>
              Acting agent/thread (optional)
              <input
                value={actorName}
                onChange={(event) => setActorName(event.currentTarget.value)}
                style={inputStyle}
                placeholder="Example: O3DE authoring specialist"
              />
              <span style={helpTextStyle}>
                Use this when a named helper agent is asking the app to prepare a safe change for user approval.
              </span>
            </label>

            <div style={buttonRowStyle}>
              <button type="submit" disabled={previewLoading} style={primaryButtonStyle}>
                {previewLoading ? "Previewing..." : "Preview script"}
              </button>
              <button type="button" onClick={revertLastScript} disabled={!lastBackup} style={secondaryButtonStyle}>
                Back / revert last
              </button>
            </div>
          </form>

          <p style={statusStyle}>{status}</p>

          {preview ? (
            <div style={previewStyle}>
              <div>
                <span style={eyebrowStyle}>Approval required</span>
                <strong>{preview.summary}</strong>
                <p style={mutedStyle}>Script id: {preview.script_id}</p>
              </div>
              <div style={previewGridStyle}>
                <span><strong>Status</strong>{preview.status}</span>
                <span><strong>Risk</strong>{preview.risk_level}</span>
                <span><strong>Backup</strong>{preview.backup.captures.join(", ")}</span>
                <span><strong>Actor</strong>{preview.actor?.display_name ?? "User direct"}</span>
              </div>
              {preview.operations.length > 0 ? (
                <ol style={operationListStyle}>
                  {preview.operations.map((operation) => (
                    <li key={operation.operation_id}>
                      <strong>{operation.kind}</strong>: {operation.description}
                    </li>
                  ))}
                </ol>
              ) : null}
              {preview.warnings.length > 0 ? (
                <ul style={warningListStyle}>
                  {preview.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              <div style={buttonRowStyle}>
                <button
                  type="button"
                  onClick={approveAndRunScript}
                  disabled={preview.status !== "ready"}
                  style={primaryButtonStyle}
                >
                  Approve and run script
                </button>
                <button type="button" onClick={() => setPreview(null)} style={secondaryButtonStyle}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </section>,
        overlayTarget,
      )
    : null;

  return (
    <div ref={launcherRef} style={launcherWrapperStyle}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((nextOpen) => !nextOpen)}
        aria-expanded={open}
        aria-controls="app-control-command-center"
        style={launcherButtonStyle}
      >
        App OS
      </button>
      {panel}
    </div>
  );
}

const launcherWrapperStyle = {
  position: "relative",
} satisfies CSSProperties;

const launcherButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "9px 14px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  font: "inherit",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const panelStyle = {
  position: "fixed",
  zIndex: 80,
  maxWidth: "calc(100vw - 24px)",
  display: "grid",
  gap: 12,
  padding: 14,
  border: "1px solid color-mix(in srgb, var(--app-panel-border-strong) 88%, var(--app-text-color) 12%)",
  borderRadius: "var(--app-card-radius)",
  background: "linear-gradient(180deg, color-mix(in srgb, var(--app-panel-bg-alt) 96%, var(--app-page-bg) 4%) 0%, color-mix(in srgb, var(--app-panel-bg) 98%, var(--app-page-bg) 2%) 100%)",
  boxShadow: "0 28px 80px rgba(0, 0, 0, 0.36), 0 0 0 1px rgba(255, 255, 255, 0.04) inset",
  backdropFilter: "blur(22px) saturate(115%)",
  whiteSpace: "normal",
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const formStyle = {
  display: "grid",
  gap: 10,
} satisfies CSSProperties;

const fieldStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-muted-color)",
  fontSize: 13,
  fontWeight: 700,
} satisfies CSSProperties;

const textAreaStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid color-mix(in srgb, var(--app-panel-border-strong) 84%, transparent)",
  borderRadius: "var(--app-card-radius)",
  padding: 10,
  background: "color-mix(in srgb, var(--app-panel-bg-alt) 94%, var(--app-page-bg) 6%)",
  color: "var(--app-text-color)",
  font: "inherit",
  resize: "vertical",
  lineHeight: 1.45,
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
} satisfies CSSProperties;

const inputStyle = {
  ...textAreaStyle,
  minHeight: 42,
  resize: "none",
} satisfies CSSProperties;

const helpTextStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.35,
} satisfies CSSProperties;

const buttonRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  cursor: "pointer",
  fontWeight: 800,
} satisfies CSSProperties;

const secondaryButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "color-mix(in srgb, var(--app-panel-bg-alt) 90%, var(--app-page-bg) 10%)",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontWeight: 700,
} satisfies CSSProperties;

const previewStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid var(--app-warning-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-warning-bg)",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const previewGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 8,
  overflowWrap: "anywhere",
} satisfies CSSProperties;

const operationListStyle = {
  margin: 0,
  paddingLeft: 20,
  lineHeight: 1.45,
} satisfies CSSProperties;

const warningListStyle = {
  ...operationListStyle,
  color: "var(--app-warning-text)",
} satisfies CSSProperties;

const statusStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  fontSize: 13,
  lineHeight: 1.45,
} satisfies CSSProperties;

const mutedStyle = {
  margin: "6px 0 0",
  color: "var(--app-muted-color)",
  lineHeight: 1.45,
  fontSize: 13,
} satisfies CSSProperties;

const eyebrowStyle = {
  display: "block",
  marginBottom: 4,
  color: "var(--app-subtle-color)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  lineHeight: 1.2,
  textTransform: "uppercase",
} satisfies CSSProperties;
