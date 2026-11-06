import os
import sys
import traceback
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types


BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

ENV_PATH = os.path.join(
    BASE_DIR,
    ".env",
)

load_dotenv(
    dotenv_path=ENV_PATH,
    override=True,
)



if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(
        encoding="utf-8"
    )

if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(
        encoding="utf-8"
    )


GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY",
    "",
).strip()

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "",
).strip()


def validate_gemini_api_key() -> bool:

    if not GEMINI_API_KEY:
        print(
            "GEMINI: API key не знайдено. "
            f"Перевір файл: {ENV_PATH}"
        )
        return False

    try:
        GEMINI_API_KEY.encode("ascii")

    except UnicodeEncodeError:
        print(
            "GEMINI: API key містить "
            "non-ASCII символ."
        )

        for index, char in enumerate(
            GEMINI_API_KEY
        ):
            if ord(char) > 127:
                print(
                    "Проблемний символ:",
                    f"позиція={index},",
                    f"символ={repr(char)},",
                    f"unicode={hex(ord(char))}",
                )

        return False

    if not GEMINI_MODEL:
        print(
            "GEMINI: модель не вказана. "
            "Додай GEMINI_MODEL у backend/.env"
        )
        return False

    print(
        "GEMINI: API key завантажено."
    )

    print(
        "GEMINI: довжина ключа =",
        len(GEMINI_API_KEY),
    )

    print(
        "GEMINI: model =",
        GEMINI_MODEL,
    )

    return True


GEMINI_AVAILABLE = validate_gemini_api_key()



EMOTION_LABELS = {
    "ANGER": "злість",
    "DISGUST": "відраза",
    "FEAR": "страх",
    "JOY": "радість",
    "NEUTRAL": "нейтральний стан",
    "SADNESS": "смуток",
    "SURPRISE": "здивування",
}


EMOTION_FIELDS = {
    "ANGER": "anger_score",
    "DISGUST": "disgust_score",
    "FEAR": "fear_score",
    "JOY": "joy_score",
    "NEUTRAL": "neutral_score",
    "SADNESS": "sadness_score",
    "SURPRISE": "surprise_score",
}



def emotion_name(
    emotion: str | None,
) -> str:


    if not emotion:
        return "невизначена емоція"

    normalized = (
        str(emotion)
        .strip()
        .upper()
    )

    return EMOTION_LABELS.get(
        normalized,
        str(emotion).lower(),
    )


def percent(
    value: float | None,
) -> str:


    if value is None:
        return "немає даних"

    try:
        number = float(value)

    except (TypeError, ValueError):
        return "немає даних"

    if 0 <= number <= 1:
        number *= 100

    return f"{number:.1f}%"


def get_analysis_scores(
    analysis: Any,
) -> list[tuple[str, float]]:


    if analysis is None:
        return []

    result: list[tuple[str, float]] = []

    for emotion, field_name in (
        EMOTION_FIELDS.items()
    ):
        value = getattr(
            analysis,
            field_name,
            None,
        )

        if value is None:
            continue

        try:
            score = float(value)

        except (TypeError, ValueError):
            continue

        result.append(
            (
                emotion,
                score,
            )
        )

    result.sort(
        key=lambda item: item[1],
        reverse=True,
    )

    return result


def format_analysis(
    analysis: Any,
) -> str:


    if analysis is None:
        return (
            "Результат емоційного "
            "аналізу відсутній."
        )

    emotion = getattr(
        analysis,
        "emotion",
        None,
    )

    confidence = getattr(
        analysis,
        "confidence",
        None,
    )

    lines = [
        (
            "Домінантна емоція: "
            f"{emotion_name(emotion)}."
        ),
        (
            "Впевненість моделі: "
            f"{percent(confidence)}."
        ),
    ]

    scores = get_analysis_scores(
        analysis
    )

    if scores:
        lines.append(
            "Повний розподіл емоцій:"
        )

        for emotion, score in scores:
            lines.append(
                f"- {emotion_name(emotion)}: "
                f"{percent(score)}"
            )

    return "\n".join(lines)



def format_diary_entry(
    entry: Any,
    number: int,
) -> str:


    lines: list[str] = [
        f"ЗАПИС #{number}",
    ]

    created_at = getattr(
        entry,
        "created_at",
        None,
    )

    if created_at is not None:
        try:
            lines.append(
                "Час запису: "
                f"{created_at.strftime('%H:%M')}"
            )
        except Exception:
            pass

    text_entry = getattr(
        entry,
        "text_entry",
        None,
    )

    if text_entry is not None:
        lines.append(
            "Тип запису: текстовий."
        )

        content = getattr(
            text_entry,
            "content",
            None,
        )

        if content:
            cleaned_content = str(
                content
            ).strip()

            if cleaned_content:
                lines.append(
                    "Текст користувача:"
                )

                lines.append(
                    cleaned_content
                )

    voice_entry = getattr(
        entry,
        "voice_entry",
        None,
    )

    if voice_entry is not None:
        lines.append(
            "Тип запису: голосовий."
        )

        transcription = getattr(
            voice_entry,
            "transcription",
            None,
        )

        if transcription:
            cleaned_transcription = str(
                transcription
            ).strip()

            if cleaned_transcription:
                lines.append(
                    "Транскрипція "
                    "голосового повідомлення:"
                )

                lines.append(
                    cleaned_transcription
                )

        else:
            lines.append(
                "Транскрипція голосового "
                "повідомлення відсутня."
            )

 
    image_entry = getattr(
        entry,
        "image_entry",
        None,
    )

    if image_entry is not None:
        lines.append(
            "Тип запису: фотографія."
        )

        lines.append(
            "Для фотографії використовуй "
            "лише результат моделі "
            "розпізнавання емоцій. "
            "Не вигадуй зміст фотографії."
        )

    analysis = getattr(
        entry,
        "analysis_result",
        None,
    )

    lines.append(
        "Результат аналізу запису:"
    )

    lines.append(
        format_analysis(
            analysis
        )
    )

    return "\n".join(lines)


def format_daily_scores(
    daily_scores: dict[str, float],
) -> str:

    if not daily_scores:
        return (
            "Немає агрегованих оцінок."
        )

    sorted_scores = sorted(
        daily_scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    lines: list[str] = []

    for emotion, score in sorted_scores:
        lines.append(
            f"- {emotion_name(emotion)}: "
            f"{percent(score)}"
        )

    return "\n".join(lines)



def build_fallback_recommendation(
    dominant_emotion: str,
    dominant_score: float,
    total_entries: int,
) -> str:

    emotion = emotion_name(
        dominant_emotion
    )

    score = percent(
        dominant_score
    )

    recommendations = {
        "JOY": (
            "Сьогодні у твоїх записах "
            "переважає радість. "
            "Зверни увагу на події та людей, "
            "які підтримували цей стан, "
            "і спробуй зберегти для себе те, "
            "що зробило день приємним."
        ),

        "SADNESS": (
            "Сьогодні у твоїх записах "
            "помітний смуток. "
            "Спробуй дати собі трохи часу "
            "на відпочинок і подумати, "
            "які події найбільше вплинули "
            "на твій стан. "
            "Підтримка близької людини "
            "також може бути корисною."
        ),

        "ANGER": (
            "Сьогодні у твоїх записах "
            "помітна злість. "
            "Перед важливими рішеннями "
            "спробуй зробити невелику паузу "
            "та визначити, яка саме ситуація "
            "викликала найбільше напруження."
        ),

        "FEAR": (
            "Сьогодні у твоїх записах "
            "помітний страх або тривожне "
            "напруження. "
            "Спробуй відокремити те, "
            "на що ти можеш вплинути зараз, "
            "від того, що не потребує "
            "негайного рішення."
        ),

        "DISGUST": (
            "Сьогодні у твоїх записах "
            "помітне сильне неприйняття "
            "певних переживань або ситуацій. "
            "Спробуй визначити, що саме "
            "викликало таку реакцію "
            "та які особисті межі "
            "для тебе важливі."
        ),

        "SURPRISE": (
            "Сьогодні день містив помітну "
            "частку здивування. "
            "Спробуй пригадати, які "
            "несподівані події найбільше "
            "вплинули на твій емоційний стан "
            "і чи були вони для тебе "
            "позитивними."
        ),

        "NEUTRAL": (
            "Сьогодні твій загальний "
            "емоційний стан був переважно "
            "нейтральним. "
            "Спробуй коротко підсумувати, "
            "що найбільше вплинуло на твій "
            "стан, і заплануй час "
            "на відпочинок або приємну "
            "для себе активність."
        ),
    }

    normalized_emotion = (
        dominant_emotion or "NEUTRAL"
    ).strip().upper()

    base = recommendations.get(
        normalized_emotion,
        recommendations["NEUTRAL"],
    )

    return (
        f"За день проаналізовано "
        f"{total_entries} збережених записів. "
        f"Основна емоція дня — "
        f"{emotion} ({score}). "
        f"{base}"
    )


SYSTEM_INSTRUCTION = """
Ти є модулем формування рекомендацій для застосунку
«Щоденник емоцій».

Тобі передаються результати автоматичного аналізу
емоцій користувача за один конкретний день.

Джерелами можуть бути:
1. текстові записи;
2. транскрипції голосових повідомлень;
3. результати аналізу емоцій на фотографіях.

Твоє завдання — сформувати одну коротку,
персоналізовану та корисну рекомендацію
українською мовою.

ОБОВ'ЯЗКОВІ ПРАВИЛА:

- Проаналізуй усі передані записи разом.
- Враховуй зміст текстових записів.
- Враховуй зміст транскрипцій голосових повідомлень.
- Для фотографій використовуй лише результати
  моделі розпізнавання емоцій.
- Враховуй домінантну емоцію дня.
- Враховуй повний розподіл емоцій.
- Звертай увагу на повторювані теми у текстах
  і транскрипціях.
- Якщо причина емоції явно згадується користувачем,
  можна обережно послатися на неї.
- Не вигадуй події, людей, причини або обставини,
  яких немає у переданих даних.
- Не стверджуй, що точно знаєш причину емоції.
- Не став медичних або психологічних діагнозів.
- Не називай користувача психічно хворим.
- Не призначай медикаменти.
- Не перебільшуй точність моделей
  розпізнавання емоцій.
- Результати моделей трактуй як оцінки,
  а не як абсолютну істину.
- Не пиши технічні слова на кшталт
  "нейромережа", "classifier", "prompt" або "API".
- Не перераховуй механічно всі відсотки —
  користувач бачить їх окремо в інтерфейсі.
- Не починай кожну рекомендацію однаковою фразою.
- Рекомендація повинна залежати від конкретних
  записів цього дня.
- Якщо даних мало, не вигадуй додатковий контекст.
- Порада повинна бути реально виконуваною.
- Тон — спокійний, доброзичливий та ненав'язливий.
- Не використовуй Markdown.
- Не використовуй заголовки.
- Не використовуй списки.
- Не використовуй емодзі.
- Не обрізай речення.
- Завжди заверши останнє речення повністю.
- Поверни лише готовий текст рекомендації.

Бажаний обсяг:
приблизно 3-5 коротких речень.
""".strip()



def clean_gemini_response(
    text: str,
) -> str:


    result = str(
        text or ""
    ).strip()

    if not result:
        return ""

    result = (
        result
        .strip("`")
        .strip()
    )


    if (
        len(result) >= 2
        and result[0] == result[-1]
        and result[0] in {'"', "'"}
    ):
        result = result[1:-1].strip()

    return result



def print_gemini_debug(
    response: Any,
) -> None:


    try:
        candidates = getattr(
            response,
            "candidates",
            None,
        )

        if not candidates:
            print(
                "GEMINI DEBUG: candidates відсутні."
            )
            return

        for index, candidate in enumerate(
            candidates,
            start=1,
        ):
            finish_reason = getattr(
                candidate,
                "finish_reason",
                None,
            )

            print(
                f"GEMINI DEBUG: candidate #{index}, "
                f"finish_reason={finish_reason}"
            )

    except Exception as debug_error:
        print(
            "GEMINI DEBUG ERROR:",
            repr(debug_error),
        )



def generate_daily_recommendation(
    *,
    entries: list[Any],
    dominant_emotion: str,
    dominant_score: float,
    daily_scores: dict[str, float],
    text_count: int = 0,
    voice_count: int = 0,
    image_count: int = 0,
) -> str:


    total_entries = len(
        entries
    )

 
    if total_entries == 0:
        return (
            "За цей день поки немає достатньо "
            "збережених записів для формування "
            "персоналізованої рекомендації."
        )


    formatted_entries: list[str] = []

    for index, entry in enumerate(
        entries,
        start=1,
    ):
        formatted_entries.append(
            format_diary_entry(
                entry,
                index,
            )
        )

    entries_context = "\n\n".join(
        formatted_entries
    )


    prompt = f"""
Проаналізуй емоційний стан користувача за цей день
та сформуй одну персоналізовану рекомендацію.

КІЛЬКІСТЬ ЗАПИСІВ:

Усього: {total_entries}
Текстових: {text_count}
Голосових: {voice_count}
Фотографій: {image_count}

ЗАГАЛЬНИЙ РЕЗУЛЬТАТ ДНЯ:

Основна емоція:
{emotion_name(dominant_emotion)}

Вираженість основної емоції:
{percent(dominant_score)}

Повний агрегований розподіл:

{format_daily_scores(daily_scores)}

УСІ ЗАПИСИ КОРИСТУВАЧА ЗА ЦЕЙ ДЕНЬ:

{entries_context}

На основі цих даних сформуй одну коротку
персоналізовану рекомендацію українською мовою.

Особливо зверни увагу на зміст текстових записів
і транскрипцій голосових повідомлень.

Якщо у записах видно конкретну повторювану тему,
наприклад навчання, роботу, конфлікт, втому,
спілкування, відпочинок або приємну подію,
можеш обережно врахувати її в рекомендації.

Не вигадуй тему, якщо її немає у записах.

Для фотографій не вигадуй контекст зображення.
Використовуй тільки передані результати
емоційного аналізу.

Дай завершену рекомендацію з 3-5 коротких речень.
Не обривай останнє речення.
Не використовуй Markdown.
Поверни тільки текст рекомендації.
""".strip()


    if not GEMINI_AVAILABLE:
        print(
            "WARNING: Gemini недоступний. "
            "Використовується резервна рекомендація."
        )

        return build_fallback_recommendation(
            dominant_emotion=dominant_emotion,
            dominant_score=dominant_score,
            total_entries=total_entries,
        )


    try:

        GEMINI_API_KEY.encode(
            "ascii"
        )

        client = genai.Client(
            api_key=GEMINI_API_KEY,
        )

        print(
            "\n========== GEMINI REQUEST =========="
        )

        print(
            "Модель:",
            GEMINI_MODEL,
        )

        print(
            "Кількість записів:",
            total_entries,
        )

        print(
            "Текстових:",
            text_count,
        )

        print(
            "Голосових:",
            voice_count,
        )

        print(
            "Фото:",
            image_count,
        )

        print(
            "Prompt length:",
            len(prompt),
        )

        print(
            "Prompt UTF-8 bytes:",
            len(
                prompt.encode("utf-8")
            ),
        )

        print(
            "====================================\n"
        )

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,


                temperature=0.6,


                max_output_tokens=700,
            ),
        )


        print_gemini_debug(
            response
        )


        raw_text = ""

        try:
            raw_text = (
                response.text or ""
            )

        except Exception as text_error:
            print(
                "GEMINI: не вдалося прочитати "
                "response.text:"
            )

            print(
                repr(text_error)
            )

        recommendation = clean_gemini_response(
            raw_text
        )


        if not recommendation:
            raise ValueError(
                "Gemini повернув порожню "
                "рекомендацію."
            )


        if recommendation[-1] not in ".!?…":
            print(
                "WARNING: Gemini повернув "
                "незавершений текст."
            )

            retry_prompt = f"""
{prompt}

ВАЖЛИВО:
Попередня відповідь була незавершеною.
Сформуй рекомендацію заново.

Напиши 3-5 КОРОТКИХ завершених речень.
Обов'язково заверши останнє речення крапкою.
Не використовуй Markdown.
Поверни тільки готову рекомендацію.
""".strip()

            retry_response = (
                client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=retry_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=(
                            SYSTEM_INSTRUCTION
                        ),
                        temperature=0.5,
                        max_output_tokens=700,
                    ),
                )
            )

            print(
                "\n========== GEMINI RETRY =========="
            )

            print_gemini_debug(
                retry_response
            )

            retry_text = ""

            try:
                retry_text = (
                    retry_response.text or ""
                )

            except Exception as retry_text_error:
                print(
                    "GEMINI RETRY: "
                    "не вдалося прочитати text:"
                )

                print(
                    repr(retry_text_error)
                )

            retry_recommendation = (
                clean_gemini_response(
                    retry_text
                )
            )

            if retry_recommendation:
                recommendation = (
                    retry_recommendation
                )


        print(
            "\n========== GEMINI SUCCESS =========="
        )

        print(
            "Модель:",
            GEMINI_MODEL,
        )

        print(
            "Отримано рекомендацію:"
        )

        print(
            recommendation
        )

        print(
            "Довжина рекомендації:",
            len(recommendation),
        )

        print(
            "====================================\n"
        )

        return recommendation


    except Exception as error:
        print(
            "\n========== GEMINI ERROR =========="
        )

        print(
            "Тип помилки:",
            type(error).__name__,
        )

        print(
            "Помилка:",
            str(error),
        )

        print(
            "Повна помилка:",
            repr(error),
        )

        print(
            "Модель:",
            GEMINI_MODEL,
        )

        print(
            "API key знайдено:",
            bool(GEMINI_API_KEY),
        )

        print(
            "Довжина API key:",
            len(GEMINI_API_KEY),
        )

        try:
            GEMINI_API_KEY.encode(
                "ascii"
            )

            print(
                "API key ASCII: OK"
            )

        except UnicodeEncodeError as key_error:
            print(
                "API key ASCII: ERROR"
            )

            print(
                "Помилка ключа:",
                repr(key_error),
            )

            for index, char in enumerate(
                GEMINI_API_KEY
            ):
                if ord(char) > 127:
                    print(
                        "Проблемний символ ключа:",
                        f"позиція={index},",
                        f"символ={repr(char)},",
                        f"unicode={hex(ord(char))}",
                    )

        print(
            "Prompt length:",
            len(prompt),
        )

        print(
            "Prompt UTF-8 bytes:",
            len(
                prompt.encode("utf-8")
            ),
        )


        traceback.print_exc()

        print(
            "==================================\n"
        )


        return build_fallback_recommendation(
            dominant_emotion=dominant_emotion,
            dominant_score=dominant_score,
            total_entries=total_entries,
        )