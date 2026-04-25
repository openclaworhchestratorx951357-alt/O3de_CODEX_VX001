from __future__ import annotations

import argparse
import json
from pathlib import Path

from _control_plane_editor_bridge import bridge_metadata, invoke_bridge


def write_result(result_path: Path, payload: dict[str, object]) -> int:
    result_path.write_text(
        json.dumps(payload, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return 0 if payload.get("ok") is True else 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--payload", required=True)
    parser.add_argument("--result", required=True)
    parser.add_argument("--script", required=False)
    args = parser.parse_args()

    payload = json.loads(Path(args.payload).read_text(encoding="utf-8"))
    result_path = Path(args.result)

    try:
        import azlmbr.bus as bus  # type: ignore
        import azlmbr.editor as editor  # type: ignore
        import azlmbr.legacy.general as general  # type: ignore
        from azlmbr.entity import EntityId  # type: ignore
    except ImportError:
        return write_result(
            result_path,
            {
                "ok": False,
                "error_code": "EDITOR_BINDINGS_UNAVAILABLE",
                "message": "entity_create.py must run inside an O3DE Editor Python Editor Bindings host.",
            },
        )

    entity_name = payload.get("args", {}).get("entity_name")
    if not isinstance(entity_name, str) or not entity_name:
        return write_result(
            result_path,
            {
                "ok": False,
                "error_code": "ENTITY_NAME_MISSING",
                "message": "entity_name is required.",
            },
        )

    level_path = payload.get("args", {}).get("level_path")
    if not isinstance(level_path, str) or not level_path:
        return write_result(
            result_path,
            {
                "ok": False,
                "error_code": "LEVEL_PATH_MISSING",
                "message": "level_path is required for live-safe entity creation.",
            },
        )

    bridge_create = invoke_bridge(
        "CreateRootEntity",
        level_path=level_path,
        entity_name=entity_name,
    )
    bridge_fields = bridge_metadata(bridge_create)
    if bridge_create["bridge_available"]:
        bridge_payload = bridge_create["bridge_payload"]
        bridge_details = bridge_payload.get("details", {})
        if bridge_payload.get("success") is not True:
            return write_result(
                result_path,
                {
                    "ok": False,
                    "error_code": bridge_fields.get("bridge_error_code")
                    or "BRIDGE_CREATE_ROOT_ENTITY_FAILED",
                    "message": bridge_fields.get("bridge_result_summary")
                    or "ControlPlaneEditorBridge CreateRootEntity failed.",
                    "entity_id": bridge_details.get("entity_id"),
                    "entity_name": entity_name,
                    "entity_id_source": bridge_details.get("entity_id_source"),
                    "direct_return_entity_id": bridge_details.get("direct_return_entity_id"),
                    "notification_entity_ids": bridge_details.get("notification_entity_ids"),
                    "selected_entity_count_before_create": bridge_details.get(
                        "selected_entity_count"
                    ),
                    "level_path": bridge_details.get("level_path", level_path),
                    "name_mutation_ran": bridge_details.get("name_mutation_ran", True),
                    "name_mutation_succeeded": bridge_details.get(
                        "name_mutation_succeeded",
                        False,
                    ),
                    **bridge_fields,
                },
            )

        entity_id = bridge_details.get("entity_id")
        entity_id_text = str(entity_id) if entity_id is not None else None
        return write_result(
            result_path,
            {
                "ok": True,
                "message": "Entity was created through the bridge-backed editor runtime path.",
                "entity_id": entity_id,
                "entity_name": entity_name,
                "modified_entities": [entity_id_text] if entity_id_text else [],
                "exact_editor_apis": [
                    "ControlPlaneEditorBridgeRequestBus(..., 'CreateRootEntity')",
                ],
                "entity_id_source": bridge_details.get("entity_id_source", "bridge_create"),
                "direct_return_entity_id": bridge_details.get("direct_return_entity_id"),
                "notification_entity_ids": bridge_details.get("notification_entity_ids", []),
                "selected_entity_count_before_create": bridge_details.get(
                    "selected_entity_count"
                ),
                "level_path": bridge_details.get("level_path", level_path),
                "name_mutation_ran": bridge_details.get("name_mutation_ran", True),
                "name_mutation_succeeded": bridge_details.get(
                    "name_mutation_succeeded",
                    True,
                ),
                **bridge_fields,
            },
        )

    try:
        notification_entity_ids: list[str] = []

        def on_editor_entity_created(parameters: tuple[object, ...]) -> None:
            if not parameters:
                return
            created_entity = parameters[0]
            if hasattr(created_entity, "IsValid") and created_entity.IsValid():
                notification_entity_ids.append(
                    created_entity.ToString()
                    if hasattr(created_entity, "ToString")
                    else str(created_entity)
                )

        general.open_level_no_prompt(level_path)
        general.idle_wait(0.5)
        general.idle_wait_frames(1)

        level_entity_id = editor.ToolsApplicationRequestBus(
            bus.Broadcast,
            "GetCurrentLevelEntityId",
        )
        if not level_entity_id or not level_entity_id.IsValid():
            return write_result(
                result_path,
                {
                    "ok": False,
                    "error_code": "LEVEL_ENTITY_UNAVAILABLE",
                    "message": "Current level entity id was not available before entity creation.",
                    **bridge_fields,
                },
            )

        selected_entities_before_create = editor.ToolsApplicationRequestBus(
            bus.Broadcast,
            "GetSelectedEntities",
        )
        selected_entity_count_before_create = (
            len(selected_entities_before_create)
            if isinstance(selected_entities_before_create, list)
            else 0
        )
        editor.ToolsApplicationRequestBus(bus.Broadcast, "SetSelectedEntities", [])
        general.idle_wait_frames(1)
        selected_entities_after_clear = editor.ToolsApplicationRequestBus(
            bus.Broadcast,
            "GetSelectedEntities",
        )
        if (
            not isinstance(selected_entities_after_clear, list)
            or len(selected_entities_after_clear) != 0
        ):
            return write_result(
                result_path,
                {
                    "ok": False,
                    "error_code": "ENTITY_CREATE_SELECTION_CONTEXT_BLOCKED",
                    "message": "Active editor selection could not be cleared before entity creation.",
                    "selected_entity_count_before_create": selected_entity_count_before_create,
                    "level_path": level_path,
                    **bridge_fields,
                },
            )

        handler = bus.NotificationHandler("EditorEntityContextNotificationBus")
        handler.connect()
        handler.add_callback("OnEditorEntityCreated", on_editor_entity_created)

        entity_id = editor.ToolsApplicationRequestBus(
            bus.Broadcast,
            "CreateNewEntity",
            EntityId(),
        )
        general.idle_wait(0.5)
        general.idle_wait_frames(3)

        direct_return_entity_id = (
            entity_id.ToString() if entity_id and hasattr(entity_id, "ToString") else None
        )
        direct_return_entity_id_valid = bool(entity_id and entity_id.IsValid())

        resolved_entity_id = entity_id if direct_return_entity_id_valid else None
        resolved_entity_id_text = direct_return_entity_id if direct_return_entity_id_valid else None
        entity_id_source = "create_return" if direct_return_entity_id_valid else None
        if resolved_entity_id is None and notification_entity_ids:
            notification_entity_id = notification_entity_ids[-1]
            if notification_entity_id:
                resolved_entity_id_text = notification_entity_id
                entity_id_source = "entity_created_notification"

        if not resolved_entity_id_text:
            error_code = (
                "ENTITY_CREATE_NOTIFICATION_MISSING"
                if direct_return_entity_id is None and not notification_entity_ids
                else "ENTITY_CREATE_FAILED"
            )
            message = (
                "Editor did not return or emit a valid entity id."
                if error_code == "ENTITY_CREATE_FAILED"
                else "Editor did not provide a valid entity id through return value or OnEditorEntityCreated notification."
            )
            handler.disconnect()
            return write_result(
                result_path,
                {
                    "ok": False,
                    "error_code": error_code,
                    "message": message,
                    "direct_return_entity_id": direct_return_entity_id,
                    "notification_entity_ids": notification_entity_ids,
                    "selected_entity_count_before_create": selected_entity_count_before_create,
                    "level_path": level_path,
                    **bridge_fields,
                },
            )

        name_mutation_ran = False
        name_mutation_succeeded = False
        confirmed_name = None

        if resolved_entity_id is not None:
            try:
                name_mutation_ran = True
                editor.EditorEntityAPIBus(bus.Event, "SetName", resolved_entity_id, entity_name)
                general.idle_wait(0.5)
                general.idle_wait_frames(1)
                confirmed_name = editor.EditorEntityInfoRequestBus(
                    bus.Event,
                    "GetName",
                    resolved_entity_id,
                )
                name_mutation_succeeded = confirmed_name == entity_name
            except Exception:
                name_mutation_succeeded = False

        handler.disconnect()

        if not name_mutation_succeeded:
            return write_result(
                result_path,
                {
                    "ok": False,
                    "error_code": "ENTITY_NAME_SET_FAILED",
                    "message": "Entity creation succeeded, but the requested name could not be confirmed.",
                    "entity_id": resolved_entity_id_text,
                    "entity_name": entity_name,
                    "confirmed_name": confirmed_name,
                    "entity_id_source": entity_id_source,
                    "direct_return_entity_id": direct_return_entity_id,
                    "notification_entity_ids": notification_entity_ids,
                    "selected_entity_count_before_create": selected_entity_count_before_create,
                    "level_path": level_path,
                    "name_mutation_ran": name_mutation_ran,
                    "name_mutation_succeeded": name_mutation_succeeded,
                    **bridge_fields,
                },
            )

        return write_result(
            result_path,
            {
                "ok": True,
                "message": "Entity was created through the explicit editor runtime path.",
                "entity_id": resolved_entity_id_text,
                "entity_name": entity_name,
                "modified_entities": [resolved_entity_id_text],
                "exact_editor_apis": [
                    "azlmbr.legacy.general.open_level_no_prompt",
                    "azlmbr.legacy.general.idle_wait",
                    "azlmbr.legacy.general.idle_wait_frames",
                    "azlmbr.editor.ToolsApplicationRequestBus(..., 'GetCurrentLevelEntityId')",
                    "azlmbr.editor.ToolsApplicationRequestBus(..., 'GetSelectedEntities')",
                    "azlmbr.editor.ToolsApplicationRequestBus(..., 'SetSelectedEntities', [])",
                    "azlmbr.bus.NotificationHandler('EditorEntityContextNotificationBus')",
                    "azlmbr.editor.ToolsApplicationRequestBus(..., 'CreateNewEntity', ...)",
                    "azlmbr.editor.EditorEntityAPIBus(..., 'SetName', ...)",
                    "azlmbr.editor.EditorEntityInfoRequestBus(..., 'GetName', ...)",
                ],
                "entity_id_source": entity_id_source,
                "direct_return_entity_id": direct_return_entity_id,
                "notification_entity_ids": notification_entity_ids,
                "selected_entity_count_before_create": selected_entity_count_before_create,
                "level_path": level_path,
                "name_mutation_ran": name_mutation_ran,
                "name_mutation_succeeded": name_mutation_succeeded,
                **bridge_fields,
            },
        )
    except Exception as exc:
        return write_result(
            result_path,
            {
                "ok": False,
                "error_code": "ENTITY_CREATE_RUNTIME_EXCEPTION",
                "message": f"Entity creation runtime failed: {type(exc).__name__}",
                "exception": repr(exc),
                **bridge_fields,
            },
        )


if __name__ == "__main__":
    main()
