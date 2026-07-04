import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

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
    <div className="login-wrap">
      <div className="login-card panel">
        <div className="login-brand">
          <span className="login-dot" />
          Личный кабинет резидента
        </div>
        <h1 className="login-title">Вход</h1>
        <p className="login-sub">Введите данные, которые выдал администратор клуба.</p>

        <form onSubmit={submit} noValidate>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="username"
                 placeholder="you@example.com" value={email}
                 onChange={(e) => setEmail(e.target.value)} required />

          <div style={{ height: 16 }} />

          <label className="label" htmlFor="password">Пароль</label>
          <input id="password" className="input" type="password" autoComplete="current-password"
                 placeholder="••••••••" value={password}
                 onChange={(e) => setPassword(e.target.value)} required />

          {error && <div className="login-error">{error}</div>}

          <button className="btn btn-primary" style={{ width: "100%", marginTop: 22 }}
                  disabled={busy}>
            {busy ? "Входим…" : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
