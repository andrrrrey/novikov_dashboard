import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

const ASPECT_LABEL = { marketing: "Маркетинг", sales: "Продажи", management: "Менеджмент" };

// Склонение: 1 группа, 2 группы, 5 групп.
function plGroups(n) {
  const a = Math.abs(n) % 100, d = a % 10;
  if (a > 10 && a < 20) return "групп";
  if (d === 1) return "группа";
  if (d >= 2 && d <= 4) return "группы";
  return "групп";
}

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
          <div className="admin-table admin-table-users">
            <div className="admin-row admin-row-head">
              <span>Email</span><span>Тест</span><span>Роль</span><span>Влияние</span><span></span>
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
                <span>
                  {u.role === "admin"
                    ? <span className="muted">—</span>
                    : <InfluenceEditor user={u} onSaved={reload} onError={setError} />}
                </span>
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

        <ProgressConfigBlock onError={setError} />
        <PromoBlock onError={setError} />
        <InfoTipsBlock onError={setError} />
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

// --- Баннер «Повышайте свой уровень»: заголовок + ссылки по аспект+уровень ---
function buildPromoLinks(p) {
  const out = {};
  for (const [aspect] of PROGRESS_CATS) {
    // уровни = из конфигурации «Опыт» + те, для которых уже сохранены ссылки
    const levels = new Set([
      ...(p.levels?.[aspect] || [1]).map(Number),
      ...Object.keys(p.links?.[aspect] || {}).map(Number),
    ]);
    if (levels.size === 0) levels.add(1);
    out[aspect] = {};
    for (const lvl of [...levels].sort((a, b) => a - b)) {
      out[aspect][lvl] = p.links?.[aspect]?.[lvl] ?? "";
    }
  }
  return out;
}

function PromoBlock({ onError }) {
  const [promo, setPromo] = useState(null);
  const [title, setTitle] = useState("");
  const [links, setLinks] = useState({});   // {aspect: {level: url}}
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getPromo().then((p) => {
      setPromo(p); setTitle(p.title || ""); setLinks(buildPromoLinks(p));
    }).catch((e) => onError(e.message));
  }, []);

  if (!promo) return null;

  const dirty =
    title !== (promo.title || "") ||
    JSON.stringify(links) !== JSON.stringify(buildPromoLinks(promo));

  function setLink(aspect, lvl, val) {
    setLinks((prev) => ({ ...prev, [aspect]: { ...prev[aspect], [lvl]: val } }));
    setSaved(false);
  }

  function addLevel(aspect) {
    setLinks((prev) => {
      const lv = prev[aspect] || {};
      const next = Math.max(0, ...Object.keys(lv).map(Number)) + 1;
      return { ...prev, [aspect]: { ...lv, [next]: "" } };
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await api.updatePromo({ title, links });
      setPromo(updated); setTitle(updated.title || ""); setLinks(buildPromoLinks(updated));
      setSaved(true);
    } catch (err) { onError(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="panel admin-block">
      <h2 className="admin-h2">Баннер «Запустить траекторию развития»</h2>
      <p className="muted admin-note">
        Резиденту показывается баннер без картинки. Задайте ссылку для каждого уровня направлений —
        на дашборде откроется ссылка узкого места (самого слабого направления) на его текущем уровне.
        Уровни подтягиваются из блока «Опыт и Знания»; можно добавить вручную кнопкой «+ уровень».
      </p>

      <label className="label">Заголовок баннера</label>
      <input className="input" type="text" placeholder="Запустить траекторию развития"
             value={title} onChange={(e) => { setTitle(e.target.value); setSaved(false); }} />

      <div className="promo-links">
        {PROGRESS_CATS.map(([aspect, label]) => (
          <div className="promo-aspect" key={aspect}>
            <div className="promo-aspect-h">{label}</div>
            <div className="promo-levels">
              {Object.keys(links[aspect] || {}).map(Number).sort((a, b) => a - b).map((lvl) => (
                <label className="promo-lvl" key={lvl}>
                  <span className="promo-lvl-tag">Уровень {lvl}</span>
                  <input className="input" type="url" placeholder="https:// ссылка"
                         value={links[aspect]?.[lvl] ?? ""}
                         onChange={(e) => setLink(aspect, lvl, e.target.value)} />
                </label>
              ))}
              <button className="btn admin-mini promo-add" type="button"
                      onClick={() => addLevel(aspect)}>+ уровень</button>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card-actions promo-actions">
        <button className="btn btn-primary admin-mini" onClick={save} disabled={saving || !dirty}>
          {saving ? "Сохраняем…" : saved ? "Сохранено ✓" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

// --- Подсказки к показателям: тексты попапов «?» у плашек дашборда ---
const INFO_TIP_FIELDS = [
  ["info_business", "Уровень вашего бизнеса"],
  ["info_knowledge", "Знания"],
  ["info_influence", "Влияние"],
];

function InfoTipsBlock({ onError }) {
  const [tips, setTips] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getInfoTips().then((t) => { setTips(t); setDraft(t); }).catch((e) => onError(e.message));
  }, []);

  if (!tips) return null;

  const dirty = INFO_TIP_FIELDS.some(([key]) => (draft[key] || "") !== (tips[key] || ""));

  function setField(key, val) {
    setDraft((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const patch = Object.fromEntries(INFO_TIP_FIELDS.map(([key]) => [key, draft[key] || ""]));
      const updated = await api.updateInfoTips(patch);
      setTips(updated); setDraft(updated); setSaved(true);
    } catch (err) { onError(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="panel admin-block">
      <h2 className="admin-h2">Подсказки к показателям</h2>
      <p className="muted admin-note">
        Текст всплывающих подсказок (иконка «?») у плашек «Уровень вашего бизнеса»,
        «Знания» и «Влияние» на дашборде резидента.
      </p>

      {INFO_TIP_FIELDS.map(([key, label]) => (
        <div className="admin-tip-field" key={key}>
          <label className="label">{label}</label>
          <textarea className="input admin-hint-text" rows={3}
                    value={draft[key] || ""}
                    onChange={(e) => setField(key, e.target.value)} />
        </div>
      ))}

      <div className="admin-card-actions promo-actions">
        <button className="btn btn-primary admin-mini" onClick={save} disabled={saving || !dirty}>
          {saving ? "Сохраняем…" : saved ? "Сохранено ✓" : "Сохранить"}
        </button>
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

  return (
    <div className="panel admin-block">
      <h2 className="admin-h2">GetCourse — подключение</h2>
      <p className="muted admin-note">
        Сервер по расписанию сам опрашивает GetCourse и обновляет составы групп. Какие группы
        входят в «Опыт» и «Знания» — настраивается выше. Ключ создаётся в GetCourse: «Настройки → API».
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
        <div>Групп получено из GetCourse: <strong>{gc.groups.length}</strong>; задействовано в шкалах: <strong>{gc.total_lessons}</strong></div>
      </div>
    </div>
  );
}

// --- Влияние: очки, которые админ ставит резиденту ---
function InfluenceEditor({ user, onSaved, onError }) {
  const [val, setVal] = useState(String(user.influence ?? 0));
  const [saving, setSaving] = useState(false);
  const dirty = String(user.influence ?? 0) !== val.trim();

  async function save() {
    setSaving(true);
    try {
      await api.updateUser(user.id, { influence: parseInt(val, 10) || 0 });
      await onSaved();
    } catch (err) { onError(err.message); } finally { setSaving(false); }
  }

  return (
    <span className="admin-influence">
      <input className="input admin-influence-input" type="number" value={val}
             onChange={(e) => setVal(e.target.value)} />
      <button className="btn admin-mini" onClick={save} disabled={saving || !dirty}>
        {saving ? "…" : "✓"}
      </button>
    </span>
  );
}

// --- Настройка шкал: какие группы GetCourse входят в уровни категорий и в «Знания» ---
const PROGRESS_CATS = [
  ["management", "Менеджмент"], ["sales", "Продажи"], ["marketing", "Маркетинг"],
];

// Выбор групп: показываем только выбранные (чипами), остальное — по поиску.
// Масштабируется на 100+ групп: список не рендерится целиком, только по запросу.
function GroupPicker({ groups, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const byId = new Map(groups.map((g) => [g.gc_id, g]));
  const chosen = [...selected].map((id) => byId.get(id)).filter(Boolean);
  const q = query.trim().toLowerCase();
  const available = groups.filter(
    (g) => !selected.has(g.gc_id) && (!q || g.name.toLowerCase().includes(q))
  );
  const MAX = 60;

  return (
    <div className="gp">
      <div className="gp-chips">
        {chosen.length === 0 && <span className="gp-empty">ничего не выбрано</span>}
        {chosen.map((g) => (
          <span className="gp-chip" key={g.gc_id}>
            <span className="gp-chip-name">{g.name}</span>
            <button className="gp-chip-x" onClick={() => onToggle(g.gc_id)}
                    title="Убрать" type="button">×</button>
          </span>
        ))}
        <button className="gp-addbtn" type="button" onClick={() => setOpen((o) => !o)}>
          {open ? "Свернуть" : "+ добавить"}
        </button>
      </div>

      {open && (
        <div className="gp-panel">
          <input className="input gp-search" type="text" placeholder="Поиск группы по названию…"
                 value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          <div className="gp-list">
            {available.length === 0 && <div className="gp-none">ничего не найдено</div>}
            {available.slice(0, MAX).map((g) => (
              <button className="gp-opt" type="button" key={g.gc_id}
                      onClick={() => onToggle(g.gc_id)}>
                <span className="gp-opt-name">{g.name}</span>
                <span className="gp-opt-plus">＋</span>
              </button>
            ))}
            {available.length > MAX && (
              <div className="gp-more">Показаны первые {MAX} из {available.length} — уточните поиск.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressConfigBlock({ onError }) {
  const [cfg, setCfg] = useState(null);   // {groups, exp:{cat:{level:Set}}, know:Set}
  const [bizMax, setBizMax] = useState("9");   // сумма уровней = 100% уровня бизнеса
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getProgressConfig()
      .then((c) => { setCfg(normalize(c)); setBizMax(String(c.business_level_max ?? 9)); })
      .catch((e) => onError(e.message));
  }, []);

  if (!cfg) return null;

  function normalize(c) {
    const exp = {};
    for (const [cat] of PROGRESS_CATS) {
      exp[cat] = {};
      const levels = c.exp?.[cat] || {};
      for (const lvl of Object.keys(levels)) exp[cat][Number(lvl)] = new Set(levels[lvl]);
      if (Object.keys(exp[cat]).length === 0) exp[cat][1] = new Set();  // хотя бы ур.1
    }
    return { groups: c.groups, exp, know: new Set(c.know || []) };
  }

  function toggleExp(cat, level, gcId) {
    setCfg((prev) => {
      const set = new Set(prev.exp[cat][level]);
      set.has(gcId) ? set.delete(gcId) : set.add(gcId);
      return { ...prev, exp: { ...prev.exp, [cat]: { ...prev.exp[cat], [level]: set } } };
    });
    setSaved(false);
  }

  function addLevel(cat) {
    setCfg((prev) => {
      const levels = prev.exp[cat];
      const next = Math.max(0, ...Object.keys(levels).map(Number)) + 1;
      return { ...prev, exp: { ...prev.exp, [cat]: { ...levels, [next]: new Set() } } };
    });
  }

  function toggleKnow(gcId) {
    setCfg((prev) => {
      const set = new Set(prev.know);
      set.has(gcId) ? set.delete(gcId) : set.add(gcId);
      return { ...prev, know: set };
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const exp = {};
      for (const [cat] of PROGRESS_CATS) {
        exp[cat] = {};
        for (const lvl of Object.keys(cfg.exp[cat])) exp[cat][lvl] = [...cfg.exp[cat][lvl]];
      }
      await api.updateProgressConfig({
        exp, know: [...cfg.know],
        business_level_max: Math.max(1, parseInt(bizMax, 10) || 9),
      });
      setSaved(true);
    } catch (err) { onError(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="panel admin-block">
      <h2 className="admin-h2">Опыт и Знания: состав групп</h2>
      <p className="muted admin-note">
        Выберите, какие группы GetCourse входят в каждый уровень категории («Опыт») и в «Знания».
        Добавляйте группы через поиск — выбранные показаны чипами. Когда резидент проходит все
        группы уровня, уровень растёт.
      </p>

      <div className="admin-tip-field">
        <label className="label">Максимальный уровень бизнеса (= 100%)</label>
        <input className="input" type="number" min="1" style={{ maxWidth: 160 }}
               value={bizMax}
               onChange={(e) => { setBizMax(e.target.value); setSaved(false); }} />
        <p className="muted admin-note" style={{ margin: "8px 0 0" }}>
          Сумма уровней трёх направлений, при которой уровень бизнеса на дашборде показывает 100.
          Значение резидента = сумма уровней ÷ этот максимум × 100 (0–100).
        </p>
      </div>

      {cfg.groups.length === 0 && (
        <p className="muted">Групп пока нет — сначала подключите GetCourse и дождитесь синхронизации.</p>
      )}

      {PROGRESS_CATS.map(([cat, label]) => (
        <div className="admin-group" key={cat}>
          <h3 className="admin-group-h">{label}</h3>
          {Object.keys(cfg.exp[cat]).map(Number).sort((a, b) => a - b).map((level) => (
            <div className="pc-level" key={level}>
              <div className="pc-level-title">
                Уровень {level}
                <span className="pc-count">
                  {cfg.exp[cat][level].size} {plGroups(cfg.exp[cat][level].size)}
                </span>
              </div>
              <GroupPicker groups={cfg.groups} selected={cfg.exp[cat][level]}
                           onToggle={(id) => toggleExp(cat, level, id)} />
            </div>
          ))}
          <button className="btn admin-mini" onClick={() => addLevel(cat)}>+ уровень</button>
        </div>
      ))}

      <div className="admin-group">
        <h3 className="admin-group-h">
          Знания
          <span className="pc-count">{cfg.know.size} {plGroups(cfg.know.size)}</span>
        </h3>
        <GroupPicker groups={cfg.groups} selected={cfg.know}
                     onToggle={(id) => toggleKnow(id)} />
      </div>

      <div className="admin-card-actions">
        <button className="btn btn-primary admin-mini" onClick={save} disabled={saving}>
          {saving ? "Сохраняем…" : saved ? "Сохранено ✓" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
