from google.cloud.firestore import Client
from app.models import Pharmacy

class FirestorePharmaciesRepository:
    def __init__(self, client: Client):
        self.collection = client.collection("pharmacies")

    def get_all(self) -> list[Pharmacy]:
        pharmacies = []
        for doc in self.collection.stream():
            payload = doc.to_dict() or {}
            payload["id"] = doc.id
            pharmacies.append(Pharmacy.model_validate(payload))
        return pharmacies
