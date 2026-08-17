import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PwaShell from "../components/PwaShell.jsx";
import { SearchIcon, BackIcon, TelegramIcon } from "../components/PwaIcons.jsx";

// Экран «Резиденты» по макету Figma (справа от дашборда): назад + заголовок,
// поиск, фильтры-чипы, карточки резидентов с кнопкой «Написать в телеграм».
// Данные статичные — демо-версия.
const FILTERS = ["Общий уровень", "Маркетинг", "Продажи", "Менеджмент"];

const RESIDENTS = [
  { name: "Мария Волкова", field: "Семейное право", biz: "Юридическое бюро «Гарант»", level: 4 },
  { name: "Иван Иванов", field: "Уголовное право", biz: "Адвокатский кабинет", level: 4 },
  { name: "Алексей Смирнов", field: "Медицинское право", biz: "Правовой центр «Статус»", level: 5 },
  { name: "Ольга Кузнецова", field: "Корпоративное право", biz: "Юркомпания «Вектор»", level: 3 },
  { name: "Дмитрий Орлов", field: "Налоговое право", biz: "Бюро «Аргумент»", level: 5 },
];

function initials(name) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

export default function ResidentsPwa() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);

  return (
    <PwaShell cta={null} hero={false}>
      <div className="pwa-subhead">
        <button type="button" className="pwa-back" onClick={() => navigate("/pwa")}>
          <BackIcon size={20} /> Назад
        </button>
        <div className="pwa-subtitle">Резиденты</div>
      </div>

      <div className="pwa-search">
        <span className="pwa-search-ic"><SearchIcon size={20} /></span>
        <input type="text" placeholder="Поиск по городу, имени или практике" />
      </div>

      <div className="pwa-filters-label">Фильтры</div>
      <div className="pwa-chips">
        {FILTERS.map((f, i) => (
          <button key={f} type="button"
                  className={`pwa-chip${i === active ? " is-active" : ""}`}
                  onClick={() => setActive(i)}>
            {f}
          </button>
        ))}
      </div>

      <div className="pwa-stack" style={{ marginTop: 16 }}>
        {RESIDENTS.map((r) => (
          <div className="pwa-rescard" key={r.name}>
            <div className="pwa-rescard-top">
              <span className="pwa-rescard-field">{r.field}</span>
              <span className="pwa-rescard-lvl">Уровень {r.level}</span>
            </div>
            <div className="pwa-rescard-person">
              <div className="pwa-rescard-av">{initials(r.name)}</div>
              <div className="pwa-rescard-info">
                <div className="pwa-rescard-name">{r.name}</div>
                <div className="pwa-rescard-biz">{r.biz}</div>
              </div>
            </div>
            <button type="button" className="pwa-tg">
              Написать в телеграм
              <span className="pwa-tg-ic"><TelegramIcon size={20} /></span>
            </button>
          </div>
        ))}
      </div>
    </PwaShell>
  );
}
