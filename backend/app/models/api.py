from pydantic import BaseModel, Field

from app.models.control_plane import (
    ApprovalRecord,
    ArtifactRecord,
    EventRecord,
    ExecutionRecord,
    LockRecord,
    RunRecord,
    ToolPolicy,
)


class RootStatus(BaseModel):
    name: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1)
    execution_mode: str = Field(..., min_length=1)
    routes: list[str] = Field(default_factory=list)
    phase: str = Field(..., min_length=1)


class HealthStatus(BaseModel):
    ok: bool
    service: str = Field(..., min_length=1)
    version: str = Field(..., min_length=1)


class SchemaValidationStatus(BaseModel):
    mode: str = Field(..., min_length=1)
    schema_scope: str = Field(..., min_length=1)
    supports_request_args: bool
    supports_result_conformance: bool
    active_keywords: list[str] = Field(default_factory=list)
    active_unsupported_keywords: list[str] = Field(default_factory=list)
    active_metadata_keywords: list[str] = Field(default_factory=list)
    supported_keywords: list[str] = Field(default_factory=list)
    supported_refs: list[str] = Field(default_factory=list)
    unsupported_keywords: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class AdapterModeStatus(BaseModel):
    ready: bool
    configured_mode: str = Field(..., min_length=1)
    active_mode: str = Field(..., min_length=1)
    supports_real_execution: bool
    available_families: list[str] = Field(default_factory=list)
    warning: str | None = None
    notes: list[str] = Field(default_factory=list)


class ReadinessStatus(BaseModel):
    ok: bool
    service: str = Field(..., min_length=1)
    execution_mode: str = Field(..., min_length=1)
    persistence_ready: bool
    requested_database_strategy: str = Field(..., min_length=1)
    database_strategy: str = Field(..., min_length=1)
    database_path: str = Field(..., min_length=1)
    persistence_warning: str | None = None
    attempted_database_paths: list[str] = Field(default_factory=list)
    adapter_mode: AdapterModeStatus
    schema_validation: SchemaValidationStatus
    dependencies: list[str] = Field(default_factory=list)


class VersionStatus(BaseModel):
    service: str = Field(..., min_length=1)
    version: str = Field(..., min_length=1)
    api_version: str = Field(..., min_length=1)


class RunsResponse(BaseModel):
    runs: list[RunRecord] = Field(default_factory=list)


class ApprovalsResponse(BaseModel):
    approvals: list[ApprovalRecord] = Field(default_factory=list)


class LocksResponse(BaseModel):
    locks: list[LockRecord] = Field(default_factory=list)


class EventsResponse(BaseModel):
    events: list[EventRecord] = Field(default_factory=list)


class PoliciesResponse(BaseModel):
    policies: list[ToolPolicy] = Field(default_factory=list)


class ExecutionsResponse(BaseModel):
    executions: list[ExecutionRecord] = Field(default_factory=list)


class ArtifactsResponse(BaseModel):
    artifacts: list[ArtifactRecord] = Field(default_factory=list)


class ApprovalDecisionRequest(BaseModel):
    reason: str | None = None
