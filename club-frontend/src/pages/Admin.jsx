import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

const ASPECT_LABEL = { marketing: "Маркетинг", sales: "Продажи", management: "Менеджмент" };

export default function Admin() {
  const { logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [cards, setCards] = useState([]);
  const [hints, setHints] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [u, s, c, h] = await Promise.all([
      api.listUsers(), api.stats(), api.listCards(), api.listHints(),
    ]);
    setUsers(u);
    setStats(s);
    setCards(c);
    setHints(h);
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

        <CardsBlock cards={cards} onError={setError} />
        <HintsBlock hints={hints} onError={setError} />
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

// --- Карточки траектории: ссылка + обложка на каждую карточку ---
function CardsBlock({ cards, onError }) {
  // группируем: аспект -> уровень -> [карточки по позиции]
  const groups = {};
  for (const c of cards) {
    const key = `${c.aspect}-${c.level}`;
    (groups[key] ||= { aspect: c.aspect, level: c.level, items: [] }).items.push(c);
  }
  const ordered = Object.values(groups);

  return (
    <div className="panel admin-block">
      <h2 className="admin-h2">Карточки траектории</h2>
      <p className="muted admin-note">
        Для каждой карточки можно задать ссылку на материал и обложку (PNG/JPEG/WEBP, до 5 МБ).
      </p>
      {ordered.map((g) => (
        <div className="admin-group" key={`${g.aspect}-${g.level}`}>
          <h3 className="admin-group-h">
            {ASPECT_LABEL[g.aspect]} · уровень {g.level}
          </h3>
          <div className="admin-cards">
            {g.items.map((card) => (
              <CardEditor key={card.id} card={card} onError={onError} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CardEditor({ card, onError }) {
  const [url, setUrl] = useState(card.getcourse_url || "");
  const [cover, setCover] = useState(card.cover || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = url !== (card.getcourse_url || "") || cover !== (card.cover || "");

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setSaved(false);
    try {
      const { url: coverUrl } = await api.uploadImage(file);
      setCover(coverUrl);
    } catch (err) {
      onError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updateCard(card.id, { getcourse_url: url, cover });
      card.getcourse_url = updated.getcourse_url;
      card.cover = updated.cover;
      setUrl(updated.getcourse_url || "");
      setCover(updated.cover || "");
      setSaved(true);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-card">
      <div className="admin-card-cover">
        {cover
          ? <img src={cover} alt="" />
          : <span className="admin-card-cover-empty">нет обложки</span>}
      </div>
      <div className="admin-card-body">
        <div className="admin-card-pos">Карточка {card.position}</div>
        <div className="admin-card-title" title={card.title}>{card.title}</div>
        <input className="input admin-card-url" type="url" placeholder="https:// ссылка на материал"
               value={url} onChange={(e) => { setUrl(e.target.value); setSaved(false); }} />
        <div className="admin-card-actions">
          <label className="btn admin-mini">
            {uploading ? "Загрузка…" : "Обложка…"}
            <input type="file" accept="image/png,image/jpeg,image/webp"
                   hidden onChange={onFile} disabled={uploading} />
          </label>
          {cover && (
            <button className="btn admin-mini" onClick={() => { setCover(""); setSaved(false); }}>
              Убрать
            </button>
          )}
          <button className="btn btn-primary admin-mini" onClick={save}
                  disabled={saving || uploading || !dirty}>
            {saving ? "Сохраняем…" : saved ? "Сохранено ✓" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Подсказки под узким местом ---
function HintsBlock({ hints, onError }) {
  return (
    <div className="panel admin-block">
      <h2 className="admin-h2">Подсказки (текст под узким местом)</h2>
      <p className="muted admin-note">
        Показывается резиденту в блоке «Рекомендация» для соответствующего направления и уровня.
      </p>
      <div className="admin-hints">
        {hints.map((h) => <HintEditor key={h.id} hint={h} onError={onError} />)}
      </div>
    </div>
  );
}

function HintEditor({ hint, onError }) {
  const [text, setText] = useState(hint.hint_text);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = text !== hint.hint_text;

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updateHint(hint.id, { hint_text: text });
      hint.hint_text = updated.hint_text;
      setText(updated.hint_text);
      setSaved(true);
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-hint">
      <div className="admin-hint-head">{ASPECT_LABEL[hint.aspect]} · уровень {hint.level}</div>
      <textarea className="input admin-hint-text" rows={3}
                value={text}
                onChange={(e) => { setText(e.target.value); setSaved(false); }} />
      <div className="admin-card-actions">
        <button className="btn btn-primary admin-mini" onClick={save} disabled={saving || !dirty}>
          {saving ? "Сохраняем…" : saved ? "Сохранено ✓" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
