import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import LumenAvatar from "../components/LumenAvatar.jsx";
import { LumenTopNav, LumenMobileNav } from "../components/LumenNav.jsx";
import { TelegramIcon } from "../components/DashIcons.jsx";
import "../styles/lumen.css";

const TABS = [
  { key: "near", label: "С ближайшим уровнем" },
  { key: "all", label: "Все резиденты" },
];

// Демо-редизайн экрана «Резиденты» (дизайн-система Lumen).
// Логика (вкладки, поиск, фильтр по сфере, ленивая загрузка) — как в Residents.jsx.
export default function ResidentsLumen() {
  const { logout } = useAuth();
  const [tab, setTab] = useState("near");
  const [lists, setLists] = useState({});
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [field, setField] = useState("");

  useEffect(() => {
    if (lists[tab]) return;
    api.residents({ scope: tab })
      .then((data) => setLists((prev) => ({ ...prev, [tab]: data })))
      .catch((e) => setError(e.message));
  }, [tab]);

  const all = lists[tab] || null;

  const fields = useMemo(() => {
    const set = new Set((all || []).map((r) => r.business_field).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [all]);

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (all || []).filter((r) => {
      const name = `${r.first_name} ${r.last_name}`.toLowerCase();
      const matchQ = !query || name.includes(query)
        || (r.business_name || "").toLowerCase().includes(query)
        || (r.business_field || "").toLowerCase().includes(query);
      const matchField = !field || r.business_field === field;
      return matchQ && matchField;
    });
  }, [all, q, field]);

  const subtitle = tab === "near"
    ? "Предприниматели с близким уровнем бизнеса — знакомьтесь и обменивайтесь опытом."
    : "Все резиденты клуба, отсортированы по уровню бизнеса — от сильных к растущим.";

  return (
    <div className="lumen lm-app">
      <header className="lm-topbar">
        <div className="lm-brand">
          <span className="lm-brand-mark">N</span>
          <span><b>Новиков</b> Club</span>
          <span className="lm-brand-sub">· резиденты</span>
        </div>
        <LumenTopNav />
        <button className="lm-btn lm-btn-ghost" onClick={logout}>Выйти</button>
      </header>

      <main className="lm-main">
        <div className="lm-stack">
          <div className="lm-page-head">
            <span className="lm-eyebrow">Сообщество клуба</span>
            <h1 className="lm-h1">Резиденты</h1>
          </div>

          <div className="lm-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key}
                      className={`lm-tab${tab === t.key ? " is-active" : ""}`}
                      onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <p className="lm-sub">{subtitle}</p>

          <div className="lm-field-row">
            <input className="lm-input" type="search" placeholder="Поиск по имени или бизнесу…"
                   value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="lm-input lm-select" value={field}
                    onChange={(e) => setField(e.target.value)}>
              <option value="">Все сферы</option>
              {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {error && <div className="lm-card lm-msg">{error}</div>}
          {!all && !error && <div className="lm-card lm-msg">Загрузка…</div>}

          {all && shown.length === 0 && (
            <div className="lm-card lm-msg">Пока никого не нашлось. Попробуйте изменить запрос.</div>
          )}

          <div className="lm-res-list">
            {shown.map((r) => (
              <div className="lm-res" key={r.id}>
                <LumenAvatar photoUrl={r.photo_url} firstName={r.first_name}
                             lastName={r.last_name} size={52} ring />
                <div className="lm-res-info">
                  <div className="lm-res-name">{r.first_name} {r.last_name}</div>
                  <div className="lm-res-biz">{r.business_name}</div>
                  <div className="lm-res-field">{r.business_field}</div>
                  {r.telegram && (
                    <a className="lm-res-tg" href={`https://t.me/${r.telegram}`}
                       target="_blank" rel="noreferrer"
                       aria-label={`Написать ${r.first_name} в телеграм`}>
                      <TelegramIcon size={15} />
                      <span>Написать в телеграм</span>
                    </a>
                  )}
                </div>
                <div className="lm-res-lvl" title="Уровень бизнеса">
                  <span className="lm-res-lvl-num">{r.business_level}</span>
                  <span className="lm-res-lvl-lbl">уровень</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <LumenMobileNav />
    </div>
  );
}
