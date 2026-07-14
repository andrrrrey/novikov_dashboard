"""
Смоук-тест полного пути через API.
Использует изолированную БД (in-memory), чтобы не трогать рабочий club.db.
"""

from app.config import ADMIN_EMAIL, ADMIN_PASSWORD

# engine/app/client живут в conftest.py (общие на всю сессию).


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

    # квиз доступен, 3 вопроса, у вариантов есть index/text
    r = client.get("/quiz", headers=_auth(token))
    questions = r.json()
    assert len(questions) == 3
    assert {q["code"] for q in questions} == {"M", "S", "Mg"}
    assert questions[0]["options"][0]["index"] == 1

    # ответы (индексы вариантов): Маркетинг слабее всех -> узкое место Маркетинг, ур.1
    answers = {"M": 1, "S": 3, "Mg": 1}   # -> M=1, S=2, Mg=1
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
    assert data["balanced"] is False
    assert data["hint"].startswith("Узкое место: Маркетинг")
    assert len(data["cards"]) == 3
    assert data["cards"][0]["title"] == "Привлечение клиентов. Вводный урок"
    # Показатели прогресса присутствуют; без назначенных групп — нули. Плашка с дефолтом.
    assert data["experience"]["level"] == 1 + 2 + 1   # M=1,S=2,Mg=1 из этого теста
    assert data["knowledge"] == {"done": 0, "total": 0}
    assert data["influence"] == 0
    assert data["promo_title"] == "Повышайте свой уровень"


def test_balanced_when_all_levels_equal(client):
    admin = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    client.post("/admin/users",
                json={"email": "balanced@club.ru", "password": "pass12345"},
                headers=_auth(admin))
    token = _login(client, "balanced@club.ru", "pass12345")

    # все первые варианты -> уровень 1 по всем аспектам
    answers = {"M": 1, "S": 1, "Mg": 1}
    r = client.post("/quiz/submit", json={"answers": answers}, headers=_auth(token))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["marketing_level"] == data["sales_level"] == data["management_level"] == 1
    assert data["balanced"] is True
    # при равных уровнях узкое место по приоритету -> Продажи
    assert data["bottleneck_aspect"] == "sales"


def test_admin_stats(client):
    admin = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    r = client.get("/admin/stats", headers=_auth(admin))
    assert r.status_code == 200
    stats = r.json()
    assert stats["total_users"] >= 1
    assert stats["quiz_completed"] >= 1


def test_admin_can_edit_cards_and_hints(client):
    admin = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    # список карточек: 27 штук
    r = client.get("/admin/cards", headers=_auth(admin))
    assert r.status_code == 200
    cards = r.json()
    assert len(cards) == 27
    card_id = cards[0]["id"]

    # обновить ссылку и обложку карточки
    r = client.patch(f"/admin/cards/{card_id}",
                     json={"getcourse_url": "https://gc.example/lesson",
                           "cover": "/club/api/uploads/x.png"},
                     headers=_auth(admin))
    assert r.status_code == 200, r.text
    assert r.json()["getcourse_url"] == "https://gc.example/lesson"
    assert r.json()["cover"] == "/club/api/uploads/x.png"

    # пустая строка очищает поле
    r = client.patch(f"/admin/cards/{card_id}",
                     json={"getcourse_url": ""}, headers=_auth(admin))
    assert r.json()["getcourse_url"] is None

    # список и правка подсказок: 9 штук
    r = client.get("/admin/hints", headers=_auth(admin))
    assert r.status_code == 200
    hints = r.json()
    assert len(hints) == 9
    hint_id = hints[0]["id"]
    r = client.patch(f"/admin/hints/{hint_id}",
                     json={"hint_text": "Новый текст подсказки"}, headers=_auth(admin))
    assert r.status_code == 200
    assert r.json()["hint_text"] == "Новый текст подсказки"


def test_admin_content_endpoints_require_admin(client):
    admin = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    client.post("/admin/users",
                json={"email": "peon@club.ru", "password": "pass12345"},
                headers=_auth(admin))
    user = _login(client, "peon@club.ru", "pass12345")
    assert client.get("/admin/cards", headers=_auth(user)).status_code == 403
    assert client.get("/admin/hints", headers=_auth(user)).status_code == 403
    assert client.post("/admin/upload", headers=_auth(user)).status_code in (403, 422)


def test_admin_upload_cover(client):
    admin = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    # минимальный валидный PNG (1x1)
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000a49444154789c6360000002000154a24f9f0000000049454e44ae426082"
    )
    r = client.post("/admin/upload",
                    files={"file": ("c.png", png, "image/png")},
                    headers=_auth(admin))
    assert r.status_code == 200, r.text
    assert r.json()["url"].startswith("/club/api/uploads/")

    # неверный тип отклоняется
    r = client.post("/admin/upload",
                    files={"file": ("c.txt", b"hello", "text/plain")},
                    headers=_auth(admin))
    assert r.status_code == 400
