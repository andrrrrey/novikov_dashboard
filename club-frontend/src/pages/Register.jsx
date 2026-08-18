import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import AuroraCanvas from "../components/AuroraCanvas.jsx";
import logoUrl from "../assets/logo.svg";
import "../styles/pwa.css";

// Экран регистрации в дизайне PWA (в пару к экрану входа): Aurora-фон, логотип,
// поля Email/Пароль/Повтор и белая кнопка «Создать аккаунт». После успеха —
// авто-вход и переход в кабинет (новичок без анкеты попадёт в онбординг).
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
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
      await register(email.trim(), password);
      navigate("/", { replace: true });
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
            <h1 className="pwa-h1">Регистрация</h1>
            <p className="pwa-login-sub">Создайте аккаунт, чтобы пройти тест<br />и открыть личный кабинет</p>

            <input className="pwa-input" type="email" placeholder="Email" autoComplete="username"
                   value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="pwa-input" type="password" placeholder="Пароль (минимум 6 символов)"
                   autoComplete="new-password"
                   value={password} onChange={(e) => setPassword(e.target.value)} required />
            <input className="pwa-input" type="password" placeholder="Повторите пароль"
                   autoComplete="new-password"
                   value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

            {error && <div className="pwa-login-err">{error}</div>}

            <button type="submit" className="pwa-btn-white" disabled={busy}>
              {busy ? "Создаём…" : "Создать аккаунт"}
            </button>

            <button type="button" className="pwa-btn-ghost-line"
                    onClick={() => navigate("/login")} disabled={busy}>
              Уже есть аккаунт? Войти
            </button>
          </form>
          <div className="pwa-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
