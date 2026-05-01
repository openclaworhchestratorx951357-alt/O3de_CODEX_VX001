import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AIAssetForgePanel from "./AIAssetForgePanel";

const apiMocks = vi.hoisted(() => ({
  fetchAssetForgeTask: vi.fn(async () => null),
  fetchAssetForgeProviderStatus: vi.fn(async () => null),
  fetchAssetForgeBlenderStatus: vi.fn(async () => null),
  fetchAssetForgeEditorModel: vi.fn(async () => null),
}));

vi.mock("../lib/api", () => apiMocks);

vi.mock("./assetForge/AssetForgeBlenderCockpit", () => ({
  default: (props: { onOpenMovieStudioTimeline?: () => void }) => (
    <div>
      <div>AssetForgeBlenderCockpit stub</div>
      <button type="button" onClick={() => props.onOpenMovieStudioTimeline?.()}>
        Open Movie Studio via cockpit menu
      </button>
    </div>
  ),
}));

vi.mock("./movieStudio/MovieStudioPanel", () => ({
  default: () => <div>MovieStudioPanel stub</div>,
}));

describe("AIAssetForgePanel", () => {
  it("fetches editor model and defaults to Asset Forge mode", async () => {
    render(<AIAssetForgePanel />);

    expect(await screen.findByLabelText("AI Asset Forge")).toBeInTheDocument();
    expect(await screen.findByText("AssetForgeBlenderCockpit stub")).toBeInTheDocument();
    expect(screen.queryByText("MovieStudioPanel stub")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.fetchAssetForgeEditorModel).toHaveBeenCalledTimes(1);
    });
  });

  it("switches from Asset Forge mode to Movie Studio mode", async () => {
    render(<AIAssetForgePanel />);

    expect(await screen.findByText("AssetForgeBlenderCockpit stub")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Movie Studio Timeline" }));
    expect(await screen.findByText("MovieStudioPanel stub")).toBeInTheDocument();
    expect(screen.queryByText("AssetForgeBlenderCockpit stub")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Asset Forge Studio" }));
    expect(await screen.findByText("AssetForgeBlenderCockpit stub")).toBeInTheDocument();
  });

  it("switches to Movie Studio when the cockpit requests mode handoff", async () => {
    render(<AIAssetForgePanel />);
    expect(await screen.findByText("AssetForgeBlenderCockpit stub")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Movie Studio via cockpit menu" }));
    expect(await screen.findByText("MovieStudioPanel stub")).toBeInTheDocument();
  });
});
