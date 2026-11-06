import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash


load_dotenv(Path(__file__).resolve().parent / ".env")

APP_SECRET_KEY = os.getenv("APP_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

password_hasher = PasswordHash.recommended()


def get_secret_key() -> str:
    if not APP_SECRET_KEY:
        raise RuntimeError(
            "APP_SECRET_KEY не вказаний у файлі .env"
        )

    return APP_SECRET_KEY


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(
    password: str,
    password_hash: str,
) -> bool:
    return password_hasher.verify(
        password,
        password_hash,
    )


def create_access_token(
    user_id: int,
    email: str,
) -> str:
    expiration_time = (
        datetime.now(timezone.utc)
        + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )

    payload = {
        "sub": str(user_id),
        "email": email,
        "purpose": "access",
        "exp": expiration_time,
    }

    return jwt.encode(
        payload,
        get_secret_key(),
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> int:
    payload = jwt.decode(
        token,
        get_secret_key(),
        algorithms=[ALGORITHM],
    )

    if payload.get("purpose") != "access":
        raise jwt.InvalidTokenError(
            "Некоректне призначення токена"
        )

    user_id = payload.get("sub")

    if not user_id:
        raise jwt.InvalidTokenError(
            "У токені відсутній ідентифікатор користувача"
        )

    try:
        return int(user_id)

    except (TypeError, ValueError) as error:
        raise jwt.InvalidTokenError(
            "Некоректний ідентифікатор користувача"
        ) from error