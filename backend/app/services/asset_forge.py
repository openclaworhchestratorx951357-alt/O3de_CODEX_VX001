import json
import os
import shutil
import sqlite3
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any, Literal, cast
from uuid import uuid4

from app.models.asset_forge import (
    AssetForgeBlenderInspectReport,
    AssetForgeBlenderInspectRequest,
    AssetForgeBlenderStatusRecord,
    AssetForgeStudioLaneStatusRecord,
    AssetForgeStudioStatusRecord,
    AssetForgeCandidateRecord,
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
    AssetForgePlacementEvidenceBundleItem,
    AssetForgePlacementEvidenceIndexRecord,
    AssetForgeO3DEPlacementEvidenceRecord,
    AssetForgeO3DEPlacementEvidenceRequest,
    AssetForgeO3DEPlacementProofRecord,
    AssetForgeO3DEPlacementProofRequest,
    AssetForgeO3DEStagePlanRecord,
    AssetForgeO3DEStagePlanRequest,
    AssetForgeO3DEStageWriteRecord,
    AssetForgeO3DEStageWriteRequest,
    AssetForgeServerApprovalDecisionRecord,
    AssetForgeServerApprovalSessionIndexRecord,
    AssetForgeServerApprovalSessionPrepareRequest,
    AssetForgeServerApprovalSessionRecord,
    AssetForgeServerApprovalSessionRevokeRequest,
    AssetForgeProviderRegistryEntry,
    AssetForgeProviderStatusRecord,
    AssetForgeTaskRecord,
    AssetForgeTaskPlanRequest,
)
_PROVIDER_MODES = {"disabled", "mock", "configured", "real"}
ProviderMode = Literal["disabled", "mock", "configured", "real"]
_BLENDER_ENV_HINTS = (
    "ASSET_FORGE_BLENDER_PATH",
    "BLENDER_EXECUTABLE",
    "BLENDER_PATH",
)
_ALLOWED_INSPECT_EXTENSIONS = {".obj", ".fbx", ".glb", ".gltf", ".blend"}
_DEFAULT_MAX_INSPECT_BYTES = 262_144_000
_INSPECT_SCRIPT_ID = "asset_forge_blender_readonly_inspector_v1"
_ALLOWED_STAGE_SOURCE_EXTENSIONS = {".obj", ".fbx", ".glb", ".gltf"}
_ALLOWED_STAGE_ROOT_PREFIX = "Assets/Generated/asset_forge/"
_STAGE_WRITE_CORRIDOR_NAME = "asset_forge.o3de.stage_write.v1"
_STAGE_WRITE_ADMISSION_FLAG_NAME = "asset_forge.o3de.stage_write.v1.proof_only_admission_enabled"
_STAGE_WRITE_ADMISSION_FLAG_ENV = "ASSET_FORGE_STAGE_WRITE_V1_PROOF_ONLY_ADMISSION_ENABLED"
_PLACEMENT_PROOF_CORRIDOR_NAME = "asset_forge.o3de.placement.proof.v1"
_PLACEMENT_PROOF_ADMISSION_FLAG_NAME = "asset_forge.o3de.placement.proof.v1.admission_enabled"
_PLACEMENT_PROOF_ADMISSION_FLAG_ENV = "ASSET_FORGE_PLACEMENT_PROOF_V1_ADMISSION_ENABLED"
_PLACEMENT_PROOF_ADMISSION_PACKET_REF_ENV = "ASSET_FORGE_PLACEMENT_PROOF_V1_ADMISSION_PACKET_REF"
_PLACEMENT_PROOF_ADMISSION_OPERATOR_ID_ENV = "ASSET_FORGE_PLACEMENT_PROOF_V1_ADMISSION_OPERATOR_ID"
_PLACEMENT_PROOF_EVIDENCE_BUNDLE_REF_ENV = "ASSET_FORGE_PLACEMENT_PROOF_V1_EVIDENCE_BUNDLE_REF"
_PLACEMENT_PROOF_READBACK_PLAN_REF_ENV = "ASSET_FORGE_PLACEMENT_PROOF_V1_READBACK_PLAN_REF"
_PLACEMENT_PROOF_REVERT_CONTRACT_KEY_ENV = "ASSET_FORGE_PLACEMENT_PROOF_V1_REVERT_CONTRACT_KEY"
_STAGE_WRITE_ADMISSION_PACKET_REF_ENV = "ASSET_FORGE_STAGE_WRITE_V1_ADMISSION_PACKET_REF"
_STAGE_WRITE_ADMISSION_OPERATOR_ID_ENV = "ASSET_FORGE_STAGE_WRITE_V1_ADMISSION_OPERATOR_ID"
_STAGE_WRITE_EVIDENCE_BUNDLE_REF_ENV = "ASSET_FORGE_STAGE_WRITE_V1_EVIDENCE_BUNDLE_REF"
_STAGE_WRITE_POST_WRITE_READBACK_PLAN_REF_ENV = "ASSET_FORGE_STAGE_WRITE_V1_POST_WRITE_READBACK_PLAN_REF"
_STAGE_WRITE_REVERT_PLAN_REF_ENV = "ASSET_FORGE_STAGE_WRITE_V1_REVERT_PLAN_REF"
_STAGE_WRITE_REVERT_ALLOWED_PATHS_ENV = "ASSET_FORGE_STAGE_WRITE_V1_REVERT_ALLOWED_PATHS"
_STAGE_WRITE_READBACK_PLATFORM_ENV = "ASSET_FORGE_STAGE_WRITE_V1_READBACK_PLATFORM"
_STAGE_WRITE_APPROVAL_CAPABILITY = "asset_forge.o3de.stage.write"
_DEFAULT_MAX_STAGE_BYTES = 524_288_000
_ASSETDB_EVIDENCE_ROW_LIMIT = 25
_ALLOWED_STAGE_DEST_EXTENSIONS = {".obj", ".fbx", ".glb", ".gltf"}
_SUPPORTED_STAGE_WRITE_OVERWRITE_POLICIES = {"deny"}
_DEFAULT_APPROVAL_SESSION_TTL_SECONDS = 1800
_MAX_APPROVAL_SESSION_TTL_SECONDS = 86400
_MIN_APPROVAL_SESSION_TTL_SECONDS = 60
_SERVER_APPROVAL_CAPABILITIES = {
    _STAGE_WRITE_APPROVAL_CAPABILITY,
    "asset_forge.o3de.placement.execute",
    "asset_forge.o3de.placement.harness.execute",
    "asset_forge.o3de.placement.live_proof",
}


def _resolve_provider_mode() -> ProviderMode:
    raw_mode = os.environ.get("ASSET_FORGE_PROVIDER_MODE", "disabled").strip().lower()
    if raw_mode in _PROVIDER_MODES:
        return cast(ProviderMode, raw_mode)
    return "disabled"


def _provider_credential_present() -> bool:
    return bool(
        os.environ.get("ASSET_FORGE_PROVIDER_API_KEY")
        or os.environ.get("MESHY_API_KEY")
    )


def _resolve_blender_executable() -> tuple[str | None, str]:
    for env_name in _BLENDER_ENV_HINTS:
        env_value = os.environ.get(env_name, "").strip()
        if not env_value:
            continue
        resolved = shutil.which(env_value)
        if resolved:
            return resolved, f"env:{env_name}"
        if os.path.isfile(env_value):
            return env_value, f"env:{env_name}"

    resolved = shutil.which("blender") or shutil.which("blender.exe")
    if resolved:
        return resolved, "path"
    return None, "path-missing"


def _probe_blender_version(executable_path: str) -> tuple[str | None, str]:
    _ = executable_path
    # PR C boundary: no Blender execution is allowed in backend scaffolding.
    return None, "missing"


def _resolve_runtime_root() -> Path:
    configured_root = os.environ.get("ASSET_FORGE_RUNTIME_ROOT", "").strip()
    if configured_root:
        return Path(configured_root).resolve()
    return (Path(__file__).resolve().parents[2] / "runtime" / "asset_forge").resolve()


def _resolve_inspect_script_path() -> Path:
    return (Path(__file__).resolve().parents[2] / "scripts" / "asset_forge_blender_inspect.py").resolve()


def _path_within_root(candidate: Path, root: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False


def _resolve_max_inspect_bytes() -> int:
    raw_value = os.environ.get("ASSET_FORGE_MAX_INSPECT_BYTES", str(_DEFAULT_MAX_INSPECT_BYTES)).strip()
    try:
        parsed = int(raw_value)
    except ValueError:
        return _DEFAULT_MAX_INSPECT_BYTES
    return parsed if parsed > 0 else _DEFAULT_MAX_INSPECT_BYTES


def _slugify(value: str) -> str:
    lowered = value.strip().lower()
    normalized_chars = [
        char if char.isalnum() else "_"
        for char in lowered
    ]
    collapsed = "".join(normalized_chars).strip("_")
    while "__" in collapsed:
        collapsed = collapsed.replace("__", "_")
    return collapsed or "candidate"


def _sha256_file(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _normalize_project_relative_path(value: str) -> str:
    normalized = value.strip().replace("\\", "/").lstrip("/")
    while "//" in normalized:
        normalized = normalized.replace("//", "/")
    return normalized


def _contains_path_traversal(normalized_relative_path: str) -> bool:
    parts = [part for part in normalized_relative_path.split("/") if part]
    return ".." in parts


def _resolve_stage_write_admission_flag_state() -> tuple[
    bool,
    Literal[
        "missing_default_off",
        "explicit_off",
        "explicit_on",
        "invalid_default_off",
    ],
]:
    raw = os.environ.get(_STAGE_WRITE_ADMISSION_FLAG_ENV)
    if raw is None:
        return False, "missing_default_off"
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on", "enabled"}:
        return True, "explicit_on"
    if normalized in {"0", "false", "no", "off", "disabled"}:
        return False, "explicit_off"
    return False, "invalid_default_off"


def _resolve_placement_proof_admission_flag_state() -> tuple[
    bool,
    Literal[
        "missing_default_off",
        "explicit_off",
        "explicit_on",
        "invalid_default_off",
    ],
]:
    raw = os.environ.get(_PLACEMENT_PROOF_ADMISSION_FLAG_ENV)
    if raw is None:
        return False, "missing_default_off"
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on", "enabled"}:
        return True, "explicit_on"
    if normalized in {"0", "false", "no", "off", "disabled"}:
        return False, "explicit_off"
    return False, "invalid_default_off"


def _resolve_stage_write_admission_evidence_context() -> tuple[str | None, str | None]:
    packet_reference = os.environ.get(_STAGE_WRITE_ADMISSION_PACKET_REF_ENV, "").strip() or None
    operator_id = os.environ.get(_STAGE_WRITE_ADMISSION_OPERATOR_ID_ENV, "").strip() or None
    return packet_reference, operator_id


def _resolve_stage_write_proof_contract_context() -> tuple[str | None, str | None, str | None, set[str]]:
    evidence_bundle_reference = os.environ.get(_STAGE_WRITE_EVIDENCE_BUNDLE_REF_ENV, "").strip() or None
    post_write_readback_plan_reference = (
        os.environ.get(_STAGE_WRITE_POST_WRITE_READBACK_PLAN_REF_ENV, "").strip() or None
    )
    revert_plan_reference = os.environ.get(_STAGE_WRITE_REVERT_PLAN_REF_ENV, "").strip() or None
    raw_allowed_paths = os.environ.get(_STAGE_WRITE_REVERT_ALLOWED_PATHS_ENV, "").strip()
    allowed_paths: set[str] = set()
    if raw_allowed_paths:
        for raw_value in raw_allowed_paths.split(";"):
            normalized = _normalize_project_relative_path(raw_value)
            if normalized:
                allowed_paths.add(normalized)
    return (
        evidence_bundle_reference,
        post_write_readback_plan_reference,
        revert_plan_reference,
        allowed_paths,
    )


def _resolve_placement_proof_contract_context() -> tuple[str | None, str | None, str | None, str | None, str | None]:
    admission_packet_reference = os.environ.get(_PLACEMENT_PROOF_ADMISSION_PACKET_REF_ENV, "").strip() or None
    admission_operator_id = os.environ.get(_PLACEMENT_PROOF_ADMISSION_OPERATOR_ID_ENV, "").strip() or None
    evidence_bundle_reference = os.environ.get(_PLACEMENT_PROOF_EVIDENCE_BUNDLE_REF_ENV, "").strip() or None
    readback_plan_reference = os.environ.get(_PLACEMENT_PROOF_READBACK_PLAN_REF_ENV, "").strip() or None
    revert_statement_contract_key = os.environ.get(_PLACEMENT_PROOF_REVERT_CONTRACT_KEY_ENV, "").strip() or None
    return (
        admission_packet_reference,
        admission_operator_id,
        evidence_bundle_reference,
        readback_plan_reference,
        revert_statement_contract_key,
    )


def _build_placement_proof_revert_contract_key(
    *,
    candidate_id: str,
    candidate_label: str,
    staged_source_relative_path: str,
    target_level_relative_path: str,
    target_entity_name: str,
    target_component: str,
    stage_write_corridor_name: str,
    stage_write_evidence_reference: str,
    stage_write_readback_reference: str,
) -> str:
    payload = {
        "schema": "asset_forge.placement_proof.revert_contract.v1",
        "corridor_name": _PLACEMENT_PROOF_CORRIDOR_NAME,
        "candidate_id": candidate_id.strip(),
        "candidate_label": candidate_label.strip(),
        "staged_source_relative_path": _normalize_project_relative_path(staged_source_relative_path),
        "target_level_relative_path": _normalize_project_relative_path(target_level_relative_path),
        "target_entity_name": target_entity_name.strip(),
        "target_component": target_component.strip(),
        "stage_write_corridor_name": stage_write_corridor_name.strip(),
        "stage_write_evidence_reference": stage_write_evidence_reference.strip(),
        "stage_write_readback_reference": stage_write_readback_reference.strip(),
    }
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256(serialized).hexdigest()


def _planned_stage_write_manifest_payload(
    *,
    candidate_id: str,
    candidate_label: str,
    stage_relative_path: str,
    manifest_relative_path: str,
    source_artifact_path: str,
) -> dict[str, str]:
    return {
        "schema": "asset_forge.stage_write_manifest.v1",
        "corridor_name": _STAGE_WRITE_CORRIDOR_NAME,
        "candidate_id": candidate_id,
        "candidate_label": candidate_label,
        "stage_relative_path": stage_relative_path,
        "manifest_relative_path": manifest_relative_path,
        "source_artifact_path": source_artifact_path,
    }


def _planned_stage_write_manifest_bytes(
    *,
    candidate_id: str,
    candidate_label: str,
    stage_relative_path: str,
    manifest_relative_path: str,
    source_artifact_path: str,
) -> bytes:
    payload = _planned_stage_write_manifest_payload(
        candidate_id=candidate_id,
        candidate_label=candidate_label,
        stage_relative_path=stage_relative_path,
        manifest_relative_path=manifest_relative_path,
        source_artifact_path=source_artifact_path,
    )
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def _planned_manifest_sha256(
    *,
    candidate_id: str,
    candidate_label: str,
    stage_relative_path: str,
    manifest_relative_path: str,
    source_artifact_path: str,
) -> str:
    return sha256(
        _planned_stage_write_manifest_bytes(
            candidate_id=candidate_id,
            candidate_label=candidate_label,
            stage_relative_path=stage_relative_path,
            manifest_relative_path=manifest_relative_path,
            source_artifact_path=source_artifact_path,
        )
    ).hexdigest()


def _resolve_max_stage_bytes() -> int:
    raw_value = os.environ.get("ASSET_FORGE_MAX_STAGE_BYTES", str(_DEFAULT_MAX_STAGE_BYTES)).strip()
    try:
        parsed = int(raw_value)
    except ValueError:
        return _DEFAULT_MAX_STAGE_BYTES
    return parsed if parsed > 0 else _DEFAULT_MAX_STAGE_BYTES


def _to_utc_iso_from_epoch(timestamp: float | int | None) -> str | None:
    if timestamp is None:
        return None
    try:
        return datetime.fromtimestamp(float(timestamp), tz=timezone.utc).isoformat()
    except (OverflowError, OSError, ValueError):
        return None


def _resolve_freshness_status(
    *,
    artifact_exists: bool,
    artifact_mtime: float | None,
    evidence_exists: bool,
    evidence_mtime: float | None,
) -> Literal["fresh", "stale_or_unverified", "missing", "unknown"]:
    if not evidence_exists:
        return "missing"
    if not artifact_exists or artifact_mtime is None or evidence_mtime is None:
        return "stale_or_unverified"
    return "fresh" if evidence_mtime >= artifact_mtime else "stale_or_unverified"


def _normalize_source_asset_relative_path(value: str) -> str:
    normalized = value.strip().replace("\\", "/").lstrip("/")
    while "//" in normalized:
        normalized = normalized.replace("//", "/")
    return normalized


def _resolve_approval_session_ttl_seconds(requested_ttl_seconds: int | None) -> int:
    if requested_ttl_seconds is not None:
        return max(
            _MIN_APPROVAL_SESSION_TTL_SECONDS,
            min(int(requested_ttl_seconds), _MAX_APPROVAL_SESSION_TTL_SECONDS),
        )

    raw_value = os.environ.get(
        "ASSET_FORGE_APPROVAL_SESSION_TTL_SECONDS",
        str(_DEFAULT_APPROVAL_SESSION_TTL_SECONDS),
    ).strip()
    try:
        parsed = int(raw_value)
    except ValueError:
        parsed = _DEFAULT_APPROVAL_SESSION_TTL_SECONDS
    return max(
        _MIN_APPROVAL_SESSION_TTL_SECONDS,
        min(parsed, _MAX_APPROVAL_SESSION_TTL_SECONDS),
    )


def _format_utc(timestamp: datetime) -> str:
    return timestamp.astimezone(timezone.utc).isoformat()


def _make_server_approval_binding(
    *,
    candidate_id: str,
    candidate_label: str,
    requested_capability: str,
    stage_relative_path: str | None = None,
    target_level_relative_path: str | None = None,
    target_entity_name: str | None = None,
    selected_platform: str | None = None,
) -> dict[str, object]:
    return {
        "candidate_id": candidate_id.strip(),
        "candidate_label": candidate_label.strip(),
        "requested_capability": requested_capability.strip(),
        "stage_relative_path": _normalize_project_relative_path(stage_relative_path or ""),
        "target_level_relative_path": _normalize_project_relative_path(target_level_relative_path or ""),
        "target_entity_name": (target_entity_name or "").strip(),
        "selected_platform": (selected_platform or "").strip().lower(),
    }


def _binding_fingerprint(binding: dict[str, object]) -> str:
    serialized = json.dumps(binding, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256(serialized).hexdigest()


def _token_preview(token: str) -> str:
    if len(token) <= 16:
        return token
    return f"{token[:12]}...{token[-4:]}"


class AssetForgeService:
    def __init__(self) -> None:
        self._server_approval_sessions: dict[str, AssetForgeServerApprovalSessionRecord] = {}

    def reset_server_approval_sessions_for_tests(self) -> None:
        self._server_approval_sessions = {}

    def prepare_server_approval_session(
        self,
        request: AssetForgeServerApprovalSessionPrepareRequest,
    ) -> AssetForgeServerApprovalSessionRecord:
        requested_capability = request.requested_capability.strip()
        if requested_capability not in _SERVER_APPROVAL_CAPABILITIES:
            requested_capability = "asset_forge.o3de.stage.write"

        now = datetime.now(timezone.utc)
        ttl_seconds = _resolve_approval_session_ttl_seconds(request.requested_ttl_seconds)
        expires_at = now + timedelta(seconds=ttl_seconds)

        binding = _make_server_approval_binding(
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            requested_capability=requested_capability,
            stage_relative_path=request.stage_relative_path,
            target_level_relative_path=request.target_level_relative_path,
            target_entity_name=request.target_entity_name,
            selected_platform=request.selected_platform,
        )
        request_fingerprint = _binding_fingerprint(binding)
        requested_by = request.requested_by.strip() or "asset-forge-operator"
        requested_reason = request.requested_reason.strip()

        session_id = f"afs-session-{uuid4().hex[:16]}"
        session_token = f"afs-token-{uuid4().hex}"
        record = AssetForgeServerApprovalSessionRecord(
            capability_name="asset_forge.approval.session",
            maturity="preflight-only",
            session_id=session_id,
            requested_capability=requested_capability,
            session_status="pending",
            server_owned=True,
            authorization_granted=False,
            request_binding=binding,
            request_fingerprint=request_fingerprint,
            requested_by=requested_by,
            requested_reason=requested_reason or None,
            requested_at=_format_utc(now),
            expires_at=_format_utc(expires_at),
            token_preview=_token_preview(session_token),
            approval_policy={
                "server_owned_record_required": True,
                "request_binding_required": True,
                "session_expiry_required": True,
                "session_revocation_supported": True,
                "client_approval_is_intent_only": True,
                "authorization_requires_server_decision": True,
                "mutation_execution_admitted": False,
            },
            warnings=[
                "Server-owned approval session scaffolding is active, but mutation-capable execution remains blocked in this packet.",
                "Client-declared approval fields are intent only and never authorize stage-write or placement runtime execution.",
            ],
            safest_next_step=(
                "Implement server-owned decision + runtime enforcement and keep all mutation-capable endpoints blocked until that packet is admitted."
            ),
            source=request.source.strip() or "asset-forge-server-approval-request",
        )
        self._server_approval_sessions[session_id] = record
        return record

    def _materialize_server_approval_session(
        self,
        session_id: str,
    ) -> AssetForgeServerApprovalSessionRecord | None:
        record = self._server_approval_sessions.get(session_id)
        if record is None:
            return None
        if record.session_status != "pending":
            return record
        try:
            expires_at = datetime.fromisoformat(record.expires_at)
        except ValueError:
            return record
        if datetime.now(timezone.utc) < expires_at:
            return record
        expired = record.model_copy(
            update={
                "session_status": "expired",
                "authorization_granted": False,
                "safest_next_step": (
                    "Prepare a new server-owned session record; expired sessions never authorize mutation execution."
                ),
            }
        )
        self._server_approval_sessions[session_id] = expired
        return expired

    def get_server_approval_session(self, session_id: str) -> AssetForgeServerApprovalSessionRecord | None:
        return self._materialize_server_approval_session(session_id)

    def revoke_server_approval_session(
        self,
        session_id: str,
        request: AssetForgeServerApprovalSessionRevokeRequest | None = None,
    ) -> AssetForgeServerApprovalSessionRecord | None:
        record = self._materialize_server_approval_session(session_id)
        if record is None:
            return None
        if record.session_status == "revoked":
            return record

        now_iso = _format_utc(datetime.now(timezone.utc))
        revoked_by = (request.revoked_by.strip() if request else "") or "asset-forge-operator"
        revoke_reason = request.revoke_reason.strip() if request else ""
        revoked = record.model_copy(
            update={
                "session_status": "revoked",
                "authorization_granted": False,
                "revoked_at": now_iso,
                "revoked_by": revoked_by,
                "revoke_reason": revoke_reason or None,
                "safest_next_step": (
                    "Prepare a new bounded server-owned session if review must continue; revoked sessions are never reusable."
                ),
            }
        )
        self._server_approval_sessions[session_id] = revoked
        return revoked

    def list_server_approval_sessions(self) -> AssetForgeServerApprovalSessionIndexRecord:
        sessions: list[AssetForgeServerApprovalSessionRecord] = []
        for session_id in sorted(self._server_approval_sessions.keys()):
            materialized = self._materialize_server_approval_session(session_id)
            if materialized is not None:
                sessions.append(materialized)
        sessions.sort(key=lambda item: item.requested_at, reverse=True)
        return AssetForgeServerApprovalSessionIndexRecord(
            capability_name="asset_forge.approval.session.index",
            maturity="preflight-only",
            index_status="succeeded" if sessions else "empty",
            session_count=len(sessions),
            sessions=sessions,
            read_only=True,
            warnings=[
                "Listing approval sessions is read-only and does not authorize any mutation-capable endpoint.",
            ],
            source="asset-forge-server-approval-index",
        )

    def _evaluate_server_approval_session(
        self,
        *,
        approval_session_id: str | None,
        expected_capability: str,
        binding: dict[str, object],
    ) -> AssetForgeServerApprovalDecisionRecord:
        expected_fingerprint = _binding_fingerprint(binding)
        if not approval_session_id:
            return AssetForgeServerApprovalDecisionRecord(
                decision_state="denied",
                decision_code="missing_session",
                reason="No server-owned approval session was provided; endpoint remains blocked.",
                server_owned_required=True,
                client_approval_is_intent_only=True,
                mutation_execution_admitted=False,
                authorization_granted=False,
                policy_decision="deny",
                policy_would_allow_if_mutation_admitted=False,
                expected_capability=expected_capability,
                session_provided=False,
                session_id=None,
                status="missing",
                operation_matches=False,
                binding_matches=False,
                requested_capability=None,
                expected_request_fingerprint=expected_fingerprint,
                session_request_fingerprint=None,
                session_expires_at=None,
                safest_next_step=(
                    "Prepare a bounded server-owned session and keep mutation-capable execution blocked."
                ),
            )

        record = self.get_server_approval_session(approval_session_id)
        if record is None:
            return AssetForgeServerApprovalDecisionRecord(
                decision_state="denied",
                decision_code="session_not_found",
                reason="Provided approval_session_id was not found; endpoint remains blocked.",
                server_owned_required=True,
                client_approval_is_intent_only=True,
                mutation_execution_admitted=False,
                authorization_granted=False,
                policy_decision="deny",
                policy_would_allow_if_mutation_admitted=False,
                expected_capability=expected_capability,
                session_provided=True,
                session_id=approval_session_id,
                status="not_found",
                operation_matches=False,
                binding_matches=False,
                requested_capability=None,
                expected_request_fingerprint=expected_fingerprint,
                session_request_fingerprint=None,
                session_expires_at=None,
                safest_next_step="Create a new server-owned approval session for this exact request envelope.",
            )

        operation_matches = record.requested_capability == expected_capability
        binding_matches = record.request_fingerprint == expected_fingerprint
        shared_kwargs = {
            "server_owned_required": True,
            "client_approval_is_intent_only": True,
            "mutation_execution_admitted": False,
            "authorization_granted": False,
            "expected_capability": expected_capability,
            "session_provided": True,
            "session_id": record.session_id,
            "status": record.session_status,
            "operation_matches": operation_matches,
            "binding_matches": (operation_matches and binding_matches),
            "requested_capability": record.requested_capability,
            "expected_request_fingerprint": expected_fingerprint,
            "session_request_fingerprint": record.request_fingerprint,
            "session_expires_at": record.expires_at,
        }

        if not operation_matches:
            return AssetForgeServerApprovalDecisionRecord(
                decision_state="denied",
                decision_code="requested_operation_mismatch",
                reason="Server-owned session scope does not match the requested operation; endpoint remains blocked.",
                policy_decision="deny",
                policy_would_allow_if_mutation_admitted=False,
                safest_next_step=(
                    "Prepare a server-owned session for the exact operation and request envelope."
                ),
                **shared_kwargs,
            )

        if not binding_matches:
            return AssetForgeServerApprovalDecisionRecord(
                decision_state="denied",
                decision_code="request_fingerprint_mismatch",
                reason="Server-owned session binding does not match this request envelope; endpoint remains blocked.",
                policy_decision="deny",
                policy_would_allow_if_mutation_admitted=False,
                safest_next_step=(
                    "Prepare a new server-owned session bound to this exact request fingerprint."
                ),
                **shared_kwargs,
            )

        if record.session_status == "expired":
            return AssetForgeServerApprovalDecisionRecord(
                decision_state="denied",
                decision_code="session_expired",
                reason="Server-owned session is expired and fails closed; endpoint remains blocked.",
                policy_decision="deny",
                policy_would_allow_if_mutation_admitted=False,
                safest_next_step="Prepare a new non-expired server-owned session for this request.",
                **shared_kwargs,
            )

        if record.session_status == "revoked":
            return AssetForgeServerApprovalDecisionRecord(
                decision_state="denied",
                decision_code="session_revoked",
                reason="Server-owned session is revoked and cannot be reused; endpoint remains blocked.",
                policy_decision="deny",
                policy_would_allow_if_mutation_admitted=False,
                safest_next_step="Prepare a replacement server-owned session if review should continue.",
                **shared_kwargs,
            )

        if record.session_status == "rejected":
            return AssetForgeServerApprovalDecisionRecord(
                decision_state="denied",
                decision_code="session_rejected",
                reason="Server-owned session is rejected; endpoint remains blocked.",
                policy_decision="deny",
                policy_would_allow_if_mutation_admitted=False,
                safest_next_step="Resolve policy concerns and prepare a new server-owned session if needed.",
                **shared_kwargs,
            )

        if record.session_status == "pending":
            return AssetForgeServerApprovalDecisionRecord(
                decision_state="pending",
                decision_code="session_pending",
                reason="Server-owned session is pending server decision; mutation remains blocked in this packet.",
                policy_decision="pending",
                policy_would_allow_if_mutation_admitted=False,
                safest_next_step=(
                    "Record a server decision first; keep mutation-capable execution blocked until an admitted packet enables runtime admission."
                ),
                **shared_kwargs,
            )

        return AssetForgeServerApprovalDecisionRecord(
            decision_state="ready_but_not_admitted",
            decision_code="ready_but_mutation_not_admitted",
            reason=(
                "Server-owned session checks passed and server policy would allow this request, but mutation execution is not admitted in this packet."
            ),
            policy_decision="allow_if_mutation_admitted",
            policy_would_allow_if_mutation_admitted=True,
            safest_next_step=(
                "Keep execution blocked until a separate mutation-admission packet is explicitly approved."
            ),
            **shared_kwargs,
        )

    def create_task_plan(self, request: AssetForgeTaskPlanRequest) -> AssetForgeTaskRecord:
        now_iso = datetime.now(timezone.utc).isoformat()
        prompt_text = request.prompt_text.strip()
        style_suffix = f" styles: {', '.join(request.style_tags)}." if request.style_tags else ""
        budget = request.target_triangle_budget.strip()
        output_format = request.output_format.strip().lower()
        task_slug = _slugify(prompt_text[:48])
        task_id = f"asset-forge-task-plan-{task_slug}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

        return AssetForgeTaskRecord(
            task_id=task_id,
            task_label="Plan-only Asset Forge task",
            status="plan-only",
            prompt_text=prompt_text,
            created_at=now_iso,
            source=request.source.strip() or "asset-forge-ui-plan-request",
            warnings=[
                "Task plan is metadata-only and does not execute providers.",
                "Blender and O3DE mutation remain blocked in this packet.",
            ],
            candidates=[
                AssetForgeCandidateRecord(
                    candidate_id="candidate-a",
                    display_name="Planned Candidate A",
                    status="planned",
                    preview_notes=f"Plan-only concept pass for {output_format.upper()} export; budget target {budget}.{style_suffix}",
                    readiness_placeholder="O3DE readiness placeholder: planning pass only.",
                    estimated_triangles=budget,
                ),
                AssetForgeCandidateRecord(
                    candidate_id="candidate-b",
                    display_name="Planned Candidate B",
                    status="planned",
                    preview_notes=f"Alternative composition for prompt decomposition; output {output_format.upper()}.",
                    readiness_placeholder="O3DE readiness placeholder: planning pass only.",
                    estimated_triangles=budget,
                ),
                AssetForgeCandidateRecord(
                    candidate_id="candidate-c",
                    display_name="Demo Candidate C",
                    status="demo",
                    preview_notes="Demo baseline candidate retained for visual comparison.",
                    readiness_placeholder="O3DE readiness placeholder: demo-only.",
                    estimated_triangles="~16k tris (demo estimate)",
                ),
                AssetForgeCandidateRecord(
                    candidate_id="candidate-d",
                    display_name="Demo Candidate D",
                    status="demo",
                    preview_notes="Demo stretch candidate retained for review-only lane.",
                    readiness_placeholder="O3DE readiness placeholder: demo-only.",
                    estimated_triangles="~38k tris (demo estimate)",
                ),
            ],
        )

    def get_studio_status(self) -> AssetForgeStudioStatusRecord:
        provider_status = self.get_provider_status()
        blender_status = self.get_blender_status()

        provider_truth = "blocked" if provider_status.provider_mode == "disabled" else "preflight-only"
        blender_truth = "preflight-only" if blender_status.executable_found else "blocked"

        lanes = [
            AssetForgeStudioLaneStatusRecord(
                lane="Provider",
                truth=provider_truth,
                detail=(
                    f"Provider mode {provider_status.provider_mode}, config ready "
                    f"{'yes' if provider_status.configuration_ready else 'no'}, "
                    f"execution {provider_status.generation_execution_status}."
                ),
                source=provider_status.source,
            ),
            AssetForgeStudioLaneStatusRecord(
                lane="Blender",
                truth=blender_truth,
                detail=(
                    f"Executable {'detected' if blender_status.executable_found else 'missing'} "
                    f"({blender_status.detection_source}); prep execution "
                    f"{blender_status.blender_prep_execution_status}."
                ),
                source=blender_status.source,
            ),
            AssetForgeStudioLaneStatusRecord(
                lane="O3DE ingest",
                truth="plan-only",
                detail="Read-only ingest/readback evidence is available; staging write remains approval-gated.",
                source="asset-forge-o3de-ingest-readback",
            ),
            AssetForgeStudioLaneStatusRecord(
                lane="Placement",
                truth="plan-only",
                detail="Placement remains plan-only/proof-gated; no broad editor placement write is admitted.",
                source="asset-forge-o3de-placement-plan",
            ),
            AssetForgeStudioLaneStatusRecord(
                lane="Review",
                truth="preflight-only",
                detail="Review lane uses read-only evidence packets and remains non-mutating.",
                source="asset-forge-o3de-placement-evidence",
            ),
        ]

        return AssetForgeStudioStatusRecord(
            capability_name="asset_forge.studio.status",
            maturity="preflight-only",
            lanes=lanes,
            warnings=[
                "Studio status is read-only and does not execute provider, Blender, or O3DE mutation.",
            ],
            safest_next_step="Keep status lanes read-only while advancing bounded preflight and proof gates.",
            source="asset-forge-studio-status",
        )

    def get_placement_live_proof_evidence_index(
        self,
        *,
        limit: int = 10,
        proof_status: str | None = None,
        candidate_id: str | None = None,
        from_age_s: int | None = None,
    ) -> AssetForgePlacementEvidenceIndexRecord:
        runtime_root = _resolve_runtime_root()
        evidence_dir = (runtime_root / "evidence" / "placement_live_proof").resolve()
        freshness_window_seconds = 1800
        normalized_limit = max(1, min(int(limit), 25))
        normalized_status = (proof_status or "").strip().lower()
        normalized_candidate = (candidate_id or "").strip().lower()
        normalized_from_age_s = None
        if from_age_s is not None:
            normalized_from_age_s = max(0, min(int(from_age_s), 86400))
        warnings: list[str] = []
        items: list[AssetForgePlacementEvidenceBundleItem] = []

        if evidence_dir.is_dir():
            now_epoch = datetime.now(timezone.utc).timestamp()
            for file_path in sorted(evidence_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
                recorded_at: str | None = None
                candidate_id: str | None = None
                bridge_command_id: str | None = None
                proof_status: str | None = None
                age_seconds: int | None = None
                try:
                    payload = json.loads(file_path.read_text(encoding="utf-8"))
                    recorded_at = payload.get("recorded_at")
                    candidate_id = payload.get("candidate_id")
                    bridge_command_id = payload.get("bridge_command_id")
                    proof_status = payload.get("proof_status")
                except Exception:
                    warnings.append(f"Could not parse evidence bundle: {file_path}")
                try:
                    age_seconds = int(max(0, now_epoch - file_path.stat().st_mtime))
                except OSError:
                    age_seconds = None
                item = AssetForgePlacementEvidenceBundleItem(
                    path=str(file_path),
                    recorded_at=recorded_at,
                    candidate_id=candidate_id,
                    bridge_command_id=bridge_command_id,
                    proof_status=proof_status,
                    age_seconds=age_seconds,
                )
                item_status = (item.proof_status or "").strip().lower()
                item_candidate = (item.candidate_id or "").strip().lower()
                if normalized_status and item_status != normalized_status:
                    continue
                if normalized_candidate and item_candidate != normalized_candidate:
                    continue
                if normalized_from_age_s is not None:
                    if item.age_seconds is None or item.age_seconds > normalized_from_age_s:
                        continue
                items.append(item)
                if len(items) >= normalized_limit:
                    break
        else:
            warnings.append("No placement live proof evidence directory exists yet.")

        fresh_item_count = len(
            [item for item in items if item.age_seconds is not None and item.age_seconds <= freshness_window_seconds]
        )
        return AssetForgePlacementEvidenceIndexRecord(
            capability_name="asset_forge.o3de.placement.live_proof.evidence_index",
            maturity="preflight-only",
            index_status="succeeded" if items else "empty",
            runtime_root=str(runtime_root),
            evidence_dir=str(evidence_dir),
            applied_filters={
                "limit": normalized_limit,
                "proof_status": normalized_status or None,
                "candidate_id": normalized_candidate or None,
                "from_age_s": normalized_from_age_s,
            },
            freshness_window_seconds=freshness_window_seconds,
            fresh_item_count=fresh_item_count,
            items=items,
            read_only=True,
            warnings=warnings,
            source="asset-forge-o3de-placement-live-proof-evidence-index",
        )

    def get_task(self) -> AssetForgeTaskRecord:
        return AssetForgeTaskRecord(
            task_id="asset-forge-task-demo-001",
            task_label="Demo bridge-asset planning task",
            status="plan-only",
            prompt_text=(
                "Generate a stylized weathered stone bridge segment with ivy accents "
                "for O3DE environment assembly."
            ),
            created_at="2026-04-28T00:00:00Z",
            source="asset-forge-demo-task-model",
            warnings=[
                "Provider execution is blocked in this packet.",
                "Blender execution is blocked in this packet.",
                "O3DE project mutation is blocked in this packet.",
            ],
            candidates=[
                AssetForgeCandidateRecord(
                    candidate_id="candidate-a",
                    display_name="Weathered Ivy Arch",
                    status="demo",
                    preview_notes="Balanced silhouette and moderate texture complexity.",
                    readiness_placeholder="O3DE readiness placeholder: 74/100 (demo)",
                    estimated_triangles="~21k tris (demo estimate)",
                ),
                AssetForgeCandidateRecord(
                    candidate_id="candidate-b",
                    display_name="Broken Keystone Span",
                    status="demo",
                    preview_notes="Damaged keystone with hero storytelling profile.",
                    readiness_placeholder="O3DE readiness placeholder: 67/100 (demo)",
                    estimated_triangles="~24k tris (demo estimate)",
                ),
                AssetForgeCandidateRecord(
                    candidate_id="candidate-c",
                    display_name="Modular Low-Poly Span",
                    status="demo",
                    preview_notes="Lower poly profile optimized for crowd scenes.",
                    readiness_placeholder="O3DE readiness placeholder: 81/100 (demo)",
                    estimated_triangles="~16k tris (demo estimate)",
                ),
                AssetForgeCandidateRecord(
                    candidate_id="candidate-d",
                    display_name="Cinematic Hero Arch",
                    status="demo",
                    preview_notes="High-detail sculpt style for closeup shots.",
                    readiness_placeholder="O3DE readiness placeholder: 59/100 (demo)",
                    estimated_triangles="~38k tris (demo estimate)",
                ),
            ],
        )

    def get_provider_status(self) -> AssetForgeProviderStatusRecord:
        provider_mode = _resolve_provider_mode()
        credential_present = _provider_credential_present()
        configuration_ready = (
            provider_mode == "mock"
            or (
                provider_mode in {"configured", "real"}
                and credential_present
            )
        )
        credential_status = (
            "redacted-env-present"
            if credential_present
            else "missing"
        )
        provider_note_map = {
            "disabled": "Provider integration is disabled by configuration.",
            "mock": "Mock provider mode enabled for UI preflight only.",
            "configured": "Provider profile configured; execution remains blocked.",
            "real": "Real provider mode selected; execution remains blocked until admission.",
        }

        return AssetForgeProviderStatusRecord(
            capability_name="asset_forge.provider.status",
            maturity="preflight-only",
            provider_mode=provider_mode,
            configuration_ready=configuration_ready,
            credential_status=credential_status,
            external_task_creation_allowed=False,
            generation_execution_status="blocked",
            providers=[
                AssetForgeProviderRegistryEntry(
                    provider_id="asset_forge_provider_primary",
                    display_name="Asset Forge Provider Registry Entry",
                    mode=provider_mode,
                    configured=configuration_ready,
                    note=provider_note_map[provider_mode],
                ),
            ],
            warnings=[
                "No external provider task creation is admitted in Packet 04.",
                "Provider status is preflight-only and does not execute generation.",
            ],
            safest_next_step=(
                "Keep provider status preflight-only and promote through policy/provenance/cost readiness gates before preview/create."
            ),
            source="asset-forge-provider-registry",
        )

    def get_blender_status(self) -> AssetForgeBlenderStatusRecord:
        executable_path, detection_source = _resolve_blender_executable()
        if not executable_path:
            return AssetForgeBlenderStatusRecord(
                capability_name="asset_forge.blender.status",
                maturity="preflight-only",
                executable_found=False,
                executable_path=None,
                detection_source=detection_source,
                version=None,
                version_probe_status="missing",
                blender_prep_execution_status="blocked",
                warnings=[
                    "Blender executable not detected. Prep execution is blocked.",
                    "Packet 05 provides preflight detection only; no Blender script execution is admitted.",
                ],
                safest_next_step=(
                    "Provide a trusted Blender executable path and keep execution blocked until a bounded allowlisted prep script packet is admitted."
                ),
                source="asset-forge-blender-preflight",
            )

        version, version_probe_status = _probe_blender_version(executable_path)
        warnings = [
            "Blender detection is preflight-only in Packet 05.",
            "Blender model processing and script execution remain blocked.",
            "Blender version probe execution is intentionally disabled in PR C.",
        ]
        if version_probe_status != "detected":
            warnings.append(
                "Blender executable was detected, but runtime version probing is disabled while execution remains blocked."
            )

        return AssetForgeBlenderStatusRecord(
            capability_name="asset_forge.blender.status",
            maturity="preflight-only",
            executable_found=True,
            executable_path=executable_path,
            detection_source=detection_source,
            version=version,
            version_probe_status=version_probe_status,
            blender_prep_execution_status="blocked",
            warnings=warnings,
            safest_next_step=(
                "Use this preflight evidence to scope a bounded, allowlisted, read-only Blender inspection packet before any prep execution admission."
            ),
            source="asset-forge-blender-preflight",
        )

    def inspect_blender_candidate(
        self,
        request: AssetForgeBlenderInspectRequest,
    ) -> AssetForgeBlenderInspectReport:
        runtime_root = _resolve_runtime_root()
        script_path = _resolve_inspect_script_path()
        raw_artifact_path = request.artifact_path.strip()
        if not raw_artifact_path:
            return AssetForgeBlenderInspectReport(
                capability_name="asset_forge.blender.inspect",
                maturity="preflight-only",
                inspection_status="blocked",
                artifact_path=request.artifact_path,
                runtime_root=str(runtime_root),
                artifact_within_runtime_root=False,
                extension_allowed=False,
                script_id=_INSPECT_SCRIPT_ID,
                script_path=str(script_path),
                script_execution_status="blocked",
                blender_execution_status="blocked",
                metadata={},
                warnings=[
                    "Inspection request must include a non-empty artifact path.",
                    "Raw Blender execution remains blocked; only allowlisted read-only inspection is admitted.",
                ],
                safest_next_step=(
                    "Provide a relative or absolute candidate artifact path within the configured Asset Forge runtime root."
                ),
                source="asset-forge-blender-inspect",
            )

        requested_path = Path(raw_artifact_path)
        candidate_path = (
            requested_path.resolve()
            if requested_path.is_absolute()
            else (runtime_root / requested_path).resolve()
        )
        artifact_within_root = _path_within_root(candidate_path, runtime_root)
        extension_allowed = candidate_path.suffix.lower() in _ALLOWED_INSPECT_EXTENSIONS
        max_inspect_bytes = _resolve_max_inspect_bytes()
        inspection_policy = {
            "allowed_extensions": sorted(_ALLOWED_INSPECT_EXTENSIONS),
            "max_inspect_bytes": max_inspect_bytes,
            "read_only": True,
        }

        warnings: list[str] = [
            "Blender executable invocation remains blocked in this packet.",
            "Inspection runs a repo-owned allowlisted script in read-only mode.",
        ]
        if not artifact_within_root:
            warnings.append(
                "Artifact path is outside the configured runtime root and is blocked by path policy."
            )
        if not extension_allowed:
            allowed_extensions = ", ".join(sorted(_ALLOWED_INSPECT_EXTENSIONS))
            warnings.append(
                f"Artifact extension is not allowlisted. Allowed extensions: {allowed_extensions}."
            )
        if not candidate_path.is_file():
            warnings.append("Artifact path does not exist as a file.")

        if not artifact_within_root or not extension_allowed or not candidate_path.is_file():
            return AssetForgeBlenderInspectReport(
                capability_name="asset_forge.blender.inspect",
                maturity="preflight-only",
                inspection_status="blocked",
                artifact_path=str(candidate_path),
                runtime_root=str(runtime_root),
                artifact_within_runtime_root=artifact_within_root,
                extension_allowed=extension_allowed,
                script_id=_INSPECT_SCRIPT_ID,
                script_path=str(script_path),
                script_execution_status="blocked",
                blender_execution_status="blocked",
                metadata={
                    "inspection_policy": inspection_policy,
                },
                warnings=warnings,
                safest_next_step=(
                    "Place an allowlisted model artifact under backend/runtime/asset_forge and retry read-only inspection."
                ),
                source="asset-forge-blender-inspect",
            )

        file_size_bytes = candidate_path.stat().st_size
        if file_size_bytes > max_inspect_bytes:
            warnings.append(
                f"Artifact is larger than the configured inspection size cap ({max_inspect_bytes} bytes)."
            )
            return AssetForgeBlenderInspectReport(
                capability_name="asset_forge.blender.inspect",
                maturity="preflight-only",
                inspection_status="blocked",
                artifact_path=str(candidate_path),
                runtime_root=str(runtime_root),
                artifact_within_runtime_root=True,
                extension_allowed=True,
                script_id=_INSPECT_SCRIPT_ID,
                script_path=str(script_path),
                script_execution_status="blocked",
                blender_execution_status="blocked",
                metadata={
                    "file_size_bytes": file_size_bytes,
                    "inspection_policy": inspection_policy,
                },
                warnings=warnings,
                safest_next_step=(
                    "Use a smaller candidate file or raise ASSET_FORGE_MAX_INSPECT_BYTES for bounded read-only inspection."
                ),
                source="asset-forge-blender-inspect",
            )

        if not script_path.is_file():
            warnings.append("Allowlisted inspection script is missing from the repository.")
            warnings.append("Blender/script execution remains blocked in PR C.")
            return AssetForgeBlenderInspectReport(
                capability_name="asset_forge.blender.inspect",
                maturity="preflight-only",
                inspection_status="blocked",
                artifact_path=str(candidate_path),
                runtime_root=str(runtime_root),
                artifact_within_runtime_root=True,
                extension_allowed=True,
                script_id=_INSPECT_SCRIPT_ID,
                script_path=str(script_path),
                script_execution_status="blocked",
                blender_execution_status="blocked",
                metadata={
                    "file_size_bytes": file_size_bytes,
                    "inspection_policy": inspection_policy,
                    "execution_disabled": True,
                },
                warnings=warnings,
                safest_next_step=(
                    "Keep inspection blocked/preflight-only until a separately approved server-owned Blender execution model exists."
                ),
                source="asset-forge-blender-inspect",
            )

        warnings.append(
            "Blender inspection script execution is intentionally disabled in PR C; endpoint remains preflight-only."
        )
        metadata: dict[str, object] = {
            "file_size_bytes": file_size_bytes,
            "inspection_policy": inspection_policy,
            "execution_disabled": True,
        }
        return AssetForgeBlenderInspectReport(
            capability_name="asset_forge.blender.inspect",
            maturity="preflight-only",
            inspection_status="blocked",
            artifact_path=str(candidate_path),
            runtime_root=str(runtime_root),
            artifact_within_runtime_root=True,
            extension_allowed=True,
            script_id=_INSPECT_SCRIPT_ID,
            script_path=str(script_path),
            script_execution_status="blocked",
            blender_execution_status="blocked",
            metadata=metadata,
            warnings=warnings,
            safest_next_step=(
                "Keep Blender execution disabled; use status/preflight metadata only until a separately approved server-owned execution model exists."
            ),
            source="asset-forge-blender-inspect",
        )

    def create_o3de_stage_plan(
        self,
        request: AssetForgeO3DEStagePlanRequest,
    ) -> AssetForgeO3DEStagePlanRecord:
        candidate_slug = _slugify(request.candidate_id)
        label_slug = _slugify(request.candidate_label)
        extension = request.desired_extension.strip().lower()
        if not extension.startswith("."):
            extension = f".{extension}"
        if extension not in {".glb", ".gltf", ".fbx", ".obj"}:
            extension = ".glb"
        bundle_name = f"{candidate_slug}_{label_slug}".strip("_")
        staging_relative_path = (
            f"Assets/Generated/asset_forge/{bundle_name}/{bundle_name}{extension}"
        )
        manifest_relative_path = (
            f"Assets/Generated/asset_forge/{bundle_name}/{bundle_name}.forge.json"
        )
        project_root_hint = os.environ.get("O3DE_TARGET_PROJECT_ROOT")

        warnings = [
            "This is a deterministic plan-only stage output; no project write is performed.",
            "Approval is required before any source staging write can occur.",
            "Asset Processor execution and catalog/database readback are out of scope for this packet.",
        ]
        stage_plan_policy: dict[str, object] = {
            "allowed_output_extensions": [".glb", ".gltf", ".fbx", ".obj"],
            "allowed_staging_prefix": _ALLOWED_STAGE_ROOT_PREFIX,
            "approval_required_for_write": True,
            "project_write_admitted": False,
        }

        return AssetForgeO3DEStagePlanRecord(
            capability_name="asset_forge.o3de.stage.plan",
            maturity="plan-only",
            plan_status="ready-for-approval",
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            project_root_hint=project_root_hint,
            deterministic_staging_relative_path=staging_relative_path,
            deterministic_manifest_relative_path=manifest_relative_path,
            expected_source_asset_path=staging_relative_path,
            stage_plan_policy=stage_plan_policy,
            approval_required=True,
            project_write_admitted=False,
            warnings=warnings,
            safest_next_step=(
                "Review the deterministic stage path, approve the write corridor, and then gate source staging behind an explicit mutation packet."
            ),
            source="asset-forge-o3de-stage-plan",
        )

    def execute_o3de_stage_write(
        self,
        request: AssetForgeO3DEStageWriteRequest,
    ) -> AssetForgeO3DEStageWriteRecord:
        runtime_root = _resolve_runtime_root()
        source_input = request.source_artifact_path.strip()
        source_candidate = Path(source_input)
        source_path = (
            source_candidate.resolve()
            if source_candidate.is_absolute()
            else (runtime_root / source_candidate).resolve()
        )
        source_within_runtime = _path_within_root(source_path, runtime_root)
        source_extension_allowed = source_path.suffix.lower() in _ALLOWED_STAGE_SOURCE_EXTENSIONS
        source_exists = source_path.is_file()
        source_size = source_path.stat().st_size if source_exists else None
        source_sha256 = _sha256_file(source_path) if source_exists else None

        stage_relative_path = _normalize_project_relative_path(request.stage_relative_path)
        manifest_relative_path = _normalize_project_relative_path(request.manifest_relative_path)
        path_traversal_detected = _contains_path_traversal(stage_relative_path) or _contains_path_traversal(
            manifest_relative_path
        )
        stage_prefix_allowed = stage_relative_path.startswith(_ALLOWED_STAGE_ROOT_PREFIX)
        destination_extension_allowed = Path(stage_relative_path).suffix.lower() in _ALLOWED_STAGE_DEST_EXTENSIONS
        manifest_prefix_allowed = manifest_relative_path.startswith(_ALLOWED_STAGE_ROOT_PREFIX)
        manifest_suffix_allowed = manifest_relative_path.endswith(".forge.json")
        staging_root_allowlisted = stage_prefix_allowed and manifest_prefix_allowed
        destination_within_staging_root = staging_root_allowlisted and not path_traversal_detected

        source_hash_expected = (request.source_hash_expected or "").strip().lower() or None
        manifest_hash_expected = (request.manifest_hash_expected or "").strip().lower() or None
        source_hash_match = bool(source_hash_expected and source_sha256 and source_sha256 == source_hash_expected)
        planned_manifest_bytes = _planned_stage_write_manifest_bytes(
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            stage_relative_path=stage_relative_path,
            manifest_relative_path=manifest_relative_path,
            source_artifact_path=source_input,
        )
        planned_manifest_sha256 = _planned_manifest_sha256(
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            stage_relative_path=stage_relative_path,
            manifest_relative_path=manifest_relative_path,
            source_artifact_path=source_input,
        )
        manifest_hash_match = bool(
            manifest_hash_expected and planned_manifest_sha256 == manifest_hash_expected
        )

        overwrite_policy = request.overwrite_policy.strip().lower() or "deny"
        overwrite_policy_supported = overwrite_policy in _SUPPORTED_STAGE_WRITE_OVERWRITE_POLICIES
        admission_flag_enabled, admission_flag_state = _resolve_stage_write_admission_flag_state()
        admission_packet_reference, admission_operator_id = _resolve_stage_write_admission_evidence_context()
        (
            evidence_bundle_reference,
            post_write_readback_plan_reference,
            revert_plan_reference,
            revert_allowed_paths,
        ) = _resolve_stage_write_proof_contract_context()
        operator_note_present = bool(request.approval_note.strip())
        admission_evidence_ready = False
        post_write_readback_plan_ready = False
        revert_plan_ready = False
        revert_plan_exact_scope = False
        server_approval_evaluation = self._evaluate_server_approval_session(
            approval_session_id=request.approval_session_id,
            expected_capability=_STAGE_WRITE_APPROVAL_CAPABILITY,
            binding=_make_server_approval_binding(
                candidate_id=request.candidate_id,
                candidate_label=request.candidate_label,
                requested_capability=_STAGE_WRITE_APPROVAL_CAPABILITY,
                stage_relative_path=stage_relative_path,
            ),
        )

        project_root_raw = os.environ.get("O3DE_TARGET_PROJECT_ROOT", "").strip()
        project_root_path = Path(project_root_raw).resolve() if project_root_raw else None
        project_root_exists = bool(project_root_path and project_root_path.is_dir())
        destination_source_path = (
            (project_root_path / stage_relative_path).resolve()
            if project_root_path
            else None
        )
        destination_manifest_path = (
            (project_root_path / manifest_relative_path).resolve()
            if project_root_path
            else None
        )
        destination_paths_within_project_root = bool(
            project_root_path
            and destination_source_path
            and destination_manifest_path
            and _path_within_root(destination_source_path, project_root_path)
            and _path_within_root(destination_manifest_path, project_root_path)
        )
        overwrite_detected = bool(
            (destination_source_path and destination_source_path.exists())
            or (destination_manifest_path and destination_manifest_path.exists())
        )
        max_stage_bytes = _resolve_max_stage_bytes()
        source_size_within_cap = bool(source_size is not None and source_size <= max_stage_bytes)

        warnings = [
            "Stage write corridor is approval-gated and path-bounded.",
            "Proof-only execution is allowed only when all server-owned gates pass; otherwise this endpoint remains dry-run-only and blocked.",
            "Client approval fields remain intent-only and never authorize mutation.",
        ]
        warnings.append(server_approval_evaluation.reason)
        revert_paths = [
            str(path)
            for path in [destination_source_path, destination_manifest_path]
            if path is not None
        ]
        fail_closed_reasons: list[str] = []

        if not server_approval_evaluation.policy_would_allow_if_mutation_admitted:
            fail_closed_reasons.append(f"server_approval:{server_approval_evaluation.decision_code}")

        if not project_root_raw:
            warnings.append("O3DE_TARGET_PROJECT_ROOT is not configured.")
            fail_closed_reasons.append("project_root_missing")
        elif not project_root_exists:
            warnings.append("Configured O3DE project root does not exist as a directory.")
            fail_closed_reasons.append("project_root_invalid")

        if path_traversal_detected:
            warnings.append("Path traversal segments are not allowed in stage-write dry-run paths.")
            fail_closed_reasons.append("path_traversal_detected")

        if not staging_root_allowlisted or not destination_within_staging_root:
            warnings.append(
                "Stage and manifest paths must stay under Assets/Generated/asset_forge after normalization."
            )
            fail_closed_reasons.append("destination_outside_staging_root")

        if not manifest_suffix_allowed:
            warnings.append("Manifest relative path must end with .forge.json.")
            fail_closed_reasons.append("manifest_suffix_not_allowlisted")
        if not destination_extension_allowed:
            warnings.append("Destination source path extension is not allowlisted for stage-write corridor.")
            fail_closed_reasons.append("destination_extension_not_allowlisted")

        if project_root_path and not destination_paths_within_project_root:
            warnings.append("Resolved destination paths must stay within the configured project root.")
            fail_closed_reasons.append("destination_outside_project_root")

        if not source_within_runtime:
            warnings.append("Source artifact path is outside the configured Asset Forge runtime root.")
            fail_closed_reasons.append("source_outside_runtime_root")
        if not source_extension_allowed:
            warnings.append("Source artifact extension is not allowlisted for staging.")
            fail_closed_reasons.append("source_extension_not_allowlisted")
        if not source_exists:
            warnings.append("Source artifact does not exist as a file.")
            fail_closed_reasons.append("source_missing")

        if source_size is not None and not source_size_within_cap:
            warnings.append(
                f"Source artifact exceeds configured stage size cap ({max_stage_bytes} bytes)."
            )
            fail_closed_reasons.append("source_size_over_cap")

        if source_hash_expected is None:
            warnings.append("source_hash_expected is required for dry-run corridor admission checks.")
            fail_closed_reasons.append("source_hash_expected_missing")
        elif not source_hash_match:
            warnings.append("Source hash does not match source_hash_expected.")
            fail_closed_reasons.append("source_hash_mismatch")

        if manifest_hash_expected is None:
            warnings.append("manifest_hash_expected is required for dry-run corridor admission checks.")
            fail_closed_reasons.append("manifest_hash_expected_missing")
        elif not manifest_hash_match:
            warnings.append("Manifest hash does not match manifest_hash_expected.")
            fail_closed_reasons.append("manifest_hash_mismatch")

        if not overwrite_policy_supported:
            warnings.append(
                f"overwrite_policy '{overwrite_policy}' is not supported for the dry-run corridor."
            )
            fail_closed_reasons.append("overwrite_policy_not_supported")
        elif overwrite_policy == "deny" and overwrite_detected:
            warnings.append(
                "Overwrite attempt detected while overwrite_policy=deny; stage-write remains fail-closed."
            )
            fail_closed_reasons.append("overwrite_detected")

        if request.approval_state == "approved" and not operator_note_present:
            warnings.append("approval_note is required when approval_state=approved.")
            fail_closed_reasons.append("operator_note_missing")

        if admission_flag_state == "invalid_default_off":
            warnings.append(
                f"Admission flag {_STAGE_WRITE_ADMISSION_FLAG_ENV} is malformed; defaulting to fail-closed off."
            )
            fail_closed_reasons.append("admission_flag_invalid_state")
        elif not admission_flag_enabled:
            warnings.append(
                f"Admission flag {_STAGE_WRITE_ADMISSION_FLAG_NAME} is off; stage-write remains fail-closed."
            )
            fail_closed_reasons.append("admission_flag_disabled_or_missing")
        else:
            if admission_packet_reference is None:
                warnings.append(
                    f"Admission packet reference {_STAGE_WRITE_ADMISSION_PACKET_REF_ENV} is required when the admission flag is on."
                )
                fail_closed_reasons.append("admission_packet_reference_missing")
            if admission_operator_id is None:
                warnings.append(
                    f"Admission operator identity {_STAGE_WRITE_ADMISSION_OPERATOR_ID_ENV} is required when the admission flag is on."
                )
                fail_closed_reasons.append("admission_operator_id_missing")
            if evidence_bundle_reference is None:
                warnings.append(
                    f"Proof evidence bundle reference {_STAGE_WRITE_EVIDENCE_BUNDLE_REF_ENV} is required when the admission flag is on."
                )
                fail_closed_reasons.append("evidence_bundle_reference_missing")
            if post_write_readback_plan_reference is None:
                warnings.append(
                    f"Post-write readback plan reference {_STAGE_WRITE_POST_WRITE_READBACK_PLAN_REF_ENV} is required when the admission flag is on."
                )
                fail_closed_reasons.append("post_write_readback_plan_missing")
            if revert_plan_reference is None:
                warnings.append(
                    f"Revert plan reference {_STAGE_WRITE_REVERT_PLAN_REF_ENV} is required when the admission flag is on."
                )
                fail_closed_reasons.append("revert_plan_reference_missing")
            if not revert_allowed_paths:
                warnings.append(
                    f"Exact revert-path allowlist {_STAGE_WRITE_REVERT_ALLOWED_PATHS_ENV} is required when the admission flag is on."
                )
                fail_closed_reasons.append("revert_allowed_paths_missing")
            else:
                expected_revert_scope = {stage_relative_path, manifest_relative_path}
                revert_plan_exact_scope = revert_allowed_paths == expected_revert_scope
                if not revert_plan_exact_scope:
                    warnings.append(
                        "Revert allowed-path scope must match exactly the stage and manifest paths for this request."
                    )
                    fail_closed_reasons.append("revert_plan_scope_not_exact")
            post_write_readback_plan_ready = (
                evidence_bundle_reference is not None
                and post_write_readback_plan_reference is not None
            )
            revert_plan_ready = revert_plan_reference is not None
            admission_evidence_ready = (
                admission_packet_reference is not None
                and admission_operator_id is not None
                and (request.approval_state != "approved" or operator_note_present)
                and post_write_readback_plan_ready
                and revert_plan_ready
                and revert_plan_exact_scope
            )
            if not admission_evidence_ready:
                warnings.append(
                    "Admission evidence is incomplete; proof-only stage-write execution remains fail-closed."
                )
                fail_closed_reasons.append("admission_evidence_incomplete")

        execution_admitted = (
            admission_flag_enabled
            and admission_evidence_ready
            and server_approval_evaluation.policy_would_allow_if_mutation_admitted
            and source_exists
            and source_hash_match
            and manifest_hash_match
            and overwrite_policy_supported
            and destination_within_staging_root
            and destination_paths_within_project_root
            and source_within_runtime
            and source_extension_allowed
            and destination_extension_allowed
            and source_size_within_cap
            and not overwrite_detected
            and not path_traversal_detected
            and staging_root_allowlisted
            and manifest_suffix_allowed
            and not fail_closed_reasons
        )

        dry_run_only = True
        write_status: Literal["approval-required", "succeeded", "blocked", "failed"] = "blocked"
        write_executed = False
        project_write_admitted = False
        bytes_copied = source_size
        destination_sha256: str | None = None
        manifest_sha256: str | None = None
        post_write_readback: dict[str, object] = {
            "source_exists": source_exists,
            "destination_exists": destination_source_path.is_file() if destination_source_path else False,
            "manifest_exists": destination_manifest_path.is_file() if destination_manifest_path else False,
            "ingest_readback_bridge_status": "not_run",
        }
        safest_next_step = (
            "Keep stage-write blocked and use dry-run proofs to validate bounded corridor constraints before any proof-only execution packet."
        )

        if execution_admitted:
            dry_run_only = False
            project_write_admitted = True
            warnings.append(
                "Proof-only stage-write execution is admitted for this exact request envelope and bounded corridor."
            )
            try:
                assert destination_source_path is not None
                assert destination_manifest_path is not None
                assert project_root_path is not None

                destination_source_path.parent.mkdir(parents=True, exist_ok=True)
                destination_manifest_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source_path, destination_source_path)
                destination_manifest_path.write_bytes(planned_manifest_bytes)

                destination_sha256 = _sha256_file(destination_source_path)
                manifest_sha256 = _sha256_file(destination_manifest_path)
                destination_hash_matches_expected = bool(
                    destination_sha256 and source_hash_expected and destination_sha256 == source_hash_expected
                )
                manifest_hash_matches_expected = bool(
                    manifest_sha256 and manifest_hash_expected and manifest_sha256 == manifest_hash_expected
                )

                post_write_readback.update(
                    {
                        "destination_exists": destination_source_path.is_file(),
                        "manifest_exists": destination_manifest_path.is_file(),
                        "destination_sha256": destination_sha256,
                        "manifest_sha256": manifest_sha256,
                        "destination_hash_matches_expected": destination_hash_matches_expected,
                        "manifest_hash_matches_expected": manifest_hash_matches_expected,
                    }
                )

                if destination_hash_matches_expected and manifest_hash_matches_expected:
                    write_status = "succeeded"
                    write_executed = True
                    fail_closed_reasons = []
                    readback_platform = (
                        os.environ.get(_STAGE_WRITE_READBACK_PLATFORM_ENV, "pc").strip().lower() or "pc"
                    )
                    try:
                        readback_record = self.read_o3de_ingest_readback(
                            AssetForgeO3DEReadbackRequest(
                                candidate_id=request.candidate_id,
                                candidate_label=request.candidate_label,
                                source_asset_relative_path=stage_relative_path,
                                selected_platform=readback_platform,
                            )
                        )
                        post_write_readback["ingest_readback_bridge_status"] = (
                            readback_record.readback_status
                        )
                        post_write_readback["ingest_readback_bridge"] = {
                            "capability_name": readback_record.capability_name,
                            "readback_status": readback_record.readback_status,
                            "selected_platform": readback_record.selected_platform,
                            "source_exists": readback_record.source_exists,
                            "asset_database_exists": readback_record.asset_database_exists,
                            "source_found_in_assetdb": readback_record.source_found_in_assetdb,
                            "product_count": readback_record.product_count,
                            "dependency_count": readback_record.dependency_count,
                            "catalog_exists": readback_record.catalog_exists,
                            "catalog_presence": readback_record.catalog_presence,
                            "catalog_product_path_presence_count": len(
                                readback_record.catalog_product_path_presence
                            ),
                            "warnings": readback_record.warnings[:8],
                            "safest_next_step": readback_record.safest_next_step,
                            "source": readback_record.source,
                        }
                        if readback_record.readback_status == "succeeded":
                            safest_next_step = (
                                "Review bridged readback evidence and continue with placement planning only after explicit operator approval."
                            )
                        else:
                            warnings.append(
                                "Stage-write succeeded, but bridged readback evidence is blocked; run operator-managed Asset Processor refresh outside this endpoint and rerun readback."
                            )
                            safest_next_step = (
                                "Use the bridged readback blockers to guide an operator-managed Asset Processor refresh, then rerun readback before any placement packet."
                            )
                    except (OSError, ValueError) as exc:
                        post_write_readback["ingest_readback_bridge_status"] = "failed"
                        post_write_readback["ingest_readback_bridge"] = {
                            "error": str(exc),
                            "selected_platform": readback_platform,
                        }
                        warnings.append(
                            "Stage-write succeeded, but post-write readback bridge execution failed; run /asset-forge/o3de/readback directly to capture evidence."
                        )
                        safest_next_step = (
                            "Run /asset-forge/o3de/readback directly for the staged source path to capture evidence before any placement packet."
                        )
                else:
                    write_status = "failed"
                    write_executed = True
                    if not destination_hash_matches_expected:
                        fail_closed_reasons.append("post_write_source_readback_mismatch")
                    if not manifest_hash_matches_expected:
                        fail_closed_reasons.append("post_write_manifest_readback_mismatch")
                    warnings.append(
                        "Post-write readback verification failed; exact-scope revert was applied for the staged files."
                    )
                    for revert_path in [destination_manifest_path, destination_source_path]:
                        if (
                            revert_path.exists()
                            and _path_within_root(revert_path, project_root_path)
                            and _normalize_project_relative_path(
                                str(revert_path.relative_to(project_root_path))
                            )
                            in {stage_relative_path, manifest_relative_path}
                        ):
                            revert_path.unlink()
                    post_write_readback["revert_applied_on_failure"] = True
                    post_write_readback["destination_exists_after_revert"] = destination_source_path.exists()
                    post_write_readback["manifest_exists_after_revert"] = destination_manifest_path.exists()
                    safest_next_step = (
                        "Inspect proof-only stage-write readback mismatch and keep corridor blocked until mismatch cause is resolved."
                    )
            except (AssertionError, OSError, ValueError) as exc:
                write_status = "failed"
                fail_closed_reasons.append("stage_write_execution_failed")
                warnings.append(f"Proof-only stage-write execution failed safely: {exc}")
                if destination_source_path and destination_source_path.exists():
                    write_executed = True
                if destination_manifest_path and destination_manifest_path.exists():
                    write_executed = True
                if project_root_path is not None:
                    for revert_path in [destination_manifest_path, destination_source_path]:
                        if (
                            revert_path is not None
                            and revert_path.exists()
                            and _path_within_root(revert_path, project_root_path)
                            and _normalize_project_relative_path(
                                str(revert_path.relative_to(project_root_path))
                            )
                            in {stage_relative_path, manifest_relative_path}
                        ):
                            revert_path.unlink()
                post_write_readback["revert_applied_on_failure"] = True
                post_write_readback["destination_exists_after_revert"] = (
                    destination_source_path.exists() if destination_source_path else False
                )
                post_write_readback["manifest_exists_after_revert"] = (
                    destination_manifest_path.exists() if destination_manifest_path else False
                )
                safest_next_step = (
                    "Inspect proof-only stage-write failure evidence and keep the corridor fail-closed until root cause is fixed."
                )
        else:
            warnings.append(
                "Stage write execution remains blocked in this request because at least one fail-closed gate did not pass."
            )
            fail_closed_reasons.append("mutation_admission_not_enabled")

        fail_closed_reasons = list(dict.fromkeys(fail_closed_reasons))

        return AssetForgeO3DEStageWriteRecord(
            capability_name="asset_forge.o3de.stage.write",
            maturity="approval-gated-write",
            write_status=write_status,
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            project_root=str(project_root_path) if project_root_path else None,
            source_artifact_path=str(source_path),
            destination_source_asset_path=str(destination_source_path) if destination_source_path else None,
            destination_manifest_path=str(destination_manifest_path) if destination_manifest_path else None,
            corridor_name=_STAGE_WRITE_CORRIDOR_NAME,
            dry_run_only=dry_run_only,
            execution_admitted=execution_admitted,
            admission_flag_name=_STAGE_WRITE_ADMISSION_FLAG_NAME,
            admission_flag_state=admission_flag_state,
            admission_flag_enabled=admission_flag_enabled,
            admission_packet_reference=admission_packet_reference,
            admission_operator_id=admission_operator_id,
            operator_note_present=operator_note_present,
            admission_evidence_ready=admission_evidence_ready,
            evidence_bundle_reference=evidence_bundle_reference,
            post_write_readback_plan_reference=post_write_readback_plan_reference,
            revert_plan_reference=revert_plan_reference,
            post_write_readback_plan_ready=post_write_readback_plan_ready,
            revert_plan_ready=revert_plan_ready,
            revert_plan_exact_scope=revert_plan_exact_scope,
            normalized_destination_path=stage_relative_path,
            destination_within_staging_root=destination_within_staging_root,
            staging_root_allowlisted=staging_root_allowlisted,
            overwrite_policy=overwrite_policy,
            overwrite_detected=overwrite_detected,
            source_hash_expected=source_hash_expected,
            manifest_hash_expected=manifest_hash_expected,
            source_hash_match=source_hash_match,
            manifest_hash_match=manifest_hash_match,
            path_traversal_detected=path_traversal_detected,
            fail_closed_reasons=fail_closed_reasons,
            approval_required=True,
            approval_state=request.approval_state,
            server_approval_session_id=request.approval_session_id,
            server_approval_evaluation=server_approval_evaluation,
            write_executed=write_executed,
            project_write_admitted=project_write_admitted,
            bytes_copied=bytes_copied,
            source_sha256=source_sha256,
            destination_sha256=destination_sha256,
            manifest_sha256=manifest_sha256,
            post_write_readback=post_write_readback,
            revert_paths=revert_paths,
            warnings=warnings,
            safest_next_step=safest_next_step,
            source="asset-forge-o3de-stage-write",
        )

    def read_o3de_ingest_readback(
        self,
        request: AssetForgeO3DEReadbackRequest,
    ) -> AssetForgeO3DEReadbackRecord:
        normalized_source_relative = _normalize_source_asset_relative_path(
            request.source_asset_relative_path
        )
        selected_platform = request.selected_platform.strip().lower() or "pc"
        project_root_raw = os.environ.get("O3DE_TARGET_PROJECT_ROOT", "").strip()
        project_root_path = Path(project_root_raw).resolve() if project_root_raw else None
        source_path = (
            (project_root_path / normalized_source_relative).resolve()
            if project_root_path
            else None
        )
        warnings = [
            "Packet 09 readback is read-only evidence capture only.",
            "No Asset Processor execution, Blender execution, or Editor placement is performed.",
        ]
        safest_next_step = (
            "Use this read-only evidence packet to decide whether an operator-managed Asset Processor refresh is required."
        )

        if not project_root_raw:
            warnings.append("O3DE_TARGET_PROJECT_ROOT is not configured.")
            return AssetForgeO3DEReadbackRecord(
                capability_name="asset_forge.o3de.ingest.readback",
                maturity="preflight-only",
                readback_status="blocked",
                candidate_id=request.candidate_id,
                candidate_label=request.candidate_label,
                project_root=None,
                source_asset_relative_path=normalized_source_relative,
                source_asset_absolute_path=str(source_path) if source_path else None,
                selected_platform=selected_platform,
                source_exists=False,
                asset_database_path=None,
                asset_database_exists=False,
                asset_database_freshness_status="unknown",
                source_found_in_assetdb=False,
                asset_processor_warning_count=0,
                asset_processor_error_count=0,
                product_count=0,
                dependency_count=0,
                catalog_path=None,
                catalog_exists=False,
                catalog_freshness_status="unknown",
                catalog_presence=False,
                read_only=True,
                mutation_occurred=False,
                warnings=warnings,
                safest_next_step="Set O3DE_TARGET_PROJECT_ROOT and retry read-only ingest evidence capture.",
                source="asset-forge-o3de-ingest-readback",
            )

        if project_root_path is None or not project_root_path.is_dir():
            warnings.append("Configured O3DE project root does not exist as a directory.")
            return AssetForgeO3DEReadbackRecord(
                capability_name="asset_forge.o3de.ingest.readback",
                maturity="preflight-only",
                readback_status="blocked",
                candidate_id=request.candidate_id,
                candidate_label=request.candidate_label,
                project_root=str(project_root_path) if project_root_path else None,
                source_asset_relative_path=normalized_source_relative,
                source_asset_absolute_path=str(source_path) if source_path else None,
                selected_platform=selected_platform,
                source_exists=False,
                asset_database_path=None,
                asset_database_exists=False,
                asset_database_freshness_status="unknown",
                source_found_in_assetdb=False,
                asset_processor_warning_count=0,
                asset_processor_error_count=0,
                product_count=0,
                dependency_count=0,
                catalog_path=None,
                catalog_exists=False,
                catalog_freshness_status="unknown",
                catalog_presence=False,
                read_only=True,
                mutation_occurred=False,
                warnings=warnings,
                safest_next_step="Use a valid local O3DE project root and retry read-only ingest evidence capture.",
                source="asset-forge-o3de-ingest-readback",
            )

        if (
            source_path is None
            or not _path_within_root(source_path, project_root_path)
            or not normalized_source_relative.startswith(_ALLOWED_STAGE_ROOT_PREFIX)
        ):
            warnings.append(
                "Source path must stay under Assets/Generated/asset_forge inside the selected project root."
            )
            return AssetForgeO3DEReadbackRecord(
                capability_name="asset_forge.o3de.ingest.readback",
                maturity="preflight-only",
                readback_status="blocked",
                candidate_id=request.candidate_id,
                candidate_label=request.candidate_label,
                project_root=str(project_root_path),
                source_asset_relative_path=normalized_source_relative,
                source_asset_absolute_path=str(source_path) if source_path else None,
                selected_platform=selected_platform,
                source_exists=False,
                asset_database_path=None,
                asset_database_exists=False,
                asset_database_freshness_status="unknown",
                source_found_in_assetdb=False,
                asset_processor_warning_count=0,
                asset_processor_error_count=0,
                product_count=0,
                dependency_count=0,
                catalog_path=None,
                catalog_exists=False,
                catalog_freshness_status="unknown",
                catalog_presence=False,
                read_only=True,
                mutation_occurred=False,
                warnings=warnings,
                safest_next_step=(
                    "Provide a deterministic staged source path under Assets/Generated/asset_forge and retry readback."
                ),
                source="asset-forge-o3de-ingest-readback",
            )

        source_exists = source_path.is_file()
        source_size_bytes = source_path.stat().st_size if source_exists else None
        source_sha256 = _sha256_file(source_path) if source_exists else None

        asset_database_path = (project_root_path / "Cache" / "assetdb.sqlite").resolve()
        asset_database_exists = asset_database_path.is_file()
        source_last_write_epoch = source_path.stat().st_mtime if source_exists else None
        asset_database_last_write_epoch = (
            asset_database_path.stat().st_mtime if asset_database_exists else None
        )
        asset_database_freshness_status = _resolve_freshness_status(
            artifact_exists=source_exists,
            artifact_mtime=source_last_write_epoch,
            evidence_exists=asset_database_exists,
            evidence_mtime=asset_database_last_write_epoch,
        )
        asset_database_last_write_time = (
            _to_utc_iso_from_epoch(asset_database_last_write_epoch)
            if asset_database_last_write_epoch is not None
            else None
        )

        assetdb_evidence = self._read_assetdb_source_evidence(
            assetdb_path=asset_database_path,
            source_relative_path=normalized_source_relative,
        )
        warnings.extend(assetdb_evidence["warnings"])

        representative_products = assetdb_evidence["representative_products"]
        catalog_presence_rows = self._read_catalog_presence(
            project_root=project_root_path,
            selected_platform=selected_platform,
            product_paths=representative_products,
        )
        warnings.extend(catalog_presence_rows["warnings"])

        catalog_path = (project_root_path / "Cache" / selected_platform / "assetcatalog.xml").resolve()
        catalog_exists = catalog_path.is_file()
        catalog_last_write_epoch = catalog_path.stat().st_mtime if catalog_exists else None
        catalog_freshness_status = _resolve_freshness_status(
            artifact_exists=source_exists,
            artifact_mtime=source_last_write_epoch,
            evidence_exists=catalog_exists,
            evidence_mtime=catalog_last_write_epoch,
        )
        catalog_last_write_time = (
            _to_utc_iso_from_epoch(catalog_last_write_epoch)
            if catalog_last_write_epoch is not None
            else None
        )

        status = "blocked"
        if (
            source_exists
            and asset_database_exists
            and assetdb_evidence["source_found_in_assetdb"]
            and assetdb_evidence["product_count"] > 0
            and bool(catalog_presence_rows["catalog_product_path_presence"])
        ):
            status = "succeeded"
            safest_next_step = (
                "Review warnings/freshness labels and continue with Packet 10 placement planning only after operator approval."
            )
        else:
            if not source_exists:
                warnings.append("Staged source file is missing from the selected project root.")
            if asset_database_exists and not assetdb_evidence["source_found_in_assetdb"]:
                warnings.append(
                    "Source path is not indexed in assetdb.sqlite yet; Asset Processor likely has not produced rows for this source."
                )
            if assetdb_evidence["product_count"] == 0:
                warnings.append(
                    "No bounded product rows were found for this source in assetdb.sqlite."
                )
            if not catalog_presence_rows["catalog_product_path_presence"]:
                warnings.append(
                    "No catalog path presence rows were produced for the bounded product set."
                )
            safest_next_step = (
                "Run operator-managed Asset Processor refresh (outside this endpoint), then rerun Packet 09 read-only readback."
            )

        return AssetForgeO3DEReadbackRecord(
            capability_name="asset_forge.o3de.ingest.readback",
            maturity="preflight-only",
            readback_status=status,
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            project_root=str(project_root_path),
            source_asset_relative_path=normalized_source_relative,
            source_asset_absolute_path=str(source_path),
            selected_platform=selected_platform,
            source_exists=source_exists,
            source_size_bytes=source_size_bytes,
            source_sha256=source_sha256,
            asset_database_path=str(asset_database_path),
            asset_database_exists=asset_database_exists,
            asset_database_freshness_status=asset_database_freshness_status,
            asset_database_last_write_time=asset_database_last_write_time,
            source_found_in_assetdb=assetdb_evidence["source_found_in_assetdb"],
            source_id=assetdb_evidence["source_id"],
            source_guid=assetdb_evidence["source_guid"],
            asset_processor_job_rows=assetdb_evidence["asset_processor_job_rows"],
            asset_processor_warning_count=assetdb_evidence["asset_processor_warning_count"],
            asset_processor_error_count=assetdb_evidence["asset_processor_error_count"],
            product_count=assetdb_evidence["product_count"],
            dependency_count=assetdb_evidence["dependency_count"],
            representative_products=assetdb_evidence["representative_products"],
            representative_dependencies=assetdb_evidence["representative_dependencies"],
            catalog_path=str(catalog_path),
            catalog_exists=catalog_exists,
            catalog_freshness_status=catalog_freshness_status,
            catalog_last_write_time=catalog_last_write_time,
            catalog_presence=catalog_presence_rows["catalog_presence"],
            catalog_product_path_presence=catalog_presence_rows[
                "catalog_product_path_presence"
            ],
            read_only=True,
            mutation_occurred=False,
            warnings=warnings,
            safest_next_step=safest_next_step,
            source="asset-forge-o3de-ingest-readback",
        )

    def create_o3de_placement_plan(
        self,
        request: AssetForgeO3DEPlacementPlanRequest,
    ) -> AssetForgeO3DEPlacementPlanRecord:
        staged_source_relative_path = _normalize_project_relative_path(
            request.staged_source_relative_path
        )
        target_level_relative_path = _normalize_project_relative_path(
            request.target_level_relative_path
        )
        target_component = request.target_component.strip() or "Mesh"
        source_extension = Path(staged_source_relative_path).suffix.lower()

        warnings = [
            "Packet 10 is plan-only. No Editor placement execution is performed.",
            "Placement execution remains blocked until a future exact admitted corridor is proven.",
        ]
        requirement_checklist = [
            "Target level path is defined and project-relative.",
            "Placement entity name is deterministic for review/audit.",
            "Staged source path remains under Assets/Generated/asset_forge.",
            "Source ingest readback evidence should be present before placement execution admission.",
            "Operator approval is required before any placement execution packet.",
        ]
        placement_plan_policy: dict[str, object] = {
            "allowed_stage_prefix": _ALLOWED_STAGE_ROOT_PREFIX,
            "allowed_stage_extensions": sorted(_ALLOWED_STAGE_DEST_EXTENSIONS),
            "allowed_level_prefix": "Levels/",
            "allowed_level_suffix": ".prefab",
            "approval_required_for_proof": True,
            "placement_write_admitted": False,
        }

        level_path_allowed = target_level_relative_path.startswith("Levels/") and target_level_relative_path.endswith(
            ".prefab"
        )
        stage_path_allowed = staged_source_relative_path.startswith(_ALLOWED_STAGE_ROOT_PREFIX)
        stage_extension_allowed = source_extension in _ALLOWED_STAGE_DEST_EXTENSIONS

        if not level_path_allowed or not stage_path_allowed or not stage_extension_allowed:
            if not level_path_allowed:
                warnings.append(
                    "Target level path must be project-relative under Levels/ and end with .prefab."
                )
            if not stage_path_allowed:
                warnings.append(
                    "Staged source path must remain under Assets/Generated/asset_forge/."
                )
            if not stage_extension_allowed:
                warnings.append(
                    "Staged source extension is not allowlisted for placement planning."
                )
            return AssetForgeO3DEPlacementPlanRecord(
                capability_name="asset_forge.o3de.placement.plan",
                maturity="plan-only",
                plan_status="blocked",
                candidate_id=request.candidate_id,
                candidate_label=request.candidate_label,
                staged_source_relative_path=staged_source_relative_path,
                target_level_relative_path=target_level_relative_path,
                target_entity_name=request.target_entity_name,
                target_component=target_component,
                placement_execution_status="blocked",
                approval_required=True,
                placement_write_admitted=False,
                placement_plan_policy=placement_plan_policy,
                placement_plan_summary=(
                    "Placement plan request was blocked because one or more path/extension constraints were not met."
                ),
                requirement_checklist=requirement_checklist,
                warnings=warnings,
                safest_next_step=(
                    "Use an allowlisted staged source path and a Levels/*.prefab target, then rerun plan-only placement planning."
                ),
                source="asset-forge-o3de-placement-plan",
            )

        return AssetForgeO3DEPlacementPlanRecord(
            capability_name="asset_forge.o3de.placement.plan",
            maturity="plan-only",
            plan_status="ready-for-approval",
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            staged_source_relative_path=staged_source_relative_path,
            target_level_relative_path=target_level_relative_path,
            target_entity_name=request.target_entity_name,
            target_component=target_component,
            placement_execution_status="blocked",
            approval_required=True,
            placement_write_admitted=False,
            placement_plan_policy=placement_plan_policy,
            placement_plan_summary=(
                f"Plan-only placement target prepared for entity '{request.target_entity_name}' in "
                f"'{target_level_relative_path}' using staged source '{staged_source_relative_path}'."
            ),
            requirement_checklist=requirement_checklist,
            warnings=warnings,
            safest_next_step=(
                "Keep this as plan-only and promote through a separate Packet 11 proof/admission path before any placement execution."
            ),
            source="asset-forge-o3de-placement-plan",
        )

    def execute_o3de_placement_proof(
        self,
        request: AssetForgeO3DEPlacementProofRequest,
    ) -> AssetForgeO3DEPlacementProofRecord:
        staged_source_relative_path = _normalize_project_relative_path(
            request.staged_source_relative_path
        )
        target_level_relative_path = _normalize_project_relative_path(
            request.target_level_relative_path
        )
        server_approval_evaluation = self._evaluate_server_approval_session(
            approval_session_id=request.approval_session_id,
            expected_capability="asset_forge.o3de.placement.execute",
            binding=_make_server_approval_binding(
                candidate_id=request.candidate_id,
                candidate_label=request.candidate_label,
                requested_capability="asset_forge.o3de.placement.execute",
                stage_relative_path=staged_source_relative_path,
                target_level_relative_path=target_level_relative_path,
                target_entity_name=request.target_entity_name,
            ),
        )
        target_component = request.target_component.strip() or "Mesh"
        admission_flag_enabled, admission_flag_state = _resolve_placement_proof_admission_flag_state()
        requested_stage_write_corridor_name = request.stage_write_corridor_name.strip()
        stage_write_evidence_reference = request.stage_write_evidence_reference.strip()
        stage_write_readback_reference = request.stage_write_readback_reference.strip()
        stage_write_readback_status = request.stage_write_readback_status
        stage_write_evidence_ready = bool(stage_write_evidence_reference)
        stage_write_readback_ready = (
            bool(stage_write_readback_reference) and stage_write_readback_status == "succeeded"
        )
        (
            admission_packet_reference,
            admission_operator_id,
            evidence_bundle_reference,
            readback_plan_reference,
            revert_statement_contract_key,
        ) = _resolve_placement_proof_contract_context()
        operator_note_present = bool(request.approval_note.strip())
        expected_revert_statement_contract_key = _build_placement_proof_revert_contract_key(
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            staged_source_relative_path=staged_source_relative_path,
            target_level_relative_path=target_level_relative_path,
            target_entity_name=request.target_entity_name,
            target_component=target_component,
            stage_write_corridor_name=requested_stage_write_corridor_name,
            stage_write_evidence_reference=stage_write_evidence_reference,
            stage_write_readback_reference=stage_write_readback_reference,
        )
        revert_statement_contract_match = bool(
            revert_statement_contract_key
            and revert_statement_contract_key == expected_revert_statement_contract_key
        )
        contract_evidence_ready = False
        staged_source_allowlisted = staged_source_relative_path.lower().startswith(
            _ALLOWED_STAGE_ROOT_PREFIX.lower()
        )
        target_level_allowlisted = target_level_relative_path.lower().startswith("levels/") and (
            target_level_relative_path.lower().endswith(".prefab")
        )

        fail_closed_reasons: list[str] = []
        warnings = [
            "Placement corridor is proof-only and exact-scope.",
            "No broad prefab, level, or scene mutation is admitted.",
            "Placement proof execution remains blocked in this packet by default fail-closed policy.",
        ]
        warnings.append(server_approval_evaluation.reason)
        if admission_flag_state == "invalid_default_off":
            fail_closed_reasons.append("admission_flag_invalid_state")
            warnings.append(
                f"Admission flag {_PLACEMENT_PROOF_ADMISSION_FLAG_ENV} is malformed; defaulting to fail-closed off."
            )
        elif not admission_flag_enabled:
            fail_closed_reasons.append("admission_flag_disabled_or_missing")
            warnings.append(
                f"Admission flag {_PLACEMENT_PROOF_ADMISSION_FLAG_NAME} is off; placement proof remains fail-closed."
            )
        else:
            warnings.append(
                "Admission flag is on, but this packet does not admit placement runtime execution."
            )
            if admission_packet_reference is None:
                fail_closed_reasons.append("admission_packet_reference_missing")
                warnings.append(
                    f"Admission packet reference {_PLACEMENT_PROOF_ADMISSION_PACKET_REF_ENV} is required when the admission flag is on."
                )
            if admission_operator_id is None:
                fail_closed_reasons.append("admission_operator_id_missing")
                warnings.append(
                    f"Admission operator identity {_PLACEMENT_PROOF_ADMISSION_OPERATOR_ID_ENV} is required when the admission flag is on."
                )
            if evidence_bundle_reference is None:
                fail_closed_reasons.append("evidence_bundle_reference_missing")
                warnings.append(
                    f"Evidence bundle reference {_PLACEMENT_PROOF_EVIDENCE_BUNDLE_REF_ENV} is required when the admission flag is on."
                )
            if readback_plan_reference is None:
                fail_closed_reasons.append("readback_plan_reference_missing")
                warnings.append(
                    f"Readback plan reference {_PLACEMENT_PROOF_READBACK_PLAN_REF_ENV} is required when the admission flag is on."
                )
            if revert_statement_contract_key is None:
                fail_closed_reasons.append("revert_statement_contract_key_missing")
                warnings.append(
                    f"Revert statement contract key {_PLACEMENT_PROOF_REVERT_CONTRACT_KEY_ENV} is required when the admission flag is on."
                )
            elif not revert_statement_contract_match:
                fail_closed_reasons.append("revert_statement_contract_key_mismatch")
                warnings.append(
                    "Revert statement contract key did not match the expected exact-scope placement-proof request contract."
                )
            contract_evidence_ready = (
                admission_packet_reference is not None
                and admission_operator_id is not None
                and evidence_bundle_reference is not None
                and readback_plan_reference is not None
                and revert_statement_contract_match
                and operator_note_present
            )
            if not contract_evidence_ready:
                fail_closed_reasons.append("contract_evidence_incomplete")
                warnings.append(
                    "Placement proof contract evidence is incomplete; execution remains blocked and fail-closed."
                )
        if requested_stage_write_corridor_name != _STAGE_WRITE_CORRIDOR_NAME:
            fail_closed_reasons.append("stage_write_corridor_mismatch")
            warnings.append(
                f"Stage-write corridor mismatch; expected '{_STAGE_WRITE_CORRIDOR_NAME}'."
            )
        if not stage_write_evidence_ready:
            fail_closed_reasons.append("stage_write_evidence_reference_missing")
            warnings.append("Stage-write evidence reference is required before placement proof readiness.")
        if not stage_write_readback_reference:
            fail_closed_reasons.append("stage_write_readback_reference_missing")
            warnings.append("Stage-write readback reference is required before placement proof readiness.")
        if stage_write_readback_status != "succeeded":
            fail_closed_reasons.append("stage_write_readback_not_succeeded")
            warnings.append(
                "Stage-write readback status must be succeeded before placement proof can be considered."
            )
        if not staged_source_allowlisted:
            fail_closed_reasons.append("staged_source_outside_allowlisted_prefix")
            warnings.append("Staged source path must remain within Assets/Generated/asset_forge/.")
        if not target_level_allowlisted:
            fail_closed_reasons.append("target_level_outside_allowlisted_prefab_scope")
            warnings.append("Target level path must remain within Levels/ and end with .prefab.")
        if not server_approval_evaluation.policy_would_allow_if_mutation_admitted:
            fail_closed_reasons.append(
                f"server_approval:{server_approval_evaluation.decision_code}"
            )

        placement_proof_policy: dict[str, object] = {
            "corridor_name": _PLACEMENT_PROOF_CORRIDOR_NAME,
            "approval_required": True,
            "approval_note_required_when_approved": True,
            "runtime_gate_env": "ASSET_FORGE_ENABLE_PLACEMENT_PROOF",
            "runtime_gate_required": False,
            "placement_execution_admitted": False,
            "dry_run_only": True,
            "mutation_scope": "proof-only-no-scene-mutation",
            "client_approval_is_intent_only": True,
            "admission_flag_name": _PLACEMENT_PROOF_ADMISSION_FLAG_NAME,
            "admission_flag_env": _PLACEMENT_PROOF_ADMISSION_FLAG_ENV,
            "required_stage_write_corridor_name": _STAGE_WRITE_CORRIDOR_NAME,
            "required_stage_write_readback_status": "succeeded",
            "allowed_stage_prefix": _ALLOWED_STAGE_ROOT_PREFIX,
            "allowed_level_prefix": "Levels/",
            "allowed_level_suffix": ".prefab",
            "required_admission_packet_ref_env": _PLACEMENT_PROOF_ADMISSION_PACKET_REF_ENV,
            "required_admission_operator_id_env": _PLACEMENT_PROOF_ADMISSION_OPERATOR_ID_ENV,
            "required_evidence_bundle_ref_env": _PLACEMENT_PROOF_EVIDENCE_BUNDLE_REF_ENV,
            "required_readback_plan_ref_env": _PLACEMENT_PROOF_READBACK_PLAN_REF_ENV,
            "required_revert_contract_key_env": _PLACEMENT_PROOF_REVERT_CONTRACT_KEY_ENV,
            "required_revert_contract_key": expected_revert_statement_contract_key,
        }

        def _build_blocked_record(safest_next_step: str) -> AssetForgeO3DEPlacementProofRecord:
            return AssetForgeO3DEPlacementProofRecord(
                capability_name="asset_forge.o3de.placement.execute",
                corridor_name=_PLACEMENT_PROOF_CORRIDOR_NAME,
                maturity="proof-only",
                proof_status="blocked",
                dry_run_only=True,
                execution_admitted=False,
                candidate_id=request.candidate_id,
                candidate_label=request.candidate_label,
                staged_source_relative_path=staged_source_relative_path,
                target_level_relative_path=target_level_relative_path,
                target_entity_name=request.target_entity_name,
                target_component=target_component,
                approval_required=True,
                approval_state=request.approval_state,
                server_approval_session_id=request.approval_session_id,
                server_approval_evaluation=server_approval_evaluation,
                admission_flag_name=_PLACEMENT_PROOF_ADMISSION_FLAG_NAME,
                admission_flag_state=admission_flag_state,
                admission_flag_enabled=admission_flag_enabled,
                placement_write_admitted=False,
                stage_write_corridor_name=request.stage_write_corridor_name,
                stage_write_evidence_reference=stage_write_evidence_reference,
                stage_write_readback_reference=stage_write_readback_reference,
                stage_write_readback_status=stage_write_readback_status,
                stage_write_evidence_ready=stage_write_evidence_ready,
                stage_write_readback_ready=stage_write_readback_ready,
                admission_packet_reference=admission_packet_reference,
                admission_operator_id=admission_operator_id,
                evidence_bundle_reference=evidence_bundle_reference,
                readback_plan_reference=readback_plan_reference,
                revert_statement_contract_key=revert_statement_contract_key,
                revert_statement_contract_match=revert_statement_contract_match,
                operator_note_present=operator_note_present,
                contract_evidence_ready=contract_evidence_ready,
                fail_closed_reasons=fail_closed_reasons,
                placement_proof_policy=placement_proof_policy,
                placement_execution_status="blocked",
                proof_runtime_gate_enabled=False,
                write_occurred=False,
                warnings=warnings,
                safest_next_step=safest_next_step,
                source="asset-forge-o3de-placement-proof",
            )

        if request.approval_state != "approved":
            fail_closed_reasons.append("approval_state_not_approved")
            warnings.append("Approval state is not approved; runtime proof remains blocked.")
            return _build_blocked_record(
                "Keep this endpoint blocked; do not treat client approval fields as authorization."
            )

        if not operator_note_present:
            fail_closed_reasons.append("approval_note_missing")
            warnings.append("Approval note is required when approval_state is approved.")
            return _build_blocked_record(
                "Keep this endpoint blocked even when approval fields are provided by the client."
            )

        warnings.append(
            "Client approval fields are recorded as intent only; placement execution remains non-admitted."
        )
        fail_closed_reasons.append("placement_proof_execution_not_admitted")
        return _build_blocked_record(
            "Use stage-write plus readback evidence to prepare placement design review; keep placement execution blocked by default."
        )

    def read_o3de_placement_evidence(
        self,
        request: AssetForgeO3DEPlacementEvidenceRequest,
    ) -> AssetForgeO3DEPlacementEvidenceRecord:
        staged_source_relative_path = _normalize_project_relative_path(
            request.staged_source_relative_path
        )
        target_level_relative_path = _normalize_project_relative_path(
            request.target_level_relative_path
        )
        selected_platform = request.selected_platform.strip().lower() or "pc"
        project_root_raw = os.environ.get("O3DE_TARGET_PROJECT_ROOT", "").strip()
        project_root_path = Path(project_root_raw).resolve() if project_root_raw else None
        if not project_root_raw or project_root_path is None or not project_root_path.is_dir():
            return AssetForgeO3DEPlacementEvidenceRecord(
                capability_name="asset_forge.o3de.placement.evidence",
                maturity="preflight-only",
                evidence_status="blocked",
                candidate_id=request.candidate_id,
                candidate_label=request.candidate_label,
                project_root=None,
                staged_source_relative_path=staged_source_relative_path,
                staged_source_absolute_path=None,
                target_level_relative_path=target_level_relative_path,
                target_level_absolute_path=None,
                selected_platform=selected_platform,
                staged_source_exists=False,
                target_level_exists=False,
                asset_database_path=None,
                asset_database_exists=False,
                source_found_in_assetdb=False,
                source_id=None,
                source_guid=None,
                product_count=0,
                dependency_count=0,
                read_only=True,
                mutation_occurred=False,
                warnings=[
                    "O3DE project root is not configured; placement evidence preflight cannot verify source/level files.",
                    "Packet 11 evidence preflight is read-only and does not mutate O3DE scenes.",
                ],
                safest_next_step="Configure O3DE project root, then rerun placement evidence preflight.",
                source="asset-forge-o3de-placement-evidence",
            )

        source_path = (project_root_path / staged_source_relative_path).resolve()
        level_path = (project_root_path / target_level_relative_path).resolve()
        asset_database_path = project_root_path / "Cache" / "assetdb.sqlite"
        staged_source_exists = source_path.exists() and source_path.is_file()
        target_level_exists = level_path.exists() and level_path.is_file()
        asset_database_exists = asset_database_path.exists() and asset_database_path.is_file()
        assetdb_evidence = self._read_assetdb_source_evidence(
            assetdb_path=asset_database_path,
            source_relative_path=staged_source_relative_path,
        )

        warnings = [
            "Placement evidence preflight is read-only. No Editor scene mutation was performed.",
            "Packet 11 runtime placement execution remains blocked until explicit admitted harness execution.",
        ]
        warnings.extend(assetdb_evidence["warnings"])
        if not staged_source_exists:
            warnings.append("Staged source file was not found under the configured project root.")
        if not target_level_exists:
            warnings.append("Target level prefab was not found under the configured project root.")

        evidence_status: Literal["succeeded", "blocked"] = "succeeded"
        if not staged_source_exists or not target_level_exists:
            evidence_status = "blocked"

        return AssetForgeO3DEPlacementEvidenceRecord(
            capability_name="asset_forge.o3de.placement.evidence",
            maturity="preflight-only",
            evidence_status=evidence_status,
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            project_root=str(project_root_path),
            staged_source_relative_path=staged_source_relative_path,
            staged_source_absolute_path=str(source_path),
            target_level_relative_path=target_level_relative_path,
            target_level_absolute_path=str(level_path),
            selected_platform=selected_platform,
            staged_source_exists=staged_source_exists,
            target_level_exists=target_level_exists,
            asset_database_path=str(asset_database_path),
            asset_database_exists=asset_database_exists,
            source_found_in_assetdb=assetdb_evidence["source_found_in_assetdb"],
            source_id=assetdb_evidence["source_id"],
            source_guid=assetdb_evidence["source_guid"],
            product_count=assetdb_evidence["product_count"],
            dependency_count=assetdb_evidence["dependency_count"],
            read_only=True,
            mutation_occurred=False,
            warnings=warnings,
            safest_next_step=(
                "Use this preflight evidence snapshot to prepare a bounded runtime proof harness run with explicit approval."
            ),
            source="asset-forge-o3de-placement-evidence",
        )

    def prepare_o3de_placement_runtime_harness(
        self,
        request: AssetForgeO3DEPlacementHarnessRequest,
    ) -> AssetForgeO3DEPlacementHarnessRecord:
        target_component = request.target_component.strip() or "Mesh"
        selected_platform = request.selected_platform.strip().lower() or "pc"
        runtime_gate_enabled = False
        bridge_configured = False
        bridge_heartbeat_fresh = False
        warnings = [
            "Packet 11 runtime harness prep does not execute placement.",
            "No level/prefab/entity mutation is performed by this endpoint.",
            "Placement runtime bridge readiness checks are disabled in PR C.",
        ]

        harness_status: Literal["blocked", "ready-for-admitted-runtime-harness"] = "blocked"
        warnings.append("Runtime gate ASSET_FORGE_ENABLE_PLACEMENT_PROOF is treated as disabled in PR C.")
        warnings.append("Bridge status is intentionally not queried by this endpoint in PR C.")

        return AssetForgeO3DEPlacementHarnessRecord(
            capability_name="asset_forge.o3de.placement.harness.prepare",
            maturity="plan-only",
            harness_status=harness_status,
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            staged_source_relative_path=_normalize_project_relative_path(request.staged_source_relative_path),
            target_level_relative_path=_normalize_project_relative_path(request.target_level_relative_path),
            target_entity_name=request.target_entity_name,
            target_component=target_component,
            selected_platform=selected_platform,
            bridge_configured=bridge_configured,
            bridge_heartbeat_fresh=bridge_heartbeat_fresh,
            runtime_gate_enabled=runtime_gate_enabled,
            execution_performed=False,
            read_only=True,
            warnings=warnings,
            safest_next_step=(
                "Implement server-owned approval/session enforcement before admitting any placement runtime harness execution."
            ),
            source="asset-forge-o3de-placement-harness-prepare",
        )

    def execute_o3de_placement_runtime_harness(
        self,
        request: AssetForgeO3DEPlacementHarnessExecuteRequest,
    ) -> AssetForgeO3DEPlacementHarnessExecuteRecord:
        staged_source_relative_path = _normalize_project_relative_path(request.staged_source_relative_path)
        target_level_relative_path = _normalize_project_relative_path(request.target_level_relative_path)
        target_component = request.target_component.strip() or "Mesh"
        selected_platform = request.selected_platform.strip().lower() or "pc"
        server_approval_evaluation = self._evaluate_server_approval_session(
            approval_session_id=request.approval_session_id,
            expected_capability="asset_forge.o3de.placement.harness.execute",
            binding=_make_server_approval_binding(
                candidate_id=request.candidate_id,
                candidate_label=request.candidate_label,
                requested_capability="asset_forge.o3de.placement.harness.execute",
                stage_relative_path=staged_source_relative_path,
                target_level_relative_path=target_level_relative_path,
                target_entity_name=request.target_entity_name,
                selected_platform=selected_platform,
            ),
        )
        runtime_gate_enabled = False
        bridge_configured = False
        bridge_heartbeat_fresh = False
        warnings = [
            "One-shot Packet 11 harness endpoint is bounded and evidence-first.",
            "This slice does not auto-apply broad scene/prefab mutation.",
            "Placement runtime harness execution is blocked in PR C.",
        ]

        warnings.append("Client approval fields are treated as intent only and do not authorize execution.")
        warnings.append("No runtime bridge calls are performed by this endpoint in PR C.")
        warnings.append(server_approval_evaluation.reason)
        return AssetForgeO3DEPlacementHarnessExecuteRecord(
            capability_name="asset_forge.o3de.placement.harness.execute",
            maturity="proof-only",
            execute_status="blocked",
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            staged_source_relative_path=staged_source_relative_path,
            target_level_relative_path=target_level_relative_path,
            target_entity_name=request.target_entity_name,
            target_component=target_component,
            selected_platform=selected_platform,
            bridge_configured=bridge_configured,
            bridge_heartbeat_fresh=bridge_heartbeat_fresh,
            runtime_gate_enabled=runtime_gate_enabled,
            approval_state=request.approval_state,
            server_approval_session_id=request.approval_session_id,
            server_approval_evaluation=server_approval_evaluation,
            bridge_command_id=None,
            execution_performed=False,
            readback_captured=False,
            read_only=True,
            warnings=warnings,
            safest_next_step=(
                "Implement server-owned approval/session enforcement before enabling any placement runtime harness execution."
            ),
            source="asset-forge-o3de-placement-harness-execute",
        )

    def execute_o3de_placement_live_proof(
        self,
        request: AssetForgeO3DEPlacementLiveProofRequest,
    ) -> AssetForgeO3DEPlacementLiveProofRecord:
        selected_platform = request.selected_platform.strip().lower() or "pc"
        runtime_gate_enabled = False
        bridge_configured = False
        bridge_heartbeat_fresh = False
        target_level_relative_path = _normalize_project_relative_path(request.target_level_relative_path)
        server_approval_evaluation = self._evaluate_server_approval_session(
            approval_session_id=request.approval_session_id,
            expected_capability="asset_forge.o3de.placement.live_proof",
            binding=_make_server_approval_binding(
                candidate_id=request.candidate_id,
                candidate_label=request.candidate_label,
                requested_capability="asset_forge.o3de.placement.live_proof",
                target_level_relative_path=target_level_relative_path,
                target_entity_name=request.target_entity_name,
                selected_platform=selected_platform,
            ),
        )
        warnings = [
            "Live proof runtime execution is blocked in PR C.",
            "No broad prefab or scene mutation is performed in this packet.",
            "No runtime bridge calls are performed by this endpoint in PR C.",
        ]
        warnings.append(server_approval_evaluation.reason)
        revert_statement = "No mutation was admitted by this proof path; no revert action required."

        # Draft-checkpoint hard stop: client-declared approval metadata is never authorization.
        # Keep live-proof runtime execution disabled until server-owned approval enforcement exists.
        warnings.append(
            "Live proof runtime execution remains blocked in this packet because mutation admission is not enabled."
        )
        return AssetForgeO3DEPlacementLiveProofRecord(
            capability_name="asset_forge.o3de.placement.live_proof",
            maturity="proof-only",
            proof_status="blocked",
            candidate_id=request.candidate_id,
            candidate_label=request.candidate_label,
            target_level_relative_path=target_level_relative_path,
            target_entity_name=request.target_entity_name,
            selected_platform=selected_platform,
            bridge_configured=bridge_configured,
            bridge_heartbeat_fresh=bridge_heartbeat_fresh,
            runtime_gate_enabled=runtime_gate_enabled,
            server_approval_session_id=request.approval_session_id,
            server_approval_evaluation=server_approval_evaluation,
            execution_performed=False,
            readback_captured=False,
            entity_exists=None,
            bridge_command_id=None,
            evidence_bundle_path=None,
            revert_statement=revert_statement,
            read_only=True,
            warnings=warnings,
            safest_next_step=(
                "Keep placement live-proof execution blocked in this checkpoint; require server-owned approval/session enforcement before enabling runtime bridge actions."
            ),
            source="asset-forge-o3de-placement-live-proof",
        )

    def _read_assetdb_source_evidence(
        self,
        *,
        assetdb_path: Path,
        source_relative_path: str,
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "source_found_in_assetdb": False,
            "source_id": None,
            "source_guid": None,
            "asset_processor_job_rows": [],
            "asset_processor_warning_count": 0,
            "asset_processor_error_count": 0,
            "product_count": 0,
            "dependency_count": 0,
            "representative_products": [],
            "representative_dependencies": [],
            "warnings": [],
        }
        if not assetdb_path.exists():
            result["warnings"].append("No project assetdb.sqlite file was found under Cache/.")
            return result
        if not assetdb_path.is_file():
            result["warnings"].append("Cache/assetdb.sqlite exists but is not a file.")
            return result

        normalized_source = source_relative_path.replace("\\", "/").strip("/").lower()
        db_uri = f"{assetdb_path.as_uri()}?mode=ro"
        try:
            connection = sqlite3.connect(db_uri, uri=True)
            connection.row_factory = sqlite3.Row
        except sqlite3.Error as exc:
            result["warnings"].append(f"assetdb.sqlite could not be opened read-only: {exc}")
            return result

        try:
            source_row = connection.execute(
                """
                SELECT SourceID, hex(SourceGuid) AS SourceGuid
                FROM Sources
                WHERE lower(replace(SourceName, '\\', '/')) = ?
                ORDER BY SourceID DESC
                LIMIT 1
                """,
                (normalized_source,),
            ).fetchone()
            if source_row is None:
                return result

            source_id = int(source_row["SourceID"])
            source_guid = str(source_row["SourceGuid"] or "")
            result["source_found_in_assetdb"] = True
            result["source_id"] = source_id
            result["source_guid"] = source_guid

            product_table = "Products"
            has_products_table = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
                (product_table,),
            ).fetchone()
            if has_products_table is None:
                product_table = "Product"

            product_rows = connection.execute(
                f"""
                SELECT
                    j.JobID,
                    j.JobKey,
                    j.Platform,
                    j.Status,
                    j.WarningCount,
                    j.ErrorCount,
                    p.ProductID,
                    p.ProductName
                FROM Jobs j
                JOIN {product_table} p ON p.JobPK = j.JobID
                WHERE j.SourcePK = ?
                ORDER BY p.ProductID
                LIMIT ?
                """,
                (source_id, _ASSETDB_EVIDENCE_ROW_LIMIT),
            ).fetchall()

            result["product_count"] = len(product_rows)
            result["representative_products"] = [
                str(row["ProductName"]) for row in product_rows if row["ProductName"]
            ]

            job_summary: dict[int, dict[str, Any]] = {}
            for row in product_rows:
                job_id = int(row["JobID"])
                warning_count = int(row["WarningCount"] or 0)
                error_count = int(row["ErrorCount"] or 0)
                summary = job_summary.setdefault(
                    job_id,
                    {
                        "job_key": str(row["JobKey"] or ""),
                        "platform": str(row["Platform"] or ""),
                        "status": int(row["Status"] or 0),
                        "warning_count": warning_count,
                        "error_count": error_count,
                    },
                )
                summary["warning_count"] = max(summary["warning_count"], warning_count)
                summary["error_count"] = max(summary["error_count"], error_count)

            result["asset_processor_job_rows"] = [
                (
                    f"job_id={job_id}, job_key={summary['job_key']}, "
                    f"platform={summary['platform']}, status={summary['status']}, "
                    f"warnings={summary['warning_count']}, errors={summary['error_count']}"
                )
                for job_id, summary in job_summary.items()
            ]
            result["asset_processor_warning_count"] = sum(
                int(summary["warning_count"]) for summary in job_summary.values()
            )
            result["asset_processor_error_count"] = sum(
                int(summary["error_count"]) for summary in job_summary.values()
            )

            if product_rows:
                product_ids = [int(row["ProductID"]) for row in product_rows]
                placeholders = ",".join("?" for _ in product_ids)
                dependency_rows = connection.execute(
                    f"""
                    SELECT
                        ProductPK,
                        Platform,
                        hex(DependencySourceGuid) AS DependencySourceGuid,
                        DependencySubID,
                        DependencyFlags,
                        UnresolvedPath
                    FROM ProductDependencies
                    WHERE ProductPK IN ({placeholders})
                    ORDER BY ProductDependencyID
                    LIMIT ?
                    """,
                    (*product_ids, _ASSETDB_EVIDENCE_ROW_LIMIT),
                ).fetchall()
                result["dependency_count"] = len(dependency_rows)
                result["representative_dependencies"] = [
                    (
                        f"product_id={int(row['ProductPK'])}, platform={str(row['Platform'] or '')}, "
                        f"dependency_guid={str(row['DependencySourceGuid'] or '')}, "
                        f"dependency_sub_id={int(row['DependencySubID'] or 0)}, "
                        f"flags={int(row['DependencyFlags'] or 0)}, "
                        f"unresolved_path={str(row['UnresolvedPath'] or '')}"
                    )
                    for row in dependency_rows
                ]
        except sqlite3.Error as exc:
            result["warnings"].append(
                f"assetdb.sqlite readback failed due to unsupported or unreadable table shape: {exc}"
            )
        finally:
            connection.close()

        return result

    def _read_catalog_presence(
        self,
        *,
        project_root: Path,
        selected_platform: str,
        product_paths: list[str],
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "catalog_presence": False,
            "catalog_product_path_presence": [],
            "warnings": [],
        }
        if not product_paths:
            return result

        catalog_path = (project_root / "Cache" / selected_platform / "assetcatalog.xml").resolve()
        if not catalog_path.exists():
            result["warnings"].append(
                f"No project Asset Catalog was found at Cache/{selected_platform}/assetcatalog.xml."
            )
            return result
        if not catalog_path.is_file():
            result["warnings"].append(
                f"Cache/{selected_platform}/assetcatalog.xml exists but is not a file."
            )
            return result

        try:
            catalog_bytes = catalog_path.read_bytes().lower()
        except OSError as exc:
            result["warnings"].append(
                f"Cache/{selected_platform}/assetcatalog.xml could not be read: {exc}"
            )
            return result

        presence_rows: list[str] = []
        for product_path in product_paths[:_ASSETDB_EVIDENCE_ROW_LIMIT]:
            normalized_product_path = product_path.replace("\\", "/").strip("/")
            if "/" not in normalized_product_path:
                continue
            platform_prefix, catalog_relative_path = normalized_product_path.split("/", 1)
            if platform_prefix != selected_platform:
                continue
            if not catalog_relative_path:
                continue
            match_count = catalog_bytes.count(catalog_relative_path.lower().encode("utf-8"))
            presence_rows.append(
                f"{normalized_product_path} -> present={match_count > 0}, match_count={match_count}"
            )

        result["catalog_product_path_presence"] = presence_rows
        result["catalog_presence"] = any("present=True" in row for row in presence_rows)
        return result


asset_forge_service = AssetForgeService()
