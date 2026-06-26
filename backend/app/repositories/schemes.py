from google.cloud.firestore import Client
from app.models import Scheme

class FirestoreSchemesRepository:
    def __init__(self, client: Client):
        self.collection = client.collection("schemes")

    def get_all(self) -> list[Scheme]:
        schemes = []
        for doc in self.collection.stream():
            payload = doc.to_dict() or {}
            payload["id"] = doc.id
            schemes.append(Scheme.model_validate(payload))
        return schemes
