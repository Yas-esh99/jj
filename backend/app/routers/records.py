from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.config import get_settings
from app.models import CreateRecordRequest, TriageRecordResponse, HeatmapPoint
from app.services.auth import decode_token

router = APIRouter(prefix="/records", tags=["records"])


def get_current_phone(request: Request) -> str:
    """Dependency to retrieve the authenticated user's phone number from session cookie."""
    settings = get_settings()
    session_token = request.cookies.get(settings.auth_cookie_name)
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in first.",
        )
    return decode_token(session_token, expected_type="session")


@router.post("", response_model=TriageRecordResponse, status_code=status.HTTP_201_CREATED)
def create_record(
    payload: CreateRecordRequest,
    request: Request,
    phone_number: str = Depends(get_current_phone),
) -> TriageRecordResponse:
    """Save a new diagnostic triage record for the authenticated user."""
    repository = request.app.state.records_repository
    record = repository.create(
        phone_number=phone_number,
        report=payload.report,
        chief_complaint=payload.chief_complaint,
    )
    return TriageRecordResponse(**record)


@router.get("", response_model=list[TriageRecordResponse])
def get_records(
    request: Request,
    phone_number: str = Depends(get_current_phone),
) -> list[TriageRecordResponse]:
    """Retrieve all diagnostic triage records for the authenticated user."""
    repository = request.app.state.records_repository
    records = repository.get_by_user(phone_number)
    return [TriageRecordResponse(**r) for r in records]


SEED_HEATMAP_DATA = [
    {"state": "Gujarat", "district": "Ahmedabad", "disease": "Diabetes & Hypertension", "cases_count": 24},
    {"state": "Gujarat", "district": "Ahmedabad", "disease": "Viral Pharyngitis", "cases_count": 18},
    {"state": "Gujarat", "district": "Gandhinagar", "disease": "Asthma & COPD", "cases_count": 15},
    {"state": "Gujarat", "district": "Gandhinagar", "disease": "Contact Dermatitis", "cases_count": 9},
    {"state": "Gujarat", "district": "Surat", "disease": "Viral Pharyngitis", "cases_count": 32},
    {"state": "Gujarat", "district": "Surat", "disease": "Gastroenteritis", "cases_count": 22},
    {"state": "Gujarat", "district": "Rajkot", "disease": "Diabetes & Hypertension", "cases_count": 14},
    {"state": "Gujarat", "district": "Rajkot", "disease": "Asthma & COPD", "cases_count": 11},
]


@router.get("/heatmap", response_model=list[HeatmapPoint])
def get_disease_heatmap(request: Request) -> list[HeatmapPoint]:
    """Retrieve disease heatmap data aggregated by state and district from Firestore, combined with baseline seed data."""
    records_repo = request.app.state.records_repository
    users_repo = request.app.state.user_repository

    # 1. Fetch all records from Firestore
    all_records = []
    try:
        for doc in records_repo.collection.stream():
            payload = doc.to_dict() or {}
            payload["id"] = doc.id
            all_records.append(payload)
    except Exception as e:
        print(f"Error fetching triage records: {e}")

    # 2. Fetch all users to map phone_number -> (state, district)
    user_locations = {}
    try:
        for doc in users_repo.collection.stream():
            payload = doc.to_dict() or {}
            user_locations[doc.id] = {
                "state": payload.get("state", "Unknown"),
                "district": payload.get("district", "Unknown")
            }
    except Exception as e:
        print(f"Error fetching user locations: {e}")

    # 3. Aggregate dynamic Firestore records
    dynamic_counts = {}
    for rec in all_records:
        phone = rec.get("phone_number")
        loc = user_locations.get(phone, {"state": "Gujarat", "district": "Ahmedabad"})
        state = loc.get("state") or "Gujarat"
        district = loc.get("district") or "Ahmedabad"
        
        report = rec.get("report") or {}
        disease = report.get("primary_diagnosis") or "Unknown disease"
        
        key = (state, district, disease)
        dynamic_counts[key] = dynamic_counts.get(key, 0) + 1

    # 4. Merge seed baseline data with dynamic counts
    merged_data = {}
    for item in SEED_HEATMAP_DATA:
        key = (item["state"], item["district"], item["disease"])
        merged_data[key] = item["cases_count"]

    for key, count in dynamic_counts.items():
        merged_data[key] = merged_data.get(key, 0) + count

    # Convert to response list
    result = []
    for (state, district, disease), count in merged_data.items():
        result.append(
            HeatmapPoint(
                state=state,
                district=district,
                disease=disease,
                cases_count=count
            )
        )
        
    return result

