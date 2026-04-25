from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from datetime import datetime, timezone

try:
    import azlmbr.bus as bus  # type: ignore
    import azlmbr.control_plane_editor_bridge as control_plane_editor_bridge  # type: ignore
    import azlmbr.editor as editor  # type: ignore
    import azlmbr.entity as entity  # type: ignore
    import azlmbr.legacy.general as general  # type: ignore
    from azlmbr.entity import EntityId  # type: ignore
except Exception:
    bus = None
    control_plane_editor_bridge = None
    editor = None
    entity = None
    general = None
    EntityId = None

BRIDGE_NAME = "ControlPlaneEditorBridge"
BRIDGE_VERSION = "0.1.0"
PROTOCOL_VERSION = "v1"
DEFAULT_LEVEL_TEMPLATE = "DefaultLevel"
COMPONENT_ADD_ALLOWLIST = ("Camera", "Comment", "Mesh")
COMPONENT_ADD_ALLOWLIST_LOOKUP = {
    component_name.casefold(): component_name
    for component_name in COMPONENT_ADD_ALLOWLIST
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _editor_available() -> bool:
    return not (
        bus is None
        or editor is None
        or entity is None
        or general is None
        or EntityId is None
    )


def _project_root_from_state(runtime_state: dict[str, Any]) -> str:
    return str(runtime_state.get("project_root") or "")


def _current_level_path() -> str | None:
    if not _editor_available():
        return None
    try:
        level_path = general.get_current_level_path()
    except Exception:
        return None
    return str(level_path) if level_path else None


def _current_level_name() -> str | None:
    if not _editor_available():
        return None
    try:
        level_name = general.get_current_level_name()
    except Exception:
        return None
    return str(level_name) if level_name else None


def _selection_count() -> int:
    if not _editor_available():
        return 0
    try:
        selected = editor.ToolsApplicationRequestBus(bus.Broadcast, "GetSelectedEntities")
    except Exception:
        return 0
    return len(selected) if isinstance(selected, list) else 0


def _editor_context_writable() -> bool:
    return _editor_available()


def _bridge_request_available() -> bool:
    return _editor_available() and control_plane_editor_bridge is not None


def _base_details(runtime_state: dict[str, Any]) -> dict[str, Any]:
    return {
        "project_root": _project_root_from_state(runtime_state),
        "bridge_module_loaded": True,
        "active_level_name": _current_level_name(),
        "active_level_path": _current_level_path(),
        "level_loaded": bool(_current_level_path()),
        "selected_entity_count": _selection_count(),
        "editor_context_writable": _editor_context_writable(),
    }


def _merge_bridge_details(
    runtime_state: dict[str, Any],
    bridge_payload: dict[str, Any],
) -> dict[str, Any]:
    details = _base_details(runtime_state)
    bridge_details = bridge_payload.get("details")
    if isinstance(bridge_details, dict):
        details.update(bridge_details)
    if "selected_entity_count" in details and "selected_entity_count_before_create" not in details:
        details["selected_entity_count_before_create"] = details["selected_entity_count"]
    active_level_path = details.get("active_level_path")
    if "level_path" not in details and isinstance(active_level_path, str) and active_level_path:
        details["level_path"] = active_level_path
    return details


def _response(
    *,
    command: dict[str, Any],
    started_at: str,
    success: bool,
    status: str,
    result_summary: str,
    details: dict[str, Any],
    error_code: str | None = None,
) -> dict[str, Any]:
    response: dict[str, Any] = {
        "protocol_version": PROTOCOL_VERSION,
        "bridge_command_id": command.get("bridge_command_id"),
        "request_id": command.get("request_id"),
        "operation": command.get("operation"),
        "success": success,
        "status": status,
        "bridge_name": BRIDGE_NAME,
        "bridge_version": BRIDGE_VERSION,
        "started_at": started_at,
        "finished_at": utc_now(),
        "result_summary": result_summary,
        "details": details,
        "evidence_refs": [],
    }
    if error_code:
        response["error_code"] = error_code
    return response


def _resolve_requested_level(project_root: str, requested_level: str) -> Path:
    requested_path = Path(requested_level)
    if requested_path.is_absolute():
        return requested_path
    return Path(project_root) / requested_path


def _idle_wait(seconds: float) -> None:
    if not _editor_available():
        return
    try:
        general.idle_wait(seconds)
    except Exception:
        pass


def _normalize_level_path(value: str | Path) -> str:
    return Path(value).as_posix().lower()


def _canonicalize_component_names(
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

        canonical_component = COMPONENT_ADD_ALLOWLIST_LOOKUP.get(
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


ENTITY_ID_CACHE: dict[str, Any] = {}


def _is_entity_id_like(value: Any) -> bool:
    return callable(getattr(value, "IsValid", None)) and callable(getattr(value, "ToString", None))


def _normalize_entity_id_text(value: Any) -> str | None:
    if _is_entity_id_like(value):
        if not value.IsValid():
            return None
        value = value.ToString()
    elif isinstance(value, int):
        value = str(value)
    elif not isinstance(value, str):
        return None

    candidate = value.strip()
    if candidate.startswith("EntityId(") and candidate.endswith(")"):
        candidate = candidate[len("EntityId(") : -1].strip()
    if candidate.startswith("[") and candidate.endswith("]"):
        candidate = candidate[1:-1].strip()
    if not candidate or not candidate.isdigit():
        return None
    return candidate


def _entity_id_cache_keys(*values: Any) -> list[str]:
    cache_keys: set[str] = set()
    for value in values:
        normalized_candidate = _normalize_entity_id_text(value)
        if normalized_candidate is not None:
            cache_keys.add(normalized_candidate)
            cache_keys.add(f"[{normalized_candidate}]")
            cache_keys.add(f"EntityId({normalized_candidate})")
        elif isinstance(value, str):
            stripped_value = value.strip()
            if stripped_value:
                cache_keys.add(stripped_value)
    return sorted(cache_keys)


def _remember_entity_id(entity_id: Any, *aliases: Any) -> list[str]:
    if not _is_entity_id_like(entity_id) or not entity_id.IsValid():
        return []
    cache_keys = _entity_id_cache_keys(entity_id, *aliases)
    for cache_key in cache_keys:
        ENTITY_ID_CACHE[cache_key] = entity_id
    return cache_keys


def _coerce_entity_id(value: Any, *, entity_name_hint: str | None = None) -> tuple[EntityId | None, dict[str, Any]]:
    resolution_details: dict[str, Any] = {
        "requested_entity_id": value,
        "entity_resolution_attempts": [],
    }
    if not _editor_available():
        resolution_details["entity_resolution_path"] = "editor-unavailable"
        return None, resolution_details

    if _is_entity_id_like(value):
        if value.IsValid():
            resolution_details["requested_entity_id_normalized"] = _normalize_entity_id_text(value)
            resolution_details["matched_entity_id"] = value.ToString()
            resolution_details["entity_resolution_path"] = "direct-entity-id-object"
            resolution_details["entity_id_cache_keys"] = _remember_entity_id(value)
            return value, resolution_details
        resolution_details["entity_resolution_path"] = "invalid-entity-id-object"
        return None, resolution_details

    normalized_candidate = _normalize_entity_id_text(value)
    resolution_details["requested_entity_id_normalized"] = normalized_candidate
    if normalized_candidate is None:
        resolution_details["entity_resolution_path"] = "invalid-request-shape"
        return None, resolution_details

    cache_keys = _entity_id_cache_keys(value)
    resolution_details["entity_cache_keys"] = cache_keys
    resolution_details["entity_cache_size"] = len(ENTITY_ID_CACHE)
    resolution_details["entity_resolution_attempts"].append("entity_id_cache")
    for cache_key in cache_keys:
        cached_entity_id = ENTITY_ID_CACHE.get(cache_key)
        if not _is_entity_id_like(cached_entity_id) or not cached_entity_id.IsValid():
            continue
        try:
            cached_entity_exists = editor.ToolsApplicationRequestBus(
                bus.Broadcast,
                "EntityExists",
                cached_entity_id,
            )
        except Exception as exc:
            resolution_details["entity_cache_exists_exception"] = repr(exc)
            continue
        if not cached_entity_exists:
            ENTITY_ID_CACHE.pop(cache_key, None)
            continue
        resolution_details["entity_cache_hit"] = True
        resolution_details["entity_cache_hit_key"] = cache_key
        resolution_details["matched_entity_id"] = cached_entity_id.ToString()
        resolution_details["matched_entity_exists"] = bool(cached_entity_exists)
        resolution_details["entity_resolution_path"] = "entity_id_cache"
        resolution_details["entity_id_cache_keys"] = _remember_entity_id(cached_entity_id, value)
        return cached_entity_id, resolution_details
    resolution_details["entity_cache_hit"] = False

    resolution_details["entity_resolution_attempts"].append("entity_id_constructor")
    try:
        constructed_entity_id = EntityId(int(normalized_candidate))
    except Exception as exc:
        resolution_details["constructor_exception"] = repr(exc)
    else:
        resolution_details["constructed_entity_id"] = constructed_entity_id.ToString()
        resolution_details["constructed_entity_id_valid"] = bool(
            constructed_entity_id and constructed_entity_id.IsValid()
        )
        if constructed_entity_id and constructed_entity_id.IsValid():
            try:
                constructed_entity_exists = editor.ToolsApplicationRequestBus(
                    bus.Broadcast,
                    "EntityExists",
                    constructed_entity_id,
                )
            except Exception as exc:
                resolution_details["constructed_entity_exists_exception"] = repr(exc)
            else:
                resolution_details["constructed_entity_exists"] = bool(constructed_entity_exists)
                if constructed_entity_exists:
                    resolution_details["matched_entity_id"] = constructed_entity_id.ToString()
                    resolution_details["entity_resolution_path"] = "entity_id_constructor"
                    resolution_details["entity_id_cache_keys"] = _remember_entity_id(
                        constructed_entity_id,
                        value,
                    )
                    return constructed_entity_id, resolution_details

    resolution_details["entity_resolution_attempts"].append("search_entities")
    try:
        search_results = entity.SearchBus(bus.Broadcast, "SearchEntities", entity.SearchFilter())
    except Exception as exc:
        resolution_details["search_entities_exception"] = repr(exc)
        resolution_details["entity_resolution_path"] = "search-entities-failed"
        return None, resolution_details

    if isinstance(search_results, list):
        search_candidates = search_results
    elif search_results is None:
        search_candidates = []
    else:
        try:
            search_candidates = list(search_results)
        except TypeError:
            search_candidates = []

    resolution_details["search_entities_count"] = len(search_candidates)
    requested_text_variants = {
        normalized_candidate,
        f"[{normalized_candidate}]",
        f"EntityId({normalized_candidate})",
    }
    search_candidate_preview: list[dict[str, Any]] = []
    for candidate_entity_id in search_candidates:
        if _is_entity_id_like(candidate_entity_id):
            if not candidate_entity_id.IsValid():
                continue
        try:
            candidate_text = candidate_entity_id.ToString()
        except Exception:
            continue
        if len(search_candidate_preview) < 10:
            preview_entry: dict[str, Any] = {"entity_id": candidate_text}
            candidate_name = _entity_name(candidate_entity_id)
            if isinstance(candidate_name, str) and candidate_name:
                preview_entry["entity_name"] = candidate_name
            search_candidate_preview.append(preview_entry)
        candidate_normalized = _normalize_entity_id_text(candidate_text)
        if candidate_text not in requested_text_variants and candidate_normalized != normalized_candidate:
            continue
        try:
            candidate_exists = editor.ToolsApplicationRequestBus(
                bus.Broadcast,
                "EntityExists",
                candidate_entity_id,
            )
        except Exception as exc:
            resolution_details["search_match_entity_exists_exception"] = repr(exc)
            continue
        if not candidate_exists:
            continue
        resolution_details["matched_entity_id"] = candidate_text
        resolution_details["matched_entity_exists"] = bool(candidate_exists)
        resolution_details["entity_resolution_path"] = "search_entities_match"
        resolution_details["entity_id_cache_keys"] = _remember_entity_id(
            candidate_entity_id,
            value,
        )
        return candidate_entity_id, resolution_details

    resolution_details["search_candidate_preview"] = search_candidate_preview

    if isinstance(entity_name_hint, str) and entity_name_hint:
        resolution_details["entity_name_hint"] = entity_name_hint
        resolution_details["entity_resolution_attempts"].append("entity_name_hint")
        search_filter = entity.SearchFilter()
        search_filter.names = [entity_name_hint]
        search_filter.names_case_sensitive = True
        try:
            name_search_results = entity.SearchBus(bus.Broadcast, "SearchEntities", search_filter)
        except Exception as exc:
            resolution_details["entity_name_hint_search_exception"] = repr(exc)
        else:
            if isinstance(name_search_results, list):
                name_search_candidates = name_search_results
            elif name_search_results is None:
                name_search_candidates = []
            else:
                try:
                    name_search_candidates = list(name_search_results)
                except TypeError:
                    name_search_candidates = []

            resolution_details["entity_name_hint_search_count"] = len(name_search_candidates)
            name_search_preview: list[dict[str, Any]] = []
            valid_name_candidates: list[EntityId] = []
            matching_name_candidate = None
            for candidate_entity_id in name_search_candidates:
                if not _is_entity_id_like(candidate_entity_id) or not candidate_entity_id.IsValid():
                    continue
                candidate_text = candidate_entity_id.ToString()
                candidate_name = _entity_name(candidate_entity_id)
                if len(name_search_preview) < 10:
                    name_search_preview.append(
                        {
                            "entity_id": candidate_text,
                            "entity_name": candidate_name,
                        }
                    )
                try:
                    candidate_exists = editor.ToolsApplicationRequestBus(
                        bus.Broadcast,
                        "EntityExists",
                        candidate_entity_id,
                    )
                except Exception:
                    candidate_exists = False
                if not candidate_exists or candidate_name != entity_name_hint:
                    continue
                valid_name_candidates.append(candidate_entity_id)
                if normalized_candidate is not None and _normalize_entity_id_text(candidate_text) == normalized_candidate:
                    matching_name_candidate = candidate_entity_id
                    resolution_details["entity_resolution_path"] = "entity_name_hint_id_match"
                    break

            resolution_details["entity_name_hint_search_candidates"] = name_search_preview
            if matching_name_candidate is None and len(valid_name_candidates) == 1:
                matching_name_candidate = valid_name_candidates[0]
                resolution_details["entity_resolution_path"] = "entity_name_hint_single_candidate"

            if matching_name_candidate is not None:
                resolution_details["matched_entity_id"] = matching_name_candidate.ToString()
                resolution_details["matched_entity_name"] = _entity_name(matching_name_candidate)
                resolution_details["entity_id_cache_keys"] = _remember_entity_id(
                    matching_name_candidate,
                    value,
                    entity_name_hint,
                )
                resolved_normalized = _normalize_entity_id_text(matching_name_candidate)
                resolution_details["entity_name_hint_id_mismatch"] = (
                    normalized_candidate is not None and resolved_normalized != normalized_candidate
                )
                return matching_name_candidate, resolution_details

    resolution_details["entity_resolution_path"] = "unresolved"
    return None, resolution_details


def _entity_name(entity_id: EntityId) -> str | None:
    if not _editor_available():
        return None
    try:
        entity_name = editor.EditorEntityInfoRequestBus(bus.Event, "GetName", entity_id)
    except Exception:
        return None
    return str(entity_name) if entity_name else None


def _resolve_component_type_id(component_name: str) -> Any | None:
    if not _editor_available():
        return None
    try:
        type_ids = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "FindComponentTypeIdsByEntityType",
            [component_name],
            entity.EntityType().Game,
        )
    except Exception:
        return None
    if not isinstance(type_ids, list) or not type_ids:
        return None
    return type_ids[0]


def _candidate_level_prefab(requested_level_file: Path) -> Path | None:
    if requested_level_file.is_dir():
        prefab_path = requested_level_file / f"{requested_level_file.name}.prefab"
        return prefab_path if prefab_path.is_file() else None
    if requested_level_file.suffix.lower() == ".prefab":
        return requested_level_file
    return requested_level_file if requested_level_file.is_file() else None


def _matching_level_targets(requested_level_file: Path) -> set[str]:
    targets = {_normalize_level_path(requested_level_file)}
    prefab_target = _candidate_level_prefab(requested_level_file)
    if prefab_target is not None:
        targets.add(_normalize_level_path(prefab_target))
        targets.add(_normalize_level_path(prefab_target.parent))
    if requested_level_file.is_file():
        targets.add(_normalize_level_path(requested_level_file.parent))
    return targets


def _wait_for_level_path(
    requested_level_file: Path,
    *,
    timeout_s: float = 5.0,
    poll_interval_s: float = 0.25,
) -> str | None:
    deadline = datetime.now(timezone.utc).timestamp() + timeout_s
    requested_targets = _matching_level_targets(requested_level_file)
    while datetime.now(timezone.utc).timestamp() < deadline:
        current_level = _current_level_path()
        if current_level and _normalize_level_path(current_level) in requested_targets:
            return current_level
        _idle_wait(poll_interval_s)
    return None


def _invoke_bridge_request(operation: str, *args: Any) -> dict[str, Any] | None:
    if not _bridge_request_available():
        return None
    try:
        raw_result = control_plane_editor_bridge.ControlPlaneEditorBridgeRequestBus(  # type: ignore[union-attr]
            bus.Broadcast,
            operation,
            *args,
        )
    except Exception as exc:
        return {
            "success": False,
            "operation": operation,
            "result_summary": f"Bridge request '{operation}' raised an editor-side exception.",
            "error_code": "BRIDGE_REQUEST_EXCEPTION",
            "details": {"exception": repr(exc)},
        }
    try:
        payload = json.loads(raw_result)
    except Exception as exc:
        return {
            "success": False,
            "operation": operation,
            "result_summary": f"Bridge request '{operation}' returned invalid JSON.",
            "error_code": "BRIDGE_RESULT_INVALID_JSON",
            "details": {
                "raw_result": raw_result,
                "exception": repr(exc),
            },
        }
    if not isinstance(payload, dict):
        return {
            "success": False,
            "operation": operation,
            "result_summary": f"Bridge request '{operation}' returned a non-object payload.",
            "error_code": "BRIDGE_RESULT_INVALID_SHAPE",
            "details": {"raw_result": raw_result},
        }
    payload_details = payload.get("details")
    if not isinstance(payload_details, dict):
        payload["details"] = {}
    return payload


def _ensure_level_open(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=_base_details(runtime_state),
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    requested_level = command.get("args", {}).get("level_path")
    if not isinstance(requested_level, str) or not requested_level:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.level.open requires args.level_path.",
            details=_base_details(runtime_state),
            error_code="LEVEL_PATH_MISSING",
        )

    project_root = _project_root_from_state(runtime_state)
    requested_level_file = _resolve_requested_level(project_root, requested_level)
    current_level = _current_level_path()
    if current_level and _normalize_level_path(current_level) in _matching_level_targets(requested_level_file):
        details = _base_details(runtime_state)
        details["ensure_result"] = "already_open"
        details["level_path"] = current_level
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Requested level is already open in the persistent bridge session.",
            details=details,
        )

    try:
        open_argument = None
        if requested_level_file.exists():
            prefab_target = _candidate_level_prefab(requested_level_file)
            open_target = prefab_target if prefab_target is not None else requested_level_file
            open_argument = str(open_target)
            general.open_level_no_prompt(open_argument)
            ensure_result = "opened_existing"
        else:
            general.create_level_no_prompt(Path(requested_level).stem, 1024, 1, False)
            ensure_result = "created"
        observed_level_path = _wait_for_level_path(requested_level_file)
        details = _base_details(runtime_state)
        details["ensure_result"] = ensure_result
        details["requested_level_path"] = str(requested_level_file)
        details["requested_level_open_argument"] = open_argument
        details["requested_level_targets"] = sorted(_matching_level_targets(requested_level_file))
        if not observed_level_path:
            active_level_path = details.get("active_level_path")
            if (
                isinstance(active_level_path, str)
                and active_level_path
                and _normalize_level_path(active_level_path)
                in _matching_level_targets(requested_level_file)
            ):
                observed_level_path = active_level_path
                details["level_observation_source"] = "post_wait_context_snapshot"
            else:
                details["level_observation_source"] = "not_observed"
        else:
            details["level_observation_source"] = "wait_loop"
        details["level_path"] = observed_level_path
        if not observed_level_path:
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="Persistent bridge did not observe the requested level as active after the open/create call.",
                details=details,
                error_code="LEVEL_CONTEXT_NOT_OBSERVED",
            )
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Requested level is available in the persistent bridge session.",
            details=details,
        )
    except Exception as exc:
        details = _base_details(runtime_state)
        details["requested_level_path"] = str(requested_level_file)
        details["exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Persistent bridge failed to open or create the requested level.",
            details=details,
            error_code="LEVEL_OPEN_FAILED",
        )


def _entity_create_probe(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    details = _base_details(runtime_state)
    details["contract_attempted"] = "ToolsApplicationRequestBus.CreateNewEntity(EntityId())"
    details["prefab_context_notes"] = (
        "Diagnostic-only probe. A valid entity id must be proven before editor.entity.create can be restored."
    )
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=details,
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )
    if not details.get("level_loaded"):
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Entity creation probe requires an open level context.",
            details=details,
            error_code="ENTITY_CREATE_LEVEL_CONTEXT_MISSING",
        )
    try:
        editor.ToolsApplicationRequestBus(bus.Broadcast, "SetSelectedEntities", [])
        _idle_wait(0.1)
        created_entity = editor.ToolsApplicationRequestBus(
            bus.Broadcast,
            "CreateNewEntity",
            EntityId(),
        )
        entity_id = created_entity.ToString() if created_entity and created_entity.IsValid() else None
        details["returned_entity_id"] = entity_id
        if not entity_id:
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="Entity creation probe did not receive a valid entity id on this target.",
                details=details,
                error_code="ENTITY_CREATE_FAILED",
            )
        requested_name = command.get("args", {}).get("entity_name")
        details["name_mutation_ran"] = False
        if isinstance(requested_name, str) and requested_name:
            try:
                editor.EditorEntityAPIBus(bus.Event, "SetName", created_entity, requested_name)
                details["name_mutation_ran"] = True
                details["name_mutation_succeeded"] = True
            except Exception:
                details["name_mutation_ran"] = True
                details["name_mutation_succeeded"] = False
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Entity creation probe returned a valid entity id.",
            details=details,
        )
    except Exception as exc:
        details["exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Entity creation probe hit an editor-side compatibility failure.",
            details=details,
            error_code="ENTITY_CREATE_PROBE_FAILED",
        )


def _create_root_entity(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=_base_details(runtime_state),
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    entity_name = command.get("args", {}).get("entity_name")
    if not isinstance(entity_name, str) or not entity_name:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.entity.create requires args.entity_name.",
            details=_base_details(runtime_state),
            error_code="ENTITY_NAME_MISSING",
        )

    requested_level = command.get("args", {}).get("level_path")
    if not isinstance(requested_level, str) or not requested_level:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.entity.create requires args.level_path.",
            details=_base_details(runtime_state),
            error_code="LEVEL_PATH_MISSING",
        )

    bridge_payload = _invoke_bridge_request(
        "CreateRootEntity",
        requested_level,
        entity_name,
    )
    if bridge_payload is None:
        details = _base_details(runtime_state)
        details["bridge_module_loaded"] = False
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="The bridge request bus is not available inside the editor host.",
            details=details,
            error_code="BRIDGE_MODULE_UNAVAILABLE",
        )

    details = _merge_bridge_details(runtime_state, bridge_payload)
    if bridge_payload.get("success") is not True:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary=str(
                bridge_payload.get(
                    "result_summary",
                    "Bridge-backed root entity creation failed.",
                )
            ),
            details=details,
            error_code=str(bridge_payload.get("error_code") or "ENTITY_CREATE_FAILED"),
        )

    details["post_create_name_search"] = entity_name
    bridge_entity_id = details.get("entity_id")
    details["direct_return_entity_id"] = bridge_entity_id
    expected_entity_id = _normalize_entity_id_text(bridge_entity_id)
    search_deadline = datetime.now(timezone.utc).timestamp() + 5.0
    search_attempts = 0
    search_exception = None
    last_candidate_preview: list[dict[str, Any]] = []
    last_search_count = 0
    matching_candidate = None

    while datetime.now(timezone.utc).timestamp() < search_deadline:
        search_attempts += 1
        search_filter = entity.SearchFilter()
        search_filter.names = [entity_name]
        search_filter.names_case_sensitive = True
        try:
            search_results = entity.SearchBus(bus.Broadcast, "SearchEntities", search_filter)
        except Exception as exc:
            search_exception = repr(exc)
            break

        if isinstance(search_results, list):
            search_candidates = search_results
        elif search_results is None:
            search_candidates = []
        else:
            try:
                search_candidates = list(search_results)
            except TypeError:
                search_candidates = []

        last_search_count = len(search_candidates)
        valid_candidates: list[EntityId] = []
        candidate_preview: list[dict[str, Any]] = []
        matching_candidate = None
        for candidate_entity_id in search_candidates:
            if not _is_entity_id_like(candidate_entity_id) or not candidate_entity_id.IsValid():
                continue
            candidate_text = candidate_entity_id.ToString()
            candidate_name = _entity_name(candidate_entity_id)
            candidate_preview.append(
                {
                    "entity_id": candidate_text,
                    "entity_name": candidate_name,
                }
            )
            try:
                candidate_exists = editor.ToolsApplicationRequestBus(
                    bus.Broadcast,
                    "EntityExists",
                    candidate_entity_id,
                )
            except Exception:
                candidate_exists = False
            if not candidate_exists:
                continue
            valid_candidates.append(candidate_entity_id)
            if expected_entity_id is not None and _normalize_entity_id_text(candidate_text) == expected_entity_id:
                matching_candidate = candidate_entity_id
                break

        last_candidate_preview = candidate_preview[:10]
        if matching_candidate is None and len(valid_candidates) == 1:
            matching_candidate = valid_candidates[0]
            details["post_create_resolution_path"] = "exact-name-single-candidate"
            break
        if matching_candidate is not None:
            details["post_create_resolution_path"] = "exact-name-id-match"
            break
        _idle_wait(0.25)

    details["post_create_name_search_attempts"] = search_attempts
    details["post_create_name_search_count"] = last_search_count
    details["post_create_name_search_candidates"] = last_candidate_preview
    if search_exception is not None:
        details["post_create_name_search_exception"] = search_exception
    if matching_candidate is None and "post_create_resolution_path" not in details:
        details["post_create_resolution_path"] = "exact-name-unresolved"

    if matching_candidate is not None:
        details["resolved_entity_id"] = matching_candidate.ToString()
        details["entity_id_cache_keys"] = _remember_entity_id(
            matching_candidate,
            bridge_entity_id,
            entity_name,
        )
        details["entity_id_cache_populated"] = True
        resolved_normalized = _normalize_entity_id_text(matching_candidate)
        details["post_create_id_mismatch"] = (
            expected_entity_id is not None and resolved_normalized != expected_entity_id
        )
    else:
        details["entity_id_cache_populated"] = False

    return _response(
        command=command,
        started_at=started_at,
        success=True,
        status="ok",
        result_summary=str(
            bridge_payload.get(
                "result_summary",
                "Root entity creation succeeded through the persistent bridge session.",
            )
        ),
        details=details,
    )


def _add_components_to_entity(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    details = _base_details(runtime_state)
    details["prefab_context_notes"] = (
        "Explicit existing-entity component attachment through the editor component API; "
        "property mutation, removal, parenting, prefab work, and transform placement remain out of scope."
    )
    details["allowlisted_components"] = list(COMPONENT_ADD_ALLOWLIST)
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=details,
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    requested_level = command.get("args", {}).get("level_path")
    if not isinstance(requested_level, str) or not requested_level:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add requires args.level_path.",
            details=details,
            error_code="LEVEL_PATH_MISSING",
        )

    active_level_path = details.get("active_level_path")
    if not isinstance(active_level_path, str) or not active_level_path:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add requires an open loaded level context.",
            details=details,
            error_code="COMPONENT_ADD_LEVEL_CONTEXT_MISSING",
        )
    details["loaded_level_path"] = active_level_path
    details["level_path"] = active_level_path
    details["requested_level_path"] = requested_level
    if _normalize_level_path(requested_level) != _normalize_level_path(active_level_path):
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add level_path must match the currently loaded level.",
            details=details,
            error_code="LOADED_LEVEL_MISMATCH",
        )

    requested_entity_id = command.get("args", {}).get("entity_id")
    entity_name_hint = command.get("args", {}).get("entity_name_hint")
    if isinstance(entity_name_hint, str) and entity_name_hint:
        details["entity_name_hint"] = entity_name_hint
    else:
        entity_name_hint = None
    entity_id, entity_resolution_details = _coerce_entity_id(
        requested_entity_id,
        entity_name_hint=entity_name_hint,
    )
    details.update(entity_resolution_details)
    if entity_id is None:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add requires a valid explicit entity id.",
            details=details,
            error_code="ENTITY_ID_INVALID",
        )

    entity_id_string = entity_id.ToString()
    details["entity_id"] = entity_id_string
    details["resolved_entity_id"] = entity_id_string
    entity_exists = editor.ToolsApplicationRequestBus(bus.Broadcast, "EntityExists", entity_id)
    details["entity_exists"] = bool(entity_exists)
    if not entity_exists:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add could not resolve the requested entity in the loaded level.",
            details=details,
            error_code="ENTITY_NOT_FOUND",
        )

    entity_name = _entity_name(entity_id)
    if isinstance(entity_name, str) and entity_name:
        details["entity_name"] = entity_name

    canonical_components, unsupported_components, duplicate_components = (
        _canonicalize_component_names(command.get("args", {}).get("components"))
    )
    details["requested_components"] = command.get("args", {}).get("components")
    if not canonical_components and not unsupported_components and not duplicate_components:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add requires at least one allowlisted component.",
            details=details,
            error_code="COMPONENTS_MISSING",
        )
    if unsupported_components:
        details["unsupported_components"] = unsupported_components
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add received a component outside the allowlisted surface.",
            details=details,
            error_code="UNSUPPORTED_COMPONENTS",
        )
    if duplicate_components:
        details["duplicate_components"] = duplicate_components
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add requires each requested component to appear at most once.",
            details=details,
            error_code="DUPLICATE_COMPONENT_REQUEST",
        )

    added_components: list[str] = []
    rejected_components: list[dict[str, Any]] = []
    for component_name in canonical_components:
        component_type_id = _resolve_component_type_id(component_name)
        if component_type_id is None:
            details["failed_component"] = component_name
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.component.add could not resolve an allowlisted component type on this target.",
                details=details,
                error_code="COMPONENT_TYPE_UNRESOLVED",
            )

        has_component = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "HasComponentOfType",
            entity_id,
            component_type_id,
        )
        if has_component:
            rejected_components.append(
                {"component": component_name, "reason": "already_present"}
            )
            continue

        add_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "AddComponentsOfType",
            entity_id,
            [component_type_id],
        )
        if not add_outcome.IsSuccess():
            rejected_entry: dict[str, Any] = {
                "component": component_name,
                "reason": "add_failed",
            }
            try:
                rejected_entry["error"] = str(add_outcome.GetError())
            except Exception:
                pass
            rejected_components.append(rejected_entry)
            continue

        added_components.append(component_name)

    modified_entities = [entity_id_string] if added_components else []
    details["added_components"] = added_components
    details["rejected_components"] = rejected_components
    details["modified_entities"] = modified_entities

    if added_components and rejected_components:
        result_summary = (
            f"Added {len(added_components)} component(s) to entity '{entity_id_string}' "
            f"and rejected {len(rejected_components)} already-present or failed component request(s)."
        )
    elif added_components:
        result_summary = (
            f"Added {len(added_components)} component(s) to entity '{entity_id_string}' "
            "through the persistent bridge session."
        )
    elif rejected_components:
        result_summary = (
            f"No new components were added to entity '{entity_id_string}'; all requested "
            "components were already present or failed to attach."
        )
    else:
        result_summary = (
            f"No component changes were applied to entity '{entity_id_string}'."
        )

    return _response(
        command=command,
        started_at=started_at,
        success=True,
        status="ok",
        result_summary=result_summary,
        details=details,
    )


def execute_command(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    operation = command.get("operation")
    if operation == "bridge.ping":
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Persistent bridge is running and callable.",
            details=_base_details(runtime_state),
        )
    if operation == "bridge.status":
        details = _base_details(runtime_state)
        details["queue_counts"] = runtime_state.get("queue_counts", {})
        details["bridge_started_at"] = runtime_state.get("bridge_started_at")
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Persistent bridge status captured successfully.",
            details=details,
        )
    if operation == "editor.session.open":
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Persistent bridge editor session is available.",
            details=_base_details(runtime_state),
        )
    if operation == "editor.level.open":
        return _ensure_level_open(command, runtime_state)
    if operation == "editor.entity.create":
        return _create_root_entity(command, runtime_state)
    if operation == "editor.component.add":
        return _add_components_to_entity(command, runtime_state)
    if operation == "editor.entity.create.probe":
        return _entity_create_probe(command, runtime_state)
    details = _base_details(runtime_state)
    details["requested_operation"] = operation
    return _response(
        command=command,
        started_at=started_at,
        success=False,
        status="failed",
        result_summary="Requested bridge operation is not allowlisted in this phase.",
        details=details,
        error_code="BRIDGE_OPERATION_UNSUPPORTED",
    )
