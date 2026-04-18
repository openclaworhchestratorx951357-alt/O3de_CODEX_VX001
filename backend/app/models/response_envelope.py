from typing import Any

from pydantic import BaseModel, Field


class ResponseState(BaseModel):
    dirty: bool = False
    requires_save: bool = False
    requires_reconfigure: bool = False
    requires_rebuild: bool = False
    requires_asset_reprocess: bool = False


class ResponseError(BaseModel):
    code: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    retryable: bool = False
    details: dict[str, Any] | None = None


class ResponseEnvelope(BaseModel):
    request_id: str = Field(..., min_length=1)
    ok: bool
    operation_id: str | None = None
    approval_id: str | None = None
    result: dict[str, Any] | None = None
    warnings: list[str] = Field(default_factory=list)
    artifacts: list[str] = Field(default_factory=list)
    state: ResponseState = Field(default_factory=ResponseState)
    timing_ms: int = Field(default=0, ge=0)
    logs: list[str] = Field(default_factory=list)
    error: ResponseError | None = None
