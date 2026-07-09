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
    index: int   # порядковый номер варианта (1-based) — его и отправляет фронт
    text: str


class QuizQuestionOut(BaseModel):
    code: str
    aspect: str
    text: str
    options: list[QuizOption]


class QuizSubmit(BaseModel):
    answers: dict[str, int]   # {"M": 3, "S": 1, "Mg": 2} значение = индекс варианта


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
    balanced: bool = False   # все три уровня равны → рисуем цилиндр, а не часы
    hint: Optional[str] = None
    cards: list[CardOut] = []
    # Плейсхолдер под будущий прогресс из GetCourse (сейчас не заполняется).
    getcourse_progress: Optional[int] = None


# --- Статистика (админка) ---
class AdminStats(BaseModel):
    total_users: int
    quiz_completed: int
    quiz_pending: int


# --- Контент траектории (админка) ---
class CardAdminOut(BaseModel):
    id: int
    aspect: str
    level: int
    position: int
    title: str
    getcourse_url: Optional[str] = None
    cover: Optional[str] = None


class CardUpdate(BaseModel):
    title: Optional[str] = None
    getcourse_url: Optional[str] = None
    cover: Optional[str] = None


class HintOut(BaseModel):
    id: int
    aspect: str
    level: int
    hint_text: str


class HintUpdate(BaseModel):
    hint_text: str


class UploadOut(BaseModel):
    url: str
