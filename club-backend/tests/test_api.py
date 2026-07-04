"""
Смоук-тест полного пути через API.
Использует изолированную БД (in-memory), чтобы не трогать рабочий club.db.
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["DATABASE_URL"] = "sqlite://"   # in-memory, до импорта приложения

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel
from sqlmodel.pool import StaticPool
from sqlalchemy import create_engine

import app.database as database

# Единый in-memory engine на весь тест-модуль
test_engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
database.engine = test_engine

from app.main import app  # noqa: E402  (импорт после подмены engine)
from app.config import ADMIN_EMAIL, ADMIN_PASSWORD  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:   # startup создаёт таблицы и сид
        yield c


def _login(client, email, password):
    r = client.post("/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_admin_login_and_role(client):
    r = client.post("/auth/login",
                    data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_wrong_password_rejected(client):
    r = client.post("/auth/login",
                    data={"username": ADMIN_EMAIL, "password": "nope"})
    assert r.status_code == 401


def test_user_requires_auth(client):
    assert client.get("/quiz").status_code == 401
    assert client.get("/me/dashboard").status_code == 401


def test_non_admin_blocked_from_admin(client):
    admin = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    client.post("/admin/users",
                json={"email": "resident@club.ru", "password": "pass12345"},
                headers=_auth(admin))
    user = _login(client, "resident@club.ru", "pass12345")
    assert client.get("/admin/stats", headers=_auth(user)).status_code == 403


def test_full_resident_flow(client):
    admin = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    # админ создаёт резидента
    r = client.post("/admin/users",
                    json={"email": "flow@club.ru", "password": "pass12345"},
                    headers=_auth(admin))
    assert r.status_code == 201

    token = _login(client, "flow@club.ru", "pass12345")

    # дашборд до квиза — пусто
    r = client.get("/me/dashboard", headers=_auth(token))
    assert r.status_code == 200 and r.json()["quiz_taken"] is False

    # квиз доступен, 9 вопросов
    r = client.get("/quiz", headers=_auth(token))
    assert len(r.json()) == 9

    # ответы: Маркетинг слабее всех -> узкое место Маркетинг, уровень 1
    answers = {
        "M1": 1, "M2": 1, "M3": 2,     # -> 1
        "S1": 2, "S2": 3, "S3": 2,     # -> 2
        "Mg1": 1, "Mg2": 2, "Mg3": 1,  # -> 1
    }
    r = client.post("/quiz/submit", json={"answers": answers}, headers=_auth(token))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["quiz_taken"] is True
    assert data["marketing_level"] == 1
    assert data["sales_level"] == 2
    assert data["management_level"] == 1
    # Маркетинг и Менеджмент по 1, приоритет -> Маркетинг
    assert data["bottleneck_aspect"] == "marketing"
    assert data["bottleneck_level"] == 1
    assert data["hint"].startswith("Узкое место: Маркетинг")
    assert len(data["cards"]) == 3
    assert data["cards"][0]["title"] == "Привлечение клиентов. Вводный урок"
    assert data["getcourse_progress"] is None   # плейсхолдер


def test_admin_stats(client):
    admin = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    r = client.get("/admin/stats", headers=_auth(admin))
    assert r.status_code == 200
    stats = r.json()
    assert stats["total_users"] >= 1
    assert stats["quiz_completed"] >= 1
