from datetime import UTC, datetime

from google.cloud.firestore import Client

from app.config import get_settings
from app.models import RegisterRequest, UserProfile


class FirestoreUserRepository:
    def __init__(self, client: Client):
        settings = get_settings()
        self.collection = client.collection(settings.users_collection)

    def get_by_phone(self, phone_number: str) -> UserProfile | None:
        document = self.collection.document(phone_number).get()
        if not document.exists:
            return None

        payload = document.to_dict() or {}
        payload["id"] = document.id
        return UserProfile.model_validate(payload)

    def create(self, payload: RegisterRequest) -> UserProfile:
        now = datetime.now(UTC)
        document_payload = {
            "phone_number": payload.phone_number,
            "full_name": payload.full_name,
            "state": payload.state,
            "district": payload.district,
            "age": payload.age,
            "gender": payload.gender,
            "has_ayushman": payload.has_ayushman,
            "ayushman_card_number": payload.ayushman_card_number,
            "conditions": payload.conditions,
            "created_at": now,
            "updated_at": now,
        }

        document_ref = self.collection.document(payload.phone_number)
        document_ref.set(document_payload)
        return UserProfile(id=document_ref.id, **document_payload)
