import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import AuroraCanvas from "../components/AuroraCanvas.jsx";

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
      setError("Пароль должен быть не короче 6 символов.");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают.");
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
    <div className="login-wrap">
      <AuroraCanvas />
      <div className="login-card panel">
        <div className="login-brand">
          <span className="login-dot" />
          Личный кабинет резидента
        </div>
        <h1 className="login-title">Регистрация</h1>
        <p className="login-sub">Создайте аккаунт, чтобы пройти тест и открыть личный кабинет.</p>

        <form onSubmit={submit} noValidate>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="username"
                 placeholder="you@example.com" value={email}
                 onChange={(e) => setEmail(e.target.value)} required />

          <div style={{ height: 16 }} />

          <label className="label" htmlFor="password">Пароль</label>
          <input id="password" className="input" type="password" autoComplete="new-password"
                 placeholder="минимум 6 символов" value={password}
                 onChange={(e) => setPassword(e.target.value)} required />

          <div style={{ height: 16 }} />

          <label className="label" htmlFor="confirm">Повторите пароль</label>
          <input id="confirm" className="input" type="password" autoComplete="new-password"
                 placeholder="••••••••" value={confirm}
                 onChange={(e) => setConfirm(e.target.value)} required />

          {error && <div className="login-error">{error}</div>}

          <button className="btn btn-primary" style={{ width: "100%", marginTop: 22 }}
                  disabled={busy}>
            {busy ? "Создаём…" : "Создать аккаунт"}
          </button>

          <button type="button" className="btn login-secondary"
                  style={{ width: "100%", marginTop: 12 }}
                  onClick={() => navigate("/login")} disabled={busy}>
            Уже есть аккаунт? Войти
          </button>
        </form>
      </div>
    </div>
  );
}
