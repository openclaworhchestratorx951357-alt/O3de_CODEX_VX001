from typing import Any

from pydantic import BaseModel, Field, field_validator


class RequestEnvelope(BaseModel):
    request_id: str = Field(..., min_length=1)
    tool: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1)
    project_root: str = Field(..., min_length=1)
    engine_root: str = Field(..., min_length=1)
    session_id: str | None = None
    workspace_id: str | None = None
    executor_id: str | None = None
    dry_run: bool = False
    approval_token: str | None = None
    locks: list[str] = Field(default_factory=list)
    timeout_s: int = Field(default=30, ge=1, le=3600)
    args: dict[str, Any] = Field(default_factory=dict)

    @field_validator("locks")
    @classmethod
    def normalize_locks(cls, value: list[str]) -> list[str]:
        deduped: list[str] = []
        seen: set[str] = set()
        for item in value:
            cleaned = item.strip()
            if cleaned and cleaned not in seen:
                deduped.append(cleaned)
                seen.add(cleaned)
        return deduped
