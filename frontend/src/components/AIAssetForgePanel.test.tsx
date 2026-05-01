import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AIAssetForgePanel from "./AIAssetForgePanel";

vi.mock("../lib/api", () => ({
  fetchAssetForgeStudioStatus: vi.fn(async () => null),
  fetchAssetForgeTask: vi.fn(async () => null),
  fetchAssetForgeProviderStatus: vi.fn(async () => null),
  fetchAssetForgeBlenderStatus: vi.fn(async () => null),
}));

describe("AIAssetForgePanel", () => {
  it("renders Asset Forge as a Blender-style editor cockpit", () => {
    render(<AIAssetForgePanel />);

    expect(screen.getByLabelText("AI Asset Forge")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge Blender-style editor cockpit")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge workflow stages")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge left tool and outliner area")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge center viewport area")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge right inspector area")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge bottom evidence prompt and log drawer")).toBeInTheDocument();
    expect(screen.getByText("Asset Forge Studio")).toBeInTheDocument();
    expect(screen.getByText("3D Viewport")).toBeInTheDocument();
  });
});
