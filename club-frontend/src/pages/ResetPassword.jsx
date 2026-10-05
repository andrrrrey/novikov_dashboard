import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import AuroraCanvas from "../components/AuroraCanvas.jsx";
import logoUrl from "../assets/logo.svg";
import "../styles/pwa.css";

// Восстановление пароля, шаг 2: страница по ссылке из письма (?token=…).
// Новый пароль сохраняется, и резидент сразу оказывается в кабинете.
export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setBusy(true);
    try {
      const role = await resetPassword(token, password);
      navigate(role === "admin" ? "/admin" : "/", { replace: true });
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
            <h1 className="pwa-h1">Новый пароль</h1>
            {token ? (
              <>
                <p className="pwa-login-sub">Придумайте новый пароль<br />для входа в кабинет</p>
                <input className="pwa-input" type="password" placeholder="Новый пароль (минимум 6 символов)"
                       autoComplete="new-password"
                       value={password} onChange={(e) => setPassword(e.target.value)} required />
                <input className="pwa-input" type="password" placeholder="Повторите пароль"
                       autoComplete="new-password"
                       value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                {error && <div className="pwa-login-err">{error}</div>}
                <button type="submit" className="pwa-btn-white" disabled={busy}>
                  {busy ? "Сохраняем…" : "Сохранить и войти"}
                </button>
              </>
            ) : (
              <p className="pwa-login-sub">Ссылка неполная. Откройте её из письма целиком или запросите новую.</p>
            )}

            <button type="button" className="pwa-btn-ghost-line"
                    onClick={() => navigate("/forgot-password")} disabled={busy}>
              Запросить новую ссылку
            </button>
          </form>
          <div className="pwa-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
