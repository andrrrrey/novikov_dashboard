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
