import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AIAssetForgePanel from "./AIAssetForgePanel";
import * as api from "../lib/api";

vi.mock("../lib/api", () => ({
  fetchAssetForgeTask: vi.fn(async () => null),
  fetchAssetForgeProviderStatus: vi.fn(async () => null),
  fetchAssetForgeBlenderStatus: vi.fn(async () => null),
  fetchAssetForgeEditorModel: vi.fn(async () => null),
}));

describe("AIAssetForgePanel", () => {
  it("fetches the editor model and renders Blender-like cockpit shell", async () => {
    render(<AIAssetForgePanel />);

    expect(await screen.findByLabelText("AI Asset Forge")).toBeInTheDocument();
    expect(await screen.findByLabelText("Asset Forge Blender-like editor")).toBeInTheDocument();

    await waitFor(() => {
      expect(api.fetchAssetForgeEditorModel).toHaveBeenCalledTimes(1);
    });
  });
});
