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

    payload = json.loads(Path(args.payload).read_text(encoding="utf-8"))
    result_path = Path(args.result)

    try:
        import azlmbr.legacy.general as general  # type: ignore
    except ImportError:
        result_path.write_text(
            json.dumps(
                {
                    "ok": False,
                    "error_code": "EDITOR_BINDINGS_UNAVAILABLE",
                    "message": "level_ensure_open_or_create.py must run inside an O3DE Editor Python Editor Bindings host.",
                },
                indent=2,
                sort_keys=True,
            ),
            encoding="utf-8",
        )
        return 1

    level_path = payload.get("args", {}).get("level_path")
    if not isinstance(level_path, str) or not level_path:
        result_path.write_text(
            json.dumps(
                {
                    "ok": False,
                    "error_code": "LEVEL_PATH_MISSING",
                    "message": "level_path is required.",
                },
                indent=2,
                sort_keys=True,
            ),
            encoding="utf-8",
        )
        return 1

    project_root = Path(payload["project_root"])
    bridge_level = invoke_bridge("EnsureLevelOpen", level_path=level_path)
    bridge_fields = bridge_metadata(bridge_level)
    if bridge_level["bridge_available"]:
        bridge_payload = bridge_level["bridge_payload"]
        if bridge_payload.get("success") is not True:
            result_path.write_text(
                json.dumps(
                    {
                        "ok": False,
                        "error_code": bridge_fields.get("bridge_error_code")
                        or "BRIDGE_ENSURE_LEVEL_FAILED",
                        "message": bridge_fields.get("bridge_result_summary")
                        or "ControlPlaneEditorBridge EnsureLevelOpen failed.",
                        **bridge_fields,
                    },
                    indent=2,
                    sort_keys=True,
                ),
                encoding="utf-8",
            )
            return 1

        details = bridge_payload.get("details", {})
        operation_result = details.get("ensure_result")
        created_level = operation_result == "created"
        result_path.write_text(
            json.dumps(
                {
                    "ok": True,
                    "message": "Level is loaded for admitted editor automation through the bridge-backed path.",
                    "level_path": details.get("level_path", level_path),
                    "created_level": created_level,
                    "exact_editor_apis": [
                        "ControlPlaneEditorBridgeRequestBus(..., 'EnsureLevelOpen')",
                    ],
                    **bridge_fields,
                },
                indent=2,
                sort_keys=True,
            ),
            encoding="utf-8",
        )
        return 0

    candidate_level_file = project_root / level_path
    created_level = not candidate_level_file.exists()
    if created_level:
        general.create_level_no_prompt(Path(level_path).stem, 1024, 1, False)
    else:
        general.open_level_no_prompt(level_path)
    general.idle_wait(0.1)

    result_path.write_text(
        json.dumps(
            {
                "ok": True,
                "message": "Level is loaded for admitted editor automation.",
                "level_path": level_path,
                "created_level": created_level,
                "exact_editor_apis": [
                    "azlmbr.legacy.general.create_level_no_prompt"
                    if created_level
                    else "azlmbr.legacy.general.open_level_no_prompt",
                    "azlmbr.legacy.general.idle_wait",
                ],
                **bridge_fields,
            },
            indent=2,
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    main()
