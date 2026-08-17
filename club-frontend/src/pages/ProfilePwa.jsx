import { useNavigate } from "react-router-dom";
import PwaShell from "../components/PwaShell.jsx";
import {
  BackIcon, PinIcon, LinkIcon, TelegramIcon, QuestionIcon, BookIcon, BoltIcon,
} from "../components/PwaIcons.jsx";

// Экран профиля резидента по макету Figma (справа от «Резидентов»): открывается
// тапом по резиденту. Данные статичные — демо.
const TAGS = ["Семейное право", "Наследство", "Уголовка", "Регистрация бизнеса"];
const ASPECTS = [
  { label: "Менеджмент", level: 4 },
  { label: "Маркетинг", level: 4 },
  { label: "Продажи", level: 5 },
];

export default function ProfilePwa() {
  const navigate = useNavigate();

  return (
    <PwaShell cta={null} hero={false}>
      <div className="pwa-subhead" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="pwa-back" onClick={() => navigate("/pwa/residents")}>
          <BackIcon size={20} /> Назад
        </button>
      </div>

      <div className="pwa-prof-head">
        <div className="pwa-prof-av">ИП</div>
        <div className="pwa-prof-info">
          <div className="pwa-prof-name">Мария Волкова</div>
          <div className="pwa-prof-biz">Юридическое бюро “Гарант”</div>
          <div className="pwa-prof-meta">
            <span><PinIcon size={15} /> Москва</span>
            <span><LinkIcon size={15} /> maria-volkova.com</span>
          </div>
        </div>
      </div>

      <div className="pwa-chips" style={{ marginTop: 16 }}>
        {TAGS.map((t) => <span className="pwa-chip" key={t}>{t}</span>)}
      </div>

      <button type="button" className="pwa-btn-white pwa-btn-white-row" style={{ marginTop: 16 }}>
        Написать в телеграм
        <TelegramIcon size={20} color="#111" />
      </button>

      <div className="pwa-stack" style={{ marginTop: 16 }}>
        <section className="pwa-overall">
          <div className="pwa-card-head" style={{ justifyContent: "center", gap: 6 }}>
            <span className="pwa-card-title">Общий уровень</span>
            <QuestionIcon size={20} bg="#1b1b1b" />
          </div>
          <div className="pwa-overall-num">4</div>
          <div className="pwa-overall-grid">
            {ASPECTS.map((a) => (
              <div className="pwa-overall-cell" key={a.label}>
                <div className="pwa-overall-cell-val">{a.level}</div>
                <div className="pwa-overall-cell-lbl">{a.label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="pwa-metrics">
          <div className="pwa-metric">
            <span className="q"><QuestionIcon size={15} bg="#1b1b1b" /></span>
            <span className="pwa-metric-ic"><BookIcon size={24} /></span>
            <div className="pwa-metric-txt">
              <span className="pwa-metric-val">14</span>
              <span className="pwa-metric-lbl">Знание</span>
            </div>
          </div>
          <div className="pwa-metric">
            <span className="q"><QuestionIcon size={15} bg="#1b1b1b" /></span>
            <span className="pwa-metric-ic"><BoltIcon size={24} /></span>
            <div className="pwa-metric-txt">
              <span className="pwa-metric-val">128</span>
              <span className="pwa-metric-lbl">Влияние</span>
            </div>
          </div>
        </div>
      </div>
    </PwaShell>
  );
}
