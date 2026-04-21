import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SETTINGS_PROFILE_STORAGE_KEY } from "../../types/settings";
import { createSettingsProfile, DEFAULT_ACCENT_COLOR } from "./defaults";
import { useThemeTokens } from "./hooks";
import { SettingsProvider } from "./context";

let systemPrefersDark = false;
const mediaQueryListeners = new Set<(event: MediaQueryListEvent) => void>();

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: systemPrefersDark,
    media: query,
    onchange: null,
    addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      mediaQueryListeners.add(listener);
    }),
    removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      mediaQueryListeners.delete(listener);
    }),
    addEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === "change") {
        mediaQueryListeners.add(listener);
      }
    }),
    removeEventListener: vi.fn((event: string, listener: (event: MediaQueryListEvent) => void) => {
      if (event === "change") {
        mediaQueryListeners.delete(listener);
      }
    }),
    dispatchEvent: vi.fn(),
  })),
});

function emitSystemThemeChange(matches: boolean) {
  systemPrefersDark = matches;
  const event = {
    matches,
    media: "(prefers-color-scheme: dark)",
  } as MediaQueryListEvent;

  for (const listener of mediaQueryListeners) {
    listener(event);
  }
}

function ThemeProbe() {
  const themeTokens = useThemeTokens();

  return (
    <output data-testid="theme-probe">
      {[
        themeTokens.resolvedThemeMode,
        themeTokens.compactDensity ? "compact" : "comfortable",
        String(themeTokens.contentMaxWidthPx),
        String(themeTokens.panelPaddingPx),
      ].join("|")}
    </output>
  );
}

describe("SettingsProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.style.colorScheme = "";
    mediaQueryListeners.clear();
    systemPrefersDark = false;
    vi.clearAllMocks();
  });

  it("applies saved compact layout tokens to the provider wrapper", () => {
    window.localStorage.setItem(
      SETTINGS_PROFILE_STORAGE_KEY,
      JSON.stringify(createSettingsProfile({
        appearance: {
          themeMode: "dark",
          accentColor: DEFAULT_ACCENT_COLOR,
          density: "compact",
          contentMaxWidth: "focused",
          cardRadius: "pillowed",
          reducedMotion: true,
          fontScale: 1.1,
        },
        layout: {
          preferredLandingSection: "runtime",
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
        <ThemeProbe />
      </SettingsProvider>,
    );

    const providerRoot = container.firstElementChild as HTMLElement;

    expect(screen.getByTestId("theme-probe")).toHaveTextContent("dark|compact|1240|14");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(providerRoot).toHaveStyle("font-size: calc(16px * var(--app-font-scale))");
    expect(providerRoot.getAttribute("style")).toContain("--app-shell-max-width: 1240px");
    expect(providerRoot.getAttribute("style")).toContain("--app-panel-padding: 14px");
    expect(providerRoot.getAttribute("style")).toContain("--app-transition: none");
  });

  it("tracks live system theme changes for system-mode profiles", async () => {
    systemPrefersDark = true;
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

    render(
      <SettingsProvider>
        <ThemeProbe />
      </SettingsProvider>,
    );

    expect(screen.getByTestId("theme-probe")).toHaveTextContent("dark|comfortable|1480|18");
    expect(document.documentElement.style.colorScheme).toBe("dark");

    act(() => {
      emitSystemThemeChange(false);
    });

    await waitFor(() => {
      expect(screen.getByTestId("theme-probe")).toHaveTextContent("light|comfortable|1480|18");
      expect(document.documentElement.style.colorScheme).toBe("light");
    });
  });
});
