
from functools import lru_cache
from pathlib import Path
import librosa
import numpy as np
import torch
from transformers import (
    AutoFeatureExtractor,
    AutoModelForAudioClassification,
)

MODEL_NAME = "superb/wav2vec2-base-superb-er"
SAMPLE_RATE = 16000

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

LABEL_MAP = {
    "ang": "anger",
    "anger": "anger",
    "hap": "joy",
    "happy": "joy",
    "happiness": "joy",
    "sad": "sadness",
    "sadness": "sadness",
    "neu": "neutral",
    "neutral": "neutral",
}


@lru_cache(maxsize=1)
def get_audio_model():
    extractor = AutoFeatureExtractor.from_pretrained(
        MODEL_NAME
    )
    model = AutoModelForAudioClassification.from_pretrained(
        MODEL_NAME
    )
    model.to(DEVICE)
    model.eval()
    return extractor, model


def analyze_audio_emotion(audio_path: str) -> dict:
    path = Path(audio_path)

    if not path.is_file():
        raise ValueError("Аудіофайл не знайдено")

    audio, sample_rate = librosa.load(
        str(path),
        sr=SAMPLE_RATE,
        mono=True,
    )

    if audio.size == 0:
        raise ValueError("Аудіофайл порожній")

    if not np.isfinite(audio).all():
        raise ValueError("Некоректні аудіодані")

    if len(audio) < SAMPLE_RATE:
        raise ValueError(
            "Для акустичного аналізу потрібна "
            "щонайменше одна секунда аудіо"
        )

    extractor, model = get_audio_model()

    inputs = extractor(
        audio,
        sampling_rate=sample_rate,
        return_tensors="pt",
        padding=True,
    )

    inputs = {
        key: value.to(DEVICE)
        for key, value in inputs.items()
    }

    with torch.no_grad():
        logits = model(**inputs).logits

    probabilities = torch.softmax(
        logits, dim=-1
    )[0]

    scores = {}

    for index, probability in enumerate(probabilities):
        raw_label = model.config.id2label[index].lower()
        label = LABEL_MAP.get(raw_label)

        if label is None:
            raise ValueError(
                f"Невідома категорія аудіомоделі: {raw_label}"
            )

        scores[label] = float(probability.item())

    emotion = max(scores, key=scores.get)

    return {
        "emotion": emotion,
        "confidence": round(scores[emotion], 4),
        "scores": {
            key: round(value, 4)
            for key, value in scores.items()
        },
        "model": MODEL_NAME,
    }
