import json
from pathlib import Path
from tempfile import TemporaryDirectory

from app.services.asset_readback_discovery import (
    ASSET_READBACK_READY,
    discover_project_asset_readback_inputs,
)


def make_project_fixture(
    project_root: Path,
    *,
    include_project_json: bool = True,
    include_cache: bool = True,
    include_assetdb: bool = True,
    include_platform: bool = True,
    include_catalog: bool = True,
    include_source: bool = True,
) -> None:
    project_root.mkdir(parents=True, exist_ok=True)
    if include_project_json:
        (project_root / "project.json").write_text(
            json.dumps({"project_name": "McpSandbox"}),
            encoding="utf-8",
        )
    if not include_cache:
        return
    cache_path = project_root / "Cache"
    cache_path.mkdir(parents=True, exist_ok=True)
    if include_assetdb:
        (cache_path / "assetdb.sqlite").write_bytes(b"sqlite-fixture")
    if include_platform:
        platform_path = cache_path / "pc"
        platform_path.mkdir(parents=True, exist_ok=True)
        if include_catalog:
            (platform_path / "assetcatalog.xml").write_bytes(
                b"levels/bridgelevel01/bridgelevel01.spawnable"
            )
    if include_source:
        source_path = project_root / "Levels" / "BridgeLevel01" / "BridgeLevel01.prefab"
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_text("prefab-fixture", encoding="utf-8")


def list_files(project_root: Path) -> set[str]:
    return {
        str(path.relative_to(project_root)).replace("\\", "/")
        for path in project_root.rglob("*")
        if path.is_file()
    }


def test_valid_mcpsandbox_style_project_root_returns_ready_state() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path="Levels/BridgeLevel01/BridgeLevel01.prefab",
        )

        assert result["readiness_status"] == ASSET_READBACK_READY
        assert result["blocked_reason"] is None
        assert result["project_name"] == "McpSandbox"
        assert result["cache_path"] == str(project_root / "Cache")
        assert result["asset_database_path"] == str(
            project_root / "Cache" / "assetdb.sqlite"
        )
        assert result["available_platforms"] == ["pc"]
        assert result["selected_platform"] == "pc"
        assert result["asset_catalog_path"] == str(
            project_root / "Cache" / "pc" / "assetcatalog.xml"
        )
        assert result["source_asset_path_relative"] == (
            "Levels/BridgeLevel01/BridgeLevel01.prefab"
        )
        assert result["original_source_path"] == (
            "Levels/BridgeLevel01/BridgeLevel01.prefab"
        )
        assert result["normalized_source_path"] == (
            "Levels/BridgeLevel01/BridgeLevel01.prefab"
        )
        assert result["read_only"] is True
        assert result["mutation_occurred"] is False


def test_missing_project_root_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        result = discover_project_asset_readback_inputs(
            project_root=str(Path(temp_dir) / "missing"),
            source_asset_path="Levels/BridgeLevel01/BridgeLevel01.prefab",
        )

        assert result["readiness_status"] == "project_root_missing"
        assert result["mutation_occurred"] is False


def test_missing_project_json_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root, include_project_json=False)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path="Levels/BridgeLevel01/BridgeLevel01.prefab",
        )

        assert result["readiness_status"] == "project_json_missing"


def test_missing_cache_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root, include_cache=False)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path="Levels/BridgeLevel01/BridgeLevel01.prefab",
        )

        assert result["readiness_status"] == "asset_cache_missing"


def test_missing_asset_database_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root, include_assetdb=False)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path="Levels/BridgeLevel01/BridgeLevel01.prefab",
        )

        assert result["readiness_status"] == "asset_database_missing"


def test_missing_platform_catalog_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root, include_catalog=False)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path="Levels/BridgeLevel01/BridgeLevel01.prefab",
            selected_platform="pc",
        )

        assert result["readiness_status"] == "asset_catalog_missing"
        assert result["selected_platform"] == "pc"


def test_missing_selected_platform_cache_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path="Levels/BridgeLevel01/BridgeLevel01.prefab",
            selected_platform="linux",
        )

        assert result["readiness_status"] == "platform_cache_missing"
        assert result["selected_platform"] == "linux"


def test_unsafe_source_path_escaping_project_root_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path="../outside.prefab",
        )

        assert result["readiness_status"] == "source_asset_path_escapes_project"


def test_windows_style_traversal_source_path_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path=r"..\outside.prefab",
        )

        assert result["readiness_status"] == "source_asset_path_escapes_project"


def test_windows_style_source_path_normalization_works() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path=r"Levels\BridgeLevel01\BridgeLevel01.prefab",
        )

        assert result["readiness_status"] == ASSET_READBACK_READY
        assert result["original_source_path"] == (
            r"Levels\BridgeLevel01\BridgeLevel01.prefab"
        )
        assert result["normalized_source_path"] == (
            "Levels/BridgeLevel01/BridgeLevel01.prefab"
        )
        assert result["source_asset_path_relative"] == (
            "Levels/BridgeLevel01/BridgeLevel01.prefab"
        )


def test_mixed_separator_source_path_normalization_works() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path=r"Levels\BridgeLevel01/BridgeLevel01.prefab",
        )

        assert result["readiness_status"] == ASSET_READBACK_READY
        assert result["normalized_source_path"] == (
            "Levels/BridgeLevel01/BridgeLevel01.prefab"
        )


def test_windows_absolute_source_path_outside_project_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path=r"C:\outside\BridgeLevel01.prefab",
        )

        assert result["readiness_status"] == "source_asset_path_escapes_project"


def test_source_asset_not_checked_state_is_explicit() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path="Levels/BridgeLevel01/BridgeLevel01.prefab",
            check_source_asset=False,
        )

        assert result["readiness_status"] == "source_asset_not_checked_yet"


def test_source_asset_path_missing_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path="",
        )

        assert result["readiness_status"] == "source_asset_path_missing"


def test_missing_windows_style_source_asset_path_blocks() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path=r"Levels\BridgeLevel01\Missing.prefab",
        )

        assert result["readiness_status"] == "source_asset_path_missing"
        assert result["normalized_source_path"] == (
            "Levels/BridgeLevel01/Missing.prefab"
        )


def test_discovery_does_not_write_files() -> None:
    with TemporaryDirectory(ignore_cleanup_errors=True) as temp_dir:
        project_root = Path(temp_dir) / "McpSandbox"
        make_project_fixture(project_root)
        files_before = list_files(project_root)

        result = discover_project_asset_readback_inputs(
            project_root=str(project_root),
            source_asset_path="Levels/BridgeLevel01/BridgeLevel01.prefab",
        )

        assert result["readiness_status"] == ASSET_READBACK_READY
        assert list_files(project_root) == files_before
