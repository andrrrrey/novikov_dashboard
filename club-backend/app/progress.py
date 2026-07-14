"""
Расчёт показателей прогресса резидента из данных GetCourse и настроек админки.

Показатели:
- Категории (management/sales/marketing): уровень стартует из результата теста и растёт по мере
  прохождения назначенных групп (прошёл все группы уровня → уровень +1, бар обнуляется).
- «Опыт»: уровень = сумма уровней трёх категорий; бар = общий % пройденных групп опыта по всем
  категориям и уровням; «дней на уровне» — с момента последнего роста суммы.
- «Знания»: плоский бар — доля пройденных групп трека "know".
- «Влияние»: ручные очки из UserStats.
"""

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Session, select

from app.models import GcAssignment, LessonView, QuizResult, User, UserStats

CATEGORIES = ("management", "sales", "marketing")
CATEGORY_LABELS = {
    "management": "Менеджмент",
    "sales": "Продажи",
    "marketing": "Маркетинг",
}


def completed_ids(session: Session, email: str) -> set[int]:
    """Множество gc_group_id, которые резидент прошёл (состоит в группах), по email."""
    email = (email or "").strip().lower()
    if not email:
        return set()
    rows = session.exec(
        select(LessonView.gc_group_id).where(LessonView.email == email)
    ).all()
    return set(rows)


def _exp_assignments(session: Session) -> dict[tuple[str, int], set[int]]:
    """(category, level) -> множество gc_group_id (трек "exp")."""
    out: dict[tuple[str, int], set[int]] = {}
    rows = session.exec(select(GcAssignment).where(GcAssignment.track == "exp")).all()
    for a in rows:
        if a.category is None or a.level is None:
            continue
        out.setdefault((a.category, a.level), set()).add(a.gc_group_id)
    return out


def _know_group_ids(session: Session) -> set[int]:
    rows = session.exec(
        select(GcAssignment.gc_group_id).where(GcAssignment.track == "know")
    ).all()
    return set(rows)


def category_progress(
    exp_map: dict[tuple[str, int], set[int]],
    completed: set[int],
    category: str,
    quiz_level: int,
) -> tuple[int, int, int]:
    """
    Вернуть (уровень, пройдено_в_уровне, всего_в_уровне) для категории.

    Старт с quiz_level. Пока все группы текущего уровня пройдены и у следующего уровня есть
    группы — поднимаем уровень (бар обнуляется). Если группы уровня не заданы — (уровень, 0, 0).
    """
    level = max(1, quiz_level)
    while True:
        groups = exp_map.get((category, level), set())
        if not groups:
            # уровень не настроен — стоим на нём, бар пустой
            return level, 0, 0
        done = len(groups & completed)
        if done >= len(groups):
            # уровень пройден: поднимаемся, если следующий настроен, иначе стоим (бар полный)
            if exp_map.get((category, level + 1)):
                level += 1
                continue
            return level, len(groups), len(groups)
        return level, done, len(groups)


def experience(
    exp_map: dict[tuple[str, int], set[int]],
    completed: set[int],
    cat_levels: dict[str, int],
) -> tuple[int, int, int]:
    """
    Вернуть (exp_level, пройдено, всего) для большого бара «Опыт».
    exp_level = сумма уровней категорий; бар — по всем уникальным группам опыта.
    """
    exp_level = sum(cat_levels.values())
    all_groups: set[int] = set()
    for groups in exp_map.values():
        all_groups |= groups
    total = len(all_groups)
    done = len(all_groups & completed)
    return exp_level, done, total


def knowledge(session: Session, completed: set[int]) -> tuple[int, int]:
    """Плоский бар «Знания»: (пройдено, всего) по группам трека "know"."""
    groups = _know_group_ids(session)
    total = len(groups)
    done = len(groups & completed)
    return done, total


def refresh_exp_level(session: Session, user: User, exp_level: int) -> tuple[int, datetime]:
    """
    Обновить UserStats.exp_level: если уровень сменился — записать новый и exp_level_since=now.
    Возвращает (influence, exp_level_since) для дашборда.
    """
    stats = session.get(UserStats, user.id)
    now = datetime.now(timezone.utc)
    if stats is None:
        stats = UserStats(user_id=user.id, influence=0, exp_level=exp_level, exp_level_since=now)
        session.add(stats)
        session.commit()
        return stats.influence, stats.exp_level_since
    if stats.exp_level != exp_level:
        stats.exp_level = exp_level
        stats.exp_level_since = now
        session.add(stats)
        session.commit()
    return stats.influence, stats.exp_level_since


def _quiz_levels(session: Session, user: User) -> dict[str, int]:
    """Уровни категорий из результата теста (дефолт 1, если теста нет)."""
    result = session.exec(
        select(QuizResult).where(QuizResult.user_id == user.id)
    ).first()
    if result is None:
        return {c: 1 for c in CATEGORIES}
    return {
        "management": result.management_level,
        "sales": result.sales_level,
        "marketing": result.marketing_level,
    }


def compute_user_progress(session: Session, user: User) -> dict:
    """
    Собрать все показатели для дашборда: категории, опыт, знания, влияние, дни на уровне.
    Побочно обновляет UserStats.exp_level/-since (ленивый трекинг «дней на уровне»).
    """
    completed = completed_ids(session, user.email)
    exp_map = _exp_assignments(session)
    quiz_levels = _quiz_levels(session, user)

    categories = []
    cat_levels: dict[str, int] = {}
    for cat in CATEGORIES:
        level, done, total = category_progress(exp_map, completed, cat, quiz_levels[cat])
        cat_levels[cat] = level
        categories.append({
            "aspect": cat, "label": CATEGORY_LABELS[cat],
            "level": level, "done": done, "total": total,
        })

    exp_level, exp_done, exp_total = experience(exp_map, completed, cat_levels)
    influence, since = refresh_exp_level(session, user, exp_level)
    days_on_level = max(0, (datetime.now(timezone.utc) - _aware(since)).days)

    know_done, know_total = knowledge(session, completed)

    return {
        "categories": categories,
        "experience": {
            "level": exp_level, "done": exp_done, "total": exp_total,
            "days_on_level": days_on_level,
        },
        "knowledge": {"done": know_done, "total": know_total},
        "influence": influence,
    }


def _aware(dt: datetime) -> datetime:
    """SQLite отдаёт наивные datetime — трактуем их как UTC."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
