"""
Движок скоринга квиза «Моя траектория».

Логика:

1. Квиз — 3 вопроса, по одному на каждый аспект (Маркетинг / Продажи / Менеджмент).
   Каждый вариант ответа явно соответствует уровню 1/2/3, поэтому уровень аспекта —
   это уровень выбранного варианта (маппинг вариант→уровень живёт в quiz_data.py).

2. Узкое место = аспект с минимальным уровнем.
   При равенстве уровней приоритет: Продажи → Маркетинг → Менеджмент.

3. Если все три уровня равны — бизнес «в балансе» (balanced=True); визуализация
   рисует цилиндр вместо песочных часов, но условное узкое место всё равно
   определяется по приоритету для показа рекомендации.
"""

from enum import Enum


class Aspect(str, Enum):
    MARKETING = "marketing"    # Маркетинг
    SALES = "sales"            # Продажи
    MANAGEMENT = "management"  # Менеджмент


# Приоритет при равных уровнях: Продажи > Маркетинг > Менеджмент
BOTTLENECK_PRIORITY = (Aspect.SALES, Aspect.MARKETING, Aspect.MANAGEMENT)

# Человекочитаемые подписи
ASPECT_LABELS = {
    Aspect.MARKETING: "Маркетинг",
    Aspect.SALES: "Продажи",
    Aspect.MANAGEMENT: "Менеджмент",
}


def bottleneck(levels: dict[Aspect, int]) -> tuple[Aspect, int]:
    """
    Узкое место = аспект с минимальным уровнем.
    Тай-брейк по приоритету Продажи > Маркетинг > Менеджмент.
    """
    min_level = min(levels.values())
    for aspect in BOTTLENECK_PRIORITY:
        if levels[aspect] == min_level:
            return aspect, min_level
    raise RuntimeError("Не удалось определить узкое место")  # недостижимо


def evaluate(levels_by_aspect: dict[Aspect, int]) -> dict:
    """
    Полный расчёт результата квиза.

    Вход:  {Aspect.MARKETING: 2, Aspect.SALES: 1, Aspect.MANAGEMENT: 3} — по
           одному уровню (1..3) на аспект.
    Выход: словарь с уровнями по аспектам + узкое место (аспект и уровень).
           Флаг balanced (все уровни равны) не хранится, а выводится на дашборде
           из самих уровней — см. main._build_dashboard.
    """
    required = {Aspect.MARKETING, Aspect.SALES, Aspect.MANAGEMENT}
    if set(levels_by_aspect) != required:
        raise ValueError("Нужны уровни ровно по трём аспектам")
    if any(lvl not in (1, 2, 3) for lvl in levels_by_aspect.values()):
        raise ValueError("Уровень аспекта должен быть 1, 2 или 3")

    levels = levels_by_aspect
    b_aspect, b_level = bottleneck(levels)

    return {
        "marketing_level": levels[Aspect.MARKETING],
        "sales_level": levels[Aspect.SALES],
        "management_level": levels[Aspect.MANAGEMENT],
        "bottleneck_aspect": b_aspect.value,
        "bottleneck_level": b_level,
    }
