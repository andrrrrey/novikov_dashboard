"""
Тесты движка скоринга. Каждый кейс взят напрямую из документа клиента
(лист «Логика бот - приложение»: расчёт уровня, шаги 3-4, таблица приоритета).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from app.scoring import Aspect, aspect_level, bottleneck, evaluate


# --- Уровень аспекта по трём ответам ---------------------------------------

@pytest.mark.parametrize("answers, expected", [
    ([1, 1, 1], 1),   # три А
    ([2, 2, 2], 2),   # три Б
    ([3, 3, 3], 3),   # три В
    ([1, 1, 2], 1),   # мажоритарно А  (пример из шага 3: Маркетинг А,А,Б)
    ([2, 3, 2], 2),   # мажоритарно Б  (пример из шага 3: Продажи Б,В,Б)
    ([1, 2, 1], 1),   # мажоритарно А  (пример из шага 3: Менеджмент А,Б,А)
    ([3, 3, 1], 3),   # мажоритарно В
    ([1, 2, 3], 1),   # все разные -> минимум
    ([3, 2, 1], 1),   # все разные (другой порядок) -> минимум
])
def test_aspect_level(answers, expected):
    assert aspect_level(answers) == expected


def test_aspect_level_validates_length():
    with pytest.raises(ValueError):
        aspect_level([1, 2])


def test_aspect_level_validates_range():
    with pytest.raises(ValueError):
        aspect_level([1, 2, 4])


# --- Узкое место + правило приоритета --------------------------------------
# Все шесть строк из таблицы «ПРАВИЛО ПРИОРИТЕТА ПРИ РАВНЫХ УРОВНЯХ».

@pytest.mark.parametrize("m, s, mgmt, expected_aspect, expected_level", [
    (1, 2, 1, Aspect.MARKETING, 1),   # M и Mgmt равны -> Маркетинг (приоритет #2)
    (1, 1, 2, Aspect.SALES, 1),       # M и S равны -> Продажи (#1)
    (2, 1, 1, Aspect.SALES, 1),       # S и Mgmt равны -> Продажи (#1)
    (1, 1, 1, Aspect.SALES, 1),       # все равны -> Продажи
    (2, 3, 2, Aspect.MARKETING, 2),   # M и Mgmt равны -> Маркетинг
    (3, 2, 2, Aspect.SALES, 2),       # S и Mgmt равны -> Продажи
])
def test_bottleneck_priority(m, s, mgmt, expected_aspect, expected_level):
    levels = {
        Aspect.MARKETING: m,
        Aspect.SALES: s,
        Aspect.MANAGEMENT: mgmt,
    }
    assert bottleneck(levels) == (expected_aspect, expected_level)


# --- Полный расчёт end-to-end ----------------------------------------------
# Пример из шагов 3-4: ответы -> уровни -> узкое место.

def test_evaluate_full_example():
    result = evaluate({
        Aspect.MARKETING: [1, 1, 2],    # -> уровень 1
        Aspect.SALES: [2, 3, 2],        # -> уровень 2
        Aspect.MANAGEMENT: [1, 2, 1],   # -> уровень 1
    })
    assert result == {
        "marketing_level": 1,
        "sales_level": 2,
        "management_level": 1,
        "bottleneck_aspect": "marketing",   # M и Mgmt по 1, приоритет -> Маркетинг
        "bottleneck_level": 1,
    }


def test_evaluate_requires_all_aspects():
    with pytest.raises(ValueError):
        evaluate({Aspect.MARKETING: [1, 1, 1]})
