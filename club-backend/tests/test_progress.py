"""
Тесты расчёта показателей прогресса (Опыт / категории / Знания / Влияние)
и админ-эндпоинтов настройки шкал.
"""

from datetime import datetime, timedelta, timezone

from sqlmodel import Session, select

import app.database as database
from app.config import ADMIN_EMAIL, ADMIN_PASSWORD
from app.models import (
    GcAssignment, GcGroup, LessonView, QuizResult, User, UserStats,
)
from app.progress import compute_user_progress

test_engine = database.engine


def _admin(client):
    r = client.post("/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _clear(s):
    for model in (LessonView, GcAssignment, GcGroup, UserStats, QuizResult):
        for row in s.exec(select(model)).all():
            s.delete(row)
    s.commit()


def _mk_user(s, email="prog@x.ru", m=1, sa=1, mg=1):
    u = User(email=email, password_hash="x")
    s.add(u); s.commit(); s.refresh(u)
    s.add(QuizResult(user_id=u.id, marketing_level=m, sales_level=sa, management_level=mg,
                     bottleneck_aspect="sales", bottleneck_level=1, answers_json="{}"))
    s.commit()
    return u


def _assign(s, track, category, level, gc_ids):
    for g in gc_ids:
        s.add(GcAssignment(track=track, category=category, level=level, gc_group_id=g))


def test_category_levelup_and_bar_reset():
    with Session(test_engine) as s:
        _clear(s)
        u = _mk_user(s, "lvlup@x.ru", mg=2)   # менеджмент стартует с уровня 2
        for i in range(1, 5):
            s.add(GcGroup(gc_id=i, name=f"g{i}", lesson_number=0))
        # менеджмент ур.2 = [1,2], ур.3 = [3]
        _assign(s, "exp", "management", 2, [1, 2])
        _assign(s, "exp", "management", 3, [3])
        # прошёл обе группы ур.2 → должен подняться на ур.3 (бар обнулён: 0 из 1)
        for g in (1, 2):
            s.add(LessonView(email=u.email, gc_group_id=g, user_id=u.id))
        s.commit()

        p = compute_user_progress(s, u)
        mgmt = next(c for c in p["categories"] if c["aspect"] == "management")
        assert (mgmt["level"], mgmt["done"], mgmt["total"]) == (3, 0, 1)


def test_category_bar_progress_within_level():
    with Session(test_engine) as s:
        _clear(s)
        u = _mk_user(s, "barprog@x.ru", mg=1)
        for i in range(1, 4):
            s.add(GcGroup(gc_id=i, name=f"g{i}", lesson_number=0))
        _assign(s, "exp", "management", 1, [1, 2, 3])
        s.add(LessonView(email=u.email, gc_group_id=1, user_id=u.id))
        s.commit()
        p = compute_user_progress(s, u)
        mgmt = next(c for c in p["categories"] if c["aspect"] == "management")
        assert (mgmt["level"], mgmt["done"], mgmt["total"]) == (1, 1, 3)


def test_category_capped_when_no_next_level():
    with Session(test_engine) as s:
        _clear(s)
        u = _mk_user(s, "capped@x.ru", mg=1)
        s.add(GcGroup(gc_id=1, name="g1", lesson_number=0))
        _assign(s, "exp", "management", 1, [1])   # выше уровней нет
        s.add(LessonView(email=u.email, gc_group_id=1, user_id=u.id))
        s.commit()
        p = compute_user_progress(s, u)
        mgmt = next(c for c in p["categories"] if c["aspect"] == "management")
        assert (mgmt["level"], mgmt["done"], mgmt["total"]) == (1, 1, 1)   # бар полный, стоим


def test_experience_sum_and_knowledge_flat():
    with Session(test_engine) as s:
        _clear(s)
        u = _mk_user(s, "expsum@x.ru", m=1, sa=1, mg=2)
        for i in range(1, 7):
            s.add(GcGroup(gc_id=i, name=f"g{i}", lesson_number=0))
        _assign(s, "exp", "management", 2, [1, 2])
        _assign(s, "exp", "management", 3, [3])
        _assign(s, "exp", "sales", 1, [4])
        _assign(s, "know", None, None, [5, 6])
        for g in (1, 2, 5):
            s.add(LessonView(email=u.email, gc_group_id=g, user_id=u.id))
        s.commit()
        p = compute_user_progress(s, u)
        # менеджмент 2→3, продажи 1, маркетинг 1 → сумма 5
        assert p["experience"]["level"] == 5
        # пройдено 2 из 4 уникальных групп опыта {1,2,3,4}
        assert (p["experience"]["done"], p["experience"]["total"]) == (2, 4)
        # знания: 1 из 2
        assert p["knowledge"] == {"done": 1, "total": 2}


def test_days_on_level_tracks_change():
    with Session(test_engine) as s:
        _clear(s)
        u = _mk_user(s, "days@x.ru", m=1, sa=1, mg=1)   # сумма уровней = 3
        s.commit()
        p = compute_user_progress(s, u)
        assert p["experience"]["days_on_level"] == 0
        # подкрутим exp_level_since на 5 дней назад — «дней на уровне» станет 5
        stats = s.get(UserStats, u.id)
        stats.exp_level_since = datetime.now(timezone.utc) - timedelta(days=5)
        s.add(stats); s.commit()
        p2 = compute_user_progress(s, u)
        assert p2["experience"]["days_on_level"] == 5


def test_influence_endpoint(client):
    h = _admin(client)
    r = client.post("/admin/users", headers=h, json={"email": "infl@x.ru", "password": "pw123456"})
    uid = r.json()["id"]
    assert r.json()["influence"] == 0

    r = client.patch(f"/admin/users/{uid}", headers=h, json={"influence": 42})
    assert r.status_code == 200
    assert r.json()["influence"] == 42

    # видно в списке и на дашборде резидента
    lst = client.get("/admin/users", headers=h).json()
    assert next(u for u in lst if u["id"] == uid)["influence"] == 42
    tok = client.post("/auth/login", data={"username": "infl@x.ru", "password": "pw123456"}).json()
    dash = client.get("/me/dashboard", headers={"Authorization": f"Bearer {tok['access_token']}"})
    assert dash.json()["influence"] == 42


def test_progress_config_endpoint(client):
    h = _admin(client)
    with Session(test_engine) as s:
        for i in (101, 102, 103):
            if not s.exec(select(GcGroup).where(GcGroup.gc_id == i)).first():
                s.add(GcGroup(gc_id=i, name=f"grp{i}", lesson_number=0))
        s.commit()

    body = {"exp": {"management": {"1": [101, 102], "2": [103]}}, "know": [103]}
    r = client.put("/admin/progress-config", headers=h, json=body)
    assert r.status_code == 200
    out = r.json()
    assert set(out["exp"]["management"]["1"]) == {101, 102}
    assert out["exp"]["management"]["2"] == [103]
    assert out["know"] == [103]

    # только админ
    assert client.get("/admin/progress-config").status_code == 401

    with Session(test_engine) as s:
        _clear(s)
