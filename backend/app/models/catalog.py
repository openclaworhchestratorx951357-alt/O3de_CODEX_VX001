from pydantic import BaseModel, Field


class CatalogAgent(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    tools: list[str] = Field(default_factory=list)


class ToolsCatalog(BaseModel):
    agents: list[CatalogAgent] = Field(default_factory=list)
