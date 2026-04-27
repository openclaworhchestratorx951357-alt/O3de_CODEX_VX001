import json
from pathlib import Path, PureWindowsPath
from typing import Any


ASSET_READBACK_READY = "ready_for_asset_source_inspect"
KNOWN_O3DE_PLATFORM_CACHE_NAMES = {
    "android",
    "ios",
    "linux",
    "mac",
    "pc",
    "server",
    "windows",
}


def discover_project_asset_readback_inputs(
    *,
    project_root: str,
    source_asset_path: str | None,
    selected_platform: str | None = None,
    check_source_asset: bool = True,
) -> dict[str, Any]:
    """Discover read-only project inputs for Phase 9 asset readback."""

    result: dict[str, Any] = {
        "project_root": None,
        "project_json_path": None,
        "project_name": None,
        "cache_path": None,
        "asset_database_path": None,
        "available_platforms": [],
        "selected_platform": selected_platform,
        "asset_catalog_path": None,
        "original_source_path": None,
        "normalized_source_path": None,
        "source_asset_path": None,
        "source_asset_path_relative": None,
        "read_only": True,
        "mutation_occurred": False,
        "readiness_status": ASSET_READBACK_READY,
        "blocked_reason": None,
    }

    root_input = str(project_root or "").strip()
    if not root_input:
        return _blocked(result, "project_root_missing", "No project_root was provided.")

    resolved_project_root = Path(root_input).expanduser().resolve()
    result["project_root"] = str(resolved_project_root)
    if not resolved_project_root.exists() or not resolved_project_root.is_dir():
        return _blocked(
            result,
            "project_root_missing",
            "The requested project_root does not exist or is not a directory.",
        )

    project_json_path = resolved_project_root / "project.json"
    result["project_json_path"] = str(project_json_path)
    if not project_json_path.is_file():
        return _blocked(
            result,
            "project_json_missing",
            "The project root does not contain project.json.",
        )

    try:
        project_json = json.loads(project_json_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return _blocked(
            result,
            "schema_mismatch",
            f"project.json could not be read as valid JSON: {exc}",
        )
    if isinstance(project_json, dict):
        project_name = project_json.get("project_name") or project_json.get("projectName")
        if isinstance(project_name, str) and project_name.strip():
            result["project_name"] = project_name.strip()

    cache_path = resolved_project_root / "Cache"
    result["cache_path"] = str(cache_path)
    if not cache_path.is_dir():
        return _blocked(
            result,
            "asset_cache_missing",
            "The project root does not contain a Cache directory.",
        )

    asset_database_path = cache_path / "assetdb.sqlite"
    result["asset_database_path"] = str(asset_database_path)
    if not asset_database_path.is_file():
        return _blocked(
            result,
            "asset_database_missing",
            "The project Cache directory does not contain assetdb.sqlite.",
        )

    selected_platform_name = (
        str(selected_platform).strip()
        if selected_platform is not None and str(selected_platform).strip()
        else None
    )
    available_platforms = sorted(
        child.name
        for child in cache_path.iterdir()
        if _is_platform_cache_dir(child, selected_platform=selected_platform_name)
    )
    result["available_platforms"] = available_platforms
    platform = _select_platform(
        cache_path=cache_path,
        available_platforms=available_platforms,
        selected_platform=selected_platform_name,
    )
    result["selected_platform"] = platform
    if platform is None:
        return _blocked(
            result,
            "platform_cache_missing",
            "No platform cache directory was found under Cache.",
        )
    if platform not in available_platforms:
        return _blocked(
            result,
            "platform_cache_missing",
            f"The selected platform cache directory '{platform}' was not found.",
        )

    asset_catalog_path = cache_path / platform / "assetcatalog.xml"
    result["asset_catalog_path"] = str(asset_catalog_path)
    if not asset_catalog_path.is_file():
        return _blocked(
            result,
            "asset_catalog_missing",
            f"The selected platform cache does not contain {platform}/assetcatalog.xml.",
        )

    if not check_source_asset:
        return _blocked(
            result,
            "source_asset_not_checked_yet",
            "Source asset path checking was not requested for this discovery pass.",
        )

    source_input = str(source_asset_path or "").strip()
    if not source_input:
        return _blocked(
            result,
            "source_asset_path_missing",
            "No source_asset_path was provided.",
        )
    result["original_source_path"] = source_input

    try:
        resolved_source_path = _resolve_source_path(
            project_root=resolved_project_root,
            source_asset_path=source_input,
        )
    except ValueError:
        return _blocked(
            result,
            "source_asset_path_escapes_project",
            "The requested source_asset_path resolves outside the project root.",
        )
    result["source_asset_path"] = str(resolved_source_path)
    try:
        normalized_source_path = str(
            resolved_source_path.relative_to(resolved_project_root)
        ).replace("\\", "/")
        result["normalized_source_path"] = normalized_source_path
        result["source_asset_path_relative"] = normalized_source_path
    except ValueError:
        return _blocked(
            result,
            "source_asset_path_escapes_project",
            "The requested source_asset_path resolves outside the project root.",
        )

    if not resolved_source_path.is_file():
        return _blocked(
            result,
            "source_asset_path_missing",
            "The requested source_asset_path does not exist as a file.",
        )

    return result


def _blocked(result: dict[str, Any], status: str, reason: str) -> dict[str, Any]:
    result["readiness_status"] = status
    result["blocked_reason"] = reason
    return result


def _select_platform(
    *,
    cache_path: Path,
    available_platforms: list[str],
    selected_platform: str | None,
) -> str | None:
    if selected_platform is not None and str(selected_platform).strip():
        return str(selected_platform).strip()
    platforms_with_catalog = [
        platform
        for platform in available_platforms
        if (cache_path / platform / "assetcatalog.xml").is_file()
    ]
    if platforms_with_catalog:
        return platforms_with_catalog[0]
    if available_platforms:
        return available_platforms[0]
    return None


def _is_platform_cache_dir(path: Path, *, selected_platform: str | None) -> bool:
    if not path.is_dir() or path.name.startswith("."):
        return False
    if selected_platform is not None and path.name == selected_platform:
        return True
    if path.name.casefold() in KNOWN_O3DE_PLATFORM_CACHE_NAMES:
        return True
    return (path / "assetcatalog.xml").is_file()


def _resolve_source_path(*, project_root: Path, source_asset_path: str) -> Path:
    native_candidate = Path(source_asset_path).expanduser()
    if native_candidate.is_absolute():
        return native_candidate.resolve()

    windows_candidate = PureWindowsPath(source_asset_path)
    if windows_candidate.drive or windows_candidate.root:
        raise ValueError("Windows absolute source asset paths are not project-relative.")

    normalized_source_asset_path = source_asset_path.replace("\\", "/")
    safe_parts = []
    for part in normalized_source_asset_path.split("/"):
        if part in {"", "."}:
            continue
        if part == "..":
            raise ValueError("Source asset path traversal is not allowed.")
        safe_parts.append(part)
    return project_root.joinpath(*safe_parts).resolve()
