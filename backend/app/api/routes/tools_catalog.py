from fastapi import APIRouter

from app.services.catalog import catalog_service

router = APIRouter(prefix="/tools", tags=["tools-catalog"])


@router.get("/catalog")
def get_tools_catalog() -> dict:
    return catalog_service.get_catalog()
