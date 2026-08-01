import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import MobileNav from "../components/MobileNav.jsx";
import TopNav from "../components/TopNav.jsx";
import { TelegramIcon } from "../components/DashIcons.jsx";
import "../styles/dashboard-v2.css";

const TABS = [
  { key: "near", label: "С ближайшим уровнем" },
  { key: "all", label: "Все резиденты" },
];

export default function Residents() {
  const { logout } = useAuth();
  const [tab, setTab] = useState("near");
  const [lists, setLists] = useState({});   // кэш по scope: { near: [...], all: [...] }
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [field, setField] = useState("");

  // Ленивая загрузка списка по активной вкладке (с кэшем, чтобы не дёргать API дважды).
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

  // Поиск и фильтр — на клиенте по загруженному списку активной вкладки.
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
    <div className="dash-wrap ckv2 has-mnav">
      <header className="dash-topbar">
        <div className="dash-brand"><span className="login-dot" /> Клуб · резиденты</div>
        <TopNav />
        <button className="btn dash-logout" onClick={logout}>Выйти</button>
      </header>

      <main className="ck-main res-main">
        <div className="res">
          <div className="ck-head"><h1 className="ck-title">Резиденты</h1></div>

          <div className="res-tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key}
                      className={`res-tab${tab === t.key ? " is-active" : ""}`}
                      onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <p className="muted res-sub">{subtitle}</p>

          <div className="res-filters">
            <input className="input res-search" type="search" placeholder="Поиск по имени или бизнесу…"
                   value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input res-field" value={field}
                    onChange={(e) => setField(e.target.value)}>
              <option value="">Все сферы</option>
              {fields.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {error && <div className="panel dash-msg">{error}</div>}
          {!all && !error && <div className="panel dash-msg muted">Загрузка…</div>}

          {all && shown.length === 0 && (
            <div className="panel dash-msg muted">Пока никого не нашлось. Попробуйте изменить запрос.</div>
          )}

          <div className="res-list">
            {shown.map((r) => (
              <div className="res-card" key={r.id}>
                <Avatar photoUrl={r.photo_url} firstName={r.first_name}
                        lastName={r.last_name} size={48} />
                <div className="res-info">
                  <div className="res-name">{r.first_name} {r.last_name}</div>
                  <div className="res-biz">{r.business_name}</div>
                  <div className="res-field muted">{r.business_field}</div>
                  {r.telegram && (
                    <a className="res-tg" href={`https://t.me/${r.telegram}`}
                       target="_blank" rel="noreferrer"
                       aria-label={`Написать ${r.first_name} в телеграм`}>
                      <TelegramIcon size={15} />
                      <span>Написать в телеграм</span>
                    </a>
                  )}
                </div>
                <div className="res-level" title="Уровень бизнеса">
                  <span className="res-level-num">{r.business_level}</span>
                  <span className="res-level-lbl">уровень</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
