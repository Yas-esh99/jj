from fastapi import APIRouter, Request
from app.models import Scheme

router = APIRouter(prefix="/schemes", tags=["schemes"])

@router.get("", response_model=list[Scheme])
def get_schemes(request: Request) -> list[Scheme]:
    repository = request.app.state.schemes_repository
    return repository.get_all()
