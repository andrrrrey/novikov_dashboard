"""
Отправка писем через SMTP (корпоративная почта Яндекс 360).
Доступ к ящику задаётся в админке (таблица Setting): сервер, порт, логин и
пароль приложения. Порт 465 — SSL, иначе STARTTLS (587).
"""

import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, make_msgid

from sqlmodel import Session

from app.settings import get_setting

SMTP_TIMEOUT_SECONDS = 20


class MailNotConfigured(Exception):
    """Почта не настроена в админке (нет логина или пароля приложения)."""


def mail_config(session: Session) -> dict:
    try:
        port = int(get_setting(session, "smtp_port") or 465)
    except ValueError:
        port = 465
    return {
        "host": get_setting(session, "smtp_host").strip() or "smtp.yandex.ru",
        "port": port,
        "user": get_setting(session, "smtp_user").strip(),
        "password": get_setting(session, "smtp_password").strip(),
        "from_name": get_setting(session, "smtp_from_name").strip(),
    }


def mail_configured(session: Session) -> bool:
    cfg = mail_config(session)
    return bool(cfg["user"] and cfg["password"])


def send_mail(cfg: dict, to: str, subject: str, text: str, html: str = "") -> None:
    """Отправить письмо. Ошибки SMTP пробрасываются наверх (smtplib.SMTPException, OSError)."""
    if not (cfg["user"] and cfg["password"]):
        raise MailNotConfigured("Почта не настроена")

    msg = EmailMessage()
    # Яндекс принимает письма только от имени самого ящика — From = логин.
    msg["From"] = formataddr((cfg["from_name"], cfg["user"])) if cfg["from_name"] else cfg["user"]
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=cfg["user"].split("@")[-1])
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    context = ssl.create_default_context()
    if cfg["port"] == 465:
        with smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=SMTP_TIMEOUT_SECONDS,
                              context=context) as smtp:
            smtp.login(cfg["user"], cfg["password"])
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=SMTP_TIMEOUT_SECONDS) as smtp:
            smtp.starttls(context=context)
            smtp.login(cfg["user"], cfg["password"])
            smtp.send_message(msg)


def smtp_error_text(err: Exception) -> str:
    """Человеческое описание ошибки SMTP для админки."""
    if isinstance(err, MailNotConfigured):
        return "Укажите логин (адрес ящика) и пароль приложения"
    if isinstance(err, smtplib.SMTPAuthenticationError):
        return ("Яндекс отклонил логин или пароль. Нужен именно пароль приложения "
                "(не обычный пароль от почты), и в настройках почты должен быть "
                "разрешён доступ почтовым программам")
    if isinstance(err, smtplib.SMTPSenderRefused):
        return "Яндекс отклонил адрес отправителя — логин должен совпадать с адресом ящика"
    if isinstance(err, smtplib.SMTPRecipientsRefused):
        return "Адрес получателя отклонён почтовым сервером"
    if isinstance(err, (TimeoutError, ConnectionError, OSError)):
        return f"Не удалось подключиться к почтовому серверу: {err}"
    return f"Ошибка отправки: {err}"
