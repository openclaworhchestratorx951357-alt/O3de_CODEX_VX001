import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    workflow_stages: [],
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
    transform: {
      location: { x: 0, y: 0, z: 0, admitted: false },
      rotation: { x: 0, y: 0, z: 0, admitted: false },
      scale: { x: 1, y: 1, z: 1, admitted: false },
      dimensions: { x: 0, y: 0, z: 0, admitted: false },
      edit_status: "blocked",
      blocked_reason: "fixture transform mutation blocked",
    },
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
          mutation_admitted: false,
        },
      ],
    },
    material_preview: {
      preview_shape: "sphere",
      preview_surface: "checker",
      checker_visible: true,
      tabs: ["Surface"],
      active_tab: "Surface",
      metadata_status: "read_only",
      mutation_admitted: false,
      rows: [],
    },
    timeline: {
      start_frame: 1,
      end_frame: 250,
      current_frame: 1,
      status: "fixture timeline",
    },
    status_strip_tabs: [],
    evidence: {
      latest_run_id: null,
      latest_execution_id: null,
      latest_artifact_id: null,
      stage_write_evidence_reference: null,
      stage_write_readback_reference: null,
      stage_write_readback_status: null,
    },
    prompt_templates: [],
    blocked_capabilities: [],
    next_safe_action: "Review backend model",
  };
}

function buildEditorModelWithPromptTemplate(): AssetForgeEditorModelRecord {
  return {
    ...buildEditorModelFixture(),
    prompt_templates: [
      {
        template_id: "backend-transform-plan",
        label: "Backend Transform Plan",
        description: "Backend supplied transform plan template.",
        text: "Plan a transform update from backend model values. Do not mutate content.",
        truth_state: "plan-only",
        safety_labels: ["plan-only", "autoExecute=false", "no mutation"],
        auto_execute: false,
      },
    ],
  };
}

function buildEditorModelWithBackendMenus(): AssetForgeEditorModelRecord {
  return {
    ...buildEditorModelFixture(),
    context_menu_groups: [
      {
        group_id: "backend-menu",
        label: "Backend Menu",
        items: [
          {
            item_id: "backend-wireframe",
            label: "Backend Wireframe",
            truth_state: "demo",
            action: "viewport-Wireframe",
            status: "Backend supplied menu changed viewport mode locally.",
            execution_admitted: false,
            mutation_admitted: false,
            auto_execute: false,
          },
        ],
      },
    ],
  };
}

function buildEditorModelWithBackendWorkflowStatus(): AssetForgeEditorModelRecord {
  const model = buildEditorModelFixture() as AssetForgeEditorModelRecord & {
    workflow_stages: Array<{
      stage_id: string;
      label: string;
      truth_state: string;
      action: string;
      status: string;
      execution_admitted: boolean;
      mutation_admitted: boolean;
      auto_execute: boolean;
    }>;
    status_strip_tabs: Array<{
      tab_id: string;
      label: string;
      truth_state: string;
      action: string;
      status: string;
      execution_admitted: boolean;
      mutation_admitted: boolean;
      auto_execute: boolean;
    }>;
  };

  model.workflow_stages = [
    {
      stage_id: "backend-stage",
      label: "Backend Stage",
      truth_state: "read-only",
      action: "backend-stage",
      status: "Backend supplied workflow stage.",
      execution_admitted: false,
      mutation_admitted: false,
      auto_execute: false,
    },
  ];
  model.status_strip_tabs = [
    {
      tab_id: "backend-status",
      label: "Backend Status",
      truth_state: "read-only",
      action: "backend-status",
      status: "Backend supplied status tab. UI state only.",
      execution_admitted: false,
      mutation_admitted: false,
      auto_execute: false,
    },
  ];

  return model;
}

function buildEditorModelWithBackendPropertyTabs(): AssetForgeEditorModelRecord {
  return {
    ...buildEditorModelFixture(),
    properties: {
      ...buildEditorModelFixture().properties,
      sections: ["Material", "Safety"],
    },
    material_preview: {
      ...buildEditorModelFixture().material_preview,
      tabs: ["Backend Surface", "Backend Wire"],
      active_tab: "Backend Surface",
    },
  };
}

function buildEditorModelWithBackendPropertyContent(): AssetForgeEditorModelRecord {
  return {
    ...buildEditorModelFixture(),
    transform: {
      location: { x: 7.5, y: -2, z: 3.25, admitted: false },
      rotation: { x: 12, y: 0, z: -45, admitted: false },
      scale: { x: 1.2, y: 0.8, z: 1.5, admitted: false },
      dimensions: { x: 4, y: 5.5, z: 6, admitted: false },
      edit_status: "preflight-only",
      blocked_reason: "Backend transform values are draft-only; writes remain blocked.",
    },
    material_preview: {
      ...buildEditorModelFixture().material_preview,
      rows: [
        {
          row_id: "backend-diffuse",
          label: "Backend Diffuse",
          value: "read-only clay material",
          truth_state: "read-only",
          mutation_admitted: false,
        },
        {
          row_id: "backend-specular",
          label: "Backend Specular",
          value: "mutation blocked by backend model",
          truth_state: "blocked",
          mutation_admitted: false,
        },
      ],
    },
    blocked_capabilities: [
      {
        capability_id: "backend-provider-generation",
        label: "Backend Provider Generation",
        reason: "Provider generation is not admitted by this editor model packet.",
        next_unlock: "Run a separate model substrate admission packet.",
      },
    ],
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

    const toolShelf = screen.getByLabelText("Asset Forge left tool shelf");
    expect(within(toolShelf).getByRole("button", { name: /Transform/i })).toBeInTheDocument();
    expect(within(toolShelf).getByRole("button", { name: /Translate/i })).toBeInTheDocument();
    expect(within(toolShelf).getByRole("button", { name: /Rotate/i })).toBeInTheDocument();
    expect(within(toolShelf).getByRole("button", { name: /Scale/i })).toBeInTheDocument();
    expect(within(toolShelf).getByRole("button", { name: /Duplicate/i })).toBeInTheDocument();
    expect(within(toolShelf).getByRole("button", { name: /Delete/i })).toBeInTheDocument();
    expect(within(toolShelf).getByRole("button", { name: /Grease Pencil/i })).toBeInTheDocument();

    expect(screen.getByText(/no provider generation, Blender execution, Asset Processor execution, or O3DE mutation admitted\./i)).toBeInTheDocument();

    expect(screen.queryByText(/^LEFT$/)).toBeNull();
    expect(screen.queryByText(/^CENTER$/)).toBeNull();
    expect(screen.queryByText(/^RIGHT$/)).toBeNull();
    expect(screen.queryByText(/^BOTTOM$/)).toBeNull();
  });

  it("opens top menu dropdowns and changes viewport mode without backend execution", () => {
    render(<AssetForgeBlenderCockpit />);

    const topMenu = screen.getByLabelText("Asset Forge top menu");
    ["File", "Edit", "View", "Candidate", "Stage", "Proof", "Review", "Help"].forEach((label) => {
      expect(within(topMenu).getByRole("button", { name: label })).toBeInTheDocument();
    });

    fireEvent.click(within(topMenu).getByRole("button", { name: "View" }));

    const viewMenu = screen.getByRole("menu", { name: "View menu" });
    expect(within(viewMenu).getByRole("menuitem", { name: /Wireframe/i })).toBeInTheDocument();

    fireEvent.click(within(viewMenu).getByRole("menuitem", { name: /Wireframe/i }));

    expect(screen.getByText("Viewport mode: Wireframe")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Viewport mode changed locally to Wireframe/i);
  });

  it("renders an app navigation menu that routes to existing workspaces without mutation", () => {
    const callbacks = {
      onOpenHome: vi.fn(),
      onOpenCreateGame: vi.fn(),
      onOpenCreateMovie: vi.fn(),
      onOpenLoadProject: vi.fn(),
      onOpenPromptStudio: vi.fn(),
      onOpenBuilder: vi.fn(),
      onOpenOperations: vi.fn(),
      onOpenRuntimeOverview: vi.fn(),
      onOpenRecords: vi.fn(),
      onLaunchPlacementProofTemplate: vi.fn(),
    };

    render(<AssetForgeBlenderCockpit {...callbacks} />);

    const topMenu = screen.getByLabelText("Asset Forge top menu");
    fireEvent.click(within(topMenu).getByRole("button", { name: "App" }));

    const appMenu = screen.getByRole("menu", { name: "App menu" });
    [
      "Home / Start",
      "Create Game",
      "Create Movie",
      "Load Project",
      "Prompt Studio",
      "Builder",
      "Operations",
      "Runtime Overview",
      "Records",
    ].forEach((label) => {
      expect(within(appMenu).getByRole("menuitem", { name: new RegExp(label, "i") })).toBeInTheDocument();
    });

    fireEvent.click(within(appMenu).getByRole("menuitem", { name: /Prompt Studio/i }));

    expect(callbacks.onOpenPromptStudio).toHaveBeenCalledTimes(1);
    expect(callbacks.onLaunchPlacementProofTemplate).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Opened Prompt Studio from Asset Forge shell navigation only/i,
    );
  });

  it("selects tools, reports blocked reasons, and does not call mutation-style callbacks", () => {
    const callbacks = {
      onOpenPromptStudio: vi.fn(),
      onLaunchInspectTemplate: vi.fn(),
      onLaunchPlacementProofTemplate: vi.fn(),
      onOpenRecords: vi.fn(),
      onOpenRuntimeOverview: vi.fn(),
      onViewLatestRun: vi.fn(),
      onViewExecution: vi.fn(),
      onViewArtifact: vi.fn(),
      onViewEvidence: vi.fn(),
    };

    render(<AssetForgeBlenderCockpit {...callbacks} />);

    const toolShelf = screen.getByLabelText("Asset Forge left tool shelf");
    fireEvent.click(within(toolShelf).getByRole("button", { name: /Transform/i }));
    expect(screen.getByText("Active tool: Transform")).toBeInTheDocument();

    fireEvent.click(within(toolShelf).getByRole("button", { name: /Delete/i }));
    expect(screen.getByText("Active tool: Delete")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Delete blocked/i);
    expect(screen.getByRole("status")).toHaveTextContent(/Delete would mutate an asset, scene, animation, or editor state that is not admitted/i);

    Object.values(callbacks).forEach((callback) => {
      expect(callback).not.toHaveBeenCalled();
    });
  });

  it("selects outliner objects and updates the inspector object tab", () => {
    render(<AssetForgeBlenderCockpit />);

    const outliner = screen.getByLabelText("Asset Forge backend outliner");
    fireEvent.click(within(outliner).getByRole("button", { name: /Mesh_LOD0/i }));

    expect(screen.getByText("Selected object: Mesh_LOD0")).toBeInTheDocument();

    const properties = screen.getByLabelText("Asset Forge transform and material properties");
    fireEvent.click(within(properties).getByRole("button", { name: "Object" }));

    expect(within(properties).getByText("Selected object")).toBeInTheDocument();
    expect(within(properties).getByText("Mesh_LOD0")).toBeInTheDocument();
  });

  it("updates transform fields as local draft values and keeps apply blocked", () => {
    render(<AssetForgeBlenderCockpit />);

    const properties = screen.getByLabelText("Asset Forge transform and material properties");
    const locationX = screen.getByLabelText("Location X");

    fireEvent.change(locationX, { target: { value: "12.5" } });

    expect(locationX).toHaveValue("12.5");
    expect(screen.getByText(/draft only \/ not applied/i)).toBeInTheDocument();
    expect(within(properties).getByRole("button", { name: "Apply Transform" })).toBeDisabled();
    expect(screen.getByText("Transform mutation is not admitted yet.")).toBeInTheDocument();

    fireEvent.click(within(properties).getByRole("button", { name: "Reset Draft" }));

    expect(locationX).toHaveValue("0");
  });

  it("switches properties tabs and keeps material mutation blocked", () => {
    render(<AssetForgeBlenderCockpit />);

    const properties = screen.getByLabelText("Asset Forge transform and material properties");

    fireEvent.click(within(properties).getByRole("button", { name: "Object" }));
    expect(within(properties).getByText("Selected object")).toBeInTheDocument();

    fireEvent.click(within(properties).getByRole("button", { name: "Material" }));
    expect(within(properties).getAllByText("material mutation blocked").length).toBeGreaterThan(0);

    fireEvent.click(within(properties).getByRole("button", { name: "Proof" }));
    expect(within(properties).getByText(/Prompt templates are preview-first and autoExecute=false/i)).toBeInTheDocument();

    fireEvent.click(within(properties).getByRole("button", { name: "Safety" }));
    expect(within(properties).getByText("provider generation")).toBeInTheDocument();
    expect(within(properties).getByText("Blender execution")).toBeInTheDocument();
    expect(within(properties).getByText("Asset Processor execution")).toBeInTheDocument();
  });

  it("switches bottom tabs and shows status/evidence/prompt/artifact content", () => {
    render(<AssetForgeBlenderCockpit />);

    const bottomStrip = screen.getByLabelText("Asset Forge timeline evidence and prompt strip");

    fireEvent.click(within(bottomStrip).getByRole("button", { name: "Evidence" }));
    expect(within(bottomStrip).getByText(/Evidence drill-in only; no runtime execution/i)).toBeInTheDocument();

    fireEvent.click(within(bottomStrip).getByRole("button", { name: "Prompt Template" }));
    expect(within(bottomStrip).getByText(/autoExecute=false/i)).toBeInTheDocument();

    fireEvent.click(within(bottomStrip).getByRole("button", { name: "Logs" }));
    expect(within(bottomStrip).getByText(/Blocked operations explain next unlock/i)).toBeInTheDocument();

    fireEvent.click(within(bottomStrip).getByRole("button", { name: "Latest Artifacts" }));
    expect(within(bottomStrip).getByText("Run: not selected")).toBeInTheDocument();

    fireEvent.click(within(bottomStrip).getByRole("button", { name: "Timeline" }));
    expect(within(bottomStrip).getByText("Start 1")).toBeInTheDocument();
    expect(within(bottomStrip).getByText("End 250")).toBeInTheDocument();
  });

  it("displays and copies prompt templates without auto-execution", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(<AssetForgeBlenderCockpit />);

    const properties = screen.getByLabelText("Asset Forge transform and material properties");
    fireEvent.click(within(properties).getByRole("button", { name: "Proof" }));

    const selector = screen.getByLabelText("Prompt template selector");
    fireEvent.change(selector, { target: { value: "placement-proof-only" } });

    expect(within(properties).getByText(/candidate_label "Weathered Ivy Arch"/i)).toBeInTheDocument();

    fireEvent.click(within(properties).getByRole("button", { name: "Copy template" }));

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("placement proof-only candidate"));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/Placement proof-only copied\. autoExecute=false/i);
    });
  });

  it("hands selected backend prompt templates to Prompt Studio without auto-execution", () => {
    const onLaunchPromptTemplate = vi.fn();

    render(
      <AssetForgeBlenderCockpit
        editorModel={buildEditorModelWithPromptTemplate()}
        onLaunchPromptTemplate={onLaunchPromptTemplate}
      />,
    );

    const properties = screen.getByLabelText("Asset Forge transform and material properties");
    fireEvent.click(within(properties).getByRole("button", { name: "Proof" }));

    expect(within(properties).getAllByText("Backend Transform Plan").length).toBeGreaterThan(0);
    fireEvent.click(within(properties).getByRole("button", { name: "Load template" }));

    expect(onLaunchPromptTemplate).toHaveBeenCalledWith({
      template_id: "backend-transform-plan",
      label: "Backend Transform Plan",
      description: "Backend supplied transform plan template.",
      text: "Plan a transform update from backend model values. Do not mutate content.",
      truth_state: "plan-only",
      safety_labels: ["plan-only", "autoExecute=false", "no mutation"],
      auto_execute: false,
    });
  });

  it("opens Prompt Studio from the proof tab with the selected template handoff", () => {
    const onLaunchPromptTemplate = vi.fn();
    const onOpenPromptStudio = vi.fn();

    render(
      <AssetForgeBlenderCockpit
        editorModel={buildEditorModelWithPromptTemplate()}
        onLaunchPromptTemplate={onLaunchPromptTemplate}
        onOpenPromptStudio={onOpenPromptStudio}
      />,
    );

    const properties = screen.getByLabelText("Asset Forge transform and material properties");
    fireEvent.click(within(properties).getByRole("button", { name: "Proof" }));

    fireEvent.click(within(properties).getByRole("button", { name: "Open Prompt Studio" }));

    expect(onLaunchPromptTemplate).toHaveBeenCalledWith({
      template_id: "backend-transform-plan",
      label: "Backend Transform Plan",
      description: "Backend supplied transform plan template.",
      text: "Plan a transform update from backend model values. Do not mutate content.",
      truth_state: "plan-only",
      safety_labels: ["plan-only", "autoExecute=false", "no mutation"],
      auto_execute: false,
    });
    expect(onOpenPromptStudio).not.toHaveBeenCalled();
  });

  it("shows backend prompt-template safety labels before Prompt Studio handoff", () => {
    render(<AssetForgeBlenderCockpit editorModel={buildEditorModelWithPromptTemplate()} />);

    const properties = screen.getByLabelText("Asset Forge transform and material properties");
    fireEvent.click(within(properties).getByRole("button", { name: "Proof" }));

    const handoffSummary = within(properties).getByLabelText("Prompt template handoff safety summary");
    expect(handoffSummary).toHaveTextContent("Backend Transform Plan");
    expect(handoffSummary).toHaveTextContent("Backend supplied transform plan template.");
    expect(handoffSummary).toHaveTextContent("plan-only");
    expect(handoffSummary).toHaveTextContent("autoExecute=false");
    expect(handoffSummary).toHaveTextContent("no mutation");
    expect(handoffSummary).toHaveTextContent("Prompt Studio opens this as a dry-run editable draft");
  });

  it("renders tools and outliner rows from backend editor model when provided", () => {
    render(<AssetForgeBlenderCockpit editorModel={buildEditorModelFixture()} />);

    expect(screen.getByText("Backend Tool")).toBeInTheDocument();
    expect(screen.getByText("Backend Root")).toBeInTheDocument();
    expect(screen.getByText("Location X/Y/Z")).toBeInTheDocument();
    expect(screen.getByText("10 / 20 / 30")).toBeInTheDocument();
    expect(screen.getByText("Backend overlay line")).toBeInTheDocument();
  });

  it("renders top menu groups and actions from the backend editor model", () => {
    render(<AssetForgeBlenderCockpit editorModel={buildEditorModelWithBackendMenus()} />);

    const topMenu = screen.getByLabelText("Asset Forge top menu");
    expect(within(topMenu).getByRole("button", { name: "Backend Menu" })).toBeInTheDocument();

    fireEvent.click(within(topMenu).getByRole("button", { name: "Backend Menu" }));
    const backendMenu = screen.getByRole("menu", { name: "Backend Menu menu" });

    fireEvent.click(within(backendMenu).getByRole("menuitem", { name: /Backend Wireframe/i }));

    expect(screen.getByText("Viewport mode: Wireframe")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Backend supplied menu changed viewport mode locally/i);
  });

  it("renders workflow stages and bottom status tabs from the backend editor model", () => {
    render(<AssetForgeBlenderCockpit editorModel={buildEditorModelWithBackendWorkflowStatus()} />);

    expect(screen.getByText("Backend Stage")).toBeInTheDocument();

    const bottomStrip = screen.getByLabelText("Asset Forge timeline evidence and prompt strip");
    fireEvent.click(within(bottomStrip).getByRole("button", { name: "Backend Status" }));

    expect(within(bottomStrip).getByText(/Backend supplied status tab/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Backend Status bottom strip selected/i);
  });

  it("renders properties and material tabs from the backend editor model", () => {
    render(<AssetForgeBlenderCockpit editorModel={buildEditorModelWithBackendPropertyTabs()} />);

    const properties = screen.getByLabelText("Asset Forge transform and material properties");

    expect(within(properties).queryByRole("button", { name: "Transform" })).not.toBeInTheDocument();
    expect(within(properties).getByRole("button", { name: "Material" })).toBeInTheDocument();

    fireEvent.click(within(properties).getByRole("button", { name: "Material" }));

    expect(within(properties).getByRole("button", { name: "Backend Surface" })).toBeInTheDocument();
    expect(within(properties).getByRole("button", { name: "Backend Wire" })).toBeInTheDocument();
    expect(within(properties).queryByRole("button", { name: "Volume" })).not.toBeInTheDocument();
  });

  it("seeds and resets transform draft values from the backend editor model", () => {
    render(<AssetForgeBlenderCockpit editorModel={buildEditorModelWithBackendPropertyContent()} />);

    const properties = screen.getByLabelText("Asset Forge transform and material properties");
    const locationX = within(properties).getByLabelText("Location X") as HTMLInputElement;
    const rotationZ = within(properties).getByLabelText("Rotation Z") as HTMLInputElement;

    expect(locationX).toHaveValue("7.5");
    expect(rotationZ).toHaveValue("-45");
    expect(within(properties).getByText("Backend transform values are draft-only; writes remain blocked.")).toBeInTheDocument();

    fireEvent.change(locationX, { target: { value: "99" } });
    expect(locationX).toHaveValue("99");

    fireEvent.click(within(properties).getByRole("button", { name: "Reset Draft" }));

    expect(locationX).toHaveValue("7.5");
    expect(rotationZ).toHaveValue("-45");
  });

  it("renders material and safety rows from backend editor-model content", () => {
    render(<AssetForgeBlenderCockpit editorModel={buildEditorModelWithBackendPropertyContent()} />);

    const properties = screen.getByLabelText("Asset Forge transform and material properties");

    fireEvent.click(within(properties).getByRole("button", { name: "Material" }));
    expect(within(properties).getByText("Backend Diffuse")).toBeInTheDocument();
    expect(within(properties).getByText("read-only clay material")).toBeInTheDocument();
    expect(within(properties).getByText("Backend Specular")).toBeInTheDocument();
    expect(within(properties).getByText("mutation blocked by backend model")).toBeInTheDocument();

    fireEvent.click(within(properties).getByRole("button", { name: "Safety" }));
    expect(within(properties).getByText("Backend Provider Generation")).toBeInTheDocument();
    expect(
      within(properties).getByText("Provider generation is not admitted by this editor model packet."),
    ).toBeInTheDocument();
    expect(within(properties).getByText("Run a separate model substrate admission packet.")).toBeInTheDocument();
  });
});
