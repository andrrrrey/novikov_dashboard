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


class Setting(SQLModel, table=True):
    """Простое key-value хранилище настроек (плашка, доступ к GetCourse и т.п.)."""
    key: str = Field(primary_key=True)
    value: str = ""


class GcGroup(SQLModel, table=True):
    """
    Группа GetCourse вида «Урок NN просмотрен» — один сегмент прогресса.
    Заполняется опросом GetCourse. counts=True → входит в расчёт уровня.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    gc_id: int = Field(index=True, unique=True)   # id группы в GetCourse
    name: str
    lesson_number: int = Field(index=True)        # номер урока из названия
    counts: bool = Field(default=True)            # учитывать при расчёте уровня


class LessonView(SQLModel, table=True):
    """
    Хранилище «кто какой урок просмотрел». Строка = резидент состоит в группе урока.
    email — из GetCourse (lower-case), user_id проставляется сопоставлением по email.
    """
    __table_args__ = (UniqueConstraint("email", "gc_group_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True)                # email из GetCourse, lower-case
    gc_group_id: int = Field(index=True)          # GcGroup.gc_id
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", index=True)
    first_seen: datetime = Field(default_factory=_now)


class GcAssignment(SQLModel, table=True):
    """
    Привязка группы GetCourse к шкале прогресса.
    track="exp"  → задаёт category (marketing|sales|management) и level (1..N).
    track="know" → «Знания» (плоская шкала), category/level = None.
    """
    __table_args__ = (UniqueConstraint("track", "category", "level", "gc_group_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    track: str = Field(index=True)                     # "exp" | "know"
    category: Optional[str] = Field(default=None, index=True)   # marketing|sales|management
    level: Optional[int] = Field(default=None, index=True)      # 1..N (для exp)
    gc_group_id: int = Field(index=True)              # GcGroup.gc_id


class UserStats(SQLModel, table=True):
    """
    Ручные и вычисляемые показатели резидента.
    influence — «Влияние», очки, которые ставит админ.
    exp_level / exp_level_since — уровень «Опыт» (сумма уровней категорий) и момент его достижения,
    нужны для «дней на уровне».
    """
    user_id: int = Field(foreign_key="user.id", primary_key=True)
    influence: int = Field(default=0)
    exp_level: int = Field(default=0)
    exp_level_since: datetime = Field(default_factory=_now)
