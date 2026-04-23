import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

import { useSettings } from "../lib/settings/hooks";
import { normalizeSettings, areSettingsEqual } from "../lib/settings/migrations";
import { exportSettingsProfile, importSettingsProfile } from "../lib/settings/storage";
import type { AppSettings } from "../types/settings";
import {
  CARD_RADIUS_VALUES,
  CONTENT_MAX_WIDTH_VALUES,
  DENSITY_VALUES,
  LANDING_SECTION_VALUES,
  LOCK_NAME_VALUES,
  THEME_MODE_VALUES,
} from "../types/settings";

function formatFieldLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatLocks(locks: readonly string[]): string {
  return locks.join(", ");
}

function formatThemeToggleLabel(value: AppSettings["appearance"]["themeMode"]): string {
  if (value === "system") {
    return "System";
  }
  return value === "light" ? "Light" : "Dark";
}

function formatGuidedModeToggleLabel(value: boolean): string {
  return value ? "Guided" : "Advanced";
}

function parseLocks(value: string): AppSettings["operatorDefaults"]["locks"] {
  const nextLocks = value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is AppSettings["operatorDefaults"]["locks"][number] => (
      item.length > 0 && LOCK_NAME_VALUES.includes(item as AppSettings["operatorDefaults"]["locks"][number])
    ));

  return nextLocks.length > 0 ? nextLocks : ["project_config"];
}

function getSettingsPortalHost(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  return document.querySelector<HTMLElement>("[data-app-theme-root='true']") ?? document.body;
}

type SettingsPanelProps = {
  buttonLabel?: string;
};

export default function SettingsPanel({
  buttonLabel = "Settings",
}: SettingsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const { profile, settings, saveSettings, resetSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AppSettings>(() => settings);
  const [locksText, setLocksText] = useState(() => formatLocks(settings.operatorDefaults.locks));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const portalHost = getSettingsPortalHost();

  const normalizedDraft = useMemo(() => normalizeSettings({
    ...draft,
    operatorDefaults: {
      ...draft.operatorDefaults,
      locks: parseLocks(locksText),
    },
  }), [draft, locksText]);

  const dirty = !areSettingsEqual(normalizedDraft, settings);

  const closeSettings = useCallback((): void => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) {
        return;
      }

      if (panelRef.current?.contains(eventTarget)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeSettings();
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [closeSettings, open]);

  function updateDraft(nextDraft: AppSettings) {
    setDraft(normalizeSettings(nextDraft));
  }

  function resetDraftFromSettings(nextSettings: AppSettings): void {
    setDraft(nextSettings);
    setLocksText(formatLocks(nextSettings.operatorDefaults.locks));
    setImportError(null);
  }

  function openSettings(): void {
    resetDraftFromSettings(settings);
    setStatusMessage(null);
    setOpen(true);
  }

  function toggleSettings(): void {
    if (open) {
      closeSettings();
      return;
    }

    openSettings();
  }

  function handleQuickThemeChange(themeMode: AppSettings["appearance"]["themeMode"]): void {
    if (settings.appearance.themeMode === themeMode) {
      return;
    }

    const nextProfile = saveSettings(normalizeSettings({
      ...settings,
      appearance: {
        ...settings.appearance,
        themeMode,
      },
    }));
    resetDraftFromSettings(nextProfile.settings);
    setStatusMessage(`${formatThemeToggleLabel(themeMode)} theme applied.`);
  }

  function handleQuickGuidedModeChange(guidedMode: boolean): void {
    if (settings.layout.guidedMode === guidedMode) {
      return;
    }

    const nextProfile = saveSettings(normalizeSettings({
      ...settings,
      layout: {
        ...settings.layout,
        guidedMode,
      },
    }));
    resetDraftFromSettings(nextProfile.settings);
    setStatusMessage(`${formatGuidedModeToggleLabel(guidedMode)} mode applied.`);
  }

  function handleSave(): void {
    const nextProfile = saveSettings(normalizedDraft);
    resetDraftFromSettings(nextProfile.settings);
    setStatusMessage(`Settings saved at ${new Date(nextProfile.updatedAt).toLocaleTimeString()}.`);
    closeSettings();
  }

  function handleRevert(): void {
    resetDraftFromSettings(settings);
    setStatusMessage("Unsaved settings changes were reverted.");
  }

  function handleReset(): void {
    if (typeof window !== "undefined" && !window.confirm("Reset saved settings to defaults?")) {
      return;
    }

    const nextProfile = resetSettings();
    resetDraftFromSettings(nextProfile.settings);
    setStatusMessage("Saved settings were reset to defaults.");
  }

  function handleExport(): void {
    if (typeof window === "undefined") {
      return;
    }

    const exportBody = exportSettingsProfile(profile);
    const blob = new Blob([exportBody], { type: "application/json" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "o3de-codex-vx001-settings-profile.json";
    link.click();
    window.URL.revokeObjectURL(downloadUrl);
    setStatusMessage("Saved settings profile exported.");
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const importedFile = event.target.files?.[0];
    event.target.value = "";
    if (!importedFile) {
      return;
    }

    try {
      const rawProfile = await importedFile.text();
      const importedProfile = importSettingsProfile(rawProfile);
      setDraft(importedProfile.settings);
      setLocksText(formatLocks(importedProfile.settings.operatorDefaults.locks));
      setImportError(null);
      setStatusMessage("Imported profile loaded into draft. Save Settings to apply it.");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Profile import failed.");
    }
  }

  return (
    <>
      <div style={launcherClusterStyle}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={toggleSettings}
          style={launcherButtonStyle}
        >
          {buttonLabel}
        </button>

        <div style={launcherThemeRowStyle} role="group" aria-label="Theme mode quick toggle">
          {THEME_MODE_VALUES.map((value) => {
            const active = settings.appearance.themeMode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleQuickThemeChange(value)}
                aria-pressed={active}
                title={`Apply ${formatThemeToggleLabel(value)} theme without opening the full settings panel.`}
                style={{
                  ...launcherThemeButtonStyle,
                  ...(active ? launcherThemeButtonActiveStyle : null),
                }}
              >
                {formatThemeToggleLabel(value)}
              </button>
            );
          })}
        </div>

        <div style={launcherThemeRowStyle} role="group" aria-label="Guidance mode quick toggle">
          {[true, false].map((value) => {
            const active = settings.layout.guidedMode === value;
            const label = formatGuidedModeToggleLabel(value);
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleQuickGuidedModeChange(value)}
                aria-pressed={active}
                title={`${label} mode ${value ? "keeps beginner-safe panels visible first" : "shows advanced panels by default"}.`}
                style={{
                  ...launcherThemeButtonStyle,
                  ...(active ? launcherThemeButtonActiveStyle : null),
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {open && portalHost ? createPortal((
        <div
          style={overlayStyle}
          role="presentation"
          onClick={closeSettings}
        >
          <section
            ref={panelRef}
            id="settings-profile-dialog"
            aria-label="Settings profile"
            aria-modal="true"
            role="dialog"
            style={panelStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={panelHeaderStyle}>
              <div style={{ display: "grid", gap: 6 }}>
                <span style={eyebrowStyle}>Local Settings Profile</span>
                <h2 style={panelTitleStyle}>Shell appearance, layout, and operator defaults</h2>
                <p style={panelBodyStyle}>
                  Local profile format: versioned JSON stored in browser-local storage. Transient
                  backend responses, catalog fetches, logs, and artifacts stay outside this profile.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close settings"
                onClick={closeSettings}
                style={closeButtonStyle}
              >
                Close
              </button>
            </div>

            <div style={panelGridStyle}>
              <section style={cardStyle}>
                <strong style={cardTitleStyle}>Appearance</strong>

                <label style={fieldStyle}>
                  Theme mode
                  <select
                    value={draft.appearance.themeMode}
                    onChange={(event) => updateDraft({
                      ...draft,
                      appearance: {
                        ...draft.appearance,
                        themeMode: event.target.value as AppSettings["appearance"]["themeMode"],
                      },
                    })}
                    style={inputStyle}
                  >
                    {THEME_MODE_VALUES.map((value) => (
                      <option key={value} value={value}>{formatFieldLabel(value)}</option>
                    ))}
                  </select>
                </label>

                <label style={fieldStyle}>
                  Accent color
                  <input
                    type="color"
                    value={draft.appearance.accentColor}
                    onChange={(event) => updateDraft({
                      ...draft,
                      appearance: { ...draft.appearance, accentColor: event.target.value },
                    })}
                    style={{ ...inputStyle, minHeight: 44 }}
                  />
                </label>

                <label style={fieldStyle}>
                  Density
                  <select
                    value={draft.appearance.density}
                    onChange={(event) => updateDraft({
                      ...draft,
                      appearance: {
                        ...draft.appearance,
                        density: event.target.value as AppSettings["appearance"]["density"],
                      },
                    })}
                    style={inputStyle}
                  >
                    {DENSITY_VALUES.map((value) => (
                      <option key={value} value={value}>{formatFieldLabel(value)}</option>
                    ))}
                  </select>
                </label>

                <label style={fieldStyle}>
                  Content max width
                  <select
                    value={draft.appearance.contentMaxWidth}
                    onChange={(event) => updateDraft({
                      ...draft,
                      appearance: {
                        ...draft.appearance,
                        contentMaxWidth: event.target.value as AppSettings["appearance"]["contentMaxWidth"],
                      },
                    })}
                    style={inputStyle}
                  >
                    {CONTENT_MAX_WIDTH_VALUES.map((value) => (
                      <option key={value} value={value}>{formatFieldLabel(value)}</option>
                    ))}
                  </select>
                </label>

                <label style={fieldStyle}>
                  Card radius
                  <select
                    value={draft.appearance.cardRadius}
                    onChange={(event) => updateDraft({
                      ...draft,
                      appearance: {
                        ...draft.appearance,
                        cardRadius: event.target.value as AppSettings["appearance"]["cardRadius"],
                      },
                    })}
                    style={inputStyle}
                  >
                    {CARD_RADIUS_VALUES.map((value) => (
                      <option key={value} value={value}>{formatFieldLabel(value)}</option>
                    ))}
                  </select>
                </label>

                <label style={fieldStyle}>
                  Font scale
                  <select
                    value={String(draft.appearance.fontScale)}
                    onChange={(event) => updateDraft({
                      ...draft,
                      appearance: { ...draft.appearance, fontScale: Number(event.target.value) },
                    })}
                    style={inputStyle}
                  >
                    {[0.95, 1, 1.05, 1.1].map((value) => (
                      <option key={value} value={value}>{value.toFixed(2)}x</option>
                    ))}
                  </select>
                </label>

                <label style={checkboxRowStyle}>
                  <input
                    type="checkbox"
                    checked={draft.appearance.reducedMotion}
                    onChange={(event) => updateDraft({
                      ...draft,
                      appearance: { ...draft.appearance, reducedMotion: event.target.checked },
                    })}
                  />
                  Reduce motion
                </label>
              </section>

              <section style={cardStyle}>
                <strong style={cardTitleStyle}>Layout</strong>

                <label style={fieldStyle}>
                  Preferred landing section
                  <select
                    value={draft.layout.preferredLandingSection}
                    onChange={(event) => updateDraft({
                      ...draft,
                      layout: {
                        ...draft.layout,
                        preferredLandingSection: event.target.value as AppSettings["layout"]["preferredLandingSection"],
                      },
                    })}
                    style={inputStyle}
                  >
                    {LANDING_SECTION_VALUES.map((value) => (
                      <option key={value} value={value}>{formatFieldLabel(value)}</option>
                    ))}
                  </select>
                </label>

                <label style={checkboxRowStyle}>
                  <input
                    type="checkbox"
                    checked={draft.layout.showDesktopTelemetry}
                    onChange={(event) => updateDraft({
                      ...draft,
                      layout: { ...draft.layout, showDesktopTelemetry: event.target.checked },
                    })}
                  />
                  Show desktop telemetry and quick stats
                </label>

                <label style={checkboxRowStyle}>
                  <input
                    type="checkbox"
                    checked={draft.layout.guidedMode}
                    onChange={(event) => updateDraft({
                      ...draft,
                      layout: { ...draft.layout, guidedMode: event.target.checked },
                    })}
                  />
                  Use guided mode to keep advanced panels collapsed by default
                </label>
              </section>

              <section style={cardStyle}>
                <strong style={cardTitleStyle}>Operator Defaults</strong>

                <label style={fieldStyle}>
                  Default project root
                  <input
                    value={draft.operatorDefaults.projectRoot}
                    onChange={(event) => updateDraft({
                      ...draft,
                      operatorDefaults: { ...draft.operatorDefaults, projectRoot: event.target.value },
                    })}
                    placeholder="Leave blank to use the detected local target."
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  Default engine root
                  <input
                    value={draft.operatorDefaults.engineRoot}
                    onChange={(event) => updateDraft({
                      ...draft,
                      operatorDefaults: { ...draft.operatorDefaults, engineRoot: event.target.value },
                    })}
                    placeholder="Leave blank to use the detected local target."
                    style={inputStyle}
                  />
                </label>

                <label style={checkboxRowStyle}>
                  <input
                    type="checkbox"
                    checked={draft.operatorDefaults.dryRun}
                    onChange={(event) => updateDraft({
                      ...draft,
                      operatorDefaults: { ...draft.operatorDefaults, dryRun: event.target.checked },
                    })}
                  />
                  Default dry run
                </label>

                <label style={fieldStyle}>
                  Default timeout (seconds)
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={draft.operatorDefaults.timeoutSeconds}
                    onChange={(event) => updateDraft({
                      ...draft,
                      operatorDefaults: {
                        ...draft.operatorDefaults,
                        timeoutSeconds: Number(event.target.value) || 1,
                      },
                    })}
                    style={inputStyle}
                  />
                </label>

                <label style={fieldStyle}>
                  Default locks
                  <input
                    value={locksText}
                    onChange={(event) => setLocksText(event.target.value)}
                    placeholder={formatLocks(LOCK_NAME_VALUES)}
                    style={inputStyle}
                  />
                </label>

                <p style={helperTextStyle}>
                  Supported locks: {LOCK_NAME_VALUES.join(", ")}
                </p>
              </section>
            </div>

            <div style={footerStyle}>
              <div style={{ display: "grid", gap: 6, flex: "1 1 240px" }}>
                <span style={helperTextStyle}>
                  Saved profile shape stays versioned for forward migrations.
                </span>
                {statusMessage ? <span style={statusTextStyle}>{statusMessage}</span> : null}
                {importError ? <span style={errorTextStyle}>{importError}</span> : null}
              </div>

              <div style={actionRowStyle}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  onChange={(event) => {
                    void handleImportFile(event);
                  }}
                  style={{ display: "none" }}
                />
                <button type="button" onClick={handleExport} style={secondaryButtonStyle}>
                  Export Profile
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={secondaryButtonStyle}
                >
                  Import Profile
                </button>
                <button
                  type="button"
                  onClick={handleRevert}
                  disabled={!dirty}
                  style={secondaryButtonStyle}
                >
                  Revert Changes
                </button>
                <button type="button" onClick={handleReset} style={secondaryButtonStyle}>
                  Reset to Defaults
                </button>
                <button type="button" onClick={handleSave} disabled={!dirty} style={primaryButtonStyle}>
                  Save Settings
                </button>
              </div>
            </div>
          </section>
        </div>
      ), portalHost) : null}
    </>
  );
}

const launcherButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "7px 12px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  boxShadow: "var(--app-shadow-soft)",
  cursor: "pointer",
} satisfies CSSProperties;

const launcherClusterStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
} satisfies CSSProperties;

const launcherThemeRowStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: 4,
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  background: "var(--app-panel-bg)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const launcherThemeButtonStyle = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  borderRadius: "var(--app-pill-radius)",
  padding: "7px 10px",
  background: "transparent",
  color: "var(--app-text-color)",
  cursor: "pointer",
  fontSize: 12,
} satisfies CSSProperties;

const launcherThemeButtonActiveStyle = {
  background: "var(--app-info-bg)",
  borderColor: "var(--app-info-border)",
  color: "var(--app-info-text)",
} satisfies CSSProperties;

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(8, 14, 28, 0.42)",
  backdropFilter: "blur(8px)",
  display: "grid",
  placeItems: "center",
  padding: 18,
  zIndex: 1000,
} satisfies CSSProperties;

const panelStyle = {
  width: "min(960px, 100%)",
  maxHeight: "min(92vh, 920px)",
  overflowY: "auto" as const,
  display: "grid",
  gap: 18,
  padding: "var(--app-panel-padding)",
  borderRadius: "var(--app-window-radius)",
  background: "var(--app-panel-bg-alt)",
  border: "1px solid var(--app-panel-border-strong)",
  boxShadow: "var(--app-shadow-strong)",
} satisfies CSSProperties;

const panelHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
} satisfies CSSProperties;

const eyebrowStyle = {
  color: "var(--app-subtle-color)",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
} satisfies CSSProperties;

const panelTitleStyle = {
  margin: 0,
  color: "var(--app-text-color)",
  fontSize: 24,
  lineHeight: 1.1,
} satisfies CSSProperties;

const panelBodyStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.55,
} satisfies CSSProperties;

const closeButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "7px 12px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;

const panelGridStyle = {
  display: "grid",
  gap: 14,
  alignItems: "start",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
} satisfies CSSProperties;

const cardStyle = {
  display: "grid",
  gap: 12,
  padding: "var(--app-panel-padding)",
  borderRadius: "var(--app-panel-radius)",
  background: "var(--app-panel-bg-muted)",
  border: "1px solid var(--app-panel-border)",
  boxShadow: "var(--app-shadow-soft)",
} satisfies CSSProperties;

const cardTitleStyle = {
  color: "var(--app-text-color)",
  fontSize: 16,
} satisfies CSSProperties;

const fieldStyle = {
  display: "grid",
  gap: 6,
  color: "var(--app-text-color)",
  fontSize: 13,
} satisfies CSSProperties;

const checkboxRowStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  color: "var(--app-text-color)",
} satisfies CSSProperties;

const inputStyle = {
  width: "100%",
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-card-radius)",
  padding: "10px 12px",
  background: "var(--app-input-bg)",
  color: "var(--app-text-color)",
  font: "inherit",
  boxSizing: "border-box" as const,
} satisfies CSSProperties;

const helperTextStyle = {
  margin: 0,
  color: "var(--app-muted-color)",
  lineHeight: 1.5,
  fontSize: 12,
} satisfies CSSProperties;

const footerStyle = {
  display: "flex",
  gap: 16,
  justifyContent: "space-between",
  alignItems: "flex-end",
  flexWrap: "wrap",
} satisfies CSSProperties;

const actionRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
} satisfies CSSProperties;

const secondaryButtonStyle = {
  border: "1px solid var(--app-panel-border)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 12px",
  background: "var(--app-panel-bg)",
  color: "var(--app-text-color)",
  cursor: "pointer",
} satisfies CSSProperties;

const primaryButtonStyle = {
  border: "1px solid var(--app-accent-strong)",
  borderRadius: "var(--app-pill-radius)",
  padding: "8px 14px",
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  cursor: "pointer",
} satisfies CSSProperties;

const statusTextStyle = {
  color: "var(--app-text-color)",
  fontSize: 12,
} satisfies CSSProperties;

const errorTextStyle = {
  color: "var(--app-danger-text)",
  fontSize: 12,
} satisfies CSSProperties;
