from datetime import date, datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        cleaned_name = value.strip()
        if len(cleaned_name) < 2:
            raise ValueError("Ім’я повинно містити щонайменше 2 символи")
        return cleaned_name

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    is_active: bool
    is_verified: bool
    created_at: datetime


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class DiaryEntryCreate(BaseModel):
    text_content: str | None = Field(default=None, max_length=10000)

    @field_validator("text_content")
    @classmethod
    def clean_text_content(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned_text = value.strip()
        return cleaned_text or None


class DiaryEntryUpdate(BaseModel):
    text_content: str = Field(min_length=1, max_length=10000)

    @field_validator("text_content")
    @classmethod
    def clean_text_content(cls, value: str) -> str:
        cleaned_text = value.strip()
        if not cleaned_text:
            raise ValueError("Текст запису не може бути порожнім")
        return cleaned_text


class TextEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str


class VoiceAudioAnalysisResponse(BaseModel):
    """Окремі результати акустичної моделі (4 категорії)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    emotion: str
    confidence: float
    anger_score: float | None = None
    joy_score: float | None = None
    sadness_score: float | None = None
    neutral_score: float | None = None
    model_name: str


class VoiceEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_path: str
    duration_seconds: float | None
    transcription: str | None
    audio_analysis: VoiceAudioAnalysisResponse | None = None


class ImageEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_path: str


class AnalysisResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    emotion: str
    confidence: float
    anger_score: float | None = None
    disgust_score: float | None = None
    fear_score: float | None = None
    joy_score: float | None = None
    neutral_score: float | None = None
    sadness_score: float | None = None
    surprise_score: float | None = None
    recommendation: str | None = None
    created_at: datetime


class DiaryEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    text_entry: TextEntryResponse | None = None
    voice_entry: VoiceEntryResponse | None = None
    image_entry: ImageEntryResponse | None = None
    analysis_result: AnalysisResultResponse | None = None


class DiaryEntryListResponse(BaseModel):
    entries: list[DiaryEntryResponse]
    total: int


class DailyEmotionSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    summary_date: date
    emotion: str
    confidence: float
    anger_score: float
    disgust_score: float
    fear_score: float
    joy_score: float
    neutral_score: float
    sadness_score: float
    surprise_score: float
    entries_count: int
    text_entries_count: int
    voice_entries_count: int
    image_entries_count: int
    recommendation: str | None = None
    created_at: datetime
    updated_at: datetime


class DailyEmotionSummaryListResponse(BaseModel):
    summaries: list[DailyEmotionSummaryResponse]
    total: int


class DailyEntriesResponse(BaseModel):
    date: date
    summary: DailyEmotionSummaryResponse | None = None
    entries: list[DiaryEntryResponse]
    total: int
