from typing import Literal

from pydantic import BaseModel, Field


CockpitWorkspaceId = Literal["create-game", "create-movie", "load-project", "asset-forge"]
CockpitShellMode = Literal["dockable-cockpit", "full-screen-editor"]
CockpitTone = Literal["neutral", "info", "success", "warning"]


class CockpitAppRegistrationRecord(BaseModel):
    workspace_id: CockpitWorkspaceId
    nav_label: str = Field(..., min_length=1)
    nav_subtitle: str = Field(..., min_length=1)
    workspace_title: str = Field(..., min_length=1)
    workspace_subtitle: str = Field(..., min_length=1)
    launch_title: str = Field(..., min_length=1)
    detail: str = Field(..., min_length=1)
    truth_state: str = Field(..., min_length=1)
    blocked: str = Field(..., min_length=1)
    next_safe_action: str = Field(..., min_length=1)
    action_label: str = Field(..., min_length=1)
    shell_mode: CockpitShellMode
    tone: CockpitTone
    help_tooltip: str = Field(..., min_length=1)
    execution_admitted: bool = False
    mutation_admitted: bool = False
    provider_generation_admitted: bool = False
    blender_execution_admitted: bool = False
    asset_processor_execution_admitted: bool = False
    placement_write_admitted: bool = False


class CockpitAppBlockedCapabilityRecord(BaseModel):
    capability_id: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    next_unlock: str = Field(..., min_length=1)


class CockpitAppRegistryRecord(BaseModel):
    source: str = "cockpit-app-registry"
    inspection_surface: str = "read_only"
    registry_status: str = "available"
    execution_admitted: bool = False
    mutation_admitted: bool = False
    provider_generation_admitted: bool = False
    blender_execution_admitted: bool = False
    asset_processor_execution_admitted: bool = False
    placement_write_admitted: bool = False
    registrations: list[CockpitAppRegistrationRecord]
    blocked_capabilities: list[CockpitAppBlockedCapabilityRecord]
    next_safe_action: str = Field(..., min_length=1)
