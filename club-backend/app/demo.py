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
    "telegram": "ivan_garant",
}

# Вымышленные резиденты. Демо-уровень бизнеса = 4, band «рядом» ±1: 3..5.
# Для вкладки «Все резиденты» добавлены резиденты с уровнями за пределами band.
_RESIDENTS = [
    {"id": -1, "first_name": "Анна", "last_name": "Соколова",
     "business_name": "Студия дизайна «Контур»", "business_field": "Дизайн и брендинг",
     "business_level": 4, "photo_url": _avatar("АС", "#a472ff"), "telegram": "anna_kontur"},
    {"id": -2, "first_name": "Дмитрий", "last_name": "Кузнецов",
     "business_name": "Агентство «ТрафикПро»", "business_field": "Маркетинг и реклама",
     "business_level": 5, "photo_url": _avatar("ДК", "#6cde52"), "telegram": "dk_traffic"},
    {"id": -3, "first_name": "Мария", "last_name": "Волкова",
     "business_name": "Клиника «ЗдоровьеПлюс»", "business_field": "Медицинские услуги",
     "business_level": 3, "photo_url": _avatar("МВ", "#e7b24c"), "telegram": "maria_health"},
    {"id": -4, "first_name": "Сергей", "last_name": "Морозов",
     "business_name": "Логистика «БыстроВоз»", "business_field": "Логистика",
     "business_level": 4, "photo_url": _avatar("СМ", "#ff6b6b"), "telegram": "morozov_logi"},
    {"id": -5, "first_name": "Ольга", "last_name": "Новикова",
     "business_name": "Юрфирма «Право и Дело»", "business_field": "Юридические услуги",
     "business_level": 5, "photo_url": _avatar("ОН", "#3b9eff"), "telegram": "olga_law"},
    {"id": -6, "first_name": "Павел", "last_name": "Егоров",
     "business_name": "IT-студия «КодЛаб»", "business_field": "Разработка ПО",
     "business_level": 3, "photo_url": _avatar("ПЕ", "#a472ff"), "telegram": "pavel_codelab"},
    # Резиденты вне band — видны только на вкладке «Все резиденты».
    {"id": -7, "first_name": "Екатерина", "last_name": "Лебедева",
     "business_name": "Сеть кофеен «Тепло»", "business_field": "Общепит",
     "business_level": 8, "photo_url": _avatar("ЕЛ", "#6cde52"), "telegram": "kate_teplo"},
    {"id": -8, "first_name": "Артём", "last_name": "Зайцев",
     "business_name": "Онлайн-школа «Скилл»", "business_field": "Образование",
     "business_level": 7, "photo_url": _avatar("АЗ", "#3b9eff"), "telegram": "artem_skill"},
    {"id": -9, "first_name": "Никита", "last_name": "Белов",
     "business_name": "Барбершоп «Бритва»", "business_field": "Услуги красоты",
     "business_level": 2, "photo_url": _avatar("НБ", "#e7b24c"), "telegram": "nikita_barber"},
    {"id": -10, "first_name": "Виктория", "last_name": "Орлова",
     "business_name": "Бренд одежды «Нить»", "business_field": "Производство",
     "business_level": 6, "photo_url": _avatar("ВО", "#a472ff"), "telegram": "vika_nit"},
]


def demo_profile() -> ProfileOut:
    return ProfileOut(completed=True, **DEMO_PROFILE)


def demo_dashboard() -> DashboardOut:
    """Готовый дашборд с вымышленными числами (уроки «пройдено/не пройдено» и т.п.)."""
    return DashboardOut(
        quiz_taken=True,
        marketing_level=6, sales_level=4, management_level=5,
        bottleneck_aspect="sales", bottleneck_level=4, balanced=False,
        hint="Продажи — ваше узкое место. Отдел работает, но ключевые сделки всё ещё держатся "
             "на вас: пропишите стандарты и передайте их руководителю продаж.",
        cards=[
            CardOut(position=1, title="Отдел продаж без собственника: роли и регламенты",
                    getcourse_url=None, cover=None),
            CardOut(position=2, title="Скрипты и стандарты: как удержать конверсию без вас",
                    getcourse_url=None, cover=None),
            CardOut(position=3, title="Разбор: как резидент вышел из операционки в продажах",
                    getcourse_url=None, cover=None),
        ],
        # Уровень бизнеса = минимум направлений = 4 (узкое место — продажи) из 10.
        # Прогресс-бар и числа уроков — вымышленные (материалы продаж на ур.4).
        experience=ExperienceOut(level=4, done=2, total=5, days_on_level=23,
                                 max_level=10, score=40),
        categories=[
            CategoryProgress(aspect="management", label="Менеджмент", level=5, done=3, total=4),
            CategoryProgress(aspect="sales", label="Продажи", level=4, done=2, total=5),
            CategoryProgress(aspect="marketing", label="Маркетинг", level=6, done=4, total=6),
        ],
        knowledge=KnowledgeOut(done=14, total=20),
        influence=128,
        promo_title="Запустить траекторию развития",
        promo_image=None, promo_link=None,
        info_knowledge=DEFAULTS["info_knowledge"],
        info_influence=DEFAULTS["info_influence"],
        info_business=DEFAULTS["info_business"],
    )


# Демо-уровень бизнеса (см. demo_dashboard) — для band «рядом» ±1.
_DEMO_LEVEL = 4


def demo_residents(q: str = "", field: str = "", scope: str = "near") -> list[ResidentOut]:
    """Вымышленный список резидентов с работающим поиском/фильтром и вкладками."""
    q = (q or "").strip().lower()
    field = (field or "").strip().lower()
    all_scope = (scope or "near").strip().lower() == "all"
    out = []
    for r in _RESIDENTS:
        if not all_scope and abs(r["business_level"] - _DEMO_LEVEL) > 1:
            continue
        name = f"{r['first_name']} {r['last_name']}".lower()
        if q and q not in name and q not in r["business_name"].lower() \
                and q not in r["business_field"].lower():
            continue
        if field and field != r["business_field"].lower():
            continue
        out.append(ResidentOut(**r))
    if all_scope:
        out.sort(key=lambda r: (-r.business_level, r.last_name, r.first_name))
    else:
        out.sort(key=lambda r: (r.last_name, r.first_name))
    return out
