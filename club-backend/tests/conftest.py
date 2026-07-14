"""
Общая тест-инфраструктура: единый in-memory engine, приложение и клиент.
Держим один engine на всю тест-сессию, чтобы модули не перетирали database.engine
друг у друга (иначе клиент ходит в БД без таблиц).
"""

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["DATABASE_URL"] = "sqlite://"      # in-memory, до импорта приложения
os.environ["GETCOURSE_SYNC_ENABLED"] = "0"    # без фонового опроса GetCourse в тестах

import pytest
from fastapi.testclient import TestClient
from sqlmodel.pool import StaticPool
from sqlalchemy import create_engine

import app.database as database

# Единый in-memory engine на весь прогон тестов.
test_engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
database.engine = test_engine

from app.main import app  # noqa: E402  (импорт после подмены engine)


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:   # startup создаёт таблицы и сид
        yield c
