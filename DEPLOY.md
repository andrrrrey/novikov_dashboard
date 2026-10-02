# Деплой на сервер (под /club)

Раздаётся по адресу http://217.12.37.176/club/ (латиница!).
Стек: FastAPI (uvicorn, порт 8000, только localhost) + статика Vite за nginx.

## Первичная установка

1. Пакеты:
   sudo apt update && sudo apt install -y nginx git python3-venv python3-pip curl
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs

2. Код:
   sudo mkdir -p /var/www && cd /var/www
   sudo git clone https://github.com/andrrrrey/novikov_dashboard.git
   sudo chown -R $USER:$USER /var/www/novikov_dashboard

3. Бэкенд:
   cd /var/www/novikov_dashboard/club-backend
   python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt

4. systemd-сервис:
   - открой deploy/club-backend.service, впиши SECRET_KEY (python3 -c "import secrets;print(secrets.token_hex(32))"),
     ADMIN_PASSWORD и User (тот, кто владеет репозиторием, напр. root/ubuntu/твой логин).
   - sudo cp deploy/club-backend.service /etc/systemd/system/
   - sudo systemctl daemon-reload && sudo systemctl enable --now club-backend
   - sudo systemctl status club-backend   (active running)

5. Фронт:
   cd /var/www/novikov_dashboard/club-frontend && npm install && npm run build

6. nginx:
   sudo cp deploy/nginx-club.conf /etc/nginx/sites-available/club
   sudo ln -s /etc/nginx/sites-available/club /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo ufw allow 80 || true

7. Проверка: http://217.12.37.176/club/  → вход admin@club.ru + пароль из сервиса.

## Внешний API: имя резидента по телеграм-нику
В сервисе задай EXTERNAL_API_KEY (любой длинный секрет; пусто — API выключен) и, если адрес
другой, PUBLIC_APP_URL (по умолчанию https://club-app.ru/club). Запрос:

   curl -H "X-API-Key: <ключ>" https://club-app.ru/club/api/external/residents/by-telegram/marchevsky_ivan

Ник можно передать как «ник», «@ник» или «t.me/ник». Ответ (404 — не найден, 401 — неверный ключ):

   {"telegram": "marchevsky_ivan", "first_name": "Иван", "last_name": "Марчевский",
    "first_name_en": "Ivan", "last_name_en": "Marchevskii", "full_name_en": "Ivan Marchevskii",
    "slug": "ivan-marchevskii", "url": "https://club-app.ru/club/residents/ivan-marchevskii"}

Ссылка url открывает профиль резидента напрямую; если резидент не вошёл, после входа
его вернёт на этот профиль. У тёзок ссылки различаются суффиксом: ivan-marchevskii,
ivan-marchevskii-2 (ссылка закреплена за человеком и меняется только при смене имени).

## Безопасность: HTTPS и сессия в cookie
- Сайт должен открываться только по https://club-app.ru. В deploy/nginx-club.conf — редирект
  HTTP→HTTPS и заголовок HSTS. Если на сервере конфиг уже правил certbot, сверь (sudo nginx -T)
  и перенеси редирект и add_header, не затирая пути к сертификатам; затем sudo nginx -t && sudo systemctl reload nginx.
- Токен входа хранится в HttpOnly-cookie (JS к нему доступа не имеет), а не в localStorage.
  Cookie помечена Secure — уходит только по HTTPS. Для локальной разработки по http:
  COOKIE_SECURE=0. После первой выкладки этой версии всем резидентам нужно войти заново (один раз).
- CORS по умолчанию выключен (фронт и API на одном домене). Если API нужен с другого домена —
  Environment="CORS_ORIGINS=https://other.example" в сервисе.
- Пароль в DevTools браузера виден в теле запроса всегда — это нормально: шифруется канал (TLS),
  а не сам запрос. Снаружи по сети при HTTPS он не виден.

## Обновление кода потом
Из корня репозитория:  bash deploy.sh
(git pull + зависимости + сборка фронта + перезапуск). club.db при этом не трогается.

## Диагностика
- Бэкенд:  sudo journalctl -u club-backend -f
- nginx:   sudo tail -f /var/log/nginx/error.log
- Белый экран → пересобрать фронт (npm run build), Ctrl+F5.
- Ошибка на логине → проверить, что фронт собран после правок (base /club/, API /club/api).

## На будущее
- База SQLite в club-backend/club.db. Бэкапить перед обновлениями.
