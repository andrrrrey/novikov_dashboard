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

  if (!data.quiz_taken) {
    return (
      <Shell logout={logout}>
        <div className="panel dash-empty">
          <h2>Пройдите короткий тест</h2>
          <p className="muted">3 вопроса, меньше минуты. По ответам мы определим ваше узкое место
            и покажем персональную траекторию.</p>
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

        <section className="dash-trajectory">
          <div className="dash-tr-head">
            <h2>Моя траектория</h2>
            <p className="muted">Три шага под ваше узкое место. Нажмите карточку, чтобы открыть материал.</p>
          </div>
          <div className="dash-cards">
            {data.cards.map((card) => (
              <a key={card.position}
                 className={`panel dash-card ${card.getcourse_url ? "" : "is-locked"}`}
                 href={card.getcourse_url || undefined}
                 target={card.getcourse_url ? "_blank" : undefined}
                 rel="noreferrer">
                {card.cover && (
                  <span className="dash-card-cover">
                    <img src={card.cover} alt="" loading="lazy" />
                  </span>
                )}
                <span className="dash-card-num">{card.position}</span>
                <span className="dash-card-title">{card.title}</span>
                <span className="dash-card-cta">
                  {card.getcourse_url ? "Открыть материал →" : "Ссылка появится позже"}
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </Shell>
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
