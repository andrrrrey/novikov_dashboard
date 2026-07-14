"""
Тесты интеграции GetCourse: расчёт уровня 1–10, парсинг имён групп,
парсинг экспорта и админ-эндпоинты (плашка + настройки GC).
"""

import asyncio

import httpx
import pytest
from sqlmodel import Session, select

import app.database as database
from app.config import ADMIN_EMAIL, ADMIN_PASSWORD
from app.getcourse import (
    GetCourseClient, GetCourseError, parse_lesson_number, _extract_email,
)
from app.models import GcGroup, LessonView, User
from app.settings import compute_overall_level

# engine/app/client — из conftest.py. Прямой доступ к БД через database.engine.
test_engine = database.engine


def _clear(session):
    for row in session.exec(select(LessonView)).all():
        session.delete(row)
    for row in session.exec(select(GcGroup)).all():
        session.delete(row)
    session.commit()


def _admin(client):
    r = client.post("/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


# ------------------------------------------------------------------ парсинг имён
@pytest.mark.parametrize("name,expected", [
    ("Урок 01 просмотрен", 1),
    ("Урок 12 просмотрен", 12),
    ("Урок 3 — просмотрен", 3),
    ("урок 7 полностью просмотрен", 7),
    ("Вебинар без номера", None),
    ("Урок 5 начат", None),          # нет «просмотр»
    ("", None),
])
def test_parse_lesson_number(name, expected):
    assert parse_lesson_number(name) == expected


def test_extract_email():
    assert _extract_email({"Email": "USER@Example.com "}) == "user@example.com"
    assert _extract_email({"id": "1", "e-mail": "a@b.ru"}) == "a@b.ru"
    assert _extract_email({"name": "Иван", "city": "Москва"}) is None


# ------------------------------------------------- клиент: реальный формат GC
def _mock_client(handler, account="novikovclub", key="KEY"):
    http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return GetCourseClient(account, key, http), http


def test_list_groups_parses_info_list():
    # GetCourse кладёт группы прямо в info (список), как в реальном ответе аккаунта
    def handler(request):
        return httpx.Response(200, json={"success": True, "error": False, "error_message": "",
            "info": [
                {"id": 4848962, "name": "Траектория 1", "last_added_at": "2026-06-22 11:44:29"},
                {"id": 4883599, "name": "Урок 01 просмотрен", "last_added_at": "2026-07-14 12:16:21"},
            ]})

    async def run():
        client, http = _mock_client(handler)
        try:
            groups = await client.list_groups()
        finally:
            await http.aclose()
        return groups

    groups = asyncio.run(run())
    assert [g["id"] for g in groups] == [4848962, 4883599]
    # только «Урок NN просмотрен» распознаётся как урок
    lessons = [(g["id"], parse_lesson_number(g["name"])) for g in groups]
    assert [(gid, n) for gid, n in lessons if n is not None] == [(4883599, 1)]


def test_api_error_surfaces():
    # success:false с телом ошибки должен подниматься как GetCourseError, а не давать «0 групп»
    def handler(request):
        return httpx.Response(200, json={"success": False, "info": [],
            "error_message": "Неавторизованное API-обращение", "error": True, "error_code": 901})

    async def run():
        client, http = _mock_client(handler, key="BAD")
        try:
            await client.list_groups()
        finally:
            await http.aclose()

    with pytest.raises(GetCourseError, match="Неавторизованное"):
        asyncio.run(run())


# --------------------------------------------------------- расчёт уровня 1..10
def _seed_progress(session, total_groups, viewed_by_email):
    for i in range(1, total_groups + 1):
        session.add(GcGroup(gc_id=1000 + i, name=f"Урок {i:02d} просмотрен",
                            lesson_number=i, counts=True))
    session.commit()
    gc_ids = [g.gc_id for g in session.exec(select(GcGroup)).all()]
    for email, count in viewed_by_email.items():
        for gid in gc_ids[:count]:
            session.add(LessonView(email=email, gc_group_id=gid))
    session.commit()


def test_compute_overall_level():
    with Session(test_engine) as session:
        _clear(session)
        _seed_progress(session, total_groups=10, viewed_by_email={
            "full@x.ru": 10,   # всё → 10
            "mid@x.ru": 3,     # ceil(3/10*10)=3
            "one@x.ru": 1,     # ceil(0.1*10)=1
            "none@x.ru": 0,    # 0 просмотров → 0
        })

        assert compute_overall_level(session, "full@x.ru") == (10, 10, 10)
        assert compute_overall_level(session, "mid@x.ru") == (3, 10, 3)
        assert compute_overall_level(session, "one@x.ru") == (1, 10, 1)
        assert compute_overall_level(session, "NONE@x.ru")[2] == 0   # case-insensitive
        assert compute_overall_level(session, "missing@x.ru") == (0, 10, 0)


def test_compute_level_ceil_rounding():
    with Session(test_engine) as session:
        _clear(session)
        # 3 сегмента, 1 просмотрен → ceil(1/3*10)=ceil(3.33)=4
        _seed_progress(session, total_groups=3, viewed_by_email={"a@x.ru": 1})
        assert compute_overall_level(session, "a@x.ru") == (1, 3, 4)


def test_level_zero_when_no_groups():
    with Session(test_engine) as session:
        _clear(session)
        assert compute_overall_level(session, "any@x.ru") == (0, 0, 0)


# ------------------------------------------------------------- админ-эндпоинты
def test_promo_endpoint(client):
    h = _admin(client)
    # дефолт
    r = client.get("/admin/promo", headers=h)
    assert r.status_code == 200
    assert r.json()["title"] == "Повышайте свой уровень"

    r = client.patch("/admin/promo", headers=h,
                     json={"image": "/club/api/uploads/x.png", "link": "https://gc.ru/course"})
    assert r.status_code == 200
    body = r.json()
    assert body["image"] == "/club/api/uploads/x.png"
    assert body["link"] == "https://gc.ru/course"

    # плашка видна на дашборде резидента
    client.post("/admin/users", headers=h, json={"email": "promo@x.ru", "password": "pw123456"})
    tok = client.post("/auth/login", data={"username": "promo@x.ru", "password": "pw123456"}).json()
    dash = client.get("/me/dashboard", headers={"Authorization": f"Bearer {tok['access_token']}"})
    assert dash.json()["promo_link"] == "https://gc.ru/course"


def test_getcourse_endpoint_masks_key(client):
    h = _admin(client)
    r = client.get("/admin/getcourse", headers=h)
    assert r.status_code == 200
    assert r.json()["api_key_set"] is False

    r = client.patch("/admin/getcourse", headers=h,
                     json={"account": "https://myclub.getcourse.ru/", "api_key": "SECRET123",
                           "poll_hours": 1.5})
    assert r.status_code == 200
    body = r.json()
    assert body["account"] == "myclub"          # нормализован до поддомена
    assert body["api_key_set"] is True          # сам ключ наружу не отдаётся
    assert "SECRET123" not in r.text
    assert body["poll_hours"] == 1.5


def test_getcourse_requires_admin(client):
    r = client.get("/admin/getcourse")
    assert r.status_code == 401


def test_sync_requires_config(client):
    h = _admin(client)
    # сбрасываем аккаунт → синк должен ругаться
    client.patch("/admin/getcourse", headers=h, json={"account": ""})
    r = client.post("/admin/getcourse/sync", headers=h)
    assert r.status_code == 400
