from __future__ import annotations

import json
from typing import Any

BRIDGE_NAME = "ControlPlaneEditorBridge"
BRIDGE_CONTRACT_VERSION = "v0.1"
BRIDGE_MODULE = "control_plane_editor_bridge"
BRIDGE_BUS = "ControlPlaneEditorBridgeRequestBus"


def _bridge_unavailable(operation: str, *, error_code: str, summary: str) -> dict[str, Any]:
    return {
        "bridge_available": False,
        "bridge_name": BRIDGE_NAME,
        "bridge_version": None,
        "bridge_operation": operation,
        "bridge_contract_version": BRIDGE_CONTRACT_VERSION,
        "bridge_result_summary": summary,
        "bridge_error_code": error_code,
        "bridge_selected_entity_count": None,
        "bridge_prefab_context_notes": None,
        "bridge_payload": {
            "success": False,
            "operation": operation,
            "bridge_name": BRIDGE_NAME,
            "bridge_version": None,
            "bridge_contract_version": BRIDGE_CONTRACT_VERSION,
            "result_summary": summary,
            "error_code": error_code,
            "details": {
                "bridge_module_loaded": False,
            },
        },
    }


def invoke_bridge(operation: str, **kwargs: Any) -> dict[str, Any]:
    try:
        import azlmbr.bus as bus  # type: ignore
        import azlmbr.control_plane_editor_bridge as bridge  # type: ignore
    except ImportError:
        return _bridge_unavailable(
            operation,
            error_code="BRIDGE_MODULE_UNAVAILABLE",
            summary="ControlPlaneEditorBridge is not loaded in this editor context.",
        )

    try:
        if operation == "Ping":
            raw_result = bridge.ControlPlaneEditorBridgeRequestBus(bus.Broadcast, "Ping")
        elif operation == "GetEditorContext":
            raw_result = bridge.ControlPlaneEditorBridgeRequestBus(
                bus.Broadcast,
                "GetEditorContext",
            )
        elif operation == "EnsureLevelOpen":
            raw_result = bridge.ControlPlaneEditorBridgeRequestBus(
                bus.Broadcast,
                "EnsureLevelOpen",
                kwargs["level_path"],
            )
        elif operation == "CreateEntityProbe":
            raw_result = bridge.ControlPlaneEditorBridgeRequestBus(
                bus.Broadcast,
                "CreateEntityProbe",
                kwargs["level_path"],
                kwargs.get("entity_name", ""),
            )
        elif operation == "CreateRootEntity":
            raw_result = bridge.ControlPlaneEditorBridgeRequestBus(
                bus.Broadcast,
                "CreateRootEntity",
                kwargs["level_path"],
                kwargs["entity_name"],
            )
        else:
            return _bridge_unavailable(
                operation,
                error_code="BRIDGE_OPERATION_UNSUPPORTED",
                summary=f"Bridge operation '{operation}' is not supported by the runtime caller.",
            )
    except Exception as exc:
        return _bridge_unavailable(
            operation,
            error_code="BRIDGE_CALL_EXCEPTION",
            summary=f"Bridge operation '{operation}' raised {type(exc).__name__}.",
        ) | {
            "bridge_payload": {
                "success": False,
                "operation": operation,
                "bridge_name": BRIDGE_NAME,
                "bridge_version": None,
                "bridge_contract_version": BRIDGE_CONTRACT_VERSION,
                "result_summary": f"Bridge operation '{operation}' raised {type(exc).__name__}.",
                "error_code": "BRIDGE_CALL_EXCEPTION",
                "details": {
                    "bridge_module_loaded": True,
                    "exception": repr(exc),
                },
            }
        }

    try:
        payload = json.loads(raw_result)
    except Exception as exc:
        return _bridge_unavailable(
            operation,
            error_code="BRIDGE_RESULT_INVALID_JSON",
            summary=f"Bridge operation '{operation}' returned invalid JSON.",
        ) | {
            "bridge_payload": {
                "success": False,
                "operation": operation,
                "bridge_name": BRIDGE_NAME,
                "bridge_version": None,
                "bridge_contract_version": BRIDGE_CONTRACT_VERSION,
                "result_summary": f"Bridge operation '{operation}' returned invalid JSON.",
                "error_code": "BRIDGE_RESULT_INVALID_JSON",
                "details": {
                    "bridge_module_loaded": True,
                    "raw_result": raw_result,
                    "exception": repr(exc),
                },
            }
        }

    if not isinstance(payload, dict):
        return _bridge_unavailable(
            operation,
            error_code="BRIDGE_RESULT_INVALID_SHAPE",
            summary=f"Bridge operation '{operation}' returned a non-object payload.",
        ) | {
            "bridge_payload": {
                "success": False,
                "operation": operation,
                "bridge_name": BRIDGE_NAME,
                "bridge_version": None,
                "bridge_contract_version": BRIDGE_CONTRACT_VERSION,
                "result_summary": f"Bridge operation '{operation}' returned a non-object payload.",
                "error_code": "BRIDGE_RESULT_INVALID_SHAPE",
                "details": {
                    "bridge_module_loaded": True,
                    "raw_result": raw_result,
                },
            }
        }

    details = payload.get("details")
    if not isinstance(details, dict):
        details = {}

    return {
        "bridge_available": True,
        "bridge_name": str(payload.get("bridge_name") or BRIDGE_NAME),
        "bridge_version": payload.get("bridge_version"),
        "bridge_operation": str(payload.get("operation") or operation),
        "bridge_contract_version": str(
            payload.get("bridge_contract_version") or BRIDGE_CONTRACT_VERSION
        ),
        "bridge_result_summary": str(payload.get("result_summary") or ""),
        "bridge_error_code": payload.get("error_code"),
        "bridge_selected_entity_count": details.get("selected_entity_count"),
        "bridge_prefab_context_notes": details.get("prefab_context_notes"),
        "bridge_payload": payload,
    }


def bridge_metadata(bridge_result: dict[str, Any]) -> dict[str, Any]:
    return {
        "bridge_name": bridge_result.get("bridge_name"),
        "bridge_version": bridge_result.get("bridge_version"),
        "bridge_available": bridge_result.get("bridge_available", False),
        "bridge_operation": bridge_result.get("bridge_operation"),
        "bridge_contract_version": bridge_result.get("bridge_contract_version"),
        "bridge_result_summary": bridge_result.get("bridge_result_summary"),
        "bridge_error_code": bridge_result.get("bridge_error_code"),
        "bridge_selected_entity_count": bridge_result.get("bridge_selected_entity_count"),
        "bridge_prefab_context_notes": bridge_result.get("bridge_prefab_context_notes"),
    }
