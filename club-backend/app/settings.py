"""Хелперы работы с key-value настройками (таблица Setting)."""

from typing import Optional

from sqlmodel import Session

from app.models import Setting

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
