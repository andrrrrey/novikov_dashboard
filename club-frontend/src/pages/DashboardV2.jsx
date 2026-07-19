import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import HourglassV2 from "../components/HourglassV2.jsx";
import { ExpIcon, KnowledgeIcon, InfluenceIcon, BulbIcon } from "../components/DashIcons.jsx";
import "../components/HourglassV2.css";
import "../styles/dashboard-v2.css";

// Цвета показателей верхней панели (в пределах палитры темы).
const C_EXP = "#6cde52";   // --green
const C_KNOW = "#3b9eff";  // синий аспекта
const C_INFL = "#e7b24c";  // --gold

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
  const exp = data.experience;
  const kn = data.knowledge;

  return (
    <Shell logout={logout}>
      <div className="ck">
        <div className="ck-head">
          <h1 className="ck-title">Состояние бизнеса</h1>
        </div>

        {/* Верхняя панель показателей — над часами */}
        <section className="ck-stats">
          {exp && (
            <div className="ck-exp-hero">
              <span className="ck-exp-badge"><ExpIcon color={C_EXP} size={26} /></span>
              <div className="ck-exp-main">
                <span className="ck-exp-level">{exp.level}</span>
                <span className="ck-exp-kicker">Уровень опыта</span>
              </div>
              <span className="ck-exp-days">
                <b>{exp.days_on_level} {pluralDays(exp.days_on_level)}</b>
                на этом уровне
              </span>
            </div>
          )}

          <div className="ck-mini-row">
            <div className="ck-mini" style={{ "--ic": C_KNOW }}>
              <span className="ck-mini-ic"><KnowledgeIcon color={C_KNOW} size={20} /></span>
              <span className="ck-mini-lbl">Знания</span>
              <span className="ck-mini-val" style={{ color: C_KNOW }}>
                {kn ? kn.done : 0}<span className="ck-mini-sub">/{kn ? kn.total : 0}</span>
              </span>
            </div>
            <div className="ck-mini" style={{ "--ic": C_INFL }}>
              <span className="ck-mini-ic"><InfluenceIcon color={C_INFL} size={20} /></span>
              <span className="ck-mini-lbl">Влияние</span>
              <span className="ck-mini-val" style={{ color: C_INFL }}>{data.influence ?? 0}</span>
            </div>
          </div>
        </section>

        {/* Часы: левые подписи аспектов (единственное место уровней) + узкое место */}
        <div className="ck-viz-hg">
          <HourglassV2
            levels={levels}
            bottleneck={{ aspect: data.bottleneck_aspect, level: data.bottleneck_level }}
            balanced={data.balanced}
          />
        </div>

        {cleanHint && (
          <div className="ck-reco">
            <span className="ck-reco-bulb"><BulbIcon color="var(--green)" size={22} /></span>
            <div>
              <div className="ck-reco-title">Рекомендация</div>
              <div className="ck-reco-text">{cleanHint}</div>
            </div>
          </div>
        )}

        <div className="ck-actions">
          <button className="btn ck-retake" onClick={() => navigate("/quiz")}>Пройти тест заново</button>
          <Promo data={data} />
        </div>
      </div>
    </Shell>
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
