from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class O3DETargetConfig(BaseModel):
    project_root: str | None = None
    engine_root: str | None = None
    editor_runner: str | None = None
    runtime_runner: str | None = None
    source_label: str = Field(..., min_length=1)
    project_root_exists: bool = False
    engine_root_exists: bool = False
    editor_runner_exists: bool = False
    runtime_runner_exists: bool = False


class O3DEBridgeQueueCounts(BaseModel):
    inbox: int = 0
    processing: int = 0
    results: int = 0
    deadletter: int = 0


class O3DEBridgeDeadletterSummary(BaseModel):
    bridge_command_id: str = Field(..., min_length=1)
    operation: str | None = None
    error_code: str | None = None
    result_summary: str | None = None
    finished_at: str | None = None
    result_path: str | None = None


class O3DEBridgeCleanupStatus(BaseModel):
    attempted_at: str | None = None
    outcome: str = Field(..., min_length=1)
    min_age_s: int = 0
    deleted_response_count: int = 0
    retained_response_count: int = 0
    deadletter_preserved_count: int = 0


class O3DEBridgeStatus(BaseModel):
    project_root: str | None = None
    project_root_exists: bool = False
    bridge_root: str | None = None
    inbox_path: str | None = None
    processing_path: str | None = None
    results_path: str | None = None
    deadletter_path: str | None = None
    heartbeat_path: str | None = None
    log_path: str | None = None
    source_label: str = Field(..., min_length=1)
    configured: bool = False
    heartbeat_fresh: bool = False
    heartbeat_age_s: float | None = None
    runner_process_active: bool = False
    queue_counts: O3DEBridgeQueueCounts = Field(default_factory=O3DEBridgeQueueCounts)
    heartbeat: dict[str, Any] | None = None
    last_results_cleanup: O3DEBridgeCleanupStatus | None = None
    recent_deadletters: list[O3DEBridgeDeadletterSummary] = Field(default_factory=list)


class O3DEBridgeResultsCleanupResult(BaseModel):
    project_root: str | None = None
    results_path: str | None = None
    deadletter_path: str | None = None
    source_label: str = Field(..., min_length=1)
    configured: bool = False
    min_age_s: int = 0
    queue_counts_before: O3DEBridgeQueueCounts = Field(default_factory=O3DEBridgeQueueCounts)
    queue_counts_after: O3DEBridgeQueueCounts = Field(default_factory=O3DEBridgeQueueCounts)
    deleted_response_count: int = 0
    deleted_response_paths: list[str] = Field(default_factory=list)
    retained_response_count: int = 0
    deadletter_preserved_count: int = 0
