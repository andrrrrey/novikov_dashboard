#!/usr/bin/env bash
# Деплой: обновить код, поставить зависимости, собрать фронт, перезапустить сервисы.
# Запуск: bash deploy.sh   (из корня репозитория)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

echo "==> git pull"
git pull --ff-only

echo "==> backend: зависимости"
cd "$REPO_DIR/club-backend"
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/pip install -q -r requirements.txt

echo "==> frontend: сборка"
cd "$REPO_DIR/club-frontend"
npm install
npm run build

echo "==> перезапуск сервисов"
sudo systemctl restart club-backend
sudo systemctl reload nginx

echo "==> готово. Проверь http://217.12.37.176/club/"
