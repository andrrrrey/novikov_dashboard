"""
FastAPI-приложение: авторизация, квиз, дашборд резидента, админка.
GetCourse и связанный с ним прогресс в этот скоуп не входят.
"""

import asyncio
import json
import os
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from app.config import GETCOURSE_POLL_HOURS_DEFAULT, GETCOURSE_SYNC_ENABLED, UPLOAD_DIR
from app.database import get_session, init_db, session_factory
from app.getcourse import getcourse_scheduler, sync_getcourse
from app.models import (
    ContentCard, GcAssignment, GcGroup, QuizResult, TrajectoryHint, User, UserStats,
)
from app.progress import CATEGORIES, compute_user_progress
from app.quiz_data import QUIZ, answers_to_levels
from app.schemas import (
    AdminStats, CardAdminOut, CardOut, CardUpdate, CategoryProgress, DashboardOut,
    ExperienceOut, GcGroupOut, GcGroupUpdate, GetCourseOut, GetCourseUpdate, HintOut,
    HintUpdate, InfoTipsOut, InfoTipsUpdate, KnowledgeOut, ProgressConfigOut,
    ProgressConfigUpdate, PromoOut,
    PromoUpdate, QuizOption, QuizQuestionOut, QuizSubmit, SyncOut, TokenResponse,
    UploadOut, UserCreate, UserOut, UserUpdate,
)
from app.scoring import evaluate, Aspect
from app.security import (
    create_access_token, get_current_user, hash_password,
    require_admin, verify_password,
)
from app.seed import seed
from app.settings import get_setting, set_setting

# Разрешённые типы обложек и лимит размера загрузки.
ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
}
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 МБ


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    seed()
    task = None
    if GETCOURSE_SYNC_ENABLED:
        # Фоновый опрос GetCourse. Один воркер uvicorn (в проде без --workers) → без дублей.
        task = asyncio.create_task(getcourse_scheduler(session_factory))
    try:
        yield
    finally:
        if task is not None:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


app = FastAPI(title="Клуб — личный кабинет резидента", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # в проде сузить до домена фронта
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Загруженные обложки. Внешне доступно как /club/api/uploads/... через nginx.
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


# ---------------------------------------------------------------- Авторизация
@app.post("/auth/login", response_model=TokenResponse)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    # username в форме OAuth2 = email
    user = session.exec(select(User).where(User.email == form.username)).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )
    return TokenResponse(access_token=create_access_token(user), role=user.role)


# ---------------------------------------------------------------------- Квиз
@app.get("/quiz", response_model=list[QuizQuestionOut])
def get_quiz(_: User = Depends(get_current_user)):
    return [
        QuizQuestionOut(
            code=q["code"],
            aspect=q["aspect"].value,
            text=q["text"],
            options=[
                QuizOption(index=i, text=opt["text"])
                for i, opt in enumerate(q["options"], 1)
            ],
        )
        for q in QUIZ
    ]


@app.post("/quiz/submit", response_model=DashboardOut)
def submit_quiz(
    payload: QuizSubmit,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    try:
        by_aspect = answers_to_levels(payload.answers)
        result = evaluate(by_aspect)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    existing = session.exec(
        select(QuizResult).where(QuizResult.user_id == user.id)
    ).first()
    if existing:
        for key, value in result.items():
            setattr(existing, key, value)
        existing.answers_json = json.dumps(payload.answers)
    else:
        session.add(QuizResult(
            user_id=user.id, answers_json=json.dumps(payload.answers), **result
        ))
    session.commit()
    return _build_dashboard(user, session)


# ------------------------------------------------------------------ Дашборд
@app.get("/me/dashboard", response_model=DashboardOut)
def dashboard(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return _build_dashboard(user, session)


def _promo_title(session: Session) -> str:
    return get_setting(session, "promo_title") or "Запустить траекторию развития"


# Ключи попапов-подсказок к показателям дашборда.
INFO_TIP_KEYS = ("info_knowledge", "info_influence", "info_business")


def _info_tips(session: Session) -> dict[str, str]:
    """Тексты подсказок к показателям: {ключ: текст} (дефолт из settings.DEFAULTS)."""
    return {key: get_setting(session, key) for key in INFO_TIP_KEYS}


def _promo_links(session: Session) -> dict[str, dict[str, str]]:
    """Ссылки баннера: {aspect: {levelStr: url}} из настройки promo_links (JSON)."""
    raw = get_setting(session, "promo_links") or ""
    try:
        data = json.loads(raw) if raw else {}
    except (ValueError, TypeError):
        data = {}
    out: dict[str, dict[str, str]] = {}
    for cat in CATEGORIES:
        levels = data.get(cat) or {}
        out[cat] = {
            str(lvl): str(url).strip()
            for lvl, url in levels.items() if str(url).strip()
        }
    return out


def _promo_levels(session: Session) -> dict[str, list[int]]:
    """Настроенные уровни по аспектам (из групп опыта); минимум [1]."""
    found: dict[str, set[int]] = {c: set() for c in CATEGORIES}
    for a in session.exec(select(GcAssignment).where(GcAssignment.track == "exp")).all():
        if a.category in found and a.level is not None:
            found[a.category].add(a.level)
    return {c: (sorted(found[c]) or [1]) for c in CATEGORIES}


def _resolve_promo_link(session: Session, aspect: str, level: int) -> Optional[str]:
    """Ссылка баннера для узкого места (минимального аспекта) на его уровне."""
    links = _promo_links(session)
    return (links.get(aspect) or {}).get(str(level)) or None


def _build_dashboard(user: User, session: Session) -> DashboardOut:
    title = _promo_title(session)
    tips = _info_tips(session)

    result = session.exec(
        select(QuizResult).where(QuizResult.user_id == user.id)
    ).first()
    if result is None:
        # Влияние показываем и без теста (его ставит админ), бары — после теста.
        stats = session.get(UserStats, user.id)
        return DashboardOut(
            quiz_taken=False, influence=stats.influence if stats else 0,
            promo_title=title, promo_image=None, promo_link=None, **tips,
        )

    p = compute_user_progress(session, user)
    cat_levels = {c["aspect"]: c["level"] for c in p["categories"]}

    # Узкое место = минимальный аспект. Ссылка баннера — на его текущем уровне.
    bottleneck_aspect = result.bottleneck_aspect
    bottleneck_current_level = cat_levels.get(bottleneck_aspect, result.bottleneck_level)
    promo_link = _resolve_promo_link(session, bottleneck_aspect, bottleneck_current_level)

    hint = session.exec(
        select(TrajectoryHint).where(
            TrajectoryHint.aspect == result.bottleneck_aspect,
            TrajectoryHint.level == result.bottleneck_level,
        )
    ).first()

    cards = session.exec(
        select(ContentCard)
        .where(
            ContentCard.aspect == result.bottleneck_aspect,
            ContentCard.level == result.bottleneck_level,
        )
        .order_by(ContentCard.position)
    ).all()

    balanced = (
        result.marketing_level == result.sales_level == result.management_level
    )

    return DashboardOut(
        quiz_taken=True,
        marketing_level=result.marketing_level,
        sales_level=result.sales_level,
        management_level=result.management_level,
        bottleneck_aspect=result.bottleneck_aspect,
        bottleneck_level=result.bottleneck_level,
        balanced=balanced,
        hint=hint.hint_text if hint else None,
        cards=[CardOut(position=c.position, title=c.title,
                       getcourse_url=c.getcourse_url, cover=c.cover) for c in cards],
        experience=ExperienceOut(**p["experience"]),
        categories=[CategoryProgress(**c) for c in p["categories"]],
        knowledge=KnowledgeOut(**p["knowledge"]),
        influence=p["influence"],
        promo_title=title, promo_image=None, promo_link=promo_link, **tips,
    )


# ------------------------------------------------------------------- Админка
def _influence(session: Session, user_id: int) -> int:
    stats = session.get(UserStats, user_id)
    return stats.influence if stats else 0


@app.get("/admin/users", response_model=list[UserOut])
def list_users(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    users = session.exec(select(User).order_by(User.created_at)).all()
    taken_ids = {r.user_id for r in session.exec(select(QuizResult)).all()}
    influence = {s.user_id: s.influence for s in session.exec(select(UserStats)).all()}
    return [
        UserOut(id=u.id, email=u.email, role=u.role, created_at=u.created_at,
                quiz_taken=u.id in taken_ids, influence=influence.get(u.id, 0))
        for u in users
    ]


@app.post("/admin/users", response_model=UserOut, status_code=201)
def create_user(
    payload: UserCreate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    if session.exec(select(User).where(User.email == payload.email)).first():
        raise HTTPException(status_code=409, detail="Email уже занят")
    user = User(email=payload.email, password_hash=hash_password(payload.password),
                role=payload.role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserOut(id=user.id, email=user.email, role=user.role,
                   created_at=user.created_at, quiz_taken=False, influence=0)


@app.patch("/admin/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if payload.email and payload.email != user.email:
        if session.exec(select(User).where(User.email == payload.email)).first():
            raise HTTPException(status_code=409, detail="Email уже занят")
        user.email = payload.email
    if payload.password:
        user.password_hash = hash_password(payload.password)
    session.add(user)
    if payload.influence is not None:
        stats = session.get(UserStats, user.id)
        if stats is None:
            stats = UserStats(user_id=user.id, influence=payload.influence)
        else:
            stats.influence = payload.influence
        session.add(stats)
    session.commit()
    session.refresh(user)
    taken = session.exec(
        select(QuizResult).where(QuizResult.user_id == user.id)
    ).first() is not None
    return UserOut(id=user.id, email=user.email, role=user.role,
                   created_at=user.created_at, quiz_taken=taken,
                   influence=_influence(session, user.id))


@app.delete("/admin/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя удалить самого себя")
    result = session.exec(
        select(QuizResult).where(QuizResult.user_id == user_id)
    ).first()
    if result:
        session.delete(result)
    stats = session.get(UserStats, user_id)
    if stats:
        session.delete(stats)
    session.delete(user)
    session.commit()


@app.get("/admin/stats", response_model=AdminStats)
def admin_stats(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    total = len(session.exec(select(User).where(User.role == "user")).all())
    completed = len(session.exec(select(QuizResult)).all())
    return AdminStats(total_users=total, quiz_completed=completed,
                      quiz_pending=max(total - completed, 0))


# ---------------------------------------------- Админка: карточки и подсказки
@app.get("/admin/cards", response_model=list[CardAdminOut])
def list_cards(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    cards = session.exec(
        select(ContentCard).order_by(
            ContentCard.aspect, ContentCard.level, ContentCard.position
        )
    ).all()
    return [
        CardAdminOut(id=c.id, aspect=c.aspect, level=c.level, position=c.position,
                     title=c.title, getcourse_url=c.getcourse_url, cover=c.cover)
        for c in cards
    ]


@app.patch("/admin/cards/{card_id}", response_model=CardAdminOut)
def update_card(
    card_id: int,
    payload: CardUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    card = session.get(ContentCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Карточка не найдена")
    # exclude_unset: меняем только явно переданные поля.
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key in ("getcourse_url", "cover") and not value:
            value = None   # пустая строка от админа = очистить ссылку/обложку
        setattr(card, key, value)
    session.add(card)
    session.commit()
    session.refresh(card)
    return CardAdminOut(id=card.id, aspect=card.aspect, level=card.level,
                        position=card.position, title=card.title,
                        getcourse_url=card.getcourse_url, cover=card.cover)


@app.get("/admin/hints", response_model=list[HintOut])
def list_hints(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    hints = session.exec(
        select(TrajectoryHint).order_by(TrajectoryHint.aspect, TrajectoryHint.level)
    ).all()
    return [
        HintOut(id=h.id, aspect=h.aspect, level=h.level, hint_text=h.hint_text)
        for h in hints
    ]


@app.patch("/admin/hints/{hint_id}", response_model=HintOut)
def update_hint(
    hint_id: int,
    payload: HintUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    hint = session.get(TrajectoryHint, hint_id)
    if not hint:
        raise HTTPException(status_code=404, detail="Подсказка не найдена")
    hint.hint_text = payload.hint_text
    session.add(hint)
    session.commit()
    session.refresh(hint)
    return HintOut(id=hint.id, aspect=hint.aspect, level=hint.level,
                   hint_text=hint.hint_text)


@app.post("/admin/upload", response_model=UploadOut)
async def upload_cover(
    file: UploadFile,
    _: User = Depends(require_admin),
):
    ext = ALLOWED_IMAGE_TYPES.get(file.content_type)
    if not ext:
        raise HTTPException(status_code=400,
                            detail="Допустимы только PNG, JPEG или WEBP")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Файл больше 5 МБ")

    name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(UPLOAD_DIR, name), "wb") as fh:
        fh.write(data)
    return UploadOut(url=f"/club/api/uploads/{name}")


# ------------------------------------------- Админка: баннер «Повышайте свой уровень»
def _promo_out(session: Session) -> PromoOut:
    return PromoOut(
        title=_promo_title(session),
        links=_promo_links(session),
        levels=_promo_levels(session),
    )


@app.get("/admin/promo", response_model=PromoOut)
def get_promo(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    return _promo_out(session)


@app.patch("/admin/promo", response_model=PromoOut)
def update_promo(
    payload: PromoUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    data = payload.model_dump(exclude_unset=True)
    if "title" in data:
        set_setting(session, "promo_title",
                    (data["title"] or "").strip() or "Запустить траекторию развития")
    if "links" in data and data["links"] is not None:
        clean: dict[str, dict[str, str]] = {}
        for cat in CATEGORIES:
            levels = data["links"].get(cat) or {}
            clean[cat] = {
                str(lvl): (url or "").strip()
                for lvl, url in levels.items() if (url or "").strip()
            }
        set_setting(session, "promo_links", json.dumps(clean, ensure_ascii=False))
    session.commit()
    return _promo_out(session)


# --------------------------------------------- Админка: подсказки к показателям
def _info_tips_out(session: Session) -> InfoTipsOut:
    return InfoTipsOut(**_info_tips(session))


@app.get("/admin/info-tips", response_model=InfoTipsOut)
def get_info_tips(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    return _info_tips_out(session)


@app.patch("/admin/info-tips", response_model=InfoTipsOut)
def update_info_tips(
    payload: InfoTipsUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    data = payload.model_dump(exclude_unset=True)
    for key in INFO_TIP_KEYS:
        if key in data:
            set_setting(session, key, (data[key] or "").strip())
    session.commit()
    return _info_tips_out(session)


# ----------------------------------------------------- Админка: настройки GetCourse
def _getcourse_out(session: Session) -> GetCourseOut:
    groups = session.exec(select(GcGroup).order_by(GcGroup.name)).all()
    try:
        poll_hours = float(get_setting(session, "gc_poll_hours") or GETCOURSE_POLL_HOURS_DEFAULT)
    except ValueError:
        poll_hours = GETCOURSE_POLL_HOURS_DEFAULT
    # сколько групп задействовано в шкалах (по ним тянется состав)
    assigned = {a.gc_group_id for a in session.exec(select(GcAssignment)).all()}
    return GetCourseOut(
        account=get_setting(session, "gc_account"),
        api_key_set=bool(get_setting(session, "gc_api_key").strip()),
        poll_hours=poll_hours,
        last_sync=get_setting(session, "gc_last_sync") or None,
        last_status=get_setting(session, "gc_last_status") or None,
        total_lessons=len(assigned),
        groups=[GcGroupOut(id=g.id, gc_id=g.gc_id, name=g.name,
                           lesson_number=g.lesson_number, counts=g.counts) for g in groups],
    )


@app.get("/admin/getcourse", response_model=GetCourseOut)
def get_getcourse(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    return _getcourse_out(session)


@app.patch("/admin/getcourse", response_model=GetCourseOut)
def update_getcourse(
    payload: GetCourseUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    data = payload.model_dump(exclude_unset=True)
    if "account" in data:
        # принимаем как поддомен, так и полный домен — храним поддомен
        acc = (data["account"] or "").strip()
        acc = acc.replace("https://", "").replace("http://", "").strip("/")
        acc = acc.split(".getcourse")[0]
        set_setting(session, "gc_account", acc)
    if "api_key" in data and data["api_key"] is not None:
        key = data["api_key"].strip()
        if key:   # пустую строку игнорируем, чтобы случайно не стереть ключ
            set_setting(session, "gc_api_key", key)
    if "poll_hours" in data and data["poll_hours"] is not None:
        set_setting(session, "gc_poll_hours", str(max(0.5, float(data["poll_hours"]))))
    session.commit()
    return _getcourse_out(session)


@app.patch("/admin/getcourse/groups/{group_id}", response_model=GcGroupOut)
def update_gc_group(
    group_id: int,
    payload: GcGroupUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    group = session.get(GcGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    group.counts = payload.counts
    session.add(group)
    session.commit()
    session.refresh(group)
    return GcGroupOut(id=group.id, gc_id=group.gc_id, name=group.name,
                      lesson_number=group.lesson_number, counts=group.counts)


@app.post("/admin/getcourse/sync", response_model=SyncOut)
async def sync_getcourse_now(
    background: BackgroundTasks,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    account = get_setting(session, "gc_account").strip()
    api_key = get_setting(session, "gc_api_key").strip()
    if not account or not api_key:
        raise HTTPException(status_code=400,
                            detail="Сначала укажите домен и ключ GetCourse")
    background.add_task(sync_getcourse, session_factory)
    return SyncOut(started=True, detail="Синхронизация запущена в фоне")


# ---------------------- Админка: состав групп для шкал «Опыт» и «Знания»
@app.get("/admin/progress-config", response_model=ProgressConfigOut)
def get_progress_config(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    groups = session.exec(select(GcGroup).order_by(GcGroup.name)).all()
    exp: dict[str, dict[int, list[int]]] = {c: {} for c in CATEGORIES}
    know: list[int] = []
    for a in session.exec(select(GcAssignment)).all():
        if a.track == "know":
            know.append(a.gc_group_id)
        elif a.track == "exp" and a.category in exp and a.level is not None:
            exp[a.category].setdefault(a.level, []).append(a.gc_group_id)
    return ProgressConfigOut(
        groups=[GcGroupOut(id=g.id, gc_id=g.gc_id, name=g.name,
                           lesson_number=g.lesson_number, counts=g.counts) for g in groups],
        exp=exp,
        know=sorted(set(know)),
    )


@app.put("/admin/progress-config", response_model=ProgressConfigOut)
def update_progress_config(
    payload: ProgressConfigUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    # полная перезапись назначений
    for a in session.exec(select(GcAssignment)).all():
        session.delete(a)
    for category, levels in (payload.exp or {}).items():
        if category not in CATEGORIES:
            continue
        for level, gc_ids in (levels or {}).items():
            for gc_id in dict.fromkeys(gc_ids):   # уникальные, порядок сохраняем
                session.add(GcAssignment(track="exp", category=category,
                                         level=int(level), gc_group_id=int(gc_id)))
    for gc_id in dict.fromkeys(payload.know or []):
        session.add(GcAssignment(track="know", gc_group_id=int(gc_id)))
    session.commit()
    return get_progress_config(session=session)
