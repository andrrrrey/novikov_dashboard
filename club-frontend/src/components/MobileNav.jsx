import { NavLink } from "react-router-dom";
import { GridIcon, PeopleIcon } from "./DashIcons.jsx";

// Нижнее меню (только мобильная версия — скрыто на десктопе через CSS).
export default function MobileNav() {
  return (
    <nav className="mnav" aria-label="Основная навигация">
      <NavLink to="/" end className={({ isActive }) => `mnav-item${isActive ? " is-active" : ""}`}>
        <GridIcon size={22} />
        <span>Дашборд</span>
      </NavLink>
      <NavLink to="/residents" className={({ isActive }) => `mnav-item${isActive ? " is-active" : ""}`}>
        <PeopleIcon size={22} />
        <span>Резиденты</span>
      </NavLink>
    </nav>
  );
}
