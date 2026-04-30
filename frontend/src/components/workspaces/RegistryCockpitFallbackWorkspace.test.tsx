import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CockpitId } from "../cockpits/registry/cockpitRegistryTypes";
import RegistryCockpitFallbackWorkspace from "./RegistryCockpitFallbackWorkspace";

describe("RegistryCockpitFallbackWorkspace", () => {
  it("renders registered cockpit metadata without executing any actions", () => {
    const onSelectWorkspace = vi.fn();
    render(
      <RegistryCockpitFallbackWorkspace
        cockpitId="create-game"
        onSelectWorkspace={onSelectWorkspace}
      />,
    );

    expect(screen.getByLabelText("registry fallback cockpit workspace")).toBeInTheDocument();
    expect(screen.getByText("Create Game")).toBeInTheDocument();
    expect(screen.getByText(/This cockpit is registered in metadata/i)).toBeInTheDocument();
    expect(screen.getAllByText(/autoExecute=false/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/top:/i)).toBeInTheDocument();
    expect(screen.getByText(/left:/i)).toBeInTheDocument();
    expect(screen.getByText(/center:/i)).toBeInTheDocument();
  });

  it("falls back safely when cockpit id is unknown", () => {
    const onSelectWorkspace = vi.fn();
    render(
      <RegistryCockpitFallbackWorkspace
        cockpitId={"future-unknown-cockpit" as CockpitId}
        onSelectWorkspace={onSelectWorkspace}
      />,
    );

    expect(screen.getByText("Cockpit unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Home" }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("home");
  });
});
