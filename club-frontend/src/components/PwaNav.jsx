import { NavLink } from "react-router-dom";
import { DashboardIcon, PeopleIcon } from "./PwaIcons.jsx";

// Нижний таб-бар PWA-демо (макет Figma node 0:534). Маршруты — под /pwa,
// чтобы новый визуал жил рядом с остальными версиями кабинета.
export default function PwaTabBar() {
  return (
    <nav className="pwa-tabbar" aria-label="Основная навигация">
      <div className="pwa-tabbar-inner">
        <NavLink to="/pwa" end
                 className={({ isActive }) => `pwa-tab${isActive ? " is-active" : ""}`}>
          <DashboardIcon size={24} />
          <span>Дэшборд</span>
        </NavLink>
        <NavLink to="/pwa/residents"
                 className={({ isActive }) => `pwa-tab${isActive ? " is-active" : ""}`}>
          <PeopleIcon size={24} />
          <span>Резиденты</span>
        </NavLink>
      </div>
    </nav>
  );
}
