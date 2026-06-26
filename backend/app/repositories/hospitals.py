from google.cloud.firestore import Client
from app.models import Hospital

class FirestoreHospitalsRepository:
    def __init__(self, client: Client):
        self.collection = client.collection("hospitals")

    def get_all(self) -> list[Hospital]:
        hospitals = []
        for doc in self.collection.stream():
            payload = doc.to_dict() or {}
            payload["id"] = doc.id
            hospitals.append(Hospital.model_validate(payload))
        return hospitals
