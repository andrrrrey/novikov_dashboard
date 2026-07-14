import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import Hourglass from "../components/Hourglass.jsx";
import "../components/Hourglass.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Shell logout={logout}><div className="panel dash-msg">{error}</div></Shell>;
  if (!data) return <Shell logout={logout}><div className="panel dash-msg muted">Загрузка…</div></Shell>;

  const promo = <Promo data={data} />;

  if (!data.quiz_taken) {
    return (
      <Shell logout={logout}>
        <div className="dash-grid">
          <div className="panel dash-empty">
            <h2>Пройдите короткий тест</h2>
            <p className="muted">3 вопроса, меньше минуты. По ответам мы определим ваше узкое место
              и покажем персональную рекомендацию.</p>
            <button className="btn btn-primary" onClick={() => navigate("/quiz")}>Пройти тест</button>
          </div>
          {promo}
        </div>
      </Shell>
    );
  }

  const levels = {
    management: data.management_level,
    marketing: data.marketing_level,
    sales: data.sales_level,
  };

  return (
    <Shell logout={logout}>
      <div className="dash-grid">
        <section className="panel">
          <Hourglass
            levels={levels}
            bottleneck={{ aspect: data.bottleneck_aspect, level: data.bottleneck_level }}
            hint={data.hint}
            balanced={data.balanced}
          />
          <div className="dash-retake">
            <button className="btn" onClick={() => navigate("/quiz")}>Пройти тест заново</button>
          </div>
        </section>

        <StatsPanel data={data} />

        {promo}
      </div>
    </Shell>
  );
}

// Панель показателей: Опыт, категории, Знания, Влияние.
function StatsPanel({ data }) {
  const exp = data.experience;
  return (
    <section className="panel stats">
      {exp && (
        <div className="stat-exp">
          <div className="stat-exp-head">
            <span className="stat-exp-title">Опыт</span>
            <span className="stat-exp-level">Ваш уровень: {exp.level}</span>
          </div>
          <Bar done={exp.done} total={exp.total} big />
          <div className="stat-exp-days muted">{exp.days_on_level} дн. на этом уровне</div>
        </div>
      )}

      <div className="stat-cats">
        {(data.categories || []).map((c) => (
          <div className="stat-row" key={c.aspect}>
            <div className="stat-row-head">
              <span className="stat-row-name">{c.label}</span>
              <span className="stat-row-lvl muted">Ваш уровень: {c.level}</span>
            </div>
            <Bar done={c.done} total={c.total} />
          </div>
        ))}
      </div>

      {data.knowledge && (
        <div className="stat-row">
          <div className="stat-row-head">
            <span className="stat-row-name">Знания</span>
            <span className="stat-row-lvl muted">{data.knowledge.done} из {data.knowledge.total}</span>
          </div>
          <Bar done={data.knowledge.done} total={data.knowledge.total} />
        </div>
      )}

      <div className="stat-influence">
        <span className="stat-influence-label">Влияние</span>
        <span className="stat-influence-val">{data.influence ?? 0}</span>
      </div>
    </section>
  );
}

function Bar({ done, total, big = false }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={`bar ${big ? "bar-big" : ""}`}>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-num">{done}/{total}</span>
    </div>
  );
}

// Плашка «Повышайте свой уровень». Картинку и ссылку задаёт админ.
function Promo({ data }) {
  const title = data.promo_title || "Повышайте свой уровень";
  const link = data.promo_link || undefined;
  return (
    <a className={`panel dash-promo ${link ? "" : "is-locked"}`}
       href={link}
       target={link ? "_blank" : undefined}
       rel="noreferrer">
      {data.promo_image && (
        <span className="dash-promo-cover">
          <img src={data.promo_image} alt="" loading="lazy" />
        </span>
      )}
      <span className="dash-promo-body">
        <span className="dash-promo-title">{title}</span>
        <span className="dash-promo-cta">
          {link ? "Перейти →" : "Ссылка появится позже"}
        </span>
      </span>
    </a>
  );
}

function Shell({ children, logout }) {
  return (
    <div className="dash-wrap">
      <header className="dash-topbar">
        <div className="dash-brand"><span className="login-dot" /> Клуб · кабинет резидента</div>
        <button className="btn dash-logout" onClick={logout}>Выйти</button>
      </header>
      <main className="dash-main">{children}</main>
    </div>
  );
}
