import PwaTabBar from "./PwaNav.jsx";
import { PlayIcon } from "./PwaIcons.jsx";
import "../styles/pwa.css";

// Оболочка PWA-демо: мобильный фрейм по центру (макет Figma 393px), hero-фон
// сверху, прокручиваемый контент и «плавающая» нижняя панель (CTA + таб-бар),
// которая остаётся закреплённой при прокрутке (position: sticky).
export default function PwaShell({ children, cta = "Запустить траекторию развития", hero = true, nav = true }) {
  return (
    <div className="pwa">
      <div className="pwa-frame">
        {hero && <div className="pwa-hero" aria-hidden="true" />}
        <div className="pwa-content">{children}</div>

        {nav && (
          <div className="pwa-bottom">
            {cta && (
              <div className="pwa-cta-wrap">
                <button type="button" className="pwa-cta">
                  <span>{cta}</span>
                  <PlayIcon size={20} color="#0c1c08" />
                </button>
              </div>
            )}
            <PwaTabBar />
            <div className="pwa-home-indicator" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
}
