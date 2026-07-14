"""Настройки приложения. В проде секреты берём из окружения."""

import os

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MINUTES = int(os.getenv("ACCESS_TOKEN_TTL_MINUTES", "1440"))  # 24 ч

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./club.db")

# Каталог для загруженных обложек карточек. Отдаётся как /uploads (см. main.py),
# внешне — /club/api/uploads/... через nginx.
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

# Засеваемый администратор (первый вход). Пароль в проде — из окружения.
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@club.ru")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin12345")

# GetCourse: домен и ключ задаются в админке (таблица Setting), не здесь.
# Тут только флаг фонового планировщика (в тестах отключаем, чтобы не ходить в сеть)
# и дефолтный период опроса, если он не задан в настройках.
GETCOURSE_SYNC_ENABLED = os.getenv("GETCOURSE_SYNC_ENABLED", "1") not in ("0", "false", "False", "")
GETCOURSE_POLL_HOURS_DEFAULT = float(os.getenv("GETCOURSE_POLL_HOURS", "2"))
