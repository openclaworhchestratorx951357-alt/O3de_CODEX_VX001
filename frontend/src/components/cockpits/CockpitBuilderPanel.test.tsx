import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import CockpitBuilderPanel from "./CockpitBuilderPanel";

describe("CockpitBuilderPanel", () => {
  it("renders cockpit builder UI", () => {
    render(<CockpitBuilderPanel />);
    expect(screen.getByLabelText("Cockpit Builder panel")).toBeInTheDocument();
    expect(screen.getByLabelText("Cockpit builder JSON preview")).toBeInTheDocument();
  });

  it("generates cockpit definition JSON preview from form fields", () => {
    render(<CockpitBuilderPanel />);

    fireEvent.change(screen.getByLabelText("Cockpit name"), { target: { value: "Sky Arena Cockpit" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "create" } });
    fireEvent.change(screen.getByLabelText("Subtitle"), { target: { value: "Sky arena mission cockpit" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Guides sky arena authoring." } });
    fireEvent.change(screen.getByLabelText("Home card title"), { target: { value: "Sky Arena" } });
    fireEvent.change(screen.getByLabelText("Home card description"), { target: { value: "Launch sky arena cockpit" } });
    fireEvent.change(screen.getByLabelText("Prompt template text (preview/copy only)"), {
      target: { value: "Inspect sky arena target. Do not mutate content." },
    });

    const previewJson = screen.getByLabelText("Cockpit builder JSON preview").textContent ?? "{}";
    const preview = JSON.parse(previewJson) as {
      id: string;
      title: string;
      category: string;
      homeCard: { title: string };
      panels: Array<{ id: string }>;
      promptTemplates: Array<{ autoExecute: boolean }>;
    };

    expect(preview.id).toBe("sky-arena-cockpit");
    expect(preview.title).toBe("Sky Arena Cockpit");
    expect(preview.category).toBe("create");
    expect(preview.homeCard.title).toBe("Sky Arena");
    expect(preview.panels.length).toBeGreaterThan(0);
    expect(preview.promptTemplates[0]?.autoExecute).toBe(false);
  });

  it("does not execute or dispatch actions from preview controls", () => {
    render(<CockpitBuilderPanel />);
    expect(screen.queryByRole("button", { name: /execute/i })).not.toBeInTheDocument();
  });
});
