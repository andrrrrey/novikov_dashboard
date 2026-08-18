import { useLocation, useNavigate } from "react-router-dom";
import { initials } from "../components/Avatar.jsx";
import PwaShell from "../components/PwaShell.jsx";
import { BackIcon, TelegramIcon } from "../components/PwaIcons.jsx";

// Профиль резидента в дизайне PWA (макет Figma): открывается тапом по резиденту
// на /residents по адресу /residents/имя-фамилия. Данные приходят через
// router-state из списка (отдельного эндпоинта на одного резидента нет), поэтому
// показываем то, что есть: имя, бизнес, сфера практики, общий уровень и телеграм.
export default function ResidentProfile() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const r = state?.resident;

  // Прямой заход по ссылке без данных — возвращаем к списку.
  if (!r) {
    return (
      <PwaShell cta={null} hero={false} dashHref="/" resHref="/residents">
        <div className="pwa-subhead" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="pwa-back" onClick={() => navigate("/residents")}>
            <BackIcon size={20} /> Назад
          </button>
        </div>
        <div className="pwa-state">Профиль недоступен. Откройте резидента из списка.</div>
      </PwaShell>
    );
  }

  const name = `${r.first_name} ${r.last_name}`.trim() || "Резидент";

  return (
    <PwaShell cta={null} hero={false} dashHref="/" resHref="/residents">
      <div className="pwa-subhead" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="pwa-back" onClick={() => navigate("/residents")}>
          <BackIcon size={20} /> Назад
        </button>
      </div>

      <div className="pwa-prof-head">
        <div className="pwa-prof-av">
          {r.photo_url ? <img src={r.photo_url} alt="" /> : initials(r.first_name, r.last_name)}
        </div>
        <div className="pwa-prof-info">
          <div className="pwa-prof-name">{name}</div>
          {r.business_name && <div className="pwa-prof-biz">{r.business_name}</div>}
        </div>
      </div>

      {r.business_field && (
        <div className="pwa-chips" style={{ marginTop: 16 }}>
          <span className="pwa-chip">{r.business_field}</span>
        </div>
      )}

      {r.telegram ? (
        <a className="pwa-btn-white pwa-btn-white-row" style={{ marginTop: 16 }}
           href={`https://t.me/${r.telegram}`} target="_blank" rel="noreferrer">
          Написать в телеграм
          <TelegramIcon size={20} color="#111" />
        </a>
      ) : (
        <div className="pwa-btn-white pwa-btn-white-row is-disabled" style={{ marginTop: 16, opacity: 0.5 }}>
          Телеграм не указан
          <TelegramIcon size={20} color="#111" />
        </div>
      )}

      <div className="pwa-stack" style={{ marginTop: 16 }}>
        <section className="pwa-overall">
          <div className="pwa-card-head" style={{ justifyContent: "center", gap: 6 }}>
            <span className="pwa-card-title">Уровень бизнеса</span>
          </div>
          <div className="pwa-overall-num">{r.business_level}</div>
        </section>
      </div>
    </PwaShell>
  );
}
