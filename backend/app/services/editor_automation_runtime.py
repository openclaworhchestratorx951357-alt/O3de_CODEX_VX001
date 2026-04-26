from __future__ import annotations

import hashlib
import json
import os
import re
import shlex
import shutil
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path, PureWindowsPath
from typing import Any
from uuid import uuid4

from app.services.editor_runtime_defaults import EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S

EDITOR_RUNTIME_BOUNDARY = (
    "Real editor automation through typed Python Editor Bindings contracts, "
    "preferring the persistent ControlPlaneEditorBridge filesystem inbox transport "
    "when healthy and using narrow runtime-owned one-shot scripts only on the "
    "remaining explicitly scoped editor paths."
)
BRIDGE_NAME = "ControlPlaneEditorBridge"
BRIDGE_PROTOCOL_VERSION = "v1"
BRIDGE_CONTRACT_VERSION = "v0.1"
BRIDGE_QUEUE_MODE = "filesystem-inbox"
BRIDGE_HEARTBEAT_MAX_AGE_S = 15.0
BRIDGE_HEARTBEAT_PULSE_WAIT_S = 1.0
BRIDGE_HEARTBEAT_RECOVERY_WAIT_S = 3.0
BRIDGE_LAUNCH_LOG_TAIL_LINES = 40
BRIDGE_DEADLETTER_DIAGNOSTIC_LIMIT = 5
RUNTIME_HOST_IS_WINDOWS = os.name == "nt"
EDITOR_MUTATION_RESTORE_SCOPE = "loaded-level-file"
EDITOR_MUTATION_RESTORE_STRATEGY = (
    "restore-loaded-level-file-from-pre-mutation-backup"
)
BRIDGE_PROVENANCE_KEYS = (
    "editor_transport",
    "bridge_name",
    "bridge_version",
    "bridge_available",
    "bridge_operation",
    "bridge_contract_version",
    "bridge_command_id",
    "bridge_result_summary",
    "bridge_error_code",
    "bridge_heartbeat_seen_at",
    "bridge_queue_mode",
    "bridge_selected_entity_count",
    "bridge_prefab_context_notes",
    "editor_log_path",
)


def _coerce_positive_timeout_s(value: Any, *, default: int) -> int:
    try:
        timeout_s = int(value)
    except (TypeError, ValueError):
        return default
    return timeout_s if timeout_s > 0 else default


def _normalize_engine_root_path(engine_root: str) -> str:
    candidate = engine_root.strip()
    windows_path = PureWindowsPath(candidate)
    if not RUNTIME_HOST_IS_WINDOWS and windows_path.is_absolute():
        return str(windows_path).replace("\\", "/")
    return str(Path(candidate).expanduser().resolve())


def _project_relative_level_identity(project_root: str, level_path: str) -> str | None:
    candidate = level_path.strip()
    if not candidate:
        return None

    windows_candidate = PureWindowsPath(candidate)
    windows_project_root = PureWindowsPath(project_root)
    if windows_candidate.is_absolute() or windows_project_root.is_absolute():
        project_root_key = (
            str(windows_project_root).replace("\\", "/").rstrip("/").casefold()
        )
        candidate_key = str(windows_candidate).replace("\\", "/").casefold()
        if candidate_key == project_root_key:
            return "."
        project_prefix = f"{project_root_key}/"
        if candidate_key.startswith(project_prefix):
            return candidate_key[len(project_prefix) :]
        if not windows_candidate.is_absolute():
            return candidate_key
        return candidate_key

    project_path = Path(project_root).expanduser().resolve()
    candidate_path = Path(candidate).expanduser()
    resolved_candidate = (
        candidate_path.resolve()
        if candidate_path.is_absolute()
        else (project_path / candidate).resolve()
    )
    project_key = os.path.normcase(str(project_path)).replace("\\", "/").rstrip("/")
    candidate_key = os.path.normcase(str(resolved_candidate)).replace("\\", "/")
    if candidate_key == project_key:
        return "."
    project_prefix = f"{project_key}/"
    if candidate_key.startswith(project_prefix):
        return candidate_key[len(project_prefix) :]
    return candidate_key


def _level_paths_match(
    project_root: str,
    *,
    loaded_level_path: str,
    requested_level_path: str,
) -> bool:
    loaded_identity = _project_relative_level_identity(project_root, loaded_level_path)
    requested_identity = _project_relative_level_identity(project_root, requested_level_path)
    return loaded_identity is not None and loaded_identity == requested_identity


EDITOR_COMPONENT_ADD_ALLOWLIST = ("Camera", "Comment", "Mesh")
EDITOR_COMPONENT_ADD_ALLOWLIST_LOOKUP = {
    component_name.casefold(): component_name
    for component_name in EDITOR_COMPONENT_ADD_ALLOWLIST
}
BRACKETED_COMPONENT_PAIR_PATTERN = re.compile(
    r"^\[\s*\[\s*(?P<entity>\d+)\s*\]\s*-\s*(?P<component>\d+)\s*\]$"
)
CANONICAL_COMPONENT_ID_PATTERN = re.compile(
    r"^EntityComponentIdPair\s*\(\s*EntityId\s*\(\s*\d+\s*\)\s*,\s*\d+\s*\)$"
)
COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT = (
    "admitted_runtime_component_add_result"
)
COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT = (
    "admitted_runtime_component_discovery_result"
)


def _canonicalize_component_add_components(
    components: Any,
) -> tuple[list[str], list[str], list[str]]:
    if not isinstance(components, list):
        return [], [], []

    canonical_components: list[str] = []
    unsupported_components: list[str] = []
    duplicate_components: list[str] = []
    seen_components: set[str] = set()

    for component_value in components:
        if not isinstance(component_value, str):
            unsupported_components.append(str(component_value))
            continue

        normalized_component = component_value.strip()
        if not normalized_component:
            unsupported_components.append(normalized_component)
            continue

        canonical_component = EDITOR_COMPONENT_ADD_ALLOWLIST_LOOKUP.get(
            normalized_component.casefold()
        )
        if canonical_component is None:
            unsupported_components.append(normalized_component)
            continue

        if canonical_component in seen_components:
            duplicate_components.append(canonical_component)
            continue

        seen_components.add(canonical_component)
        canonical_components.append(canonical_component)

    return canonical_components, unsupported_components, duplicate_components


def _normalize_editor_entity_id(value: Any) -> str | None:
    if isinstance(value, int):
        return str(value)
    if not isinstance(value, str):
        return None

    candidate = value.strip()
    if candidate.startswith("EntityId(") and candidate.endswith(")"):
        candidate = candidate[len("EntityId(") : -1].strip()
    if candidate.startswith("[") and candidate.endswith("]"):
        candidate = candidate[1:-1].strip()
    if not candidate or not candidate.isdigit():
        return None
    return candidate


def _component_id_from_component_ref(component_ref: dict[str, Any]) -> str | None:
    existing_component_id = component_ref.get("component_id")
    if isinstance(existing_component_id, str) and existing_component_id.strip():
        candidate = existing_component_id.strip()
        if CANONICAL_COMPONENT_ID_PATTERN.match(candidate):
            return candidate

    component_pair_text = component_ref.get("component_pair_text")
    if not isinstance(component_pair_text, str):
        return None
    match = BRACKETED_COMPONENT_PAIR_PATTERN.match(component_pair_text.strip())
    if match is None:
        return None

    entity_id = _normalize_editor_entity_id(component_ref.get("entity_id"))
    if entity_id is None:
        entity_id = match.group("entity")
    return f"EntityComponentIdPair(EntityId({entity_id}), {match.group('component')})"


def _normalize_added_component_refs(refs: Any) -> list[dict[str, Any]]:
    if not isinstance(refs, list):
        return []

    normalized_refs: list[dict[str, Any]] = []
    for ref in refs:
        if not isinstance(ref, dict):
            continue
        normalized_ref = dict(ref)
        component_id = _component_id_from_component_ref(normalized_ref)
        if component_id is not None:
            normalized_ref["component_id"] = component_id
            normalized_ref["component_id_provenance"] = (
                COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_ADD_RESULT
            )
        normalized_refs.append(normalized_ref)
    return normalized_refs


def _normalize_discovered_component_refs(refs: Any) -> list[dict[str, Any]]:
    if not isinstance(refs, list):
        return []

    normalized_refs: list[dict[str, Any]] = []
    for ref in refs:
        if not isinstance(ref, dict):
            continue
        normalized_ref = dict(ref)
        component_id = _component_id_from_component_ref(normalized_ref)
        if component_id is not None:
            normalized_ref["component_id"] = component_id
            normalized_ref["component_id_provenance"] = (
                COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT
            )
        normalized_refs.append(normalized_ref)
    return normalized_refs


class EditorAutomationRuntimeService:
    def __init__(self) -> None:
        runtime_root = Path(__file__).resolve().parents[2] / "runtime"
        self._scripts_dir = runtime_root / "editor_scripts"
        self._payloads_dir = runtime_root / "editor_payloads"
        self._results_dir = runtime_root / "editor_results"
        self._state_dir = runtime_root / "editor_state"
        self._restore_boundaries_dir = self._state_dir / "restore_boundaries"
        self._bridge_poll_interval_s = 0.25

    def execute_session_open(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        locks_acquired: list[str],
    ) -> dict[str, Any]:
        manifest = self._load_project_manifest(project_root)
        self._ensure_python_editor_bindings_enabled(manifest, project_root=project_root)
        normalized_engine_root = _normalize_engine_root_path(engine_root)
        session_timeout_s = _coerce_positive_timeout_s(
            args.get("timeout_s"),
            default=EDITOR_SESSION_OPEN_DEFAULT_TIMEOUT_S,
        )
        if dry_run:
            self._reject_preflight(
                tool="editor.session.open",
                project_root=project_root,
                reason="editor-session-dry-run-not-admitted",
                message="editor.session.open currently requires dry_run=false on the admitted real path.",
                extra_details={"python_editor_bindings_enabled": True},
            )
        runner_command = self._resolve_bridge_runner()
        project_path_arg = args.get("project_path")
        if isinstance(project_path_arg, str) and project_path_arg.strip():
            normalized_project_path_arg = str(Path(project_path_arg).expanduser().resolve())
            normalized_project_root = str(Path(project_root).expanduser().resolve())
            if normalized_project_path_arg != normalized_project_root:
                self._reject_preflight(
                    tool="editor.session.open",
                    project_root=project_root,
                    reason="project-path-mismatch",
                    message="editor.session.open project_path must match the request project_root on the admitted real path.",
                    extra_details={
                        "python_editor_bindings_enabled": True,
                        "expected_project_path": normalized_project_root,
                        "provided_project_path": normalized_project_path_arg,
                    },
                )
        if not self._bridge_host_available(project_root, runner_command=runner_command):
            self._launch_bridge_host(
                project_root=project_root,
                engine_root=normalized_engine_root,
                runner_command=runner_command,
                timeout_s=session_timeout_s,
            )
        bridge_response = self._invoke_bridge_command(
            tool="editor.session.open",
            operation="editor.session.open",
            project_root=project_root,
            engine_root=normalized_engine_root,
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            args={
                "session_mode": args.get("session_mode", "attach"),
                "project_path": project_root,
                "level_path": args.get("level_path"),
                "timeout_s": session_timeout_s,
            },
            timeout_s=session_timeout_s,
        )
        bridge_details = self._bridge_response_details(bridge_response)
        runtime_result = {
            "ok": True,
            "message": "Editor session is available through the persistent bridge-backed admitted automation path.",
            "editor_session_id": "editor-session-bridge",
            "loaded_level_path": bridge_details.get("active_level_path"),
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.session.open",
            ],
            "editor_transport": "bridge",
            **self._bridge_result_metadata(bridge_response),
        }
        loaded_level_path = runtime_result.get("loaded_level_path")
        state = self._load_editor_state(project_root)
        state.update(
            {
                "session_active": True,
                "loaded_level_path": loaded_level_path if isinstance(loaded_level_path, str) else None,
                "editor_session_id": runtime_result.get("editor_session_id"),
                "editor_transport": "bridge",
                "bridge_heartbeat_seen_at": runtime_result.get("bridge_heartbeat_seen_at"),
            }
        )
        self._save_editor_state(project_root, state)
        return {
            "runtime_result": runtime_result,
            "runner_command": runner_command,
            "manifest": manifest,
            "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_bootstrap.py",
        }

    def execute_level_open(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        locks_acquired: list[str],
    ) -> dict[str, Any]:
        manifest = self._load_project_manifest(project_root)
        self._ensure_python_editor_bindings_enabled(manifest, project_root=project_root)
        normalized_engine_root = _normalize_engine_root_path(engine_root)
        if dry_run:
            self._reject_preflight(
                tool="editor.level.open",
                project_root=project_root,
                reason="editor-level-dry-run-not-admitted",
                message="editor.level.open currently requires dry_run=false on the admitted real path.",
                extra_details={"python_editor_bindings_enabled": True},
            )
        runner_command = self._resolve_bridge_runner()
        state = self._load_editor_state(project_root)
        if not state.get("session_active"):
            self._reject_preflight(
                tool="editor.level.open",
                project_root=project_root,
                reason="editor-session-not-ensured",
                message="editor.level.open requires an admitted editor session before level automation can proceed.",
                extra_details={"python_editor_bindings_enabled": True},
            )
        if not self._bridge_host_available(project_root, runner_command=runner_command):
            self._reject_preflight(
                tool="editor.level.open",
                project_root=project_root,
                reason="bridge-not-running",
                message="editor.level.open requires an active ControlPlaneEditorBridge session; run editor.session.open first.",
                extra_details={"python_editor_bindings_enabled": True},
            )

        level_path = args.get("level_path")
        if not isinstance(level_path, str) or not level_path.strip():
            self._reject_preflight(
                tool="editor.level.open",
                project_root=project_root,
                reason="level-path-missing",
                message="editor.level.open requires an explicit level_path on the admitted real path.",
                extra_details={"python_editor_bindings_enabled": True},
            )

        bridge_response = self._invoke_bridge_command(
            tool="editor.level.open",
            operation="editor.level.open",
            project_root=project_root,
            engine_root=normalized_engine_root,
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            args={
                "level_path": level_path,
                "make_writable": bool(args.get("make_writable", False)),
                "focus_viewport": bool(args.get("focus_viewport", False)),
            },
            timeout_s=90,
        )
        bridge_details = self._bridge_response_details(bridge_response)
        created_level = bridge_details.get("ensure_result") == "created"
        runtime_result = {
            "ok": True,
            "message": "Level is loaded for admitted editor automation through the persistent bridge-backed path.",
            "level_path": bridge_details.get("level_path", level_path),
            "loaded_level_path": bridge_details.get("level_path", level_path),
            "created_level": created_level,
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.level.open",
            ],
            "editor_transport": "bridge",
            **self._bridge_result_metadata(bridge_response),
        }
        state["loaded_level_path"] = runtime_result.get("loaded_level_path", level_path)
        state["editor_transport"] = "bridge"
        state["bridge_heartbeat_seen_at"] = runtime_result.get("bridge_heartbeat_seen_at")
        self._save_editor_state(project_root, state)
        return {
            "runtime_result": runtime_result,
            "runner_command": runner_command,
            "manifest": manifest,
            "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
        }

    def execute_entity_create(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        locks_acquired: list[str],
    ) -> dict[str, Any]:
        manifest = self._load_project_manifest(project_root)
        self._ensure_python_editor_bindings_enabled(manifest, project_root=project_root)
        normalized_engine_root = _normalize_engine_root_path(engine_root)
        if dry_run:
            self._reject_preflight(
                tool="editor.entity.create",
                project_root=project_root,
                reason="editor-entity-dry-run-not-admitted",
                message="editor.entity.create currently requires dry_run=false on the admitted real path.",
                extra_details={"python_editor_bindings_enabled": True},
            )
        runner_command = self._resolve_bridge_runner()
        state = self._load_editor_state(project_root)
        if not state.get("session_active"):
            self._reject_preflight(
                tool="editor.entity.create",
                project_root=project_root,
                reason="editor-session-not-ensured",
                message="editor.entity.create requires an admitted editor session before entity mutation can proceed.",
                extra_details={"python_editor_bindings_enabled": True},
            )
        loaded_level_path = state.get("loaded_level_path")
        requested_level_path = args.get("level_path")
        if not isinstance(loaded_level_path, str) or not loaded_level_path:
            self._reject_preflight(
                tool="editor.entity.create",
                project_root=project_root,
                reason="level-not-loaded",
                message="editor.entity.create requires a loaded level before entity APIs can be used.",
                extra_details={"python_editor_bindings_enabled": True},
            )
        if (
            isinstance(requested_level_path, str)
            and requested_level_path
            and not _level_paths_match(
                project_root,
                loaded_level_path=loaded_level_path,
                requested_level_path=requested_level_path,
            )
        ):
            self._reject_preflight(
                tool="editor.entity.create",
                project_root=project_root,
                reason="loaded-level-mismatch",
                message="editor.entity.create level_path must match the currently loaded level on the admitted real path.",
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "requested_level_path": requested_level_path,
                },
            )
        unsupported_fields = [
            field_name
            for field_name in ("parent_entity_id", "prefab_asset", "position")
            if args.get(field_name) is not None
        ]
        if unsupported_fields:
            self._reject_preflight(
                tool="editor.entity.create",
                project_root=project_root,
                reason="unsupported-entity-mutation-surface",
                message="editor.entity.create currently admits only root-level named entity creation without prefab, parent, or transform mutation.",
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "unsupported_fields": unsupported_fields,
                    "loaded_level_path": loaded_level_path,
                },
            )
        if not self._bridge_host_available(project_root, runner_command=runner_command):
            self._reject_preflight(
                tool="editor.entity.create",
                project_root=project_root,
                reason="bridge-not-running",
                message="editor.entity.create requires an active ControlPlaneEditorBridge session; run editor.session.open first.",
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                },
            )

        entity_name = args.get("entity_name")
        if not isinstance(entity_name, str) or not entity_name.strip():
            self._reject_preflight(
                tool="editor.entity.create",
                project_root=project_root,
                reason="entity-name-missing",
                message="editor.entity.create requires a non-empty entity_name on the admitted real path.",
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                },
            )

        restore_boundary = self._create_editor_restore_boundary(
            project_root=project_root,
            state=state,
            tool="editor.entity.create",
            loaded_level_path=loaded_level_path,
            mutation_target={
                "entity_name": entity_name,
            },
        )
        try:
            bridge_response = self._invoke_bridge_command(
                tool="editor.entity.create",
                operation="editor.entity.create",
                project_root=project_root,
                engine_root=normalized_engine_root,
                request_id=request_id,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                args={
                    "entity_name": entity_name,
                    "level_path": loaded_level_path,
                },
                timeout_s=90,
            )
        except Exception as exc:
            self._attach_restore_outcome_to_exception(
                exc,
                project_root=project_root,
                state=state,
                restore_boundary=restore_boundary,
                trigger="editor-entity-create-bridge-failure",
            )
            raise
        bridge_details = self._bridge_response_details(bridge_response)
        created_entity_id = bridge_details.get(
            "resolved_entity_id",
            bridge_details.get("entity_id"),
        )
        created_entity_name = bridge_details.get("entity_name", entity_name)
        created_level_path = bridge_details.get("level_path", loaded_level_path)
        modified_entities = (
            [str(created_entity_id)] if created_entity_id is not None else []
        )
        runtime_result = {
            "ok": True,
            "message": "Entity was created through the persistent bridge-backed admitted editor authoring path.",
            "entity_id": created_entity_id,
            "entity_name": created_entity_name,
            "modified_entities": modified_entities,
            "level_path": created_level_path,
            "loaded_level_path": created_level_path,
            "entity_id_source": bridge_details.get("entity_id_source"),
            "direct_return_entity_id": bridge_details.get("direct_return_entity_id"),
            "notification_entity_ids": bridge_details.get("notification_entity_ids", []),
            "selected_entity_count_before_create": bridge_details.get(
                "selected_entity_count_before_create",
                bridge_details.get("selected_entity_count"),
            ),
            "name_mutation_ran": bridge_details.get("name_mutation_ran"),
            "name_mutation_succeeded": bridge_details.get("name_mutation_succeeded"),
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.entity.create",
            ],
            "editor_transport": "bridge",
            **self._restore_boundary_runtime_metadata(restore_boundary),
            **self._bridge_result_metadata(bridge_response),
        }
        state["last_created_entity_id"] = runtime_result.get("entity_id")
        state["last_created_entity_name"] = runtime_result.get("entity_name")
        state["editor_transport"] = "bridge"
        state["bridge_heartbeat_seen_at"] = runtime_result.get("bridge_heartbeat_seen_at")
        self._save_editor_state(project_root, state)
        return {
            "runtime_result": runtime_result,
            "runner_command": runner_command,
            "manifest": manifest,
            "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
        }

    def execute_component_add(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        locks_acquired: list[str],
    ) -> dict[str, Any]:
        manifest = self._load_project_manifest(project_root)
        self._ensure_python_editor_bindings_enabled(manifest, project_root=project_root)
        normalized_engine_root = _normalize_engine_root_path(engine_root)
        if dry_run:
            self._reject_preflight(
                tool="editor.component.add",
                project_root=project_root,
                reason="editor-component-add-dry-run-not-admitted",
                message="editor.component.add currently requires dry_run=false on the admitted real path.",
                extra_details={"python_editor_bindings_enabled": True},
            )
        runner_command = self._resolve_bridge_runner()
        state = self._load_editor_state(project_root)
        if not state.get("session_active"):
            self._reject_preflight(
                tool="editor.component.add",
                project_root=project_root,
                reason="editor-session-not-ensured",
                message="editor.component.add requires an admitted editor session before component mutation can proceed.",
                extra_details={"python_editor_bindings_enabled": True},
            )
        loaded_level_path = state.get("loaded_level_path")
        requested_level_path = args.get("level_path")
        if not isinstance(loaded_level_path, str) or not loaded_level_path:
            self._reject_preflight(
                tool="editor.component.add",
                project_root=project_root,
                reason="level-not-loaded",
                message="editor.component.add requires a loaded level before component APIs can be used.",
                extra_details={"python_editor_bindings_enabled": True},
            )
        if (
            isinstance(requested_level_path, str)
            and requested_level_path
            and not _level_paths_match(
                project_root,
                loaded_level_path=loaded_level_path,
                requested_level_path=requested_level_path,
            )
        ):
            self._reject_preflight(
                tool="editor.component.add",
                project_root=project_root,
                reason="loaded-level-mismatch",
                message="editor.component.add level_path must match the currently loaded level on the admitted real path.",
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "requested_level_path": requested_level_path,
                },
            )
        if not self._bridge_host_available(project_root, runner_command=runner_command):
            self._reject_preflight(
                tool="editor.component.add",
                project_root=project_root,
                reason="bridge-not-running",
                message="editor.component.add requires an active ControlPlaneEditorBridge session; run editor.session.open first.",
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                },
            )

        raw_entity_id = args.get("entity_id")
        normalized_entity_id = _normalize_editor_entity_id(raw_entity_id)
        if normalized_entity_id is None:
            self._reject_preflight(
                tool="editor.component.add",
                project_root=project_root,
                reason="entity-id-invalid",
                message="editor.component.add requires a valid explicit entity_id on the admitted real path.",
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "provided_entity_id": raw_entity_id,
                },
            )

        canonical_components, unsupported_components, duplicate_components = (
            _canonicalize_component_add_components(args.get("components"))
        )
        if not canonical_components and not unsupported_components and not duplicate_components:
            self._reject_preflight(
                tool="editor.component.add",
                project_root=project_root,
                reason="components-missing",
                message="editor.component.add requires at least one allowlisted component name on the admitted real path.",
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "allowlisted_components": list(EDITOR_COMPONENT_ADD_ALLOWLIST),
                },
            )
        if unsupported_components:
            self._reject_preflight(
                tool="editor.component.add",
                project_root=project_root,
                reason="unsupported-component-surface",
                message="editor.component.add currently admits only the explicit allowlisted component set on the real path.",
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "unsupported_components": unsupported_components,
                    "allowlisted_components": list(EDITOR_COMPONENT_ADD_ALLOWLIST),
                },
            )
        if duplicate_components:
            self._reject_preflight(
                tool="editor.component.add",
                project_root=project_root,
                reason="duplicate-component-request",
                message="editor.component.add requires each requested allowlisted component to appear at most once per call.",
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "duplicate_components": duplicate_components,
                    "allowlisted_components": list(EDITOR_COMPONENT_ADD_ALLOWLIST),
                },
            )

        entity_name_hint: str | None = None
        last_created_entity_id = _normalize_editor_entity_id(state.get("last_created_entity_id"))
        last_created_entity_name = state.get("last_created_entity_name")
        if (
            last_created_entity_id == normalized_entity_id
            and isinstance(last_created_entity_name, str)
            and last_created_entity_name
        ):
            entity_name_hint = last_created_entity_name

        bridge_args = {
            "entity_id": normalized_entity_id,
            "components": canonical_components,
            "level_path": loaded_level_path,
        }
        if entity_name_hint is not None:
            bridge_args["entity_name_hint"] = entity_name_hint

        restore_boundary = self._create_editor_restore_boundary(
            project_root=project_root,
            state=state,
            tool="editor.component.add",
            loaded_level_path=loaded_level_path,
            mutation_target={
                "entity_id": normalized_entity_id,
                "components": canonical_components,
            },
        )
        try:
            bridge_response = self._invoke_bridge_command(
                tool="editor.component.add",
                operation="editor.component.add",
                project_root=project_root,
                engine_root=normalized_engine_root,
                request_id=request_id,
                session_id=session_id,
                workspace_id=workspace_id,
                executor_id=executor_id,
                args=bridge_args,
                timeout_s=90,
            )
        except Exception as exc:
            self._attach_restore_outcome_to_exception(
                exc,
                project_root=project_root,
                state=state,
                restore_boundary=restore_boundary,
                trigger="editor-component-add-bridge-failure",
            )
            raise
        bridge_details = self._bridge_response_details(bridge_response)
        added_component_refs = _normalize_added_component_refs(
            bridge_details.get("added_component_refs", [])
        )
        runtime_result = {
            "ok": True,
            "message": "Components were processed through the persistent bridge-backed admitted editor authoring path.",
            "entity_id": bridge_details.get("entity_id", normalized_entity_id),
            "entity_name": bridge_details.get("entity_name"),
            "added_components": bridge_details.get("added_components", canonical_components),
            "added_component_refs": added_component_refs,
            "rejected_components": bridge_details.get("rejected_components", []),
            "modified_entities": bridge_details.get(
                "modified_entities",
                [normalized_entity_id],
            ),
            "level_path": bridge_details.get("level_path", loaded_level_path),
            "loaded_level_path": bridge_details.get(
                "loaded_level_path",
                bridge_details.get("level_path", loaded_level_path),
            ),
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.component.add",
            ],
            "editor_transport": "bridge",
            **self._restore_boundary_runtime_metadata(restore_boundary),
            **self._bridge_result_metadata(bridge_response),
        }
        state["editor_transport"] = "bridge"
        state["bridge_heartbeat_seen_at"] = runtime_result.get("bridge_heartbeat_seen_at")
        self._save_editor_state(project_root, state)
        return {
            "runtime_result": runtime_result,
            "runner_command": runner_command,
            "manifest": manifest,
            "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
        }

    def execute_entity_exists(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        locks_acquired: list[str],
    ) -> dict[str, Any]:
        manifest = self._load_project_manifest(project_root)
        self._ensure_python_editor_bindings_enabled(manifest, project_root=project_root)
        normalized_engine_root = _normalize_engine_root_path(engine_root)
        if dry_run:
            self._reject_preflight(
                tool="editor.entity.exists",
                project_root=project_root,
                reason="editor-entity-exists-dry-run-not-admitted",
                message=(
                    "editor.entity.exists currently requires dry_run=false "
                    "on the admitted real read-only path."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )

        runner_command = self._resolve_bridge_runner()
        state = self._load_editor_state(project_root)
        if not state.get("session_active"):
            self._reject_preflight(
                tool="editor.entity.exists",
                project_root=project_root,
                reason="editor-session-not-ensured",
                message=(
                    "editor.entity.exists requires an admitted editor session "
                    "before entity existence reads can proceed."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )

        loaded_level_path = state.get("loaded_level_path")
        requested_level_path = args.get("level_path")
        if not isinstance(loaded_level_path, str) or not loaded_level_path:
            self._reject_preflight(
                tool="editor.entity.exists",
                project_root=project_root,
                reason="level-not-loaded",
                message=(
                    "editor.entity.exists requires a loaded level before entity "
                    "existence can be read."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )
        if (
            isinstance(requested_level_path, str)
            and requested_level_path
            and not _level_paths_match(
                project_root,
                loaded_level_path=loaded_level_path,
                requested_level_path=requested_level_path,
            )
        ):
            self._reject_preflight(
                tool="editor.entity.exists",
                project_root=project_root,
                reason="loaded-level-mismatch",
                message=(
                    "editor.entity.exists level_path must match the currently "
                    "loaded level on the admitted real path."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "requested_level_path": requested_level_path,
                },
            )

        if not self._bridge_host_available(project_root, runner_command=runner_command):
            self._reject_preflight(
                tool="editor.entity.exists",
                project_root=project_root,
                reason="bridge-not-running",
                message=(
                    "editor.entity.exists requires an active ControlPlaneEditorBridge "
                    "session; run editor.session.open first."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                },
            )

        raw_entity_id = args.get("entity_id")
        raw_entity_name = args.get("entity_name")
        has_entity_id = raw_entity_id is not None and not (
            isinstance(raw_entity_id, str) and not raw_entity_id.strip()
        )
        has_entity_name = isinstance(raw_entity_name, str) and bool(raw_entity_name.strip())
        if has_entity_id == has_entity_name:
            self._reject_preflight(
                tool="editor.entity.exists",
                project_root=project_root,
                reason="entity-lookup-target-invalid",
                message=(
                    "editor.entity.exists requires exactly one explicit entity_id "
                    "or entity_name on the admitted real read-only path."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "provided_entity_id": raw_entity_id,
                    "provided_entity_name": raw_entity_name,
                },
            )

        lookup_mode: str
        bridge_args: dict[str, Any] = {"level_path": loaded_level_path}
        if has_entity_id:
            normalized_entity_id = _normalize_editor_entity_id(raw_entity_id)
            if normalized_entity_id is None:
                self._reject_preflight(
                    tool="editor.entity.exists",
                    project_root=project_root,
                    reason="entity-id-invalid",
                    message=(
                        "editor.entity.exists requires a valid explicit entity_id "
                        "when entity_id lookup mode is used."
                    ),
                    extra_details={
                        "python_editor_bindings_enabled": True,
                        "loaded_level_path": loaded_level_path,
                        "provided_entity_id": raw_entity_id,
                    },
                )
            lookup_mode = "entity_id"
            bridge_args["entity_id"] = normalized_entity_id
        else:
            lookup_mode = "entity_name"
            bridge_args["entity_name"] = raw_entity_name.strip()

        bridge_response = self._invoke_bridge_command(
            tool="editor.entity.exists",
            operation="editor.entity.exists",
            project_root=project_root,
            engine_root=normalized_engine_root,
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            args=bridge_args,
            timeout_s=90,
        )
        bridge_details = self._bridge_response_details(bridge_response)
        runtime_result = {
            "ok": True,
            "message": (
                "Entity existence was checked through the persistent bridge-backed "
                "admitted editor read-only path."
            ),
            "exists": bool(bridge_details.get("exists", False)),
            "lookup_mode": bridge_details.get("lookup_mode", lookup_mode),
            "entity_id": bridge_details.get("entity_id", bridge_args.get("entity_id")),
            "entity_name": bridge_details.get("entity_name", bridge_args.get("entity_name")),
            "requested_entity_id": bridge_details.get(
                "requested_entity_id",
                bridge_args.get("entity_id"),
            ),
            "requested_entity_name": bridge_details.get(
                "requested_entity_name",
                bridge_args.get("entity_name"),
            ),
            "matched_count": bridge_details.get("matched_count"),
            "matched_entity_ids": bridge_details.get("matched_entity_ids"),
            "ambiguous": bridge_details.get("ambiguous"),
            "level_path": bridge_details.get("level_path", loaded_level_path),
            "loaded_level_path": bridge_details.get(
                "loaded_level_path",
                bridge_details.get("level_path", loaded_level_path),
            ),
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.entity.exists",
            ],
            "editor_transport": "bridge",
            **self._bridge_result_metadata(bridge_response),
        }
        state["editor_transport"] = "bridge"
        state["bridge_heartbeat_seen_at"] = runtime_result.get("bridge_heartbeat_seen_at")
        self._save_editor_state(project_root, state)
        return {
            "runtime_result": runtime_result,
            "runner_command": runner_command,
            "manifest": manifest,
            "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
        }

    def execute_component_find(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        locks_acquired: list[str],
    ) -> dict[str, Any]:
        manifest = self._load_project_manifest(project_root)
        self._ensure_python_editor_bindings_enabled(manifest, project_root=project_root)
        normalized_engine_root = _normalize_engine_root_path(engine_root)
        if dry_run:
            self._reject_preflight(
                tool="editor.component.find",
                project_root=project_root,
                reason="editor-component-find-dry-run-not-admitted",
                message=(
                    "editor.component.find currently requires dry_run=false "
                    "on the admitted real read-only path."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )
        runner_command = self._resolve_bridge_runner()
        state = self._load_editor_state(project_root)
        if not state.get("session_active"):
            self._reject_preflight(
                tool="editor.component.find",
                project_root=project_root,
                reason="editor-session-not-ensured",
                message=(
                    "editor.component.find requires an admitted editor session "
                    "before component target discovery can proceed."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )
        loaded_level_path = state.get("loaded_level_path")
        requested_level_path = args.get("level_path")
        if not isinstance(loaded_level_path, str) or not loaded_level_path:
            self._reject_preflight(
                tool="editor.component.find",
                project_root=project_root,
                reason="level-not-loaded",
                message=(
                    "editor.component.find requires a loaded level before "
                    "component target discovery can proceed."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )
        if (
            isinstance(requested_level_path, str)
            and requested_level_path
            and not _level_paths_match(
                project_root,
                loaded_level_path=loaded_level_path,
                requested_level_path=requested_level_path,
            )
        ):
            self._reject_preflight(
                tool="editor.component.find",
                project_root=project_root,
                reason="loaded-level-mismatch",
                message=(
                    "editor.component.find level_path must match the currently "
                    "loaded level on the admitted real read-only path."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "requested_level_path": requested_level_path,
                },
            )
        if not self._bridge_host_available(project_root, runner_command=runner_command):
            self._reject_preflight(
                tool="editor.component.find",
                project_root=project_root,
                reason="bridge-not-running",
                message=(
                    "editor.component.find requires an active ControlPlaneEditorBridge "
                    "session; run editor.session.open first."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                },
            )

        raw_entity_id = args.get("entity_id")
        raw_entity_name = args.get("entity_name")
        has_entity_id = raw_entity_id is not None and not (
            isinstance(raw_entity_id, str) and not raw_entity_id.strip()
        )
        has_entity_name = isinstance(raw_entity_name, str) and bool(raw_entity_name.strip())
        if has_entity_id == has_entity_name:
            self._reject_preflight(
                tool="editor.component.find",
                project_root=project_root,
                reason="component-find-target-invalid",
                message=(
                    "editor.component.find requires exactly one explicit entity_id "
                    "or exact entity_name."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "provided_entity_id": raw_entity_id,
                    "provided_entity_name": raw_entity_name,
                },
            )

        raw_component_name = args.get("component_name")
        if not isinstance(raw_component_name, str) or not raw_component_name.strip():
            self._reject_preflight(
                tool="editor.component.find",
                project_root=project_root,
                reason="component-name-missing",
                message=(
                    "editor.component.find requires one explicit allowlisted "
                    "component_name."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "provided_component_name": raw_component_name,
                },
            )
        canonical_components, unsupported_components, _duplicate_components = (
            _canonicalize_component_add_components([raw_component_name])
        )
        if unsupported_components or not canonical_components:
            self._reject_preflight(
                tool="editor.component.find",
                project_root=project_root,
                reason="unsupported-component",
                message=(
                    "editor.component.find currently admits only the explicit "
                    "allowlisted component names on the real read-only path."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "unsupported_components": unsupported_components,
                    "allowlisted_components": list(EDITOR_COMPONENT_ADD_ALLOWLIST),
                },
            )
        component_name = canonical_components[0]

        bridge_args: dict[str, Any] = {
            "component_name": component_name,
            "level_path": loaded_level_path,
        }
        if has_entity_id:
            bridge_args["entity_id"] = raw_entity_id
        else:
            bridge_args["entity_name"] = raw_entity_name.strip()

        bridge_response = self._invoke_bridge_command(
            tool="editor.component.find",
            operation="editor.component.find",
            project_root=project_root,
            engine_root=normalized_engine_root,
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            args=bridge_args,
            timeout_s=90,
        )
        bridge_details = self._bridge_response_details(bridge_response)
        component_refs = _normalize_discovered_component_refs(
            bridge_details.get("component_refs", [])
        )
        first_component_ref = component_refs[0] if component_refs else {}
        component_id = (
            first_component_ref.get("component_id")
            if isinstance(first_component_ref, dict)
            else None
        )
        runtime_result = {
            "ok": True,
            "message": (
                "Component target discovery was checked through the persistent "
                "bridge-backed admitted editor read-only path."
            ),
            "found": bool(bridge_details.get("found", False)),
            "lookup_mode": bridge_details.get(
                "lookup_mode",
                "entity_id" if has_entity_id else "entity_name",
            ),
            "entity_id": bridge_details.get("entity_id", bridge_args.get("entity_id")),
            "entity_name": bridge_details.get("entity_name", bridge_args.get("entity_name")),
            "requested_entity_id": bridge_details.get(
                "requested_entity_id",
                bridge_args.get("entity_id"),
            ),
            "requested_entity_name": bridge_details.get(
                "requested_entity_name",
                bridge_args.get("entity_name"),
            ),
            "component_name": bridge_details.get("component_name", component_name),
            "requested_component_name": bridge_details.get(
                "requested_component_name",
                component_name,
            ),
            "component_id": bridge_details.get("component_id", component_id),
            "component_id_provenance": (
                COMPONENT_ID_PROVENANCE_ADMITTED_RUNTIME_COMPONENT_DISCOVERY_RESULT
                if component_id
                else bridge_details.get("component_id_provenance")
            ),
            "component_refs": component_refs,
            "matched_count": bridge_details.get("matched_count"),
            "ambiguous": bridge_details.get("ambiguous"),
            "level_path": bridge_details.get("level_path", loaded_level_path),
            "loaded_level_path": bridge_details.get(
                "loaded_level_path",
                bridge_details.get("level_path", loaded_level_path),
            ),
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.component.find",
                "EditorComponentAPIBus.HasComponentOfType",
                "EditorComponentAPIBus.GetComponentOfType",
            ],
            "editor_transport": "bridge",
            **self._bridge_result_metadata(bridge_response),
        }
        state["editor_transport"] = "bridge"
        state["bridge_heartbeat_seen_at"] = runtime_result.get("bridge_heartbeat_seen_at")
        self._save_editor_state(project_root, state)
        return {
            "runtime_result": runtime_result,
            "runner_command": runner_command,
            "manifest": manifest,
            "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
        }

    def execute_component_property_get(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        locks_acquired: list[str],
    ) -> dict[str, Any]:
        manifest = self._load_project_manifest(project_root)
        self._ensure_python_editor_bindings_enabled(manifest, project_root=project_root)
        normalized_engine_root = _normalize_engine_root_path(engine_root)
        if dry_run:
            self._reject_preflight(
                tool="editor.component.property.get",
                project_root=project_root,
                reason="editor-component-property-get-dry-run-not-admitted",
                message=(
                    "editor.component.property.get currently requires dry_run=false "
                    "on the admitted real path."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )
        runner_command = self._resolve_bridge_runner()
        state = self._load_editor_state(project_root)
        if not state.get("session_active"):
            self._reject_preflight(
                tool="editor.component.property.get",
                project_root=project_root,
                reason="editor-session-not-ensured",
                message=(
                    "editor.component.property.get requires an admitted editor "
                    "session before component property reads can proceed."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )
        loaded_level_path = state.get("loaded_level_path")
        requested_level_path = args.get("level_path")
        if not isinstance(loaded_level_path, str) or not loaded_level_path:
            self._reject_preflight(
                tool="editor.component.property.get",
                project_root=project_root,
                reason="level-not-loaded",
                message=(
                    "editor.component.property.get requires a loaded level before "
                    "component properties can be read."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )
        if (
            isinstance(requested_level_path, str)
            and requested_level_path
            and not _level_paths_match(
                project_root,
                loaded_level_path=loaded_level_path,
                requested_level_path=requested_level_path,
            )
        ):
            self._reject_preflight(
                tool="editor.component.property.get",
                project_root=project_root,
                reason="loaded-level-mismatch",
                message=(
                    "editor.component.property.get level_path must match the "
                    "currently loaded level on the admitted real path."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "requested_level_path": requested_level_path,
                },
            )
        if not self._bridge_host_available(project_root, runner_command=runner_command):
            self._reject_preflight(
                tool="editor.component.property.get",
                project_root=project_root,
                reason="bridge-not-running",
                message=(
                    "editor.component.property.get requires an active "
                    "ControlPlaneEditorBridge session; run editor.session.open first."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                },
            )

        raw_component_id = args.get("component_id")
        if not isinstance(raw_component_id, str) or not raw_component_id.strip():
            self._reject_preflight(
                tool="editor.component.property.get",
                project_root=project_root,
                reason="component-id-missing",
                message=(
                    "editor.component.property.get requires an explicit non-empty "
                    "component_id on the admitted real path."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "provided_component_id": raw_component_id,
                },
            )
        component_id = raw_component_id.strip()

        raw_property_path = args.get("property_path")
        if not isinstance(raw_property_path, str) or not raw_property_path.strip():
            self._reject_preflight(
                tool="editor.component.property.get",
                project_root=project_root,
                reason="property-path-missing",
                message=(
                    "editor.component.property.get requires an explicit non-empty "
                    "property_path on the admitted real path."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "component_id": component_id,
                    "provided_property_path": raw_property_path,
                },
            )
        property_path = raw_property_path.strip()

        bridge_response = self._invoke_bridge_command(
            tool="editor.component.property.get",
            operation="editor.component.property.get",
            project_root=project_root,
            engine_root=normalized_engine_root,
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            args={
                "component_id": component_id,
                "property_path": property_path,
                "level_path": loaded_level_path,
            },
            timeout_s=90,
        )
        bridge_details = self._bridge_response_details(bridge_response)
        runtime_result = {
            "ok": True,
            "message": (
                "Component property was read through the persistent bridge-backed "
                "admitted editor path."
            ),
            "component_id": bridge_details.get("component_id", component_id),
            "property_path": bridge_details.get("property_path", property_path),
            "value": bridge_details.get("value"),
            "value_type": bridge_details.get("value_type"),
            "entity_id": bridge_details.get("entity_id"),
            "level_path": bridge_details.get("level_path", loaded_level_path),
            "loaded_level_path": bridge_details.get(
                "loaded_level_path",
                bridge_details.get("level_path", loaded_level_path),
            ),
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.component.property.get",
            ],
            "editor_transport": "bridge",
            **self._bridge_result_metadata(bridge_response),
        }
        state["editor_transport"] = "bridge"
        state["bridge_heartbeat_seen_at"] = runtime_result.get("bridge_heartbeat_seen_at")
        self._save_editor_state(project_root, state)
        return {
            "runtime_result": runtime_result,
            "runner_command": runner_command,
            "manifest": manifest,
            "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
        }

    def execute_component_property_list(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        locks_acquired: list[str],
    ) -> dict[str, Any]:
        manifest = self._load_project_manifest(project_root)
        self._ensure_python_editor_bindings_enabled(manifest, project_root=project_root)
        normalized_engine_root = _normalize_engine_root_path(engine_root)
        if dry_run:
            self._reject_preflight(
                tool="editor.component.property.list",
                project_root=project_root,
                reason="editor-component-property-list-dry-run-not-admitted",
                message=(
                    "editor.component.property.list currently requires dry_run=false "
                    "on the proof-only real read path."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )
        runner_command = self._resolve_bridge_runner()
        state = self._load_editor_state(project_root)
        if not state.get("session_active"):
            self._reject_preflight(
                tool="editor.component.property.list",
                project_root=project_root,
                reason="editor-session-not-ensured",
                message=(
                    "editor.component.property.list requires an admitted editor "
                    "session before component property paths can be listed."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )
        loaded_level_path = state.get("loaded_level_path")
        requested_level_path = args.get("level_path")
        if not isinstance(loaded_level_path, str) or not loaded_level_path:
            self._reject_preflight(
                tool="editor.component.property.list",
                project_root=project_root,
                reason="level-not-loaded",
                message=(
                    "editor.component.property.list requires a loaded level before "
                    "component property paths can be listed."
                ),
                extra_details={"python_editor_bindings_enabled": True},
            )
        if (
            isinstance(requested_level_path, str)
            and requested_level_path
            and not _level_paths_match(
                project_root,
                loaded_level_path=loaded_level_path,
                requested_level_path=requested_level_path,
            )
        ):
            self._reject_preflight(
                tool="editor.component.property.list",
                project_root=project_root,
                reason="loaded-level-mismatch",
                message=(
                    "editor.component.property.list level_path must match the "
                    "currently loaded level on the proof-only real read path."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "requested_level_path": requested_level_path,
                },
            )
        if not self._bridge_host_available(project_root, runner_command=runner_command):
            self._reject_preflight(
                tool="editor.component.property.list",
                project_root=project_root,
                reason="bridge-not-running",
                message=(
                    "editor.component.property.list requires an active "
                    "ControlPlaneEditorBridge session; run editor.session.open first."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                },
            )

        raw_component_id = args.get("component_id")
        if not isinstance(raw_component_id, str) or not raw_component_id.strip():
            self._reject_preflight(
                tool="editor.component.property.list",
                project_root=project_root,
                reason="component-id-missing",
                message=(
                    "editor.component.property.list requires an explicit non-empty "
                    "component_id on the proof-only real read path."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "provided_component_id": raw_component_id,
                },
            )
        component_id = raw_component_id.strip()

        bridge_response = self._invoke_bridge_command(
            tool="editor.component.property.list",
            operation="editor.component.property.list",
            project_root=project_root,
            engine_root=normalized_engine_root,
            request_id=request_id,
            session_id=session_id,
            workspace_id=workspace_id,
            executor_id=executor_id,
            args={
                "component_id": component_id,
                "level_path": loaded_level_path,
            },
            timeout_s=90,
        )
        bridge_details = self._bridge_response_details(bridge_response)
        raw_property_paths = bridge_details.get("property_paths")
        if not isinstance(raw_property_paths, list) or any(
            not isinstance(item, str) or not item.strip()
            for item in raw_property_paths
        ):
            self._reject_preflight(
                tool="editor.component.property.list",
                project_root=project_root,
                reason="bridge-property-list-invalid",
                message=(
                    "editor.component.property.list requires the bridge to return "
                    "a typed string-only property_paths list."
                ),
                extra_details={
                    "python_editor_bindings_enabled": True,
                    "loaded_level_path": loaded_level_path,
                    "component_id": component_id,
                    "bridge_response": bridge_response,
                    **self._bridge_result_metadata(bridge_response),
                },
            )
        property_paths = [item.strip() for item in raw_property_paths]
        runtime_result = {
            "ok": True,
            "message": (
                "Component property paths were listed through the persistent "
                "bridge-backed proof-only editor read path."
            ),
            "component_id": bridge_details.get("component_id", component_id),
            "entity_id": bridge_details.get("entity_id"),
            "component_type": bridge_details.get("component_type"),
            "property_paths": property_paths,
            "component_property_count": bridge_details.get(
                "component_property_count",
                len(property_paths),
            ),
            "level_path": bridge_details.get("level_path", loaded_level_path),
            "loaded_level_path": bridge_details.get(
                "loaded_level_path",
                bridge_details.get("level_path", loaded_level_path),
            ),
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                "editor.component.property.list",
                "EditorComponentAPIBus.BuildComponentPropertyList",
            ],
            "editor_transport": "bridge",
            **self._bridge_result_metadata(bridge_response),
        }
        state["editor_transport"] = "bridge"
        state["bridge_heartbeat_seen_at"] = runtime_result.get("bridge_heartbeat_seen_at")
        self._save_editor_state(project_root, state)
        return {
            "runtime_result": runtime_result,
            "runner_command": runner_command,
            "manifest": manifest,
            "runtime_script": "ControlPlaneEditorBridge/Editor/Scripts/control_plane_bridge_poller.py",
        }

    def execute_render_capture_viewport(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        locks_acquired: list[str],
    ) -> dict[str, Any]:
        manifest = self._load_project_manifest(project_root)
        self._ensure_python_editor_bindings_enabled(manifest, project_root=project_root)
        normalized_engine_root = _normalize_engine_root_path(engine_root)
        runner_command = self._resolve_bridge_runner()
        runtime_result = self._invoke_runtime_script(
            script_name="render_capture_probe.py",
            payload={
                "request_id": request_id,
                "session_id": session_id,
                "workspace_id": workspace_id,
                "executor_id": executor_id,
                "project_root": str(Path(project_root).expanduser().resolve()),
                "engine_root": normalized_engine_root,
                "tool": "render.capture.viewport",
                "dry_run": dry_run,
                "args": {
                    "output_label": args.get("output_label"),
                    "camera_entity_id": args.get("camera_entity_id"),
                    "resolution": args.get("resolution"),
                },
                "locks_acquired": locks_acquired,
            },
            runner_command=runner_command,
            timeout_s=90,
            tool="render.capture.viewport",
            project_root=project_root,
        )
        runtime_result.setdefault(
            "message",
            "Viewport capture substrate probe completed against the admitted editor runtime path.",
        )
        runtime_result.setdefault(
            "exact_editor_apis",
            ["ControlPlaneEditorBridgeRequestBus.GetEditorContext"],
        )
        runtime_result.setdefault("capture_requested", True)
        runtime_result.setdefault("capture_attempted", False)
        runtime_result.setdefault("capture_artifact_produced", False)
        runtime_result.setdefault("capture_artifact_path", None)
        runtime_result.setdefault("capture_artifact_content_type", None)
        runtime_result.setdefault("capture_artifact_size_bytes", None)
        runtime_result.setdefault(
            "capture_unavailable_reason",
            "No admitted real screenshot production path is available in this slice.",
        )
        runtime_result.setdefault("runtime_probe_attempted", True)
        runtime_result.setdefault("runtime_probe_method", "editor-runtime-get-context")
        runtime_result.setdefault("capture_runtime_mode", "runtime-probe-only")
        runtime_result.setdefault("output_label", args.get("output_label"))
        runtime_result.setdefault("camera_entity_id", args.get("camera_entity_id"))
        runtime_result.setdefault("requested_resolution", args.get("resolution"))
        return {
            "runtime_result": runtime_result,
            "runner_command": runner_command,
            "manifest": manifest,
            "runtime_script": "backend/runtime/editor_scripts/render_capture_probe.py",
        }

    def execute_render_material_inspect(
        self,
        *,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        project_root: str,
        engine_root: str,
        dry_run: bool,
        args: dict[str, Any],
        locks_acquired: list[str],
    ) -> dict[str, Any]:
        manifest = self._load_project_manifest(project_root)
        self._ensure_python_editor_bindings_enabled(manifest, project_root=project_root)
        normalized_engine_root = _normalize_engine_root_path(engine_root)
        runner_command = self._resolve_bridge_runner()
        runtime_result = self._invoke_runtime_script(
            script_name="render_material_probe.py",
            payload={
                "request_id": request_id,
                "session_id": session_id,
                "workspace_id": workspace_id,
                "executor_id": executor_id,
                "project_root": str(Path(project_root).expanduser().resolve()),
                "engine_root": normalized_engine_root,
                "tool": "render.material.inspect",
                "dry_run": dry_run,
                "args": {
                    "material_path": args.get("material_path"),
                    "include_shader_data": args.get("include_shader_data"),
                    "include_references": args.get("include_references"),
                },
                "locks_acquired": locks_acquired,
            },
            runner_command=runner_command,
            timeout_s=90,
            tool="render.material.inspect",
            project_root=project_root,
        )
        runtime_result.setdefault(
            "message",
            "Material inspection substrate probe completed against the admitted editor runtime path.",
        )
        runtime_result.setdefault(
            "exact_editor_apis",
            ["ControlPlaneEditorBridgeRequestBus.GetEditorContext"],
        )
        runtime_result.setdefault("material_inspection_requested", True)
        runtime_result.setdefault("material_inspection_attempted", False)
        runtime_result.setdefault("material_evidence_produced", False)
        runtime_result.setdefault("material_evidence_path", None)
        runtime_result.setdefault(
            "material_unavailable_reason",
            "No admitted real material inspection path is available in this slice.",
        )
        runtime_result.setdefault("runtime_probe_attempted", True)
        runtime_result.setdefault("runtime_probe_method", "editor-runtime-get-context")
        runtime_result.setdefault("material_runtime_mode", "runtime-probe-only")
        runtime_result.setdefault("material_path", args.get("material_path"))
        runtime_result.setdefault(
            "include_shader_data_requested",
            bool(args.get("include_shader_data")),
        )
        runtime_result.setdefault(
            "include_references_requested",
            bool(args.get("include_references")),
        )
        return {
            "runtime_result": runtime_result,
            "runner_command": runner_command,
            "manifest": manifest,
            "runtime_script": "backend/runtime/editor_scripts/render_material_probe.py",
        }

    def _invoke_runtime_script(
        self,
        *,
        script_name: str,
        payload: dict[str, Any],
        runner_command: list[str],
        timeout_s: int,
        tool: str,
        project_root: str,
    ) -> dict[str, Any]:
        self._payloads_dir.mkdir(parents=True, exist_ok=True)
        self._results_dir.mkdir(parents=True, exist_ok=True)
        script_path = self._scripts_dir / script_name
        payload_path = self._payloads_dir / f"{tool.replace('.', '-')}-{uuid4().hex}.json"
        result_path = self._results_dir / f"{tool.replace('.', '-')}-{uuid4().hex}.json"
        payload_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")

        command = [
            *runner_command,
            f"--project-path={str(Path(project_root).expanduser().resolve())}",
            f"--engine-path={_normalize_engine_root_path(str(payload['engine_root']))}",
            "--skipWelcomeScreenDialog",
            "--autotest_mode",
            "-BatchMode",
            "-rhi=Null",
            "--runpython",
            str(script_path),
            "--runpythonargs",
            self._format_runpythonargs(
                [
                    "--payload",
                    str(payload_path),
                    "--result",
                    str(result_path),
                ]
            ),
        ]
        try:
            process = subprocess.Popen(
                command,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        except OSError as exc:
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason="editor-runtime-command-failed",
                message="The configured editor runtime command could not be launched.",
                extra_details={
                    "command": command,
                    "launch_error": str(exc),
                },
            )

        completed_stdout = ""
        completed_stderr = ""
        completed_returncode: int | None = None
        deadline = time.monotonic() + timeout_s
        result_available = False

        while time.monotonic() < deadline:
            if result_path.is_file():
                result_available = True
                break

            completed_returncode = process.poll()
            if completed_returncode is not None:
                completed_stdout, completed_stderr = process.communicate()
                break

            time.sleep(0.25)

        if result_available:
            completed_stdout, completed_stderr, completed_returncode = (
                self._finalize_runtime_process(process)
            )
        elif completed_returncode is None:
            completed_stdout, completed_stderr = self._stop_runtime_process(process)
            latest_editor_log = self._collect_editor_log_diagnostics(project_root)
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason="editor-runtime-command-timeout",
                message="The configured editor runtime command timed out before producing a typed result payload.",
                extra_details={
                    "command": command,
                    "timeout_s": timeout_s,
                    "stdout": completed_stdout,
                    "stderr": completed_stderr,
                    **latest_editor_log,
                },
            )

        if completed_returncode not in (0, None) and not result_available:
            latest_editor_log = self._collect_editor_log_diagnostics(project_root)
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason="editor-runtime-command-failed",
                message="The configured editor runtime command returned a non-zero exit code.",
                extra_details={
                    "command": command,
                    "returncode": completed_returncode,
                    "stdout": completed_stdout,
                    "stderr": completed_stderr,
                    **latest_editor_log,
                },
            )

        if not result_path.is_file():
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason="editor-runtime-result-missing",
                message="The editor runtime command completed without producing a typed result payload.",
                extra_details={"command": command},
            )
        try:
            runtime_result = json.loads(result_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason="editor-runtime-result-invalid-json",
                message=f"The editor runtime result payload was not valid JSON: {exc}",
                extra_details={"result_path": str(result_path)},
            )
        if not isinstance(runtime_result, dict):
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason="editor-runtime-result-invalid-shape",
                message="The editor runtime result payload must be a JSON object.",
                extra_details={"result_path": str(result_path)},
            )
        runtime_result.setdefault("editor_transport", "oneshot")
        runtime_result.setdefault("bridge_available", False)
        if runtime_result.get("ok") is not True:
            bridge_details = {
                key: runtime_result[key]
                for key in BRIDGE_PROVENANCE_KEYS
                if key in runtime_result
            }
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason=str(runtime_result.get("error_code", "editor-runtime-reported-failure")),
                message=str(runtime_result.get("message", "The editor runtime reported a failure.")),
                extra_details={
                    "runtime_result": runtime_result,
                    **bridge_details,
                },
            )
        return runtime_result

    def _finalize_runtime_process(
        self,
        process: subprocess.Popen[str],
    ) -> tuple[str, str, int | None]:
        returncode = process.poll()
        if returncode is not None:
            stdout, stderr = process.communicate()
            return (stdout or "", stderr or "", returncode)

        stdout, stderr = self._stop_runtime_process(process)
        return stdout, stderr, process.returncode

    def _stop_runtime_process(
        self,
        process: subprocess.Popen[str],
    ) -> tuple[str, str]:
        try:
            process.terminate()
            stdout, stderr = process.communicate(timeout=10)
            return (stdout or "", stderr or "")
        except subprocess.TimeoutExpired:
            process.kill()
            stdout, stderr = process.communicate()
            return (stdout or "", stderr or "")

    def _load_project_manifest(self, project_root: str) -> dict[str, Any]:
        manifest_path = Path(project_root).expanduser().resolve() / "project.json"
        if not manifest_path.is_file():
            self._reject_preflight(
                tool="editor-runtime",
                project_root=project_root,
                reason="project-manifest-missing",
                message=f"Project manifest '{manifest_path}' was not found for editor automation.",
                extra_details={"project_manifest_path": str(manifest_path)},
            )
        try:
            return json.loads(manifest_path.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError as exc:
            self._reject_preflight(
                tool="editor-runtime",
                project_root=project_root,
                reason="project-manifest-unreadable",
                message=f"Project manifest '{manifest_path}' could not be decoded: {exc}",
                extra_details={"project_manifest_path": str(manifest_path)},
            )
        return {}

    def _ensure_python_editor_bindings_enabled(
        self,
        manifest: dict[str, Any],
        *,
        project_root: str,
    ) -> None:
        gem_names = manifest.get("gem_names")
        enabled_gems = {
            item.strip()
            for item in gem_names
            if isinstance(item, str) and item.strip()
        } if isinstance(gem_names, list) else set()
        if not enabled_gems.intersection({"EditorPythonBindings", "PythonEditorBindings"}):
            self._reject_preflight(
                tool="editor-runtime",
                project_root=project_root,
                reason="python-editor-bindings-disabled",
                message="The EditorPythonBindings Gem must be enabled for the target project before admitted editor automation can run.",
                extra_details={"enabled_gem_names": sorted(enabled_gems)},
            )

    def _resolve_runner(self) -> list[str]:
        raw_runner = os.getenv("O3DE_EDITOR_SCRIPT_RUNNER", "").strip()
        if not raw_runner:
            raw_runner = os.getenv("O3DE_TARGET_EDITOR_RUNNER", "").strip()
        if not raw_runner:
            self._reject_preflight(
                tool="editor-runtime",
                project_root="",
                reason="editor-runtime-unavailable",
                message=(
                    "Neither O3DE_EDITOR_SCRIPT_RUNNER nor O3DE_TARGET_EDITOR_RUNNER "
                    "is configured for admitted editor automation."
                ),
                extra_details={},
            )
        runner_command = shlex.split(raw_runner, posix=os.name != "nt")
        if not runner_command:
            self._reject_preflight(
                tool="editor-runtime",
                project_root="",
                reason="editor-runtime-command-empty",
                message="O3DE_EDITOR_SCRIPT_RUNNER did not resolve to a runnable command.",
                extra_details={},
            )
        executable = runner_command[0]
        resolved = shutil.which(executable)
        if resolved is None and not Path(executable).exists():
            self._reject_preflight(
                tool="editor-runtime",
                project_root="",
                reason="editor-runtime-unavailable",
                message="The configured editor runtime command is not available on this machine.",
                extra_details={"configured_runner": raw_runner},
            )
        return runner_command

    def _resolve_bridge_runner(self) -> list[str]:
        raw_runner = os.getenv("O3DE_TARGET_EDITOR_RUNNER", "").strip()
        if not raw_runner:
            raw_runner = os.getenv("O3DE_EDITOR_SCRIPT_RUNNER", "").strip()
        if not raw_runner:
            self._reject_preflight(
                tool="editor-runtime",
                project_root="",
                reason="editor-runtime-unavailable",
                message=(
                    "Neither O3DE_TARGET_EDITOR_RUNNER nor O3DE_EDITOR_SCRIPT_RUNNER "
                    "is configured for persistent bridge-backed editor automation."
                ),
                extra_details={},
            )
        runner_command = shlex.split(raw_runner, posix=os.name != "nt")
        if not runner_command:
            self._reject_preflight(
                tool="editor-runtime",
                project_root="",
                reason="editor-runtime-command-empty",
                message="The configured bridge runner did not resolve to a runnable command.",
                extra_details={},
            )
        executable = runner_command[0]
        resolved = shutil.which(executable)
        if resolved is None and not Path(executable).exists():
            self._reject_preflight(
                tool="editor-runtime",
                project_root="",
                reason="editor-runtime-unavailable",
                message="The configured persistent bridge runner is not available on this machine.",
                extra_details={"configured_runner": raw_runner},
            )
        return runner_command

    def _bridge_root(self, project_root: str) -> Path:
        return Path(project_root).expanduser().resolve() / "user" / "ControlPlaneBridge"

    def _bridge_paths(self, project_root: str) -> dict[str, Path]:
        bridge_root = self._bridge_root(project_root)
        return {
            "root": bridge_root,
            "inbox": bridge_root / "inbox",
            "processing": bridge_root / "processing",
            "results": bridge_root / "results",
            "deadletter": bridge_root / "deadletter",
            "heartbeat": bridge_root / "heartbeat",
            "logs": bridge_root / "logs",
            "heartbeat_file": bridge_root / "heartbeat" / "status.json",
        }

    def _ensure_bridge_dirs(self, project_root: str) -> dict[str, Path]:
        paths = self._bridge_paths(project_root)
        for key in ("inbox", "processing", "results", "deadletter", "heartbeat", "logs"):
            paths[key].mkdir(parents=True, exist_ok=True)
        return paths

    def _read_bridge_heartbeat(self, project_root: str) -> dict[str, Any] | None:
        heartbeat_path = self._bridge_paths(project_root)["heartbeat_file"]
        if not heartbeat_path.is_file():
            return None
        try:
            payload = json.loads(heartbeat_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return None
        return payload if isinstance(payload, dict) else None

    def _bridge_is_healthy(self, project_root: str) -> bool:
        heartbeat = self._read_bridge_heartbeat(project_root)
        if heartbeat is None:
            return False
        heartbeat_epoch = heartbeat.get("heartbeat_epoch_s")
        if not isinstance(heartbeat_epoch, (int, float)):
            return False
        return (time.time() - float(heartbeat_epoch)) <= BRIDGE_HEARTBEAT_MAX_AGE_S

    def _bridge_wait_for_fresh_heartbeat(
        self,
        project_root: str,
        *,
        wait_s: float = BRIDGE_HEARTBEAT_RECOVERY_WAIT_S,
    ) -> bool:
        deadline = time.monotonic() + max(wait_s, self._bridge_poll_interval_s)
        while time.monotonic() < deadline:
            if self._bridge_is_healthy(project_root):
                return True
            time.sleep(self._bridge_poll_interval_s)
        return self._bridge_is_healthy(project_root)

    def _bridge_has_live_pulse(self, project_root: str) -> bool:
        heartbeat = self._read_bridge_heartbeat(project_root)
        if heartbeat is None:
            return False
        first_epoch = heartbeat.get("heartbeat_epoch_s")
        if not isinstance(first_epoch, (int, float)):
            return False
        if (time.time() - float(first_epoch)) > BRIDGE_HEARTBEAT_MAX_AGE_S:
            return False

        deadline = time.monotonic() + max(
            BRIDGE_HEARTBEAT_PULSE_WAIT_S,
            self._bridge_poll_interval_s * 2,
        )
        last_epoch = float(first_epoch)
        while time.monotonic() < deadline:
            time.sleep(self._bridge_poll_interval_s)
            next_heartbeat = self._read_bridge_heartbeat(project_root)
            if next_heartbeat is None:
                return False
            next_epoch = next_heartbeat.get("heartbeat_epoch_s")
            if not isinstance(next_epoch, (int, float)):
                return False
            if float(next_epoch) > last_epoch:
                return True
        return False

    def _bridge_host_available(self, project_root: str, *, runner_command: list[str]) -> bool:
        heartbeat = self._read_bridge_heartbeat(project_root)
        if heartbeat is None:
            return False
        heartbeat_epoch = heartbeat.get("heartbeat_epoch_s")
        if not isinstance(heartbeat_epoch, (int, float)):
            return False
        heartbeat_running = bool(heartbeat.get("running"))
        runner_process_active = heartbeat_running and self._bridge_runner_process_is_active(
            runner_command
        )
        if (time.time() - float(heartbeat_epoch)) > BRIDGE_HEARTBEAT_MAX_AGE_S:
            if runner_process_active:
                return self._bridge_wait_for_fresh_heartbeat(project_root)
            return False
        if self._bridge_has_live_pulse(project_root):
            return True
        return runner_process_active

    def _bridge_runner_process_is_active(self, runner_command: list[str]) -> bool:
        if not runner_command:
            return False
        executable_name = Path(runner_command[0]).name.strip()
        if not executable_name:
            return False
        try:
            if os.name == "nt":
                result = subprocess.run(
                    [
                        "tasklist",
                        "/FI",
                        f"IMAGENAME eq {executable_name}",
                        "/FO",
                        "CSV",
                        "/NH",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    check=False,
                )
            else:
                result = subprocess.run(
                    ["ps", "-A", "-o", "comm="],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    check=False,
                )
        except OSError:
            return False

        stdout = (result.stdout or "").strip().lower()
        if not stdout:
            return False
        if os.name == "nt" and "no tasks are running" in stdout:
            return False
        return executable_name.lower() in stdout

    def _ensure_bridge_bootstrap_available(self, project_root: str) -> Path:
        script_path = (
            Path(project_root).expanduser().resolve()
            / "Gems"
            / BRIDGE_NAME
            / "Editor"
            / "Scripts"
            / "control_plane_bridge_bootstrap.py"
        )
        if not script_path.is_file():
            self._reject_preflight(
                tool="editor.session.open",
                project_root=project_root,
                reason="bridge-bootstrap-missing",
                message=(
                    "ControlPlaneEditorBridge bootstrap script was not found in the target project. "
                    "Run the bridge setup for the active target before using the persistent editor bridge."
                ),
                extra_details={"bridge_bootstrap_script": str(script_path)},
            )
        return script_path

    def _launch_bridge_host(
        self,
        *,
        project_root: str,
        engine_root: str,
        runner_command: list[str],
        timeout_s: int,
    ) -> None:
        bootstrap_script = self._ensure_bridge_bootstrap_available(project_root)
        self._ensure_bridge_dirs(project_root)
        bootstrap_request_path = self._write_bridge_bootstrap_request(
            project_root=project_root,
            engine_root=engine_root,
        )
        command = [
            *runner_command,
            f"--project-path={str(Path(project_root).expanduser().resolve())}",
            f"--engine-path={_normalize_engine_root_path(engine_root)}",
            "--skipWelcomeScreenDialog",
            "--runpython",
            str(bootstrap_script),
            "--runpythonargs",
            str(bootstrap_request_path),
        ]
        launch_logs = self._prepare_bridge_launch_logs(project_root, command=command)
        try:
            with (
                launch_logs["stdout"].open("a", encoding="utf-8") as stdout_handle,
                launch_logs["stderr"].open("a", encoding="utf-8") as stderr_handle,
            ):
                process = subprocess.Popen(
                    command,
                    stdin=subprocess.DEVNULL,
                    stdout=stdout_handle,
                    stderr=stderr_handle,
                    text=True,
                )
        except OSError as exc:
            self._reject_preflight(
                tool="editor.session.open",
                project_root=project_root,
                reason="bridge-launch-failed",
                message="The configured editor runner could not launch the persistent bridge host.",
                extra_details={
                    "command": command,
                    "launch_error": str(exc),
                    **self._collect_bridge_launch_diagnostics(project_root),
                },
            )

        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            if self._bridge_is_healthy(project_root):
                return
            returncode = process.poll()
            if returncode is not None:
                stdout, stderr = process.communicate()
                stdout = stdout or ""
                stderr = stderr or ""
                latest_editor_log = self._collect_editor_log_diagnostics(project_root)
                self._reject_preflight(
                    tool="editor.session.open",
                    project_root=project_root,
                    reason="bridge-launch-failed",
                    message="The persistent bridge host exited before publishing a healthy heartbeat.",
                    extra_details={
                        "command": command,
                        "returncode": returncode,
                        "stdout": stdout,
                        "stderr": stderr,
                        **latest_editor_log,
                        **self._collect_bridge_launch_diagnostics(project_root),
                    },
                )
            time.sleep(0.5)

        stdout, stderr = self._stop_runtime_process(process)
        latest_editor_log = self._collect_editor_log_diagnostics(project_root)
        self._reject_preflight(
            tool="editor.session.open",
            project_root=project_root,
            reason="bridge-heartbeat-timeout",
            message="The persistent bridge host did not publish a healthy heartbeat before the startup timeout expired.",
            extra_details={
                "command": command,
                "timeout_s": timeout_s,
                "stdout": stdout,
                "stderr": stderr,
                **latest_editor_log,
                **self._collect_bridge_launch_diagnostics(project_root),
            },
        )

    def _invoke_bridge_command(
        self,
        *,
        tool: str,
        operation: str,
        project_root: str,
        engine_root: str,
        request_id: str,
        session_id: str | None,
        workspace_id: str | None,
        executor_id: str | None,
        args: dict[str, Any],
        timeout_s: int,
    ) -> dict[str, Any]:
        paths = self._ensure_bridge_dirs(project_root)
        bridge_command_id = uuid4().hex
        command_payload: dict[str, Any] = {
            "protocol_version": BRIDGE_PROTOCOL_VERSION,
            "bridge_command_id": bridge_command_id,
            "request_id": request_id,
            "tool": tool,
            "operation": operation,
            "project_root": str(Path(project_root).expanduser().resolve()),
            "engine_root": _normalize_engine_root_path(engine_root),
            "created_at": self._utc_now(),
            "ttl_s": timeout_s,
            "requires_loaded_level": operation
            in {
                "editor.component.add",
                "editor.component.find",
                "editor.component.property.get",
                "editor.component.property.list",
                "editor.entity.exists",
                "editor.entity.create",
                "editor.entity.create.probe",
            },
            "args": args,
        }
        if session_id:
            command_payload["session_id"] = session_id
        if workspace_id:
            command_payload["workspace_id"] = workspace_id
        if executor_id:
            command_payload["executor_id"] = executor_id

        tmp_path = paths["inbox"] / f"{bridge_command_id}.json.tmp"
        command_path = paths["inbox"] / f"{bridge_command_id}.json"
        result_path = paths["results"] / f"{bridge_command_id}.json.resp"
        deadletter_result_path = paths["deadletter"] / f"{bridge_command_id}.json.resp"

        tmp_path.write_text(json.dumps(command_payload, indent=2, sort_keys=True), encoding="utf-8")
        os.replace(tmp_path, command_path)

        deadline = time.monotonic() + timeout_s
        while time.monotonic() < deadline:
            response_payload = self._consume_bridge_command_response_if_ready(
                tool=tool,
                project_root=project_root,
                result_path=result_path,
                deadletter_result_path=deadletter_result_path,
            )
            if response_payload is not None:
                return response_payload

            time.sleep(0.25)

        response_payload = self._consume_bridge_command_response_if_ready(
            tool=tool,
            project_root=project_root,
            result_path=result_path,
            deadletter_result_path=deadletter_result_path,
        )
        if response_payload is not None:
            return response_payload

        heartbeat = self._read_bridge_heartbeat(project_root)
        queue_counts = self._bridge_queue_counts(project_root)
        self._reject_preflight(
            tool=tool,
            project_root=project_root,
            reason="bridge-command-timeout",
            message="The persistent bridge did not produce a typed response before the timeout expired.",
            extra_details={
                "bridge_command_id": bridge_command_id,
                "bridge_operation": operation,
                "bridge_heartbeat": heartbeat,
                "bridge_queue_counts": queue_counts,
                "bridge_recent_deadletters": self._recent_bridge_deadletters(project_root),
                **self._collect_editor_log_diagnostics(project_root),
            },
        )

    def _consume_bridge_command_response_if_ready(
        self,
        *,
        tool: str,
        project_root: str,
        result_path: Path,
        deadletter_result_path: Path,
    ) -> dict[str, Any] | None:
        if result_path.is_file():
            response_payload = self._load_bridge_response_payload(
                result_path=result_path,
                tool=tool,
                project_root=project_root,
            )
            if response_payload.get("success") is not True:
                self._reject_preflight(
                    tool=tool,
                    project_root=project_root,
                    reason=str(response_payload.get("error_code", "bridge-command-failed")),
                    message=str(
                        response_payload.get(
                            "result_summary",
                            "The persistent bridge reported a command failure.",
                        )
                    ),
                    extra_details={
                        "bridge_response": response_payload,
                        **self._bridge_result_metadata(response_payload),
                    },
                )
            result_path.unlink(missing_ok=True)
            return response_payload

        if deadletter_result_path.is_file():
            response_payload = self._load_bridge_response_payload(
                result_path=deadletter_result_path,
                tool=tool,
                project_root=project_root,
            )
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason=str(response_payload.get("error_code", "bridge-command-deadlettered")),
                message=str(
                    response_payload.get(
                        "result_summary",
                        "The persistent bridge moved the command to deadletter.",
                    )
                ),
                extra_details={
                    "bridge_response": response_payload,
                    **self._bridge_result_metadata(response_payload),
                },
            )

        return None

    def _load_bridge_response_payload(
        self,
        *,
        result_path: Path,
        tool: str,
        project_root: str,
    ) -> dict[str, Any]:
        try:
            payload = json.loads(result_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason="bridge-result-invalid-json",
                message=f"The persistent bridge returned invalid JSON: {exc}",
                extra_details={"result_path": str(result_path)},
            )
        if not isinstance(payload, dict):
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason="bridge-result-invalid-shape",
                message="The persistent bridge response payload must be a JSON object.",
                extra_details={"result_path": str(result_path)},
            )
        return payload

    def _bridge_result_metadata(self, bridge_response: dict[str, Any]) -> dict[str, Any]:
        details = self._bridge_response_details(bridge_response)
        return {
            "editor_transport": "bridge",
            "bridge_name": str(bridge_response.get("bridge_name") or BRIDGE_NAME),
            "bridge_version": bridge_response.get("bridge_version"),
            "bridge_available": True,
            "bridge_operation": str(bridge_response.get("operation") or ""),
            "bridge_contract_version": str(
                bridge_response.get("protocol_version") or BRIDGE_CONTRACT_VERSION
            ),
            "bridge_command_id": bridge_response.get("bridge_command_id"),
            "bridge_result_summary": bridge_response.get("result_summary"),
            "bridge_error_code": bridge_response.get("error_code"),
            "bridge_heartbeat_seen_at": bridge_response.get("finished_at"),
            "bridge_queue_mode": BRIDGE_QUEUE_MODE,
            "bridge_selected_entity_count": details.get("selected_entity_count"),
            "bridge_prefab_context_notes": details.get("prefab_context_notes"),
            "editor_log_path": bridge_response.get("editor_log_path"),
        }

    def _bridge_response_details(self, bridge_response: dict[str, Any]) -> dict[str, Any]:
        details = bridge_response.get("details")
        return details if isinstance(details, dict) else {}

    def _bridge_queue_counts(self, project_root: str) -> dict[str, int]:
        paths = self._bridge_paths(project_root)
        counts: dict[str, int] = {}
        for key in ("inbox", "processing", "results", "deadletter"):
            path = paths[key]
            counts[key] = self._bridge_queue_entry_count(path) if path.is_dir() else 0
        return counts

    def _bridge_queue_entry_count(self, path: Path) -> int:
        command_ids: set[str] = set()
        for candidate in path.glob("*.json*"):
            name = candidate.name
            if name.endswith(".json.resp"):
                command_ids.add(name[: -len(".json.resp")])
            elif name.endswith(".json.tmp"):
                command_ids.add(name[: -len(".json.tmp")])
            elif name.endswith(".json"):
                command_ids.add(name[: -len(".json")])
        return len(command_ids)

    def _recent_bridge_deadletters(
        self,
        project_root: str,
        *,
        limit: int = BRIDGE_DEADLETTER_DIAGNOSTIC_LIMIT,
    ) -> list[dict[str, Any]]:
        if limit <= 0:
            return []
        deadletter_dir = self._bridge_paths(project_root)["deadletter"]
        if not deadletter_dir.is_dir():
            return []

        try:
            candidates = sorted(
                deadletter_dir.glob("*.json.resp"),
                key=lambda path: path.stat().st_mtime,
                reverse=True,
            )
        except OSError:
            return []

        recent: list[dict[str, Any]] = []
        for path in candidates:
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if not isinstance(payload, dict):
                continue

            bridge_command_id = payload.get("bridge_command_id")
            if not isinstance(bridge_command_id, str) or not bridge_command_id:
                bridge_command_id = path.name[: -len(".json.resp")]

            recent.append(
                {
                    "bridge_command_id": bridge_command_id,
                    "operation": payload.get("operation"),
                    "error_code": payload.get("error_code"),
                    "result_summary": payload.get("result_summary"),
                    "finished_at": payload.get("finished_at"),
                    "result_path": str(path),
                }
            )
            if len(recent) >= limit:
                break
        return recent

    def _utc_now(self) -> str:
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    def _format_runpythonargs(self, args: list[str]) -> str:
        return subprocess.list2cmdline(args)

    def _write_bridge_bootstrap_request(
        self,
        *,
        project_root: str,
        engine_root: str,
    ) -> Path:
        paths = self._ensure_bridge_dirs(project_root)
        request_path = paths["root"] / "bootstrap_request.json"
        request_payload = {
            "project_root": str(Path(project_root).expanduser().resolve()),
            "engine_root": _normalize_engine_root_path(engine_root),
            "poll_interval": self._bridge_poll_interval_s,
        }
        request_path.write_text(
            json.dumps(request_payload, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        return request_path

    def _prepare_bridge_launch_logs(self, project_root: str, *, command: list[str]) -> dict[str, Path]:
        paths = self._bridge_paths(project_root)
        launch_logs = {
            "stdout": paths["logs"] / "bridge_launch.stdout.log",
            "stderr": paths["logs"] / "bridge_launch.stderr.log",
        }
        command_line = subprocess.list2cmdline(command)
        header = f"{self._utc_now()} launch command: {command_line}\n"
        for path in launch_logs.values():
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8") as handle:
                handle.write(header)
        return launch_logs

    def _collect_bridge_launch_diagnostics(self, project_root: str) -> dict[str, Any]:
        paths = self._bridge_paths(project_root)
        diagnostics: dict[str, Any] = {
            "bridge_heartbeat_path": str(paths["heartbeat_file"]),
            "bridge_queue_counts": self._bridge_queue_counts(project_root),
        }
        heartbeat = self._read_bridge_heartbeat(project_root)
        if heartbeat is not None:
            diagnostics["bridge_heartbeat"] = heartbeat
        recent_deadletters = self._recent_bridge_deadletters(project_root)
        if recent_deadletters:
            diagnostics["bridge_recent_deadletters"] = recent_deadletters
        file_diagnostics = {
            "bridge_bootstrap_trace": paths["logs"] / "bootstrap_trace.log",
            "bridge_launch_stdout": paths["logs"] / "bridge_launch.stdout.log",
            "bridge_launch_stderr": paths["logs"] / "bridge_launch.stderr.log",
            "bridge_log": paths["logs"] / "control_plane_bridge.log",
        }
        for key, path in file_diagnostics.items():
            diagnostics[f"{key}_path"] = str(path)
            tail = self._tail_text_file(path, line_count=BRIDGE_LAUNCH_LOG_TAIL_LINES)
            if tail:
                diagnostics[f"{key}_tail"] = tail
        return diagnostics

    def _load_editor_state(self, project_root: str) -> dict[str, Any]:
        state_path = self._state_path(project_root)
        if not state_path.is_file():
            return {}
        try:
            payload = json.loads(state_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}

    def _save_editor_state(self, project_root: str, state: dict[str, Any]) -> None:
        state_path = self._state_path(project_root)
        state_path.parent.mkdir(parents=True, exist_ok=True)
        state_path.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")

    def _state_path(self, project_root: str) -> Path:
        return self._state_dir / f"{self._project_key(project_root)}.json"

    def _project_key(self, project_root: str) -> str:
        return hashlib.sha1(
            str(Path(project_root).expanduser().resolve()).encode("utf-8")
        ).hexdigest()[:16]

    def _create_editor_restore_boundary(
        self,
        *,
        project_root: str,
        state: dict[str, Any],
        tool: str,
        loaded_level_path: str,
        mutation_target: dict[str, Any],
    ) -> dict[str, Any]:
        level_file_path = self._resolve_loaded_level_file_path(
            project_root,
            loaded_level_path=loaded_level_path,
        )
        if not level_file_path.is_file():
            self._reject_preflight(
                tool=tool,
                project_root=project_root,
                reason="restore-boundary-level-file-missing",
                message=(
                    f"{tool} requires a filesystem-backed loaded level so a bounded "
                    "restore boundary can be captured before mutation."
                ),
                extra_details={
                    "loaded_level_path": loaded_level_path,
                    "restore_boundary_scope": EDITOR_MUTATION_RESTORE_SCOPE,
                    "restore_strategy": EDITOR_MUTATION_RESTORE_STRATEGY,
                    "restore_boundary_source_path": str(level_file_path),
                },
            )

        boundary_id = uuid4().hex
        backup_dir = self._restore_boundaries_dir / self._project_key(project_root)
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_extension = "".join(level_file_path.suffixes) or ".bak"
        backup_path = backup_dir / f"{boundary_id}{backup_extension}"
        shutil.copy2(level_file_path, backup_path)

        boundary = {
            "restore_boundary_created": True,
            "restore_boundary_id": boundary_id,
            "restore_boundary_scope": EDITOR_MUTATION_RESTORE_SCOPE,
            "restore_strategy": EDITOR_MUTATION_RESTORE_STRATEGY,
            "restore_boundary_created_at": self._utc_now(),
            "restore_boundary_level_path": loaded_level_path,
            "restore_boundary_source_path": str(level_file_path),
            "restore_boundary_backup_path": str(backup_path),
            "restore_boundary_available": True,
            "restore_invoked": False,
            "restore_result": "available_not_invoked",
            "restore_boundary_target": mutation_target,
            "restore_boundary_backup_sha256": self._file_sha256(backup_path),
        }
        state["available_restore_boundary"] = boundary
        self._save_editor_state(project_root, state)
        return boundary

    def _attach_restore_outcome_to_exception(
        self,
        exc: Exception,
        *,
        project_root: str,
        state: dict[str, Any],
        restore_boundary: dict[str, Any],
        trigger: str,
    ) -> None:
        restore_outcome = self._restore_editor_restore_boundary(
            project_root=project_root,
            state=state,
            restore_boundary=restore_boundary,
            trigger=trigger,
        )
        details = getattr(exc, "details", None)
        if isinstance(details, dict):
            details.update(restore_outcome)
        logs = getattr(exc, "logs", None)
        if isinstance(logs, list):
            logs.append(
                "Editor restore boundary was invoked after the admitted mutation path reported a failure."
            )

    def _restore_editor_restore_boundary(
        self,
        *,
        project_root: str,
        state: dict[str, Any],
        restore_boundary: dict[str, Any],
        trigger: str,
    ) -> dict[str, Any]:
        restore_outcome = dict(restore_boundary)
        restore_outcome.update(
            {
                "restore_invoked": True,
                "restore_attempted": True,
                "restore_trigger": trigger,
            }
        )
        source_path = Path(str(restore_boundary["restore_boundary_source_path"]))
        backup_path = Path(str(restore_boundary["restore_boundary_backup_path"]))

        try:
            source_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(backup_path, source_path)
        except OSError as exc:
            restore_outcome["restore_succeeded"] = False
            restore_outcome["restore_result"] = "restore_copy_failed"
            restore_outcome["restore_error"] = str(exc)
            state["available_restore_boundary"] = restore_outcome
            self._save_editor_state(project_root, state)
            return restore_outcome

        restore_outcome["restore_verification_attempted"] = True
        restored_hash = self._file_sha256(source_path)
        restore_outcome["restore_verification_succeeded"] = (
            restored_hash == restore_boundary.get("restore_boundary_backup_sha256")
        )
        restore_outcome["restore_succeeded"] = bool(
            restore_outcome["restore_verification_succeeded"]
        )
        restore_outcome["restore_result"] = (
            "restored_and_verified"
            if restore_outcome["restore_succeeded"]
            else "restore_verification_failed"
        )
        restore_outcome["restore_restored_sha256"] = restored_hash
        state["available_restore_boundary"] = restore_outcome
        self._save_editor_state(project_root, state)
        return restore_outcome

    def _restore_boundary_runtime_metadata(
        self,
        restore_boundary: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            key: value
            for key, value in restore_boundary.items()
            if key != "restore_boundary_target"
        }

    def _resolve_loaded_level_file_path(
        self,
        project_root: str,
        *,
        loaded_level_path: str,
    ) -> Path:
        candidate_path = Path(project_root).expanduser().resolve() / loaded_level_path.replace(
            "\\",
            "/",
        )
        if candidate_path.is_dir():
            prefab_path = candidate_path / f"{candidate_path.name}.prefab"
            if prefab_path.is_file():
                return prefab_path
        return candidate_path

    def _file_sha256(self, path: Path) -> str:
        hasher = hashlib.sha256()
        with path.open("rb") as handle:
            while True:
                chunk = handle.read(8192)
                if not chunk:
                    break
                hasher.update(chunk)
        return hasher.hexdigest()

    def _collect_editor_log_diagnostics(self, project_root: str) -> dict[str, Any]:
        latest_log = self._find_latest_editor_log(project_root)
        if latest_log is None:
            return {}
        diagnostics: dict[str, Any] = {
            "editor_log_path": str(latest_log),
        }
        tail = self._tail_text_file(latest_log, line_count=80)
        if tail:
            diagnostics["editor_log_tail"] = tail
        return diagnostics

    def _find_latest_editor_log(self, project_root: str) -> Path | None:
        log_dir = Path(project_root).expanduser().resolve() / "user" / "log"
        if not log_dir.is_dir():
            return None
        candidates = sorted(
            log_dir.glob("Editor*.log"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
        return candidates[0] if candidates else None

    def _tail_text_file(self, path: Path, *, line_count: int) -> list[str]:
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        except OSError:
            return []
        if line_count <= 0:
            return []
        return lines[-line_count:]

    def _reject_preflight(
        self,
        *,
        tool: str,
        project_root: str,
        reason: str,
        message: str,
        extra_details: dict[str, Any],
    ) -> None:
        from app.services.adapters import AdapterExecutionRejected

        raise AdapterExecutionRejected(
            message,
            details={
                "inspection_surface": "editor_runtime_preflight",
                "execution_boundary": EDITOR_RUNTIME_BOUNDARY,
                "simulated": False,
                "adapter_family": "editor-control",
                "adapter_mode": os.getenv("O3DE_ADAPTER_MODE", "simulated").strip().lower() or "simulated",
                "adapter_contract_version": "v0.1",
                "preflight_failed": True,
                "preflight_reason": reason,
                "project_root_path": project_root or None,
                **extra_details,
            },
            logs=[message],
        )


editor_automation_runtime_service = EditorAutomationRuntimeService()
