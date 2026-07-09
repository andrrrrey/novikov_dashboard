"""
Тесты движка скоринга и маппинга ответов квиза.
Квиз — 3 вопроса (по одному на аспект); уровень аспекта = уровень выбранного
варианта. Узкое место — минимальный уровень, тай-брейк Продажи→Маркетинг→Менеджмент.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from app.scoring import Aspect, bottleneck, evaluate
from app.quiz_data import QUIZ, answers_to_levels


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

def test_evaluate_full_example():
    result = evaluate({
        Aspect.MARKETING: 1,
        Aspect.SALES: 2,
        Aspect.MANAGEMENT: 1,
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
        evaluate({Aspect.MARKETING: 1})


def test_evaluate_validates_level_range():
    with pytest.raises(ValueError):
        evaluate({Aspect.MARKETING: 4, Aspect.SALES: 1, Aspect.MANAGEMENT: 1})


# --- Квиз: 3 вопроса и маппинг индекс варианта -> уровень -------------------

def test_quiz_has_three_questions_one_per_aspect():
    assert len(QUIZ) == 3
    assert {q["aspect"] for q in QUIZ} == {
        Aspect.MARKETING, Aspect.SALES, Aspect.MANAGEMENT
    }


def test_answers_to_levels_maps_option_index_to_level():
    # Индексы 1-based; берём варианты с заведомо известными уровнями.
    # Маркетинг: 4 варианта -> уровни 1,1,2,3 ; Продажи: 1,1,2,2,3,3 ; Менеджмент: 1,1,2,3
    levels = answers_to_levels({"M": 4, "S": 3, "Mg": 1})
    assert levels == {
        Aspect.MARKETING: 3,
        Aspect.SALES: 2,
        Aspect.MANAGEMENT: 1,
    }


def test_answers_to_levels_requires_all_codes():
    with pytest.raises(ValueError):
        answers_to_levels({"M": 1, "S": 1})


def test_answers_to_levels_validates_option_index():
    with pytest.raises(ValueError):
        answers_to_levels({"M": 99, "S": 1, "Mg": 1})
