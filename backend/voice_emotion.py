from pathlib import Path
from audio_emotion import analyze_audio_emotion
import torch
from transformers import (
    AutoModelForSpeechSeq2Seq,
    AutoProcessor,
    pipeline,
)

from text_emotion import analyze_text_emotion


MODEL_NAME = "openai/whisper-small"

DEVICE = (
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)

TORCH_DTYPE = (
    torch.float16
    if DEVICE == "cuda"
    else torch.float32
)


print("Завантаження моделі розпізнавання голосу...")

processor = AutoProcessor.from_pretrained(
    MODEL_NAME
)

model = AutoModelForSpeechSeq2Seq.from_pretrained(
    MODEL_NAME,
    torch_dtype=TORCH_DTYPE,
    low_cpu_mem_usage=True,
)

model.to(DEVICE)


speech_recognizer = pipeline(
    task="automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    torch_dtype=TORCH_DTYPE,
    device=0 if DEVICE == "cuda" else -1,
)


print("Модель розпізнавання голосу завантажена.")


def transcribe_audio(
    audio_path: str,
) -> str:
    """
    Перетворює голосовий запис у текст
    за допомогою готової моделі Whisper.
    """

    path = Path(audio_path)

    if not path.exists():
        raise ValueError(
            "Аудіофайл не знайдено"
        )

    if not path.is_file():
        raise ValueError(
            "Некоректний шлях до аудіофайлу"
        )

    try:
        result = speech_recognizer(
            str(path),
            generate_kwargs={
                "language": "ukrainian",
                "task": "transcribe",
            },
        )

    except Exception as error:
        raise ValueError(
            "Не вдалося розпізнати голосовий запис: "
            f"{error}"
        ) from error

    text = result.get(
        "text",
        "",
    ).strip()

    if not text:
        raise ValueError(
            "Не вдалося розпізнати мовлення. "
            "Спробуйте записати голос ще раз."
        )

    return text


def analyze_voice_emotion(audio_path: str) -> dict:
    transcript = transcribe_audio(audio_path)

    text_analysis = analyze_text_emotion(transcript)
    audio_analysis = analyze_audio_emotion(audio_path)

    return {
        "transcript": transcript,
        "emotion": text_analysis["emotion"],
        "confidence": text_analysis["confidence"],
        "scores": text_analysis["scores"],
        "audio_analysis": audio_analysis,
    }


if __name__ == "__main__":
    print(
        "voice_emotion.py готовий до роботи."
    )