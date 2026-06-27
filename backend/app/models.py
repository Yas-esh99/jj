from datetime import datetime

from pydantic import BaseModel, Field, field_validator


def normalize_phone_number(value: str) -> str:
    digits = "".join(ch for ch in value if ch.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10:
        raise ValueError("Phone number must contain exactly 10 digits.")
    return digits


class SendOtpRequest(BaseModel):
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        return normalize_phone_number(value)


class SendOtpResponse(BaseModel):
    challenge_id: str
    phone_number: str
    demo_otp: str
    message: str


class VerifyOtpRequest(BaseModel):
    phone_number: str
    otp_code: str = Field(min_length=6, max_length=6)

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        return normalize_phone_number(value)


class UserProfile(BaseModel):
    id: str
    phone_number: str
    full_name: str
    state: str
    district: str
    age: int = Field(ge=1, le=120)
    gender: str | None = None
    has_ayushman: bool = False
    ayushman_card_number: str | None = None
    conditions: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class VerifyOtpResponse(BaseModel):
    registered: bool
    redirect_to: str
    phone_number: str
    user: UserProfile | None = None


class RegisterRequest(BaseModel):
    phone_number: str
    full_name: str = Field(min_length=1, max_length=120)
    state: str = Field(min_length=1, max_length=120)
    district: str = Field(min_length=1, max_length=120)
    age: int = Field(ge=1, le=120)
    gender: str | None = Field(default=None, max_length=30)
    has_ayushman: bool = False
    ayushman_card_number: str | None = Field(default=None, max_length=64)
    conditions: list[str] = Field(default_factory=list)

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        return normalize_phone_number(value)

    @field_validator("full_name", "state", "district", mode="before")
    @classmethod
    def strip_text(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("Must be a string.")
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("This field is required.")
        return cleaned

    @field_validator("gender", "ayushman_card_number", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class RegisterResponse(BaseModel):
    redirect_to: str
    user: UserProfile


class SessionResponse(BaseModel):
    authenticated: bool
    user: UserProfile | None = None


class LogoutResponse(BaseModel):
    message: str


# --- Directory Models ---

class Scheme(BaseModel):
    id: str
    name: str
    description: str
    coverageLimit: str
    targetDemographic: str
    benefits: list[str] = Field(default_factory=list)
    eligibleCategories: list[str] = Field(default_factory=list)
    requiredDocuments: list[str] = Field(default_factory=list)


class Hospital(BaseModel):
    id: str
    name: str
    address: str
    number: str
    rating: float
    beds_available: int
    emergency_24x7: bool
    is_govt: bool
    ayushman_active: bool
    google_map_direction_link: str
    all_disease_it_cures: list[str] = Field(default_factory=list)


class Medicine(BaseModel):
    name: str
    price: float
    inStock: bool


class Coordinates(BaseModel):
    latitude: float
    longitude: float


class Pharmacy(BaseModel):
    id: str
    name: str
    address: str
    contact: str
    isPremium: bool
    coordinates: Coordinates
    medicines: list[Medicine] = Field(default_factory=list)


# --- Triage Records Models ---

class CreateRecordRequest(BaseModel):
    report: dict
    chief_complaint: str | None = None


class TriageRecordResponse(BaseModel):
    id: str
    phone_number: str
    created_at: datetime
    chief_complaint: str | None = None
    report: dict


class HeatmapPoint(BaseModel):
    state: str
    district: str
    disease: str
    cases_count: int



