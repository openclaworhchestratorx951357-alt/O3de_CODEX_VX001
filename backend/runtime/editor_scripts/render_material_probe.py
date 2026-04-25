from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from _control_plane_editor_bridge import bridge_metadata, invoke_bridge


def write_result(result_path: Path, payload: dict[str, Any]) -> int:
    result_path.write_text(
        json.dumps(payload, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--payload", required=True)
    parser.add_argument("--result", required=True)
    args = parser.parse_args()

    payload = json.loads(Path(args.payload).read_text(encoding="utf-8"))
    result_path = Path(args.result)
    request_args = payload.get("args", {})
    bridge_result = invoke_bridge("GetEditorContext")
    bridge_payload = bridge_result.get("bridge_payload", {})
    bridge_details = (
        bridge_payload.get("details", {})
        if isinstance(bridge_payload, dict)
        else {}
    )
    if not isinstance(bridge_details, dict):
        bridge_details = {}

    runtime_available = bool(bridge_result.get("bridge_available"))
    active_level_path = bridge_details.get("active_level_path")
    return write_result(
        result_path,
        {
            "ok": True,
            "message": (
                "Material inspection substrate probe completed against the admitted editor runtime path."
                if runtime_available
                else "Material inspection substrate probe completed, but runtime material support remains unavailable in this editor context."
            ),
            "runtime_probe_attempted": True,
            "runtime_probe_method": "editor-runtime-get-context",
            "runtime_available": runtime_available,
            "material_inspection_requested": True,
            "material_inspection_attempted": False,
            "material_runtime_mode": "runtime-probe-only",
            "material_operation_available": False,
            "material_evidence_produced": False,
            "material_evidence_path": None,
            "material_unavailable_reason": (
                "No admitted real material inspection path is available in this slice."
            ),
            "material_path": request_args.get("material_path"),
            "include_shader_data_requested": bool(request_args.get("include_shader_data")),
            "include_references_requested": bool(request_args.get("include_references")),
            "active_level_path": active_level_path if isinstance(active_level_path, str) else None,
            "exact_editor_apis": (
                ["ControlPlaneEditorBridgeRequestBus.GetEditorContext"]
                if runtime_available
                else ["editor-runtime-launch"]
            ),
            **bridge_metadata(bridge_result),
        },
    )


if __name__ == "__main__":
    raise SystemExit(main())
