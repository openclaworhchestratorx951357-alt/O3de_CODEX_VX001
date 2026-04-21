from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

from app.models.prompt_plan import PromptPlan


def prompt_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PromptSessionStatus(str, Enum):
    PLANNED = "planned"
    REFUSED = "refused"
    RUNNING = "running"
    WAITING_APPROVAL = "waiting_approval"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"


class PromptRequest(BaseModel):
    prompt_id: str = Field(..., min_length=1)
    prompt_text: str = Field(..., min_length=1)
    project_root: str = Field(..., min_length=1)
    engine_root: str = Field(..., min_length=1)
    workspace_id: str | None = None
    executor_id: str | None = None
    dry_run: bool = False
    preferred_domains: list[str] = Field(default_factory=list)
    operator_note: str | None = None


class PromptCapabilityEntry(BaseModel):
    tool_name: str = Field(..., min_length=1)
    agent_family: str = Field(..., min_length=1)
    args_schema: str = Field(..., min_length=1)
    result_schema: str = Field(..., min_length=1)
    persisted_execution_details_schema: str | None = None
    persisted_artifact_metadata_schema: str | None = None
    approval_class: str = Field(..., min_length=1)
    default_locks: list[str] = Field(default_factory=list)
    capability_maturity: str = Field(..., min_length=1)
    capability_status: str = Field(..., min_length=1)
    real_admission_stage: str = Field(..., min_length=1)
    planner_intent_aliases: list[str] = Field(default_factory=list)
    natural_language_affordances: list[str] = Field(default_factory=list)
    allowlisted_parameter_surfaces: list[str] = Field(default_factory=list)
    real_adapter_availability: bool
    dry_run_availability: bool
    simulation_fallback_availability: bool


class PromptCapabilitiesResponse(BaseModel):
    capabilities: list[PromptCapabilityEntry] = Field(default_factory=list)


class PromptSessionRecord(BaseModel):
    prompt_id: str = Field(..., min_length=1)
    plan_id: str = Field(..., min_length=1)
    status: PromptSessionStatus
    prompt_text: str = Field(..., min_length=1)
    project_root: str = Field(..., min_length=1)
    engine_root: str = Field(..., min_length=1)
    dry_run: bool = False
    preferred_domains: list[str] = Field(default_factory=list)
    operator_note: str | None = None
    child_run_ids: list[str] = Field(default_factory=list)
    child_execution_ids: list[str] = Field(default_factory=list)
    child_artifact_ids: list[str] = Field(default_factory=list)
    child_event_ids: list[str] = Field(default_factory=list)
    workspace_id: str | None = None
    executor_id: str | None = None
    plan_summary: str | None = None
    evidence_summary: str | None = None
    admitted_capabilities: list[str] = Field(default_factory=list)
    refused_capabilities: list[str] = Field(default_factory=list)
    final_result_summary: str | None = None
    next_step_index: int = Field(default=0, ge=0)
    current_step_id: str | None = None
    pending_approval_id: str | None = None
    pending_approval_token: str | None = None
    last_error_code: str | None = None
    last_error_retryable: bool = False
    step_attempts: dict[str, int] = Field(default_factory=dict)
    plan: PromptPlan | None = None
    latest_child_responses: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=prompt_utc_now)
    updated_at: datetime = Field(default_factory=prompt_utc_now)


class PromptSessionsResponse(BaseModel):
    sessions: list[PromptSessionRecord] = Field(default_factory=list)
