from typing import Literal

from pydantic import BaseModel, Field


ToolGroup = Literal[
    "transform",
    "object",
    "mesh",
    "animation",
    "grease_pencil",
    "history",
    "proof",
    "review",
]
TruthState = Literal["demo", "read-only", "plan-only", "preflight-only", "proof-only", "blocked"]


class AssetForgeEditorToolRecord(BaseModel):
    tool_id: str
    label: str
    shortcut: str | None = None
    group: ToolGroup
    truth_state: TruthState
    enabled: bool
    selected: bool = False
    description: str
    blocked_reason: str | None = None
    next_unlock: str | None = None
    prompt_template_id: str | None = None
    execution_admitted: bool = False
    mutation_admitted: bool = False


class AssetForgePromptTemplateRecord(BaseModel):
    template_id: str
    label: str
    description: str
    text: str
    truth_state: TruthState
    safety_labels: list[str]
    auto_execute: bool = False


class AssetForgeBlockedCapabilityRecord(BaseModel):
    capability_id: str
    label: str
    reason: str
    next_unlock: str


class AssetForgeOutlinerNodeRecord(BaseModel):
    node_id: str
    label: str
    kind: str
    depth: int
    truth_state: TruthState
    visible: bool = True
    selected: bool = False


class AssetForgeAxisTripletRecord(BaseModel):
    x: float
    y: float
    z: float
    admitted: bool = False


class AssetForgeTransformRecord(BaseModel):
    location: AssetForgeAxisTripletRecord
    rotation: AssetForgeAxisTripletRecord
    scale: AssetForgeAxisTripletRecord
    dimensions: AssetForgeAxisTripletRecord
    edit_status: Literal["blocked", "preflight-only", "proof-only"]
    blocked_reason: str


class AssetForgeViewportRecord(BaseModel):
    label: str
    mode: str
    shading_modes: list[str]
    active_shading_mode: str
    grid_visible: bool
    preview_status: str
    selected_object_label: str
    overlays: list[str]


class AssetForgeEvidenceSummaryRecord(BaseModel):
    latest_run_id: str | None = None
    latest_execution_id: str | None = None
    latest_artifact_id: str | None = None
    stage_write_evidence_reference: str | None = None
    stage_write_readback_reference: str | None = None
    stage_write_readback_status: str | None = None


class AssetForgeEditorPropertyRowRecord(BaseModel):
    row_id: str
    label: str
    value: str
    truth_state: TruthState
    mutation_admitted: bool = False


class AssetForgePropertiesRecord(BaseModel):
    selected_object: str
    material_preview_status: str
    sections: list[str]
    rows: list[AssetForgeEditorPropertyRowRecord]


class AssetForgeMaterialPreviewRecord(BaseModel):
    preview_shape: str
    preview_surface: str
    checker_visible: bool
    tabs: list[str]
    active_tab: str
    metadata_status: str
    mutation_admitted: bool = False
    rows: list[AssetForgeEditorPropertyRowRecord]


class AssetForgeMeshPreviewRecord(BaseModel):
    source_node_id: str
    mesh_label: str
    preview_kind: str
    topology_status: str
    estimated_vertices: int
    estimated_faces: int
    estimated_triangles: int
    uv_layers: list[str]
    material_slots: list[str]
    wireframe_visible: bool
    selection_outline_visible: bool
    overlays: list[str]
    execution_admitted: bool = False
    mutation_admitted: bool = False
    rows: list[AssetForgeEditorPropertyRowRecord]


class AssetForgeTimelineRecord(BaseModel):
    start_frame: int
    end_frame: int
    current_frame: int
    status: str


class AssetForgeWorkflowStageRecord(BaseModel):
    stage_id: str
    label: str
    truth_state: TruthState
    action: str
    status: str
    prompt_template_id: str | None = None
    execution_admitted: bool = False
    mutation_admitted: bool = False
    auto_execute: bool = False


class AssetForgeStatusStripTabRecord(BaseModel):
    tab_id: str
    label: str
    truth_state: TruthState
    action: str
    status: str
    execution_admitted: bool = False
    mutation_admitted: bool = False
    auto_execute: bool = False


class AssetForgeContextMenuItemRecord(BaseModel):
    item_id: str
    label: str
    truth_state: TruthState
    action: str
    status: str
    blocked_reason: str | None = None
    next_unlock: str | None = None
    execution_admitted: bool = False
    mutation_admitted: bool = False
    auto_execute: bool = False


class AssetForgeContextMenuGroupRecord(BaseModel):
    group_id: str
    label: str
    items: list[AssetForgeContextMenuItemRecord] = Field(default_factory=list)


class AssetForgeEditorModelRecord(BaseModel):
    source: str = "asset-forge-editor-model"
    inspection_surface: str = "read_only"
    editor_model_status: str = "available"
    execution_admitted: bool = False
    mutation_admitted: bool = False
    provider_generation_admitted: bool = False
    blender_execution_admitted: bool = False
    asset_processor_execution_admitted: bool = False
    placement_write_admitted: bool = False
    active_tool_id: str = "transform"
    viewport: AssetForgeViewportRecord
    tools: list[AssetForgeEditorToolRecord]
    context_menu_groups: list[AssetForgeContextMenuGroupRecord]
    workflow_stages: list[AssetForgeWorkflowStageRecord]
    outliner: list[AssetForgeOutlinerNodeRecord]
    transform: AssetForgeTransformRecord
    properties: AssetForgePropertiesRecord
    material_preview: AssetForgeMaterialPreviewRecord
    mesh_preview: AssetForgeMeshPreviewRecord
    timeline: AssetForgeTimelineRecord
    status_strip_tabs: list[AssetForgeStatusStripTabRecord]
    evidence: AssetForgeEvidenceSummaryRecord
    prompt_templates: list[AssetForgePromptTemplateRecord]
    blocked_capabilities: list[AssetForgeBlockedCapabilityRecord]
    next_safe_action: str


def _tool(
    tool_id: str,
    label: str,
    shortcut: str | None,
    group: ToolGroup,
    truth_state: TruthState,
    description: str,
    *,
    selected: bool = False,
    blocked_reason: str | None = None,
    next_unlock: str | None = None,
    prompt_template_id: str | None = None,
) -> AssetForgeEditorToolRecord:
    if truth_state == "blocked" and (not blocked_reason or not next_unlock):
        raise ValueError(f"Blocked Asset Forge editor tool '{tool_id}' must explain reason and next unlock.")
    return AssetForgeEditorToolRecord(
        tool_id=tool_id,
        label=label,
        shortcut=shortcut,
        group=group,
        truth_state=truth_state,
        enabled=True,
        selected=selected,
        description=description,
        blocked_reason=blocked_reason,
        next_unlock=next_unlock,
        prompt_template_id=prompt_template_id,
        execution_admitted=False,
        mutation_admitted=False,
    )


def _blocked_tool(
    tool_id: str,
    label: str,
    shortcut: str | None,
    group: ToolGroup,
    blocked_reason: str,
    next_unlock: str,
) -> AssetForgeEditorToolRecord:
    return _tool(
        tool_id,
        label,
        shortcut,
        group,
        "blocked",
        f"{label} is visible for editor orientation, but no execution is admitted.",
        blocked_reason=blocked_reason,
        next_unlock=next_unlock,
    )


def _property_row(
    row_id: str,
    label: str,
    value: str,
    truth_state: TruthState,
) -> AssetForgeEditorPropertyRowRecord:
    return AssetForgeEditorPropertyRowRecord(
        row_id=row_id,
        label=label,
        value=value,
        truth_state=truth_state,
        mutation_admitted=False,
    )


def _menu_item(
    item_id: str,
    label: str,
    truth_state: TruthState,
    action: str,
    status: str,
    *,
    blocked_reason: str | None = None,
    next_unlock: str | None = None,
) -> AssetForgeContextMenuItemRecord:
    if truth_state == "blocked" and (not blocked_reason or not next_unlock):
        raise ValueError(f"Blocked Asset Forge menu item '{item_id}' must explain reason and next unlock.")
    return AssetForgeContextMenuItemRecord(
        item_id=item_id,
        label=label,
        truth_state=truth_state,
        action=action,
        status=status,
        blocked_reason=blocked_reason,
        next_unlock=next_unlock,
        execution_admitted=False,
        mutation_admitted=False,
        auto_execute=False,
    )


def _blocked_menu_item(
    item_id: str,
    label: str,
    action: str,
    status: str,
    blocked_reason: str,
    next_unlock: str,
) -> AssetForgeContextMenuItemRecord:
    return _menu_item(
        item_id,
        label,
        "blocked",
        action,
        status,
        blocked_reason=blocked_reason,
        next_unlock=next_unlock,
    )


def _workflow_stage(
    stage_id: str,
    label: str,
    truth_state: TruthState,
    action: str,
    status: str,
    *,
    prompt_template_id: str | None = None,
) -> AssetForgeWorkflowStageRecord:
    return AssetForgeWorkflowStageRecord(
        stage_id=stage_id,
        label=label,
        truth_state=truth_state,
        action=action,
        status=status,
        prompt_template_id=prompt_template_id,
        execution_admitted=False,
        mutation_admitted=False,
        auto_execute=False,
    )


def _status_strip_tab(
    tab_id: str,
    label: str,
    truth_state: TruthState,
    action: str,
    status: str,
) -> AssetForgeStatusStripTabRecord:
    return AssetForgeStatusStripTabRecord(
        tab_id=tab_id,
        label=label,
        truth_state=truth_state,
        action=action,
        status=status,
        execution_admitted=False,
        mutation_admitted=False,
        auto_execute=False,
    )


def build_asset_forge_editor_model() -> AssetForgeEditorModelRecord:
    tools = [
        _tool("transform", "Transform", "T", "transform", "demo", "UI transform selection only; draft values stay local.", selected=True, prompt_template_id="transform-plan"),
        _tool("translate", "Translate", "G", "transform", "demo", "UI translate selection only; no placement or transform write occurs.", prompt_template_id="transform-plan"),
        _tool("rotate", "Rotate", "R", "transform", "demo", "UI rotate selection only; no scene mutation occurs.", prompt_template_id="transform-plan"),
        _tool("scale", "Scale", "S", "transform", "demo", "UI scale selection only; no asset mutation occurs.", prompt_template_id="transform-plan"),
        _tool("origin", "Origin", "O", "object", "plan-only", "Origin changes can be planned but not executed.", prompt_template_id="transform-plan"),
        _tool("object", "Object", None, "object", "plan-only", "Object operations are plan-only until a separate admission packet exists.", prompt_template_id="inspect-candidate"),
        _blocked_tool("duplicate", "Duplicate", None, "object", "Duplicate would create or mutate asset/editor state.", "Add a bounded proof/readback packet before duplication is admitted."),
        _blocked_tool("delete", "Delete", None, "object", "Delete would remove project/editor state.", "Add explicit deletion policy, proof, approval, and revert planning first."),
        _blocked_tool("join", "Join", "J", "mesh", "Join would mutate mesh topology.", "Add a mesh mutation design and proof-only readback packet first."),
        _blocked_tool("split", "Split", None, "mesh", "Split would mutate mesh topology.", "Add a mesh mutation design and proof-only readback packet first."),
        _tool("smoothing", "Smoothing", None, "mesh", "preflight-only", "Smoothing can be reviewed as preflight metadata only.", blocked_reason="Applying smoothing would mutate mesh or material state.", next_unlock="Add explicit mesh/material mutation admission.", prompt_template_id="inspect-candidate"),
        _tool("smooth", "Smooth", None, "mesh", "preflight-only", "Smooth shading remains preflight-only.", blocked_reason="Applying smooth shading would mutate mesh or material state.", next_unlock="Add explicit mesh/material mutation admission.", prompt_template_id="inspect-candidate"),
        _tool("flat", "Flat", None, "mesh", "preflight-only", "Flat shading remains preflight-only.", blocked_reason="Applying flat shading would mutate mesh or material state.", next_unlock="Add explicit mesh/material mutation admission.", prompt_template_id="inspect-candidate"),
        _blocked_tool("keyframes", "Keyframes", None, "animation", "Keyframe tooling would mutate animation/editor state.", "Add an animation preflight/readback design first."),
        _blocked_tool("insert-keyframe", "Insert", "I", "animation", "Inserting keyframes would mutate animation data.", "Add an animation mutation admission packet first."),
        _blocked_tool("remove-keyframe", "Remove", None, "animation", "Removing keyframes would mutate animation data.", "Add an animation mutation admission packet first."),
        _blocked_tool("motion-paths", "Motion Paths", None, "animation", "Motion paths require animation/editor state calculation not admitted here.", "Add a read-only animation proof substrate first."),
        _blocked_tool("calculate-paths", "Calculate Paths", None, "animation", "Calculating paths would execute editor/animation tooling.", "Add proof-only path calculation design first."),
        _blocked_tool("clear-paths", "Clear Paths", None, "animation", "Clearing paths would mutate editor state.", "Add explicit animation/editor-state admission first."),
        _tool("repeat-last", "Repeat Last", None, "history", "read-only", "History is visible for review only; repeat execution is not dispatched."),
        _tool("history", "History", None, "history", "read-only", "History is a read-only UI/status view."),
        _blocked_tool("grease-pencil", "Grease Pencil", None, "grease_pencil", "Grease Pencil edits would mutate sketch/editor data.", "Add a sketch data design and proof-only readback path first."),
        _blocked_tool("draw-line", "Draw Line", None, "grease_pencil", "Drawing lines would create sketch/editor data.", "Add a sketch data design and proof-only readback path first."),
        _blocked_tool("erase", "Erase", None, "grease_pencil", "Erase would remove sketch/editor data.", "Add a sketch data design and deletion policy first."),
        _blocked_tool("use-sketching", "Use Sketching", None, "grease_pencil", "Sketching mode would admit editor data mutation.", "Add a sketch mode admission packet first."),
        _tool("placement-proof-only", "Placement Proof Only", None, "proof", "proof-only", "Loads proof-only placement prompt metadata without writing placement.", prompt_template_id="placement-proof-only"),
    ]

    transform = AssetForgeTransformRecord(
        location=AssetForgeAxisTripletRecord(x=0.0, y=0.0, z=0.0),
        rotation=AssetForgeAxisTripletRecord(x=0.0, y=0.0, z=0.0),
        scale=AssetForgeAxisTripletRecord(x=1.0, y=1.0, z=1.0),
        dimensions=AssetForgeAxisTripletRecord(x=0.0, y=0.0, z=0.0),
        edit_status="blocked",
        blocked_reason="Transform mutation is not admitted; draft values are UI-only until a separate admission packet exists.",
    )

    property_rows = [
        _property_row("candidate", "Candidate", "Weathered Ivy Arch (candidate-a)", "demo"),
        _property_row("location", "Location X/Y/Z", "0.000 / 0.000 / 0.000", "blocked"),
        _property_row("rotation", "Rotation X/Y/Z", "0.000 / 0.000 / 0.000", "blocked"),
        _property_row("scale", "Scale X/Y/Z", "1.000 / 1.000 / 1.000", "blocked"),
        _property_row("dimensions", "Dimensions X/Y/Z", "0.000 / 0.000 / 0.000", "blocked"),
        _property_row("provider-generation", "Provider generation", "blocked; no task creation admitted", "blocked"),
        _property_row("blender-execution", "Blender execution", "blocked; no Blender process admitted", "blocked"),
        _property_row("asset-processor", "Asset Processor execution", "blocked; no AP execution admitted", "blocked"),
        _property_row("placement-write", "Placement write", "blocked; proof-only placement remains proof-only", "blocked"),
        _property_row("material-mutation", "Material mutation", "blocked; preview metadata only", "blocked"),
    ]

    material_rows = [
        _property_row("surface", "Surface", "Lambert demo metadata", "read-only"),
        _property_row("diffuse", "Diffuse", "mutation blocked", "blocked"),
        _property_row("specular", "Specular", "mutation blocked", "blocked"),
        _property_row("shading", "Shading", "read-only preview metadata", "read-only"),
        _property_row("transparency", "Transparency", "not admitted", "blocked"),
    ]

    mesh_rows = [
        _property_row("mesh-source", "Mesh source", "Mesh_LOD0 display contract", "read-only"),
        _property_row("mesh-topology", "Topology", "read-only contract; no real mesh loaded", "read-only"),
        _property_row("mesh-vertices", "Vertices", "0 placeholder vertices", "read-only"),
        _property_row("mesh-faces", "Faces", "0 placeholder faces", "read-only"),
        _property_row("mesh-triangles", "Triangles", "0 placeholder triangles", "read-only"),
        _property_row("mesh-uv-layers", "UV layers", "UV0_demo_read_only", "read-only"),
        _property_row("mesh-material-slots", "Material slots", "Ivy_Bark_Demo, Ivy_Leaf_Demo", "read-only"),
        _property_row("mesh-collision", "Collision", "planned proxy only; no collider written", "plan-only"),
        _property_row("mesh-export-readiness", "Export readiness", "preflight metadata only; no GLB write", "preflight-only"),
    ]

    return AssetForgeEditorModelRecord(
        viewport=AssetForgeViewportRecord(
            label="Front Ortho",
            mode="Object Mode",
            shading_modes=["Solid", "Wireframe", "Material Preview", "O3DE Preview"],
            active_shading_mode="Solid",
            grid_visible=True,
            preview_status="demo_no_real_model_loaded",
            selected_object_label="Weathered Ivy Arch",
            overlays=[
                "Axis: Z-up demo",
                "No real model loaded",
                "No provider/Blender/Asset Processor/O3DE mutation admitted",
            ],
        ),
        tools=tools,
        context_menu_groups=[
            AssetForgeContextMenuGroupRecord(
                group_id="file",
                label="File",
                items=[
                    _menu_item("file-new-plan", "New candidate plan", "plan-only", "candidate-plan", "New candidate planning is plan-only; no provider generation is admitted."),
                    _menu_item("file-prompt", "Open Prompt Studio", "read-only", "open-prompt-studio", "Opening Prompt Studio is navigation only; no prompt auto-executes."),
                    _menu_item("file-records", "Open Records", "read-only", "open-records", "Opening records is read-only evidence navigation."),
                    _blocked_menu_item(
                        "file-export",
                        "Export package",
                        "blocked",
                        "Export package is blocked until generated asset packaging is admitted.",
                        "Export would create or package project artifacts.",
                        "Add generated-asset packaging design, proof, and admission first.",
                    ),
                ],
            ),
            AssetForgeContextMenuGroupRecord(
                group_id="edit",
                label="Edit",
                items=[
                    _menu_item("edit-reset-transform", "Reset transform draft", "demo", "reset-transform", "Transform draft reset locally; no project mutation occurred."),
                    _blocked_menu_item(
                        "edit-reset-layout",
                        "Reset layout",
                        "blocked",
                        "Layout reset is not wired for this cockpit packet.",
                        "Resetting persisted layout is not part of this read-only editor model contract.",
                        "Add a browser-local layout preference packet if persistent layout reset is needed.",
                    ),
                    _blocked_menu_item(
                        "edit-duplicate",
                        "Duplicate candidate",
                        "select-tool-duplicate",
                        "Duplicate candidate is blocked; asset mutation is not admitted.",
                        "Duplicate would create or mutate asset/editor state.",
                        "Add a bounded duplicate design, proof, approval, and readback packet first.",
                    ),
                    _blocked_menu_item(
                        "edit-delete",
                        "Delete candidate",
                        "select-tool-delete",
                        "Delete candidate is blocked; asset deletion is not admitted.",
                        "Delete would remove asset/editor state.",
                        "Add explicit deletion policy, proof, approval, and restore planning first.",
                    ),
                ],
            ),
            AssetForgeContextMenuGroupRecord(
                group_id="view",
                label="View",
                items=[
                    _menu_item("view-solid", "Solid", "demo", "viewport-Solid", "Viewport mode changed locally to Solid."),
                    _menu_item("view-wireframe", "Wireframe", "demo", "viewport-Wireframe", "Viewport mode changed locally to Wireframe."),
                    _menu_item("view-material", "Material Preview", "demo", "viewport-Material Preview", "Material Preview is a local UI preview only."),
                    _menu_item("view-o3de", "O3DE Preview", "preflight-only", "viewport-O3DE Preview", "O3DE Preview remains preflight/proof oriented; no runtime renderer was called."),
                    _menu_item("view-frame", "Frame selected", "demo", "frame-selected", "Frame selected adjusted viewport overlay locally."),
                    _menu_item("view-grid", "Toggle grid", "demo", "toggle-grid", "Grid visibility toggled locally."),
                ],
            ),
            AssetForgeContextMenuGroupRecord(
                group_id="candidate",
                label="Candidate",
                items=[
                    _menu_item("candidate-inspect", "Inspect candidate", "read-only", "select-template-inspect-candidate", "Inspect candidate template selected for preview only."),
                    _blocked_menu_item(
                        "candidate-generate",
                        "Generate candidate",
                        "blocked",
                        "Provider generation is blocked in this packet.",
                        "Provider generation would create a generated asset candidate.",
                        "Add a provider proof/admission packet with operator approval first.",
                    ),
                    _menu_item("candidate-refine", "Refine candidate prompt", "plan-only", "select-template-transform-plan", "Transform plan template selected; no execution is admitted."),
                    _menu_item("candidate-validate", "Validate metadata", "preflight-only", "preflight", "Metadata validation remains preflight-only."),
                ],
            ),
            AssetForgeContextMenuGroupRecord(
                group_id="stage",
                label="Stage",
                items=[
                    _menu_item("stage-plan", "Stage plan", "plan-only", "stage-plan", "Stage planning is plan-only."),
                    _menu_item("stage-write", "Stage write", "proof-only", "blocked", "Stage write is gated/proof-only and is not executed from this UI."),
                    _menu_item("stage-readback", "Stage readback", "read-only", "open-evidence", "Stage readback is evidence review only."),
                    _blocked_menu_item(
                        "stage-ap",
                        "Asset Processor validate",
                        "blocked",
                        "Asset Processor execution is blocked.",
                        "Asset Processor execution is outside this editor model contract.",
                        "Add a bounded AP validation corridor with approval and readback first.",
                    ),
                ],
            ),
            AssetForgeContextMenuGroupRecord(
                group_id="proof",
                label="Proof",
                items=[
                    _menu_item("proof-template", "Load placement proof-only template", "proof-only", "select-template-placement-proof-only", "Placement proof-only template selected; autoExecute=false."),
                    _menu_item("proof-evidence", "Open proof evidence", "read-only", "open-evidence", "Opening proof evidence is read-only."),
                    _blocked_menu_item(
                        "proof-execute",
                        "Placement execution",
                        "blocked",
                        "Placement execution is blocked.",
                        "Placement execution would mutate O3DE runtime or level state.",
                        "Add an exact placement admission decision and corridor first.",
                    ),
                    _blocked_menu_item(
                        "proof-write",
                        "Placement write",
                        "blocked",
                        "Placement write is blocked.",
                        "Placement write would mutate O3DE level/prefab state.",
                        "Add an exact placement write admission corridor with readback and restore discipline first.",
                    ),
                ],
            ),
            AssetForgeContextMenuGroupRecord(
                group_id="review",
                label="Review",
                items=[
                    _menu_item("review-run", "Latest run", "read-only", "view-run", "Latest run opened as read-only evidence."),
                    _menu_item("review-execution", "Latest execution", "read-only", "view-execution", "Latest execution opened as read-only evidence."),
                    _menu_item("review-artifact", "Latest artifact", "read-only", "view-artifact", "Latest artifact opened as read-only evidence."),
                    _menu_item("review-evidence", "Evidence drawer", "read-only", "open-evidence", "Evidence drawer is read-only."),
                ],
            ),
            AssetForgeContextMenuGroupRecord(
                group_id="help",
                label="Help",
                items=[
                    _menu_item("help-safety", "Safety model", "read-only", "safety-tab", "Safety model shown; mutation flags remain false."),
                    _blocked_menu_item(
                        "help-blocked",
                        "What is blocked",
                        "safety-tab",
                        "Blocked capabilities shown in Safety tab.",
                        "Blocked capabilities cannot be bypassed from the editor UI.",
                        "Use separate design/proof/admission packets for each capability.",
                    ),
                    _menu_item("help-unlock", "Next unlock", "plan-only", "safety-tab", "Next unlock requires a separate backend admission packet."),
                ],
            ),
        ],
        workflow_stages=[
            _workflow_stage(
                "describe",
                "Describe",
                "plan-only",
                "select-template-inspect-candidate",
                "Creative description is plan-only metadata; no prompt auto-executes.",
                prompt_template_id="inspect-candidate",
            ),
            _workflow_stage(
                "candidate",
                "Candidate",
                "demo",
                "select-object",
                "Candidate selection is UI state only; no provider generation is admitted.",
            ),
            _workflow_stage(
                "preflight",
                "Preflight",
                "preflight-only",
                "preflight",
                "Preflight can review readiness metadata only; no tools execute.",
                prompt_template_id="inspect-candidate",
            ),
            _workflow_stage(
                "stage-plan",
                "Stage Plan",
                "plan-only",
                "stage-plan",
                "Stage planning remains plan-only; no source files are written.",
            ),
            _workflow_stage(
                "stage-write",
                "Stage Write",
                "proof-only",
                "select-template-placement-proof-only",
                "Stage write remains proof-only metadata; no project write or Asset Processor execution occurs.",
                prompt_template_id="placement-proof-only",
            ),
            _workflow_stage(
                "readback",
                "Readback",
                "read-only",
                "open-evidence",
                "Readback opens evidence only; no runtime execution or cache mutation occurs.",
            ),
            _workflow_stage(
                "placement-proof",
                "Placement Proof",
                "proof-only",
                "select-template-placement-proof-only",
                "Placement proof stays proof-only; placement write is not admitted.",
                prompt_template_id="placement-proof-only",
            ),
            _workflow_stage(
                "review",
                "Review",
                "read-only",
                "open-evidence",
                "Review is read-only operator evidence; approval does not mutate assets.",
            ),
        ],
        outliner=[
            AssetForgeOutlinerNodeRecord(node_id="scene", label="Scene", kind="scene", depth=0, truth_state="read-only"),
            AssetForgeOutlinerNodeRecord(node_id="asset-root", label="Asset Root", kind="root", depth=1, truth_state="demo", selected=True),
            AssetForgeOutlinerNodeRecord(node_id="mesh-lod0", label="Mesh_LOD0", kind="mesh", depth=2, truth_state="demo"),
            AssetForgeOutlinerNodeRecord(node_id="mesh-lod1", label="Mesh_LOD1 planned", kind="mesh", depth=2, truth_state="plan-only"),
            AssetForgeOutlinerNodeRecord(node_id="mesh-topology", label="Topology", kind="mesh-topology", depth=3, truth_state="read-only"),
            AssetForgeOutlinerNodeRecord(node_id="mesh-uv-maps", label="UV Maps", kind="uv", depth=3, truth_state="read-only"),
            AssetForgeOutlinerNodeRecord(node_id="mesh-material-slots", label="Material Slots", kind="material-slot", depth=3, truth_state="read-only"),
            AssetForgeOutlinerNodeRecord(node_id="materials", label="Materials", kind="material", depth=2, truth_state="blocked"),
            AssetForgeOutlinerNodeRecord(node_id="textures", label="Textures", kind="texture", depth=2, truth_state="read-only"),
            AssetForgeOutlinerNodeRecord(node_id="collision", label="Collision Proxy", kind="collision", depth=2, truth_state="plan-only"),
            AssetForgeOutlinerNodeRecord(node_id="export-manifest", label="Export Readiness", kind="manifest", depth=2, truth_state="preflight-only"),
        ],
        transform=transform,
        properties=AssetForgePropertiesRecord(
            selected_object="Weathered Ivy Arch",
            material_preview_status="preview_metadata_only_mutation_blocked",
            sections=["Transform", "Object", "Material", "Proof", "Safety"],
            rows=property_rows,
        ),
        material_preview=AssetForgeMaterialPreviewRecord(
            preview_shape="sphere",
            preview_surface="checker",
            checker_visible=True,
            tabs=["Surface", "Wire", "Volume", "Halo"],
            active_tab="Surface",
            metadata_status="read_only_preview_metadata",
            mutation_admitted=False,
            rows=material_rows,
        ),
        mesh_preview=AssetForgeMeshPreviewRecord(
            source_node_id="mesh-lod0",
            mesh_label="Weathered Ivy Arch Mesh_LOD0",
            preview_kind="wireframe_bust_placeholder",
            topology_status="read_only_contract_no_real_mesh_loaded",
            estimated_vertices=0,
            estimated_faces=0,
            estimated_triangles=0,
            uv_layers=["UV0_demo_read_only"],
            material_slots=["Ivy_Bark_Demo", "Ivy_Leaf_Demo"],
            wireframe_visible=True,
            selection_outline_visible=True,
            overlays=[
                "No real mesh loaded; topology is display metadata only",
                "Wireframe and material slots are backend contract data",
                "Mesh/material mutation remains blocked",
            ],
            execution_admitted=False,
            mutation_admitted=False,
            rows=mesh_rows,
        ),
        timeline=AssetForgeTimelineRecord(
            start_frame=1,
            end_frame=250,
            current_frame=1,
            status="timeline_ui_only_no_animation_execution",
        ),
        status_strip_tabs=[
            _status_strip_tab(
                "timeline",
                "Timeline",
                "demo",
                "timeline",
                "Timeline frame strip is UI-only; no animation playback or keyframe execution occurs.",
            ),
            _status_strip_tab(
                "evidence",
                "Evidence",
                "read-only",
                "evidence",
                "Evidence drill-in opens read-only run/execution/artifact references.",
            ),
            _status_strip_tab(
                "prompt-template",
                "Prompt Template",
                "read-only",
                "prompt-template",
                "Prompt templates are preview-first with autoExecute=false.",
            ),
            _status_strip_tab(
                "logs",
                "Logs",
                "read-only",
                "logs",
                "Logs summarize UI-only blocked/preflight/proof-only messages.",
            ),
            _status_strip_tab(
                "latest-artifacts",
                "Latest Artifacts",
                "read-only",
                "latest-artifacts",
                "Latest artifact identifiers are read-only references when present.",
            ),
        ],
        evidence=AssetForgeEvidenceSummaryRecord(
            stage_write_evidence_reference="packet-10/stage-write-evidence.json",
            stage_write_readback_reference="packet-10/readback-evidence.json",
            stage_write_readback_status="not_loaded",
        ),
        prompt_templates=[
            AssetForgePromptTemplateRecord(
                template_id="inspect-candidate",
                label="Inspect candidate",
                description="Read-only candidate readiness inspection.",
                text="Inspect the current Asset Forge candidate and summarize provider readiness, Blender readiness, O3DE stage/readback readiness, blocked capabilities, and safest next step. Do not mutate content.",
                truth_state="read-only",
                safety_labels=["read-only", "no mutation", "autoExecute=false"],
            ),
            AssetForgePromptTemplateRecord(
                template_id="placement-proof-only",
                label="Placement proof-only",
                description="Proof-only placement review prompt; no placement write.",
                text='In the editor, create a placement proof-only candidate with candidate_id "candidate-a", candidate_label "Weathered Ivy Arch", staged_source_relative_path "Assets/Generated/asset_forge/candidate_a/candidate_a.glb", target_level_relative_path "Levels/BridgeLevel01/BridgeLevel01.prefab", target_entity_name "AssetForgeCandidateA", target_component "Mesh", stage_write_evidence_reference "packet-10/stage-write-evidence.json", stage_write_readback_reference "packet-10/readback-evidence.json", stage_write_readback_status "succeeded", approval_state "approved", and approval_note "bounded proof-only review".',
                truth_state="proof-only",
                safety_labels=["proof-only", "no placement write", "autoExecute=false"],
            ),
            AssetForgePromptTemplateRecord(
                template_id="transform-plan",
                label="Transform plan",
                description="Plan a safe transform update from UI draft values.",
                text="Plan a safe transform update for the selected Asset Forge candidate using draft location, rotation, scale, and dimensions values. Do not execute mutation. Return required admission gates, readback requirements, and revert/restore plan.",
                truth_state="plan-only",
                safety_labels=["plan-only", "draft only", "autoExecute=false"],
            ),
        ],
        blocked_capabilities=[
            AssetForgeBlockedCapabilityRecord(
                capability_id="provider-generation",
                label="Provider generation",
                reason="Provider task creation is not admitted in this editor model packet.",
                next_unlock="Separate provider proof/admission packet with operator approval.",
            ),
            AssetForgeBlockedCapabilityRecord(
                capability_id="blender-execution",
                label="Blender execution",
                reason="Starting Blender or running Blender Python is not admitted.",
                next_unlock="Separate Blender preflight/proof packet with explicit execution gates.",
            ),
            AssetForgeBlockedCapabilityRecord(
                capability_id="asset-processor-execution",
                label="Asset Processor execution",
                reason="Asset Processor execution is not admitted from the editor UI.",
                next_unlock="Separate AP validation corridor with bounded target, proof, and approval.",
            ),
            AssetForgeBlockedCapabilityRecord(
                capability_id="placement-write",
                label="Placement write",
                reason="Placement remains proof-only; O3DE level/prefab mutation is not admitted.",
                next_unlock="Separate placement admission decision and exact corridor implementation.",
            ),
            AssetForgeBlockedCapabilityRecord(
                capability_id="material-prefab-mutation",
                label="Material/prefab mutation",
                reason="Material and prefab mutation would alter project assets.",
                next_unlock="Separate material/prefab design, proof, approval, and readback gates.",
            ),
        ],
        next_safe_action="Use the editor UI for selection, draft planning, preflight review, and prompt-template handoff only.",
    )
