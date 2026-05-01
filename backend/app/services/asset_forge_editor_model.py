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


class AssetForgeTimelineRecord(BaseModel):
    start_frame: int
    end_frame: int
    current_frame: int
    status: str


class AssetForgeContextMenuGroupRecord(BaseModel):
    group_id: str
    label: str
    items: list[dict[str, object]] = Field(default_factory=list)


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
    outliner: list[AssetForgeOutlinerNodeRecord]
    transform: AssetForgeTransformRecord
    properties: AssetForgePropertiesRecord
    material_preview: AssetForgeMaterialPreviewRecord
    timeline: AssetForgeTimelineRecord
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
                group_id="view",
                label="View",
                items=[
                    {"item_id": "solid", "label": "Solid", "truth_state": "demo", "execution_admitted": False},
                    {"item_id": "wireframe", "label": "Wireframe", "truth_state": "demo", "execution_admitted": False},
                    {"item_id": "o3de-preview", "label": "O3DE Preview", "truth_state": "preflight-only", "execution_admitted": False},
                ],
            ),
            AssetForgeContextMenuGroupRecord(
                group_id="proof",
                label="Proof",
                items=[
                    {"item_id": "placement-proof-only", "label": "Load placement proof-only template", "truth_state": "proof-only", "auto_execute": False},
                    {"item_id": "placement-write", "label": "Placement write", "truth_state": "blocked", "execution_admitted": False},
                ],
            ),
        ],
        outliner=[
            AssetForgeOutlinerNodeRecord(node_id="scene", label="Scene", kind="scene", depth=0, truth_state="read-only"),
            AssetForgeOutlinerNodeRecord(node_id="asset-root", label="Asset Root", kind="root", depth=1, truth_state="demo", selected=True),
            AssetForgeOutlinerNodeRecord(node_id="mesh-lod0", label="Mesh_LOD0", kind="mesh", depth=2, truth_state="demo"),
            AssetForgeOutlinerNodeRecord(node_id="mesh-lod1", label="Mesh_LOD1 planned", kind="mesh", depth=2, truth_state="plan-only"),
            AssetForgeOutlinerNodeRecord(node_id="materials", label="Materials", kind="material", depth=2, truth_state="blocked"),
            AssetForgeOutlinerNodeRecord(node_id="textures", label="Textures", kind="texture", depth=2, truth_state="read-only"),
            AssetForgeOutlinerNodeRecord(node_id="collision", label="Collision planned", kind="collision", depth=2, truth_state="plan-only"),
            AssetForgeOutlinerNodeRecord(node_id="export-manifest", label="Export Manifest planned", kind="manifest", depth=2, truth_state="plan-only"),
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
        timeline=AssetForgeTimelineRecord(
            start_frame=1,
            end_frame=250,
            current_frame=1,
            status="timeline_ui_only_no_animation_execution",
        ),
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
