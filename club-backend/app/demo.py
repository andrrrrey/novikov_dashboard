"""
Демо-резидент: полностью вымышленные данные для показа продукта.
Ничего не берётся из GetCourse или админки — числа заданы прямо здесь.
Активируется по email (config.DEMO_EMAIL) в соответствующих эндпоинтах main.py.
"""

from base64 import b64encode

from app.schemas import (
    CardOut, CategoryProgress, DashboardOut, ExperienceOut, KnowledgeOut,
    ProfileOut, ResidentOut,
)
from app.settings import DEFAULTS


def _avatar(initials: str, color: str) -> str:
    """SVG-аватар как data URI (self-contained, без обращений в сеть)."""
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">'
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{color}"/>'
        f'<stop offset="1" stop-color="#0d0f0d"/></linearGradient></defs>'
        f'<rect width="200" height="200" fill="url(#g)"/>'
        f'<text x="100" y="100" dy="0.35em" text-anchor="middle" '
        f'font-family="Manrope, Arial, sans-serif" font-size="82" font-weight="700" '
        f'fill="#fefefe">{initials}</text></svg>'
    )
    return "data:image/svg+xml;base64," + b64encode(svg.encode("utf-8")).decode("ascii")


DEMO_PHOTO = _avatar("ИП", "#3b9eff")

DEMO_PROFILE = {
    "first_name": "Иван",
    "last_name": "Предпринимателев",
    "business_name": "Юридическое бюро «Гарант»",
    "business_field": "Юридические услуги",
    "birth_date": "1988-05-14",
    "photo_url": DEMO_PHOTO,
}

# Вымышленные резиденты (уровни рядом с демо-уровнем 6 — band ±1: 5..7).
_RESIDENTS = [
    {"id": -1, "first_name": "Анна", "last_name": "Соколова",
     "business_name": "Студия дизайна «Контур»", "business_field": "Дизайн и брендинг",
     "business_level": 6, "photo_url": _avatar("АС", "#a472ff")},
    {"id": -2, "first_name": "Дмитрий", "last_name": "Кузнецов",
     "business_name": "Агентство «ТрафикПро»", "business_field": "Маркетинг и реклама",
     "business_level": 7, "photo_url": _avatar("ДК", "#6cde52")},
    {"id": -3, "first_name": "Мария", "last_name": "Волкова",
     "business_name": "Клиника «ЗдоровьеПлюс»", "business_field": "Медицинские услуги",
     "business_level": 5, "photo_url": _avatar("МВ", "#e7b24c")},
    {"id": -4, "first_name": "Сергей", "last_name": "Морозов",
     "business_name": "Логистика «БыстроВоз»", "business_field": "Логистика",
     "business_level": 6, "photo_url": _avatar("СМ", "#ff6b6b")},
    {"id": -5, "first_name": "Ольга", "last_name": "Новикова",
     "business_name": "Юрфирма «Право и Дело»", "business_field": "Юридические услуги",
     "business_level": 7, "photo_url": _avatar("ОН", "#3b9eff")},
    {"id": -6, "first_name": "Павел", "last_name": "Егоров",
     "business_name": "IT-студия «КодЛаб»", "business_field": "Разработка ПО",
     "business_level": 5, "photo_url": _avatar("ПЕ", "#a472ff")},
]


def demo_profile() -> ProfileOut:
    return ProfileOut(completed=True, **DEMO_PROFILE)


def demo_dashboard() -> DashboardOut:
    """Готовый дашборд с вымышленными числами (уроки «пройдено/не пройдено» и т.п.)."""
    return DashboardOut(
        quiz_taken=True,
        marketing_level=3, sales_level=1, management_level=2,
        bottleneck_aspect="sales", bottleneck_level=1, balanced=False,
        hint="Продажи — ваше узкое место. Вы всё ещё в каждой сделке лично: "
             "выстройте первый скрипт и передайте часть встреч менеджеру.",
        cards=[
            CardOut(position=1, title="Первые шаги в продажах. Делегирование и рост выручки",
                    getcourse_url=None, cover=None),
            CardOut(position=2, title="Оптимизация воронки продаж. Ключевой этап",
                    getcourse_url=None, cover=None),
            CardOut(position=3, title="Разбор кейсов продаж резидента клуба",
                    getcourse_url=None, cover=None),
        ],
        # Уровень бизнеса 6 из 9 (сумма 3+1+2). Прогресс-бар и числа уроков — вымышленные.
        experience=ExperienceOut(level=6, done=4, total=7, days_on_level=23,
                                 max_level=9, score=67),
        categories=[
            CategoryProgress(aspect="management", label="Менеджмент", level=2, done=2, total=3),
            CategoryProgress(aspect="sales", label="Продажи", level=1, done=1, total=4),
            CategoryProgress(aspect="marketing", label="Маркетинг", level=3, done=3, total=5),
        ],
        knowledge=KnowledgeOut(done=14, total=20),
        influence=128,
        promo_title="Запустить траекторию развития",
        promo_image=None, promo_link=None,
        info_knowledge=DEFAULTS["info_knowledge"],
        info_influence=DEFAULTS["info_influence"],
        info_business=DEFAULTS["info_business"],
    )


def demo_residents(q: str = "", field: str = "") -> list[ResidentOut]:
    """Вымышленный список резидентов с работающим поиском/фильтром."""
    q = (q or "").strip().lower()
    field = (field or "").strip().lower()
    out = []
    for r in _RESIDENTS:
        name = f"{r['first_name']} {r['last_name']}".lower()
        if q and q not in name and q not in r["business_name"].lower() \
                and q not in r["business_field"].lower():
            continue
        if field and field != r["business_field"].lower():
            continue
        out.append(ResidentOut(**r))
    return out
