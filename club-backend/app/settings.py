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
    "promo_image": "",         # (устарело) обложка баннера — больше не используется
    "promo_link": "",          # (устарело) единая ссылка — заменена на promo_links
    "promo_links": "",         # JSON {aspect: {level: url}} — ссылки баннера по аспект+уровень
    "promo_title": "Запустить траекторию развития",
    "business_level_max": "9", # сумма уровней категорий, соответствующая 100% (макс. уровень бизнеса)
    # Тексты попапов-подсказок к показателям дашборда (редактируются в админке).
    "info_knowledge": (
        "Сколько обучающих материалов клуба вы уже изучили. Это ваша база теории. "
        "Показатель растёт по мере прохождения материалов и напрямую не влияет на уровень бизнеса."
    ),
    "info_influence": (
        "Ваш вклад в жизнь клуба и авторитет в сообществе. Начисляется куратором за активность: "
        "участие во встречах, выступления, помощь другим резидентам."
    ),
    "info_business": (
        "Общий показатель развития вашего бизнеса по трём направлениям — маркетинг, продажи "
        "и управление — по шкале от 0 до 100. Растёт по мере повышения уровней направлений; "
        "100 — максимум. Прогресс-бар показывает, сколько материалов пройдено до следующего уровня."
    ),
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
