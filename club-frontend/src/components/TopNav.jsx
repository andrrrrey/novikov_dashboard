import { NavLink } from "react-router-dom";
import { GridIcon, PeopleIcon } from "./DashIcons.jsx";

// Навигация резидента в шапке (десктоп). На мобильной версии скрыта — там нижнее меню MobileNav.
export default function TopNav() {
  return (
    <nav className="dash-topnav" aria-label="Разделы кабинета">
      <NavLink to="/" end className={({ isActive }) => `dash-topnav-item${isActive ? " is-active" : ""}`}>
        <GridIcon size={17} />
        <span>Дашборд</span>
      </NavLink>
      <NavLink to="/residents" className={({ isActive }) => `dash-topnav-item${isActive ? " is-active" : ""}`}>
        <PeopleIcon size={17} />
        <span>Резиденты</span>
      </NavLink>
    </nav>
  );
}
