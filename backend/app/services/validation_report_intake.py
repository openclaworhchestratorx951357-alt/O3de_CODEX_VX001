from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import PurePosixPath
from typing import Any

VALIDATION_REPORT_INTAKE_CAPABILITY = "validation.report.intake"
VALIDATION_REPORT_INTAKE_SCHEMA = "validation.report.intake.v1"
VALIDATION_REPORT_INTAKE_MAX_PAYLOAD_BYTES = 524_288
VALIDATION_REPORT_INTAKE_ENDPOINT_ADMISSION_FLAG_ENV = (
    "VALIDATION_REPORT_INTAKE_ENDPOINT_ENABLED"
)
VALIDATION_REPORT_INTAKE_DISPATCH_ADMISSION_FLAG_ENV = (
    "VALIDATION_REPORT_INTAKE_DISPATCH_ENABLED"
)

_CLIENT_AUTHORIZATION_FIELDS = {
    "approval_state",
    "approval_session_id",
    "approval_token",
}

_REQUIRED_FIELDS = {
    "schema",
    "capability_name",
    "report_id",
    "produced_at_utc",
    "producer",
    "result",
    "provenance",
    "payload",
    "integrity",
}

_REQUIRED_OBJECT_FIELDS = {
    "producer",
    "result",
    "provenance",
    "payload",
    "integrity",
}


def build_validation_report_intake_dry_run_plan(
    envelope: dict[str, Any] | Any,
    *,
    max_payload_bytes: int = VALIDATION_REPORT_INTAKE_MAX_PAYLOAD_BYTES,
) -> dict[str, Any]:
    fail_closed_reasons: list[str] = []
    normalized_artifact_refs: list[str] = []

    if not isinstance(envelope, dict):
        fail_closed_reasons.append("envelope_not_object")
        envelope = {}

    payload_size_bytes = _safe_payload_size_bytes(envelope)
    if payload_size_bytes is None:
        fail_closed_reasons.append("payload_size_unavailable")
    elif payload_size_bytes > max_payload_bytes:
        fail_closed_reasons.append("payload_size_over_cap")

    missing_fields = sorted(field for field in _REQUIRED_FIELDS if field not in envelope)
    if missing_fields:
        fail_closed_reasons.append("missing_required_fields")

    schema = envelope.get("schema")
    if schema != VALIDATION_REPORT_INTAKE_SCHEMA:
        fail_closed_reasons.append("schema_mismatch")

    capability_name = envelope.get("capability_name")
    if capability_name != VALIDATION_REPORT_INTAKE_CAPABILITY:
        fail_closed_reasons.append("capability_mismatch")

    report_id = envelope.get("report_id")
    if not isinstance(report_id, str) or not report_id.strip():
        fail_closed_reasons.append("report_id_invalid")

    produced_at_utc = envelope.get("produced_at_utc")
    if not _is_iso8601_utc(produced_at_utc):
        fail_closed_reasons.append("produced_at_utc_invalid")

    for field in _REQUIRED_OBJECT_FIELDS:
        if not isinstance(envelope.get(field), dict):
            fail_closed_reasons.append(f"{field}_invalid")

    if _contains_client_authorization_fields(envelope):
        fail_closed_reasons.append("client_authorization_fields_forbidden")

    provenance = envelope.get("provenance")
    if isinstance(provenance, dict):
        refs = provenance.get("artifact_refs")
        if refs is not None:
            refs_are_valid, normalized_artifact_refs = _normalize_artifact_refs(refs)
            if not refs_are_valid:
                fail_closed_reasons.append("artifact_refs_invalid")

    integrity = envelope.get("integrity")
    if isinstance(integrity, dict):
        payload_sha256 = integrity.get("payload_sha256")
        payload_size_claim = integrity.get("payload_size_bytes")
        if not isinstance(payload_sha256, str) or len(payload_sha256.strip()) != 64:
            fail_closed_reasons.append("integrity_hash_invalid")
        if not isinstance(payload_size_claim, int) or payload_size_claim < 0:
            fail_closed_reasons.append("integrity_size_invalid")
        if payload_size_bytes is not None and isinstance(payload_size_claim, int):
            if payload_size_claim != payload_size_bytes:
                fail_closed_reasons.append("integrity_size_mismatch")

    fail_closed_reasons = list(dict.fromkeys(fail_closed_reasons))
    accepted = len(fail_closed_reasons) == 0

    return {
        "corridor_name": VALIDATION_REPORT_INTAKE_CAPABILITY,
        "dry_run_only": True,
        "execution_admitted": False,
        "write_executed": False,
        "project_write_admitted": False,
        "accepted": accepted,
        "payload_size_bytes": payload_size_bytes,
        "schema": schema if isinstance(schema, str) else None,
        "capability_name": capability_name if isinstance(capability_name, str) else None,
        "normalized_artifact_refs": normalized_artifact_refs,
        "fail_closed_reasons": fail_closed_reasons,
    }


def get_validation_report_intake_endpoint_gate() -> dict[str, Any]:
    raw = os.environ.get(VALIDATION_REPORT_INTAKE_ENDPOINT_ADMISSION_FLAG_ENV)
    return _resolve_server_owned_admission_flag(
        raw=raw,
        flag_name=VALIDATION_REPORT_INTAKE_ENDPOINT_ADMISSION_FLAG_ENV,
    )


def get_validation_report_intake_dispatch_gate() -> dict[str, Any]:
    raw = os.environ.get(VALIDATION_REPORT_INTAKE_DISPATCH_ADMISSION_FLAG_ENV)
    return _resolve_server_owned_admission_flag(
        raw=raw,
        flag_name=VALIDATION_REPORT_INTAKE_DISPATCH_ADMISSION_FLAG_ENV,
    )


def _resolve_server_owned_admission_flag(*, raw: str | None, flag_name: str) -> dict[str, Any]:
    if raw is None:
        return {
            "admission_flag_name": flag_name,
            "admission_flag_state": "missing_default_off",
            "admission_flag_enabled": False,
        }

    candidate = raw.strip().lower()
    if candidate in {"1", "true", "yes", "on", "enabled"}:
        return {
            "admission_flag_name": flag_name,
            "admission_flag_state": "explicit_on",
            "admission_flag_enabled": True,
        }
    if candidate in {"0", "false", "no", "off", "disabled"}:
        return {
            "admission_flag_name": flag_name,
            "admission_flag_state": "explicit_off",
            "admission_flag_enabled": False,
        }
    return {
        "admission_flag_name": flag_name,
        "admission_flag_state": "invalid_default_off",
        "admission_flag_enabled": False,
    }


def _safe_payload_size_bytes(envelope: dict[str, Any]) -> int | None:
    try:
        canonical_envelope = json.loads(
            json.dumps(
                envelope,
                sort_keys=True,
                separators=(",", ":"),
                ensure_ascii=False,
            )
        )
    except (TypeError, ValueError):
        return None

    integrity = canonical_envelope.get("integrity")
    if isinstance(integrity, dict):
        integrity = dict(integrity)
        # Avoid self-referential size drift by canonicalizing the claim field.
        integrity["payload_size_bytes"] = 0
        canonical_envelope["integrity"] = integrity

    payload_bytes = json.dumps(
        canonical_envelope,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return len(payload_bytes)


def _is_iso8601_utc(value: Any) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    candidate = value.strip()
    if candidate.endswith("Z"):
        candidate = f"{candidate[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(candidate)
    except ValueError:
        return False
    return parsed.tzinfo is not None and parsed.utcoffset() is not None


def _contains_client_authorization_fields(value: Any) -> bool:
    if isinstance(value, dict):
        for key, nested in value.items():
            if key in _CLIENT_AUTHORIZATION_FIELDS:
                return True
            if _contains_client_authorization_fields(nested):
                return True
    if isinstance(value, list):
        return any(_contains_client_authorization_fields(item) for item in value)
    return False


def _normalize_artifact_refs(value: Any) -> tuple[bool, list[str]]:
    if not isinstance(value, list):
        return False, []

    normalized: list[str] = []
    for ref in value:
        if not isinstance(ref, str):
            return False, []
        candidate = ref.strip().replace("\\", "/")
        if not candidate:
            return False, []
        if candidate.startswith("/") or candidate.startswith("//"):
            return False, []
        path = PurePosixPath(candidate)
        if any(part == ".." for part in path.parts):
            return False, []
        normalized.append(str(path))

    return True, normalized
