from fastapi import APIRouter

from app.models.cockpit_apps import CockpitAppRegistryRecord
from app.services.cockpit_app_registry import build_cockpit_app_registry

router = APIRouter(tags=["cockpit-apps"])


@router.get("/cockpit-apps/registry", response_model=CockpitAppRegistryRecord)
def get_cockpit_app_registry() -> CockpitAppRegistryRecord:
    return build_cockpit_app_registry()
