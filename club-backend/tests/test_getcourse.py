"""
Тесты интеграции GetCourse: парсинг имён групп, парсинг ответа/экспорта,
синхронизация и админ-эндпоинты (плашка + настройки GC).
Расчёт показателей прогресса — в test_progress.py.
"""

import asyncio

import httpx
import pytest
from sqlmodel import Session, select

import app.database as database
import app.getcourse as getcourse
from app.config import ADMIN_EMAIL, ADMIN_PASSWORD
from app.getcourse import (
    GetCourseClient, GetCourseError, parse_lesson_number, sync_getcourse,
    _extract_email, _is_busy_error,
)
from app.models import GcAssignment, GcGroup, LessonView, User
from app.settings import set_setting

# engine/app/client — из conftest.py. Прямой доступ к БД через database.engine.
test_engine = database.engine


def _clear(session):
    for row in session.exec(select(LessonView)).all():
        session.delete(row)
    for row in session.exec(select(GcAssignment)).all():
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


def test_is_busy_error():
    assert _is_busy_error(GetCourseError("Уже запущен один экспорт, попробуйте позднее"))
    assert _is_busy_error(GetCourseError("Export already running"))
    assert not _is_busy_error(GetCourseError("Неавторизованное API-обращение"))


def test_sync_stores_all_groups_and_recovers_from_busy(monkeypatch):
    # Синк сохраняет ВСЕ группы (в т.ч. не-урочные, lesson_number=0) и тянет состав только
    # назначенных групп. Первый старт экспорта отклоняется («уже запущен»), второй успешен.
    with Session(test_engine) as s:
        _clear(s)
        s.add(User(email="busyrez@x.ru", password_hash="x"))
        # группа-урок 4883599 назначена в «Знания» → её состав тянем; «Траектория» — нет
        s.add(GcAssignment(track="know", gc_group_id=4883599))
        set_setting(s, "gc_account", "novikovclub")
        set_setting(s, "gc_api_key", "K")
        s.commit()

    calls = {"start": 0}

    def handler(request):
        u = str(request.url)
        if "/groups/4883599/users" in u:
            calls["start"] += 1
            if calls["start"] == 1:
                return httpx.Response(200, json={"success": False, "error": True,
                    "error_message": "Уже запущен один экспорт, попробуйте позднее", "info": []})
            return httpx.Response(200, json={"success": True, "info": {"export_id": 777}})
        if "/exports/777" in u:
            return httpx.Response(200, json={"success": True, "info": {
                "status": "finished", "fields": ["Email"], "items": [["busyrez@x.ru"]]}})
        return httpx.Response(200, json={"success": True, "info": [
            {"id": 4848962, "name": "Траектория 1", "last_added_at": "2026-06-22 11:44:29"},
            {"id": 4883599, "name": "Урок 01 просмотрен", "last_added_at": "2026-07-14 12:16:21"}]})

    import functools
    monkeypatch.setattr(getcourse, "BETWEEN_REQUESTS_DELAY", 0)
    monkeypatch.setattr(getcourse, "EXPORT_POLL_DELAY", 0)
    monkeypatch.setattr(getcourse, "START_RETRY_DELAY", 0)
    monkeypatch.setattr(httpx, "AsyncClient",
                        functools.partial(httpx.AsyncClient, transport=httpx.MockTransport(handler)))

    status = asyncio.run(sync_getcourse(database.session_factory))
    assert "обновлено за цикл 1" in status
    assert calls["start"] == 2   # первый занят, второй успешен

    with Session(test_engine) as s:
        # сохранены ОБЕ группы; у «Траектории» lesson_number=0
        groups = {g.gc_id: g.lesson_number for g in s.exec(select(GcGroup)).all()}
        assert groups == {4848962: 0, 4883599: 1}
        # состав тянулся только для назначенной группы
        views = s.exec(select(LessonView).where(LessonView.email == "busyrez@x.ru")).all()
        assert [v.gc_group_id for v in views] == [4883599]
        _clear(s)
        set_setting(s, "gc_account", "")
        set_setting(s, "gc_api_key", "")
        s.commit()


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
