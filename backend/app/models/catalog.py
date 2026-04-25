from pydantic import BaseModel, Field


class ToolDefinition(BaseModel):
    name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    approval_class: str = Field(..., min_length=1)
    adapter_family: str = Field(..., min_length=1)
    capability_status: str = Field(..., min_length=1)
    args_schema: str = Field(..., min_length=1)
    result_schema: str = Field(..., min_length=1)
    default_locks: list[str] = Field(default_factory=list)
    default_timeout_s: int = Field(default=30, ge=1)
    risk: str = Field(default="low", min_length=1)
    tags: list[str] = Field(default_factory=list)


class CatalogAgent(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    role: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    tools: list[ToolDefinition] = Field(default_factory=list)


class ToolsCatalog(BaseModel):
    agents: list[CatalogAgent] = Field(default_factory=list)
