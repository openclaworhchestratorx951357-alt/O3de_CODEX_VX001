from fastapi import APIRouter, Query

from app.models.asset_forge import (
    AssetForgeBlenderInspectReport,
    AssetForgeBlenderInspectRequest,
    AssetForgeBlenderStatusRecord,
    AssetForgeStudioStatusRecord,
    AssetForgeO3DEReadbackRecord,
    AssetForgeO3DEReadbackRequest,
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
    AssetForgeO3DEPlacementProofRecord,
    AssetForgeO3DEPlacementProofRequest,
    AssetForgeO3DEStagePlanRecord,
    AssetForgeO3DEStagePlanRequest,
    AssetForgeO3DEStageWriteRecord,
    AssetForgeO3DEStageWriteRequest,
    AssetForgeProviderStatusRecord,
    AssetForgeTaskRecord,
    AssetForgeTaskPlanRequest,
)
from app.services.asset_forge import asset_forge_service

router = APIRouter(tags=["asset-forge"])


@router.get("/asset-forge/task", response_model=AssetForgeTaskRecord)
def get_asset_forge_task() -> AssetForgeTaskRecord:
    return asset_forge_service.get_task()


@router.post("/asset-forge/task/plan", response_model=AssetForgeTaskRecord)
def create_asset_forge_task_plan(
    request: AssetForgeTaskPlanRequest,
) -> AssetForgeTaskRecord:
    return asset_forge_service.create_task_plan(request)


@router.get("/asset-forge/provider/status", response_model=AssetForgeProviderStatusRecord)
def get_asset_forge_provider_status() -> AssetForgeProviderStatusRecord:
    return asset_forge_service.get_provider_status()


@router.get("/asset-forge/blender/status", response_model=AssetForgeBlenderStatusRecord)
def get_asset_forge_blender_status() -> AssetForgeBlenderStatusRecord:
    return asset_forge_service.get_blender_status()


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
