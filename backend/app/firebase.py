import firebase_admin
from firebase_admin import credentials, firestore

from app.config import get_settings


def get_firestore_client():
    settings = get_settings()

    # Validate that credentials are set and not placeholder values
    has_creds = bool(settings.google_application_credentials and settings.firebase_project_id)
    is_placeholder = (
        not settings.google_application_credentials 
        or "path/to/service-account.json" in settings.google_application_credentials
        or not settings.firebase_project_id
        or "your-firebase-project-id" in settings.firebase_project_id
    )

    if not has_creds or is_placeholder:
        raise ValueError(
            "Firebase credentials are not configured. Please set GOOGLE_APPLICATION_CREDENTIALS "
            "to the absolute path of your Firebase service account JSON file, and set "
            "FIREBASE_PROJECT_ID to your actual Firebase project ID in backend/.env."
        )

    if not firebase_admin._apps:
        options = {"projectId": settings.firebase_project_id}
        certificate = credentials.Certificate(settings.google_application_credentials)
        firebase_admin.initialize_app(certificate, options=options)

    return firestore.client()

