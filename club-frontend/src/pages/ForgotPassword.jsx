import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import AuroraCanvas from "../components/AuroraCanvas.jsx";
import logoUrl from "../assets/logo.svg";
import "../styles/pwa.css";

// Восстановление пароля, шаг 1: резидент вводит email — сервер присылает письмо
// со ссылкой на /reset-password. Ответ одинаковый, есть такой адрес или нет.
export default function ForgotPassword() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email || "");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Укажите email, с которым входите в кабинет");
      return;
    }
    setBusy(true);
    try {
      const res = await api.forgotPassword(email.trim());
      setSent(res.detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pwa">
      <div className="pwa-frame pwa-login">
        <AuroraCanvas className="pwa-login-aurora" />
        <div className="pwa-login-inner">
          <div className="pwa-logo">
            <img src={logoUrl} alt="Новиков Club" />
          </div>

          <form className="pwa-login-form" onSubmit={submit} noValidate>
            <h1 className="pwa-h1">Восстановление пароля</h1>
            {sent ? (
              <p className="pwa-login-sub">
                {sent}. Проверьте почту, в том числе папку «Спам». Ссылка действует 1 час.
              </p>
            ) : (
              <>
                <p className="pwa-login-sub">Введите email — пришлём ссылку<br />для смены пароля</p>
                <input className="pwa-input" type="email" placeholder="Email" autoComplete="username"
                       value={email} onChange={(e) => setEmail(e.target.value)} required />
                {error && <div className="pwa-login-err">{error}</div>}
                <button type="submit" className="pwa-btn-white" disabled={busy}>
                  {busy ? "Отправляем…" : "Прислать ссылку"}
                </button>
              </>
            )}

            <button type="button" className="pwa-btn-ghost-line"
                    onClick={() => navigate("/login", { state })} disabled={busy}>
              Вернуться ко входу
            </button>
          </form>
          <div className="pwa-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
