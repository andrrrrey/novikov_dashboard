import { useAuth } from "../auth/AuthContext.jsx";
import PwaShell from "../components/PwaShell.jsx";

// Резиденты в стилистике PWA-макета (демо, статичные данные). Отдельная ссылка
// /club/pwa/residents; та же оболочка и таб-бар, что у дашборда.
const RESIDENTS = [
  { name: "Анна Соколова", biz: "Студия дизайна «Форма»", level: 6 },
  { name: "Дмитрий Орлов", biz: "IT-агентство «Кортекс»", level: 5 },
  { name: "Иван", biz: "Юридическое бюро «Гарант»", level: 4 },
  { name: "Мария Ким", biz: "Сеть кофеен «Тёплый»", level: 5 },
  { name: "Павел Гринёв", biz: "Логистика «Путь»", level: 3 },
  { name: "Ольга Верес", biz: "Клиника «Здравие»", level: 6 },
];

function initials(name) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] || "";
  const b = parts[1]?.[0] || "";
  return (a + b).toUpperCase() || "?";
}

export default function ResidentsPwa() {
  const { logout } = useAuth();

  return (
    <PwaShell cta="Запустить траекторию развития">
      <header className="pwa-header">
        <div className="side left" />
        <div className="pwa-profile">
          <div className="pwa-page-title">Резиденты</div>
          <div className="pwa-page-sub">Клуб · рядом с вашим уровнем</div>
        </div>
        <div className="side right">
          <button type="button" className="pwa-pill muted" onClick={logout}>Выйти</button>
        </div>
      </header>

      <div className="pwa-stack">
        {RESIDENTS.map((r) => (
          <div className="pwa-res" key={r.name}>
            <div className="pwa-res-av">{initials(r.name)}</div>
            <div className="pwa-res-body">
              <div className="pwa-res-name">{r.name}</div>
              <div className="pwa-res-biz">{r.biz}</div>
            </div>
            <div className="pwa-res-lvl">
              <span className="dot" />
              ур. {r.level}
            </div>
          </div>
        ))}
      </div>
    </PwaShell>
  );
}
