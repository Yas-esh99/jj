from fastapi import APIRouter, Request
from app.models import Hospital

router = APIRouter(prefix="/hospitals", tags=["hospitals"])

@router.get("", response_model=list[Hospital])
def get_hospitals(request: Request) -> list[Hospital]:
    repository = request.app.state.hospitals_repository
    return repository.get_all()
