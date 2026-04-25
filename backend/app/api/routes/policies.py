from fastapi import APIRouter

from app.models.api import PoliciesResponse
from app.services.policy import policy_service

router = APIRouter(tags=["policies"])


@router.get("/policies", response_model=PoliciesResponse)
def list_policies() -> PoliciesResponse:
    return PoliciesResponse(policies=policy_service.list_policies())
