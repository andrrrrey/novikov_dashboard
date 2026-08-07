import { NavLink } from "react-router-dom";
import { GridIcon, PeopleIcon } from "./DashIcons.jsx";

// Навигация демо-кабинета (дизайн-система Lumen). Маршруты — под /demo,
// чтобы новый визуал жил рядом с текущим и не затрагивал остальных пользователей.

// Десктоп — пилюли в шапке.
export function LumenTopNav() {
  return (
    <nav className="lm-nav" aria-label="Разделы кабинета">
      <NavLink to="/demo" end className={({ isActive }) => `lm-nav-item${isActive ? " is-active" : ""}`}>
        <GridIcon size={17} />
        <span>Дашборд</span>
      </NavLink>
      <NavLink to="/demo/residents" className={({ isActive }) => `lm-nav-item${isActive ? " is-active" : ""}`}>
        <PeopleIcon size={17} />
        <span>Резиденты</span>
      </NavLink>
    </nav>
  );
}

// Мобайл — нижнее меню.
export function LumenMobileNav() {
  return (
    <nav className="lm-mnav" aria-label="Основная навигация">
      <NavLink to="/demo" end className={({ isActive }) => `lm-mnav-item${isActive ? " is-active" : ""}`}>
        <GridIcon size={22} />
        <span>Дашборд</span>
      </NavLink>
      <NavLink to="/demo/residents" className={({ isActive }) => `lm-mnav-item${isActive ? " is-active" : ""}`}>
        <PeopleIcon size={22} />
        <span>Резиденты</span>
      </NavLink>
    </nav>
  );
}
