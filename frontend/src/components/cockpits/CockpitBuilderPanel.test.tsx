import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CockpitBuilderPanel, {
  COCKPIT_BUILDER_SESSION_PREVIEW_KEY,
  buildCockpitDefinitionPreview,
} from "./CockpitBuilderPanel";

describe("CockpitBuilderPanel", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("builds a cockpit definition preview with required core fields", () => {
    render(<CockpitBuilderPanel />);

    fireEvent.change(screen.getByLabelText("Cockpit name"), {
      target: { value: "Sky Fortress Ops" },
    });
    fireEvent.change(screen.getByLabelText("Cockpit id"), {
      target: { value: "sky-fortress-ops" },
    });
    fireEvent.change(screen.getByLabelText("Cockpit category"), {
      target: { value: "operate" },
    });

    const previewJson = screen.getByTestId("cockpit-builder-json-preview");
    const preview = JSON.parse((previewJson as HTMLTextAreaElement).value) as {
      id: string;
      title: string;
      category: string;
      homeCard: { title: string };
      panels: Array<{ zone: string }>;
    };

    expect(preview.id).toBe("sky-fortress-ops");
    expect(preview.title).toBe("Sky Fortress Ops");
    expect(preview.category).toBe("operate");
    expect(preview.homeCard.title.length).toBeGreaterThan(0);
    expect(preview.panels.length).toBeGreaterThan(0);
    expect(preview.panels.some((panel) => panel.zone === "center")).toBe(true);
  });

  it("keeps generated prompt templates in non-auto-executing mode", () => {
    const preview = buildCockpitDefinitionPreview({
      name: "Template Guard",
      cockpitId: "template-guard",
      category: "build",
      subtitle: "Template guard subtitle",
      description: "Template guard description",
      truthState: "plan-only",
      homeCardTitle: "Template Guard",
      homeCardDescription: "Template Guard Home card",
      primaryActionLabel: "Open Template Guard",
      safetyNote: "No auto execution.",
      layoutStyle: "prompt-workflow",
      includeTopZone: true,
      includeLeftZone: true,
      includeCenterZone: true,
      includeRightZone: true,
      includeBottomZone: true,
      promptTemplates: [
        {
          id: "template-alpha",
          label: "Inspect target",
          text: "Inspect and summarize. Do not mutate.",
          safetyLabels: "read-only, no-mutation",
          truthState: "read-only",
        },
      ],
      blockedCapabilities: [
        {
          id: "blocked-alpha",
          label: "Write operations",
          reason: "No write corridor admitted.",
          nextUnlock: "Design and proof first.",
        },
      ],
    });

    expect(preview.promptTemplates.length).toBe(1);
    expect(preview.promptTemplates[0].autoExecute).toBe(false);
    expect(preview.notes.autoExecute).toBe(false);
    expect(preview.notes.backendDispatch).toBe(false);
  });

  it("copies preview JSON to clipboard and keeps execution safety copy visible", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<CockpitBuilderPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Copy JSON preview" }));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0]?.[0]).toContain("\"notes\"");
    expect(await screen.findByText(/Copied cockpit JSON preview/i)).toBeInTheDocument();
    expect(screen.getByText(/No prompts are executed\. No backend tools are dispatched\./i)).toBeInTheDocument();
  });

  it("stores session-only launcher previews without touching registry files", () => {
    render(<CockpitBuilderPanel />);

    fireEvent.change(screen.getByLabelText("Cockpit id"), {
      target: { value: "session-preview-cockpit" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to Home preview (session-only)" }));

    const raw = window.sessionStorage.getItem(COCKPIT_BUILDER_SESSION_PREVIEW_KEY);
    expect(raw).not.toBeNull();
    const entries = JSON.parse(raw ?? "[]") as Array<{ id: string }>;
    expect(entries[0]?.id).toBe("session-preview-cockpit");
    expect(
      screen.getByText(/This is local\/session-only and does not modify registry files/i),
    ).toBeInTheDocument();
  });
});
