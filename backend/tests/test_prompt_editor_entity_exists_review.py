from __future__ import annotations

import json
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from unittest.mock import patch

from app.main import app
from app.services.db import configure_database, initialize_database, reset_database
from app.services.prompt_orchestrator import prompt_orchestrator_service
from fastapi.testclient import TestClient


@contextmanager
def isolated_client() -> TestClient:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        db_path = Path(temp_dir) / "control-plane.sqlite3"
        configure_database(db_path)
        initialize_database()
        reset_database()
        try:
            with TestClient(app) as client:
                yield client
        finally:
            configure_database(None)


def _entity_exists_runtime_result(
    *,
    entity_name: str,
    exists: bool,
) -> dict[str, Any]:
    runtime_result: dict[str, Any] = {
        "ok": True,
        "exists": exists,
        "lookup_mode": "entity_name",
        "requested_entity_name": entity_name,
        "matched_count": 1 if exists else 0,
        "matched_entity_ids": ["[123]"] if exists else [],
        "level_path": "Levels/Main.level",
        "loaded_level_path": "Levels/Main.level",
        "exact_editor_apis": [
            "ControlPlaneEditorBridge filesystem inbox",
            "editor.entity.exists",
        ],
        "bridge_available": True,
        "bridge_name": "ControlPlaneEditorBridge",
        "bridge_version": "0.1.0",
        "bridge_operation": "editor.entity.exists",
        "bridge_contract_version": "v1",
        "bridge_command_id": "bridge-entity-exists-1",
        "bridge_result_summary": (
            "The requested exact entity name exists."
            if exists
            else "The requested exact entity name was not found."
        ),
        "bridge_heartbeat_seen_at": "2026-04-20T00:00:02Z",
        "bridge_queue_mode": "filesystem-inbox",
        "editor_transport": "bridge",
    }
    if exists:
        runtime_result["entity_name"] = entity_name
        runtime_result["entity_id"] = "[123]"
    return runtime_result


def _execute_entity_exists_review(
    *,
    prompt_id: str,
    entity_name: str,
    exists_runtime_result: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, object]], list[dict[str, object]]]:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir)
        (project_root / "project.json").write_text(
            json.dumps(
                {
                    "project_name": "PromptEditorProject",
                    "version": "1.0.0",
                    "gem_names": ["PythonEditorBindings"],
                }
            ),
            encoding="utf-8",
        )
        captured_level_args: list[dict[str, object]] = []
        captured_exists_args: list[dict[str, object]] = []

        def fake_level_open(*, args, **kwargs):  # type: ignore[no-untyped-def]
            captured_level_args.append(args)
            return {
                "runtime_result": {
                    "loaded_level_path": "Levels/Main.level",
                    "level_path": "Levels/Main.level",
                    "created_level": False,
                    "exact_editor_apis": [
                        "ControlPlaneEditorBridge filesystem inbox",
                        "editor.level.open",
                    ],
                    "bridge_available": True,
                    "bridge_name": "ControlPlaneEditorBridge",
                    "bridge_version": "0.1.0",
                    "bridge_operation": "editor.level.open",
                    "bridge_contract_version": "v1",
                    "bridge_command_id": "bridge-level-readonly-1",
                    "bridge_result_summary": "editor.level.open completed.",
                    "bridge_heartbeat_seen_at": "2026-04-20T00:00:01Z",
                    "bridge_queue_mode": "filesystem-inbox",
                    "editor_transport": "bridge",
                },
                "runner_command": ["fake-editor-runner"],
                "runtime_script": "control_plane_bridge_poller.py",
            }

        def fake_entity_exists(*, args, **kwargs):  # type: ignore[no-untyped-def]
            captured_exists_args.append(args)
            return {
                "runtime_result": exists_runtime_result,
                "runner_command": ["fake-editor-runner"],
                "runtime_script": "control_plane_bridge_poller.py",
            }

        with patch.dict(
            "os.environ",
            {
                "O3DE_ADAPTER_MODE": "hybrid",
            },
            clear=False,
        ):
            with patch(
                "app.services.adapters.editor_automation_runtime_service.execute_session_open",
                return_value={
                    "runtime_result": {
                        "editor_session_id": "editor-session-runtime",
                        "loaded_level_path": "Levels/Main.level",
                        "exact_editor_apis": [
                            "ControlPlaneEditorBridge filesystem inbox",
                            "editor.session.open",
                        ],
                        "bridge_available": True,
                        "bridge_name": "ControlPlaneEditorBridge",
                        "bridge_version": "0.1.0",
                        "bridge_operation": "editor.session.open",
                        "bridge_contract_version": "v1",
                        "bridge_command_id": "bridge-session-readonly-1",
                        "bridge_result_summary": "editor.session.open completed.",
                        "bridge_heartbeat_seen_at": "2026-04-20T00:00:00Z",
                        "bridge_queue_mode": "filesystem-inbox",
                        "editor_transport": "bridge",
                    },
                    "runner_command": ["fake-editor-runner"],
                    "runtime_script": "control_plane_bridge_bootstrap.py",
                },
            ):
                with patch(
                    "app.services.adapters.editor_automation_runtime_service.execute_level_open",
                    side_effect=fake_level_open,
                ):
                    with patch(
                        "app.services.adapters.editor_automation_runtime_service.execute_entity_exists",
                        side_effect=fake_entity_exists,
                    ):
                        with isolated_client() as client:
                            create_response = client.post(
                                "/prompt/sessions",
                                json={
                                    "prompt_id": prompt_id,
                                    "prompt_text": (
                                        'Open level "Levels/Main.level" and verify '
                                        f'entity "{entity_name}" exists.'
                                    ),
                                    "project_root": str(project_root),
                                    "engine_root": "C:/engine",
                                    "dry_run": False,
                                    "preferred_domains": ["editor-control"],
                                },
                            )
                            assert create_response.status_code == 200

                            completed_payload: dict[str, Any] | None = None
                            for _ in range(5):
                                execute_response = client.post(
                                    f"/prompt/sessions/{prompt_id}/execute"
                                )
                                assert execute_response.status_code == 200
                                payload = execute_response.json()
                                if payload["status"] == "waiting_approval":
                                    approve_response = client.post(
                                        f"/approvals/{payload['pending_approval_id']}/approve",
                                        json={},
                                    )
                                    assert approve_response.status_code == 200
                                    continue
                                completed_payload = payload
                                break

        assert completed_payload is not None
        return completed_payload, captured_level_args, captured_exists_args


def test_prompt_session_plans_editor_entity_exists_as_read_only_review() -> None:
    with isolated_client() as client:
        response = client.post(
            "/prompt/sessions",
            json={
                "prompt_id": "prompt-editor-entity-exists-plan-1",
                "prompt_text": (
                    'Open level "Levels/Main.level" and verify entity "Ground" exists.'
                ),
                "project_root": "C:/project",
                "engine_root": "C:/engine",
                "dry_run": False,
                "preferred_domains": ["editor-control"],
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "planned"
        assert [step["tool"] for step in payload["plan"]["steps"]] == [
            "editor.session.open",
            "editor.level.open",
            "editor.entity.exists",
        ]
        assert payload["plan"]["steps"][1]["args"] == {
            "level_path": "Levels/Main.level",
            "make_writable": False,
            "focus_viewport": False,
        }
        assert payload["plan"]["steps"][2]["step_id"] == "editor-entity-exists-1"
        assert payload["plan"]["steps"][2]["args"] == {
            "entity_name": "Ground",
            "level_path": "Levels/Main.level",
        }
        assert payload["plan"]["steps"][2]["approval_class"] == "read_only"
        assert payload["plan"]["steps"][2]["depends_on"] == [
            "editor-session-1",
            "editor-level-1",
        ]
        assert payload["refused_capabilities"] == []


def test_prompt_session_reviews_editor_entity_exists_readback_without_writes() -> None:
    completed_payload, captured_level_args, captured_exists_args = (
        _execute_entity_exists_review(
            prompt_id="prompt-editor-entity-exists-execute-1",
            entity_name="Ground",
            exists_runtime_result=_entity_exists_runtime_result(
                entity_name="Ground",
                exists=True,
            ),
        )
    )

    assert captured_level_args == [
        {
            "level_path": "Levels/Main.level",
            "make_writable": False,
            "focus_viewport": False,
        }
    ]
    assert captured_exists_args == [
        {
            "entity_name": "Ground",
            "level_path": "Levels/Main.level",
        }
    ]
    assert completed_payload["status"] == "completed"
    assert "Review result: succeeded_readback_verified" in (
        completed_payload["final_result_summary"]
    )
    assert (
        "Checked entity existence by entity_name lookup for Ground."
        in completed_payload["final_result_summary"]
    )
    assert (
        "Readback confirmed Ground ([123]) exists in Levels/Main.level "
        "via entity_name lookup with matched_count=1."
        in completed_payload["final_result_summary"]
    )
    assert "No cleanup or restore was executed or needed by this read-only proof." in (
        completed_payload["final_result_summary"]
    )
    assert "This review does not claim entity creation" in (
        completed_payload["final_result_summary"]
    )
    assert "entity absence after restore" in completed_payload["final_result_summary"]
    assert "Created entity" not in completed_payload["final_result_summary"]


def test_prompt_session_reviews_editor_entity_absence_without_restore_claim() -> None:
    completed_payload, captured_level_args, captured_exists_args = (
        _execute_entity_exists_review(
            prompt_id="prompt-editor-entity-absence-execute-1",
            entity_name="MissingGround",
            exists_runtime_result=_entity_exists_runtime_result(
                entity_name="MissingGround",
                exists=False,
            ),
        )
    )

    assert captured_level_args == [
        {
            "level_path": "Levels/Main.level",
            "make_writable": False,
            "focus_viewport": False,
        }
    ]
    assert captured_exists_args == [
        {
            "entity_name": "MissingGround",
            "level_path": "Levels/Main.level",
        }
    ]
    assert completed_payload["status"] == "completed"
    assert "Review result: succeeded_absence_verified" in (
        completed_payload["final_result_summary"]
    )
    assert (
        "Checked entity existence by entity_name lookup for MissingGround."
        in completed_payload["final_result_summary"]
    )
    assert (
        "Readback confirmed MissingGround was not found in Levels/Main.level "
        "on the admitted exact lookup path."
        in completed_payload["final_result_summary"]
    )
    assert "No cleanup or restore was executed or needed by this read-only proof." in (
        completed_payload["final_result_summary"]
    )
    assert "entity absence after restore" in completed_payload["final_result_summary"]
    assert "Created entity" not in completed_payload["final_result_summary"]


def test_editor_entity_exists_review_blocks_ambiguous_lookup_without_scene_discovery() -> None:
    failed_response = {
        "prompt_step_id": "editor-entity-exists-1",
        "error": {
            "code": "REAL_EXECUTION_REJECTED",
            "message": "Exact entity-name lookup matched multiple entities.",
            "details": {
                "preflight_reason": "ambiguous-entity-lookup",
            },
        },
    }

    result_label = prompt_orchestrator_service._classify_editor_entity_exists_review(
        failed_response=failed_response,
        exists_response=None,
    )
    missing_proof = prompt_orchestrator_service._editor_entity_exists_missing_proof(
        result_label=result_label,
        failed_response=failed_response,
        exists_response=None,
    )
    safest_next_step = prompt_orchestrator_service._editor_entity_exists_safest_next_step(
        result_label=result_label,
    )

    assert result_label == "blocked_ambiguous_entity_lookup"
    assert (
        "The exact-name lookup was ambiguous and no arbitrary entity selection was made."
        in missing_proof
    )
    assert any("does not claim entity creation" in item for item in missing_proof)
    assert "scene discovery" in safest_next_step
