import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { initials } from "../components/Avatar.jsx";
import PwaShell from "../components/PwaShell.jsx";
import PwaGraph from "../components/PwaGraph.jsx";
import {
  PlayIcon, QuestionIcon, BookIcon, BoltIcon, BulbIcon, PencilIcon, MoveIcon,
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
      birth_date: profile.birth_date, birth_time: profile.birth_time || null,
      birth_city: profile.birth_city || null, photo_url: profile.photo_url || null,
      photo_pos: profile.photo_pos || "50% 50%", telegram: profile.telegram || "",
      ...patch,
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

  // Раскладка слотов часов: узкое место — всегда в горлышке (даже при равных
  // уровнях узкое место определяется приоритетом Продажи→Маркетинг→Менеджмент),
  // два других направления — сверху и снизу.
  const rest = ORDER.filter((a) => a !== neckAspect);
  const placement = { top: rest[0], neck: neckAspect, bottom: rest[1] };
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

        {/* Песочные часы узкого места: визуал из PWA, форма и раскладка — по данным
            (ширина чаш кодирует уровни, ширина горлышка — узкое место). */}
        <section className="pwa-graph">
          <PwaGraph levels={levels} placement={placement} balanced={balanced} />
          <div className="pwa-graph-lbl" style={{ left: "50%", top: "24px" }}>
            <div className="pwa-cat">
              <span className="dot" style={{ background: top.color }} />
              <span>{top.label}</span>
            </div>
            <div className="pwa-cat-lvl">уровень: {top.level}</div>
          </div>
          <div className="pwa-graph-neck" style={{ left: "22.4%", top: "134px" }}>
            <span className="pwa-neck-title">Узкое место</span>
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
  const [editOpen, setEditOpen] = useState(false);
  const name = profile?.first_name || "Резидент";
  const hasPhoto = !!profile?.photo_url;
  return (
    <PwaShell cta={cta} heroImage={bgForLevel(heroLevel)} ctaHref={ctaHref}
              dashHref="/" resHref="/residents">
      <header className="pwa-header">
        <div className="side left" />
        <div className="pwa-profile">
          <button type="button" className={`pwa-avatar${hasPhoto ? " has-photo" : ""}`}
                  onClick={() => profile && setPhotoOpen(true)} aria-label="Фото профиля">
            {hasPhoto
              ? <img src={profile.photo_url} alt=""
                     style={{ objectPosition: profile.photo_pos || "50% 50%" }} />
              : initials(profile?.first_name, profile?.last_name)}
          </button>
          <div className="pwa-name-row">
            <div className="pwa-name">{name}</div>
            {profile && (
              <button type="button" className="pwa-name-edit"
                      onClick={() => setEditOpen(true)} aria-label="Редактировать анкету">
                <PencilIcon size={15} color="#9a9a9a" />
              </button>
            )}
          </div>
          {profile?.business_name && <div className="pwa-biz">{profile.business_name}</div>}
          <button type="button" className="pwa-watch" onClick={() => profile && setPhotoOpen(true)}>
            Смотреть
            <PlayIcon size={16} color="#6ddd51" />
          </button>
        </div>
        <div className="side right">
          <button type="button" className="pwa-pill muted" onClick={logout}>Выйти</button>
        </div>
      </header>

      {children}

      {photoOpen && profile && onPhoto && (
        <AvatarModal profile={profile} onPhoto={onPhoto} onClose={() => setPhotoOpen(false)} />
      )}
      {editOpen && profile && onPhoto && (
        <ProfileEditModal profile={profile} onSave={onPhoto} onClose={() => setEditOpen(false)} />
      )}
    </PwaShell>
  );
}

// Кнопка «?»: по клику показывает попап с описанием показателя (текст из админки).
// Попап позиционируется fixed по координатам кнопки и всегда удерживается в
// пределах экрана: по горизонтали центр зажимается к краям, по вертикали —
// раскрывается вниз, а если не помещается, разворачивается вверх или ограничивается
// по высоте со скроллом (важно на маленьких мобильных экранах).
const TIP_MARGIN = 10;
function PwaInfoTip({ text, size = 20 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !popRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const W = Math.min(280, vw - 2 * TIP_MARGIN);
    const centerX = r.left + r.width / 2;
    const left = Math.max(TIP_MARGIN + W / 2, Math.min(centerX, vw - TIP_MARGIN - W / 2));

    const ph = popRef.current.offsetHeight;
    const gap = 8;
    const belowTop = r.bottom + gap;
    const spaceBelow = vh - TIP_MARGIN - belowTop;
    let top, maxHeight;
    if (ph <= spaceBelow) {
      top = belowTop; maxHeight = spaceBelow;                 // помещается снизу
    } else {
      const aboveBottom = r.top - gap;                        // пробуем сверху
      const spaceAbove = aboveBottom - TIP_MARGIN;
      if (ph <= spaceAbove) {
        top = aboveBottom - ph; maxHeight = spaceAbove;
      } else if (spaceBelow >= spaceAbove) {
        top = belowTop; maxHeight = spaceBelow;                // скролл снизу
      } else {
        top = TIP_MARGIN; maxHeight = spaceAbove;              // скролл сверху
      }
    }
    setPos({ top, left, width: W, maxHeight });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDoc = (e) => {
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      if (popRef.current && popRef.current.contains(e.target)) return;
      setOpen(false);
    };
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

  function toggle() {
    if (open) { setOpen(false); return; }
    setPos(null);
    setOpen(true);
  }

  if (!text) return <QuestionIcon size={size} bg="#1b1b1b" />;

  return (
    <>
      <button ref={btnRef} type="button" className="pwa-tipbtn"
              aria-label="Подробнее о показателе" aria-expanded={open} onClick={toggle}>
        <QuestionIcon size={size} bg="#1b1b1b" />
      </button>
      {open && (
        <div ref={popRef} className="pwa-tip-pop" role="tooltip"
             style={pos
               ? { top: pos.top, left: pos.left, width: pos.width,
                   maxHeight: pos.maxHeight, overflowY: "auto" }
               : { top: -9999, left: 0, width: Math.min(280, window.innerWidth - 2 * TIP_MARGIN),
                   visibility: "hidden" }}>
          {text}
        </div>
      )}
    </>
  );
}

// "50% 50%" → {x:50, y:50}
function parsePos(pos) {
  const m = /(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/.exec(pos || "");
  return m ? { x: +m[1], y: +m[2] } : { x: 50, y: 50 };
}
const clampPct = (n) => Math.max(0, Math.min(100, n));

// Попап фото профиля: крупное фото, загрузка с ПК и режим «изменить положение».
function AvatarModal({ profile, onPhoto, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reposition, setReposition] = useState(false);
  const [pos, setPos] = useState(() => parsePos(profile.photo_pos));
  const drag = useRef(null);
  const hasPhoto = !!profile.photo_url;

  async function upload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { url } = await api.uploadMyPhoto(file);
      // Новое фото — центрируем заново.
      await onPhoto({ photo_url: url, photo_pos: "50% 50%" });
      setPos({ x: 50, y: 50 });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Перетаскивание: сдвиг курсора по кругу двигает фокус кадра (object-position).
  function onPointerDown(e) {
    if (!reposition) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const box = e.currentTarget.getBoundingClientRect();
    drag.current = { px: e.clientX, py: e.clientY, size: box.width, start: pos };
  }
  function onPointerMove(e) {
    if (!drag.current) return;
    const d = drag.current;
    const dxPct = ((e.clientX - d.px) / d.size) * 100;
    const dyPct = ((e.clientY - d.py) / d.size) * 100;
    // Тянем вправо → показываем левую часть → object-position уменьшается.
    setPos({ x: clampPct(d.start.x - dxPct), y: clampPct(d.start.y - dyPct) });
  }
  function onPointerUp() { drag.current = null; }

  async function savePos() {
    setBusy(true);
    setError("");
    try {
      await onPhoto({ photo_pos: `${Math.round(pos.x)}% ${Math.round(pos.y)}%` });
      setReposition(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const objPos = `${pos.x}% ${pos.y}%`;
  return (
    <div className="pwa-ph-overlay" onClick={onClose}>
      <div className="pwa-ph-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pwa-ph-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>

        <div className={`pwa-ph-photo${hasPhoto ? " has-photo" : ""}${reposition ? " is-repositioning" : ""}`}
             onPointerDown={onPointerDown} onPointerMove={onPointerMove}
             onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          {hasPhoto
            ? <img src={profile.photo_url} alt="" draggable="false"
                   style={{ objectPosition: objPos }} />
            : initials(profile.first_name, profile.last_name)}
          {reposition && <span className="pwa-ph-grid" aria-hidden="true" />}
        </div>

        {reposition && <p className="pwa-ph-tip">Перетащите фото, чтобы выбрать область</p>}
        {error && <div className="pwa-ph-err">{error}</div>}

        <div className="pwa-ph-actions">
          {reposition ? (
            <>
              <button className={`pwa-ph-btn primary${busy ? " is-busy" : ""}`}
                      type="button" onClick={savePos} disabled={busy}>
                {busy ? "Сохраняем…" : "Сохранить положение"}
              </button>
              <button className="pwa-ph-btn ghost" type="button" disabled={busy}
                      onClick={() => { setPos(parsePos(profile.photo_pos)); setReposition(false); }}>
                Отмена
              </button>
            </>
          ) : (
            <>
              <label className={`pwa-ph-btn primary${busy ? " is-busy" : ""}`}>
                {busy ? "Загрузка…" : "Загрузить фото с ПК"}
                <input type="file" accept="image/*"
                       hidden onChange={upload} disabled={busy} />
              </label>
              {hasPhoto && (
                <button className="pwa-ph-btn ghost" type="button" disabled={busy}
                        onClick={() => setReposition(true)}>
                  <MoveIcon size={17} color="#fff" />
                  Изменить положение
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Попап редактирования анкеты (по клику на карандаш у имени).
const EDIT_FIELDS = [
  ["last_name", "Фамилия", "text"],
  ["first_name", "Имя", "text"],
  ["business_name", "Название бизнеса / компании", "text"],
  ["business_field", "Сфера или специализация", "text"],
  ["birth_date", "Дата рождения", "date"],
  ["birth_time", "Время рождения", "time"],
  ["birth_city", "Город рождения", "text"],
  ["telegram", "Телеграм", "text"],
];
function ProfileEditModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({
    last_name: profile.last_name || "", first_name: profile.first_name || "",
    business_name: profile.business_name || "", business_field: profile.business_field || "",
    birth_date: profile.birth_date || "", birth_time: profile.birth_time || "",
    birth_city: profile.birth_city || "", telegram: profile.telegram || "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const required = ["last_name", "first_name", "business_name", "business_field", "birth_date"];
  const filled = required.every((k) => String(form[k]).trim());

  async function save() {
    if (!filled) { setError("Заполните обязательные поля"); return; }
    setBusy(true);
    setError("");
    try {
      await onSave({
        first_name: form.first_name.trim(), last_name: form.last_name.trim(),
        business_name: form.business_name.trim(), business_field: form.business_field.trim(),
        birth_date: form.birth_date, birth_time: form.birth_time || null,
        birth_city: form.birth_city.trim() || null, telegram: form.telegram.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="pwa-ph-overlay" onClick={onClose}>
      <div className="pwa-ph-modal pwa-edit-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pwa-ph-close" type="button" onClick={onClose} aria-label="Закрыть">×</button>
        <h2 className="pwa-edit-title">Ваша анкета</h2>
        <div className="pwa-edit-form">
          {EDIT_FIELDS.map(([key, label, type]) => (
            <label className="pwa-onb-field" key={key}>
              <span className="pwa-onb-label">
                {label}{required.includes(key) ? " *" : ""}
              </span>
              <input className="pwa-input" type={type}
                     placeholder={key === "telegram" ? "@username" : ""}
                     value={form[key]} onChange={(e) => set(key, e.target.value)} />
            </label>
          ))}
        </div>
        {error && <div className="pwa-ph-err">{error}</div>}
        <div className="pwa-ph-actions">
          <button className={`pwa-ph-btn primary${busy ? " is-busy" : ""}`}
                  type="button" onClick={save} disabled={busy || !filled}>
            {busy ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
