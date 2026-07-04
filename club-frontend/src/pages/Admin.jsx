import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Admin() {
  const { logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [u, s] = await Promise.all([api.listUsers(), api.stats()]);
    setUsers(u);
    setStats(s);
  }

  useEffect(() => { reload().catch((e) => setError(e.message)); }, []);

  async function addUser(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.createUser(email.trim(), password);
      setEmail(""); setPassword("");
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(user) {
    const pass = prompt(`Новый пароль для ${user.email}:`);
    if (!pass) return;
    try { await api.updateUser(user.id, { password: pass }); await reload(); }
    catch (err) { setError(err.message); }
  }

  async function removeUser(user) {
    if (!confirm(`Удалить резидента ${user.email}? Это действие необратимо.`)) return;
    try { await api.deleteUser(user.id); await reload(); }
    catch (err) { setError(err.message); }
  }

  return (
    <div className="dash-wrap">
      <header className="dash-topbar">
        <div className="dash-brand"><span className="login-dot" /> Клуб · администрирование</div>
        <button className="btn dash-logout" onClick={logout}>Выйти</button>
      </header>

      <main className="admin-main">
        <div className="admin-stats">
          <Stat label="Резидентов" value={stats?.total_users} />
          <Stat label="Прошли тест" value={stats?.quiz_completed} accent="var(--green)" />
          <Stat label="Не прошли" value={stats?.quiz_pending} accent="var(--gold)" />
        </div>

        <div className="panel admin-block">
          <h2 className="admin-h2">Добавить резидента</h2>
          <form className="admin-add" onSubmit={addUser}>
            <input className="input" type="email" placeholder="email (он же логин)"
                   value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="input" type="text" placeholder="пароль"
                   value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Добавляем…" : "Создать аккаунт"}
            </button>
          </form>
          {error && <div className="login-error">{error}</div>}
        </div>

        <div className="panel admin-block">
          <h2 className="admin-h2">Резиденты</h2>
          <div className="admin-table">
            <div className="admin-row admin-row-head">
              <span>Email</span><span>Тест</span><span>Роль</span><span></span>
            </div>
            {users.map((u) => (
              <div className="admin-row" key={u.id}>
                <span className="admin-email">{u.email}</span>
                <span>
                  {u.quiz_taken
                    ? <em className="tag tag-ok">пройден</em>
                    : <em className="tag tag-wait">ожидает</em>}
                </span>
                <span className="muted">{u.role === "admin" ? "админ" : "резидент"}</span>
                <span className="admin-actions">
                  <button className="btn admin-mini" onClick={() => resetPassword(u)}>Пароль</button>
                  {u.role !== "admin" && (
                    <button className="btn admin-mini admin-danger" onClick={() => removeUser(u)}>
                      Удалить
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="panel admin-stat">
      <div className="admin-stat-val" style={{ color: accent || "var(--text)" }}>
        {value ?? "—"}
      </div>
      <div className="admin-stat-label">{label}</div>
    </div>
  );
}
