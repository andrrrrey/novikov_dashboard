import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { initials } from "../components/Avatar.jsx";
import PwaShell from "../components/PwaShell.jsx";
import PwaGraph from "../components/PwaGraph.jsx";
import {
  PlayIcon, QuestionIcon, BookIcon, BoltIcon, BulbIcon,
} from "../components/PwaIcons.jsx";

// Боевой дашборд в дизайне PWA (макет Figma node 0-403): hero-фон по уровню,
// шапка с профилем, «Уровень вашего бизнеса», метрики «Знание/Влияние»,
// песочные часы узкого места (визуал из PWA, данные — по текущей логике) и
// рекомендация. Все показатели реальные (api.dashboard / api.getProfile).

// Фоны-картинки по уровню бизнеса (1..10) — как в демо /pwa.
const LEVEL_BG = import.meta.glob("../assets/backgrounds/*.jpg", {
  eager: true, query: "?url", import: "default",
});
function bgForLevel(level) {
  const n = Math.max(1, Math.min(10, level || 1));
  return LEVEL_BG[`../assets/backgrounds/${n}.jpg`];
}

// Порядок аспектов и цвета точек — сохраняем визуал графа из /pwa.
const ORDER = ["management", "marketing", "sales"];
const ASPECT = {
  management: { label: "Менеджмент", color: "#b4f1ec" },
  marketing:  { label: "Маркетинг",  color: "#70d8bd" },
  sales:      { label: "Продажи",    color: "#7779ff" },
};

// Склонение слова «день»: 1 день, 2 дня, 5 дней…
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

  const exp = data?.experience;
  const heroLevel = exp?.level ?? 1;

  if (error) {
    return (
      <Frame profile={profile} logout={logout} onPhoto={updateProfile} heroLevel={heroLevel}>
        <div className="pwa-state is-error">{error}</div>
      </Frame>
    );
  }
  if (!data || !profile) {
    return (
      <Frame profile={profile} logout={logout} onPhoto={updateProfile} heroLevel={heroLevel}>
        <div className="pwa-state">Загрузка…</div>
      </Frame>
    );
  }

  if (!data.quiz_taken) {
    return (
      <Frame profile={profile} logout={logout} onPhoto={updateProfile} heroLevel={heroLevel}>
        <div className="pwa-state">
          <h2>Пройдите короткий тест</h2>
          <p>3 вопроса, меньше минуты. По ответам мы определим ваше узкое место
            и покажем персональную рекомендацию.</p>
          <button type="button" className="pwa-cta" style={{ marginTop: 18 }}
                  onClick={() => navigate("/quiz")}>
            <span>Пройти тест</span>
            <PlayIcon size={20} color="#0c1c08" />
          </button>
        </div>
      </Frame>
    );
  }

  // Текущие уровни направлений — как на исходном дашборде V2.
  const catLevels = Object.fromEntries((data.categories || []).map((c) => [c.aspect, c.level]));
  const levels = {
    management: catLevels.management ?? data.management_level ?? 1,
    marketing: catLevels.marketing ?? data.marketing_level ?? 1,
    sales: catLevels.sales ?? data.sales_level ?? 1,
  };
  // Узкое место = направление с минимальным уровнем (приоритет — узкому месту из теста).
  const minLevel = Math.min(levels.management, levels.marketing, levels.sales);
  const neckAspect = [data.bottleneck_aspect, "management", "marketing", "sales"]
    .find((a) => a && levels[a] === minLevel);
  const balanced = data.balanced
    || (levels.management === levels.marketing && levels.marketing === levels.sales);

  // Раскладка слотов часов: узкое место — в горлышке, два других — сверху/снизу.
  const placement = balanced
    ? { top: ORDER[0], neck: ORDER[1], bottom: ORDER[2] }
    : (() => {
        const rest = ORDER.filter((a) => a !== neckAspect);
        return { top: rest[0], neck: neckAspect, bottom: rest[1] };
      })();
  const slot = (key) => ({ ...ASPECT[placement[key]], level: levels[placement[key]] });
  const top = slot("top"), neck = slot("neck"), bottom = slot("bottom");

  const cleanHint = (data.hint || "").replace(/^Узкое место:[^.]*\.\s*/, "");
  const kn = data.knowledge;
  const expPct = exp && exp.total > 0 ? Math.min(100, Math.round((exp.done / exp.total) * 100)) : 0;

  return (
    <Frame profile={profile} logout={logout} onPhoto={updateProfile} heroLevel={heroLevel}
           cta={data.promo_title || "Запустить траекторию развития"} ctaHref={data.promo_link || null}>
      <div className="pwa-stack">
        {/* Уровень вашего бизнеса */}
        {exp && (
          <section className="pwa-level">
            <div className="pwa-card-head">
              <span className="pwa-card-title">Уровень вашего бизнеса</span>
              <PwaInfoTip text={data.info_business} size={20} />
            </div>
            <div className="pwa-level-body">
              <div className="pwa-level-top">
                <div className="pwa-level-num">
                  <b>{exp.level}</b><i>/{exp.max_level}</i>
                </div>
                <div className="pwa-level-days">
                  Вы находитесь <b>{exp.days_on_level} {pluralDays(exp.days_on_level)}</b> на этом уровне
                </div>
              </div>
              <div className="pwa-level-prog">
                <div className="pwa-progress">
                  <div className="pwa-progress-fill" style={{ width: `${expPct}%` }} />
                  <span className="pwa-progress-pct">{expPct}%</span>
                </div>
                <div className="pwa-progress-cap">
                  <b>{exp.done} из {exp.total}</b><span>материалов пройдено до следующего уровня</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Знание / Влияние */}
        <div className="pwa-metrics">
          <div className="pwa-metric">
            <span className="q"><PwaInfoTip text={data.info_knowledge} size={15} /></span>
            <span className="pwa-metric-ic"><BookIcon size={24} /></span>
            <div className="pwa-metric-txt">
              <span className="pwa-metric-val">{kn ? kn.done : 0}</span>
              <span className="pwa-metric-lbl">Знание</span>
            </div>
          </div>
          <div className="pwa-metric">
            <span className="q"><PwaInfoTip text={data.info_influence} size={15} /></span>
            <span className="pwa-metric-ic"><BoltIcon size={24} /></span>
            <div className="pwa-metric-txt">
              <span className="pwa-metric-val">{data.influence ?? 0}</span>
              <span className="pwa-metric-lbl">Влияние</span>
            </div>
          </div>
        </div>

        {/* Песочные часы узкого места: визуал из PWA, раскладка — по данным */}
        <section className="pwa-graph">
          <PwaGraph />
          <div className="pwa-graph-lbl" style={{ left: "50%", top: "24px" }}>
            <div className="pwa-cat">
              <span className="dot" style={{ background: top.color }} />
              <span>{top.label}</span>
            </div>
            <div className="pwa-cat-lvl">уровень: {top.level}</div>
          </div>
          <div className="pwa-graph-neck" style={{ left: "22.4%", top: "134px" }}>
            {!balanced && <span className="pwa-neck-title">Узкое место</span>}
            <div className="pwa-cat">
              <span className="dot" style={{ background: neck.color }} />
              <span>{neck.label}</span>
            </div>
          </div>
          <div className="pwa-graph-lvl4" style={{ left: "59.6%", top: "165px" }}>уровень: {neck.level}</div>
          <div className="pwa-graph-lbl" style={{ left: "50%", top: "231px" }}>
            <div className="pwa-cat">
              <span className="dot" style={{ background: bottom.color }} />
              <span>{bottom.label}</span>
            </div>
            <div className="pwa-cat-lvl">уровень: {bottom.level}</div>
          </div>
        </section>

        {/* Рекомендация */}
        {cleanHint && (
          <section className="pwa-reco">
            <div className="pwa-reco-head">
              <BulbIcon size={20} color="#6ddd51" />
              <span>Рекомендация</span>
            </div>
            <p className="pwa-reco-text">{cleanHint}</p>
          </section>
        )}

        {/* Пройти тест заново */}
        <button type="button" className="pwa-retake" onClick={() => navigate("/quiz")}>
          Пройти тест заново
        </button>
      </div>
    </Frame>
  );
}

// Оболочка дашборда: PwaShell + шапка (Смотреть · профиль · Выйти).
function Frame({ children, profile, logout, onPhoto, heroLevel, cta = null, ctaHref = null }) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const name = profile?.first_name || "Резидент";
  return (
    <PwaShell cta={cta} heroImage={bgForLevel(heroLevel)} ctaHref={ctaHref}
              dashHref="/" resHref="/residents">
      <header className="pwa-header">
        <div className="side left">
          <button type="button" className="pwa-pill" onClick={() => profile && setPhotoOpen(true)}>
            Смотреть
            <PlayIcon size={15} color="#fff" />
          </button>
        </div>
        <div className="pwa-profile">
          <button type="button" className="pwa-avatar"
                  onClick={() => profile && setPhotoOpen(true)} aria-label="Фото профиля">
            {profile?.photo_url
              ? <img src={profile.photo_url} alt="" />
              : initials(profile?.first_name, profile?.last_name)}
          </button>
          <div className="pwa-name">{name}</div>
          {profile?.business_name && <div className="pwa-biz">{profile.business_name}</div>}
        </div>
        <div className="side right">
          <button type="button" className="pwa-pill muted" onClick={logout}>Выйти</button>
        </div>
      </header>

      {children}

      {photoOpen && profile && onPhoto && (
        <AvatarModal profile={profile} onPhoto={onPhoto} onClose={() => setPhotoOpen(false)} />
      )}
    </PwaShell>
  );
}

// Кнопка «?»: по клику показывает попап с описанием показателя (текст из админки).
// Попап позиционируется fixed по координатам кнопки, чтобы не обрезался карточкой.
function PwaInfoTip({ text, size = 20 }) {
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

  if (!text) return <QuestionIcon size={size} bg="#1b1b1b" />;

  return (
    <>
      <button ref={btnRef} type="button" className="pwa-tipbtn"
              aria-label="Подробнее о показателе" aria-expanded={open} onClick={toggle}>
        <QuestionIcon size={size} bg="#1b1b1b" />
      </button>
      {open && coords && (
        <div className="pwa-tip-pop" role="tooltip"
             style={{ top: coords.top, left: coords.left, width: coords.width }}>
          {text}
        </div>
      )}
    </>
  );
}

// Попап фото профиля: крупное фото + загрузка с ПК / удаление.
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
    <div className="pwa-ph-overlay" onClick={onClose}>
      <div className="pwa-ph-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pwa-ph-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <div className="pwa-ph-photo">
          {profile.photo_url
            ? <img src={profile.photo_url} alt="" />
            : initials(profile.first_name, profile.last_name)}
        </div>
        {error && <div className="pwa-ph-err">{error}</div>}
        <div className="pwa-ph-actions">
          <label className={`pwa-ph-btn primary${busy ? " is-busy" : ""}`}>
            {busy ? "Загрузка…" : "Загрузить фото с ПК"}
            <input type="file" accept="image/png,image/jpeg,image/webp"
                   hidden onChange={upload} disabled={busy} />
          </label>
          {profile.photo_url && (
            <button className="pwa-ph-btn ghost" type="button" onClick={remove} disabled={busy}>
              Удалить фото
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
