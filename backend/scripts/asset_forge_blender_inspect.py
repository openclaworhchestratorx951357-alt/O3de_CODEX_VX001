#!/usr/bin/env python
"""Read-only model inspection helper for Asset Forge Packet 06.

This script is intentionally narrow:
- accepts a single artifact path
- reads file metadata and lightweight format details only
- performs no write operations and does not invoke Blender
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _inspect_obj(path: Path) -> dict[str, Any]:
    vertex_count = 0
    normal_count = 0
    uv_count = 0
    face_count = 0
    object_markers = 0
    group_markers = 0
    material_uses = 0
    material_libraries = 0

    with path.open("r", encoding="utf-8", errors="ignore") as stream:
        for raw_line in stream:
            line = raw_line.lstrip()
            if line.startswith("v "):
                vertex_count += 1
            elif line.startswith("vn "):
                normal_count += 1
            elif line.startswith("vt "):
                uv_count += 1
            elif line.startswith("f "):
                face_count += 1
            elif line.startswith("o "):
                object_markers += 1
            elif line.startswith("g "):
                group_markers += 1
            elif line.startswith("usemtl "):
                material_uses += 1
            elif line.startswith("mtllib "):
                material_libraries += 1

    return {
        "format": "obj",
        "vertices": vertex_count,
        "normals": normal_count,
        "uvs": uv_count,
        "faces": face_count,
        "object_markers": object_markers,
        "group_markers": group_markers,
        "material_uses": material_uses,
        "material_libraries": material_libraries,
    }


def _inspect_gltf(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {
        "format": "gltf",
        "meshes": len(payload.get("meshes", [])),
        "materials": len(payload.get("materials", [])),
        "nodes": len(payload.get("nodes", [])),
        "animations": len(payload.get("animations", [])),
        "scenes": len(payload.get("scenes", [])),
    }


def inspect_artifact(artifact_path: Path) -> dict[str, Any]:
    extension = artifact_path.suffix.lower()
    summary: dict[str, Any] = {"format": extension.lstrip(".")}
    warnings: list[str] = []

    if extension == ".obj":
        summary = _inspect_obj(artifact_path)
    elif extension == ".gltf":
        summary = _inspect_gltf(artifact_path)
    elif extension in {".glb", ".fbx", ".blend"}:
        warnings.append(
            f"Detailed parsing for {extension} is not enabled in Packet 06; metadata-only inspection was applied."
        )
    else:
        warnings.append(f"Unsupported extension {extension}; metadata-only inspection was applied.")

    return {
        "inspector_id": "asset_forge_blender_readonly_inspector_v1",
        "artifact_path": str(artifact_path),
        "extension": extension,
        "file_size_bytes": artifact_path.stat().st_size,
        "file_sha256": _sha256(artifact_path),
        "parse_summary": summary,
        "warnings": warnings,
        "blender_invocation": "blocked",
        "read_only": True,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-path", required=True)
    args = parser.parse_args()

    artifact_path = Path(args.artifact_path).resolve()
    if not artifact_path.is_file():
        raise FileNotFoundError(f"Artifact does not exist: {artifact_path}")

    report = inspect_artifact(artifact_path)
    print(json.dumps(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
