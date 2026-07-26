import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import MobileNav from "../components/MobileNav.jsx";
import TopNav from "../components/TopNav.jsx";
import "../styles/dashboard-v2.css";

export default function Residents() {
  const { logout } = useAuth();
  const [all, setAll] = useState(null);   // полный список (для опций фильтра)
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [field, setField] = useState("");

  useEffect(() => {
    api.residents().then(setAll).catch((e) => setError(e.message));
  }, []);

  const fields = useMemo(() => {
    const set = new Set((all || []).map((r) => r.business_field).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [all]);

  // Поиск и фильтр — на клиенте по уже загруженному «похожему по уровню» списку.
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

  return (
    <div className="dash-wrap ckv2 has-mnav">
      <header className="dash-topbar">
        <div className="dash-brand"><span className="login-dot" /> Клуб · резиденты</div>
        <TopNav />
        <button className="btn dash-logout" onClick={logout}>Выйти</button>
      </header>

      <main className="ck-main res-main">
        <div className="res">
          <div className="ck-head"><h1 className="ck-title">Резиденты вашего уровня</h1></div>
          <p className="muted res-sub">Предприниматели с близким уровнем бизнеса — знакомьтесь и обменивайтесь опытом.</p>

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
