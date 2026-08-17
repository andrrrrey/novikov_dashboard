import { useNavigate } from "react-router-dom";
import logoUrl from "../assets/logo.svg";
import "../styles/pwa.css";

// Экран входа PWA-демо по макету Figma (слева от дашборда): логотип «Новиков
// Club», «сияющий» зелёный фон, поля Email/Пароль и белая кнопка «Войти».
// Демо: «Войти» ведёт на дашборд /pwa (без реальной авторизации).
export default function LoginPwa() {
  const navigate = useNavigate();

  function submit(e) {
    e.preventDefault();
    navigate("/pwa");
  }

  return (
    <div className="pwa">
      <div className="pwa-frame pwa-login">
        <div className="pwa-login-aurora" aria-hidden="true" />
        <div className="pwa-login-inner">
          <div className="pwa-logo">
            <img src={logoUrl} alt="Новиков Club" />
          </div>

          <form className="pwa-login-form" onSubmit={submit}>
            <h1 className="pwa-h1">Вход</h1>
            <p className="pwa-login-sub">Введите данные которые<br />выдал администратор клуба</p>

            <input className="pwa-input" type="email" placeholder="Email" autoComplete="username" />
            <input className="pwa-input" type="password" placeholder="Пароль" autoComplete="current-password" />

            <button type="submit" className="pwa-btn-white">Войти</button>
          </form>
          <div className="pwa-home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
