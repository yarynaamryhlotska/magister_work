from datetime import date, datetime, timezone

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    diary_entries: Mapped[list["DiaryEntry"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    daily_emotion_summaries: Mapped[
        list["DailyEmotionSummary"]
    ] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class DiaryEntry(Base):
    __tablename__ = "diary_entries"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="draft",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        back_populates="diary_entries",
    )

    text_entry: Mapped[
        "TextEntry | None"
    ] = relationship(
        back_populates="diary_entry",
        cascade="all, delete-orphan",
        uselist=False,
    )

    voice_entry: Mapped[
        "VoiceEntry | None"
    ] = relationship(
        back_populates="diary_entry",
        cascade="all, delete-orphan",
        uselist=False,
    )

    image_entry: Mapped[
        "ImageEntry | None"
    ] = relationship(
        back_populates="diary_entry",
        cascade="all, delete-orphan",
        uselist=False,
    )

    analysis_result: Mapped[
        "AnalysisResult | None"
    ] = relationship(
        back_populates="diary_entry",
        cascade="all, delete-orphan",
        uselist=False,
    )


class TextEntry(Base):
    __tablename__ = "text_entries"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    diary_entry_id: Mapped[int] = mapped_column(
        ForeignKey(
            "diary_entries.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    diary_entry: Mapped["DiaryEntry"] = relationship(
        back_populates="text_entry",
    )


class VoiceEntry(Base):
    __tablename__ = "voice_entries"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    diary_entry_id: Mapped[int] = mapped_column(
        ForeignKey(
            "diary_entries.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    duration_seconds: Mapped[
        float | None
    ] = mapped_column(
        Float,
        nullable=True,
    )

    transcription: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    diary_entry: Mapped["DiaryEntry"] = relationship(
        back_populates="voice_entry",
    )

    audio_analysis: Mapped["VoiceAudioAnalysis | None"] = relationship(
        back_populates="voice_entry",
        cascade="all, delete-orphan",
        uselist=False,
    )


class ImageEntry(Base):
    __tablename__ = "image_entries"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    diary_entry_id: Mapped[int] = mapped_column(
        ForeignKey(
            "diary_entries.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
    )

    file_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    diary_entry: Mapped["DiaryEntry"] = relationship(
        back_populates="image_entry",
    )


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    diary_entry_id: Mapped[int] = mapped_column(
        ForeignKey(
            "diary_entries.id",
            ondelete="CASCADE",
        ),
        unique=True,
        nullable=False,
    )



    emotion: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )


    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    anger_score: Mapped[
        float | None
    ] = mapped_column(
        Float,
        nullable=True,
    )

    disgust_score: Mapped[
        float | None
    ] = mapped_column(
        Float,
        nullable=True,
    )

    fear_score: Mapped[
        float | None
    ] = mapped_column(
        Float,
        nullable=True,
    )

    joy_score: Mapped[
        float | None
    ] = mapped_column(
        Float,
        nullable=True,
    )

    neutral_score: Mapped[
        float | None
    ] = mapped_column(
        Float,
        nullable=True,
    )

    sadness_score: Mapped[
        float | None
    ] = mapped_column(
        Float,
        nullable=True,
    )

    surprise_score: Mapped[
        float | None
    ] = mapped_column(
        Float,
        nullable=True,
    )

    recommendation: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    diary_entry: Mapped["DiaryEntry"] = relationship(
        back_populates="analysis_result",
    )



class DailyEmotionSummary(Base):
    __tablename__ = "daily_emotion_summaries"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "summary_date",
            name="uq_daily_emotion_summary_user_date",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
    )

    summary_date: Mapped[date] = mapped_column(
        Date,
        index=True,
        nullable=False,
    )


    emotion: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    anger_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    disgust_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    fear_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    joy_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    neutral_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    sadness_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    surprise_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

  
    entries_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    
    text_entries_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    voice_entries_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    image_entries_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

  
    recommendation: Mapped[
        str | None
    ] = mapped_column(
        Text,
        nullable=True,
    )

   
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        back_populates="daily_emotion_summaries",
    )

class VoiceAudioAnalysis(Base):
    __tablename__ = "voice_audio_analyses"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True
    )

    voice_entry_id: Mapped[int] = mapped_column(
        ForeignKey("voice_entries.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    emotion: Mapped[str] = mapped_column(
        String(100), nullable=False
    )

    confidence: Mapped[float] = mapped_column(
        Float, nullable=False
    )

    anger_score: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    joy_score: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    sadness_score: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    neutral_score: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    model_name: Mapped[str] = mapped_column(
        String(200), nullable=False
    )

    voice_entry: Mapped["VoiceEntry"] = relationship(
        back_populates="audio_analysis"
    )
