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

        <PromoBlock onError={setError} />
        <GetCourseBlock onError={setError} />
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

// --- Плашка «Повышайте свой уровень»: картинка + ссылка + заголовок ---
function PromoBlock({ onError }) {
  const [promo, setPromo] = useState(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getPromo().then((p) => {
      setPromo(p); setTitle(p.title || ""); setLink(p.link || ""); setImage(p.image || "");
    }).catch((e) => onError(e.message));
  }, []);

  if (!promo) return null;
  const dirty = title !== (promo.title || "") || link !== (promo.link || "") || image !== (promo.image || "");

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setSaved(false);
    try {
      const { url } = await api.uploadImage(file);
      setImage(url);
    } catch (err) { onError(err.message); } finally { setUploading(false); }
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updatePromo({ title, link, image });
      setPromo(updated);
      setTitle(updated.title || ""); setLink(updated.link || ""); setImage(updated.image || "");
      setSaved(true);
    } catch (err) { onError(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="panel admin-block">
      <h2 className="admin-h2">Плашка «Повышайте свой уровень»</h2>
      <p className="muted admin-note">
        Показывается резиденту на дашборде вместо блока траектории. Задайте заголовок, ссылку и картинку
        (PNG/JPEG/WEBP, до 5 МБ).
      </p>
      <div className="admin-card">
        <div className="admin-card-cover">
          {image ? <img src={image} alt="" /> : <span className="admin-card-cover-empty">нет картинки</span>}
        </div>
        <div className="admin-card-body">
          <input className="input" type="text" placeholder="Заголовок плашки"
                 value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} />
          <input className="input admin-card-url" type="url" placeholder="https:// ссылка"
                 value={link} onChange={(e) => { setLink(e.target.value); setSaved(false); }} />
          <div className="admin-card-actions">
            <label className="btn admin-mini">
              {uploading ? "Загрузка…" : "Картинка…"}
              <input type="file" accept="image/png,image/jpeg,image/webp"
                     hidden onChange={onFile} disabled={uploading} />
            </label>
            {image && (
              <button className="btn admin-mini" onClick={() => { setImage(""); setSaved(false); }}>
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
    </div>
  );
}

// --- GetCourse: доступ, интервал опроса, ручная синхронизация, список групп-уроков ---
function GetCourseBlock({ onError }) {
  const [gc, setGc] = useState(null);
  const [account, setAccount] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [pollHours, setPollHours] = useState("2");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState("");

  async function load() {
    const data = await api.getGetcourse();
    setGc(data);
    setAccount(data.account || "");
    setPollHours(String(data.poll_hours ?? "2"));
  }

  useEffect(() => { load().catch((e) => onError(e.message)); }, []);
  if (!gc) return null;

  async function save() {
    setSaving(true); setNote("");
    try {
      const patch = { account, poll_hours: Number(pollHours) };
      if (apiKey.trim()) patch.api_key = apiKey.trim();
      await api.updateGetcourse(patch);
      setApiKey("");
      await load();
      setNote("Сохранено");
    } catch (err) { onError(err.message); } finally { setSaving(false); }
  }

  async function sync() {
    setSyncing(true); setNote("");
    try {
      const r = await api.syncGetcourse();
      setNote(r.detail || "Синхронизация запущена");
      // статус обновится через несколько секунд — перечитываем
      setTimeout(() => load().catch(() => {}), 6000);
    } catch (err) { onError(err.message); } finally { setSyncing(false); }
  }

  async function toggleGroup(g) {
    try {
      await api.updateGcGroup(g.id, !g.counts);
      await load();
    } catch (err) { onError(err.message); }
  }

  return (
    <div className="panel admin-block">
      <h2 className="admin-h2">GetCourse — прогресс и уровень</h2>
      <p className="muted admin-note">
        Сервер сам опрашивает GetCourse по расписанию, читает составы групп «Урок NN просмотрен»
        и считает уровень резидента (1–10). Ключ создаётся в GetCourse: раздел «Настройки → API».
      </p>

      <div className="admin-gc-form">
        <label className="admin-gc-field">
          <span>Домен аккаунта</span>
          <input className="input" type="text" placeholder="например, myclub (или myclub.getcourse.ru)"
                 value={account} onChange={(e) => setAccount(e.target.value)} />
        </label>
        <label className="admin-gc-field">
          <span>API-ключ {gc.api_key_set && <em className="muted">(задан — оставьте пустым, чтобы не менять)</em>}</span>
          <input className="input" type="password" placeholder={gc.api_key_set ? "••••••••" : "секретный ключ"}
                 value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        </label>
        <label className="admin-gc-field admin-gc-field-sm">
          <span>Опрос, часов</span>
          <input className="input" type="number" min="0.5" step="0.5"
                 value={pollHours} onChange={(e) => setPollHours(e.target.value)} />
        </label>
      </div>

      <div className="admin-card-actions">
        <button className="btn btn-primary admin-mini" onClick={save} disabled={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </button>
        <button className="btn admin-mini" onClick={sync} disabled={syncing || !gc.api_key_set}>
          {syncing ? "Запуск…" : "Синхронизировать сейчас"}
        </button>
        {note && <span className="muted admin-gc-note">{note}</span>}
      </div>

      <div className="admin-gc-status muted">
        <div>Последняя синхронизация: {gc.last_sync ? new Date(gc.last_sync).toLocaleString() : "—"}</div>
        <div>Статус: {gc.last_status || "—"}</div>
        <div>Засчитываемых уроков (N для шкалы): <strong>{gc.total_lessons}</strong></div>
      </div>

      {gc.groups.length > 0 && (
        <div className="admin-gc-groups">
          <h3 className="admin-group-h">Найденные группы-уроки</h3>
          {gc.groups.map((g) => (
            <label className="admin-gc-group" key={g.id}>
              <input type="checkbox" checked={g.counts} onChange={() => toggleGroup(g)} />
              <span>№{g.lesson_number} · {g.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
