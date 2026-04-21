from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RunStatus(str, Enum):
    PENDING = "pending"
    WAITING_APPROVAL = "waiting_approval"
    BLOCKED = "blocked"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    REJECTED = "rejected"
    FAILED = "failed"


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class EventSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class ExecutionStatus(str, Enum):
    PENDING = "pending"
    WAITING_APPROVAL = "waiting_approval"
    BLOCKED = "blocked"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    REJECTED = "rejected"
    FAILED = "failed"


class ToolPolicy(BaseModel):
    agent: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    approval_class: str = Field(..., min_length=1)
    adapter_family: str = Field(..., min_length=1)
    capability_status: str = Field(..., min_length=1)
    real_admission_stage: str = Field(..., min_length=1)
    next_real_requirement: str = Field(..., min_length=1)
    args_schema: str = Field(..., min_length=1)
    result_schema: str = Field(..., min_length=1)
    required_locks: list[str] = Field(default_factory=list)
    risk: str = Field(..., min_length=1)
    requires_approval: bool
    supports_dry_run: bool = True
    execution_mode: str = Field(default="simulated", min_length=1)


class RunRecord(BaseModel):
    id: str = Field(..., min_length=1)
    request_id: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    status: RunStatus
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    dry_run: bool = False
    approval_id: str | None = None
    approval_token: str | None = None
    requested_locks: list[str] = Field(default_factory=list)
    granted_locks: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    execution_mode: str = Field(default="simulated", min_length=1)
    result_summary: str | None = None


class ApprovalRecord(BaseModel):
    id: str = Field(..., min_length=1)
    run_id: str = Field(..., min_length=1)
    request_id: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    approval_class: str = Field(..., min_length=1)
    status: ApprovalStatus = ApprovalStatus.PENDING
    reason: str | None = None
    token: str = Field(..., min_length=1)
    created_at: datetime = Field(default_factory=utc_now)
    decided_at: datetime | None = None


class LockRecord(BaseModel):
    name: str = Field(..., min_length=1)
    owner_run_id: str = Field(..., min_length=1)
    created_at: datetime = Field(default_factory=utc_now)


class EventRecord(BaseModel):
    id: str = Field(..., min_length=1)
    run_id: str | None = None
    execution_id: str | None = None
    executor_id: str | None = None
    workspace_id: str | None = None
    category: str = Field(..., min_length=1)
    event_type: str | None = None
    severity: EventSeverity
    message: str = Field(..., min_length=1)
    created_at: datetime = Field(default_factory=utc_now)
    previous_state: str | None = None
    current_state: str | None = None
    failure_category: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class ExecutionRecord(BaseModel):
    id: str = Field(..., min_length=1)
    run_id: str = Field(..., min_length=1)
    request_id: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    execution_mode: str = Field(default="simulated", min_length=1)
    status: ExecutionStatus
    started_at: datetime = Field(default_factory=utc_now)
    finished_at: datetime | None = None
    warnings: list[str] = Field(default_factory=list)
    logs: list[str] = Field(default_factory=list)
    artifact_ids: list[str] = Field(default_factory=list)
    executor_id: str | None = None
    workspace_id: str | None = None
    runner_family: str | None = None
    execution_attempt_state: str | None = None
    failure_category: str | None = None
    failure_stage: str | None = None
    approval_class: str | None = None
    lock_scope: str | None = None
    backup_class: str | None = None
    rollback_class: str | None = None
    retention_class: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)
    result_summary: str | None = None


class ArtifactRecord(BaseModel):
    id: str = Field(..., min_length=1)
    run_id: str = Field(..., min_length=1)
    execution_id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    kind: str = Field(..., min_length=1)
    uri: str = Field(..., min_length=1)
    path: str | None = None
    content_type: str | None = None
    simulated: bool = True
    created_at: datetime = Field(default_factory=utc_now)
    artifact_role: str | None = None
    executor_id: str | None = None
    workspace_id: str | None = None
    retention_class: str | None = None
    evidence_completeness: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ExecutorRecord(BaseModel):
    id: str = Field(..., min_length=1)
    executor_kind: str = Field(..., min_length=1)
    executor_label: str = Field(..., min_length=1)
    executor_host_label: str = Field(..., min_length=1)
    execution_mode_class: str = Field(..., min_length=1)
    availability_state: str = Field(..., min_length=1)
    supported_runner_families: list[str] = Field(default_factory=list)
    capability_snapshot: dict[str, Any] = Field(default_factory=dict)
    last_heartbeat_at: datetime | None = None
    last_failure_summary: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class WorkspaceRecord(BaseModel):
    id: str = Field(..., min_length=1)
    workspace_kind: str = Field(..., min_length=1)
    workspace_root: str = Field(..., min_length=1)
    workspace_state: str = Field(..., min_length=1)
    cleanup_policy: str = Field(..., min_length=1)
    retention_class: str = Field(..., min_length=1)
    engine_binding: dict[str, Any] = Field(default_factory=dict)
    project_binding: dict[str, Any] = Field(default_factory=dict)
    runner_family: str = Field(..., min_length=1)
    owner_run_id: str | None = None
    owner_execution_id: str | None = None
    owner_executor_id: str | None = None
    created_at: datetime = Field(default_factory=utc_now)
    activated_at: datetime | None = None
    completed_at: datetime | None = None
    cleaned_at: datetime | None = None
    last_failure_summary: str | None = None
