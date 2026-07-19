import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import HourglassV2 from "../components/HourglassV2.jsx";
import "../components/HourglassV2.css";
import "../styles/dashboard-v2.css";

// Цвет закреплён за аспектом (те же значения, что в песочных часах).
const ASPECT_COLORS = {
  management: "#34e39a",
  marketing: "#3b9eff",
  sales: "#a472ff",
};

// Склонение слова «день»: 1 день, 2 дня, 5 дней, 0 дней, 21 день…
function pluralDays(n) {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return "дней";
  if (d === 1) return "день";
  if (d >= 2 && d <= 4) return "дня";
  return "дней";
}

export default function DashboardV2() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Shell logout={logout}><div className="panel dash-msg">{error}</div></Shell>;
  if (!data) return <Shell logout={logout}><div className="panel dash-msg muted">Загрузка…</div></Shell>;

  if (!data.quiz_taken) {
    return (
      <Shell logout={logout}>
        <div className="dash-empty panel">
          <h2>Пройдите короткий тест</h2>
          <p className="muted">3 вопроса, меньше минуты. По ответам мы определим ваше узкое место
            и покажем персональную рекомендацию.</p>
          <button className="btn btn-primary" onClick={() => navigate("/quiz")}>Пройти тест</button>
        </div>
      </Shell>
    );
  }

  const levels = {
    management: data.management_level,
    marketing: data.marketing_level,
    sales: data.sales_level,
  };
  const cleanHint = (data.hint || "").replace(/^Узкое место:[^.]*\.\s*/, "");

  return (
    <Shell logout={logout}>
      <div className="ck">
        <div className="ck-head">
          <h1 className="ck-title">Состояние бизнеса</h1>
          <span className="ck-status"><span className="ck-status-dot" /> системы в норме</span>
        </div>

        <div className="ck-body">
          {/* Левый отсек — визуализация + рекомендация */}
          <section className="ck-panel ck-viz">
            <div className="ck-viz-hg">
              <HourglassV2
                levels={levels}
                bottleneck={{ aspect: data.bottleneck_aspect, level: data.bottleneck_level }}
                balanced={data.balanced}
              />
            </div>

            {cleanHint && (
              <div className="ck-reco">
                <span className="ck-reco-bulb">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
                  </svg>
                </span>
                <div>
                  <div className="ck-reco-title">Рекомендация</div>
                  <div className="ck-reco-text">{cleanHint}</div>
                </div>
              </div>
            )}

            <button className="btn ck-retake" onClick={() => navigate("/quiz")}>Пройти тест заново</button>
          </section>

          {/* Правый отсек — приборные показатели */}
          <section className="ck-panel ck-readout">
            <Readout data={data} />
          </section>
        </div>
      </div>
    </Shell>
  );
}

function Readout({ data }) {
  const exp = data.experience;
  const expPct = exp && exp.total > 0 ? Math.round((exp.done / exp.total) * 100) : 0;

  return (
    <>
      {exp && (
        <div className="ck-exp">
          <div className="ck-exp-head">
            <span className="ck-exp-title">Опыт</span>
            <span className="ck-exp-level">Уровень {exp.level}</span>
          </div>
          <div className="ck-exp-bar">
            <div className="ck-exp-track">
              <div className="ck-exp-fill" style={{ width: `${expPct}%` }} />
            </div>
            <span className="ck-exp-num">{exp.done}/{exp.total}</span>
          </div>
          <div className="ck-exp-days">
            {exp.days_on_level} {pluralDays(exp.days_on_level)} на этом уровне
          </div>
        </div>
      )}

      {/* Категории — только цифры, без прогресс-баров */}
      <div className="ck-tiles">
        {(data.categories || []).map((c) => {
          const color = ASPECT_COLORS[c.aspect] || "var(--green)";
          return (
            <div className="ck-tile" key={c.aspect} style={{ "--tile": color }}>
              <span className="ck-tile-name">{c.label}</span>
              <span className="ck-tile-val" style={{ color }}>{c.level}</span>
            </div>
          );
        })}
      </div>

      {/* Знания и Влияние — компактные приборы */}
      <div className="ck-mini">
        {data.knowledge && (
          <div className="ck-mini-cell">
            <span className="ck-mini-label">Знания</span>
            <span className="ck-mini-val">{data.knowledge.done}<span className="ck-mini-total"> / {data.knowledge.total}</span></span>
          </div>
        )}
        <div className="ck-mini-cell ck-mini-influence">
          <span className="ck-mini-label">Влияние</span>
          <span className="ck-mini-val ck-mini-gold">{data.influence ?? 0}</span>
        </div>
      </div>

      <Promo data={data} />
    </>
  );
}

// Промо «Повышайте свой уровень» — компактная строка-кнопка.
function Promo({ data }) {
  const title = data.promo_title || "Повышайте свой уровень";
  const link = data.promo_link || undefined;
  return (
    <a className={`ck-promo ${link ? "" : "is-locked"}`}
       href={link}
       target={link ? "_blank" : undefined}
       rel="noreferrer">
      <span className="ck-promo-title">{title}</span>
      <span className="ck-promo-cta">{link ? "Перейти →" : "Ссылка появится позже"}</span>
    </a>
  );
}

function Shell({ children, logout }) {
  return (
    <div className="dash-wrap ckv2">
      <header className="dash-topbar">
        <div className="dash-brand"><span className="login-dot" /> Клуб · кабинет резидента</div>
        <button className="btn dash-logout" onClick={logout}>Выйти</button>
      </header>
      <main className="ck-main">{children}</main>
    </div>
  );
}
