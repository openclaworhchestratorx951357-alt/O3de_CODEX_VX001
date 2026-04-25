from __future__ import annotations

import argparse
import json
from pathlib import Path

from _control_plane_editor_bridge import invoke_bridge


def write_result(result_path: Path, payload: dict[str, object]) -> int:
    result_path.write_text(
        json.dumps(payload, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    return 0 if payload.get("success") is True else 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--payload", required=True)
    parser.add_argument("--result", required=True)
    parser.add_argument("--script", required=False)
    args = parser.parse_args()

    payload = json.loads(Path(args.payload).read_text(encoding="utf-8"))
    result_path = Path(args.result)
    operation = payload.get("args", {}).get("operation")
    if not isinstance(operation, str) or not operation:
        return write_result(
            result_path,
            {
                "success": False,
                "operation": "unknown",
                "bridge_name": "ControlPlaneEditorBridge",
                "bridge_version": None,
                "bridge_contract_version": "v0.1",
                "result_summary": "bridge_invoke.py requires args.operation.",
                "error_code": "BRIDGE_OPERATION_MISSING",
                "details": {
                    "bridge_module_loaded": False,
                },
            },
        )

    bridge_result = invoke_bridge(
        operation,
        level_path=payload.get("args", {}).get("level_path"),
        entity_name=payload.get("args", {}).get("entity_name"),
    )
    return write_result(
        result_path,
        bridge_result["bridge_payload"],
    )


if __name__ == "__main__":
    raise SystemExit(main())
