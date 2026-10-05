"""Восстановление пароля по email и настройки почты в админке."""

import app.main as main
from app.config import ADMIN_EMAIL, ADMIN_PASSWORD


def _admin(client):
    r = client.post("/auth/login", data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _capture_mail(monkeypatch):
    sent = []
    monkeypatch.setattr(main, "send_mail",
                        lambda cfg, to, subject, text, html="": sent.append((cfg, to, text)))
    return sent


def _configure_mail(client):
    r = client.patch("/admin/mail", headers=_admin(client),
                     json={"user": "noreply@club.ru", "password": "abcd efgh ijkl mnop"})
    assert r.status_code == 200, r.text
    return r.json()


def test_forgot_password_disabled_without_mail(client):
    r = client.post("/auth/forgot-password", json={"email": ADMIN_EMAIL})
    assert r.status_code == 503


def test_mail_settings_admin_only_and_password_hidden(client):
    assert client.get("/admin/mail").status_code == 401
    body = _configure_mail(client)
    assert body["configured"] is True
    assert body["password_set"] is True
    assert body["host"] == "smtp.yandex.ru" and body["port"] == 465
    assert "password" not in body
    # пустой пароль не стирает сохранённый
    r = client.patch("/admin/mail", headers=_admin(client), json={"password": ""})
    assert r.json()["password_set"] is True


def test_reset_password_flow(client, monkeypatch):
    _configure_mail(client)
    sent = _capture_mail(monkeypatch)
    client.post("/auth/register", json={"email": "Forgetful@club.ru", "password": "oldpass1"})

    r = client.post("/auth/forgot-password", json={"email": "forgetful@club.ru"})
    assert r.status_code == 200
    assert len(sent) == 1
    cfg, to, text = sent[0]
    assert to == "Forgetful@club.ru"
    assert cfg["password"] == "abcdefghijklmnop"   # пробелы из пароля приложения убраны
    token = text.split("token=")[1].split()[0]

    # повторный запрос в течение минуты письмо не шлёт
    client.post("/auth/forgot-password", json={"email": "forgetful@club.ru"})
    assert len(sent) == 1

    r = client.post("/auth/reset-password", json={"token": token, "password": "newpass1"})
    assert r.status_code == 200, r.text
    assert r.json()["access_token"]
    assert client.post("/auth/login", data={"username": "Forgetful@club.ru",
                                            "password": "newpass1"}).status_code == 200
    assert client.post("/auth/login", data={"username": "Forgetful@club.ru",
                                            "password": "oldpass1"}).status_code == 401
    # ссылка одноразовая
    r = client.post("/auth/reset-password", json={"token": token, "password": "another1"})
    assert r.status_code == 400


def test_forgot_password_unknown_email_same_answer(client, monkeypatch):
    _configure_mail(client)
    sent = _capture_mail(monkeypatch)
    r = client.post("/auth/forgot-password", json={"email": "nobody@club.ru"})
    assert r.status_code == 200
    assert r.json()["detail"] == main.FORGOT_OK
    assert sent == []


def test_reset_password_rejects_garbage_and_short(client):
    assert client.post("/auth/reset-password",
                       json={"token": "garbage", "password": "newpass1"}).status_code == 400
    assert client.post("/auth/reset-password",
                       json={"token": "garbage", "password": "123"}).status_code == 422


def test_mail_test_reports_error(client, monkeypatch):
    _configure_mail(client)

    def boom(*_a, **_k):
        import smtplib
        raise smtplib.SMTPAuthenticationError(535, b"auth failed")
    monkeypatch.setattr(main, "send_mail", boom)
    r = client.post("/admin/mail/test", headers=_admin(client), json={})
    assert r.status_code == 400
    assert "пароль приложения" in r.json()["detail"]
