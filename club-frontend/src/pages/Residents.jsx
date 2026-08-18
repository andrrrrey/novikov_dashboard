import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { initials } from "../components/Avatar.jsx";
import PwaShell from "../components/PwaShell.jsx";
import { SearchIcon, BackIcon, TelegramIcon } from "../components/PwaIcons.jsx";

// Боевой экран «Резиденты» в дизайне PWA (макет Figma): назад + заголовок,
// поиск, чипы-фильтры и карточки резидентов с кнопкой «Написать в телеграм».
// Данные реальные (api.residents): чипы переключают охват near/all, поиск —
// по имени/бизнесу/сфере на клиенте.
const SCOPES = [
  { key: "near", label: "Ближайший уровень" },
  { key: "all", label: "Все резиденты" },
];

export default function Residents() {
  const navigate = useNavigate();
  const [scope, setScope] = useState("near");
  const [lists, setLists] = useState({});   // кэш по scope
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (lists[scope]) return;
    api.residents({ scope })
      .then((data) => setLists((prev) => ({ ...prev, [scope]: data })))
      .catch((e) => setError(e.message));
  }, [scope]);

  const all = lists[scope] || null;

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (all || []).filter((r) => {
      if (!query) return true;
      const name = `${r.first_name} ${r.last_name}`.toLowerCase();
      return name.includes(query)
        || (r.business_name || "").toLowerCase().includes(query)
        || (r.business_field || "").toLowerCase().includes(query);
    });
  }, [all, q]);

  return (
    <PwaShell cta={null} hero={false} dashHref="/" resHref="/residents">
      <div className="pwa-subhead">
        <button type="button" className="pwa-back" onClick={() => navigate("/")}>
          <BackIcon size={20} /> Назад
        </button>
        <div className="pwa-subtitle">Резиденты</div>
      </div>

      <div className="pwa-search">
        <span className="pwa-search-ic"><SearchIcon size={20} /></span>
        <input type="text" placeholder="Поиск по имени, бизнесу или практике"
               value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="pwa-filters-label">Фильтры</div>
      <div className="pwa-chips">
        {SCOPES.map((s) => (
          <button key={s.key} type="button"
                  className={`pwa-chip${scope === s.key ? " is-active" : ""}`}
                  onClick={() => setScope(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {error && <div className="pwa-state is-error">{error}</div>}
      {!all && !error && <div className="pwa-state">Загрузка…</div>}
      {all && shown.length === 0 && (
        <div className="pwa-state">Пока никого не нашлось. Попробуйте изменить запрос.</div>
      )}

      {all && shown.length > 0 && (
        <div className="pwa-stack" style={{ marginTop: 16 }}>
          {shown.map((r) => {
            const name = `${r.first_name} ${r.last_name}`.trim() || "Резидент";
            return (
              <div className="pwa-rescard" key={r.id}>
                <div className="pwa-rescard-top">
                  <span className="pwa-rescard-field">{r.business_field}</span>
                  <span className="pwa-rescard-lvl">Уровень {r.business_level}</span>
                </div>
                <button type="button" className="pwa-rescard-person"
                        onClick={() => navigate(`/residents/${r.id}`, { state: { resident: r } })}>
                  <div className="pwa-rescard-av">
                    {r.photo_url
                      ? <img src={r.photo_url} alt="" />
                      : initials(r.first_name, r.last_name)}
                  </div>
                  <div className="pwa-rescard-info">
                    <div className="pwa-rescard-name">{name}</div>
                    <div className="pwa-rescard-biz">{r.business_name}</div>
                  </div>
                </button>
                {r.telegram ? (
                  <a className="pwa-tg" href={`https://t.me/${r.telegram}`}
                     target="_blank" rel="noreferrer">
                    Написать в телеграм
                    <span className="pwa-tg-ic"><TelegramIcon size={20} /></span>
                  </a>
                ) : (
                  <span className="pwa-tg is-disabled">
                    Телеграм не указан
                    <span className="pwa-tg-ic"><TelegramIcon size={20} /></span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PwaShell>
  );
}
