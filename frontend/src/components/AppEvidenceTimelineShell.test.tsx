import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppEvidenceTimelineShell from "./AppEvidenceTimelineShell";

describe("AppEvidenceTimelineShell", () => {
  it("renders cross-domain evidence timeline truth labels without implying execution admission", () => {
    render(<AppEvidenceTimelineShell />);

    expect(screen.getByTestId("app-evidence-timeline-shell")).toBeInTheDocument();
    expect(screen.getByText("App-wide Evidence Timeline shell (static fixture)")).toBeInTheDocument();
    expect(screen.getByText("Static fixture only")).toBeInTheDocument();
    expect(screen.getByText("No backend execution admission changes")).toBeInTheDocument();

    expect(screen.getAllByText("validation.report.intake").length).toBeGreaterThan(0);
    expect(screen.getByText("asset_forge.o3de.stage_write.v1")).toBeInTheDocument();
    expect(screen.getByText("editor.component.property.write.narrow")).toBeInTheDocument();

    expect(
      screen.getByText("Approval/session dashboard shell", { selector: "strong" }),
    ).toBeInTheDocument();
  });
});
