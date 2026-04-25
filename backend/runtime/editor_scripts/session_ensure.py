from __future__ import annotations

import argparse
import json
from pathlib import Path

from _control_plane_editor_bridge import bridge_metadata, invoke_bridge


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--payload", required=True)
    parser.add_argument("--result", required=True)
    parser.add_argument("--script", required=False)
    args = parser.parse_args()

    payload_path = Path(args.payload)
    result_path = Path(args.result)
    payload = json.loads(payload_path.read_text(encoding="utf-8"))

    try:
        import azlmbr.legacy.general as general  # type: ignore
    except ImportError:
        result = {
            "ok": False,
            "error_code": "EDITOR_BINDINGS_UNAVAILABLE",
            "message": "session_ensure.py must run inside an O3DE Editor Python Editor Bindings host.",
        }
        result_path.write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")
        return 1

    level_path = payload.get("args", {}).get("level_path")
    bridge_ping = invoke_bridge("Ping")
    bridge_fields = bridge_metadata(bridge_ping)
    if bridge_ping["bridge_available"]:
        bridge_context = invoke_bridge("GetEditorContext")
        bridge_context_fields = bridge_metadata(bridge_context)
        bridge_payload = bridge_context["bridge_payload"]
        if bridge_payload.get("success") is not True:
            result = {
                "ok": False,
                "error_code": bridge_context_fields.get("bridge_error_code")
                or "BRIDGE_CONTEXT_FAILED",
                "message": bridge_context_fields.get("bridge_result_summary")
                or "ControlPlaneEditorBridge GetEditorContext failed.",
                **bridge_context_fields,
            }
            result_path.write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")
            return 1

        active_level_path = bridge_payload.get("details", {}).get("active_level_path")
        exact_editor_apis = [
            "ControlPlaneEditorBridgeRequestBus(..., 'Ping')",
            "ControlPlaneEditorBridgeRequestBus(..., 'GetEditorContext')",
        ]

        if isinstance(level_path, str) and level_path:
            bridge_level = invoke_bridge("EnsureLevelOpen", level_path=level_path)
            bridge_level_fields = bridge_metadata(bridge_level)
            bridge_level_payload = bridge_level["bridge_payload"]
            if bridge_level_payload.get("success") is not True:
                result = {
                    "ok": False,
                    "error_code": bridge_level_fields.get("bridge_error_code")
                    or "BRIDGE_ENSURE_LEVEL_FAILED",
                    "message": bridge_level_fields.get("bridge_result_summary")
                    or "ControlPlaneEditorBridge EnsureLevelOpen failed.",
                    **bridge_level_fields,
                }
                result_path.write_text(
                    json.dumps(result, indent=2, sort_keys=True),
                    encoding="utf-8",
                )
                return 1
            active_level_path = bridge_level_payload.get("details", {}).get(
                "level_path",
                level_path,
            )
            exact_editor_apis.append(
                "ControlPlaneEditorBridgeRequestBus(..., 'EnsureLevelOpen')"
            )
            bridge_fields = bridge_level_fields
        else:
            bridge_fields = bridge_context_fields

        result = {
            "ok": True,
            "message": "Editor session is available through the bridge-backed admitted automation path.",
            "editor_session_id": "editor-session-runtime",
            "loaded_level_path": active_level_path
            if isinstance(active_level_path, str) and active_level_path
            else None,
            "exact_editor_apis": exact_editor_apis,
            **bridge_fields,
        }
    else:
        exact_editor_apis: list[str] = []
        if isinstance(level_path, str) and level_path:
            general.open_level_no_prompt(level_path)
            general.idle_wait(0.1)
            exact_editor_apis = [
                "azlmbr.legacy.general.open_level_no_prompt",
                "azlmbr.legacy.general.idle_wait",
            ]

        result = {
            "ok": True,
            "message": "Editor session is available for admitted automation.",
            "editor_session_id": "editor-session-runtime",
            "loaded_level_path": level_path if isinstance(level_path, str) and level_path else None,
            "exact_editor_apis": exact_editor_apis,
            **bridge_fields,
        }
    result_path.write_text(json.dumps(result, indent=2, sort_keys=True), encoding="utf-8")
    return 0


if __name__ == "__main__":
    main()
