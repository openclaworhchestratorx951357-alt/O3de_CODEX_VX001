import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AssetForgeBlenderCockpit from "./AssetForgeBlenderCockpit";
import type { AssetForgeEditorModelRecord } from "../../types/contracts";

function buildEditorModelFixture(): AssetForgeEditorModelRecord {
  return {
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
      overlays: ["Backend overlay line"],
    },
    tools: [
      {
        tool_id: "transform",
        label: "Transform",
        shortcut: "T",
        group: "transform",
        truth_state: "demo",
        enabled: true,
        selected: true,
        description: "backend model",
        blocked_reason: null,
        next_unlock: null,
        prompt_template_id: null,
        execution_admitted: false,
        mutation_admitted: false,
      },
      {
        tool_id: "backend-tool",
        label: "Backend Tool",
        shortcut: "B",
        group: "object",
        truth_state: "read-only",
        enabled: true,
        selected: false,
        description: "backend model",
        blocked_reason: null,
        next_unlock: null,
        prompt_template_id: null,
        execution_admitted: false,
        mutation_admitted: false,
      },
    ],
    context_menu_groups: [],
    outliner: [
      {
        node_id: "backend-root",
        label: "Backend Root",
        kind: "root",
        depth: 0,
        truth_state: "read-only",
        visible: true,
        selected: true,
      },
    ],
    transform: {},
    properties: {
      selected_object: "Backend Root",
      material_preview_status: "blocked",
      sections: [],
      rows: [
        {
          row_id: "row-1",
          label: "Location X/Y/Z",
          value: "10 / 20 / 30",
          truth_state: "blocked",
        },
      ],
    },
    material_preview: {},
    timeline: {},
    evidence: {},
    prompt_templates: [],
    blocked_capabilities: [],
    next_safe_action: "Review backend model",
  };
}

describe("AssetForgeBlenderCockpit", () => {
  it("renders strict Blender-like shell zones and fallback safety text", () => {
    render(<AssetForgeBlenderCockpit editorModelError="editor model backend unavailable" />);

    expect(screen.getByLabelText("Asset Forge Blender-like editor")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge left tool shelf")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge central 3D viewport")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge right outliner and properties")).toBeInTheDocument();
    expect(screen.getByLabelText("Asset Forge timeline evidence and prompt strip")).toBeInTheDocument();

    expect(screen.getAllByText("Transform").length).toBeGreaterThan(0);
    expect(screen.getByText("Translate")).toBeInTheDocument();
    expect(screen.getByText("Rotate")).toBeInTheDocument();
    expect(screen.getByText("Scale")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Grease Pencil")).toBeInTheDocument();

    expect(screen.getByText(/no provider generation, Blender execution, Asset Processor execution, or O3DE mutation admitted\./i)).toBeInTheDocument();

    expect(screen.queryByText(/^LEFT$/)).toBeNull();
    expect(screen.queryByText(/^CENTER$/)).toBeNull();
    expect(screen.queryByText(/^RIGHT$/)).toBeNull();
    expect(screen.queryByText(/^BOTTOM$/)).toBeNull();
  });

  it("renders tools and outliner rows from backend editor model when provided", () => {
    render(<AssetForgeBlenderCockpit editorModel={buildEditorModelFixture()} />);

    expect(screen.getByText("Backend Tool")).toBeInTheDocument();
    expect(screen.getByText("Backend Root")).toBeInTheDocument();
    expect(screen.getByText("Location X/Y/Z")).toBeInTheDocument();
    expect(screen.getByText("10 / 20 / 30")).toBeInTheDocument();
    expect(screen.getByText("Backend overlay line")).toBeInTheDocument();
  });
});
