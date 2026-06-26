import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.firebase import get_firestore_client
from app.repositories.users import FirestoreUserRepository
from app.repositories.hospitals import FirestoreHospitalsRepository
from app.repositories.pharmacies import FirestorePharmaciesRepository
from app.repositories.schemes import FirestoreSchemesRepository
from app.routers import auth, hospitals, pharmacies, schemes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Firestore client and repositories
    db_client = get_firestore_client()
    app.state.user_repository = FirestoreUserRepository(db_client)
    app.state.hospitals_repository = FirestoreHospitalsRepository(db_client)
    app.state.pharmacies_repository = FirestorePharmaciesRepository(db_client)
    app.state.schemes_repository = FirestoreSchemesRepository(db_client)
    yield


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.api_v1_prefix)
app.include_router(hospitals.router, prefix=settings.api_v1_prefix)
app.include_router(pharmacies.router, prefix=settings.api_v1_prefix)
app.include_router(schemes.router, prefix=settings.api_v1_prefix)


@app.get("/")
def read_root():
    return {
        "status": "ok",
        "app": settings.app_name,
        "api_prefix": settings.api_v1_prefix,
    }


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
