from typing import Any

from pydantic import BaseModel, Field

from app.models.prompt_safety import (
    PromptSafetyEnvelope,
    default_prompt_safety_envelope,
)


class PromptPlanStep(BaseModel):
    step_id: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1)
    args: dict[str, Any] = Field(default_factory=dict)
    approval_class: str = Field(..., min_length=1)
    required_locks: list[str] = Field(default_factory=list)
    capability_status_required: str = Field(..., min_length=1)
    workspace_id: str | None = None
    executor_id: str | None = None
    simulated_allowed: bool = False
    depends_on: list[str] = Field(default_factory=list)
    capability_maturity: str = Field(..., min_length=1)
    safety_envelope: PromptSafetyEnvelope = Field(default_factory=default_prompt_safety_envelope)
    planner_note: str | None = None
