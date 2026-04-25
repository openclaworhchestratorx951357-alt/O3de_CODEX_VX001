from fastapi import APIRouter

from app.models.catalog import ToolsCatalog
from app.services.catalog import catalog_service

router = APIRouter(prefix="/tools", tags=["tools-catalog"])


@router.get("/catalog", response_model=ToolsCatalog)
def get_tools_catalog() -> ToolsCatalog:
    return catalog_service.get_catalog_model()
