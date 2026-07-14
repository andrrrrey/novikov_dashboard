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
    # Общий уровень из GetCourse (0..10) и прогресс по урокам. None, если GC не настроен.
    overall_level: Optional[int] = None
    lessons_viewed: Optional[int] = None
    total_lessons: Optional[int] = None
    # Плашка «Повышайте свой уровень» (настраивается в админке).
    promo_title: str = "Повышайте свой уровень"
    promo_image: Optional[str] = None
    promo_link: Optional[str] = None


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


# --- Плашка «Повышайте свой уровень» (админка) ---
class PromoOut(BaseModel):
    title: str
    image: Optional[str] = None
    link: Optional[str] = None


class PromoUpdate(BaseModel):
    title: Optional[str] = None
    image: Optional[str] = None
    link: Optional[str] = None


# --- GetCourse (админка) ---
class GcGroupOut(BaseModel):
    id: int
    gc_id: int
    name: str
    lesson_number: int
    counts: bool


class GetCourseOut(BaseModel):
    account: str
    api_key_set: bool           # ключ не отдаём наружу, только флаг «задан»
    poll_hours: float
    last_sync: Optional[str] = None
    last_status: Optional[str] = None
    total_lessons: int          # число засчитываемых групп (N для шкалы)
    groups: list[GcGroupOut] = []


class GetCourseUpdate(BaseModel):
    account: Optional[str] = None
    api_key: Optional[str] = None
    poll_hours: Optional[float] = None


class GcGroupUpdate(BaseModel):
    counts: bool


class SyncOut(BaseModel):
    started: bool
    detail: str
