import os
import smtplib
import ssl
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
import jwt
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parent / ".env")

APP_SECRET_KEY = os.getenv("APP_SECRET_KEY")
MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "").replace(" ", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")


def create_verification_token(email: str) -> str:
    payload = {
        "sub": email,
        "purpose": "email_verification",
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }

    return jwt.encode(payload, APP_SECRET_KEY, algorithm="HS256")


def decode_verification_token(token: str) -> str:
    payload = jwt.decode(
        token,
        APP_SECRET_KEY,
        algorithms=["HS256"],
    )

    if payload.get("purpose") != "email_verification":
        raise ValueError("Некоректне призначення токена")

    return payload["sub"]


def send_verification_email(recipient_email: str, token: str) -> None:
    if not APP_SECRET_KEY or not MAIL_USERNAME or not MAIL_PASSWORD:
        raise RuntimeError("Не заповнені налаштування електронної пошти у .env")

    verification_link = (
        f"{BACKEND_URL}/auth/verify-email?token={token}"
    )

    message = EmailMessage()
    message["Subject"] = "Підтвердження електронної пошти — MOVA"
    message["From"] = MAIL_USERNAME
    message["To"] = recipient_email

    message.set_content(
        f"""
Вітаємо у MOVA!

Щоб підтвердити електронну пошту та активувати профіль,
перейдіть за посиланням:

{verification_link}

Посилання діятиме протягом 24 годин.

Якщо ви не створювали профіль у MOVA, просто проігноруйте цей лист.
"""
    )

    ssl_context = ssl.create_default_context()

    with smtplib.SMTP_SSL(
        "smtp.gmail.com",
        465,
        context=ssl_context,
    ) as smtp:
        smtp.login(MAIL_USERNAME, MAIL_PASSWORD)
        smtp.send_message(message)