"""
Движок скоринга квиза «Моя траектория».

Логика согласно документу клиента (Логика_траектория, лист «Логика бот - приложение»):

1. Квиз — 9 вопросов, по 3 на каждый аспект (Маркетинг / Продажи / Менеджмент).
   Каждый ответ А/Б/В соответствует уровню 1/2/3.

2. Уровень аспекта по трём его ответам:
   - если 2 или 3 ответа одинаковые → уровень этого ответа (мажоритарно);
   - если все три ответа разные (А+Б+В) → минимальный уровень (то есть 1).

3. Узкое место = аспект с минимальным уровнем.
   При равенстве уровней приоритет: Продажи → Маркетинг → Менеджмент.
"""

from collections import Counter
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


def aspect_level(answers: list[int]) -> int:
    """
    Уровень одного аспекта по трём ответам.

    answers — ровно три значения из {1, 2, 3} (уже отображённые из А/Б/В).
    Мажоритарное правило; при трёх разных ответах — минимум.
    """
    if len(answers) != 3:
        raise ValueError("Ожидается ровно 3 ответа на аспект")
    if any(a not in (1, 2, 3) for a in answers):
        raise ValueError("Ответы должны быть 1, 2 или 3")

    level, freq = Counter(answers).most_common(1)[0]
    if freq >= 2:
        return level
    # все три разные -> минимальный уровень
    return min(answers)


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


def evaluate(answers_by_aspect: dict[Aspect, list[int]]) -> dict:
    """
    Полный расчёт результата квиза.

    Вход:  {Aspect.MARKETING: [1,2,3], Aspect.SALES: [...], Aspect.MANAGEMENT: [...]}
    Выход: словарь с уровнями по аспектам + узкое место (аспект и уровень).
    """
    required = {Aspect.MARKETING, Aspect.SALES, Aspect.MANAGEMENT}
    if set(answers_by_aspect) != required:
        raise ValueError("Нужны ответы ровно по трём аспектам")

    levels = {aspect: aspect_level(ans) for aspect, ans in answers_by_aspect.items()}
    b_aspect, b_level = bottleneck(levels)

    return {
        "marketing_level": levels[Aspect.MARKETING],
        "sales_level": levels[Aspect.SALES],
        "management_level": levels[Aspect.MANAGEMENT],
        "bottleneck_aspect": b_aspect.value,
        "bottleneck_level": b_level,
    }
