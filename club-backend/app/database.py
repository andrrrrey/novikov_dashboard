"""Движок БД и выдача сессий."""

from sqlmodel import SQLModel, Session, create_engine

from app.config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)


# Простые «мягкие» миграции: колонки, добавленные к уже существующим таблицам.
# create_all не меняет существующие таблицы, поэтому недостающие колонки
# дозаливаем вручную (idempotent — только если колонки ещё нет).
_ADD_COLUMNS = [
    ("userprofile", "telegram", "VARCHAR NOT NULL DEFAULT ''"),
    ("userprofile", "birth_time", "VARCHAR NOT NULL DEFAULT ''"),
    ("userprofile", "birth_city", "VARCHAR NOT NULL DEFAULT ''"),
    ("userprofile", "photo_pos", "VARCHAR NOT NULL DEFAULT '50% 50%'"),
]


def _existing_columns(conn, table: str) -> set[str]:
    if DATABASE_URL.startswith("sqlite"):
        rows = conn.exec_driver_sql(f"PRAGMA table_info({table})").fetchall()
        return {r[1] for r in rows}
    rows = conn.exec_driver_sql(
        "SELECT column_name FROM information_schema.columns WHERE table_name = %s",
        (table,),
    ).fetchall()
    return {r[0] for r in rows}


def _apply_soft_migrations() -> None:
    with engine.begin() as conn:
        for table, column, ddl in _ADD_COLUMNS:
            try:
                cols = _existing_columns(conn, table)
            except Exception:
                continue
            if column not in cols:
                conn.exec_driver_sql(
                    f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"
                )


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _apply_soft_migrations()


def get_session():
    with Session(engine) as session:
        yield session


def session_factory() -> Session:
    """Новая сессия как контекст-менеджер (для фоновых задач вне FastAPI-депенденси)."""
    return Session(engine)
