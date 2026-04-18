from datetime import datetime, timezone
from enum import Enum

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


class ToolPolicy(BaseModel):
    agent: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    approval_class: str = Field(..., min_length=1)
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
    category: str = Field(..., min_length=1)
    severity: EventSeverity
    message: str = Field(..., min_length=1)
    created_at: datetime = Field(default_factory=utc_now)
    details: dict[str, str] = Field(default_factory=dict)
