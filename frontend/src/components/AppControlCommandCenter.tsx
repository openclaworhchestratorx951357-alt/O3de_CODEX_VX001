import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";

import { buildAppControlExecutionReport, previewAppControlScript } from "../lib/api";
import { useSettings } from "../lib/settings/hooks";
import { loadSettingsProfile } from "../lib/settings/storage";
import type {
  AppControlExecutionReport,
  AppControlExecutionReportItem,
  AppControlOperation,
  AppControlScriptPreview,
} from "../types/contracts";
import type { AppSettings, SettingsProfile } from "../types/settings";

type AppControlCommandCenterProps = {
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
};

type AppControlWorkspaceValue = (typeof WORKSPACE_VALUES)[number];

type AppControlBackup = {
  scriptId: string;
  createdAt: string;
  profile: SettingsProfile;
  activeWorkspaceId: AppControlWorkspaceValue;
};

type AppControlReceiptItem = AppControlExecutionReportItem & {
  verificationSource?: {
    kind: "navigation";
    workspaceId: AppControlWorkspaceValue;
  } | null;
};

type AppControlReceipt = Omit<AppControlExecutionReport, "items" | "script_id"> & {
  scriptId: string;
  items: AppControlReceiptItem[];
};

const APP_CONTROL_BACKUP_SESSION_KEY = "o3de-control-app-last-app-control-backup";
const WORKSPACE_VALUES = [
  "home",
  "create-game",
  "create-movie",
  "load-project",
  "asset-forge",
  "prompt",
  "builder",
  "operations",
  "runtime",
  "records",
] as const;
const APP_CONTROL_BOUNDARY_ITEMS = [
  "Shell commands and Windows file edits stay out of scope here.",
  "O3DE editor/runtime state is not mutated by this surface.",
  "Backend runtime state and bridge state are not changed by this slice.",
] as const;

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

function resolveWorkspaceAfter(
  workspaceBefore: string,
  operations: AppControlOperation[],
): string {
  const navigationOperation = operations.find((operation) => operation.kind === "navigation.open_workspace");
  return navigationOperation && isWorkspaceValue(navigationOperation.value)
    ? navigationOperation.value
    : workspaceBefore;
}

function loadPersistedSettings(): AppSettings | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return loadSettingsProfile().settings;
  } catch {
    return null;
  }
}

function readSettingValue(settings: AppSettings, target: string): unknown {
  switch (target) {
    case "appearance.themeMode":
      return settings.appearance.themeMode;
    case "appearance.density":
      return settings.appearance.density;
    case "appearance.contentMaxWidth":
      return settings.appearance.contentMaxWidth;
    case "layout.showDesktopTelemetry":
      return settings.layout.showDesktopTelemetry;
    case "layout.guidedMode":
      return settings.layout.guidedMode;
    default:
      return undefined;
  }
}

function formatAppControlValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (value === undefined) {
    return "unknown";
  }

  if (value === null) {
    return "null";
  }

  return String(value);
}

function formatSettingTargetLabel(target: string): string {
  switch (target) {
    case "appearance.themeMode":
      return "Theme mode";
    case "appearance.density":
      return "Density";
    case "appearance.contentMaxWidth":
      return "Content width";
    case "layout.showDesktopTelemetry":
      return "Desktop telemetry";
    case "layout.guidedMode":
      return "Guided mode";
    default:
      return target;
  }
}

function describeSettingDelta(target: string, beforeValue: unknown, afterValue: unknown): string {
  return `${formatSettingTargetLabel(target)}: ${formatAppControlValue(beforeValue)} -> ${formatAppControlValue(afterValue)}`;
}

function collectSettingsRestoreDeltas(
  currentSettings: AppSettings,
  backupSettings: AppSettings,
): string[] {
  const admittedTargets = [
    "appearance.themeMode",
    "appearance.density",
    "appearance.contentMaxWidth",
    "layout.showDesktopTelemetry",
    "layout.guidedMode",
  ] as const;

  return admittedTargets.flatMap((target) => {
    const currentValue = readSettingValue(currentSettings, target);
    const backupValue = readSettingValue(backupSettings, target);
    return currentValue === backupValue
      ? []
      : [describeSettingDelta(target, currentValue, backupValue)];
  });
}

function buildApplyReceipt(
  preview: AppControlScriptPreview,
  settingsBeforeApply: AppSettings,
): AppControlReceipt {
  const persistedSettings = loadPersistedSettings();
  const items = preview.operations.map((operation) => {
    if (operation.kind === "settings.patch") {
      const delta = describeSettingDelta(
        operation.target,
        readSettingValue(settingsBeforeApply, operation.target),
        operation.value,
      );
      const verified = persistedSettings
        ? readSettingValue(persistedSettings, operation.target) === operation.value
        : false;

      return {
        id: operation.operation_id,
        label: operation.description,
        detail: verified
          ? "Verified by re-reading the local saved app settings after apply."
          : "Requested for local settings apply, but this panel could not verify the saved value afterward.",
        delta,
        verification: verified ? "verified" : "assumed",
      } satisfies AppControlReceiptItem;
    }

    if (operation.kind === "navigation.open_workspace") {
      if (!isWorkspaceValue(operation.value)) {
        return {
        id: operation.operation_id,
        label: operation.description,
        detail: "Navigation request was issued, but this panel only verifies known desktop workspace targets.",
        delta: null,
        verification: "assumed",
        verificationSource: null,
      } satisfies AppControlReceiptItem;
      }

      return {
        id: operation.operation_id,
        label: operation.description,
        detail: "Navigation request was sent to the shell, but this panel does not read back final workspace focus.",
        delta: `Workspace: ${settingsBeforeApply.layout.preferredLandingSection} -> ${operation.value}`,
        verification: "assumed",
        verificationSource: { kind: "navigation", workspaceId: operation.value },
      } satisfies AppControlReceiptItem;
    }

    return {
      id: operation.operation_id,
      label: operation.description,
      detail: "Operation was issued from this panel, but no direct readback is available here.",
      delta: null,
      verification: "assumed",
      verificationSource: null,
    } satisfies AppControlReceiptItem;
  });

  return {
    mode: "applied",
    scriptId: preview.script_id,
    summary: `Applied ${preview.operations.length} planned operation(s). Verified results are marked explicitly below.`,
    items,
    event_id: null,
    generated_by: "frontend-app-control-fallback-v1",
  };
}

function buildRevertReceipt(
  backup: AppControlBackup,
  settingsBeforeRevert: AppSettings,
): AppControlReceipt {
  const persistedSettings = loadPersistedSettings();
  const settingsRestored = persistedSettings
    ? JSON.stringify(persistedSettings) === JSON.stringify(backup.profile.settings)
    : false;
  const restoreDeltas = collectSettingsRestoreDeltas(settingsBeforeRevert, backup.profile.settings);

  return {
    mode: "reverted",
    scriptId: backup.scriptId,
    summary: "Requested restore of the last saved App OS backup. Verified results are marked explicitly below.",
    items: [
      {
        id: `${backup.scriptId}-settings-restore`,
        label: "Restore saved app settings profile",
        detail: settingsRestored
          ? "Verified by re-reading the local saved settings profile after revert."
          : "Restore was requested, but this panel could not verify the saved settings profile afterward.",
        delta: restoreDeltas.length > 0 ? restoreDeltas.join(" | ") : "No admitted settings values changed during restore.",
        verification: settingsRestored ? "verified" : "assumed",
      },
      {
        id: `${backup.scriptId}-workspace-restore`,
        label: `Return to ${backup.activeWorkspaceId} workspace`,
        detail: "Navigation request was sent to the shell, but this panel does not read back final workspace focus.",
        delta: `Workspace: ${settingsBeforeRevert.layout.preferredLandingSection} -> ${backup.activeWorkspaceId}`,
        verification: "assumed",
        verificationSource: { kind: "navigation", workspaceId: backup.activeWorkspaceId },
      },
    ],
    event_id: null,
    generated_by: "frontend-app-control-fallback-v1",
  };
}

function updateReceiptNavigationVerification(
  receipt: AppControlReceipt,
  activeWorkspaceId: string,
): AppControlReceipt {
  let changed = false;
  const nextItems = receipt.items.map((item) => {
    if (item.verificationSource?.kind !== "navigation") {
      return item;
    }

    const verified = activeWorkspaceId === item.verificationSource.workspaceId;
    const nextItem = {
      ...item,
      detail: verified
        ? `Verified by reading the current shell workspace focus as ${item.verificationSource.workspaceId}.`
        : "Navigation request was sent to the shell, but the current shell workspace focus does not match yet.",
      verification: verified ? "verified" : "assumed",
    } satisfies AppControlReceiptItem;

    if (
      nextItem.detail !== item.detail
      || nextItem.verification !== item.verification
    ) {
      changed = true;
    }

    return nextItem;
  });

  return changed ? { ...receipt, items: nextItems } : receipt;
}

function normalizeExecutionReport(report: AppControlExecutionReport): AppControlReceipt {
  return {
    mode: report.mode,
    scriptId: report.script_id,
    summary: report.summary,
    items: report.items.map((item) => ({
      ...item,
      verificationSource: item.verification_source && item.verification_source.kind === "navigation"
        && isWorkspaceValue(item.verification_source.workspace_id)
        ? {
            kind: "navigation",
            workspaceId: item.verification_source.workspace_id,
          }
        : null,
    })),
    event_id: report.event_id ?? null,
    generated_by: report.generated_by,
  };
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
  const [receipt, setReceipt] = useState<AppControlReceipt | null>(null);
  const [status, setStatus] = useState("Ask for a safe app setting or navigation change.");
  const [lastBackup, setLastBackup] = useState<AppControlBackup | null>(() => loadLastBackup());
  const overlayTarget = typeof document !== "undefined"
    ? document.querySelector<HTMLElement>("[data-app-theme-root='true']") ?? document.body
    : null;

  useEffect(() => {
    if (!receipt) {
      return;
    }

    setReceipt((currentReceipt) => {
      if (!currentReceipt) {
        return currentReceipt;
      }

      return updateReceiptNavigationVerification(currentReceipt, activeWorkspaceId);
    });
  }, [activeWorkspaceId, receipt]);

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
    setReceipt(null);
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

  async function approveAndRunScript() {
    if (!preview || preview.status !== "ready") {
      setStatus("Only ready previews can be executed.");
      return;
    }

    const backup: AppControlBackup = {
      scriptId: preview.script_id,
      createdAt: new Date().toISOString(),
      profile,
      activeWorkspaceId: isWorkspaceValue(activeWorkspaceId) ? activeWorkspaceId : "home",
    };
    const nextSettings = applySettingsOperations(settings, preview.operations);
    const nextWorkspaceId = resolveWorkspaceAfter(activeWorkspaceId, preview.operations);

    saveSettings(nextSettings);
    preview.operations.forEach((operation) => {
      if (operation.kind === "navigation.open_workspace" && isWorkspaceValue(operation.value)) {
        onSelectWorkspace(operation.value);
      }
    });

    saveLastBackup(backup);
    setLastBackup(backup);
    try {
      const report = await buildAppControlExecutionReport({
        script_id: preview.script_id,
        mode: "applied",
        operations: preview.operations,
        settings_before: settings as unknown as Record<string, unknown>,
        settings_after: nextSettings as unknown as Record<string, unknown>,
        workspace_before: activeWorkspaceId,
        workspace_after: nextWorkspaceId,
      });
      setReceipt(normalizeExecutionReport(report));
    } catch {
      setReceipt(buildApplyReceipt(preview, settings));
    }
    setStatus(`Executed ${preview.operations.length} operation(s). Backup is ready for revert. Verified results are marked below.`);
    setPreview(null);
  }

  async function revertLastScript() {
    if (!lastBackup) {
      setStatus("No app-control backup is available yet.");
      return;
    }

    saveSettings(lastBackup.profile.settings);
    if (isWorkspaceValue(lastBackup.activeWorkspaceId)) {
      onSelectWorkspace(lastBackup.activeWorkspaceId);
    }
    try {
      const report = await buildAppControlExecutionReport({
        script_id: lastBackup.scriptId,
        mode: "reverted",
        operations: [],
        settings_before: settings as unknown as Record<string, unknown>,
        settings_after: lastBackup.profile.settings as unknown as Record<string, unknown>,
        workspace_before: activeWorkspaceId,
        workspace_after: lastBackup.activeWorkspaceId,
        backup_settings: lastBackup.profile.settings as unknown as Record<string, unknown>,
        backup_workspace_id: lastBackup.activeWorkspaceId,
      });
      setReceipt(normalizeExecutionReport(report));
    } catch {
      setReceipt(buildRevertReceipt(lastBackup, settings));
    }
    setStatus(`Reverted script ${lastBackup.scriptId}. Verified results are marked below.`);
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
              <button type="button" onClick={() => void revertLastScript()} disabled={!lastBackup} style={secondaryButtonStyle}>
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
              <div style={previewSectionGridStyle}>
                <div style={previewSectionCardStyle}>
                  <span style={eyebrowStyle}>Will change</span>
                  {preview.operations.length > 0 ? (
                    <ol style={operationListStyle}>
                      {preview.operations.map((operation) => (
                        <li key={operation.operation_id}>
                          <strong>{operation.kind}</strong>: {operation.description}
                          {operation.kind === "settings.patch" ? (
                            <div style={deltaLineStyle}>
                              {describeSettingDelta(
                                operation.target,
                                readSettingValue(settings, operation.target),
                                operation.value,
                              )}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p style={mutedTightStyle}>No admitted app changes are planned from this preview.</p>
                  )}
                </div>
                <div style={previewSectionCardStyle}>
                  <span style={eyebrowStyle}>Won&apos;t change here</span>
                  <ul style={neutralListStyle}>
                    {APP_CONTROL_BOUNDARY_ITEMS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div style={previewSectionCardStyle}>
                  <span style={eyebrowStyle}>Blocked or unsupported</span>
                  {preview.warnings.length > 0 ? (
                    <ul style={warningListStyle}>
                      {preview.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={mutedTightStyle}>No blocked or unsupported actions were reported for this preview.</p>
                  )}
                </div>
              </div>
              <div style={buttonRowStyle}>
                <button
                  type="button"
                  onClick={() => void approveAndRunScript()}
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

          {receipt ? (
            <div style={receiptStyle}>
              <div>
                <span style={eyebrowStyle}>{receipt.mode === "applied" ? "Execution receipt" : "Revert receipt"}</span>
                <strong>{receipt.summary}</strong>
                <p style={mutedStyle}>Script id: {receipt.scriptId}</p>
                {receipt.event_id ? (
                  <p style={receiptEventStyle}>Audit event: {receipt.event_id}</p>
                ) : null}
                <p style={receiptSummaryStyle}>
                  {receipt.items.filter((item) => item.verification === "verified").length} verified
                  {" | "}
                  {receipt.items.filter((item) => item.verification === "assumed").length} assumed
                </p>
              </div>
              <div style={receiptListStyle}>
                {receipt.items.map((item) => (
                  <div key={item.id} style={receiptItemStyle}>
                    <div style={receiptItemHeaderStyle}>
                      <strong>{item.label}</strong>
                      <span
                        style={{
                          ...verificationBadgeStyle,
                          ...(item.verification === "verified"
                            ? verifiedBadgeStyle
                            : assumedBadgeStyle),
                        }}
                      >
                        {item.verification}
                      </span>
                    </div>
                    {item.delta ? (
                      <p style={deltaLineStyle}>{item.delta}</p>
                    ) : null}
                    <p style={mutedTightStyle}>{item.detail}</p>
                  </div>
                ))}
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

const previewSectionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
} satisfies CSSProperties;

const previewSectionCardStyle = {
  display: "grid",
  gap: 6,
  padding: 10,
  border: "1px solid color-mix(in srgb, var(--app-warning-border) 55%, transparent)",
  borderRadius: "var(--app-card-radius)",
  background: "color-mix(in srgb, var(--app-panel-bg-alt) 78%, var(--app-warning-bg) 22%)",
} satisfies CSSProperties;

const operationListStyle = {
  margin: 0,
  paddingLeft: 20,
  lineHeight: 1.45,
} satisfies CSSProperties;

const neutralListStyle = {
  ...operationListStyle,
  color: "var(--app-muted-color)",
} satisfies CSSProperties;

const warningListStyle = {
  ...operationListStyle,
  color: "var(--app-warning-text)",
} satisfies CSSProperties;

const deltaLineStyle = {
  marginTop: 4,
  color: "var(--app-info-text)",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.35,
} satisfies CSSProperties;

const receiptStyle = {
  display: "grid",
  gap: 10,
  padding: 12,
  border: "1px solid var(--app-info-border)",
  borderRadius: "var(--app-card-radius)",
  background: "var(--app-info-bg)",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const receiptListStyle = {
  display: "grid",
  gap: 8,
} satisfies CSSProperties;

const receiptSummaryStyle = {
  margin: "6px 0 0",
  color: "var(--app-info-text)",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.35,
} satisfies CSSProperties;

const receiptEventStyle = {
  margin: "6px 0 0",
  color: "var(--app-subtle-color)",
  fontSize: 12,
  lineHeight: 1.35,
} satisfies CSSProperties;

const receiptItemStyle = {
  display: "grid",
  gap: 4,
  padding: 10,
  border: "1px solid color-mix(in srgb, var(--app-info-border) 70%, transparent)",
  borderRadius: "calc(var(--app-card-radius) - 6px)",
  background: "color-mix(in srgb, var(--app-panel-bg-alt) 85%, var(--app-info-bg) 15%)",
} satisfies CSSProperties;

const receiptItemHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
} satisfies CSSProperties;

const verificationBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "var(--app-pill-radius)",
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
} satisfies CSSProperties;

const verifiedBadgeStyle = {
  border: "1px solid var(--app-success-border)",
  background: "var(--app-success-bg)",
  color: "var(--app-success-text)",
} satisfies CSSProperties;

const assumedBadgeStyle = {
  border: "1px solid var(--app-warning-border)",
  background: "var(--app-warning-bg)",
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

const mutedTightStyle = {
  ...mutedStyle,
  margin: 0,
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
