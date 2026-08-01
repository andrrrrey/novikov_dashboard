import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import HourglassV2 from "../components/HourglassV2.jsx";
import Avatar from "../components/Avatar.jsx";
import MobileNav from "../components/MobileNav.jsx";
import TopNav from "../components/TopNav.jsx";
import { ExpIcon, KnowledgeIcon, InfluenceIcon, BulbIcon, RocketIcon, HelpIcon, CheckIcon } from "../components/DashIcons.jsx";
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
  const { logout, role } = useAuth();
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Гейт онбординга: обычный резидент без заполненной анкеты → на опрос.
    // Ранее созданные пользователи (до анкеты) увидят её при следующем входе.
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

  if (error) return <Shell logout={logout} profile={profile} onPhoto={updateProfile}><div className="panel dash-msg">{error}</div></Shell>;
  if (!data) return <Shell logout={logout} profile={profile} onPhoto={updateProfile}><div className="panel dash-msg muted">Загрузка…</div></Shell>;

  if (!data.quiz_taken) {
    return (
      <Shell logout={logout} profile={profile} onPhoto={updateProfile}>
        <div className="dash-empty panel">
          <h2>Пройдите короткий тест</h2>
          <p className="muted">3 вопроса, меньше минуты. По ответам мы определим ваше узкое место
            и покажем персональную рекомендацию.</p>
          <button className="btn btn-primary" onClick={() => navigate("/quiz")}>Пройти тест</button>
        </div>
      </Shell>
    );
  }

  // Текущие уровни направлений (из прогресса) — согласованы с дорожкой уровней и уровнем бизнеса.
  const catLevels = Object.fromEntries((data.categories || []).map((c) => [c.aspect, c.level]));
  const levels = {
    management: catLevels.management ?? data.management_level ?? 1,
    marketing: catLevels.marketing ?? data.marketing_level ?? 1,
    sales: catLevels.sales ?? data.sales_level ?? 1,
  };
  // Узкое место для часов = направление с минимальным текущим уровнем
  // (приоритет — узкому месту из теста, если оно среди минимумов).
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
    <Shell logout={logout} profile={profile} onPhoto={updateProfile} hideProfile>
      <div className="ck">
        {/* Единая плашка: профиль резидента + заголовок «Состояние бизнеса» */}
        <div className="ck-head">
          <ProfileHeader profile={profile} onPhoto={updateProfile} embedded />
          <h1 className="ck-title">Состояние бизнеса</h1>
        </div>

        {/* Верхняя панель показателей — над часами */}
        <section className="ck-stats">
          {exp && (
            <div className="ck-exp-hero">
              <div className="ck-exp-top">
                <span className="ck-exp-kicker">
                  <ExpIcon color={C_EXP} size={15} />
                  <span className="ck-exp-kicker-txt">Уровень вашего бизнеса</span>
                  <InfoTip text={data.info_business} accent={C_EXP} />
                </span>
              </div>

              {/* Где пользователь сейчас и куда движется */}
              <LevelTrack level={exp.level ?? 0} max={exp.max_level ?? 0} />

              {/* Прогресс до следующего уровня: проценты + число материалов */}
              <div className="ck-xp-block">
                <div className="ck-xp-head">
                  <span className="ck-xp-cap">Прогресс до следующего уровня</span>
                  <span className="ck-xp-pct">{expPct}%</span>
                </div>
                <div className="ck-xp-track">
                  <div className="ck-xp-fill" style={{ width: `${expPct}%` }} />
                </div>
                <span className="ck-xp-num">
                  <b>{exp.done} из {exp.total}</b> материалов пройдено до следующего уровня
                </span>
              </div>

              <span className="ck-exp-days">
                Вы находитесь <b>{exp.days_on_level} {pluralDays(exp.days_on_level)}</b> на этом уровне
              </span>
            </div>
          )}

          <div className="ck-mini-row">
            <div className="ck-mini" style={{ "--ic": C_KNOW }}>
              <span className="ck-mini-ic"><KnowledgeIcon color={C_KNOW} size={20} /></span>
              <div className="ck-mini-body">
                <span className="ck-mini-top">
                  <span className="ck-mini-lbl">Знания</span>
                  <InfoTip text={data.info_knowledge} accent={C_KNOW} />
                </span>
                <span className="ck-mini-val" style={{ color: C_KNOW }}>{kn ? kn.done : 0}</span>
              </div>
            </div>
            <div className="ck-mini" style={{ "--ic": C_INFL }}>
              <span className="ck-mini-ic"><InfluenceIcon color={C_INFL} size={20} /></span>
              <div className="ck-mini-body">
                <span className="ck-mini-top">
                  <span className="ck-mini-lbl">Влияние</span>
                  <InfoTip text={data.info_influence} accent={C_INFL} />
                </span>
                <span className="ck-mini-val" style={{ color: C_INFL }}>{data.influence ?? 0}</span>
              </div>
            </div>
          </div>

          <LevelUp data={data} />
        </section>

        {/* Часы: левые подписи аспектов (единственное место уровней) + узкое место */}
        <div className="ck-viz-hg">
          <HourglassV2
            levels={levels}
            bottleneck={{ aspect: neckAspect, level: minLevel }}
            balanced={hgBalanced}
            maxLevel={exp?.max_level ?? 10}
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

function Shell({ children, logout, profile, onPhoto, hideProfile = false }) {
  return (
    <div className="dash-wrap ckv2 has-mnav">
      <header className="dash-topbar">
        <div className="dash-brand"><span className="login-dot" /> Клуб · кабинет резидента</div>
        <TopNav />
        <button className="btn dash-logout" onClick={logout}>Выйти</button>
      </header>
      <main className="ck-main">
        <div className="ck-main-inner">
          {profile && !hideProfile && <ProfileHeader profile={profile} onPhoto={onPhoto} />}
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

// Шапка профиля: аватар (клик → попап фото), имя и название бизнеса.
// embedded — профиль встроен в плашку «Состояние бизнеса» (общий фон), без своей рамки.
function ProfileHeader({ profile, onPhoto, embedded = false }) {
  const [open, setOpen] = useState(false);
  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || "Резидент";
  return (
    <div className={`ck-profile${embedded ? " is-embedded" : ""}`}>
      <button className="ck-avatar-btn" type="button" onClick={() => setOpen(true)}
              aria-label="Открыть фото профиля">
        <Avatar photoUrl={profile.photo_url} firstName={profile.first_name}
                lastName={profile.last_name} size={52} />
      </button>
      <div className="ck-profile-meta">
        <div className="ck-profile-name">{fullName}</div>
        {profile.business_name && <div className="ck-profile-biz">{profile.business_name}</div>}
      </div>
      {open && onPhoto && (
        <AvatarModal profile={profile} onPhoto={onPhoto} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

// Попап фото: крупное фото + загрузка с ПК / удаление.
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
    <div className="ph-overlay" onClick={onClose}>
      <div className="ph-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ph-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <div className="ph-photo">
          <Avatar photoUrl={profile.photo_url} firstName={profile.first_name}
                  lastName={profile.last_name} size={200} />
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="ph-actions">
          <label className={`btn btn-primary${busy ? " is-busy" : ""}`}>
            {busy ? "Загрузка…" : "Загрузить фото с ПК"}
            <input type="file" accept="image/png,image/jpeg,image/webp"
                   hidden onChange={upload} disabled={busy} />
          </label>
          {profile.photo_url && (
            <button className="btn" type="button" onClick={remove} disabled={busy}>
              Удалить фото
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Дорожка уровней 1..max. Уровень бизнеса = минимум направлений.
// Явно подписываем, на каком уровне пользователь сейчас, сколько всего уровней
// и куда он движется (стрелка от текущего уровня к следующему).
// n < level — пройден (галочка), n === level — текущий (подсветка + «вы здесь»),
// n > level — впереди (тускло).
function LevelTrack({ level, max }) {
  if (!max || max < 1) return null;
  const nums = Array.from({ length: max }, (_, i) => i + 1);
  const atMax = level >= max;
  return (
    <div className="ck-levels-block">
      <div className="ck-levels-lead">
        <span className="ck-levels-lead-txt">Ваш уровень</span>
        <span className="ck-levels-lead-val">
          <b>{level}</b><span className="ck-levels-lead-of"> из {max}</span>
        </span>
      </div>

      <div className="ck-levels" role="list" aria-label="Уровни бизнеса">
        {nums.map((n) => {
          const passed = n < level;
          const current = n === level;
          const cls = passed ? " is-passed" : current ? " is-current" : "";
          const title = passed ? `Уровень ${n} пройден`
            : current ? `Уровень ${n} — ваш текущий` : `Уровень ${n}`;
          return (
            <Fragment key={n}>
              <span role="listitem" className={`ck-lvl${cls}`} title={title}>
                {passed ? <CheckIcon size={13} color="#0b160b" /> : n}
                {current && <span className="ck-lvl-here">вы&nbsp;здесь</span>}
              </span>
              {current && !atMax && <span className="ck-lvl-arrow" aria-hidden="true">→</span>}
            </Fragment>
          );
        })}
      </div>

      <div className="ck-levels-foot">
        {atMax
          ? <span>🎉 Достигнут максимальный уровень — {max} из {max}</span>
          : <>Всего уровней — {max}. Движетесь к уровню <b>{level + 1}</b></>}
      </div>
    </div>
  );
}
