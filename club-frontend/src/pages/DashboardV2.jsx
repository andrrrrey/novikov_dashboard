import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import HourglassV2 from "../components/HourglassV2.jsx";
import { ExpIcon, KnowledgeIcon, InfluenceIcon, BulbIcon, RocketIcon, HelpIcon } from "../components/DashIcons.jsx";
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
  const expPct = exp && exp.total > 0 ? Math.min(100, Math.round((exp.done / exp.total) * 100)) : 0;

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
              <LevelBadge level={exp.level} />
              <div className="ck-exp-main">
                <span className="ck-exp-kicker">
                  <ExpIcon color={C_EXP} size={15} />
                  <span className="ck-exp-kicker-txt">Уровень вашего бизнеса</span>
                  <InfoTip text={data.info_business} accent={C_EXP} />
                </span>
                <div className="ck-xp">
                  <div className="ck-xp-track">
                    <div className="ck-xp-fill" style={{ width: `${expPct}%` }} />
                  </div>
                  <span className="ck-xp-num">{exp.done} / {exp.total}</span>
                </div>
                <span className="ck-xp-cap">материалов пройдено до следующего уровня</span>
                <span className="ck-exp-days">
                  Вы находитесь <b>{exp.days_on_level} {pluralDays(exp.days_on_level)}</b> на этом уровне
                </span>
              </div>
            </div>
          )}

          <div className="ck-mini-row">
            <div className="ck-mini" style={{ "--ic": C_KNOW }}>
              <span className="ck-mini-ic"><KnowledgeIcon color={C_KNOW} size={20} /></span>
              <span className="ck-mini-lbl">Знания</span>
              <InfoTip text={data.info_knowledge} accent={C_KNOW} />
              <span className="ck-mini-val" style={{ color: C_KNOW }}>
                {kn ? kn.done : 0}
              </span>
            </div>
            <div className="ck-mini" style={{ "--ic": C_INFL }}>
              <span className="ck-mini-ic"><InfluenceIcon color={C_INFL} size={20} /></span>
              <span className="ck-mini-lbl">Влияние</span>
              <InfoTip text={data.info_influence} accent={C_INFL} />
              <span className="ck-mini-val" style={{ color: C_INFL }}>{data.influence ?? 0}</span>
            </div>
          </div>

          <LevelUp data={data} />
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
        </div>
      </div>
    </Shell>
  );
}

// Эмблема уровня бизнеса: гранёный гекса-щит с номером уровня внутри.
function LevelBadge({ level }) {
  return (
    <div className="ck-exp-badge">
      <svg viewBox="0 0 56 56" className="ck-exp-badge-svg" aria-hidden="true">
        <defs>
          <linearGradient id="ckBadgeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(108,222,82,0.28)" />
            <stop offset="1" stopColor="rgba(108,222,82,0.06)" />
          </linearGradient>
        </defs>
        {/* Шестигранник-щит */}
        <path className="ck-exp-badge-shape"
              d="M28 3.5 48.5 15v26L28 52.5 7.5 41V15z"
              fill="url(#ckBadgeFill)" />
        {/* Внутренняя грань для «объёма» */}
        <path className="ck-exp-badge-facet"
              d="M28 9 43 17.6v20.8L28 47 13 38.4V17.6z" />
      </svg>
      <span className="ck-exp-badge-num">{level}</span>
    </div>
  );
}

// Кнопка «?» рядом с показателем: по клику показывает попап с описанием.
// Попап позиционируется fixed по координатам кнопки — чтобы не обрезался
// родителями с overflow: hidden (например, плашкой «Уровень вашего бизнеса»).
function InfoTip({ text, accent }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current.getBoundingClientRect();
    const W = Math.min(260, window.innerWidth - 24);
    const centerX = r.left + r.width / 2;
    const left = Math.max(8 + W / 2, Math.min(centerX, window.innerWidth - 8 - W / 2));
    setCoords({ top: r.bottom + 8, left, width: W });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDoc = (e) => { if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (!text) return null;

  return (
    <>
      <button ref={btnRef} type="button" className={`ck-tip${open ? " is-open" : ""}`}
              aria-label="Подробнее о показателе" aria-expanded={open} onClick={toggle}>
        <HelpIcon size={15} />
      </button>
      {open && coords && (
        <div className="ck-tip-pop" role="tooltip"
             style={{ top: coords.top, left: coords.left, width: coords.width,
                      "--tip-accent": accent || "var(--green)" }}>
          {text}
        </div>
      )}
    </>
  );
}

// Бейдж «Запустить траекторию развития» — яркий CTA под плашками показателей.
// Ссылку задаёт админ; при её отсутствии бейдж некликабельный, но выглядит так же.
function LevelUp({ data }) {
  const title = data.promo_title || "Запустить траекторию развития";
  const link = data.promo_link || undefined;
  const inner = (
    <>
      <span className="ck-levelup-ic"><RocketIcon size={22} /></span>
      <span className="ck-levelup-title">{title}</span>
      <span className="ck-levelup-arrow" aria-hidden="true">→</span>
    </>
  );
  if (link) {
    return (
      <a className="ck-levelup" href={link} target="_blank" rel="noreferrer">{inner}</a>
    );
  }
  return <div className="ck-levelup is-static">{inner}</div>;
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
