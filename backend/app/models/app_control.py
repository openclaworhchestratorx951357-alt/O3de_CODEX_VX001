from typing import Any, Literal

from pydantic import BaseModel, Field


AppControlOperationKind = Literal["settings.patch", "navigation.open_workspace"]
AppControlRiskLevel = Literal["low", "medium"]
AppControlPreviewStatus = Literal["ready", "no_supported_action"]


class AppControlActor(BaseModel):
    worker_id: str | None = Field(default=None, max_length=160)
    display_name: str | None = Field(default=None, max_length=160)
    agent_profile: str | None = Field(default=None, max_length=240)


class AppControlPreviewRequest(BaseModel):
    instruction: str = Field(..., min_length=1, max_length=4000)
    active_workspace_id: str | None = None
    current_settings: dict[str, Any] = Field(default_factory=dict)
    actor: AppControlActor | None = None


class AppControlOperation(BaseModel):
    operation_id: str = Field(..., min_length=1)
    kind: AppControlOperationKind
    target: str = Field(..., min_length=1)
    value: Any
    description: str = Field(..., min_length=1)
    reversible: bool = True


class AppControlBackupPlan(BaseModel):
    required: bool = True
    captures: list[str] = Field(default_factory=list)
    revert_action_label: str = "Revert last app-control script"


class AppControlScriptPreview(BaseModel):
    script_id: str = Field(..., min_length=1)
    status: AppControlPreviewStatus
    instruction: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    risk_level: AppControlRiskLevel = "low"
    approval_required: bool = True
    backup: AppControlBackupPlan
    operations: list[AppControlOperation] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    generated_by: str = "deterministic-app-control-preview-v1"
    actor: AppControlActor | None = None
