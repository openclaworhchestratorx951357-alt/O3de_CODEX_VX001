import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import CatalogPanel from "./CatalogPanel";

describe("CatalogPanel", () => {
  it("guides beginners when the live catalog has not loaded yet", () => {
    render(<CatalogPanel agents={[]} />);

    expect(screen.getByText("No live tools catalog has been returned yet.")).toBeInTheDocument();
    expect(screen.getByText("Load the live catalog first")).toBeInTheDocument();
    expect(screen.getByText(/Confirm the local backend is running on http:\/\/127\.0\.0\.1:8000/i)).toBeInTheDocument();
    expect(screen.getByText("Safe first check")).toBeInTheDocument();
  });

  it("renders quick-start guidance and keeps tool details behind disclosures", async () => {
    render(
      <CatalogPanel
        agents={[
          {
            id: "editor-control",
            name: "Editor Control",
            role: "Owns narrow editor-control dispatch.",
            summary: "Use this family for editor session, level, and narrow entity/component work.",
            tools: [
              {
                name: "editor.session.open",
                description: "Open an editor session.",
                approval_class: "project_write",
                adapter_family: "editor-control",
                capability_status: "real-authoring",
                real_adapter_availability: true,
                default_locks: ["editor_session"],
                default_timeout_s: 30,
                risk: "medium",
                tags: ["editor", "session"],
              },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("Dispatch first steps")).toBeInTheDocument();
    expect(screen.getByText(/Read the owning agent family before assuming a tool belongs on the current lane/i)).toBeInTheDocument();
    const publishedToolsLabels = screen.getAllByText("Published tools");
    expect(publishedToolsLabels.length).toBeGreaterThan(0);

    const publishedToolsToggle = publishedToolsLabels.find((element) => element.tagName === "SPAN");
    expect(publishedToolsToggle).toBeDefined();

    const publishedToolsSection = publishedToolsToggle?.closest("details");
    expect(publishedToolsSection).not.toBeNull();
    expect(publishedToolsSection).not.toHaveAttribute("open");

    await userEvent.click(publishedToolsToggle as HTMLElement);
    expect(publishedToolsSection).toHaveAttribute("open");
    expect(screen.getByText("editor.session.open")).toBeInTheDocument();

    const toolArticle = screen.getByText("editor.session.open").closest("article");
    expect(toolArticle).not.toBeNull();

    const meaningSection = within(toolArticle as HTMLElement).getByText("Meaning and defaults").closest("details");
    expect(meaningSection).not.toBeNull();
    expect(meaningSection).not.toHaveAttribute("open");

    await userEvent.click(within(toolArticle as HTMLElement).getByText("Meaning and defaults"));
    expect(meaningSection).toHaveAttribute("open");
    expect(within(meaningSection as HTMLElement).getByText("Default timeout")).toBeInTheDocument();
    expect(within(meaningSection as HTMLElement).getByText("30s")).toBeInTheDocument();
    expect(
      within(meaningSection as HTMLElement).getByText(/Live-validated real authoring in hybrid mode/i),
    ).toBeInTheDocument();
  });
});
