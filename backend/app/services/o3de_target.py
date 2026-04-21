from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from pathlib import Path

from app.models.o3de_target import (
    O3DEBridgeCleanupStatus,
    O3DEBridgeQueueCounts,
    O3DEBridgeResultsCleanupResult,
    O3DEBridgeStatus,
    O3DETargetConfig,
)
from app.services.editor_automation_runtime import editor_automation_runtime_service

BRIDGE_STATUS_SOURCE_LABEL = "project-local-control-plane-editor-bridge"
BRIDGE_RESULTS_CLEANUP_SOURCE_LABEL = "operator-invoked-bridge-results-cleanup"


def _read_env(name: str) -> str | None:
    value = os.getenv(name, "").strip()
    return value or None


def _path_exists(value: str | None) -> bool:
    if not value:
        return False
    return Path(value).expanduser().exists()


def _path_is_file(value: str | None) -> bool:
    if not value:
        return False
    return Path(value).expanduser().is_file()


class O3DETargetService:
    def __init__(self) -> None:
        self._last_results_cleanup_by_project_root: dict[str, O3DEBridgeCleanupStatus] = {}

    def get_local_target(self) -> O3DETargetConfig:
        project_root = _read_env("O3DE_TARGET_PROJECT_ROOT")
        engine_root = _read_env("O3DE_TARGET_ENGINE_ROOT")
        editor_runner = _read_env("O3DE_TARGET_EDITOR_RUNNER")
        runtime_runner = _read_env("O3DE_EDITOR_SCRIPT_RUNNER")

        return O3DETargetConfig(
            project_root=project_root,
            engine_root=engine_root,
            editor_runner=editor_runner,
            runtime_runner=runtime_runner or editor_runner,
            source_label="repo-configured-local-target",
            project_root_exists=_path_exists(project_root),
            engine_root_exists=_path_exists(engine_root),
            editor_runner_exists=_path_is_file(editor_runner),
            runtime_runner_exists=_path_is_file(runtime_runner or editor_runner),
        )

    def get_bridge_status(self) -> O3DEBridgeStatus:
        project_root = _read_env("O3DE_TARGET_PROJECT_ROOT")
        if not project_root:
            return O3DEBridgeStatus(source_label=BRIDGE_STATUS_SOURCE_LABEL)

        bridge_paths = editor_automation_runtime_service._bridge_paths(project_root)  # noqa: SLF001
        return O3DEBridgeStatus(
            project_root=project_root,
            project_root_exists=_path_exists(project_root),
            bridge_root=str(bridge_paths["root"]),
            inbox_path=str(bridge_paths["inbox"]),
            processing_path=str(bridge_paths["processing"]),
            results_path=str(bridge_paths["results"]),
            deadletter_path=str(bridge_paths["deadletter"]),
            heartbeat_path=str(bridge_paths["heartbeat_file"]),
            log_path=str(bridge_paths["logs"] / "control_plane_bridge.log"),
            source_label=BRIDGE_STATUS_SOURCE_LABEL,
            configured=True,
            heartbeat_fresh=editor_automation_runtime_service._bridge_is_healthy(project_root),  # noqa: SLF001
            queue_counts=O3DEBridgeQueueCounts(
                **editor_automation_runtime_service._bridge_queue_counts(project_root)  # noqa: SLF001
            ),
            heartbeat=editor_automation_runtime_service._read_bridge_heartbeat(project_root),  # noqa: SLF001
            last_results_cleanup=self._last_results_cleanup_by_project_root.get(project_root),
            recent_deadletters=editor_automation_runtime_service._recent_bridge_deadletters(project_root),  # noqa: SLF001
        )

    def cleanup_stale_bridge_results(
        self,
        *,
        min_age_s: int = 300,
    ) -> O3DEBridgeResultsCleanupResult:
        normalized_min_age_s = max(int(min_age_s), 0)
        project_root = _read_env("O3DE_TARGET_PROJECT_ROOT")
        if not project_root:
            return O3DEBridgeResultsCleanupResult(
                source_label=BRIDGE_RESULTS_CLEANUP_SOURCE_LABEL,
                min_age_s=normalized_min_age_s,
            )

        bridge_paths = editor_automation_runtime_service._bridge_paths(project_root)  # noqa: SLF001
        queue_counts_before = O3DEBridgeQueueCounts(
            **editor_automation_runtime_service._bridge_queue_counts(project_root)  # noqa: SLF001
        )

        deleted_response_paths: list[str] = []
        retained_response_count = 0
        cutoff_epoch_s = time.time() - normalized_min_age_s
        results_dir = bridge_paths["results"]
        if results_dir.is_dir():
            for result_path in sorted(results_dir.glob("*.json.resp")):
                try:
                    is_stale = result_path.stat().st_mtime <= cutoff_epoch_s
                except OSError:
                    retained_response_count += 1
                    continue
                if not is_stale:
                    retained_response_count += 1
                    continue
                try:
                    result_path.unlink()
                except OSError:
                    retained_response_count += 1
                    continue
                deleted_response_paths.append(str(result_path))

        queue_counts_after = O3DEBridgeQueueCounts(
            **editor_automation_runtime_service._bridge_queue_counts(project_root)  # noqa: SLF001
        )
        cleanup_result = O3DEBridgeResultsCleanupResult(
            project_root=project_root,
            results_path=str(bridge_paths["results"]),
            deadletter_path=str(bridge_paths["deadletter"]),
            source_label=BRIDGE_RESULTS_CLEANUP_SOURCE_LABEL,
            configured=True,
            min_age_s=normalized_min_age_s,
            queue_counts_before=queue_counts_before,
            queue_counts_after=queue_counts_after,
            deleted_response_count=len(deleted_response_paths),
            deleted_response_paths=deleted_response_paths,
            retained_response_count=retained_response_count,
            deadletter_preserved_count=queue_counts_after.deadletter,
        )
        self._last_results_cleanup_by_project_root[project_root] = O3DEBridgeCleanupStatus(
            attempted_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            outcome="stale-results-removed"
            if cleanup_result.deleted_response_count > 0
            else "no-stale-results-removed",
            min_age_s=cleanup_result.min_age_s,
            deleted_response_count=cleanup_result.deleted_response_count,
            retained_response_count=cleanup_result.retained_response_count,
            deadletter_preserved_count=cleanup_result.deadletter_preserved_count,
        )
        return cleanup_result


o3de_target_service = O3DETargetService()
