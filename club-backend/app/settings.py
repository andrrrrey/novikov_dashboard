"""
Хелперы работы с key-value настройками (таблица Setting) и расчёт общего
уровня резидента из данных GetCourse.

Уровень 1–10: делим все засчитываемые сегменты (группы «Урок NN просмотрен»)
поровну по шкале и берём ceil. Ноль просмотров → уровень 0.
"""

import math
from typing import Optional

from sqlmodel import Session, func, select

from app.models import GcGroup, LessonView, Setting

# Значения по умолчанию для известных ключей настроек.
DEFAULTS = {
    "gc_account": "",          # поддомен GetCourse: {account}.getcourse.ru
    "gc_api_key": "",          # секретный ключ API
    "gc_poll_hours": "2",      # период опроса, часы
    "gc_last_sync": "",        # ISO-время последней синхронизации
    "gc_last_status": "",      # текст статуса последней синхронизации
    "gc_cursor": "0",          # round-robin курсор по группам (бюджет запросов)
    "promo_image": "",         # обложка плашки «Повышайте свой уровень»
    "promo_link": "",          # ссылка плашки
    "promo_title": "Повышайте свой уровень",
}


def get_setting(session: Session, key: str, default: Optional[str] = None) -> str:
    row = session.get(Setting, key)
    if row is not None:
        return row.value
    return default if default is not None else DEFAULTS.get(key, "")


def set_setting(session: Session, key: str, value: str) -> None:
    row = session.get(Setting, key)
    if row is None:
        session.add(Setting(key=key, value=value))
    else:
        row.value = value
        session.add(row)


def compute_overall_level(session: Session, email: str) -> tuple[int, int, int]:
    """
    Возвращает (просмотрено, всего_сегментов, уровень 0..10) для резидента по email.

    total  — число засчитываемых групп (counts=True).
    viewed — сколько из них резидент просмотрел (записи LessonView по его email).
    level  = 0 если total == 0, иначе ceil(viewed / total * 10), клампится в 0..10.
    """
    email = (email or "").strip().lower()

    total = session.exec(
        select(func.count()).select_from(GcGroup).where(GcGroup.counts == True)  # noqa: E712
    ).one()

    if not total:
        return 0, 0, 0

    # Считаем только просмотры в засчитываемых группах.
    counting_ids = session.exec(
        select(GcGroup.gc_id).where(GcGroup.counts == True)  # noqa: E712
    ).all()
    viewed = session.exec(
        select(func.count()).select_from(LessonView).where(
            LessonView.email == email,
            LessonView.gc_group_id.in_(counting_ids),
        )
    ).one()

    level = math.ceil(viewed / total * 10)
    level = max(0, min(10, level))
    return viewed, total, level
