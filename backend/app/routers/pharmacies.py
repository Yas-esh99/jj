from fastapi import APIRouter, Request
from app.models import Pharmacy

router = APIRouter(prefix="/pharmacies", tags=["pharmacies"])

@router.get("", response_model=list[Pharmacy])
def get_pharmacies(request: Request) -> list[Pharmacy]:
    repository = request.app.state.pharmacies_repository
    return repository.get_all()
