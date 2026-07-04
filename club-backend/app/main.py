"""
FastAPI-приложение: авторизация, квиз, дашборд резидента, админка.
GetCourse и связанный с ним прогресс в этот скоуп не входят.
"""

import json
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.database import get_session, init_db
from app.models import ContentCard, QuizResult, TrajectoryHint, User
from app.quiz_data import QUIZ, answers_to_levels
from app.schemas import (
    AdminStats, CardOut, DashboardOut, QuizOption, QuizQuestionOut,
    QuizSubmit, TokenResponse, UserCreate, UserOut, UserUpdate,
)
from app.scoring import evaluate, Aspect
from app.security import (
    create_access_token, get_current_user, hash_password,
    require_admin, verify_password,
)
from app.seed import seed

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    seed()
    yield


app = FastAPI(title="Клуб — личный кабинет резидента", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # в проде сузить до домена фронта
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
            options=[QuizOption(level=i, text=t) for i, t in enumerate(q["options"], 1)],
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


def _build_dashboard(user: User, session: Session) -> DashboardOut:
    result = session.exec(
        select(QuizResult).where(QuizResult.user_id == user.id)
    ).first()
    if result is None:
        return DashboardOut(quiz_taken=False)

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

    return DashboardOut(
        quiz_taken=True,
        marketing_level=result.marketing_level,
        sales_level=result.sales_level,
        management_level=result.management_level,
        bottleneck_aspect=result.bottleneck_aspect,
        bottleneck_level=result.bottleneck_level,
        hint=hint.hint_text if hint else None,
        cards=[CardOut(position=c.position, title=c.title,
                       getcourse_url=c.getcourse_url, cover=c.cover) for c in cards],
        getcourse_progress=None,   # подключим с модулем GetCourse
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
