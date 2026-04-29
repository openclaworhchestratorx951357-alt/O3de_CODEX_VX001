from app.services.validation_report_intake import (
    VALIDATION_REPORT_INTAKE_ENDPOINT_ADMISSION_FLAG_ENV,
    VALIDATION_REPORT_INTAKE_CAPABILITY,
    VALIDATION_REPORT_INTAKE_SCHEMA,
    build_validation_report_intake_dry_run_plan,
    build_validation_report_intake_endpoint_review,
    get_validation_report_intake_endpoint_gate,
)


def _valid_envelope() -> dict[str, object]:
    envelope = {
        "schema": VALIDATION_REPORT_INTAKE_SCHEMA,
        "capability_name": VALIDATION_REPORT_INTAKE_CAPABILITY,
        "report_id": "report-001",
        "produced_at_utc": "2026-04-29T00:00:00Z",
        "producer": {
            "tool_name": "test.run.gtest",
            "runner_family": "cli",
            "execution_mode": "simulated",
        },
        "result": {
            "status": "blocked",
            "summary": "Blocked by policy.",
            "warning_count": 0,
            "error_count": 1,
        },
        "provenance": {
            "source_kind": "local-run",
            "artifact_refs": ["artifacts/reports/gtest.json"],
        },
        "payload": {
            "tests": [
                {"name": "Suite.TestA", "status": "blocked"},
            ]
        },
        "integrity": {
            "payload_sha256": "a" * 64,
            "payload_size_bytes": 0,
        },
    }
    plan = build_validation_report_intake_dry_run_plan(envelope)
    envelope["integrity"]["payload_size_bytes"] = plan["payload_size_bytes"]
    return envelope


def test_validation_report_intake_dry_run_plan_accepts_valid_envelope() -> None:
    envelope = _valid_envelope()

    plan = build_validation_report_intake_dry_run_plan(envelope)

    assert plan["corridor_name"] == VALIDATION_REPORT_INTAKE_CAPABILITY
    assert plan["dry_run_only"] is True
    assert plan["execution_admitted"] is False
    assert plan["write_executed"] is False
    assert plan["project_write_admitted"] is False
    assert plan["accepted"] is True
    assert plan["fail_closed_reasons"] == []
    assert plan["normalized_artifact_refs"] == ["artifacts/reports/gtest.json"]


def test_validation_report_intake_dry_run_plan_fails_closed_for_missing_fields() -> None:
    plan = build_validation_report_intake_dry_run_plan({"schema": VALIDATION_REPORT_INTAKE_SCHEMA})

    assert plan["accepted"] is False
    assert "missing_required_fields" in plan["fail_closed_reasons"]


def test_validation_report_intake_dry_run_plan_fails_closed_for_schema_and_capability_mismatch() -> None:
    envelope = _valid_envelope()
    envelope["schema"] = "validation.report.intake.v999"
    envelope["capability_name"] = "validation.report.ingest"

    plan = build_validation_report_intake_dry_run_plan(envelope)

    assert plan["accepted"] is False
    assert "schema_mismatch" in plan["fail_closed_reasons"]
    assert "capability_mismatch" in plan["fail_closed_reasons"]


def test_validation_report_intake_dry_run_plan_fails_closed_for_timestamp_and_integrity_errors() -> None:
    envelope = _valid_envelope()
    envelope["produced_at_utc"] = "not-a-timestamp"
    envelope["integrity"]["payload_sha256"] = "short"
    envelope["integrity"]["payload_size_bytes"] = -1

    plan = build_validation_report_intake_dry_run_plan(envelope)

    assert plan["accepted"] is False
    assert "produced_at_utc_invalid" in plan["fail_closed_reasons"]
    assert "integrity_hash_invalid" in plan["fail_closed_reasons"]
    assert "integrity_size_invalid" in plan["fail_closed_reasons"]


def test_validation_report_intake_dry_run_plan_fails_closed_for_path_traversal_refs() -> None:
    envelope = _valid_envelope()
    envelope["provenance"]["artifact_refs"] = ["../outside/report.json"]

    plan = build_validation_report_intake_dry_run_plan(envelope)

    assert plan["accepted"] is False
    assert "artifact_refs_invalid" in plan["fail_closed_reasons"]


def test_validation_report_intake_dry_run_plan_fails_closed_for_client_auth_fields() -> None:
    envelope = _valid_envelope()
    envelope["payload"]["approval_state"] = "approved"

    plan = build_validation_report_intake_dry_run_plan(envelope)

    assert plan["accepted"] is False
    assert "client_authorization_fields_forbidden" in plan["fail_closed_reasons"]


def test_validation_report_intake_dry_run_plan_fails_closed_for_oversized_payload() -> None:
    envelope = _valid_envelope()

    plan = build_validation_report_intake_dry_run_plan(envelope, max_payload_bytes=32)

    assert plan["accepted"] is False
    assert "payload_size_over_cap" in plan["fail_closed_reasons"]


def test_validation_report_intake_endpoint_gate_defaults_to_missing_default_off(
) -> None:
    gate = get_validation_report_intake_endpoint_gate()

    assert gate["admission_flag_name"] == VALIDATION_REPORT_INTAKE_ENDPOINT_ADMISSION_FLAG_ENV
    assert gate["admission_flag_state"] in {
        "missing_default_off",
        "explicit_on",
        "explicit_off",
        "invalid_default_off",
    }
    assert isinstance(gate["admission_flag_enabled"], bool)


def test_validation_report_intake_endpoint_review_marks_blocked_gate_states() -> None:
    blocked_gate_states = {
        "missing_default_off": "endpoint_admission_flag_disabled_or_missing",
        "explicit_off": "endpoint_admission_flag_disabled_or_missing",
        "invalid_default_off": "endpoint_admission_flag_invalid_state",
    }

    for state, expected_reason in blocked_gate_states.items():
        review = build_validation_report_intake_endpoint_review(
            gate={
                "admission_flag_name": VALIDATION_REPORT_INTAKE_ENDPOINT_ADMISSION_FLAG_ENV,
                "admission_flag_state": state,
                "admission_flag_enabled": False,
            }
        )
        assert review["review_status"] == "blocked_by_server_gate"
        assert expected_reason in review["fail_closed_reasons"]


def test_validation_report_intake_endpoint_review_marks_accepted_dry_run_candidate() -> None:
    review = build_validation_report_intake_endpoint_review(
        gate={
            "admission_flag_name": VALIDATION_REPORT_INTAKE_ENDPOINT_ADMISSION_FLAG_ENV,
            "admission_flag_state": "explicit_on",
            "admission_flag_enabled": True,
        },
        accepted=True,
        fail_closed_reasons=[],
    )

    assert review["review_status"] == "dry_run_candidate_ready_for_operator_review"
    assert "dry-run-only" in review["review_summary"]


def test_validation_report_intake_endpoint_review_marks_fail_closed_candidate() -> None:
    review = build_validation_report_intake_endpoint_review(
        gate={
            "admission_flag_name": VALIDATION_REPORT_INTAKE_ENDPOINT_ADMISSION_FLAG_ENV,
            "admission_flag_state": "explicit_on",
            "admission_flag_enabled": True,
        },
        accepted=False,
        fail_closed_reasons=["client_authorization_fields_forbidden"],
    )

    assert review["review_status"] == "dry_run_candidate_fail_closed"
    assert "fail-closed" in review["review_summary"]
