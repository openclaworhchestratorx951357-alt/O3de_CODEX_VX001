from fastapi import APIRouter, HTTPException, Query

from app.models.asset_forge import (
    AssetForgeBlenderInspectReport,
    AssetForgeBlenderInspectRequest,
    AssetForgeBlenderStatusRecord,
    AssetForgeStudioStatusRecord,
    AssetForgeO3DEReadbackRecord,
    AssetForgeO3DEReadbackRequest,
    AssetForgeO3DEReviewPacketRecord,
    AssetForgeO3DEReviewPacketRequest,
    AssetForgeO3DEAssignmentDesignRecord,
    AssetForgeO3DEAssignmentDesignRequest,
    AssetForgeO3DEPlacementPlanRecord,
    AssetForgeO3DEPlacementPlanRequest,
    AssetForgeO3DEPlacementHarnessRecord,
    AssetForgeO3DEPlacementHarnessRequest,
    AssetForgeO3DEPlacementHarnessExecuteRecord,
    AssetForgeO3DEPlacementHarnessExecuteRequest,
    AssetForgeO3DEPlacementLiveProofRecord,
    AssetForgeO3DEPlacementLiveProofRequest,
    AssetForgePlacementEvidenceIndexRecord,
    AssetForgeO3DEPlacementEvidenceRecord,
    AssetForgeO3DEPlacementEvidenceRequest,
    AssetForgeEditorPlacementProofOnlyRecord,
    AssetForgeEditorPlacementProofOnlyRequest,
    AssetForgeO3DEPlacementProofRecord,
    AssetForgeO3DEPlacementProofRequest,
    AssetForgeO3DEStagePlanRecord,
    AssetForgeO3DEStagePlanRequest,
    AssetForgeO3DEStageWriteRecord,
    AssetForgeO3DEStageWriteRequest,
    AssetForgeProviderStatusRecord,
    AssetForgeTaskRecord,
    AssetForgeTaskPlanRequest,
    AssetForgeServerApprovalSessionIndexRecord,
    AssetForgeServerApprovalSessionPrepareRequest,
    AssetForgeServerApprovalSessionRecord,
    AssetForgeServerApprovalSessionRevokeRequest,
)
from app.services.asset_forge import asset_forge_service
from app.services.asset_forge_editor_model import (
    AssetForgeEditorModelRecord,
    build_asset_forge_editor_model,
)

router = APIRouter(tags=["asset-forge"])


@router.get("/asset-forge/task", response_model=AssetForgeTaskRecord)
def get_asset_forge_task() -> AssetForgeTaskRecord:
    return asset_forge_service.get_task()


@router.post("/asset-forge/task/plan", response_model=AssetForgeTaskRecord)
def create_asset_forge_task_plan(
    request: AssetForgeTaskPlanRequest,
) -> AssetForgeTaskRecord:
    return asset_forge_service.create_task_plan(request)


@router.get(
    "/asset-forge/approval-sessions",
    response_model=AssetForgeServerApprovalSessionIndexRecord,
)
def list_asset_forge_server_approval_sessions() -> AssetForgeServerApprovalSessionIndexRecord:
    return asset_forge_service.list_server_approval_sessions()


@router.post(
    "/asset-forge/approval-sessions/prepare",
    response_model=AssetForgeServerApprovalSessionRecord,
)
def prepare_asset_forge_server_approval_session(
    request: AssetForgeServerApprovalSessionPrepareRequest,
) -> AssetForgeServerApprovalSessionRecord:
    return asset_forge_service.prepare_server_approval_session(request)


@router.get(
    "/asset-forge/approval-sessions/{session_id}",
    response_model=AssetForgeServerApprovalSessionRecord,
)
def get_asset_forge_server_approval_session(
    session_id: str,
) -> AssetForgeServerApprovalSessionRecord:
    record = asset_forge_service.get_server_approval_session(session_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"Asset Forge approval session '{session_id}' was not found.",
        )
    return record


@router.post(
    "/asset-forge/approval-sessions/{session_id}/revoke",
    response_model=AssetForgeServerApprovalSessionRecord,
)
def revoke_asset_forge_server_approval_session(
    session_id: str,
    request: AssetForgeServerApprovalSessionRevokeRequest | None = None,
) -> AssetForgeServerApprovalSessionRecord:
    record = asset_forge_service.revoke_server_approval_session(session_id, request)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail=f"Asset Forge approval session '{session_id}' was not found.",
        )
    return record


@router.get("/asset-forge/provider/status", response_model=AssetForgeProviderStatusRecord)
def get_asset_forge_provider_status() -> AssetForgeProviderStatusRecord:
    return asset_forge_service.get_provider_status()


@router.get("/asset-forge/blender/status", response_model=AssetForgeBlenderStatusRecord)
def get_asset_forge_blender_status() -> AssetForgeBlenderStatusRecord:
    return asset_forge_service.get_blender_status()


@router.get("/asset-forge/editor-model", response_model=AssetForgeEditorModelRecord)
def get_asset_forge_editor_model() -> AssetForgeEditorModelRecord:
    return build_asset_forge_editor_model()


@router.get("/asset-forge/studio/status", response_model=AssetForgeStudioStatusRecord)
def get_asset_forge_studio_status() -> AssetForgeStudioStatusRecord:
    return asset_forge_service.get_studio_status()


@router.post(
    "/asset-forge/blender/inspect",
    response_model=AssetForgeBlenderInspectReport,
)
def inspect_asset_forge_blender_candidate(
    request: AssetForgeBlenderInspectRequest,
) -> AssetForgeBlenderInspectReport:
    return asset_forge_service.inspect_blender_candidate(request)


@router.post(
    "/asset-forge/o3de/stage-plan",
    response_model=AssetForgeO3DEStagePlanRecord,
)
def create_asset_forge_o3de_stage_plan(
    request: AssetForgeO3DEStagePlanRequest,
) -> AssetForgeO3DEStagePlanRecord:
    return asset_forge_service.create_o3de_stage_plan(request)


@router.post(
    "/asset-forge/o3de/stage-write",
    response_model=AssetForgeO3DEStageWriteRecord,
)
def execute_asset_forge_o3de_stage_write(
    request: AssetForgeO3DEStageWriteRequest,
) -> AssetForgeO3DEStageWriteRecord:
    return asset_forge_service.execute_o3de_stage_write(request)


@router.post(
    "/asset-forge/o3de/readback",
    response_model=AssetForgeO3DEReadbackRecord,
)
def read_asset_forge_o3de_ingest_evidence(
    request: AssetForgeO3DEReadbackRequest,
) -> AssetForgeO3DEReadbackRecord:
    return asset_forge_service.read_o3de_ingest_readback(request)


@router.post(
    "/asset-forge/o3de/review-packet",
    response_model=AssetForgeO3DEReviewPacketRecord,
)
def create_asset_forge_o3de_operator_review_packet(
    request: AssetForgeO3DEReviewPacketRequest,
) -> AssetForgeO3DEReviewPacketRecord:
    return asset_forge_service.create_o3de_operator_review_packet(request)


@router.post(
    "/asset-forge/o3de/assignment-design",
    response_model=AssetForgeO3DEAssignmentDesignRecord,
)
def create_asset_forge_o3de_assignment_design(
    request: AssetForgeO3DEAssignmentDesignRequest,
) -> AssetForgeO3DEAssignmentDesignRecord:
    return asset_forge_service.create_o3de_assignment_design(request)


@router.post(
    "/asset-forge/o3de/placement-plan",
    response_model=AssetForgeO3DEPlacementPlanRecord,
)
def create_asset_forge_o3de_placement_plan(
    request: AssetForgeO3DEPlacementPlanRequest,
) -> AssetForgeO3DEPlacementPlanRecord:
    return asset_forge_service.create_o3de_placement_plan(request)


@router.post(
    "/asset-forge/o3de/placement-proof",
    response_model=AssetForgeO3DEPlacementProofRecord,
)
def execute_asset_forge_o3de_placement_proof(
    request: AssetForgeO3DEPlacementProofRequest,
) -> AssetForgeO3DEPlacementProofRecord:
    return asset_forge_service.execute_o3de_placement_proof(request)


@router.post(
    "/asset-forge/o3de/editor-placement-proof-only",
    response_model=AssetForgeEditorPlacementProofOnlyRecord,
)
def create_asset_forge_o3de_editor_placement_proof_only_candidate(
    request: AssetForgeEditorPlacementProofOnlyRequest,
) -> AssetForgeEditorPlacementProofOnlyRecord:
    return asset_forge_service.create_editor_placement_proof_only_candidate(request)


@router.post(
    "/asset-forge/o3de/placement-evidence",
    response_model=AssetForgeO3DEPlacementEvidenceRecord,
)
def read_asset_forge_o3de_placement_evidence(
    request: AssetForgeO3DEPlacementEvidenceRequest,
) -> AssetForgeO3DEPlacementEvidenceRecord:
    return asset_forge_service.read_o3de_placement_evidence(request)


@router.post(
    "/asset-forge/o3de/placement-harness/prepare",
    response_model=AssetForgeO3DEPlacementHarnessRecord,
)
def prepare_asset_forge_o3de_placement_runtime_harness(
    request: AssetForgeO3DEPlacementHarnessRequest,
) -> AssetForgeO3DEPlacementHarnessRecord:
    return asset_forge_service.prepare_o3de_placement_runtime_harness(request)


@router.post(
    "/asset-forge/o3de/placement-harness/execute",
    response_model=AssetForgeO3DEPlacementHarnessExecuteRecord,
)
def execute_asset_forge_o3de_placement_runtime_harness(
    request: AssetForgeO3DEPlacementHarnessExecuteRequest,
) -> AssetForgeO3DEPlacementHarnessExecuteRecord:
    return asset_forge_service.execute_o3de_placement_runtime_harness(request)


@router.post(
    "/asset-forge/o3de/placement-harness/live-proof",
    response_model=AssetForgeO3DEPlacementLiveProofRecord,
)
def execute_asset_forge_o3de_placement_live_proof(
    request: AssetForgeO3DEPlacementLiveProofRequest,
) -> AssetForgeO3DEPlacementLiveProofRecord:
    return asset_forge_service.execute_o3de_placement_live_proof(request)


@router.get(
    "/asset-forge/o3de/placement-harness/evidence-index",
    response_model=AssetForgePlacementEvidenceIndexRecord,
)
def get_asset_forge_o3de_placement_live_proof_evidence_index(
    limit: int = Query(default=10, ge=1, le=25),
    proof_status: str | None = Query(default=None),
    candidate_id: str | None = Query(default=None),
    from_age_s: int | None = Query(default=None, ge=0, le=86400),
) -> AssetForgePlacementEvidenceIndexRecord:
    return asset_forge_service.get_placement_live_proof_evidence_index(
        limit=limit,
        proof_status=proof_status,
        candidate_id=candidate_id,
        from_age_s=from_age_s,
    )
