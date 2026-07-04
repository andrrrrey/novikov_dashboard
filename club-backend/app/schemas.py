"""Pydantic-схемы для входных и выходных данных API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# --- Авторизация ---
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


# --- Пользователи (админка) ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    created_at: datetime
    quiz_taken: bool = False


# --- Квиз ---
class QuizOption(BaseModel):
    level: int
    text: str


class QuizQuestionOut(BaseModel):
    code: str
    aspect: str
    text: str
    options: list[QuizOption]


class QuizSubmit(BaseModel):
    answers: dict[str, int]   # {"M1": 1, "M2": 2, ...} значение = уровень 1..3


# --- Дашборд ---
class CardOut(BaseModel):
    position: int
    title: str
    getcourse_url: Optional[str] = None
    cover: Optional[str] = None


class DashboardOut(BaseModel):
    quiz_taken: bool
    marketing_level: Optional[int] = None
    sales_level: Optional[int] = None
    management_level: Optional[int] = None
    bottleneck_aspect: Optional[str] = None
    bottleneck_level: Optional[int] = None
    hint: Optional[str] = None
    cards: list[CardOut] = []
    # Плейсхолдер под будущий прогресс из GetCourse (сейчас не заполняется).
    getcourse_progress: Optional[int] = None


# --- Статистика (админка) ---
class AdminStats(BaseModel):
    total_users: int
    quiz_completed: int
    quiz_pending: int
