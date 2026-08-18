import { NavLink } from "react-router-dom";
import { DashboardIcon, PeopleIcon } from "./PwaIcons.jsx";

// Нижний таб-бар PWA (макет Figma node 0:534). Адреса вкладок задаются
// пропсами: демо-версия живёт под /pwa, а боевой кабинет — под / и /residents.
export default function PwaTabBar({ dashHref = "/pwa", resHref = "/pwa/residents" }) {
  return (
    <nav className="pwa-tabbar" aria-label="Основная навигация">
      <div className="pwa-tabbar-inner">
        <NavLink to={dashHref} end
                 className={({ isActive }) => `pwa-tab${isActive ? " is-active" : ""}`}>
          <DashboardIcon size={24} />
          <span>Дэшборд</span>
        </NavLink>
        <NavLink to={resHref}
                 className={({ isActive }) => `pwa-tab${isActive ? " is-active" : ""}`}>
          <PeopleIcon size={24} />
          <span>Резиденты</span>
        </NavLink>
      </div>
    </nav>
  );
}
