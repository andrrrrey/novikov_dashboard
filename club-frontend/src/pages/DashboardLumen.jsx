import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import TrajectoryLumen from "../components/TrajectoryLumen.jsx";
import LumenAvatar from "../components/LumenAvatar.jsx";
import { LumenTopNav, LumenMobileNav } from "../components/LumenNav.jsx";
import {
  ExpIcon, KnowledgeIcon, InfluenceIcon, BulbIcon, RocketIcon, HelpIcon, CheckIcon,
} from "../components/DashIcons.jsx";
import "../styles/lumen.css";

// Семантические акценты (точечно, не заливают карточку).
const C_KNOW = "#46d6e6";  // Знания — холодный cyan
const C_INFL = "#e7b24c";  // Влияние — тёплый amber

function pluralDays(n) {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return "дней";
  if (d === 1) return "день";
  if (d >= 2 && d <= 4) return "дня";
  return "дней";
}

// Демо-редизайн дашборда (дизайн-система Lumen). Логика и данные — те же, что в
// DashboardV2: гейты онбординга/теста, показатели, траектория, рекомендация.
export default function DashboardLumen() {
  const navigate = useNavigate();
  const { logout, role } = useAuth();
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProfile().then((p) => {
      if (role !== "admin" && !p.completed) {
        navigate("/onboarding", { replace: true });
        return;
      }
      setProfile(p);
      api.dashboard().then(setData).catch((e) => setError(e.message));
    }).catch((e) => setError(e.message));
  }, []);

  function updateProfile(patch) {
    return api.saveProfile({
      first_name: profile.first_name, last_name: profile.last_name,
      business_name: profile.business_name, business_field: profile.business_field,
      birth_date: profile.birth_date, telegram: profile.telegram || "", ...patch,
    }).then(setProfile);
  }

  if (error) return <Shell logout={logout}><div className="lm-card lm-msg">{error}</div></Shell>;
  if (!data) return <Shell logout={logout}><div className="lm-card lm-msg">Загрузка…</div></Shell>;

  if (!data.quiz_taken) {
    return (
      <Shell logout={logout}>
        <div className="lm-card lm-empty">
          <h2>Пройдите короткий тест</h2>
          <p>3 вопроса, меньше минуты. По ответам мы определим ваше узкое место
            и покажем персональную рекомендацию.</p>
          <button className="lm-btn lm-btn-primary" onClick={() => navigate("/quiz")}>Пройти тест</button>
        </div>
      </Shell>
    );
  }

  const catLevels = Object.fromEntries((data.categories || []).map((c) => [c.aspect, c.level]));
  const levels = {
    management: catLevels.management ?? data.management_level ?? 1,
    marketing: catLevels.marketing ?? data.marketing_level ?? 1,
    sales: catLevels.sales ?? data.sales_level ?? 1,
  };
  const minLevel = Math.min(levels.management, levels.marketing, levels.sales);
  const neckAspect = [data.bottleneck_aspect, "management", "marketing", "sales"]
    .find((a) => a && levels[a] === minLevel);
  const hgBalanced =
    levels.management === levels.marketing && levels.marketing === levels.sales;
  const cleanHint = (data.hint || "").replace(/^Узкое место:[^.]*\.\s*/, "");
  const exp = data.experience;
  const kn = data.knowledge;
  const expPct = exp && exp.total > 0 ? Math.min(100, Math.round((exp.done / exp.total) * 100)) : 0;

  return (
    <Shell logout={logout}>
      <div className="lm-stack">
        {/* Шапка раздела: профиль + заголовок */}
        <div className="lm-page-head">
          <ProfileHeader profile={profile} onPhoto={updateProfile} />
          <div style={{ height: 6 }} />
          <span className="lm-eyebrow">Кабинет резидента</span>
          <h1 className="lm-h1">Состояние бизнеса</h1>
        </div>

        {/* HERO — уровень бизнеса */}
        {exp && (
          <section className="lm-hero">
            <div className="lm-hero-top">
              <ExpIcon color="#69ff4f" size={15} />
              <span className="lm-hero-top-txt">Уровень вашего бизнеса</span>
              <InfoTip text={data.info_business} accent="#69ff4f" />
            </div>

            <div className="lm-level-row">
              <div className="lm-level-badge">
                <span className="lm-level-badge-num">{exp.level ?? 0}</span>
                <span className="lm-level-badge-cap">уровень</span>
              </div>
              <div className="lm-level-info">
                <div className="lm-level-of">
                  <b>{exp.level ?? 0}</b> из {exp.max_level ?? 0} уровней
                </div>
                <div className="lm-level-days">
                  Вы находитесь <b>{exp.days_on_level} {pluralDays(exp.days_on_level)}</b> на этом уровне
                </div>
              </div>
            </div>

            <LevelTrack level={exp.level ?? 0} max={exp.max_level ?? 0} />

            <div className="lm-xp">
              <div className="lm-xp-head">
                <span className="lm-xp-cap">Прогресс до следующего уровня</span>
                <span className="lm-xp-pct">{expPct}%</span>
              </div>
              <div className="lm-progress">
                <div className="lm-progress-fill" style={{ width: `${expPct}%` }} />
              </div>
              <div className="lm-xp-num">
                <b>{exp.done} из {exp.total}</b> материалов пройдено до следующего уровня
              </div>
            </div>
          </section>
        )}

        {/* Знания / Влияние */}
        <div className="lm-metrics">
          <div className="lm-metric" style={{ "--ac": C_KNOW }}>
            <span className="lm-metric-ic"><KnowledgeIcon color={C_KNOW} size={20} /></span>
            <div className="lm-metric-body">
              <span className="lm-metric-top">
                <span className="lm-metric-lbl">Знания</span>
                <InfoTip text={data.info_knowledge} accent={C_KNOW} />
              </span>
              <span className="lm-metric-val">{kn ? kn.done : 0}</span>
            </div>
          </div>
          <div className="lm-metric" style={{ "--ac": C_INFL }}>
            <span className="lm-metric-ic"><InfluenceIcon color={C_INFL} size={20} /></span>
            <div className="lm-metric-body">
              <span className="lm-metric-top">
                <span className="lm-metric-lbl">Влияние</span>
                <InfoTip text={data.info_influence} accent={C_INFL} />
              </span>
              <span className="lm-metric-val">{data.influence ?? 0}</span>
            </div>
          </div>
        </div>

        {/* CTA — запустить траекторию развития */}
        <LevelUp data={data} />

        {/* Траектория развития (viz) */}
        <section className="lm-viz">
          <TrajectoryLumen
            levels={levels}
            bottleneck={{ aspect: neckAspect, level: minLevel }}
            balanced={hgBalanced}
            maxLevel={exp?.max_level ?? 10}
          />
        </section>

        {/* Рекомендация — Insight Card */}
        {cleanHint && (
          <div className="lm-insight">
            <span className="lm-insight-ic"><BulbIcon color="#69ff4f" size={22} /></span>
            <div className="lm-insight-body">
              <div className="lm-insight-eyebrow">Рекомендация</div>
              <div className="lm-insight-text">{cleanHint}</div>
            </div>
          </div>
        )}

        <div className="lm-actions">
          <button className="lm-btn lm-btn-ghost" onClick={() => navigate("/quiz")}>Пройти тест заново</button>
        </div>
      </div>
    </Shell>
  );
}

// Попап-подсказка «?» рядом с показателем.
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
      <button ref={btnRef} type="button" className={`lm-tip${open ? " is-open" : ""}`}
              aria-label="Подробнее о показателе" aria-expanded={open} onClick={toggle}>
        <HelpIcon size={15} />
      </button>
      {open && coords && (
        <div className="lm-tip-pop" role="tooltip"
             style={{ top: coords.top, left: coords.left, width: coords.width,
                      "--tip-ac": accent || "#69ff4f" }}>
          {text}
        </div>
      )}
    </>
  );
}

// CTA «Запустить траекторию развития».
function LevelUp({ data }) {
  const title = data.promo_title || "Запустить траекторию развития";
  const link = data.promo_link || undefined;
  const inner = (
    <>
      <span className="lm-cta-ic"><RocketIcon size={22} /></span>
      <span className="lm-cta-body">
        <span className="lm-cta-title">{title}</span>
        <span className="lm-cta-sub">Персональный маршрут роста по вашему узкому месту</span>
      </span>
      <span className="lm-cta-arrow" aria-hidden="true">→</span>
    </>
  );
  if (link) {
    return <a className="lm-cta" href={link} target="_blank" rel="noreferrer">{inner}</a>;
  }
  return <div className="lm-cta is-static">{inner}</div>;
}

function Shell({ children, logout }) {
  return (
    <div className="lumen lm-app">
      <header className="lm-topbar">
        <div className="lm-brand">
          <span className="lm-brand-mark">N</span>
          <span><b>Новиков</b> Club</span>
          <span className="lm-brand-sub">· кабинет резидента</span>
        </div>
        <LumenTopNav />
        <button className="lm-btn lm-btn-ghost" onClick={logout}>Выйти</button>
      </header>
      <main className="lm-main">{children}</main>
      <LumenMobileNav />
    </div>
  );
}

// Шапка профиля резидента (аватар → попап фото, имя, бизнес).
function ProfileHeader({ profile, onPhoto }) {
  const [open, setOpen] = useState(false);
  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || "Резидент";
  return (
    <div className="lm-profile">
      <button className="lm-profile-btn" type="button" onClick={() => setOpen(true)}
              aria-label="Открыть фото профиля">
        <LumenAvatar photoUrl={profile.photo_url} firstName={profile.first_name}
                     lastName={profile.last_name} size={54} ring />
      </button>
      <div className="lm-profile-meta">
        <div className="lm-profile-name">{fullName}</div>
        {profile.business_name && <div className="lm-profile-biz">{profile.business_name}</div>}
      </div>
      {open && onPhoto && (
        <AvatarModal profile={profile} onPhoto={onPhoto} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

// Попап фото профиля.
function AvatarModal({ profile, onPhoto, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { url } = await api.uploadMyPhoto(file);
      await onPhoto({ photo_url: url });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      await onPhoto({ photo_url: null });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="lm-ph-overlay" onClick={onClose}>
      <div className="lm-ph-modal" onClick={(e) => e.stopPropagation()}>
        <button className="lm-ph-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <div className="lm-ph-photo">
          <LumenAvatar photoUrl={profile.photo_url} firstName={profile.first_name}
                       lastName={profile.last_name} size={200} ring />
        </div>
        {error && <div className="lm-error">{error}</div>}
        <div className="lm-ph-actions">
          <label className={`lm-btn lm-btn-primary${busy ? " is-busy" : ""}`}>
            {busy ? "Загрузка…" : "Загрузить фото с ПК"}
            <input type="file" accept="image/png,image/jpeg,image/webp"
                   hidden onChange={upload} disabled={busy} />
          </label>
          {profile.photo_url && (
            <button className="lm-btn" type="button" onClick={remove} disabled={busy}>
              Удалить фото
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Дорожка уровней 1..max.
function LevelTrack({ level, max }) {
  if (!max || max < 1) return null;
  const nums = Array.from({ length: max }, (_, i) => i + 1);
  const atMax = level >= max;
  return (
    <div className="lm-track">
      <div className="lm-track-line" role="list" aria-label="Уровни бизнеса">
        {nums.map((n) => {
          const passed = n < level;
          const current = n === level;
          const cls = passed ? " is-passed" : current ? " is-current" : "";
          const title = passed ? `Уровень ${n} пройден`
            : current ? `Уровень ${n} — ваш текущий` : `Уровень ${n}`;
          return (
            <Fragment key={n}>
              <span role="listitem" className={`lm-lvl${cls}`} title={title}>
                {passed ? <CheckIcon size={13} color="#041206" /> : n}
                {current && <span className="lm-lvl-here">вы&nbsp;здесь</span>}
              </span>
              {current && !atMax && <span className="lm-lvl-arrow" aria-hidden="true">→</span>}
            </Fragment>
          );
        })}
      </div>
      <div className="lm-track-foot">
        {atMax
          ? <span>🎉 Достигнут максимальный уровень — {max} из {max}</span>
          : <>Всего уровней — {max}. Движетесь к уровню <b>{level + 1}</b></>}
      </div>
    </div>
  );
}
