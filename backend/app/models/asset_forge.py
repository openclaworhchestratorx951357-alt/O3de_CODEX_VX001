from typing import Literal

from pydantic import BaseModel, Field


class AssetForgeCandidateRecord(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    display_name: str = Field(..., min_length=1)
    status: Literal["demo", "selected", "rejected", "failed", "staged", "planned"]
    preview_notes: str = Field(..., min_length=1)
    readiness_placeholder: str = Field(..., min_length=1)
    estimated_triangles: str = Field(..., min_length=1)


class AssetForgeTaskRecord(BaseModel):
    task_id: str = Field(..., min_length=1)
    task_label: str = Field(..., min_length=1)
    status: Literal["plan-only", "demo"]
    prompt_text: str = Field(..., min_length=1)
    created_at: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)
    warnings: list[str] = Field(default_factory=list)
    candidates: list[AssetForgeCandidateRecord] = Field(default_factory=list)


class AssetForgeTaskPlanRequest(BaseModel):
    prompt_text: str = Field(..., min_length=1)
    style_tags: list[str] = Field(default_factory=list)
    target_triangle_budget: str = Field(default="~20k tris", min_length=1)
    output_format: Literal["glb", "fbx", "obj"] = "glb"
    source: str = Field(default="asset-forge-ui-plan-request", min_length=1)


class AssetForgeServerApprovalSessionPrepareRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    requested_capability: Literal[
        "asset_forge.o3de.stage.write",
        "asset_forge.o3de.placement.execute",
        "asset_forge.o3de.placement.harness.execute",
        "asset_forge.o3de.placement.live_proof",
    ]
    stage_relative_path: str | None = None
    target_level_relative_path: str | None = None
    target_entity_name: str | None = None
    selected_platform: str | None = None
    requested_by: str = Field(default="asset-forge-operator", min_length=1)
    requested_reason: str = Field(default="", min_length=0)
    requested_ttl_seconds: int | None = Field(default=None, ge=60, le=86400)
    source: str = Field(default="asset-forge-server-approval-request", min_length=1)


class AssetForgeServerApprovalSessionRevokeRequest(BaseModel):
    revoked_by: str = Field(default="asset-forge-operator", min_length=1)
    revoke_reason: str = Field(default="", min_length=0)


class AssetForgeServerApprovalSessionRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["preflight-only"]
    session_id: str = Field(..., min_length=1)
    requested_capability: str = Field(..., min_length=1)
    session_status: Literal["pending", "approved", "rejected", "revoked", "expired"]
    server_owned: bool
    authorization_granted: bool
    request_binding: dict[str, object] = Field(default_factory=dict)
    request_fingerprint: str = Field(..., min_length=1)
    requested_by: str = Field(..., min_length=1)
    requested_reason: str | None = None
    requested_at: str = Field(..., min_length=1)
    expires_at: str = Field(..., min_length=1)
    decided_at: str | None = None
    revoked_at: str | None = None
    revoked_by: str | None = None
    revoke_reason: str | None = None
    token_preview: str = Field(..., min_length=1)
    approval_policy: dict[str, object] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeServerApprovalSessionIndexRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["preflight-only"]
    index_status: Literal["succeeded", "empty"]
    session_count: int
    sessions: list[AssetForgeServerApprovalSessionRecord] = Field(default_factory=list)
    read_only: bool
    warnings: list[str] = Field(default_factory=list)
    source: str = Field(..., min_length=1)


class AssetForgeProviderRegistryEntry(BaseModel):
    provider_id: str = Field(..., min_length=1)
    display_name: str = Field(..., min_length=1)
    mode: Literal["disabled", "mock", "configured", "real"]
    configured: bool
    note: str = Field(..., min_length=1)


class AssetForgeProviderStatusRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["preflight-only"]
    provider_mode: Literal["disabled", "mock", "configured", "real"]
    configuration_ready: bool
    credential_status: str = Field(..., min_length=1)
    external_task_creation_allowed: bool
    generation_execution_status: Literal["blocked"]
    providers: list[AssetForgeProviderRegistryEntry] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeBlenderStatusRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["preflight-only"]
    executable_found: bool
    executable_path: str | None = None
    detection_source: str = Field(..., min_length=1)
    version: str | None = None
    version_probe_status: Literal["detected", "missing", "failed"]
    blender_prep_execution_status: Literal["blocked"]
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeStudioLaneStatusRecord(BaseModel):
    lane: Literal["Provider", "Blender", "O3DE ingest", "Placement", "Review"]
    truth: Literal["demo", "plan-only", "preflight-only", "gated-real", "blocked"]
    detail: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeStudioStatusRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["preflight-only"]
    lanes: list[AssetForgeStudioLaneStatusRecord] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeBlenderInspectRequest(BaseModel):
    artifact_path: str = Field(..., min_length=1)


class AssetForgeBlenderInspectReport(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["preflight-only"]
    inspection_status: Literal["succeeded", "blocked", "failed"]
    artifact_path: str = Field(..., min_length=1)
    runtime_root: str = Field(..., min_length=1)
    artifact_within_runtime_root: bool
    extension_allowed: bool
    script_id: Literal["asset_forge_blender_readonly_inspector_v1"]
    script_path: str = Field(..., min_length=1)
    script_execution_status: Literal["executed", "blocked", "failed"]
    blender_execution_status: Literal["blocked"]
    metadata: dict[str, object] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeO3DEStagePlanRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    desired_extension: str = Field(default=".glb", min_length=1)


class AssetForgeO3DEStagePlanRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["plan-only"]
    plan_status: Literal["ready-for-approval", "blocked"]
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    project_root_hint: str | None = None
    deterministic_staging_relative_path: str = Field(..., min_length=1)
    deterministic_manifest_relative_path: str = Field(..., min_length=1)
    expected_source_asset_path: str = Field(..., min_length=1)
    stage_plan_policy: dict[str, object] = Field(default_factory=dict)
    approval_required: bool
    project_write_admitted: bool
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeO3DEStageWriteRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    source_artifact_path: str = Field(..., min_length=1)
    stage_relative_path: str = Field(..., min_length=1)
    manifest_relative_path: str = Field(..., min_length=1)
    approval_state: Literal["not-approved", "approved"] = "not-approved"
    approval_note: str = Field(default="", min_length=0)
    approval_session_id: str | None = None


class AssetForgeO3DEStageWriteRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["approval-gated-write"]
    write_status: Literal["approval-required", "succeeded", "blocked", "failed"]
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    project_root: str | None = None
    source_artifact_path: str = Field(..., min_length=1)
    destination_source_asset_path: str | None = None
    destination_manifest_path: str | None = None
    approval_required: bool
    approval_state: Literal["not-approved", "approved"]
    server_approval_session_id: str | None = None
    server_approval_evaluation: dict[str, object] = Field(default_factory=dict)
    write_executed: bool
    project_write_admitted: bool
    bytes_copied: int | None = None
    source_sha256: str | None = None
    destination_sha256: str | None = None
    manifest_sha256: str | None = None
    post_write_readback: dict[str, object] = Field(default_factory=dict)
    revert_paths: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeO3DEReadbackRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    source_asset_relative_path: str = Field(..., min_length=1)
    selected_platform: str = Field(default="pc", min_length=1)


class AssetForgeO3DEReadbackRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["preflight-only"]
    readback_status: Literal["succeeded", "blocked", "failed"]
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    project_root: str | None = None
    source_asset_relative_path: str = Field(..., min_length=1)
    source_asset_absolute_path: str | None = None
    selected_platform: str = Field(..., min_length=1)
    source_exists: bool
    source_size_bytes: int | None = None
    source_sha256: str | None = None
    asset_database_path: str | None = None
    asset_database_exists: bool
    asset_database_freshness_status: Literal["fresh", "stale_or_unverified", "missing", "unknown"]
    asset_database_last_write_time: str | None = None
    source_found_in_assetdb: bool
    source_id: int | None = None
    source_guid: str | None = None
    asset_processor_job_rows: list[str] = Field(default_factory=list)
    asset_processor_warning_count: int
    asset_processor_error_count: int
    product_count: int
    dependency_count: int
    representative_products: list[str] = Field(default_factory=list)
    representative_dependencies: list[str] = Field(default_factory=list)
    catalog_path: str | None = None
    catalog_exists: bool
    catalog_freshness_status: Literal["fresh", "stale_or_unverified", "missing", "unknown"]
    catalog_last_write_time: str | None = None
    catalog_presence: bool
    catalog_product_path_presence: list[str] = Field(default_factory=list)
    read_only: bool
    mutation_occurred: bool
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeO3DEPlacementPlanRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    staged_source_relative_path: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    target_entity_name: str = Field(..., min_length=1)
    target_component: str = Field(default="Mesh", min_length=1)


class AssetForgeO3DEPlacementPlanRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["plan-only"]
    plan_status: Literal["ready-for-approval", "blocked"]
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    staged_source_relative_path: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    target_entity_name: str = Field(..., min_length=1)
    target_component: str = Field(..., min_length=1)
    placement_execution_status: Literal["blocked"]
    approval_required: bool
    placement_write_admitted: bool
    placement_plan_policy: dict[str, object] = Field(default_factory=dict)
    placement_plan_summary: str = Field(..., min_length=1)
    requirement_checklist: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeO3DEPlacementProofRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    staged_source_relative_path: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    target_entity_name: str = Field(..., min_length=1)
    target_component: str = Field(default="Mesh", min_length=1)
    approval_state: Literal["not-approved", "approved"] = "not-approved"
    approval_note: str = Field(default="", min_length=0)
    approval_session_id: str | None = None


class AssetForgeO3DEPlacementProofRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["proof-only"]
    proof_status: Literal["approval-required", "blocked", "ready-for-runtime-proof"]
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    staged_source_relative_path: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    target_entity_name: str = Field(..., min_length=1)
    target_component: str = Field(..., min_length=1)
    approval_required: bool
    approval_state: Literal["not-approved", "approved"]
    server_approval_session_id: str | None = None
    server_approval_evaluation: dict[str, object] = Field(default_factory=dict)
    placement_proof_policy: dict[str, object] = Field(default_factory=dict)
    placement_execution_status: Literal["blocked"]
    proof_runtime_gate_enabled: bool
    write_occurred: bool
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeO3DEPlacementEvidenceRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    staged_source_relative_path: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    selected_platform: str = Field(default="pc", min_length=1)


class AssetForgeO3DEPlacementEvidenceRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["preflight-only"]
    evidence_status: Literal["succeeded", "blocked"]
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    project_root: str | None = None
    staged_source_relative_path: str = Field(..., min_length=1)
    staged_source_absolute_path: str | None = None
    target_level_relative_path: str = Field(..., min_length=1)
    target_level_absolute_path: str | None = None
    selected_platform: str = Field(..., min_length=1)
    staged_source_exists: bool
    target_level_exists: bool
    asset_database_path: str | None = None
    asset_database_exists: bool
    source_found_in_assetdb: bool
    source_id: int | None = None
    source_guid: str | None = None
    product_count: int
    dependency_count: int
    read_only: bool
    mutation_occurred: bool
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeO3DEPlacementHarnessRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    staged_source_relative_path: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    target_entity_name: str = Field(..., min_length=1)
    target_component: str = Field(default="Mesh", min_length=1)
    selected_platform: str = Field(default="pc", min_length=1)


class AssetForgeO3DEPlacementHarnessRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["plan-only"]
    harness_status: Literal["blocked", "ready-for-admitted-runtime-harness"]
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    staged_source_relative_path: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    target_entity_name: str = Field(..., min_length=1)
    target_component: str = Field(..., min_length=1)
    selected_platform: str = Field(..., min_length=1)
    bridge_configured: bool
    bridge_heartbeat_fresh: bool
    runtime_gate_enabled: bool
    execution_performed: bool
    read_only: bool
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeO3DEPlacementHarnessExecuteRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    staged_source_relative_path: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    target_entity_name: str = Field(..., min_length=1)
    target_component: str = Field(default="Mesh", min_length=1)
    selected_platform: str = Field(default="pc", min_length=1)
    approval_state: Literal["not-approved", "approved"] = "not-approved"
    approval_note: str = Field(default="", min_length=0)
    approval_session_id: str | None = None


class AssetForgeO3DEPlacementHarnessExecuteRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["proof-only"]
    execute_status: Literal["approval-required", "blocked", "submitted-proof-only"]
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    staged_source_relative_path: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    target_entity_name: str = Field(..., min_length=1)
    target_component: str = Field(..., min_length=1)
    selected_platform: str = Field(..., min_length=1)
    bridge_configured: bool
    bridge_heartbeat_fresh: bool
    runtime_gate_enabled: bool
    approval_state: Literal["not-approved", "approved"]
    server_approval_session_id: str | None = None
    server_approval_evaluation: dict[str, object] = Field(default_factory=dict)
    bridge_command_id: str | None = None
    execution_performed: bool
    readback_captured: bool
    read_only: bool
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgeO3DEPlacementLiveProofRequest(BaseModel):
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    target_entity_name: str = Field(..., min_length=1)
    selected_platform: str = Field(default="pc", min_length=1)
    approval_state: Literal["not-approved", "approved"] = "not-approved"
    approval_note: str = Field(default="", min_length=0)
    approval_session_id: str | None = None


class AssetForgeO3DEPlacementLiveProofRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["proof-only"]
    proof_status: Literal["approval-required", "blocked", "succeeded"]
    candidate_id: str = Field(..., min_length=1)
    candidate_label: str = Field(..., min_length=1)
    target_level_relative_path: str = Field(..., min_length=1)
    target_entity_name: str = Field(..., min_length=1)
    selected_platform: str = Field(..., min_length=1)
    bridge_configured: bool
    bridge_heartbeat_fresh: bool
    runtime_gate_enabled: bool
    server_approval_session_id: str | None = None
    server_approval_evaluation: dict[str, object] = Field(default_factory=dict)
    execution_performed: bool
    readback_captured: bool
    entity_exists: bool | None = None
    bridge_command_id: str | None = None
    evidence_bundle_path: str | None = None
    revert_statement: str = Field(..., min_length=1)
    read_only: bool
    warnings: list[str] = Field(default_factory=list)
    safest_next_step: str = Field(..., min_length=1)
    source: str = Field(..., min_length=1)


class AssetForgePlacementEvidenceBundleItem(BaseModel):
    path: str = Field(..., min_length=1)
    recorded_at: str | None = None
    candidate_id: str | None = None
    bridge_command_id: str | None = None
    proof_status: str | None = None
    age_seconds: int | None = None


class AssetForgePlacementEvidenceIndexRecord(BaseModel):
    capability_name: str = Field(..., min_length=1)
    maturity: Literal["preflight-only"]
    index_status: Literal["succeeded", "empty"]
    runtime_root: str = Field(..., min_length=1)
    evidence_dir: str = Field(..., min_length=1)
    applied_filters: dict[str, object] = Field(default_factory=dict)
    freshness_window_seconds: int
    fresh_item_count: int
    items: list[AssetForgePlacementEvidenceBundleItem] = Field(default_factory=list)
    read_only: bool
    warnings: list[str] = Field(default_factory=list)
    source: str = Field(..., min_length=1)
