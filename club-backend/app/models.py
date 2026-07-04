"""Модели данных приложения."""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel, UniqueConstraint


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)   # логин = email
    password_hash: str
    role: str = Field(default="user")             # "user" | "admin"
    created_at: datetime = Field(default_factory=_now)


class QuizResult(SQLModel, table=True):
    """Результат квиза резидента. Один активный результат на пользователя."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True, unique=True)

    marketing_level: int
    sales_level: int
    management_level: int
    bottleneck_aspect: str        # "marketing" | "sales" | "management"
    bottleneck_level: int

    answers_json: str             # сырые ответы, для истории/аудита
    taken_at: datetime = Field(default_factory=_now)


class ContentCard(SQLModel, table=True):
    """Карточка траектории. 3 аспекта × 3 уровня × 3 позиции = 27 строк."""
    __table_args__ = (UniqueConstraint("aspect", "level", "position"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    aspect: str = Field(index=True)   # marketing | sales | management
    level: int = Field(index=True)    # 1 | 2 | 3
    position: int                     # 1 | 2 | 3
    title: str
    getcourse_url: Optional[str] = None   # заполняется командой клуба
    cover: Optional[str] = None           # имя файла / URL обложки


class TrajectoryHint(SQLModel, table=True):
    """Подсказка под узким местом. Одна на пару аспект+уровень."""
    __table_args__ = (UniqueConstraint("aspect", "level"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    aspect: str = Field(index=True)
    level: int = Field(index=True)
    hint_text: str
