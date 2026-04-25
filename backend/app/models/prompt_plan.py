from pydantic import BaseModel, Field

from app.models.prompt_step import PromptPlanStep


class PromptPlan(BaseModel):
    prompt_id: str = Field(..., min_length=1)
    plan_id: str = Field(..., min_length=1)
    schema_version: str = Field(default="v0.1", min_length=1)
    admitted: bool
    refusal_reason: str | None = None
    summary: str = Field(..., min_length=1)
    steps: list[PromptPlanStep] = Field(default_factory=list)
    refused_capabilities: list[str] = Field(default_factory=list)
    capability_requirements: list[str] = Field(default_factory=list)
