import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AgentControlPanel from "./AgentControlPanel";
import type { AgentDefinition } from "../types/contracts";

const agents: AgentDefinition[] = [
  {
    id: "editor-control",
    name: "Editor Control",
    role: "Owns admitted real editor session and level-open lanes.",
    locks: ["editor_session"],
    owned_tools: ["editor.session.open", "editor.level.open"],
  },
];

describe("AgentControlPanel", () => {
  it("renders guide details and agent card tooltips from the shared catalog", () => {
    render(<AgentControlPanel items={agents} />);

    expect(screen.getByText("How to use this panel")).toBeInTheDocument();
    expect(screen.getByText("Editor Control").closest("section")).toHaveAttribute(
      "title",
      "Review each agent card to confirm ownership, coordination locks, and the tool lane it is expected to manage.",
    );
  });
});
