import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AIAssetForgePanel from "./AIAssetForgePanel";

const apiMocks = vi.hoisted(() => ({
  fetchAssetForgeTask: vi.fn(async () => null),
  fetchAssetForgeProviderStatus: vi.fn(async () => null),
  fetchAssetForgeBlenderStatus: vi.fn(async () => null),
}));

vi.mock("../lib/api", () => apiMocks);

vi.mock("./AssetForgeStudioPacket01", () => ({
  default: () => <div>AssetForgeStudioPacket01 stub</div>,
}));

vi.mock("./movieStudio/MovieStudioPanel", () => ({
  default: () => <div>MovieStudioPanel stub</div>,
}));

describe("AIAssetForgePanel", () => {
  it("defaults to Asset Forge mode and switches to Movie Studio mode", async () => {
    render(<AIAssetForgePanel />);

    expect(await screen.findByText("AssetForgeStudioPacket01 stub")).toBeInTheDocument();
    expect(screen.queryByText("MovieStudioPanel stub")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Movie Studio Timeline" }));

    expect(await screen.findByText("MovieStudioPanel stub")).toBeInTheDocument();
    expect(screen.queryByText("AssetForgeStudioPacket01 stub")).not.toBeInTheDocument();
  });
});
