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
            overallLevel={data.overall_level}
          />
          <div className="dash-retake">
            <button className="btn" onClick={() => navigate("/quiz")}>Пройти тест заново</button>
          </div>
        </section>

        {promo}
      </div>
    </Shell>
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
