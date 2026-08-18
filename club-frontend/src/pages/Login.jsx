import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import logoUrl from "../assets/logo.svg";
import "../styles/pwa.css";

// Боевой экран входа в дизайне PWA (макет Figma): логотип «Новиков Club»,
// «сияющий» зелёный фон, поля Email/Пароль и белая кнопка «Войти».
// Реальная авторизация: по роли ведём в админку или в кабинет резидента.
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const role = await login(email.trim(), password);
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
        <div className="pwa-login-aurora" aria-hidden="true" />
        <div className="pwa-login-inner">
          <div className="pwa-logo">
            <img src={logoUrl} alt="Новиков Club" />
          </div>

          <form className="pwa-login-form" onSubmit={submit} noValidate>
            <h1 className="pwa-h1">Вход</h1>
            <p className="pwa-login-sub">Введите данные которые<br />выдал администратор клуба</p>

            <input className="pwa-input" type="email" placeholder="Email" autoComplete="username"
                   value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="pwa-input" type="password" placeholder="Пароль" autoComplete="current-password"
                   value={password} onChange={(e) => setPassword(e.target.value)} required />

            {error && <div className="pwa-login-err">{error}</div>}

            <button type="submit" className="pwa-btn-white" disabled={busy}>
              {busy ? "Входим…" : "Войти"}
            </button>
          </form>
          <div className="pwa-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
