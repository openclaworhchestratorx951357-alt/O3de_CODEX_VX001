import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OperatorGuidePanel from "./OperatorGuidePanel";

describe("OperatorGuidePanel", () => {
  it("renders capability posture and workspace guidance from the shared catalog", () => {
    render(<OperatorGuidePanel />);

    expect(
      screen.getByText("Use the desktop with the UI and docs in sync"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Canonical backend: http:\/\/127\.0\.0\.1:8000/i)).toBeInTheDocument();
    expect(screen.getByText(/Admitted real: editor\.session\.open, editor\.level\.open/i)).toBeInTheDocument();
    expect(screen.getByText(/Excluded: editor\.entity\.create/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Operator proof checklist for canonical 127.0.0.1:8000" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Confirm canonical target wiring")).toBeInTheDocument();
    expect(screen.getByText("Invoke-RestMethod 'http://127.0.0.1:8000/o3de/target'")).toBeInTheDocument();
    expect(screen.getByText("Prove that editor.entity.create remains excluded")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Command Center" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Runtime" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Panel-level instructions and control tips" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dispatch Tool Request")).toBeInTheDocument();
    expect(
      screen.getByText("docs/APP-OPERATOR-GUIDE.md", { selector: "code" }),
    ).toBeInTheDocument();
  });
});
