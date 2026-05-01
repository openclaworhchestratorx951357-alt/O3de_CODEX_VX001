import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AIAssetForgePanel from "./AIAssetForgePanel";
import type { AssetForgeEditorModelRecord } from "../types/contracts";

const apiMocks = vi.hoisted(() => ({
  fetchAssetForgeTask: vi.fn(async () => null),
  fetchAssetForgeProviderStatus: vi.fn(async () => null),
  fetchAssetForgeBlenderStatus: vi.fn(async () => null),
  fetchAssetForgeEditorModel: vi.fn<() => Promise<AssetForgeEditorModelRecord>>(),
}));

vi.mock("../lib/api", () => ({
  fetchAssetForgeTask: apiMocks.fetchAssetForgeTask,
  fetchAssetForgeProviderStatus: apiMocks.fetchAssetForgeProviderStatus,
  fetchAssetForgeBlenderStatus: apiMocks.fetchAssetForgeBlenderStatus,
  fetchAssetForgeEditorModel: apiMocks.fetchAssetForgeEditorModel,
}));

describe("AIAssetForgePanel", () => {
  it("fetches the backend editor model and renders the cockpit shell", async () => {
    apiMocks.fetchAssetForgeEditorModel.mockResolvedValueOnce({
      source: "asset-forge-editor-model",
      inspection_surface: "read_only",
      editor_model_status: "available",
      execution_admitted: false,
      mutation_admitted: false,
      provider_generation_admitted: false,
      blender_execution_admitted: false,
      asset_processor_execution_admitted: false,
      placement_write_admitted: false,
      active_tool_id: "transform",
      viewport: {
        label: "Front Ortho",
        mode: "Object Mode",
        shading_modes: ["Solid", "Wireframe", "Material Preview", "O3DE Preview"],
        active_shading_mode: "Solid",
        grid_visible: true,
        preview_status: "demo_no_real_model_loaded",
        selected_object_label: "Weathered Ivy Arch",
        overlays: ["Axis: Z-up demo"],
      },
      tools: [],
      context_menu_groups: [],
      outliner: [],
      transform: {
        location: { x: 0, y: 0, z: 0, admitted: false },
        rotation: { x: 0, y: 0, z: 0, admitted: false },
        scale: { x: 1, y: 1, z: 1, admitted: false },
        dimensions: { x: 1, y: 1, z: 1, admitted: false },
        edit_status: "blocked",
        blocked_reason: "blocked",
      },
      properties: {
        selected_object: "Weathered Ivy Arch",
        material_preview_status: "preview",
        sections: [],
        rows: [],
      },
      material_preview: {
        preview_label: "Preview sphere/checker",
        preview_background: "checker",
        tabs: ["Surface", "Wire", "Volume", "Halo"],
        active_tab: "Surface",
        rows: [],
        mutation_admitted: false,
        blocked_reason: "Material mutation blocked",
      },
      timeline: {
        start_frame: 0,
        end_frame: 240,
        current_frame: 1,
        status: "read_only_status_strip",
      },
      evidence: {
        latest_run_id: null,
        latest_execution_id: null,
        latest_artifact_id: null,
        stage_write_evidence_reference: null,
        stage_write_readback_reference: null,
        stage_write_readback_status: "not_run",
      },
      prompt_templates: [],
      blocked_capabilities: [],
      next_safe_action: "Stay read-only.",
    });

    render(<AIAssetForgePanel />);

    await waitFor(() => {
      expect(apiMocks.fetchAssetForgeEditorModel).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByLabelText("AI Asset Forge")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge Blender-style editor cockpit")).toBeInTheDocument();
    expect(screen.getByText("Asset Forge Studio")).toBeInTheDocument();
  });

  it("shows backend-unavailable fallback copy when editor-model fetch fails", async () => {
    apiMocks.fetchAssetForgeEditorModel.mockRejectedValueOnce(new Error("editor-model unavailable"));

    render(<AIAssetForgePanel />);

    await waitFor(() => {
      expect(screen.getByText("Editor model backend unavailable; using frontend fallback. No execution admitted.")).toBeInTheDocument();
    });
  });
});
