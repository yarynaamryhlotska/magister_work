from functools import lru_cache
from typing import Any
import re
import torch
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
)


MODEL_NAME = "ukr-detect/ukr-emotions-classifier"

EMOTION_UA = {
    "joy": "Радість",
    "anger": "Гнів",
    "fear": "Страх",
    "disgust": "Огида",
    "surprise": "Здивування",
    "sadness": "Смуток",
    "none": "Нейтральний стан",
    "neutral": "Нейтральний стан",
}

EMOTION_KEYWORDS = {
    "anger": [
        "злість",
        "злий",
        "зла",
        "зле",
        "злюсь",
        "злюся",
        "злився",
        "злилася",
        "злилась",
        "розлютився",
        "розлютилася",
        "розлютилась",
        "розлючений",
        "розлючена",
        "гнів",
        "гнівний",
        "гнівна",
        "серджуся",
        "сердився",
        "сердилася",
        "дратує",
        "дратують",
        "дратувало",
        "дратував",
        "дратувала",
        "роздратування",
        "роздратований",
        "роздратована",
        "бісить",
        "бісило",
        "бісить мене",
        "ненавиджу",
    ],

    "sadness": [
        "сум",
        "сумно",
        "сумний",
        "сумна",
        "засмучений",
        "засмучена",
        "засмутився",
        "засмутилася",
        "засмутилась",
        "смуток",
        "пригнічений",
        "пригнічена",
        "печаль",
        "боляче",
        "хочеться плакати",
        "плачу",
        "плакала",
        "плакав",
    ],

    "joy": [
        "радість",
        "радію",
        "радісно",
        "радісний",
        "радісна",
        "щасливий",
        "щаслива",
        "щаслива",
        "щастя",
        "весело",
        "веселий",
        "весела",
        "задоволений",
        "задоволена",
        "у захваті",
        "чудовий настрій",
        "чудовий день",
    ],

    "fear": [
        "страх",
        "страшно",
        "боюся",
        "боюсь",
        "злякався",
        "злякалася",
        "злякалась",
        "наляканий",
        "налякана",
        "тривожно",
        "тривога",
        "паніка",
        "панікую",
        "переляк",
    ],

    "disgust": [
        "огида",
        "огидно",
        "огидний",
        "огидна",
        "бридко",
        "бридкий",
        "бридка",
        "відраза",
        "відразливо",
        "мерзенно",
        "мерзота",
    ],

    "surprise": [
        "здивування",
        "здивований",
        "здивована",
        "здивувався",
        "здивувалася",
        "здивувалась",
        "неочікувано",
        "несподівано",
        "шокований",
        "шокована",
        "в шоці",
        "у шоці",
    ],

    "neutral": [
        "спокійно",
        "спокійний",
        "спокійна",
        "нормально",
        "звичайний день",
        "нічого особливого",
        "нейтрально",
    ],
}

@lru_cache(maxsize=1)
def get_text_emotion_model():
    """
    Завантажує модель та tokenizer один раз.
    """

    print("Завантаження моделі розпізнавання текстових емоцій...")

    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME
    )

    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME
    )

    model.eval()

    print("Модель розпізнавання текстових емоцій завантажена.")

    return tokenizer, model


def normalize_label(label: str) -> str:
    """
    Приводить назви емоцій моделі
    до єдиного формату MOVA.
    """

    normalized = str(label).strip().lower()

    aliases = {
        "none": "neutral",
        "neutral": "neutral",
        "joy": "joy",
        "happy": "joy",
        "anger": "anger",
        "angry": "anger",
        "fear": "fear",
        "sadness": "sadness",
        "sad": "sadness",
        "disgust": "disgust",
        "surprise": "surprise",
    }

    return aliases.get(normalized, normalized)


def get_keyword_scores(text: str) -> dict[str, int]:
    """
    Рахує кількість явних емоційних маркерів у тексті.
    """

    text_lower = text.lower()

    keyword_scores: dict[str, int] = {
        emotion: 0
        for emotion in EMOTION_KEYWORDS
    }

    for emotion, keywords in EMOTION_KEYWORDS.items():

        for keyword in keywords:

            if " " in keyword:
                if keyword in text_lower:
                    keyword_scores[emotion] += 1

                continue

            pattern = rf"(?<!\w){re.escape(keyword)}(?!\w)"

            matches = re.findall(
                pattern,
                text_lower,
                flags=re.IGNORECASE,
            )

            keyword_scores[emotion] += len(matches)

    return keyword_scores


def analyze_text_emotion(text: str) -> dict[str, Any]:
    """
    Аналізує український текст.

    Результат формується на основі:
    1. ML-моделі;
    2. явних емоційних слів користувача.

    Повертає:
    - emotion
    - emotion_ua
    - confidence
    - scores
    - scores_ua
    """

    clean_text = text.strip()

    if not clean_text:
        raise ValueError(
            "Текст для аналізу не може бути порожнім."
        )

    tokenizer, model = get_text_emotion_model()

    inputs = tokenizer(
        clean_text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True,
    )

    with torch.no_grad():
        outputs = model(**inputs)

    logits = outputs.logits[0]

    probabilities = torch.sigmoid(logits)

    id2label = model.config.id2label

    model_scores: dict[str, float] = {}

    for index, probability in enumerate(probabilities):

        raw_label = id2label.get(
            index,
            str(index),
        )

        label = normalize_label(raw_label)

        probability_value = float(
            probability.item()
        )

        model_scores[label] = probability_value

    if not model_scores:
        raise RuntimeError(
            "Модель не повернула результат аналізу."
        )

    print(
        "\n========== TEXT EMOTION =========="
    )

    print(
        "Текст:",
        clean_text,
    )

    print(
        "id2label:",
        id2label,
    )

    print(
        "Оцінки ML-моделі:"
    )

    for emotion, score in sorted(
        model_scores.items(),
        key=lambda item: item[1],
        reverse=True,
    ):
        print(
            f"  {emotion}: {score:.4f}"
        )


    keyword_scores = get_keyword_scores(
        clean_text
    )

    print(
        "Знайдені емоційні маркери:"
    )

    for emotion, count in keyword_scores.items():
        if count > 0:
            print(
                f"  {emotion}: {count}"
            )


    combined_scores = dict(
        model_scores
    )

    KEYWORD_BOOST = 0.18

    for emotion, count in keyword_scores.items():

        if count <= 0:
            continue

        current_score = combined_scores.get(
            emotion,
            0.0,
        )

        boosted_score = (
            current_score
            + KEYWORD_BOOST * count
        )

        combined_scores[emotion] = min(
            boosted_score,
            1.0,
        )


    strongest_keyword_emotion = max(
        keyword_scores,
        key=keyword_scores.get,
    )

    strongest_keyword_count = keyword_scores[
        strongest_keyword_emotion
    ]

    if strongest_keyword_count >= 2:

        current = combined_scores.get(
            strongest_keyword_emotion,
            0.0,
        )

        combined_scores[
            strongest_keyword_emotion
        ] = max(
            current,
            0.75,
        )

    main_emotion = max(
        combined_scores,
        key=combined_scores.get,
    )

    confidence = combined_scores[
        main_emotion
    ]

    confidence = max(
        0.0,
        min(confidence, 1.0),
    )


    scores = {
        emotion: round(score, 4)
        for emotion, score in combined_scores.items()
    }

    confidence = round(
        confidence,
        4,
    )


    emotion_ua = EMOTION_UA.get(
        main_emotion,
        main_emotion.capitalize(),
    )

    scores_ua = {
        EMOTION_UA.get(
            emotion,
            emotion.capitalize(),
        ): score
        for emotion, score in scores.items()
    }


    print(
        "Фінальні оцінки:"
    )

    for emotion, score in sorted(
        scores.items(),
        key=lambda item: item[1],
        reverse=True,
    ):
        print(
            f"  {emotion}: {score:.4f}"
        )

    print(
        "Основна емоція:",
        main_emotion,
    )

    print(
        "Confidence:",
        confidence,
    )

    print(
        "==================================\n"
    )

    return {
        "emotion": main_emotion,
        "emotion_ua": emotion_ua,
        "confidence": confidence,
        "scores": scores,
        "scores_ua": scores_ua,
    }