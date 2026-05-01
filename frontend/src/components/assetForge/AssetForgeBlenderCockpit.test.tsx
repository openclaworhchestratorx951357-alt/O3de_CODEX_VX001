import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
      overlays: [
        "Axis: Z-up demo",
        "No real model loaded",
        "No provider/Blender/Asset Processor/O3DE mutation admitted",
      ],
    },
    tools: [
      {
        tool_id: "transform",
        label: "Transform",
        shortcut: null,
        group: "transform",
        truth_state: "demo",
        enabled: true,
        selected: true,
        description: "UI selection only",
        blocked_reason: null,
        next_unlock: null,
        prompt_template_id: null,
        execution_admitted: false,
        mutation_admitted: false,
      },
      {
        tool_id: "translate",
        label: "Translate",
        shortcut: "G",
        group: "transform",
        truth_state: "demo",
        enabled: true,
        selected: false,
        description: "UI selection only",
        blocked_reason: null,
        next_unlock: null,
        prompt_template_id: null,
        execution_admitted: false,
        mutation_admitted: false,
      },
      {
        tool_id: "rotate",
        label: "Rotate",
        shortcut: "R",
        group: "transform",
        truth_state: "demo",
        enabled: true,
        selected: false,
        description: "UI selection only",
        blocked_reason: null,
        next_unlock: null,
        prompt_template_id: null,
        execution_admitted: false,
        mutation_admitted: false,
      },
      {
        tool_id: "scale",
        label: "Scale",
        shortcut: "S",
        group: "transform",
        truth_state: "demo",
        enabled: true,
        selected: false,
        description: "UI selection only",
        blocked_reason: null,
        next_unlock: null,
        prompt_template_id: null,
        execution_admitted: false,
        mutation_admitted: false,
      },
      {
        tool_id: "duplicate",
        label: "Duplicate",
        shortcut: "Shift+D",
        group: "object",
        truth_state: "blocked",
        enabled: false,
        selected: false,
        description: "blocked",
        blocked_reason: "would mutate scene",
        next_unlock: "add bounded corridor",
        prompt_template_id: null,
        execution_admitted: false,
        mutation_admitted: false,
      },
      {
        tool_id: "delete",
        label: "Delete",
        shortcut: "X",
        group: "object",
        truth_state: "blocked",
        enabled: false,
        selected: false,
        description: "blocked",
        blocked_reason: "destructive mutation",
        next_unlock: "explicit destructive corridor",
        prompt_template_id: null,
        execution_admitted: false,
        mutation_admitted: false,
      },
      {
        tool_id: "grease-pencil",
        label: "Grease Pencil",
        shortcut: null,
        group: "grease_pencil",
        truth_state: "demo",
        enabled: true,
        selected: false,
        description: "ui-only overlay mode",
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
        node_id: "asset-root",
        label: "Asset Root",
        kind: "candidate_root",
        depth: 1,
        truth_state: "demo",
        visible: true,
        selected: true,
      },
      {
        node_id: "mesh-lod0",
        label: "Mesh_LOD0",
        kind: "mesh",
        depth: 2,
        truth_state: "demo",
        visible: true,
        selected: true,
      },
      {
        node_id: "materials",
        label: "Materials",
        kind: "material_group",
        depth: 2,
        truth_state: "blocked",
        visible: true,
        selected: false,
      },
    ],
    transform: {
      location: { x: 0, y: 0, z: 0, admitted: false },
      rotation: { x: 0, y: 0, z: 0, admitted: false },
      scale: { x: 1, y: 1, z: 1, admitted: false },
      dimensions: { x: 2.18, y: 0.26, z: 1.85, admitted: false },
      edit_status: "blocked",
      blocked_reason: "runtime writes blocked",
    },
    properties: {
      selected_object: "Weathered Ivy Arch",
      material_preview_status: "preview_read_only_mutation_blocked",
      sections: [],
      rows: [
        {
          row_id: "location",
          label: "Location X/Y/Z",
          value: "0.000, 0.000, 0.000",
          truth_state: "blocked",
          mutation_admitted: false,
          blocked_reason: "blocked",
        },
        {
          row_id: "rotation",
          label: "Rotation X/Y/Z",
          value: "0.000, 0.000, 0.000",
          truth_state: "blocked",
          mutation_admitted: false,
          blocked_reason: "blocked",
        },
        {
          row_id: "scale",
          label: "Scale X/Y/Z",
          value: "1.000, 1.000, 1.000",
          truth_state: "blocked",
          mutation_admitted: false,
          blocked_reason: "blocked",
        },
        {
          row_id: "dimensions",
          label: "Dimensions X/Y/Z",
          value: "2.180, 0.260, 1.850",
          truth_state: "preflight-only",
          mutation_admitted: false,
          blocked_reason: "readback only",
        },
      ],
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
      stage_write_evidence_reference: "packet-10/stage-write-evidence.json",
      stage_write_readback_reference: "packet-10/readback-evidence.json",
      stage_write_readback_status: "not_run",
    },
    prompt_templates: [
      {
        template_id: "inspect-candidate",
        label: "Inspect candidate",
        description: "Read-only candidate inspection.",
        text: "Inspect in read-only mode.",
        truth_state: "read-only",
        safety_labels: ["read-only", "auto_execute=false"],
        auto_execute: false,
      },
      {
        template_id: "placement-proof-only",
        label: "Placement proof-only",
        description: "Proof-only guidance.",
        text: "Prepare proof-only review data.",
        truth_state: "proof-only",
        safety_labels: ["proof-only", "auto_execute=false"],
        auto_execute: false,
      },
    ],
    blocked_capabilities: [
      {
        capability_id: "asset_forge.provider.generate",
        label: "Provider generation",
        reason: "Provider generation is blocked.",
        next_unlock: "Bounded provider admission corridor.",
      },
    ],
    next_safe_action: "Select a UI tool and review non-mutating prompt templates.",
  };
}

describe("AssetForgeBlenderCockpit", () => {
  it("renders backend model tools, properties, outliner, and template safety labels", () => {
    const editorModel = buildEditorModelFixture();
    render(
      <AssetForgeBlenderCockpit
        editorModel={editorModel}
        onOpenPromptStudio={vi.fn()}
        onOpenRecords={vi.fn()}
        onViewEvidence={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Asset Forge Blender-style editor cockpit")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tool Transform" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tool Translate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tool Rotate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tool Scale" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tool Duplicate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tool Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tool Grease Pencil" })).toBeInTheDocument();

    expect(screen.getByText("Location X/Y/Z")).toBeInTheDocument();
    expect(screen.getByText("Rotation X/Y/Z")).toBeInTheDocument();
    expect(screen.getByText("Scale X/Y/Z")).toBeInTheDocument();
    expect(screen.getByText("Dimensions X/Y/Z")).toBeInTheDocument();

    expect(screen.getByText("Asset Root")).toBeInTheDocument();
    expect(screen.getByText("Mesh_LOD0")).toBeInTheDocument();
    expect(screen.getByText("Materials")).toBeInTheDocument();

    expect(screen.getAllByText("auto_execute=false / non-mutating").length).toBeGreaterThan(0);
    expect(screen.getByText("No provider/Blender/Asset Processor/O3DE mutation admitted")).toBeInTheDocument();

    expect(screen.queryByText(/mutation succeeded/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/write succeeded/i)).not.toBeInTheDocument();
  });

  it("shows frontend fallback warning when backend editor model is unavailable", () => {
    render(
      <AssetForgeBlenderCockpit
        editorModel={null}
        editorModelUnavailable
      />,
    );

    expect(screen.getByText("Editor model backend unavailable; using frontend fallback. No execution admitted.")).toBeInTheDocument();
  });

  it("allows blocked tools to be selected for safety guidance without backend execution", () => {
    render(<AssetForgeBlenderCockpit editorModel={buildEditorModelFixture()} />);

    fireEvent.click(screen.getByRole("button", { name: "Tool Duplicate" }));

    expect(screen.getByText(/would mutate scene/i)).toBeInTheDocument();
    expect(screen.getByText(/add bounded corridor/i)).toBeInTheDocument();
    expect(screen.getByText(/backend dispatch disabled from tool click/i)).toBeInTheDocument();
  });

  it("emits prefill-only callback for backend prompt template cards", () => {
    const onPrefillPromptTemplate = vi.fn();
    render(
      <AssetForgeBlenderCockpit
        editorModel={buildEditorModelFixture()}
        onPrefillPromptTemplate={onPrefillPromptTemplate}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Prefill in Prompt Studio (no auto-execute)" })[0]);

    expect(onPrefillPromptTemplate).toHaveBeenCalledTimes(1);
    expect(onPrefillPromptTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        template_id: "inspect-candidate",
        auto_execute: false,
      }),
      null,
    );
  });
});
