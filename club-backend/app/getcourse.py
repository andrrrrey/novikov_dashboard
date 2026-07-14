"""
Опрос GetCourse по расписанию: читаем составы групп «Урок NN просмотрен»,
обновляем хранилище просмотров (LessonView) и сопоставляем резидентов по email.

GetCourse отдаёт составы групп асинхронным экспортом:
  1. GET /pl/api/account/groups?key=...                 — список групп
  2. GET /pl/api/account/groups/{gc_id}/users?key=...   — старт экспорта → export_id
  3. GET /pl/api/account/exports/{export_id}?key=...     — статус + данные (опрос до готовности)

Лимит export-API — не более 100 запросов за 2 часа. Держим бюджет запросов на цикл
и round-robin курсор по группам: если групп много, они разбираются за несколько циклов.
"""

import asyncio
import re
from datetime import datetime, timezone
from typing import Any, Callable, Optional

import httpx
from sqlmodel import Session, select

from app.config import GETCOURSE_POLL_HOURS_DEFAULT
from app.models import GcAssignment, GcGroup, LessonView, User
from app.progress import compute_user_progress
from app.settings import get_setting, set_setting

# Имя группы-сегмента: «Урок 01 просмотрен», «Урок 12 — просмотрен» и т.п.
LESSON_GROUP_RE = re.compile(r"урок\s*0*(\d+).*просмотр", re.IGNORECASE)

# Бюджет запросов к export-API на один цикл (лимит GetCourse — 100 за 2 ч, берём с запасом).
REQUEST_BUDGET = 90
# Экспорт в GetCourse асинхронный и обычно готов за 10–60 с. Опрашиваем терпеливо,
# иначе бросим незабранный экспорт — и он заблокирует следующий («уже запущен один экспорт»).
EXPORT_POLL_ATTEMPTS = 12      # опросов готовности одного экспорта
EXPORT_POLL_DELAY = 6.0        # сек между опросами одного экспорта (до ~72 с ожидания)
# GetCourse разрешает лишь один экспорт за раз. Если предыдущий ещё идёт — ждём и повторяем старт.
START_RETRY_ATTEMPTS = 3
START_RETRY_DELAY = 20.0       # сек ожидания, пока освободится слот экспорта
BETWEEN_REQUESTS_DELAY = 1.0   # сек между любыми запросами (вежливость к API)
HTTP_TIMEOUT = 30.0

# Защита от наложения ручного и планового прогонов.
_sync_lock = asyncio.Lock()


def parse_lesson_number(name: str) -> Optional[int]:
    """Из имени группы «Урок NN просмотрен» вернуть NN, иначе None."""
    m = LESSON_GROUP_RE.search(name or "")
    return int(m.group(1)) if m else None


def _is_busy_error(exc: Exception) -> bool:
    """GetCourse: «Уже запущен один экспорт, попробуйте позднее» — слот экспорта занят."""
    text = str(exc).lower()
    return "уже запущен" in text or "already" in text or "попробуйте позднее" in text


def _dig(data: Any, key: str) -> Any:
    """Найти ключ на верхнем уровне или во вложенном 'info' (формат ответов GC разнится)."""
    if isinstance(data, dict):
        if key in data:
            return data[key]
        info = data.get("info")
        if isinstance(info, dict) and key in info:
            return info[key]
    return None


class GetCourseError(Exception):
    """Ошибка, которую GetCourse вернул в теле ответа (success=false)."""


class GetCourseClient:
    def __init__(self, account: str, api_key: str, client: httpx.AsyncClient):
        self.base = f"https://{account}.getcourse.ru/pl/api/account"
        self.key = api_key
        self.http = client

    async def _get(self, path: str) -> dict:
        resp = await self.http.get(
            f"{self.base}{path}",
            params={"key": self.key},
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        # GetCourse отдаёт ошибки в теле с HTTP 200: {"success":false,"error_message":...}
        if isinstance(data, dict) and data.get("success") is False:
            msg = data.get("error_message") or f"код {data.get('error_code')}"
            raise GetCourseError(msg)
        return data

    async def list_groups(self) -> list[dict]:
        """
        Список групп: [{'id': int, 'name': str, ...}, ...].
        GetCourse кладёт группы прямо в поле info (список).
        """
        data = await self._get("/groups")
        info = data.get("info") if isinstance(data, dict) else None
        if isinstance(info, list):
            return info
        # запасные варианты на случай иного формата
        groups = _dig(data, "groups")
        if groups is None and isinstance(data, list):
            groups = data
        return groups or []

    async def start_group_export(self, gc_id: int) -> Optional[int]:
        """Стартовать экспорт состава группы, вернуть export_id."""
        data = await self._get(f"/groups/{gc_id}/users")
        export_id = _dig(data, "export_id")
        if export_id is None:
            # info может быть самим id экспорта
            info = data.get("info") if isinstance(data, dict) else None
            if isinstance(info, (int, str)) and str(info).isdigit():
                export_id = info
        return int(export_id) if export_id is not None else None

    async def fetch_export(self, export_id: int) -> Optional[list[dict]]:
        """
        Забрать готовый экспорт. Возвращает список словарей (строка = поля->значения)
        или None, если данные ещё не готовы.
        """
        data = await self._get(f"/exports/{export_id}")
        status = (_dig(data, "status") or "").lower()
        items = _dig(data, "items")
        fields = _dig(data, "fields")
        if items is None or fields is None:
            # ещё не готово (processing) либо пустой ответ
            if status and status not in ("finished", "success", "done"):
                return None
            if items is None:
                return None
        return [dict(zip(fields, row)) for row in items]


def _extract_email(row: dict) -> Optional[str]:
    """Достать email из строки экспорта (имя колонки может отличаться)."""
    for key, value in row.items():
        if not isinstance(value, str):
            continue
        if key and "email" in key.lower() and "@" in value:
            return value.strip().lower()
    # запасной вариант: любая ячейка, похожая на email
    for value in row.values():
        if isinstance(value, str) and "@" in value and "." in value:
            return value.strip().lower()
    return None


def _sync_group_views(
    session: Session, gc_group_id: int, emails: set[str], email_to_uid: dict[str, int]
) -> None:
    """Привести LessonView для группы к текущему составу (upsert новых, удалить ушедших)."""
    existing = session.exec(
        select(LessonView).where(LessonView.gc_group_id == gc_group_id)
    ).all()
    existing_by_email = {v.email: v for v in existing}

    for email in emails:
        row = existing_by_email.get(email)
        uid = email_to_uid.get(email)
        if row is None:
            session.add(LessonView(email=email, gc_group_id=gc_group_id, user_id=uid))
        elif row.user_id != uid:
            row.user_id = uid
            session.add(row)

    for email, row in existing_by_email.items():
        if email not in emails:
            session.delete(row)


async def sync_getcourse(session_factory: Callable[[], Session]) -> str:
    """
    Один цикл синхронизации. Возвращает текст статуса (он же пишется в gc_last_status).
    session_factory — как правило, app.database.engine-обёртка (см. run_sync).
    """
    async with _sync_lock:
        # --- читаем конфиг ---
        with session_factory() as session:
            account = get_setting(session, "gc_account").strip()
            api_key = get_setting(session, "gc_api_key").strip()
            try:
                cursor = int(get_setting(session, "gc_cursor") or "0")
            except ValueError:
                cursor = 0

        if not account or not api_key:
            status = "не настроено: укажите домен и ключ GetCourse в админке"
            _write_status(session_factory, status, touch_time=False)
            return status

        requests_used = 0
        try:
            async with httpx.AsyncClient() as http:
                client = GetCourseClient(account, api_key, http)

                # 1) список групп → upsert всех GcGroup (пул для настройки шкал в админке)
                groups = await client.list_groups()
                requests_used += 1
                with session_factory() as session:
                    total_groups = _upsert_groups(session, groups)
                    session.commit()
                    # состав тянем только для групп, задействованных в шкалах (exp/know)
                    assigned = {a.gc_group_id for a in session.exec(select(GcAssignment)).all()}
                    gc_ids = sorted(assigned)

                if not gc_ids:
                    status = (
                        f"группы получены ({total_groups}), но ни одна не назначена в шкалы — "
                        f"распределите группы в разделе «Опыт и Знания»"
                    )
                    _write_status(session_factory, status)
                    return status

                # 2) round-robin по группам в рамках бюджета запросов
                processed = 0
                last_error = ""
                n = len(gc_ids)
                start = cursor % n
                per_group_cost = 1 + START_RETRY_ATTEMPTS + EXPORT_POLL_ATTEMPTS
                idx = start
                for _ in range(n):
                    if requests_used + per_group_cost > REQUEST_BUDGET:
                        break
                    gc_id = gc_ids[idx]
                    try:
                        await asyncio.sleep(BETWEEN_REQUESTS_DELAY)
                        # старт экспорта: если слот занят предыдущим — ждём и повторяем
                        export_id = None
                        for attempt in range(START_RETRY_ATTEMPTS + 1):
                            try:
                                export_id = await client.start_group_export(gc_id)
                                requests_used += 1
                                break
                            except GetCourseError as exc:
                                requests_used += 1
                                if _is_busy_error(exc) and attempt < START_RETRY_ATTEMPTS:
                                    await asyncio.sleep(START_RETRY_DELAY)
                                    continue
                                raise

                        rows = None
                        if export_id is not None:
                            for _poll in range(EXPORT_POLL_ATTEMPTS):
                                await asyncio.sleep(EXPORT_POLL_DELAY)
                                rows = await client.fetch_export(export_id)
                                requests_used += 1
                                if rows is not None:
                                    break

                        if rows is not None:
                            emails = {e for e in (_extract_email(r) for r in rows) if e}
                            with session_factory() as session:
                                email_to_uid = _email_to_uid(session)
                                _sync_group_views(session, gc_id, emails, email_to_uid)
                                session.commit()
                            processed += 1
                        else:
                            last_error = "экспорт не готов за отведённое время"
                    except GetCourseError as exc:
                        # ошибка по одной группе не должна ронять весь цикл
                        last_error = str(exc)

                    idx = (idx + 1) % n

                # сохраняем курсор для следующего цикла
                with session_factory() as session:
                    set_setting(session, "gc_cursor", str(idx))
                    session.commit()

                # пересчёт уровня «Опыт» и «дней на уровне» для всех резидентов
                _refresh_all_exp_levels(session_factory)

                status = f"ок: назначенных групп {n}, обновлено за цикл {processed}, запросов {requests_used}"
                if processed < n and last_error:
                    status += f"; не все группы: {last_error}"
                _write_status(session_factory, status)
                return status
        except GetCourseError as exc:
            status = f"GetCourse отклонил запрос: {exc}"
            _write_status(session_factory, status)
            return status
        except httpx.HTTPError as exc:
            status = f"ошибка сети GetCourse: {exc}"
            _write_status(session_factory, status)
            return status
        except Exception as exc:  # noqa: BLE001 — статус для админки, не роняем планировщик
            status = f"ошибка синхронизации: {exc}"
            _write_status(session_factory, status)
            return status


def _upsert_groups(session: Session, groups: list[dict]) -> int:
    """Создать/обновить все GcGroup (пул для настройки шкал). Вернуть их число."""
    count = 0
    for g in groups:
        gc_id = g.get("id") or g.get("group_id")
        name = g.get("name") or g.get("title") or ""
        if gc_id is None:
            continue
        lesson_no = parse_lesson_number(name) or 0   # не-урочные группы → 0
        count += 1
        existing = session.exec(
            select(GcGroup).where(GcGroup.gc_id == int(gc_id))
        ).first()
        if existing is None:
            session.add(GcGroup(
                gc_id=int(gc_id), name=name, lesson_number=lesson_no, counts=True,
            ))
        else:
            existing.name = name
            existing.lesson_number = lesson_no
            session.add(existing)
    return count


def _email_to_uid(session: Session) -> dict[str, int]:
    return {
        u.email.strip().lower(): u.id
        for u in session.exec(select(User)).all()
        if u.id is not None
    }


def _refresh_all_exp_levels(session_factory) -> None:
    """После синхронизации пересчитать уровень «Опыт» (для «дней на уровне») всем резидентам."""
    with session_factory() as session:
        users = session.exec(select(User).where(User.role == "user")).all()
        for user in users:
            # compute_user_progress внутри вызывает refresh_exp_level (обновит exp_level_since)
            compute_user_progress(session, user)


def _write_status(session_factory, status: str, touch_time: bool = True) -> None:
    with session_factory() as session:
        set_setting(session, "gc_last_status", status)
        if touch_time:
            set_setting(session, "gc_last_sync", datetime.now(timezone.utc).isoformat())
        session.commit()


async def getcourse_scheduler(session_factory: Callable[[], Session]) -> None:
    """Фоновый цикл: синхронизация → сон на gc_poll_hours. Запускается в lifespan."""
    while True:
        try:
            await sync_getcourse(session_factory)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001 — планировщик не должен падать
            pass

        with session_factory() as session:
            try:
                hours = float(get_setting(session, "gc_poll_hours") or GETCOURSE_POLL_HOURS_DEFAULT)
            except ValueError:
                hours = GETCOURSE_POLL_HOURS_DEFAULT
        hours = max(0.5, hours)   # не чаще раза в полчаса
        await asyncio.sleep(hours * 3600)
