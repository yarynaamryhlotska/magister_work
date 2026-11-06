from pathlib import Path
from datetime import date, timezone
from zoneinfo import ZoneInfo
import shutil
import uuid
import jwt

from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Security,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from database import Base, engine, get_database
from email_service import (
    create_verification_token,
    decode_verification_token,
    send_verification_email,
)
from emotion_analyzer import analyze_emotion
from text_emotion import analyze_text_emotion
from voice_emotion import analyze_voice_emotion
from daily_recommendation import generate_daily_recommendation
from models import (
    AnalysisResult,
    DailyEmotionSummary,
    DiaryEntry,
    ImageEntry,
    TextEntry,
    User,
    VoiceEntry,
    VoiceAudioAnalysis,
)
from schemas import (
    DiaryEntryCreate,
    DiaryEntryListResponse,
    DiaryEntryResponse,
    LoginResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

BASE_DIR = Path(__file__).resolve().parent
IMAGE_UPLOAD_DIR = BASE_DIR / "uploads" / "images"
VOICE_UPLOAD_DIR = BASE_DIR / "uploads" / "voice"

IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
VOICE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

UPLOAD_DIR = IMAGE_UPLOAD_DIR
APP_TIMEZONE = ZoneInfo("Europe/Kyiv")

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Emotion Diary API",
    version="1.0.0",
    description="API мультимодального цифрового щоденника емоцій",
)

app.mount(
    "/uploads",
    StaticFiles(directory=str(BASE_DIR / "uploads")),
    name="uploads",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    database: Session = Depends(get_database),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Необхідно увійти в систему",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Термін дії сесії завершився",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Некоректний токен авторизації",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = database.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Користувача не знайдено",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Обліковий запис деактивовано",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Електронну пошту не підтверджено",
        )

    return user


def load_diary_entry(
    database: Session,
    entry_id: int,
) -> DiaryEntry | None:
    return database.scalar(
        select(DiaryEntry)
        .options(
            selectinload(DiaryEntry.text_entry),
            selectinload(DiaryEntry.voice_entry).selectinload(
                VoiceEntry.audio_analysis
            ),
            selectinload(DiaryEntry.image_entry),
            selectinload(DiaryEntry.analysis_result),
        )
        .where(DiaryEntry.id == entry_id)
    )


EMOTION_FIELDS = {
    "ANGER": "anger_score",
    "DISGUST": "disgust_score",
    "FEAR": "fear_score",
    "JOY": "joy_score",
    "NEUTRAL": "neutral_score",
    "SADNESS": "sadness_score",
    "SURPRISE": "surprise_score",
}

EMOTION_NAMES_UA = {
    "ANGER": "злість",
    "DISGUST": "відраза",
    "FEAR": "страх",
    "JOY": "радість",
    "NEUTRAL": "нейтральний стан",
    "SADNESS": "смуток",
    "SURPRISE": "здивування",
}


def entry_local_date(entry: DiaryEntry) -> date:
    created_at = entry.created_at

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    return created_at.astimezone(APP_TIMEZONE).date()


def average_available(values: list[float | None]) -> float:
    available = [float(value) for value in values if value is not None]

    if not available:
        return 0.0

    return sum(available) / len(available)


def load_saved_entries_for_user(
    database: Session,
    user_id: int,
) -> list[DiaryEntry]:
    return list(
        database.scalars(
            select(DiaryEntry)
            .options(
                selectinload(DiaryEntry.text_entry),
                selectinload(DiaryEntry.voice_entry).selectinload(
                    VoiceEntry.audio_analysis
                ),
                selectinload(DiaryEntry.image_entry),
                selectinload(DiaryEntry.analysis_result),
            )
            .where(
                DiaryEntry.user_id == user_id,
                DiaryEntry.status == "saved",
            )
            .order_by(DiaryEntry.created_at.asc())
        ).all()
    )


def recalculate_daily_summary(
    database: Session,
    user_id: int,
    summary_date: date,
) -> DailyEmotionSummary | None:
    day_entries = [
        entry
        for entry in load_saved_entries_for_user(database, user_id)
        if entry.analysis_result is not None
        and entry_local_date(entry) == summary_date
    ]

    existing_summary = database.scalar(
        select(DailyEmotionSummary).where(
            DailyEmotionSummary.user_id == user_id,
            DailyEmotionSummary.summary_date == summary_date,
        )
    )

    if not day_entries:
        if existing_summary is not None:
            database.delete(existing_summary)
            database.flush()
        return None

    aggregated_scores = {}

    for emotion_name, field_name in EMOTION_FIELDS.items():
        aggregated_scores[emotion_name] = average_available(
            [getattr(entry.analysis_result, field_name) for entry in day_entries]
        )

    dominant_emotion = max(aggregated_scores, key=aggregated_scores.get)
    confidence = aggregated_scores[dominant_emotion]
    text_count = sum(1 for entry in day_entries if entry.text_entry is not None)
    voice_count = sum(1 for entry in day_entries if entry.voice_entry is not None)
    image_count = sum(1 for entry in day_entries if entry.image_entry is not None)

    recommendation = generate_daily_recommendation(
        entries=day_entries,
        dominant_emotion=dominant_emotion,
        dominant_score=confidence,
        daily_scores=aggregated_scores,
        text_count=text_count,
        voice_count=voice_count,
        image_count=image_count,
    )

    if existing_summary is None:
        existing_summary = DailyEmotionSummary(
            user_id=user_id,
            summary_date=summary_date,
            emotion=dominant_emotion,
            confidence=confidence,
        )
        database.add(existing_summary)

    existing_summary.emotion = dominant_emotion
    existing_summary.confidence = confidence
    existing_summary.anger_score = aggregated_scores["ANGER"]
    existing_summary.disgust_score = aggregated_scores["DISGUST"]
    existing_summary.fear_score = aggregated_scores["FEAR"]
    existing_summary.joy_score = aggregated_scores["JOY"]
    existing_summary.neutral_score = aggregated_scores["NEUTRAL"]
    existing_summary.sadness_score = aggregated_scores["SADNESS"]
    existing_summary.surprise_score = aggregated_scores["SURPRISE"]
    existing_summary.entries_count = len(day_entries)
    existing_summary.text_entries_count = text_count
    existing_summary.voice_entries_count = voice_count
    existing_summary.image_entries_count = image_count
    existing_summary.recommendation = recommendation

    database.flush()

    return existing_summary


def sync_daily_summaries(database: Session, user_id: int) -> None:
    entries = load_saved_entries_for_user(database, user_id)
    dates_with_entries = {
        entry_local_date(entry)
        for entry in entries
        if entry.analysis_result is not None
    }

    existing_summaries = list(
        database.scalars(
            select(DailyEmotionSummary).where(
                DailyEmotionSummary.user_id == user_id
            )
        ).all()
    )

    existing_dates = {
        summary.summary_date for summary in existing_summaries
    }

    for one_date in dates_with_entries:
        recalculate_daily_summary(database, user_id, one_date)

    for obsolete_date in existing_dates - dates_with_entries:
        obsolete_summary = database.scalar(
            select(DailyEmotionSummary).where(
                DailyEmotionSummary.user_id == user_id,
                DailyEmotionSummary.summary_date == obsolete_date,
            )
        )

        if obsolete_summary is not None:
            database.delete(obsolete_summary)

    database.commit()


def daily_summary_to_dict(summary: DailyEmotionSummary) -> dict:
    return {
        "id": summary.id,
        "user_id": summary.user_id,
        "summary_date": summary.summary_date,
        "emotion": summary.emotion,
        "confidence": summary.confidence,
        "anger_score": summary.anger_score,
        "disgust_score": summary.disgust_score,
        "fear_score": summary.fear_score,
        "joy_score": summary.joy_score,
        "neutral_score": summary.neutral_score,
        "sadness_score": summary.sadness_score,
        "surprise_score": summary.surprise_score,
        "entries_count": summary.entries_count,
        "text_entries_count": summary.text_entries_count,
        "voice_entries_count": summary.voice_entries_count,
        "image_entries_count": summary.image_entries_count,
        "recommendation": summary.recommendation,
        "created_at": summary.created_at,
        "updated_at": summary.updated_at,
    }


@app.get("/")
def root():
    return {
        "message": "Emotion Diary API працює",
        "status": "ok",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserCreate,
    database: Session = Depends(get_database),
):
    normalized_email = user_data.email.lower().strip()
    existing_user = database.scalar(
        select(User).where(User.email == normalized_email)
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Користувач із такою електронною поштою вже існує",
        )

    new_user = User(
        name=user_data.name.strip(),
        email=normalized_email,
        password_hash=hash_password(user_data.password),
        is_active=True,
        is_verified=False,
    )
    database.add(new_user)

    try:
        database.flush()
        token = create_verification_token(normalized_email)
        send_verification_email(normalized_email, token)
        database.commit()
        database.refresh(new_user)
    except Exception:
        database.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Не вдалося надіслати лист підтвердження. "
                "Перевірте адресу пошти та спробуйте ще раз"
            ),
        )

    return new_user


@app.get("/auth/verify-email")
def verify_email(
    token: str,
    database: Session = Depends(get_database),
):
    try:
        email = decode_verification_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Термін дії посилання завершився",
        )
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некоректне посилання підтвердження",
        )

    user = database.scalar(
        select(User).where(User.email == email)
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Користувача не знайдено",
        )

    if not user.is_verified:
        user.is_verified = True
        database.commit()

    return RedirectResponse(
        url="http://localhost:5173/login?verified=true",
        status_code=status.HTTP_302_FOUND,
    )


@app.post("/auth/login", response_model=LoginResponse)
def login_user(
    login_data: UserLogin,
    database: Session = Depends(get_database),
):
    user = database.scalar(
        select(User).where(User.email == login_data.email)
    )

    if not user or not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неправильна електронна пошта або пароль",
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Спочатку підтвердьте електронну пошту",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Обліковий запис деактивовано",
        )

    access_token = create_access_token(user.id, user.email)

    return LoginResponse(
        access_token=access_token,
        user=user,
    )


@app.get("/auth/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.patch("/auth/change-password")
def change_password(
    password_data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    current_password = password_data.current_password
    new_password = password_data.new_password

    if not current_password or not current_password.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Введіть поточний пароль",
        )

    if not new_password or not new_password.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Введіть новий пароль",
        )

    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Новий пароль повинен містити щонайменше 8 символів",
        )

    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Поточний пароль введено неправильно",
        )

    if verify_password(new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новий пароль повинен відрізнятися від поточного",
        )

    try:
        current_user.password_hash = hash_password(new_password)
        database.add(current_user)
        database.commit()
        database.refresh(current_user)
    except Exception:
        database.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не вдалося змінити пароль",
        )

    return {"message": "Пароль успішно змінено"}


@app.post(
    "/diary/entries",
    response_model=DiaryEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_diary_entry(
    entry_data: DiaryEntryCreate,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    if not entry_data.text_content or not entry_data.text_content.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Введіть текст для аналізу",
        )

    text_content = entry_data.text_content.strip()

    try:
        analysis = analyze_text_emotion(text_content)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося проаналізувати текст: {error}",
        )

    scores = analysis["scores"]
    new_entry = DiaryEntry(
        user_id=current_user.id,
        status="analyzed",
    )
    new_entry.text_entry = TextEntry(content=text_content)
    new_entry.analysis_result = AnalysisResult(
        emotion=analysis["emotion"],
        confidence=analysis["confidence"],
        anger_score=scores.get("anger", scores.get("angry")),
        disgust_score=scores.get("disgust"),
        fear_score=scores.get("fear"),
        joy_score=scores.get("joy", scores.get("happy")),
        neutral_score=scores.get("neutral"),
        sadness_score=scores.get("sadness", scores.get("sad")),
        surprise_score=scores.get("surprise"),
        recommendation=None,
    )

    database.add(new_entry)

    try:
        database.commit()
    except Exception as error:
        database.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося зберегти результат аналізу: {error}",
        )

    entry = load_diary_entry(database, new_entry.id)

    return entry


@app.post(
    "/diary/voice",
    response_model=DiaryEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def analyze_voice(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    allowed_types = {
        "audio/webm",
        "audio/ogg",
        "audio/mp4",
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
    }
    content_type = (audio.content_type or "").lower()
    base_content_type = content_type.split(";")[0].strip()

    if base_content_type and base_content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Непідтримуваний формат аудіо. "
                "Використайте WEBM, OGG, M4A, MP3 або WAV"
            ),
        )

    original_suffix = Path(
        audio.filename or "voice.webm"
    ).suffix.lower()
    allowed_suffixes = {
        ".webm",
        ".ogg",
        ".m4a",
        ".mp4",
        ".mp3",
        ".wav",
    }

    if original_suffix not in allowed_suffixes:
        original_suffix = ".webm"

    file_name = f"{current_user.id}_{uuid.uuid4().hex}{original_suffix}"
    voice_path = VOICE_UPLOAD_DIR / file_name

    try:
        with voice_path.open("wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
    except Exception as error:
        if voice_path.exists():
            voice_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося зберегти голосовий запис: {error}",
        )

    try:
        analysis = analyze_voice_emotion(str(voice_path))
    except ValueError as error:
        if voice_path.exists():
            voice_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        )
    except Exception as error:
        if voice_path.exists():
            voice_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося проаналізувати голосовий запис: {error}",
        )

    scores = analysis.get("scores") or {}
    transcription = (
        analysis.get("transcript")
        or analysis.get("transcription")
        or analysis.get("text")
    )
    duration_seconds = analysis.get("duration_seconds")

    new_entry = DiaryEntry(
        user_id=current_user.id,
        status="analyzed",
    )
    new_entry.voice_entry = VoiceEntry(
        file_path=f"/uploads/voice/{file_name}",
        duration_seconds=duration_seconds,
        transcription=transcription,
    )

    audio_result = analysis.get("audio_analysis")

    if audio_result is not None:
        audio_scores = audio_result.get("scores") or {}
        new_entry.voice_entry.audio_analysis = VoiceAudioAnalysis(
            emotion=audio_result["emotion"],
            confidence=audio_result["confidence"],
            anger_score=audio_scores.get("anger"),
            joy_score=audio_scores.get("joy"),
            sadness_score=audio_scores.get("sadness"),
            neutral_score=audio_scores.get("neutral"),
            model_name=(
                audio_result.get("model")
                or audio_result.get("model_name")
                or "unknown"
            ),
        )

    new_entry.analysis_result = AnalysisResult(
        emotion=analysis["emotion"],
        confidence=analysis["confidence"],
        anger_score=scores.get("anger", scores.get("angry")),
        disgust_score=scores.get("disgust"),
        fear_score=scores.get("fear"),
        joy_score=scores.get("joy", scores.get("happy")),
        neutral_score=scores.get("neutral"),
        sadness_score=scores.get("sadness", scores.get("sad")),
        surprise_score=scores.get("surprise"),
        recommendation=None,
    )

    database.add(new_entry)

    try:
        database.commit()
    except Exception as error:
        database.rollback()
        if voice_path.exists():
            voice_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Не вдалося зберегти результат голосового аналізу: "
                f"{error}"
            ),
        )

    entry = load_diary_entry(database, new_entry.id)

    return entry


@app.get("/diary/entries", response_model=DiaryEntryListResponse)
def get_diary_entries(
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    entries = list(
        database.scalars(
            select(DiaryEntry)
            .options(
                selectinload(DiaryEntry.text_entry),
                selectinload(DiaryEntry.voice_entry).selectinload(
                    VoiceEntry.audio_analysis
                ),
                selectinload(DiaryEntry.image_entry),
                selectinload(DiaryEntry.analysis_result),
            )
            .where(
                DiaryEntry.user_id == current_user.id,
                DiaryEntry.status == "saved",
            )
            .order_by(DiaryEntry.created_at.desc())
        ).all()
    )

    return DiaryEntryListResponse(
        entries=entries,
        total=len(entries),
    )


@app.get(
    "/diary/entries/{entry_id}",
    response_model=DiaryEntryResponse,
)
def get_diary_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    entry = load_diary_entry(database, entry_id)

    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запис не знайдено",
        )

    if entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Немає доступу до цього запису",
        )

    if entry.status != "saved":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запис не знайдено",
        )

    return entry


@app.delete(
    "/diary/entries/{entry_id}",
    status_code=status.HTTP_200_OK,
)
def delete_diary_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    entry = load_diary_entry(database, entry_id)

    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запис не знайдено",
        )

    if entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Немає доступу до цього запису",
        )

    deleted_entry_date = entry_local_date(entry)
    was_saved = entry.status == "saved"
    image_path = None
    voice_path = None

    if entry.image_entry is not None and entry.image_entry.file_path:
        image_file_name = Path(entry.image_entry.file_path).name
        image_path = IMAGE_UPLOAD_DIR / image_file_name

    if entry.voice_entry is not None and entry.voice_entry.file_path:
        voice_file_name = Path(entry.voice_entry.file_path).name
        voice_path = VOICE_UPLOAD_DIR / voice_file_name

    try:
        database.delete(entry)
        database.flush()

        if was_saved:
            recalculate_daily_summary(
                database,
                current_user.id,
                deleted_entry_date,
            )

        database.commit()
    except Exception as error:
        database.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося видалити запис: {error}",
        )

    if image_path is not None and image_path.exists():
        try:
            image_path.unlink()
        except OSError:
            pass

    if voice_path is not None and voice_path.exists():
        try:
            voice_path.unlink()
        except OSError:
            pass

    return {
        "message": "Запис успішно видалено",
        "entry_id": entry_id,
    }


@app.post(
    "/diary/photo",
    response_model=DiaryEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def analyze_photo(
    photo: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    allowed_types = {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
    }

    if photo.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Підтримуються тільки JPG, PNG та WEBP зображення",
        )

    original_suffix = Path(
        photo.filename or "photo.jpg"
    ).suffix.lower()

    if original_suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        original_suffix = ".jpg"

    file_name = f"{current_user.id}_{uuid.uuid4().hex}{original_suffix}"
    image_path = IMAGE_UPLOAD_DIR / file_name

    try:
        with image_path.open("wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

        analysis = analyze_emotion(str(image_path))
    except ValueError as error:
        if image_path.exists():
            image_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        )
    except Exception as error:
        if image_path.exists():
            image_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося проаналізувати фотографію: {error}",
        )

    scores = analysis["scores"]

    new_entry = DiaryEntry(
        user_id=current_user.id,
        status="analyzed",
    )
    new_entry.image_entry = ImageEntry(
        file_path=f"/uploads/images/{file_name}",
    )
    new_entry.analysis_result = AnalysisResult(
        emotion=analysis["emotion"],
        confidence=analysis["confidence"],
        anger_score=scores.get("angry"),
        disgust_score=scores.get("disgust"),
        fear_score=scores.get("fear"),
        joy_score=scores.get("happy"),
        neutral_score=scores.get("neutral"),
        sadness_score=scores.get("sad"),
        surprise_score=scores.get("surprise"),
        recommendation=None,
    )

    database.add(new_entry)

    try:
        database.commit()
    except Exception:
        database.rollback()
        if image_path.exists():
            image_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не вдалося зберегти результат аналізу",
        )

    entry = load_diary_entry(database, new_entry.id)

    return entry


@app.patch(
    "/diary/{entry_id}/complete",
    response_model=DiaryEntryResponse,
)
def complete_diary_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    entry = load_diary_entry(database, entry_id)

    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Запис не знайдено",
        )

    if entry.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Немає доступу до цього запису",
        )

    if entry.analysis_result is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Запис ще не містить результату аналізу",
        )

    entry.status = "saved"
    saved_entry_date = entry_local_date(entry)

    try:
        database.flush()
        recalculate_daily_summary(
            database,
            current_user.id,
            saved_entry_date,
        )
        database.commit()
    except Exception:
        database.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не вдалося зберегти запис",
        )

    entry = load_diary_entry(database, entry_id)

    return entry


@app.get("/diary/daily-summaries")
def get_daily_summaries(
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    try:
        sync_daily_summaries(database, current_user.id)
    except Exception as error:
        database.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося сформувати підсумки днів: {error}",
        )

    summaries = list(
        database.scalars(
            select(DailyEmotionSummary)
            .where(DailyEmotionSummary.user_id == current_user.id)
            .order_by(DailyEmotionSummary.summary_date.desc())
        ).all()
    )

    return {
        "summaries": [
            daily_summary_to_dict(summary) for summary in summaries
        ],
        "total": len(summaries),
    }


@app.get("/diary/daily-summaries/{summary_date}")
def get_daily_summary(
    summary_date: date,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    try:
        summary = recalculate_daily_summary(
            database,
            current_user.id,
            summary_date,
        )
        database.commit()
    except Exception as error:
        database.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не вдалося сформувати підсумок дня: {error}",
        )

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="За цей день немає збережених проаналізованих записів",
        )

    database.refresh(summary)

    return daily_summary_to_dict(summary)


@app.get(
    "/diary/daily/{summary_date}/entries",
    response_model=DiaryEntryListResponse,
)
def get_entries_for_day(
    summary_date: date,
    current_user: User = Depends(get_current_user),
    database: Session = Depends(get_database),
):
    entries = [
        entry
        for entry in load_saved_entries_for_user(database, current_user.id)
        if entry_local_date(entry) == summary_date
    ]
    entries.sort(key=lambda entry: entry.created_at, reverse=True)

    return DiaryEntryListResponse(
        entries=entries,
        total=len(entries),
    )