from typing import Any

from pydantic import BaseModel, Field


class RequestEnvelope(BaseModel):
    request_id: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1)
    project_root: str = Field(..., min_length=1)
    engine_root: str = Field(..., min_length=1)
    session_id: str | None = None
    dry_run: bool = False
    approval_token: str | None = None
    locks: list[str] = Field(default_factory=list)
    timeout_s: int = Field(..., ge=1)
    args: dict[str, Any] = Field(default_factory=dict)
