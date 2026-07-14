"""
FastAPI-приложение: авторизация, квиз, дашборд резидента, админка.
GetCourse и связанный с ним прогресс в этот скоуп не входят.
"""

import asyncio
import json
import os
import uuid
from contextlib import asynccontextmanager

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from app.config import GETCOURSE_POLL_HOURS_DEFAULT, GETCOURSE_SYNC_ENABLED, UPLOAD_DIR
from app.database import get_session, init_db, session_factory
from app.getcourse import getcourse_scheduler, sync_getcourse
from app.models import ContentCard, GcGroup, QuizResult, TrajectoryHint, User
from app.quiz_data import QUIZ, answers_to_levels
from app.schemas import (
    AdminStats, CardAdminOut, CardOut, CardUpdate, DashboardOut, GcGroupOut,
    GcGroupUpdate, GetCourseOut, GetCourseUpdate, HintOut, HintUpdate, PromoOut,
    PromoUpdate, QuizOption, QuizQuestionOut, QuizSubmit, SyncOut, TokenResponse,
    UploadOut, UserCreate, UserOut, UserUpdate,
)
from app.scoring import evaluate, Aspect
from app.security import (
    create_access_token, get_current_user, hash_password,
    require_admin, verify_password,
)
from app.seed import seed
from app.settings import compute_overall_level, get_setting, set_setting

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


def _overall_and_promo(user: User, session: Session) -> dict:
    """Общие поля дашборда (уровень GetCourse + плашка), не зависящие от квиза."""
    viewed, total, level = compute_overall_level(session, user.email)
    # Если групп-уроков ещё нет (GC не настроен / не синхронизирован) — уровень None.
    if total == 0:
        overall_level = lessons_viewed = total_lessons = None
    else:
        overall_level, lessons_viewed, total_lessons = level, viewed, total
    return {
        "overall_level": overall_level,
        "lessons_viewed": lessons_viewed,
        "total_lessons": total_lessons,
        "promo_title": get_setting(session, "promo_title") or "Повышайте свой уровень",
        "promo_image": get_setting(session, "promo_image") or None,
        "promo_link": get_setting(session, "promo_link") or None,
    }


def _build_dashboard(user: User, session: Session) -> DashboardOut:
    common = _overall_and_promo(user, session)

    result = session.exec(
        select(QuizResult).where(QuizResult.user_id == user.id)
    ).first()
    if result is None:
        return DashboardOut(quiz_taken=False, **common)

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
        **common,
    )


# ------------------------------------------------------------------- Админка
@app.get("/admin/users", response_model=list[UserOut])
def list_users(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    users = session.exec(select(User).order_by(User.created_at)).all()
    taken_ids = {r.user_id for r in session.exec(select(QuizResult)).all()}
    return [
        UserOut(id=u.id, email=u.email, role=u.role,
                created_at=u.created_at, quiz_taken=u.id in taken_ids)
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
                   created_at=user.created_at, quiz_taken=False)


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
    session.commit()
    session.refresh(user)
    taken = session.exec(
        select(QuizResult).where(QuizResult.user_id == user.id)
    ).first() is not None
    return UserOut(id=user.id, email=user.email, role=user.role,
                   created_at=user.created_at, quiz_taken=taken)


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


# ------------------------------------------- Админка: плашка «Повышайте свой уровень»
@app.get("/admin/promo", response_model=PromoOut)
def get_promo(_: User = Depends(require_admin), session: Session = Depends(get_session)):
    return PromoOut(
        title=get_setting(session, "promo_title") or "Повышайте свой уровень",
        image=get_setting(session, "promo_image") or None,
        link=get_setting(session, "promo_link") or None,
    )


@app.patch("/admin/promo", response_model=PromoOut)
def update_promo(
    payload: PromoUpdate,
    _: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    data = payload.model_dump(exclude_unset=True)
    if "title" in data:
        set_setting(session, "promo_title", (data["title"] or "").strip() or "Повышайте свой уровень")
    if "image" in data:
        set_setting(session, "promo_image", (data["image"] or "").strip())
    if "link" in data:
        set_setting(session, "promo_link", (data["link"] or "").strip())
    session.commit()
    return PromoOut(
        title=get_setting(session, "promo_title") or "Повышайте свой уровень",
        image=get_setting(session, "promo_image") or None,
        link=get_setting(session, "promo_link") or None,
    )


# ----------------------------------------------------- Админка: настройки GetCourse
def _getcourse_out(session: Session) -> GetCourseOut:
    groups = session.exec(select(GcGroup).order_by(GcGroup.lesson_number)).all()
    try:
        poll_hours = float(get_setting(session, "gc_poll_hours") or GETCOURSE_POLL_HOURS_DEFAULT)
    except ValueError:
        poll_hours = GETCOURSE_POLL_HOURS_DEFAULT
    return GetCourseOut(
        account=get_setting(session, "gc_account"),
        api_key_set=bool(get_setting(session, "gc_api_key").strip()),
        poll_hours=poll_hours,
        last_sync=get_setting(session, "gc_last_sync") or None,
        last_status=get_setting(session, "gc_last_status") or None,
        total_lessons=sum(1 for g in groups if g.counts),
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
