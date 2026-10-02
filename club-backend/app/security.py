"""Пароли, JWT-токены и зависимости авторизации FastAPI."""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, Header, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlmodel import Session, select

import app.config as config
from app.config import ACCESS_TOKEN_TTL_MINUTES, ALGORITHM, SECRET_KEY
from app.database import get_session
from app.models import User

# pbkdf2_sha256 — чистый python, без нативных зависимостей.
# В проде можно перейти на bcrypt/argon2.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
# Токен берём из Authorization: Bearer (скрипты, тесты), а если его нет — из
# HttpOnly-cookie (браузер). auto_error=False — отсутствие заголовка решаем сами.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES)
    payload = {"sub": str(user.id), "role": user.role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        config.AUTH_COOKIE_NAME, token,
        max_age=ACCESS_TOKEN_TTL_MINUTES * 60, path="/",
        httponly=True, secure=config.COOKIE_SECURE, samesite="strict",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        config.AUTH_COOKIE_NAME, path="/",
        httponly=True, secure=config.COOKIE_SECURE, samesite="strict",
    )


def get_current_user(
    request: Request,
    bearer: Optional[str] = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить авторизацию",
        headers={"WWW-Authenticate": "Bearer"},
    )
    # Явный заголовок важнее cookie (скрипт может действовать от другого пользователя).
    token = bearer or request.cookies.get(config.AUTH_COOKIE_NAME)
    if not token:
        raise credentials_error
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_error
    except jwt.PyJWTError:
        raise credentials_error

    user = session.get(User, int(user_id))
    if user is None:
        raise credentials_error
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ только для администратора",
        )
    return user


def require_api_key(x_api_key: str = Header(default="")) -> None:
    """Доступ внешних систем по ключу в заголовке X-API-Key (EXTERNAL_API_KEY)."""
    expected = config.EXTERNAL_API_KEY
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Внешний API отключён (не задан EXTERNAL_API_KEY)",
        )
    if not secrets.compare_digest(x_api_key.encode(), expected.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный API-ключ",
        )
