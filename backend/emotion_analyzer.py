from pathlib import Path
import cv2
import numpy as np
from keras.layers import Dropout, Rescaling
from keras.models import load_model
from keras.preprocessing.image import img_to_array


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "best1_efficientnet_model_v2.h5"

EMOTION_LABELS = [
    "angry",
    "disgust",
    "fear",
    "happy",
    "neutral",
    "sad",
    "surprise",
]

model = load_model(
    MODEL_PATH,
    compile=False,
    custom_objects={
        "FixedDropout": Dropout,
        "Rescaling": Rescaling,
    },
)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades
    + "haarcascade_frontalface_default.xml"
)


def analyze_emotion(image_path: str) -> dict:
    image = cv2.imread(image_path)

    if image is None:
        raise ValueError(
            "Не вдалося прочитати зображення"
        )

    gray_image = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )

    faces = face_cascade.detectMultiScale(
        gray_image,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(50, 50),
    )

    if len(faces) == 0:
        raise ValueError(
            "На фотографії не знайдено обличчя"
        )

    x, y, width, height = max(
        faces,
        key=lambda face: face[2] * face[3],
    )

    face = image[
        y:y + height,
        x:x + width,
    ]

    face = cv2.resize(face, (96, 96))
    face = face.astype("float32") / 255.0
    face = img_to_array(face)
    face = np.expand_dims(face, axis=0)

    prediction = model.predict(
        face,
        verbose=0,
    )[0]

    dominant_index = int(np.argmax(prediction))
    confidence = float(prediction[dominant_index])

    scores = {
        emotion: float(score)
        for emotion, score in zip(
            EMOTION_LABELS,
            prediction,
        )
    }

    return {
        "emotion": EMOTION_LABELS[dominant_index],
        "confidence": confidence,
        "scores": scores,
        "is_low_confidence": confidence < 0.4,
    }